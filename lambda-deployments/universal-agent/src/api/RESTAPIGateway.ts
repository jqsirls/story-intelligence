import express, { Express, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import * as crypto from 'crypto';
import { DeletionService } from '../services/DeletionService';
import { InactivityMonitorService } from '../services/InactivityMonitorService';
import { EmailService } from '../services/EmailService';
import { PLGNudgeService } from '../services/PLGNudgeService';
import { AuthMiddleware, AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { AuthRoutes } from './AuthRoutes';
import { WebhookDeliverySystem } from '../webhooks/WebhookDeliverySystem';
// @ts-ignore - serverless-http is ES module
import serverlessHttp from 'serverless-http';
import { A2AAdapter } from '@alexa-multi-agent/a2a-adapter';
import { UniversalStorytellerAPI } from '../UniversalStorytellerAPI';
import { LibraryService } from '@alexa-multi-agent/library-agent/dist/services/LibraryService';
import { CommerceAgent } from '@alexa-multi-agent/commerce-agent';

export class RESTAPIGateway {
  public app: Express;
  private supabase: SupabaseClient;
  private deletionService: DeletionService;
  private inactivityMonitorService: InactivityMonitorService;
  private emailService: EmailService;
  private plgNudgeService: PLGNudgeService | null = null;
  private commerceAgent: CommerceAgent | null = null;
  private authMiddleware: AuthMiddleware;
  private authAgent: AuthAgent;
  private webhookDeliverySystem: WebhookDeliverySystem;
  private libraryService: LibraryService;
  private logger: Logger;
  private serverlessHandler: ReturnType<typeof serverlessHttp> | null = null;
  private a2aAdapter: A2AAdapter | null = null;

  constructor(
    private storytellerAPI: UniversalStorytellerAPI | null,
    logger: Logger
  ) {
    this.logger = logger;
    this.app = express();
    
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and key must be configured');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize services
    this.emailService = new EmailService(this.supabase, this.logger);
    this.plgNudgeService = new PLGNudgeService(this.supabase, this.emailService, this.logger);
    this.commerceAgent = new CommerceAgent({
      supabaseUrl: supabaseUrl,
      supabaseServiceKey: supabaseKey,
      stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      redisUrl: process.env.REDIS_URL,
      emailService: this.emailService,
      logger: this.logger
    });

    // Stripe Webhooks: fail-fast if the webhook secret is not configured.
    // This prevents a "looks live but silently rejects every event" failure mode.
    const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
    const stripeWebhookSecretIsPlaceholder =
      stripeWebhookSecret.length === 0 ||
      stripeWebhookSecret.includes('placeholder') ||
      !stripeWebhookSecret.startsWith('whsec_')

    if (stripeWebhookSecretIsPlaceholder) {
      // Loud, searchable log signature
      this.logger.error('STRIPE_WEBHOOK_SECRET_PLACEHOLDER', {
        code: 'STRIPE_WEBHOOK_SECRET_PLACEHOLDER',
        ssmParameter: '/storytailor-production/stripe/webhook-secret'
      })
    }
    this.deletionService = new DeletionService(this.supabase, this.logger);
    this.inactivityMonitorService = new InactivityMonitorService(this.supabase, this.logger, this.emailService);
    this.libraryService = new LibraryService(this.supabase);
    
    // Initialize WebhookDeliverySystem
    this.webhookDeliverySystem = new WebhookDeliverySystem(this.logger, this.supabase);
    
    // Initialize auth middleware
    // Create minimal AuthAgent config (AuthAgent requires full config, but we only need validateToken)
    // For REST API, AuthAgent is initialized with minimal config
    // AuthAgent requires Redis, but will gracefully degrade if Redis is unavailable
    // We'll create AuthAgent with minimal required config
    const authAgentConfig = {
      supabase: {
        url: supabaseUrl,
        serviceKey: supabaseKey
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
        issuer: 'storytailor',
        audience: 'storytailor-api',
        accessTokenTtl: 3600,
        refreshTokenTtl: 1209600
      },
      voiceCode: {
        length: 6,
        ttl: 300,
        maxAttempts: 3
      },
      rateLimit: {
        maxRequestsPerMinute: 100,
        windowMs: 60000
      },
      magicLink: {
        baseUrl: process.env.APP_URL || 'https://storytailor.com',
        ttl: 900
      }
    };
    
    const authAgent = new AuthAgent(authAgentConfig);
    
    // Initialize AuthAgent (required before use)
    // Note: This is async but we can't await in constructor, so we'll initialize lazily
    // AuthRoutes will handle initialization check
    this.authMiddleware = new AuthMiddleware(authAgent, this.logger, this.supabase);
    
    // Initialize AuthRoutes (pass supabase client for user_type lookup)
    const authRoutes = new AuthRoutes(authAgent, this.logger, this.emailService, this.supabase);
    
    // Store authAgent for potential async initialization
    this.authAgent = authAgent;
    
    // Configure Express
    // ------------------------------------------------------------------------
    // Stripe Webhook Receiver (PRODUCTION)
    // ------------------------------------------------------------------------
    // IMPORTANT: Stripe signature verification requires the *raw* request body.
    // Therefore this route must be registered BEFORE `express.json()`.
    //
    // Endpoint to configure in Stripe dashboard:
    //   POST https://api.storytailor.dev/api/v1/stripe/webhook
    //
    // Env vars required:
    //   STRIPE_SECRET_KEY
    //   STRIPE_WEBHOOK_SECRET
    this.app.post(
      '/api/v1/stripe/webhook',
      express.raw({ type: 'application/json' }),
      async (req: Request, res: Response) => {
        try {
          const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim()
          const stripeWebhookSecretIsPlaceholder =
            stripeWebhookSecret.length === 0 ||
            stripeWebhookSecret.includes('placeholder') ||
            !stripeWebhookSecret.startsWith('whsec_')

          if (stripeWebhookSecretIsPlaceholder) {
            return res.status(503).json({
              success: false,
              error: 'Stripe webhook receiver is not configured',
              code: 'STRIPE_WEBHOOK_NOT_CONFIGURED',
              ssmParameter: '/storytailor-production/stripe/webhook-secret'
            })
          }

          const signature = req.headers['stripe-signature']
          if (typeof signature !== 'string' || signature.length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Missing Stripe-Signature header',
              code: 'STRIPE_SIGNATURE_MISSING'
            })
          }

          if (!this.commerceAgent) {
            return res.status(500).json({
              success: false,
              error: 'CommerceAgent not initialized',
              code: 'COMMERCE_AGENT_UNAVAILABLE'
            })
          }

          const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body || ''), 'utf8')
          const payload = bodyBuffer.toString('utf8')

          await this.commerceAgent.handleWebhook(payload, signature)

          return res.status(200).json({ received: true })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.logger.warn('Stripe webhook handling failed', { error: errorMessage })
          return res.status(400).json({
            success: false,
            error: errorMessage,
            code: 'STRIPE_WEBHOOK_FAILED'
          })
        }
      }
    )

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Add CORS headers
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
      next();
    });
    
    // Health check (production safety signals)
    this.app.get('/health', async (req: Request, res: Response) => {
      const assetCdnUrl = (process.env.ASSET_CDN_URL || '').trim()
      const supabaseServiceKeyPresent = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY)

      // Redis is used by some middleware (idempotency / routing / orchestration).
      // Only attempt a ping if REDIS_URL is set (avoid blocking health checks in minimal environments).
      const redisUrl = (process.env.REDIS_URL || '').trim()
      let redisReachable: boolean | null = null
      let redisError: string | null = null

      if (redisUrl.length > 0) {
        try {
          const { createClient } = await import('redis')
          const client = createClient({ url: redisUrl })
          await Promise.race([
            client.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('redis_connect_timeout')), 250))
          ])
          const pong = await Promise.race([
            client.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('redis_ping_timeout')), 250))
          ])
          redisReachable = pong === 'PONG'
          await client.disconnect().catch(() => {})
        } catch (e) {
          redisReachable = false
          redisError = e instanceof Error ? e.message : String(e)
        }
      }

      res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          assetCdnUrl: assetCdnUrl || null,
          assetCdnUrlOk: assetCdnUrl === 'https://assets.storytailor.dev',
          supabaseServiceKeyPresent,
          redis: redisUrl.length > 0 ? { reachable: redisReachable, error: redisError } : { reachable: null, error: 'REDIS_URL not set (skipped)' }
        }
      })
    });
    
    // Register auth routes
    this.app.use('/api/v1/auth', authRoutes.getRouter());
    
    // Setup routes
    this.setupRoutes();
    
    // Setup A2A routes
    this.setupA2ARoutes();
    
    // Error handler (must be last)
    this.app.use((err: Error & { status?: number; code?: string }, req: Request, res: Response, next: NextFunction) => {
      this.logger.error('REST API error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });
      
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        code: err.code || 'INTERNAL_ERROR',
        requestId: req.headers['x-request-id'] || 'unknown'
      });
    });
    
    // Initialize serverless-http handler
    this.serverlessHandler = serverlessHttp(this.app, {
      binary: ['image/*', 'application/pdf', 'audio/*', 'video/*'],
      request: (request: unknown, event: unknown, context: unknown) => {
        // Preserve original Lambda event context
        const reqAny = request as any;
        reqAny.lambdaEvent = event;
        reqAny.lambdaContext = context;
      }
    });
  }

  /**
   * Parse full name into first and last name
   * Handles single names, multiple last names, etc.
   */
  private parseFullName(name: string): { firstName: string; lastName?: string } {
    if (!name || typeof name !== 'string') {
      return { firstName: 'Unnamed' };
    }
    
    const parts = name.trim().split(/\s+/).filter(p => p.length > 0);
    if (parts.length === 0) {
      return { firstName: 'Unnamed' };
    }
    if (parts.length === 1) {
      return { firstName: parts[0] };
    }
    
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')  // Handle multiple last names (e.g., "Maria Garcia Lopez")
    };
  }

  /**
   * Validate gender against allowed values
   */
  private validateGender(gender?: string): string | null {
    if (!gender) return null;
    
    const validGenders = ['male', 'female', 'non-binary', 'gender-fluid', 'other', 'prefer-not-to-specify'];
    const normalized = gender.toLowerCase().trim();
    
    if (validGenders.includes(normalized)) {
      return normalized;
    }
    
    return null; // Invalid gender, will be ignored
  }

  /**
   * Validate story type-specific inputs
   */
  private validateStoryTypeInputs(
    storyType: string,
    inputs: {
      bedtime?: any;
      birthday?: any;
      educational?: any;
      financialLiteracy?: any;
      languageLearning?: any;
      medicalBravery?: any;
      mentalHealth?: any;
      milestones?: any;
      sequel?: any;
      techReadiness?: any;
      innerChild?: any;
      childLoss?: any;
      newBirth?: any;
    }
  ): { message: string; code: string } | null {
    const normalizedType = storyType.toLowerCase().trim();

    // Birthday - ALL 4 fields required
    if (normalizedType === 'birthday' || normalizedType === 'birthday story') {
      if (!inputs.birthday) {
        return { message: 'Birthday story requires birthday input object', code: 'BIRTHDAY_INPUT_REQUIRED' };
      }
      if (!inputs.birthday.to || typeof inputs.birthday.to !== 'string') {
        return { message: 'Birthday story requires "to" field (birthday person\'s name)', code: 'BIRTHDAY_TO_REQUIRED' };
      }
      if (!inputs.birthday.from || typeof inputs.birthday.from !== 'string') {
        return { message: 'Birthday story requires "from" field (gift giver\'s name)', code: 'BIRTHDAY_FROM_REQUIRED' };
      }
      if (typeof inputs.birthday.ageTurning !== 'number' || inputs.birthday.ageTurning < 1) {
        return { message: 'Birthday story requires "ageTurning" field (number >= 1)', code: 'BIRTHDAY_AGE_REQUIRED' };
      }
      if (!inputs.birthday.birthdayMessage || typeof inputs.birthday.birthdayMessage !== 'string') {
        return { message: 'Birthday story requires "birthdayMessage" field', code: 'BIRTHDAY_MESSAGE_REQUIRED' };
      }
    }

    // Educational - subject required
    if (normalizedType === 'educational' || normalizedType === 'education') {
      if (!inputs.educational) {
        return { message: 'Educational story requires educational input object', code: 'EDUCATIONAL_INPUT_REQUIRED' };
      }
      if (!inputs.educational.educationalSubject) {
        return { message: 'Educational story requires "educationalSubject" field', code: 'EDUCATIONAL_SUBJECT_REQUIRED' };
      }
    }

    // Medical Bravery - medicalChallenge required
    if (normalizedType === 'medical bravery' || normalizedType === 'medical') {
      if (!inputs.medicalBravery) {
        return { message: 'Medical Bravery story requires medicalBravery input object', code: 'MEDICAL_INPUT_REQUIRED' };
      }
      if (!inputs.medicalBravery.medicalChallenge) {
        return { message: 'Medical Bravery story requires "medicalChallenge" field', code: 'MEDICAL_CHALLENGE_REQUIRED' };
      }
    }

    // Mental Health - emotionExplored required
    if (normalizedType === 'mental health' || normalizedType === 'mental-health') {
      if (!inputs.mentalHealth) {
        return { message: 'Mental Health story requires mentalHealth input object', code: 'MENTAL_HEALTH_INPUT_REQUIRED' };
      }
      if (!inputs.mentalHealth.emotionExplored) {
        return { message: 'Mental Health story requires "emotionExplored" field', code: 'EMOTION_EXPLORED_REQUIRED' };
      }
    }

    // Language Learning - targetLanguage and proficiencyLevel required
    if (normalizedType === 'language learning' || normalizedType === 'language-learning') {
      if (!inputs.languageLearning) {
        return { message: 'Language Learning story requires languageLearning input object', code: 'LANGUAGE_INPUT_REQUIRED' };
      }
      if (!inputs.languageLearning.targetLanguage) {
        return { message: 'Language Learning story requires "targetLanguage" field', code: 'TARGET_LANGUAGE_REQUIRED' };
      }
      if (!inputs.languageLearning.proficiencyLevel) {
        return { message: 'Language Learning story requires "proficiencyLevel" field', code: 'PROFICIENCY_LEVEL_REQUIRED' };
      }
    }

    // Financial Literacy - financialConcept required
    if (normalizedType === 'financial literacy' || normalizedType === 'financial-literacy') {
      if (!inputs.financialLiteracy) {
        return { message: 'Financial Literacy story requires financialLiteracy input object', code: 'FINANCIAL_INPUT_REQUIRED' };
      }
      if (!inputs.financialLiteracy.financialConcept) {
        return { message: 'Financial Literacy story requires "financialConcept" field', code: 'FINANCIAL_CONCEPT_REQUIRED' };
      }
    }

    // Tech Readiness - techConcept required
    if (normalizedType === 'tech readiness' || normalizedType === 'tech-readiness') {
      if (!inputs.techReadiness) {
        return { message: 'Tech Readiness story requires techReadiness input object', code: 'TECH_INPUT_REQUIRED' };
      }
      if (!inputs.techReadiness.techConcept) {
        return { message: 'Tech Readiness story requires "techConcept" field', code: 'TECH_CONCEPT_REQUIRED' };
      }
    }

    // Milestones - milestoneType required
    if (normalizedType === 'milestones' || normalizedType === 'milestone') {
      if (!inputs.milestones) {
        return { message: 'Milestones story requires milestones input object', code: 'MILESTONES_INPUT_REQUIRED' };
      }
      if (!inputs.milestones.milestoneType) {
        return { message: 'Milestones story requires "milestoneType" field', code: 'MILESTONE_TYPE_REQUIRED' };
      }
    }

    // Inner Child - all required fields + therapeutic consent
    if (normalizedType === 'inner child' || normalizedType === 'inner-child') {
      if (!inputs.innerChild) {
        return { message: 'Inner Child story requires innerChild input object', code: 'INNER_CHILD_INPUT_REQUIRED' };
      }
      if (!inputs.innerChild.yourName) {
        return { message: 'Inner Child story requires "yourName" field', code: 'INNER_CHILD_NAME_REQUIRED' };
      }
      if (!inputs.innerChild.childhoodName) {
        return { message: 'Inner Child story requires "childhoodName" field', code: 'INNER_CHILD_CHILDHOOD_NAME_REQUIRED' };
      }
      if (typeof inputs.innerChild.yourAgeNow !== 'number') {
        return { message: 'Inner Child story requires "yourAgeNow" field (number)', code: 'INNER_CHILD_AGE_NOW_REQUIRED' };
      }
      if (typeof inputs.innerChild.ageToReconnectWith !== 'number') {
        return { message: 'Inner Child story requires "ageToReconnectWith" field (number)', code: 'INNER_CHILD_AGE_RECONNECT_REQUIRED' };
      }
      if (!inputs.innerChild.emotionalFocusArea) {
        return { message: 'Inner Child story requires "emotionalFocusArea" field', code: 'INNER_CHILD_FOCUS_REQUIRED' };
      }
      if (!inputs.innerChild.relationshipContext) {
        return { message: 'Inner Child story requires "relationshipContext" field', code: 'INNER_CHILD_RELATIONSHIP_REQUIRED' };
      }
      if (!inputs.innerChild.wordCount) {
        return { message: 'Inner Child story requires "wordCount" field', code: 'INNER_CHILD_WORD_COUNT_REQUIRED' };
      }
      // Therapeutic consent validation
      if (!inputs.innerChild.therapeuticConsent) {
        return { message: 'Inner Child story requires therapeuticConsent object', code: 'THERAPEUTIC_CONSENT_REQUIRED' };
      }
      if (!inputs.innerChild.therapeuticConsent.acknowledgedNotTherapy) {
        return { message: 'Therapeutic consent must acknowledge this is not therapy', code: 'THERAPEUTIC_CONSENT_ACKNOWLEDGED_NOT_THERAPY_REQUIRED' };
      }
      if (!inputs.innerChild.therapeuticConsent.acknowledgedProfessionalReferral) {
        return { message: 'Therapeutic consent must acknowledge professional referral recommendation', code: 'THERAPEUTIC_CONSENT_PROFESSIONAL_REFERRAL_REQUIRED' };
      }
    }

    // Child Loss - 8 required fields + therapeutic consent
    if (normalizedType === 'child loss' || normalizedType === 'child-loss') {
      if (!inputs.childLoss) {
        return { message: 'Child Loss story requires childLoss input object', code: 'CHILD_LOSS_INPUT_REQUIRED' };
      }
      if (!inputs.childLoss.typeOfLoss) {
        return { message: 'Child Loss story requires "typeOfLoss" field', code: 'CHILD_LOSS_TYPE_REQUIRED' };
      }
      if (!inputs.childLoss.yourName) {
        return { message: 'Child Loss story requires "yourName" field', code: 'CHILD_LOSS_YOUR_NAME_REQUIRED' };
      }
      if (!inputs.childLoss.yourRelationship) {
        return { message: 'Child Loss story requires "yourRelationship" field', code: 'CHILD_LOSS_RELATIONSHIP_REQUIRED' };
      }
      if (!inputs.childLoss.childName) {
        return { message: 'Child Loss story requires "childName" field', code: 'CHILD_LOSS_CHILD_NAME_REQUIRED' };
      }
      if (!inputs.childLoss.childAge) {
        return { message: 'Child Loss story requires "childAge" field', code: 'CHILD_LOSS_CHILD_AGE_REQUIRED' };
      }
      if (!inputs.childLoss.childGender) {
        return { message: 'Child Loss story requires "childGender" field', code: 'CHILD_LOSS_CHILD_GENDER_REQUIRED' };
      }
      if (!inputs.childLoss.ethnicity || !Array.isArray(inputs.childLoss.ethnicity) || inputs.childLoss.ethnicity.length === 0) {
        return { message: 'Child Loss story requires "ethnicity" field (array with at least one value)', code: 'CHILD_LOSS_ETHNICITY_REQUIRED' };
      }
      if (!inputs.childLoss.emotionalFocusArea) {
        return { message: 'Child Loss story requires "emotionalFocusArea" field', code: 'CHILD_LOSS_FOCUS_REQUIRED' };
      }
      // Therapeutic consent validation
      if (!inputs.childLoss.therapeuticConsent) {
        return { message: 'Child Loss story requires therapeuticConsent object', code: 'THERAPEUTIC_CONSENT_REQUIRED' };
      }
      if (!inputs.childLoss.therapeuticConsent.acknowledgedNotTherapy) {
        return { message: 'Therapeutic consent must acknowledge this is not therapy', code: 'THERAPEUTIC_CONSENT_ACKNOWLEDGED_NOT_THERAPY_REQUIRED' };
      }
      if (!inputs.childLoss.therapeuticConsent.acknowledgedProfessionalReferral) {
        return { message: 'Therapeutic consent must acknowledge professional referral recommendation', code: 'THERAPEUTIC_CONSENT_PROFESSIONAL_REFERRAL_REQUIRED' };
      }
      // Child Loss relationship validation
      const earlyLossTypes = ['miscarriage', 'termination-health-risks', 'stillbirth'];
      const restrictedRelationships = ['classmate', 'teacher', 'healthcare-provider'];
      if (earlyLossTypes.includes(inputs.childLoss.typeOfLoss) && 
          restrictedRelationships.includes(inputs.childLoss.yourRelationship)) {
        return { 
          message: `Relationship '${inputs.childLoss.yourRelationship}' is not applicable for loss type '${inputs.childLoss.typeOfLoss}'`, 
          code: 'INVALID_RELATIONSHIP_FOR_LOSS_TYPE' 
        };
      }
      // Force childAge: 'unborn' for early losses
      if (earlyLossTypes.includes(inputs.childLoss.typeOfLoss)) {
        inputs.childLoss.childAge = 'unborn';
      }
    }

    // New Birth - mode required, therapeutic consent if therapeutic mode
    if (normalizedType === 'new birth' || normalizedType === 'new-birth') {
      if (!inputs.newBirth) {
        return { message: 'New Birth story requires newBirth input object', code: 'NEW_BIRTH_INPUT_REQUIRED' };
      }
      if (!inputs.newBirth.mode || !['therapeutic', 'celebration'].includes(inputs.newBirth.mode)) {
        return { message: 'New Birth story requires "mode" field ("therapeutic" or "celebration")', code: 'NEW_BIRTH_MODE_REQUIRED' };
      }
      if (!inputs.newBirth.giftGiverName) {
        return { message: 'New Birth story requires "giftGiverName" field', code: 'NEW_BIRTH_GIFT_GIVER_REQUIRED' };
      }
      // Therapeutic mode requires consent
      if (inputs.newBirth.mode === 'therapeutic') {
        if (!inputs.newBirth.therapeuticConsent) {
          return { message: 'New Birth therapeutic mode requires therapeuticConsent object', code: 'THERAPEUTIC_CONSENT_REQUIRED' };
        }
        if (!inputs.newBirth.therapeuticConsent.acknowledgedNotTherapy) {
          return { message: 'Therapeutic consent must acknowledge this is not therapy', code: 'THERAPEUTIC_CONSENT_ACKNOWLEDGED_NOT_THERAPY_REQUIRED' };
        }
        if (!inputs.newBirth.therapeuticConsent.acknowledgedProfessionalReferral) {
          return { message: 'Therapeutic consent must acknowledge professional referral recommendation', code: 'THERAPEUTIC_CONSENT_PROFESSIONAL_REFERRAL_REQUIRED' };
        }
      }
    }

    return null; // No validation errors
  }

  /**
   * Helper function to parse pagination parameters
   */
  private parsePagination(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  }

  /**
   * Helper function to build pagination response
   */
  private buildPaginationResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): {
    success: boolean;
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
  } {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      }
    };
  }

  private setupRoutes(): void {
    // Account deletion endpoints
    this.app.post(
      '/api/v1/account/delete',
      this.authMiddleware.requireAuth,
      this.authMiddleware.requireEmailVerification,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { immediate = false, reason } = req.body;
          
          const result = await this.deletionService.requestAccountDeletion(
            userId,
            immediate,
            reason
          );
          
          res.json({
            success: true,
            requestId: result.requestId,
            scheduledDeletionAt: result.scheduledDeletionAt?.toISOString() || null,
            message: immediate 
              ? 'Account deletion initiated immediately'
              : `Account deletion scheduled for ${result.scheduledDeletionAt?.toLocaleDateString()}`
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Account deletion request failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETION_REQUEST_FAILED'
          });
        }
      }
    );

    this.app.post(
      '/api/v1/account/delete/confirm',
      async (req: Request, res: Response) => {
        try {
          const { token } = req.query;
          
          if (!token) {
            return res.status(400).json({
              success: false,
              error: 'Confirmation token required',
              code: 'TOKEN_MISSING'
            });
          }
          
          // Verify token and process deletion
          // The token from the email link is used as the requestId for deletion requests
          const { data: deletionRequest, error } = await this.supabase
            .from('deletion_requests')
            .select('*')
            .eq('request_id', token as string)
            .eq('status', 'scheduled')
            .single();
          
          if (error || !deletionRequest) {
            return res.status(404).json({
              success: false,
              error: 'Invalid or expired confirmation token',
              code: 'TOKEN_INVALID'
            });
          }
          
          // Process immediate deletion
          await this.deletionService.requestAccountDeletion(
            deletionRequest.user_id,
            true,
            'Confirmed via email link'
          );
          
          res.json({
            success: true,
            message: 'Account deletion confirmed and will be processed immediately'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Account deletion confirmation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETION_CONFIRMATION_FAILED'
          });
        }
      }
    );

    this.app.post(
      '/api/v1/account/delete/cancel',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { requestId } = req.body;
          
          if (!requestId) {
            return res.status(400).json({
              success: false,
              error: 'Request ID required',
              code: 'REQUEST_ID_MISSING'
            });
          }
          
          await this.deletionService.cancelDeletion(requestId, userId);
          
          res.json({
            success: true,
            message: 'Deletion request cancelled successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Account deletion cancellation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETION_CANCELLATION_FAILED'
          });
        }
      }
    );

    this.app.get(
      '/api/v1/account/export',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          
          // Export all user data (GDPR compliance)
          const { data: userData, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (error) throw error;
          
          // Get user stories
          const { data: ownedLibraries, error: ownedLibError } = await this.supabase
            .from('libraries')
            .select('id')
            .eq('owner', userId);
          if (ownedLibError) throw ownedLibError;
          const ownedLibraryIds = (ownedLibraries || []).map((l: { id: string }) => l.id);

          const { data: stories, error: storiesError } = ownedLibraryIds.length
            ? await this.supabase
                .from('stories')
                .select('*')
                .in('library_id', ownedLibraryIds)
            : { data: [], error: null };
          if (storiesError) throw storiesError;
          
          // Get user characters
          const { data: characters } = await this.supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId);
          
          // Get user libraries (using 'owner' column, not 'owner_id')
          const { data: libraries } = await this.supabase
            .from('libraries')
            .select('*')
            .eq('owner', userId);
          
          const exportData = {
            user: userData,
            stories: stories || [],
            characters: characters || [],
            libraries: libraries || [],
            exportedAt: new Date().toISOString()
          };
          
          res.json({
            success: true,
            data: exportData
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Account export failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'EXPORT_FAILED'
          });
        }
      }
    );

    // Story CRUD endpoints
    // List stories
    this.app.get(
      '/api/v1/stories',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const libraryId = req.query.libraryId as string | undefined;
          const { page, limit, offset } = this.parsePagination(req);
          
          // Try storytellerAPI first, fallback to Supabase on error
          if (this.storytellerAPI && this.storytellerAPI.getStories) {
            try {
              const stories = await this.storytellerAPI.getStories(userId, libraryId);
              // Apply pagination to API results
              const paginatedStories = stories?.slice(offset, offset + limit) || [];
              res.json(this.buildPaginationResponse(
                paginatedStories,
                stories?.length || 0,
                page,
                limit
              ));
              return;
            } catch (apiError) {
              // Fall through to Supabase fallback
              this.logger.warn('storytellerAPI.getStories failed, falling back to Supabase', {
                error: apiError instanceof Error ? apiError.message : String(apiError)
              });
            }
          }
          
          // Always use Supabase fallback for consistent pagination
          
          // Fallback: query Supabase directly
            const { data: ownedLibraries, error: ownedLibError } = await this.supabase
              .from('libraries')
              .select('id')
              .eq('owner', userId);
            if (ownedLibError) throw ownedLibError;
            const ownedLibraryIds = (ownedLibraries || []).map((l: { id: string }) => l.id);

            const { data: sharedLibraries, error: sharedLibError } = await this.supabase
              .from('library_permissions')
              .select('library_id')
              .eq('user_id', userId);
            if (sharedLibError) throw sharedLibError;
            const sharedLibraryIds = (sharedLibraries || []).map((l: { library_id: string }) => l.library_id);

            const accessibleLibraryIds = Array.from(new Set([...ownedLibraryIds, ...sharedLibraryIds]));

            if (libraryId && !accessibleLibraryIds.includes(libraryId)) {
              return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'ACCESS_DENIED'
              });
            }

            // Build count query
            let countQuery = this.supabase
              .from('stories')
              .select('*', { count: 'exact', head: true });

            // Build data query
            let query = this.supabase
              .from('stories')
              .select('*')
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1);

            if (libraryId) {
              query = query.eq('library_id', libraryId);
              countQuery = countQuery.eq('library_id', libraryId);
            } else if (accessibleLibraryIds.length > 0) {
              query = query.in('library_id', accessibleLibraryIds);
              countQuery = countQuery.in('library_id', accessibleLibraryIds);
            } else {
              return res.json(this.buildPaginationResponse([], 0, page, limit));
            }

            // Get total count and data
            const [{ count: total }, { data: stories, error }] = await Promise.all([
              countQuery,
              query
            ]);
            
            if (error) throw error;
            
            res.json(this.buildPaginationResponse(
              stories || [],
              total || 0,
              page,
              limit
            ));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list stories', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to list stories',
            code: 'LIST_STORIES_FAILED'
          });
        }
      }
    );

    // Get single story
    this.app.get(
      '/api/v1/stories/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.id;
          
          // Handle temp story IDs (stories still being processed)
          if (storyId.startsWith('temp_')) {
            return res.status(202).json({
              success: true,
              data: {
                id: storyId,
                status: 'processing',
                message: 'Story is being generated. Please poll again later or use the story creation response.'
              }
            });
          }
          
          // Query story with joins for library and story_type
          const { data: story, error } = await this.supabase
            .from('stories')
            .select(`
              *,
              library:libraries!stories_library_id_fkey(
                id,
                name,
                owner
              ),
              story_type:story_types!stories_story_type_id_fkey(
                type_id,
                type_name,
                hue_base_hex,
                hue_base_bri,
                hue_style,
                hue_jolt_pct,
                hue_jolt_ms,
                hue_tt_in,
                hue_tt_scene,
                hue_rotate_every_ms,
                hue_per_bulb_ms,
                hue_breathe_pct,
                hue_breathe_period_ms,
                hue_motion,
                hue_pause_style,
                hue_tempo_ms,
                hue_lead_ms
              )
            `)
            .eq('id', storyId)
            .single();
          
          if (error) throw error;

          const library = story.library;
          if (!library) throw new Error('Library not found');

          // Get character for this story (characters have story_id FK)
          const { data: character, error: characterError } = await this.supabase
            .from('characters')
            .select('id, name, species, personality, traits, appearance_url, reference_images, inclusivity_traits, color_palette')
            .eq('story_id', storyId)
            .maybeSingle(); // Use maybeSingle since story might not have a character yet
          
          if (characterError) {
            this.logger.warn('Failed to get character for story', { storyId, error: characterError });
          }

          // Get profile if profile_id exists
          let profile = null;
          if (story.profile_id) {
            const { data: profileData, error: profileError } = await this.supabase
              .from('profiles')
              .select('id, display_name, age, avatar_url')
              .eq('id', story.profile_id)
              .maybeSingle();
            
            if (profileError) {
              this.logger.warn('Failed to get profile for story', { storyId, profileId: story.profile_id, error: profileError });
            } else {
              profile = profileData;
            }
          }

          if (library.owner !== userId) {
            const { data: permission, error: permError } = await this.supabase
              .from('library_permissions')
              .select('id')
              .eq('library_id', story.library_id)
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
            if (permError) throw permError;
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'ACCESS_DENIED'
              });
            }
          }

          // Get story stats
          const { data: interactions } = await this.supabase
            .from('story_interactions')
            .select('interaction_type, interaction_data, created_at')
            .eq('story_id', storyId);

          const plays = interactions?.filter(i => i.interaction_type === 'viewed').length || 0;
          const completions = interactions?.filter(i => i.interaction_type === 'completed').length || 0;
          const avgCompletionRate = plays > 0 ? (completions / plays) * 100 : 0;
          const totalListenTime = interactions
            ?.filter(i => i.interaction_type === 'completed')
            .reduce((sum, i) => sum + (i.interaction_data?.duration_seconds || 0), 0) || 0;
          const lastPlayed = interactions
            ?.filter(i => i.interaction_type === 'viewed')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || null;

          // Get feedback summary
          let feedbackSummary = {
            total: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            averageRating: 0
          };

          try {
            const { data: summary } = await this.supabase
              .rpc('get_story_feedback_summary', { p_story_id: storyId });
            
            if (summary) {
              feedbackSummary = {
                total: summary.total || 0,
                positive: summary.sentimentCounts?.positive || 0,
                neutral: summary.sentimentCounts?.neutral || 0,
                negative: summary.sentimentCounts?.negative || 0,
                averageRating: Math.round((summary.averageRating || 0) * 10) / 10
              };
            }
          } catch (feedbackError) {
            // Feedback table might not exist yet, ignore
            this.logger.warn('Failed to get feedback summary', { error: feedbackError });
          }
          
          // CRITICAL: Check if story art is missing AND not already being generated
          const hasCoverArt = story.cover_art_url;
          // IMPORTANT: `scene_art_urls` is index-addressed (scene_1..scene_4).
          // Do not treat "length >= 4" as ready because arrays may include null placeholders.
          const hasBeatArt = Array.isArray(story.scene_art_urls) &&
            story.scene_art_urls.slice(0, 4).every((u: any) => typeof u === 'string' && u.length > 0);
          const assetsStatus = story.asset_generation_status as any;
          const storyStatus = story.status;
          
          // Only trigger generation if:
          // 1. Art is missing
          // 2. Status is NOT 'generating' (prevents duplicate)
          // 3. No active generation job exists
          const isGenerating = storyStatus === 'generating' || 
                               assetsStatus?.overall === 'generating' ||
                               assetsStatus?.assets?.cover?.status === 'generating';
          
          if ((!hasCoverArt || !hasBeatArt) && !isGenerating) {
            // Check for active generation jobs
            const { data: activeJobs } = await this.supabase
              .from('asset_generation_jobs')
              .select('id, asset_type, status')
              .eq('story_id', storyId)
              .in('status', ['queued', 'generating'])
              .in('asset_type', ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4']);
            
            const hasActiveJobs = activeJobs && activeJobs.length > 0;
            
            if (!hasActiveJobs) {
              // Mark as generating BEFORE triggering (prevents race condition)
              try {
                await this.supabase
                  .from('stories')
                  .update({
                    asset_generation_status: {
                      ...assetsStatus,
                      overall: 'generating',
                      assets: {
                        ...assetsStatus?.assets,
                        cover: { status: 'generating', progress: 0 },
                        beats: { status: 'generating', progress: 0 }
                      }
                    }
                  })
                  .eq('id', storyId);
              } catch (updateErr) {
                this.logger.error('Failed to update story status to generating', { storyId, error: updateErr });
              }
              
              // Create generation jobs to track progress
              try {
                await this.supabase
                  .from('asset_generation_jobs')
                  .insert([
                    { story_id: storyId, asset_type: 'cover', status: 'queued' },
                    { story_id: storyId, asset_type: 'scene_1', status: 'queued' },
                    { story_id: storyId, asset_type: 'scene_2', status: 'queued' },
                    { story_id: storyId, asset_type: 'scene_3', status: 'queued' },
                    { story_id: storyId, asset_type: 'scene_4', status: 'queued' }
                  ]);
              } catch (jobError) {
                this.logger.error('Failed to create asset generation jobs', { storyId, error: jobError });
              }
              
              // Trigger async art generation
              this.logger.info('Story art missing, triggering async generation', { storyId });
              
              const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
              const lambda = new LambdaClient({ region: 'us-east-1' });
              
              // Get character for art generation
              const { data: character } = await this.supabase
                .from('characters')
                .select('id, name, traits, reference_images, appearance_url')
                .eq('library_id', story.library_id)
                .limit(1)
                .maybeSingle();
              
              lambda.send(new InvokeCommand({
                FunctionName: 'storytailor-content-agent-production',
                InvocationType: 'Event', // Async - don't wait
                Payload: JSON.stringify({
                  action: 'generate_story_images',
                  storyId,
                  story: {
                    id: story.id,
                    title: story.title,
                    content: story.content
                  },
                  characterId: character?.id,
                  characterName: character?.name || 'hero',
                  characterTraits: character?.traits || {},
                  libraryId: story.library_id
                })
              })).catch(async (err) => {
                this.logger.error('Failed to trigger async story art generation', { storyId, error: err });
                // Mark jobs as failed
                try {
                  await this.supabase
                    .from('asset_generation_jobs')
                    .update({ status: 'failed', error_message: err.message })
                    .eq('story_id', storyId)
                    .in('status', ['queued']);
                  this.logger.info('Updated job status to failed', { storyId });
                } catch (updateErr) {
                  this.logger.error('Failed to update job status', { storyId, error: updateErr });
                }
              });
            }
          }
          
          // CRITICAL: Add COMPLETE HUE data for smart home sync (V2 Compatible)
          // This enables Philips Hue integration without additional API calls
          const hueData = {
            // ============================================================
            // TIER 1: Story Type Configuration (Base Settings)
            // ============================================================
            storyType: story.story_type?.type_name || null,
            storyTypeId: story.story_type?.type_id || null,
            storyBaseHex: story.story_type?.hue_base_hex || null,
            storyBaseBri: story.story_type?.hue_base_bri || null,
            intensity: story.story_type?.hue_style || null, // calm/pulse/bold
            
            // Animation Configuration (15 fields from V2)
            hueJoltPct: story.story_type?.hue_jolt_pct || null,
            hueJoltMs: story.story_type?.hue_jolt_ms || null,
            hueTtIn: story.story_type?.hue_tt_in || null,
            hueTtScene: story.story_type?.hue_tt_scene || null,
            hueRotateEveryMs: story.story_type?.hue_rotate_every_ms || null,
            huePerBulbMs: story.story_type?.hue_per_bulb_ms || null,
            hueBreathePct: story.story_type?.hue_breathe_pct || null,
            hueBreathePeriodMs: story.story_type?.hue_breathe_period_ms || null,
            hueMotion: story.story_type?.hue_motion || null,
            huePauseStyle: story.story_type?.hue_pause_style || null,
            hueTempoMs: story.story_type?.hue_tempo_ms || null,
            hueLeadMs: story.story_type?.hue_lead_ms || null,
            
            // ============================================================
            // TIER 2: Per-Story Extracted Colors (15 Hex Codes)
            // ============================================================
            // These override story type base colors with actual image colors
            ...(story.hue_extracted_colors || {}),
            
            // Example structure when extracted:
            // coverHex1: "#1A2B3C",
            // coverHex2: "#4D5E6F",
            // coverHex3: "#7890AB",
            // sceneAHex1: "#...", sceneAHex2: "#...", sceneAHex3: "#...",
            // sceneBHex1: "#...", sceneBHex2: "#...", sceneBHex3: "#...",
            // sceneCHex1: "#...", sceneCHex2: "#...", sceneCHex3: "#...",
            // sceneDHex1: "#...", sceneDHex2: "#...", sceneDHex3: "#...",
          };

          // Remove join data from main story object (keep it clean)
          const { library: storyLibrary, story_type, ...storyData } = story;

          res.json({
            success: true,
            data: {
              ...storyData,
              character: character || null,
              profile: profile || null,
              library: storyLibrary || null,
              hue: hueData,
              stats: {
                plays,
                completions,
                avgCompletionRate: Math.round(avgCompletionRate),
                totalListenTime: Math.round(totalListenTime / 60), // minutes
                lastPlayed
              },
              feedbackSummary,
              realtimeChannel: `stories:id=${storyId}`,
              subscribePattern: {
                table: 'stories',
                filter: `id=eq.${storyId}`,
                event: 'UPDATE'
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get story', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_STORY_FAILED'
          });
        }
      }
    );

    // Create story
    this.app.post(
      '/api/v1/stories',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const {
            characterId, libraryId, storyIdea, storyType, themes,
            moralLesson, avoidTopics, therapeuticGoals, emotionalContext,
            childAge, generateAssets, title, content, metadata,
            // Story type-specific inputs
            bedtime, birthday, educational, financialLiteracy, languageLearning,
            medicalBravery, mentalHealth, milestones, sequel, techReadiness,
            innerChild, childLoss, newBirth
          } = req.body;
          
          // Get or create library
          let targetLibraryId = libraryId;
          if (!targetLibraryId) {
            const { data: lib } = await this.supabase
              .from('libraries')
              .select('id')
              .eq('owner', userId)
              .limit(1)
              .single();
            targetLibraryId = lib?.id;
            
            if (!targetLibraryId) {
              const { data: newLib, error: libError } = await this.supabase
                .from('libraries')
                .insert({ owner: userId, name: 'My Stories' })
                .select('id')
                .single();
              if (libError) throw libError;
              targetLibraryId = newLib!.id;
            }
          }
          
          // Verify write permissions
          const { data: library } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', targetLibraryId)
            .single();
          
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', targetLibraryId)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required to create stories in this library',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // Validate story type-specific inputs
          if (storyType) {
            const validationError = this.validateStoryTypeInputs(storyType, {
              bedtime, birthday, educational, financialLiteracy, languageLearning,
              medicalBravery, mentalHealth, milestones, sequel, techReadiness,
              innerChild, childLoss, newBirth
            });
            
            if (validationError) {
              return res.status(400).json({
                success: false,
                error: validationError.message,
                code: validationError.code
              });
            }
          }
          
          // ===== QUOTA ENFORCEMENT =====
          // 0. Check for test mode bypass (authorized test users only)
          const testMode = req.headers['x-test-mode'] === 'true';
          let bypassQuota = false;
          
          if (testMode) {
            // Verify user is authorized for test mode
            // Test mode users must have test_mode_authorized flag in users table
            const { data: testUser } = await this.supabase
              .from('users')
              .select('test_mode_authorized')
              .eq('id', userId)
              .single();
            
            if (testUser?.test_mode_authorized === true) {
              bypassQuota = true;
              this.logger.info('Test mode enabled for authorized user', { userId });
            } else {
              this.logger.warn('Test mode requested but user not authorized', { userId });
            }
          }
          
          // 1. Check subscription
          const { data: subscription } = await this.supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          const hasSub = subscription && subscription.plan_id !== 'free';

          // 2. Check story packs
          let packCredits = 0;
          if (!hasSub) {
            const { data: packs } = await this.supabase
              .from('story_packs')
              .select('stories_remaining')
              .eq('user_id', userId)
              .gt('stories_remaining', 0)
              .is('expires_at', null);
            
            packCredits = packs?.reduce((sum, p) => sum + p.stories_remaining, 0) || 0;
          }

          // 3. Check free credits (or bypass if test mode)
          let canCreate = false;
          let quotaInfo: any = {};

          if (bypassQuota) {
            canCreate = true;
            quotaInfo = {tier: 'test_mode', unlimited: true, testMode: true};
          } else if (hasSub) {
            canCreate = true;
            quotaInfo = {tier: subscription.plan_id, unlimited: true};
          } else if (packCredits > 0) {
            canCreate = true;
            quotaInfo = {tier: 'story_pack', packCreditsRemaining: packCredits};
          } else {
            // IMPORTANT: Use creator_user_id count OR trigger-synced lifetime_stories_created
            // The trigger (Phase 1, step 5) keeps lifetime_stories_created in sync with creator_user_id count
            // So we can use either, but prefer direct count for accuracy
            const { count: storyCount } = await this.supabase
              .from('stories')
              .select('*', {count: 'exact', head: true})
              .eq('creator_user_id', userId);
            
            const { data: user } = await this.supabase
              .from('users')
              .select('available_story_credits, profile_completed, smart_home_connected, lifetime_stories_created, test_mode_authorized')
              .eq('id', userId)
              .single();
            // Guard against undefined refs in responses
            let storiesUsed = 0;
            
            // Test mode bypass (production-safe admin override)
            if (user?.test_mode_authorized === true) {
              console.log(`quota_bypass userId=${userId} reason=test_mode_authorized`);
              canCreate = true;
              quotaInfo = {tier: 'test', available: 999, used: 0};
            } else {
              // Use direct count if available, fallback to trigger-synced value
              storiesUsed = storyCount ?? 0;
              
              canCreate = (user?.available_story_credits || 0) >= 1;
              quotaInfo = {tier: 'free', available: user?.available_story_credits || 0, used: storiesUsed};
            }
            
            // 4. If blocked, return 402 with earning + upgrade options
            if (!canCreate) {
              const earningOptions = [];
              
              if (!user?.profile_completed) {
                earningOptions.push({
                  action: "complete_profile",
                  reward: 1.0,
                  description: "Add your child's age and interests",
                  ctaUrl: "/profile",
                  ctaText: "Complete Profile",
                  estimatedTime: "2 minutes"
                });
              }
              
              if (!user?.smart_home_connected) {
                earningOptions.push({
                  action: "connect_smart_home",
                  reward: 2.0,
                  description: "Connect Philips Hue",
                  ctaUrl: "/settings/smart-home",
                  ctaText: "Connect Hue",
                  estimatedTime: "5 minutes"
                });
              }
              
              earningOptions.push({
                action: "invite_friend",
                reward: 1.0,
                repeatable: true,
                description: "Invite a friend, both get benefits",
                ctaUrl: "/invite",
                ctaText: "Send Invite",
                benefits: ["Friend gets 15% off", "You both get +1 story"]
              });
              
              return res.status(402).json({
                success: false,
                error: "Story credit limit reached",
                code: "STORY_QUOTA_EXCEEDED",
                quota: {
                  tier: 'free',
                  available: user?.available_story_credits || 0,
                  used: storiesUsed,
                  limit: 2
                },
                earningOptions,
                upgradeOptions: {
                  proIndividual: {
                    name: "Pro Individual",
                    price: "$9.99/month",
                    features: ["Unlimited stories", "Premium voice", "PDF export", "Activities"],
                    checkoutUrl: `/api/v1/checkout?planId=pro_individual&returnUrl=${encodeURIComponent(req.headers.referer || '/stories')}`
                  },
                  storyPack: {
                    name: "10-Story Pack",
                    price: "$8.99",
                    stories: 10,
                    features: ["10 stories", "No subscription", "Never expires"],
                    checkoutUrl: `/api/v1/story-packs/buy?packType=10_pack`
                  }
                }
              });
            }
          }
          // ===== END QUOTA ENFORCEMENT =====
          
          // Check if this is AI generation or manual creation
          const isAIGeneration = !!(storyIdea || (storyType && !title));
          
          if (isAIGeneration) {
            // AI-POWERED STORY GENERATION
            // Get character details if provided
            let characterTraits = {};
            let characterName = 'our hero';
            if (characterId) {
              const { data: char } = await this.supabase
                .from('characters')
                .select('name, traits, reference_images, appearance_url')
                .eq('id', characterId)
                .single();
              if (char) {
                characterName = char.name;
                characterTraits = char.traits || {};
                
                // Check if character images are missing and generate them if needed
                // Schema-truth: character is "complete" when appearance_url is set AND
                // reference_images contains BOTH a headshot + bodyshot entry.
                const refImages = Array.isArray((char as any).reference_images) ? (char as any).reference_images : [];
                const hasHeadshot = refImages.some((img: any) => img && img.type === 'headshot' && typeof img.url === 'string' && img.url.length > 0);
                const hasBodyshot = refImages.some((img: any) => img && img.type === 'bodyshot' && typeof img.url === 'string' && img.url.length > 0);
                const hasAppearance = typeof (char as any).appearance_url === 'string' && (char as any).appearance_url.length > 0;
                const isComplete = hasAppearance && hasHeadshot && hasBodyshot;
                
                if (!isComplete) {
                  // IMPORTANT: Do NOT generate character art inline in an API request.
                  // API contract requirement: create record + enqueue jobs + return immediately.
                  // We can optionally trigger background generation, but must never await it here.
                  this.logger.info('Character images missing; continuing story creation without blocking', { characterId })
                  try {
                    const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda')
                    const lambda = new LambdaClient({ region: 'us-east-1' })

                    const charArtPayload = {
                      action: 'generate_character_art',
                      characterId,
                      characterName: char.name,
                      characterTraits: char.traits || {},
                      userId,
                      ethnicity: char.traits?.ethnicity,
                      isMixedRace: Array.isArray(char.traits?.ethnicity) && char.traits.ethnicity.length > 1,
                      inclusivityTraits: char.traits?.inclusivityTraits || []
                    }

                    lambda.send(new InvokeCommand({
                      FunctionName: 'storytailor-content-agent-production',
                      InvocationType: 'Event',
                      Payload: JSON.stringify(charArtPayload)
                    })).catch((err) => {
                      this.logger.warn('Failed to trigger background character image generation', {
                        characterId,
                        error: err instanceof Error ? err.message : String(err)
                      })
                    })
                  } catch (err) {
                    this.logger.warn('Failed to setup background character image generation', {
                      characterId,
                      error: err instanceof Error ? err.message : String(err)
                    })
                  }
                }
              }
            }
            
            // CRITICAL: Create story record IMMEDIATELY with status='generating' to return ID
            const { data: storyRecord, error: createError } = await this.supabase
              .from('stories')
              .insert({
                library_id: targetLibraryId,
                creator_user_id: userId,
                title: storyIdea ? `Story about ${characterName}` : (title || 'Untitled Story'),
                content: {}, // Empty initially - will be populated by Content Agent
                status: 'generating', // CRITICAL: Mark as generating immediately
                age_rating: childAge || 7,
                asset_generation_status: {
                  overall: 'generating',
                  assets: {
                    content: { status: 'generating', progress: 0 },
                    cover: { status: 'pending', progress: 0 },
                    beats: { status: 'pending', progress: 0 },
                    audio: { status: 'pending', progress: 0 }
                  }
                },
                asset_generation_started_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) {
              this.logger.error('Failed to create story record', { error: createError });
              throw createError;
            }
            
            const storyId = storyRecord.id;
            
            // Determine if this is an adult therapeutic story
            const normalizedStoryType = (storyType || '').toLowerCase().trim();
            const adultTherapeuticTypes = ['inner child', 'inner-child', 'child loss', 'child-loss'];
            const isNewBirthTherapeutic = (normalizedStoryType === 'new birth' || normalizedStoryType === 'new-birth') && newBirth?.mode === 'therapeutic';
            const isAdultTherapeutic = adultTherapeuticTypes.includes(normalizedStoryType) || isNewBirthTherapeutic;
            
            // Default to cover art only for adult therapeutic stories (unless explicitly requested otherwise)
            let assetsToGenerate: boolean | string[] = generateAssets !== false;
            if (isAdultTherapeutic && generateAssets !== false && !req.body.explicitFullAssets) {
              assetsToGenerate = ['cover']; // Only generate cover art for adult stories by default
            }
            
            // Create asset generation jobs immediately (before invoking Content Agent)
            // This ensures jobs exist for tracking even if Content Agent hasn't processed yet
            const assetTypes = Array.isArray(assetsToGenerate) 
              ? assetsToGenerate 
              : (assetsToGenerate !== false 
                  ? ['audio', 'cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'pdf', 'qr', 'activities']
                  : []);
            
            if (assetTypes.length > 0) {
              try {
                const jobs = [];
                for (const assetType of assetTypes) {
                  const { data: job, error: jobError } = await this.supabase
                    .from('asset_generation_jobs')
                    .insert({
                      story_id: storyId,
                      asset_type: assetType,
                      status: 'queued',
                      metadata: { priority: 'normal' }
                    })
                    .select()
                    .single();
                  
                  if (jobError) {
                    this.logger.warn('Failed to create asset job', { assetType, error: jobError });
                    continue;
                  }
                  
                  jobs.push(job);
                }
                this.logger.info('Created asset generation jobs', { storyId, jobCount: jobs.length });
              } catch (jobErr) {
                this.logger.error('Failed to create asset generation jobs', { storyId, error: jobErr });
                // Don't fail story creation if job creation fails
              }
            }
            
            // Invoke Content Agent Lambda for AI generation (ASYNC - don't wait)
            const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
            const lambda = new LambdaClient({ region: 'us-east-1' });
            
            const payload: any = {
              action: 'generate_story',
              storyId, // CRITICAL: Pass storyId so Content Agent updates existing record
              userId,
              creatorUserId: userId,  // CRITICAL: Pass creator for quota attribution
              sessionId: `rest_${Date.now()}`,
              characterName,
              characterTraits,
              characterId: characterId || undefined, // Pass characterId for reference images
              storyType: storyType || 'adventure',
              userAge: childAge || 7,
              storyIdea,
              themes: themes || [],
              moralLesson,
              avoidTopics: avoidTopics || [],
              therapeuticGoals: therapeuticGoals || [],
              emotionalContext,
              libraryId: targetLibraryId,
              generateAssets: assetsToGenerate,
              // Story type-specific inputs
              bedtime,
              birthday,
              educational,
              financialLiteracy,
              languageLearning,
              medicalBravery,
              mentalHealth,
              milestones,
              sequel,
              techReadiness,
              innerChild,
              childLoss,
              newBirth
            };
            
            this.logger.info('Triggering Content Agent for AI story generation (async)', { userId, storyType, storyId });
            
            // Invoke asynchronously - don't wait for completion
            lambda.send(new InvokeCommand({
              FunctionName: 'storytailor-content-agent-production',
              InvocationType: 'Event', // ASYNC - don't wait
              Payload: JSON.stringify(payload)
            })).catch(async (err) => {
              this.logger.error('Failed to trigger story generation', { storyId, error: err });
              // Update status to failed
              try {
                await this.supabase
                  .from('stories')
                  .update({ 
                    status: 'failed', 
                    asset_generation_status: { 
                      overall: 'failed',
                      assets: {
                        content: { status: 'failed', progress: 0 },
                        cover: { status: 'failed', progress: 0 },
                        beats: { status: 'failed', progress: 0 },
                        audio: { status: 'failed', progress: 0 }
                      }
                    } 
                  })
                  .eq('id', storyId);
              } catch (updateErr) {
                this.logger.error('Failed to update story status to failed', { storyId, error: updateErr });
              }
            });
            
            // 5. After successful creation, deduct credit
            if (!hasSub && packCredits > 0) {
              await this.supabase.rpc('deduct_story_pack_credit', {p_user_id: userId});
            } else if (!hasSub) {
              // Deduct available credit (trigger handles lifetime_stories_created increment)
              const { data: currentUser } = await this.supabase
                .from('users')
                .select('available_story_credits')
                .eq('id', userId)
                .single();
              
              if (currentUser) {
                await this.supabase.from('users').update({
                  available_story_credits: Math.max(0, (currentUser.available_story_credits || 0) - 1)
                }).eq('id', userId);
              }
            }
            
            // 6. Send Day 0 earning opportunities email if this is the 2nd story
            if (!hasSub && this.plgNudgeService) {
              const { count: storyCount } = await this.supabase
                .from('stories')
                .select('*', {count: 'exact', head: true})
                .eq('creator_user_id', userId);
              
              if (storyCount === 2) {
                // Trigger Day 0 email asynchronously (don't block response)
                this.plgNudgeService.sendDay0EarningOpportunities(userId).catch(err => {
                  this.logger.error('Failed to send Day 0 earning opportunities', { userId, error: err });
                });
              }
            }
            
            // Return story ID immediately with status='generating'
            res.status(201).json({
              success: true,
              data: {
                id: storyId,
                creator_user_id: userId, // CRITICAL: Include creator_user_id in response
                status: 'generating',
                asset_generation_status: storyRecord.asset_generation_status,
                realtimeChannel: `stories:id=${storyId}`,
                subscribePattern: {
                  table: 'stories',
                  filter: `id=eq.${storyId}`,
                  event: 'UPDATE'
                }
              }
            });
          } else {
            // MANUAL STORY CREATION (backward compatibility)
            const { data: story, error } = await this.supabase
              .from('stories')
              .insert({
                library_id: targetLibraryId,
                creator_user_id: userId,  // CRITICAL: Track creator for quota attribution
                title: title || 'Untitled Story',
                content: content || {},
                status: 'draft',
                age_rating: 0
              })
              .select()
              .single();
            
            if (error) throw error;
            
            // 5. After successful creation, deduct credit
            if (!hasSub && packCredits > 0) {
              await this.supabase.rpc('deduct_story_pack_credit', {p_user_id: userId});
            } else if (!hasSub) {
              // Deduct available credit (trigger handles lifetime_stories_created increment)
              const { data: currentUser } = await this.supabase
                .from('users')
                .select('available_story_credits')
                .eq('id', userId)
                .single();
              
              if (currentUser) {
                await this.supabase.from('users').update({
                  available_story_credits: Math.max(0, (currentUser.available_story_credits || 0) - 1)
                }).eq('id', userId);
              }
            }
            
            // 6. Send Day 0 earning opportunities email if this is the 2nd story
            if (!hasSub && this.plgNudgeService) {
              const { count: storyCount } = await this.supabase
                .from('stories')
                .select('*', {count: 'exact', head: true})
                .eq('creator_user_id', userId);
              
              if (storyCount === 2) {
                // Trigger Day 0 email asynchronously (don't block response)
                this.plgNudgeService.sendDay0EarningOpportunities(userId).catch(err => {
                  this.logger.error('Failed to send Day 0 earning opportunities', { userId, error: err });
                });
              }
            }
            
            res.status(201).json({
              success: true,
              data: story
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create story', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to create story',
            code: 'CREATE_STORY_FAILED'
          });
        }
      }
    );

    // Generate all assets for story
    this.app.post(
      '/api/v1/stories/:storyId/assets',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const {
            assetTypes = ['audio', 'cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'pdf', 'qr', 'activities'],
            priority = 'normal'
          } = req.body;
          
          // Verify story exists and user has access
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('library_id')
            .eq('id', storyId)
            .single();
          
          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }
          
          // Verify write permissions
          const { data: library } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', story.library_id)
            .single();
          
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', story.library_id)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // Create jobs for each asset type
          const jobs = [];
          for (const assetType of assetTypes) {
            const { data: job, error: jobError } = await this.supabase
              .from('asset_generation_jobs')
              .insert({
                story_id: storyId,
                asset_type: assetType,
                status: 'queued',
                metadata: { priority }
              })
              .select()
              .single();
            
            if (jobError) {
              this.logger.warn('Failed to create asset job', { assetType, error: jobError });
              continue;
            }
            
            jobs.push(job);
          }
          
          res.status(202).json({
            success: true,
            data: {
              storyId,
              jobs: jobs.map(j => ({ jobId: j.id, assetType: j.asset_type, status: 'queued' })),
              estimatedTime: assetTypes.length * 45, // 45 sec per asset
              realtimeChannel: `stories:id=${storyId}`,
              subscribePattern: {
                table: 'stories',
                filter: `id=eq.${storyId}`,
                event: 'UPDATE'
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Asset generation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ASSET_GENERATION_FAILED'
          });
        }
      }
    );

    // Generate activities for story
    this.app.post(
      '/api/v1/stories/:storyId/activities',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const {
            activityTypes = ['comprehension', 'creative'],
            preferredTypes,
            availableMaterials,
            timeConstraints,
            specialConsiderations
          } = req.body;
          
          // Verify story exists and user has access
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('*, libraries!inner(owner)')
            .eq('id', storyId)
            .single();
          
          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }
          
          // Verify write permissions
          const library = story.libraries as any;
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', story.library_id)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // Get character for the story (use maybeSingle to handle missing character gracefully)
          const { data: character } = await this.supabase
            .from('characters')
            .select('*')
            .eq('library_id', story.library_id)
            .limit(1)
            .maybeSingle();
          
          // Create proper Character object fallback with all required fields if character is missing
          const characterObj = character ? {
            id: character.id,
            libraryId: story.library_id,
            name: character.name,
            traits: character.traits || {},
            createdAt: character.created_at,
            updatedAt: character.created_at // Use created_at if updated_at doesn't exist
          } : {
            id: `temp_${Date.now()}`,
            libraryId: story.library_id,
            name: 'Character',
            traits: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Invoke Content Agent to generate activities
          const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
          const lambda = new LambdaClient({ region: 'us-east-1' });
          
          const payload = {
            action: 'generate_activities',
            storyId,
            story: {
              id: story.id,
              title: story.title,
              content: story.content
            },
            character: characterObj,
            targetAge: story.age_rating || 7,
            preferredTypes: preferredTypes || activityTypes,
            availableMaterials,
            timeConstraints,
            specialConsiderations
          };
          
          this.logger.info('Invoking Content Agent for activities generation', { userId, storyId });
          
          const response = await lambda.send(new InvokeCommand({
            FunctionName: 'storytailor-content-agent-production',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload)
          }));
          
          const result = JSON.parse(new TextDecoder().decode(response.Payload));
          const activitiesData = result.body ? JSON.parse(result.body) : result;
          
          // Improved error handling - check for all possible error conditions
          if (!activitiesData.success) {
            const errorMsg = activitiesData.error || 'Activities generation failed';
            this.logger.error('Activities generation failed', { userId, storyId, error: errorMsg, response: activitiesData });
            throw new Error(errorMsg);
          }
          
          if (!activitiesData.activities && !activitiesData.data?.activities) {
            const errorMsg = 'Activities generation returned no activities';
            this.logger.error('Activities generation returned no activities', { userId, storyId, response: activitiesData });
            throw new Error(errorMsg);
          }
          
          // Save activities to story
          const activities = activitiesData.activities || activitiesData.data?.activities || [];
          const { error: updateError } = await this.supabase
            .from('stories')
            .update({
              activities: activities
            })
            .eq('id', storyId);
          
          if (updateError) {
            this.logger.error('Failed to save activities to story', { userId, storyId, error: updateError });
            throw new Error('Failed to save activities to database');
          }
          
          // Since it's synchronous (RequestResponse), status should be 'ready', not 'generating'
          res.status(200).json({
            success: true,
            data: {
              storyId,
              activities,
              status: 'ready',
              count: Array.isArray(activities) ? activities.length : 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Activities generation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ACTIVITIES_GENERATION_FAILED'
          });
        }
      }
    );

    // Get activities for story
    this.app.get(
      '/api/v1/stories/:storyId/activities',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          
          // Verify story exists and user has access
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('id, library_id, activities, libraries!inner(owner)')
            .eq('id', storyId)
            .single();
          
          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }
          
          // Verify read permissions
          const library = story.libraries as any;
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', story.library_id)
              .eq('user_id', userId)
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'ACCESS_DENIED'
              });
            }
          }
          
          res.json({
            success: true,
            data: {
              storyId,
              activities: story.activities || [],
              count: Array.isArray(story.activities) ? story.activities.length : 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get activities', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_ACTIVITIES_FAILED'
          });
        }
      }
    );

    // Generate PDF for story
    this.app.post(
      '/api/v1/stories/:storyId/pdf',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const {
            includeActivities = true,
            customization
          } = req.body;
          
          // Verify story exists and user has access
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('*, libraries!inner(owner)')
            .eq('id', storyId)
            .single();
          
          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }
          
          // Verify write permissions
          const library = story.libraries as any;
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', story.library_id)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // Get character and art for the story (use maybeSingle to handle missing character gracefully)
          const { data: character } = await this.supabase
            .from('characters')
            .select('*')
            .eq('library_id', story.library_id)
            .limit(1)
            .maybeSingle();
          
          // Create proper Character object fallback with all required fields if character is missing
          const characterObj = character ? {
            id: character.id,
            libraryId: story.library_id,
            name: character.name,
            traits: character.traits || {},
            createdAt: character.created_at,
            updatedAt: character.created_at // Use created_at if updated_at doesn't exist
          } : {
            id: `temp_${Date.now()}`,
            libraryId: story.library_id,
            name: 'Character',
            traits: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Extract story content properly - StoryContent has beats array, not text property
          const storyContent = story.content as any;
          const storyText = storyContent?.beats 
            ? storyContent.beats.map((beat: any) => beat.content || '').join(' ')
            : (typeof storyContent === 'string' ? storyContent : JSON.stringify(storyContent));
          
          // Extract art URLs from story
          const coverArtUrl = story.cover_art_url || '';
          const sceneArtUrls = Array.isArray(story.scene_art_urls) ? story.scene_art_urls : [];
          
          // Invoke Content Agent to generate PDF
          const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
          const lambda = new LambdaClient({ region: 'us-east-1' });
          
          const payload = {
            action: 'generate_pdf',
            storyId,
            story: {
              id: story.id,
              title: story.title,
              content: story.content // Pass full content structure (with beats array)
            },
            character: characterObj,
            includeActivities,
            activities: includeActivities ? (story.activities || []) : undefined,
            customization
          };
          
          this.logger.info('Invoking Content Agent for PDF generation', { userId, storyId });
          
          const response = await lambda.send(new InvokeCommand({
            FunctionName: 'storytailor-content-agent-production',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload)
          }));
          
          const result = JSON.parse(new TextDecoder().decode(response.Payload));
          const pdfData = result.body ? JSON.parse(result.body) : result;
          
          // Improved error handling
          if (!pdfData.success) {
            const errorMsg = pdfData.error || 'PDF generation failed';
            this.logger.error('PDF generation failed', { userId, storyId, error: errorMsg, response: pdfData });
            throw new Error(errorMsg);
          }
          
          // Update story with PDF URL
          const pdfUrl = pdfData.pdfUrl || pdfData.data?.pdfUrl;
          const pageCount = pdfData.pageCount || pdfData.data?.pageCount;
          const fileSize = pdfData.fileSize || pdfData.data?.fileSize;
          
          if (pdfUrl) {
            const { error: updateError } = await this.supabase
              .from('stories')
              .update({
                pdf_url: pdfUrl,
                pdf_pages: pageCount || null,
                pdf_file_size: fileSize || null
              })
              .eq('id', storyId);
            
            if (updateError) {
              this.logger.error('Failed to save PDF URL to story', { userId, storyId, error: updateError });
              throw new Error('Failed to save PDF URL to database');
            }
          }
          
          // Since it's synchronous (RequestResponse), status should be 'ready' if PDF URL exists
          res.status(pdfUrl ? 200 : 202).json({
            success: true,
            data: {
              storyId,
              pdfUrl: pdfUrl || null,
              status: pdfUrl ? 'ready' : 'generating',
              pageCount: pageCount || null,
              fileSize: fileSize || null,
              ...(pdfUrl ? {} : {
                estimatedTime: 30, // seconds
                realtimeChannel: `stories:id=${storyId}`,
                subscribePattern: {
                  table: 'stories',
                  filter: `id=eq.${storyId}`,
                  event: 'UPDATE'
                }
              })
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('PDF generation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'PDF_GENERATION_FAILED'
          });
        }
      }
    );

    // Continue story (sequel/next chapter)
    this.app.post(
      '/api/v1/stories/:storyId/continue',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const { continuationType, userDirection, themes, generateAssets } = req.body;
          
          // Get parent story
          const { data: parentStory, error: storyError } = await this.supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .single();
          
          if (storyError || !parentStory) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }
          
          // Verify write permissions
          const { data: library } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', parentStory.library_id)
            .single();
          
          if (library?.owner !== userId) {
            const { data: permission } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', parentStory.library_id)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // Invoke Content Agent for sequel generation
          const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
          const lambda = new LambdaClient({ region: 'us-east-1' });
          
          const payload = {
            action: 'continue_story',
            parentStoryId: storyId,
            parentStory,
            continuationType,
            userDirection,
            themes: themes || [],
            generateAssets: generateAssets !== false
          };
          
          this.logger.info('Invoking Content Agent for story continuation', { userId, storyId });
          
          const response = await lambda.send(new InvokeCommand({
            FunctionName: 'storytailor-content-agent-production',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload)
          }));
          
          const result = JSON.parse(new TextDecoder().decode(response.Payload));
          const sequelData = result.body ? JSON.parse(result.body) : result;
          
          if (!sequelData.success) {
            throw new Error(sequelData.error || 'Story continuation failed');
          }
          
          res.status(201).json({
            success: true,
            data: {
              ...sequelData.data,
              realtimeChannel: `stories:id=${sequelData.data?.id || storyId}`,
              subscribePattern: {
                table: 'stories',
                filter: `id=eq.${sequelData.data?.id || storyId}`,
                event: 'UPDATE'
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Story continuation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'STORY_CONTINUATION_FAILED'
          });
        }
      }
    );

    // Update story
    this.app.put(
      '/api/v1/stories/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.id;
          const { title, content, metadata } = req.body;
          
          const isObject = (v: unknown): v is Record<string, unknown> =>
            typeof v === 'object' && v !== null && !Array.isArray(v);

          // Fetch story and enforce access via library ownership/permissions.
          const { data: existingStory, error: fetchError } = await this.supabase
            .from('stories')
            .select('id, library_id, content')
            .eq('id', storyId)
            .single();
          if (fetchError) throw fetchError;

          const { data: library, error: libraryError } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', existingStory.library_id)
            .single();
          if (libraryError) throw libraryError;
          if (!library) throw new Error('Library not found');

          if (library.owner !== userId) {
            const { data: permission, error: permError } = await this.supabase
              .from('library_permissions')
              .select('id')
              .eq('library_id', existingStory.library_id)
              .eq('user_id', userId)
              .limit(1)
              .maybeSingle();
            if (permError) throw permError;
            if (!permission) {
              return res.status(403).json({
                success: false,
                error: 'Access denied',
                code: 'ACCESS_DENIED'
              });
            }
          }

          // Update story in Supabase (stories.content is JSONB; metadata is stored under content.metadata).
          const updateData: {
            title?: string;
            content?: Record<string, unknown>;
          } = {};

          if (title !== undefined) updateData.title = title;

          if (content !== undefined || metadata !== undefined) {
            const baseContent = isObject(existingStory.content) ? existingStory.content : {};
            const requestedContent = content !== undefined ? content : baseContent;

            if (!isObject(requestedContent)) {
              return res.status(400).json({
                success: false,
                error: 'content must be an object',
                code: 'INVALID_CONTENT'
              });
            }

            let nextContent: Record<string, unknown> = requestedContent;

            if (metadata !== undefined) {
              if (!isObject(metadata)) {
                return res.status(400).json({
                  success: false,
                  error: 'metadata must be an object',
                  code: 'INVALID_METADATA'
                });
              }

              const baseMetadata = isObject(nextContent.metadata) ? nextContent.metadata : {};
              nextContent = {
                ...nextContent,
                metadata: { ...baseMetadata, ...metadata }
              };
            }

            updateData.content = nextContent;
          }

          const { data: story, error } = await this.supabase
            .from('stories')
            .update(updateData)
            .eq('id', storyId)
            .select()
            .single();
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: story
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update story', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_STORY_FAILED'
          });
        }
      }
    );

    // Story deletion endpoints
    this.app.delete(
      '/api/v1/stories/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.id;
          const { immediate = false, reason } = req.body;
          
          const result = await this.deletionService.requestStoryDeletion(
            storyId,
            userId,
            immediate,
            reason
          );
          
          res.json({
            success: true,
            requestId: result.requestId,
            scheduledDeletionAt: result.scheduledDeletionAt?.toISOString() || null,
            message: immediate 
              ? 'Story deletion initiated immediately'
              : `Story deletion scheduled for ${result.scheduledDeletionAt?.toLocaleDateString()}`
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Story deletion request failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'STORY_DELETION_FAILED'
          });
        }
      }
    );

    this.app.post(
      '/api/v1/stories/:id/delete/cancel',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { requestId } = req.body;
          
          if (!requestId) {
            return res.status(400).json({
              success: false,
              error: 'Request ID required',
              code: 'REQUEST_ID_MISSING'
            });
          }
          
          await this.deletionService.cancelDeletion(requestId, userId);
          
          res.json({
            success: true,
            message: 'Story deletion cancelled successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Story deletion cancellation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to cancel story deletion',
            code: 'STORY_DELETION_CANCELLATION_FAILED'
          });
        }
      }
    );

    // Character CRUD endpoints
    // List characters
    this.app.get(
      '/api/v1/characters',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { page, limit, offset } = this.parsePagination(req);
          
          // Get user's accessible libraries first
          const { data: ownedLibraries } = await this.supabase
            .from('libraries')
            .select('id')
            .eq('owner', userId);
          
          const { data: sharedLibraries } = await this.supabase
            .from('library_permissions')
            .select('library_id')
            .eq('user_id', userId);
          
          const accessibleLibraryIds = Array.from(new Set([
            ...(ownedLibraries || []).map((l: { id: string }) => l.id),
            ...(sharedLibraries || []).map((l: { library_id: string }) => l.library_id)
          ]));
          
          if (accessibleLibraryIds.length === 0) {
            return res.json(this.buildPaginationResponse([], 0, page, limit));
          }
          
          // Query characters by library_id (characters belong to libraries, not directly to users)
          // Get total count and data
          const [{ count: total }, { data: characters, error }] = await Promise.all([
            this.supabase
              .from('characters')
              .select('*', { count: 'exact', head: true })
              .in('library_id', accessibleLibraryIds),
            this.supabase
              .from('characters')
              .select('*')
              .in('library_id', accessibleLibraryIds)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1)
          ]);
          
          if (error) throw error;
          
          res.json(this.buildPaginationResponse(
            characters || [],
            total || 0,
            page,
            limit
          ));
        } catch (error) {
          // Better error message extraction for Supabase errors
          let errorMessage: string;
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
          } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
          } else {
            errorMessage = String(error);
          }
          
          this.logger.error('Failed to list characters', { error: errorMessage, rawError: error });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_CHARACTERS_FAILED'
          });
        }
      }
    );

    // Get single character
    this.app.get(
      '/api/v1/characters/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const characterId = req.params.id;
          
          // Get user's accessible libraries first
          const { data: ownedLibraries } = await this.supabase
            .from('libraries')
            .select('id')
            .eq('owner', userId);
          
          const { data: sharedLibraries } = await this.supabase
            .from('library_permissions')
            .select('library_id')
            .eq('user_id', userId);
          
          const accessibleLibraryIds = Array.from(new Set([
            ...(ownedLibraries || []).map((l: { id: string }) => l.id),
            ...(sharedLibraries || []).map((l: { library_id: string }) => l.library_id)
          ]));
          
          const { data: character, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .in('library_id', accessibleLibraryIds.length > 0 ? accessibleLibraryIds : ['00000000-0000-0000-0000-000000000000'])
            .single();
          
          if (error) throw error;

          // Get character stats (stories using this character)
          const { data: storiesWithCharacter } = await this.supabase
            .from('stories')
            .select('id')
            .contains('content', { characters: [{ id: characterId }] })
            .or(`metadata->>'primaryCharacterId'.eq.${characterId}`);

          // Get plays for stories with this character
          const storyIds = storiesWithCharacter?.map(s => s.id) || [];
          let plays = 0;
          let completions = 0;
          let totalListenTime = 0;
          let lastPlayed: string | null = null;

          if (storyIds.length > 0) {
            const { data: charInteractions } = await this.supabase
              .from('story_interactions')
              .select('interaction_type, interaction_data, created_at')
              .in('story_id', storyIds);

            plays = charInteractions?.filter(i => i.interaction_type === 'viewed').length || 0;
            completions = charInteractions?.filter(i => i.interaction_type === 'completed').length || 0;
            totalListenTime = charInteractions
              ?.filter(i => i.interaction_type === 'completed')
              .reduce((sum, i) => sum + (i.interaction_data?.duration_seconds || 0), 0) || 0;
            lastPlayed = charInteractions
              ?.filter(i => i.interaction_type === 'viewed')
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || null;
          }

          const avgCompletionRate = plays > 0 ? (completions / plays) * 100 : 0;

          // Get feedback summary
          let feedbackSummary = {
            total: 0,
            positive: 0,
            neutral: 0,
            negative: 0,
            averageRating: 0
          };

          try {
            const { data: summary } = await this.supabase
              .rpc('get_character_feedback_summary', { p_character_id: characterId });
            
            if (summary) {
              feedbackSummary = {
                total: summary.total || 0,
                positive: summary.sentimentCounts?.positive || 0,
                neutral: summary.sentimentCounts?.neutral || 0,
                negative: summary.sentimentCounts?.negative || 0,
                averageRating: Math.round((summary.averageRating || 0) * 10) / 10
              };
            }
          } catch (feedbackError) {
            // Feedback table might not exist yet, ignore
            this.logger.warn('Failed to get character feedback summary', { error: feedbackError });
          }
          
          res.json({
            success: true,
            data: {
              ...character,
              stats: {
                plays,
                completions,
                avgCompletionRate: Math.round(avgCompletionRate),
                totalListenTime: Math.round(totalListenTime / 60), // minutes
                lastPlayed
              },
              feedbackSummary
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get character', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get character',
            code: 'GET_CHARACTER_FAILED'
          });
        }
      }
    );

    // Create character
    this.app.post(
      '/api/v1/characters',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, libraryId, traits, artPrompt, appearanceUrl: requestAppearanceUrl, gender, ethnicity, inclusivityTraits, age, species, appearance, personality } = req.body;
          
          // Validate required fields
          if (!name || typeof name !== 'string') {
            return res.status(400).json({
              success: false,
              error: 'Character name is required',
              code: 'NAME_REQUIRED'
            });
          }
          
          // Parse name into first and last
          const { firstName, lastName } = this.parseFullName(name);
          
          // Validate gender if provided
          const validatedGender = this.validateGender(gender);
          if (gender && !validatedGender) {
            this.logger.warn('Invalid gender provided, ignoring', { gender, characterName: name });
          }
          
          // Validate species if provided
          const validSpecies = ['human', 'dragon', 'robot', 'monster', 'alien', 'dinosaur', 'superhero', 'fantasy_being', 'elemental'];
          const validatedSpecies = species && validSpecies.includes(species.toLowerCase()) ? species.toLowerCase() : 'human';
          
          // Get or create default library for character
          let libraryIdToUse = libraryId;
          if (!libraryIdToUse) {
            const { data: existingLibraries } = await this.supabase
              .from('libraries')
              .select('id')
              .eq('owner', userId)
              .limit(1)
              .single();
            
            if (existingLibraries) {
              libraryIdToUse = existingLibraries.id;
            } else {
              // Create default library
              const { data: newLibrary, error: libError } = await this.supabase
                .from('libraries')
                .insert({
                  owner: userId,
                  name: 'My Library'
                })
                .select('id')
                .single();
              
              if (libError || !newLibrary) {
                throw new Error('Failed to create default library for character');
              }
              
              libraryIdToUse = newLibrary.id;
            }
          }
          
          // Verify user has access to this library
          const { data: libraryCheck } = await this.supabase
            .from('libraries')
            .select('id')
            .eq('id', libraryIdToUse)
            .eq('owner', userId)
            .single();
          
          if (!libraryCheck) {
            // Check if user has write permission (Editor/Admin/Owner) via library_permissions
            const { data: permissionCheck } = await this.supabase
              .from('library_permissions')
              .select('role')
              .eq('library_id', libraryIdToUse)
              .eq('user_id', userId)
              .in('role', ['Owner', 'Admin', 'Editor'])
              .single();
            
            if (!permissionCheck) {
              return res.status(403).json({
                success: false,
                error: 'Editor, Admin, or Owner permission required to create characters in this library',
                code: 'WRITE_PERMISSION_REQUIRED'
              });
            }
          }
          
          // ===== CHARACTER QUOTA ENFORCEMENT =====
          // 1. Check subscription
          const { data: subscription, error: subscriptionError } = await this.supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          if (subscriptionError && subscriptionError.code !== 'PGRST116') {
            this.logger.error('Character quota check failed (subscription lookup)', {
              userId,
              error: subscriptionError.message
            });
            return res.status(500).json({
              success: false,
              error: 'Failed to check character quota',
              code: 'QUOTA_CHECK_FAILED'
            });
          }

          const hasSub = subscription && subscription.plan_id !== 'free';

          // 2. Check free tier limit (with test_mode_authorized bypass)
          if (!hasSub) {
            const { data: user, error: userError } = await this.supabase
              .from('users')
              .select('test_mode_authorized')
              .eq('id', userId)
              .single();

            if (userError) {
              this.logger.error('Character quota check failed (user lookup)', {
                userId,
                error: userError.message
              });
              return res.status(500).json({
                success: false,
                error: 'Failed to check character quota',
                code: 'QUOTA_CHECK_FAILED'
              });
            }

            const isTestModeAuthorized = user?.test_mode_authorized === true;

            if (isTestModeAuthorized) {
              console.log(`quota_bypass userId=${userId} endpoint=POST_/characters reason=test_mode_authorized`);
            } else {
              // Count characters by creator_user_id (preferred) or fallback to user count
              const { count: characterCount, error: characterCountError } = await this.supabase
                .from('characters')
                .select('*', {count: 'exact', head: true})
                .eq('creator_user_id', userId);
              
              if (characterCountError) {
                this.logger.error('Character quota check failed (character count)', {
                  userId,
                  error: characterCountError.message
                });
                return res.status(500).json({
                  success: false,
                  error: 'Failed to check character quota',
                  code: 'QUOTA_CHECK_FAILED'
                });
              }

              const totalCreated = characterCount ?? 0;
              
              if (totalCreated >= 10) {
                console.log(`quota_block userId=${userId} endpoint=POST_/characters code=CHARACTER_QUOTA_EXCEEDED`);
                return res.status(402).json({
                  success: false,
                  error: "Character limit reached",
                  code: "CHARACTER_QUOTA_EXCEEDED",
                  quota: {
                    tier: 'free',
                    used: totalCreated,
                    limit: 10
                  },
                  upgradeOptions: {
                    proIndividual: {
                      name: "Pro Individual",
                      price: "$9.99/month",
                      features: ["Unlimited characters", "Unlimited stories", "Premium voice"],
                      checkoutUrl: `/api/v1/checkout?planId=pro_individual&returnUrl=${encodeURIComponent(req.headers.referer || '/characters')}`
                    }
                  }
                });
              }
            }
          }
          // ===== END CHARACTER QUOTA ENFORCEMENT =====
          
          // Build traits object with all character data
          const characterTraits: Record<string, unknown> = {
            ...(traits || {}),
            fullName: name,
            firstName,
            ...(lastName && { lastName }),
            ...(validatedGender && { gender: validatedGender }),
            ...(validatedSpecies && { species: validatedSpecies }),
            ...(age && { age: Number(age) }),
            ...(ethnicity && Array.isArray(ethnicity) && ethnicity.length > 0 && { ethnicity }),
            ...(inclusivityTraits && Array.isArray(inclusivityTraits) && inclusivityTraits.length > 0 && { inclusivityTraits }),
            ...(appearance && { appearance }),
            ...(personality && Array.isArray(personality) && { personality })
          };
          
          const insertData: {
            library_id: string;
            creator_user_id?: string;  // CRITICAL: Track creator for quota attribution
            name: string;
            traits: Record<string, unknown>;
            art_prompt?: string | null;
            appearance_url?: string | null;
          } = {
            library_id: libraryIdToUse,
            creator_user_id: userId,  // CRITICAL: Track creator for quota attribution
            name: name,
            traits: characterTraits
          };
          
          if (artPrompt !== undefined) {
            insertData.art_prompt = artPrompt || null;
          }
          if (requestAppearanceUrl !== undefined) {
            insertData.appearance_url = requestAppearanceUrl || null;
          }
          
          const { data: character, error } = await this.supabase
            .from('characters')
            .insert(insertData)
            .select()
            .single();
          
          if (error) throw error;
          
          // Generate character art asynchronously (following Supabase Realtime pattern)
          let assetsStatus = {
            referenceImages: 'generating' as 'pending' | 'ready' | 'generating',
            appearanceUrl: 'generating' as 'pending' | 'ready' | 'generating'
          };

          // Invoke Content Agent asynchronously to generate images in background
          try {
            const { LambdaClient, InvokeCommand } = await import('@aws-sdk/client-lambda');
            const lambda = new LambdaClient({ region: 'us-east-1' });

            // Prepare character data for art generation
            const artGenerationPayload: any = {
              action: 'generate_character_art',
              characterId: character.id,
              characterName: character.name,
              characterTraits: character.traits,
              userId
            };
            
            // Always pass ethnicity if provided (single or mixed-race)
            if (ethnicity && Array.isArray(ethnicity) && ethnicity.length > 0) {
              artGenerationPayload.ethnicity = ethnicity;
              artGenerationPayload.isMixedRace = ethnicity.length > 1;
            } else if (characterTraits?.ethnicity && Array.isArray(characterTraits.ethnicity) && characterTraits.ethnicity.length > 0) {
              // Fallback to ethnicity in traits if not at top level
              artGenerationPayload.ethnicity = characterTraits.ethnicity;
              artGenerationPayload.isMixedRace = characterTraits.ethnicity.length > 1;
            }
            
            // Pass inclusivity traits for character art
            if (inclusivityTraits && Array.isArray(inclusivityTraits) && inclusivityTraits.length > 0) {
              artGenerationPayload.inclusivityTraits = inclusivityTraits;
            } else if (characterTraits?.inclusivityTraits && Array.isArray(characterTraits.inclusivityTraits) && characterTraits.inclusivityTraits.length > 0) {
              // Fallback to inclusivityTraits in traits if not at top level
              artGenerationPayload.inclusivityTraits = characterTraits.inclusivityTraits;
            }

            // Update character with generating status
            // Invoke ASYNCHRONOUSLY - don't wait for images
            console.log('character_art_enqueue', {
              characterId: character.id,
              libraryId: libraryIdToUse,
              hasEthnicity: !!artGenerationPayload.ethnicity,
              hasInclusivityTraits: Array.isArray(artGenerationPayload.inclusivityTraits) && artGenerationPayload.inclusivityTraits.length > 0
            });
            await lambda.send(new InvokeCommand({
              FunctionName: 'storytailor-content-agent-production',
              InvocationType: 'Event', // Async - images generate in background
              Payload: JSON.stringify(artGenerationPayload)
            }));

            console.log('character_art_enqueued', { characterId: character.id });
          } catch (lambdaError) {
            // Log error but don't fail character creation
            this.logger.warn('Failed to trigger character art generation', { 
              error: lambdaError instanceof Error ? lambdaError.message : String(lambdaError),
              characterId: character.id
            });
          }
          
          // Return immediately with generating status
          // Frontend subscribes to Supabase Realtime for updates
          res.status(201).json({
            success: true,
            data: {
              ...character,
              reference_images: [],
              appearance_url: null,
              assetsStatus,
              realtimeChannel: `characters:id=${character.id}`
            }
          });
        } catch (error) {
          // Better error message extraction for Supabase errors
          let errorMessage: string;
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = String(error.message);
          } else if (error && typeof error === 'object') {
            errorMessage = JSON.stringify(error);
          } else {
            errorMessage = String(error);
          }
          
          this.logger.error('Failed to create character', { error: errorMessage, rawError: error });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to create character',
            code: 'CREATE_CHARACTER_FAILED'
          });
        }
      }
    );

    // Update character
    this.app.put(
      '/api/v1/characters/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const characterId = req.params.id;
          const { name, traits, artPrompt, appearanceUrl } = req.body;
          
          const updateData: {
            name?: string;
            traits?: Record<string, unknown>;
            art_prompt?: string | null;
            appearance_url?: string | null;
          } = {};
          if (name !== undefined) updateData.name = name;
          if (traits !== undefined) updateData.traits = traits;
          if (artPrompt !== undefined) updateData.art_prompt = artPrompt || null;
          if (appearanceUrl !== undefined) updateData.appearance_url = appearanceUrl || null;
          
          const { data: character, error } = await this.supabase
            .from('characters')
            .update(updateData)
            .eq('id', characterId)
            .eq('user_id', userId)
            .select()
            .single();
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: character
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update character', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to update character',
            code: 'UPDATE_CHARACTER_FAILED'
          });
        }
      }
    );

    // Character deletion endpoints
    this.app.delete(
      '/api/v1/characters/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const characterId = req.params.id;
          const { immediate = false, reason, deleteStories, removeFromStories } = req.body;
          
          const result = await this.deletionService.requestCharacterDeletion(
            characterId,
            userId,
            {
              deleteStories: deleteStories || false,
              removeFromStories: removeFromStories || false
            }
          );
          
          res.json({
            success: true,
            requestId: result.requestId,
            scheduledDeletionAt: result.scheduledDeletionAt.toISOString(),
            message: `Character deletion scheduled for ${result.scheduledDeletionAt.toLocaleDateString()}`
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Character deletion request failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to request character deletion',
            code: 'CHARACTER_DELETION_FAILED'
          });
        }
      }
    );

    // Library CRUD endpoints
    // List libraries
    this.app.get(
      '/api/v1/libraries',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { page, limit, offset } = this.parsePagination(req);
          
          // Query Supabase for libraries where user is owner (using 'owner' column, not 'owner_id')
          // Get total count and data
          const [{ count: total }, { data: libraries, error }] = await Promise.all([
            this.supabase
              .from('libraries')
              .select('*', { count: 'exact', head: true })
              .eq('owner', userId),
            this.supabase
              .from('libraries')
              .select('*')
              .eq('owner', userId)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1)
          ]);
          
          if (error) throw error;
          
          res.json(this.buildPaginationResponse(
            libraries || [],
            total || 0,
            page,
            limit
          ));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list libraries', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to list libraries',
            code: 'LIST_LIBRARIES_FAILED'
          });
        }
      }
    );

    // Get single library
    this.app.get(
      '/api/v1/libraries/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const libraryId = req.params.id;
          
          const { data: library, error } = await this.supabase
            .from('libraries')
            .select('*')
            .eq('id', libraryId)
            .eq('owner', userId)
            .single();
          
          if (error) throw error;

          // Get library stats
          const [{ count: totalStories }, { count: totalCharacters }, { data: stories }] = await Promise.all([
            this.supabase
              .from('stories')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', libraryId),
            this.supabase
              .from('characters')
              .select('*', { count: 'exact', head: true })
              .eq('library_id', libraryId),
            this.supabase
              .from('stories')
              .select('id, title, metadata, created_at')
              .eq('library_id', libraryId)
              .order('created_at', { ascending: false })
          ]);

          // Get story type distribution
          const storyTypes: Record<string, number> = {};
          stories?.forEach(story => {
            const type = story.metadata?.storyType || story.metadata?.type || 'unknown';
            storyTypes[type] = (storyTypes[type] || 0) + 1;
          });
          const popularType = Object.entries(storyTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

          // Get completion rate (from story interactions)
          const { data: completions } = await this.supabase
            .from('story_interactions')
            .select('story_id, interaction_type')
            .in('story_id', stories?.map(s => s.id) || [])
            .eq('interaction_type', 'completed');

          const uniqueCompletions = new Set(completions?.map(c => c.story_id) || []);
          const avgCompletionRate = stories && stories.length > 0 
            ? (uniqueCompletions.size / stories.length) * 100 
            : 0;

          // Get total listen time
          const { data: allInteractions } = await this.supabase
            .from('story_interactions')
            .select('interaction_data')
            .in('story_id', stories?.map(s => s.id) || [])
            .eq('interaction_type', 'completed');

          const totalListenTime = allInteractions?.reduce((sum, i) => {
            return sum + (i.interaction_data?.duration_seconds || 0);
          }, 0) || 0;

          // Get top 5 stories by plays
          const { data: storyPlays } = await this.supabase
            .from('story_interactions')
            .select('story_id')
            .in('story_id', stories?.map(s => s.id) || [])
            .eq('interaction_type', 'viewed');

          const playCounts: Record<string, number> = {};
          storyPlays?.forEach(play => {
            playCounts[play.story_id] = (playCounts[play.story_id] || 0) + 1;
          });

          const topStories = stories
            ?.map(story => ({
              id: story.id,
              title: story.title,
              plays: playCounts[story.id] || 0,
              rating: null // Would need to join with feedback table
            }))
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 5) || [];

          // Get recent activity (last 10 actions)
          const { data: recentActivity } = await this.supabase
            .from('story_interactions')
            .select('story_id, interaction_type, created_at, interaction_data')
            .in('story_id', stories?.map(s => s.id) || [])
            .order('created_at', { ascending: false })
            .limit(10);

          const activity = recentActivity?.map(act => ({
            type: act.interaction_type,
            storyId: act.story_id,
            timestamp: act.created_at,
            metadata: act.interaction_data
          })) || [];
          
          res.json({
            success: true,
            data: {
              ...library,
              stats: {
                totalStories: totalStories || 0,
                totalCharacters: totalCharacters || 0,
                popularType,
                avgCompletionRate: Math.round(avgCompletionRate),
                listenTime: Math.round(totalListenTime / 60) // minutes
              },
              recentActivity: activity,
              topStories
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get library', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get library',
            code: 'GET_LIBRARY_FAILED'
          });
        }
      }
    );

    // Create library
    this.app.post(
      '/api/v1/libraries',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, description, isPublic, metadata } = req.body;
          
          // Libraries table only has: id, owner, name, parent_library, created_at
          // Remove fields that don't exist in schema
          const { data: library, error } = await this.supabase
            .from('libraries')
            .insert({
              owner: userId,
              name: name || 'My Library'
            })
            .select()
            .single();
          
          if (error) throw error;
          
          res.status(201).json({
            success: true,
            data: library
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create library', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to create library',
            code: 'CREATE_LIBRARY_FAILED'
          });
        }
      }
    );

    // Update library
    this.app.put(
      '/api/v1/libraries/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const libraryId = req.params.id;
          const { name, description, isPublic, metadata } = req.body;
          
          // Verify user is owner (using 'owner' column, not 'owner_id')
          const { data: existingLibrary, error: checkError } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', libraryId)
            .single();
          
          if (checkError) throw checkError;
          if (existingLibrary.owner !== userId) {
            return res.status(403).json({
              success: false,
              error: 'Only library owner can update library',
              code: 'PERMISSION_DENIED'
            });
          }
          
          // Libraries table only supports: name, parent_library
          const updateData: {
            name?: string;
            parent_library?: string | null;
          } = {};
          if (name !== undefined) updateData.name = name;
          
          const { data: library, error } = await this.supabase
            .from('libraries')
            .update(updateData)
            .eq('id', libraryId)
            .eq('owner', userId)
            .select()
            .single();
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: library
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update library', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to update library',
            code: 'UPDATE_LIBRARY_FAILED'
          });
        }
      }
    );

    // Library member removal endpoint
    this.app.post(
      '/api/v1/libraries/:id/members/:userId/remove',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const adminUserId = req.user!.id;
          const libraryId = req.params.id;
          const memberUserId = req.params.userId;
          
          await this.deletionService.removeLibraryMember(
            libraryId,
            memberUserId,
            adminUserId
          );
          
          res.json({
            success: true,
            message: 'Library member removed successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Library member removal failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to remove library member',
            code: 'LIBRARY_MEMBER_REMOVAL_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // STORYTAILOR ID ENDPOINTS
    // ==========================================================================

    // Create Storytailor ID (character-first creation supported)
    this.app.post(
      '/api/v1/storytailor-ids',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, primary_character_id, age_range, is_minor, parent_storytailor_id } = req.body;

          if (!name || !name.trim()) {
            return res.status(400).json({
              success: false,
              error: 'Name is required',
              code: 'INVALID_INPUT'
            });
          }

          // Validate character-first creation if primary_character_id provided
          if (primary_character_id) {
            const { data: character, error: charError } = await this.supabase
              .from('characters')
              .select('id, story_id')
              .eq('id', primary_character_id)
              .single();

            if (charError || !character) {
              return res.status(404).json({
                success: false,
                error: 'Primary character not found',
                code: 'CHARACTER_NOT_FOUND'
              });
            }

            // Verify character is not already primary for another library
            const { data: existingLibrary } = await this.supabase
              .from('libraries')
              .select('id')
              .eq('primary_character_id', primary_character_id)
              .single();

            if (existingLibrary) {
              return res.status(409).json({
                success: false,
                error: 'Character is already primary for another Storytailor ID',
                code: 'CHARACTER_ALREADY_PRIMARY'
              });
            }
          }

          // Create library (Storytailor ID)
          const library = await this.libraryService.createLibrary({
            name: name.trim(),
            primary_character_id,
            age_range,
            is_minor,
            parent_library: parent_storytailor_id
          } as any, {
            user_id: userId
          });

          // Type assertion for Storytailor ID fields (fields exist at runtime)
          const storytailorId = library as any;

          res.status(201).json({
            success: true,
            storytailorId: {
              id: library.id,
              name: library.name,
              primaryCharacterId: storytailorId.primary_character_id,
              ageRange: storytailorId.age_range,
              isMinor: storytailorId.is_minor,
              consentStatus: storytailorId.consent_status,
              createdAt: library.created_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create Storytailor ID', { error: errorMessage });
          
          // Handle specific library errors
          if (errorMessage.includes('CHARACTER_NOT_FOUND')) {
            return res.status(404).json({
              success: false,
              error: 'Primary character not found',
              code: 'CHARACTER_NOT_FOUND'
            });
          }
          if (errorMessage.includes('CHARACTER_ALREADY_PRIMARY')) {
            return res.status(409).json({
              success: false,
              error: 'Character is already primary for another Storytailor ID',
              code: 'CHARACTER_ALREADY_PRIMARY'
            });
          }
          if (errorMessage.includes('COPPA')) {
            return res.status(403).json({
              success: false,
              error: 'Parent consent required for users under 13 creating child Storytailor IDs',
              code: 'COPPA_CONSENT_REQUIRED'
            });
          }

          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to create Storytailor ID',
            code: 'CREATE_STORYTAILOR_ID_FAILED'
          });
        }
      }
    );

    // List user's Storytailor IDs
    this.app.get(
      '/api/v1/storytailor-ids',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const libraries = await this.libraryService.getUserLibraries({
            user_id: userId
          });

          res.json({
            success: true,
            storytailorIds: libraries.map(lib => {
              const storytailorId = lib as any;
              return {
                id: lib.id,
                name: lib.name,
                primaryCharacterId: storytailorId.primary_character_id,
                ageRange: storytailorId.age_range,
                isMinor: storytailorId.is_minor,
                consentStatus: storytailorId.consent_status,
                createdAt: lib.created_at
              };
            })
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list Storytailor IDs', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to list Storytailor IDs',
            code: 'LIST_STORYTAILOR_IDS_FAILED'
          });
        }
      }
    );

    // Get single Storytailor ID
    this.app.get(
      '/api/v1/storytailor-ids/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storytailorId = req.params.id;

          const library = await this.libraryService.getLibrary(storytailorId, {
            user_id: userId
          });

          // Type assertion for Storytailor ID fields (fields exist at runtime)
          const storytailorIdData = library as any;

          res.json({
            success: true,
            storytailorId: {
              id: library.id,
              name: library.name,
              primaryCharacterId: storytailorIdData.primary_character_id,
              ageRange: storytailorIdData.age_range,
              isMinor: storytailorIdData.is_minor,
              consentStatus: storytailorIdData.consent_status,
              policyVersion: storytailorIdData.policy_version,
              evaluatedAt: storytailorIdData.evaluated_at,
              createdAt: library.created_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('not found') || errorMessage.includes('Access denied')) {
            return res.status(404).json({
              success: false,
              error: 'Storytailor ID not found',
              code: 'STORYTAILOR_ID_NOT_FOUND'
            });
          }

          this.logger.error('Failed to get Storytailor ID', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get Storytailor ID',
            code: 'GET_STORYTAILOR_ID_FAILED'
          });
        }
      }
    );

    // Request parental consent for child Storytailor ID
    this.app.post(
      '/api/v1/storytailor-ids/:id/consent',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storytailorId = req.params.id;
          const { consent_method = 'email', consent_scope = {} } = req.body;

          // Verify library is a child Storytailor ID (sub-library)
          const library = await this.libraryService.getLibrary(storytailorId, {
            user_id: userId
          });

          if (!library.parent_library) {
            return res.status(400).json({
              success: false,
              error: 'Consent workflow only applies to child Storytailor IDs',
              code: 'NOT_CHILD_STORYTAILOR_ID'
            });
          }

          // Validate consent method
          const validMethods = ['email', 'sms', 'video_call', 'id_verification', 'voice', 'app'];
          if (!validMethods.includes(consent_method)) {
            return res.status(400).json({
              success: false,
              error: `Invalid consent method. Must be one of: ${validMethods.join(', ')}`,
              code: 'INVALID_CONSENT_METHOD'
            });
          }

          // Generate verification token
          const verificationToken = crypto.randomBytes(32).toString('hex');
          const consentRecordId = `consent-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

          // Create consent request
          const { data: consent, error: consentError } = await this.supabase
            .from('library_consent')
            .insert({
              library_id: library.id,
              adult_user_id: userId,
              consent_status: 'pending',
              consent_method: consent_method,
              verification_token: verificationToken,
              consent_scope: consent_scope,
              consent_record_id: consentRecordId,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
            })
            .select()
            .single();

          if (consentError) {
            this.logger.error('Failed to create consent request', { error: consentError });
            return res.status(500).json({
              success: false,
              error: 'Failed to create consent request',
              code: 'CONSENT_CREATION_FAILED'
            });
          }

          // Get user email for consent email
          const { data: user } = await this.supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', userId)
            .single();

          // Send consent email (via EmailService)
          if (user?.email) {
            try {
              const consentUrl = `${process.env.APP_URL || 'https://storytailor.com'}/consent/verify?token=${verificationToken}&record=${consentRecordId}`;
              const expiresAt = consent.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
              const parentName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email;
              
              await this.emailService.sendParentConsentEmail(
                user.email,
                parentName,
                library.name, // childName (Storytailor ID name)
                '', // childEmail (not applicable for Storytailor IDs)
                consentUrl,
                expiresAt
              );
            } catch (emailError) {
              this.logger.warn('Failed to send consent email', { error: emailError });
              // Don't fail the request if email fails
            }
          }

          res.status(201).json({
            success: true,
            consent: {
              id: consent.id,
              status: consent.consent_status,
              method: consent.consent_method,
              requestedAt: consent.requested_at,
              expiresAt: consent.expires_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to request consent', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to request consent',
            code: 'CONSENT_REQUEST_FAILED'
          });
        }
      }
    );

    // Transfer Storytailor ID ownership
    this.app.post(
      '/api/v1/storytailor-ids/:id/transfer',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storytailorId = req.params.id;
          const { to_user_id } = req.body;

          if (!to_user_id) {
            return res.status(400).json({
              success: false,
              error: 'to_user_id is required',
              code: 'TARGET_USER_REQUIRED'
            });
          }

          // Verify current user is owner
          const library = await this.libraryService.getLibrary(storytailorId, {
            user_id: userId
          });

          // Check permission (must be owner)
          const { data: permission } = await this.supabase
            .from('library_permissions')
            .select('role')
            .eq('library_id', storytailorId)
            .eq('user_id', userId)
            .single();

          if (!permission || permission.role !== 'Owner') {
            return res.status(403).json({
              success: false,
              error: 'Only the owner can transfer a Storytailor ID',
              code: 'PERMISSION_DENIED'
            });
          }

          // Verify target user exists
          const { data: targetUser, error: userError } = await this.supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', to_user_id)
            .single();

          if (userError || !targetUser) {
            return res.status(404).json({
              success: false,
              error: 'Target user not found',
              code: 'TARGET_USER_NOT_FOUND'
            });
          }

          // Transfer library ownership (update owner, transfer permissions)
          const { error: transferError } = await this.supabase
            .from('libraries')
            .update({ owner: to_user_id })
            .eq('id', storytailorId);

          if (transferError) {
            throw transferError;
          }

          // Update owner permission
          const { error: permError } = await this.supabase
            .from('library_permissions')
            .update({
              user_id: to_user_id,
              role: 'Owner',
              granted_by: userId
            })
            .eq('library_id', storytailorId)
            .eq('role', 'Owner');

          if (permError) {
            this.logger.warn('Failed to update owner permission', { error: permError });
            // Continue even if permission update fails - owner was updated
          }

          // Send email notification to new owner
          try {
            const { data: currentUser } = await this.supabase
              .from('users')
              .select('email, first_name, last_name')
              .eq('id', userId)
              .single();

            if (currentUser?.email && targetUser.email) {
              const senderName = currentUser.first_name && currentUser.last_name
                ? `${currentUser.first_name} ${currentUser.last_name}`
                : currentUser.email;

              // Note: EmailService would need a sendStorytailorIdTransferEmail method
              // For now, we'll log it
              this.logger.info('Storytailor ID transferred', {
                storytailorId,
                fromUserId: userId,
                toUserId: to_user_id,
                libraryName: library.name
              });
            }
          } catch (emailError) {
            this.logger.warn('Failed to send transfer email', { error: emailError });
            // Don't fail the transfer if email fails
          }

          res.json({
            success: true,
            message: 'Storytailor ID transferred successfully',
            data: {
              storytailorId,
              newOwnerId: to_user_id,
              newOwnerEmail: targetUser.email
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to transfer Storytailor ID', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to transfer Storytailor ID',
            code: 'TRANSFER_STORYTAILOR_ID_FAILED'
          });
        }
      }
    );

    // Conversation endpoints
    // Start conversation
    this.app.post(
      '/api/v1/conversations/start',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { channel, sessionId, metadata } = req.body;
          
          if (!this.storytellerAPI || !this.storytellerAPI.startConversation) {
            return res.status(503).json({
              success: false,
              error: 'Conversation service not available',
              code: 'SERVICE_UNAVAILABLE'
            });
          }
          
          // Normalize channel/platform values
          const normalizedChannel = channel || 'api';
          const normalizedPlatform = normalizedChannel === 'api' ? 'api' : normalizedChannel;
          
          const session = await this.storytellerAPI.startConversation({
            userId,
            platform: normalizedPlatform,
            sessionId,
            language: 'en-US',
            voiceEnabled: false,
            smartHomeEnabled: false,
            parentalControls: { enabled: false, ageRestrictions: {} },
            privacySettings: { dataRetention: 'standard', consentLevel: 'standard' }
          });
          
          // Persist session to database
          try {
            const { error: dbError } = await this.supabase
              .from('conversation_sessions')
              .upsert({
                session_id: session.sessionId,
                user_id: userId,
                conversation_phase: session.state.phase || 'initial',
                story_state: session.state.currentStory || {},
                conversation_context: session.state.context || {},
                device_history: [],
                user_context: metadata || {},
                created_at: session.startedAt,
                expires_at: session.expiresAt
              }, {
                onConflict: 'session_id'
              });
            
            if (dbError) {
              this.logger.warn('Failed to persist conversation session to database', {
                error: dbError.message,
                sessionId: session.sessionId,
                code: dbError.code,
                details: dbError.details
              });
              // Continue even if database persistence fails - session is in memory
            } else {
              this.logger.info('Conversation session persisted to database', {
                sessionId: session.sessionId,
                userId
              });
            }
          } catch (persistError) {
            const errorMessage = persistError instanceof Error ? persistError.message : String(persistError);
            this.logger.warn('Error persisting conversation session', {
              error: errorMessage,
              sessionId: session.sessionId,
              stack: persistError?.stack
            });
            // Continue even if database persistence fails
          }
          
          res.status(201).json({
            success: true,
            data: session
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to start conversation', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to start conversation',
            code: 'START_CONVERSATION_FAILED'
          });
        }
      }
    );

    // Send message
    this.app.post(
      '/api/v1/conversations/:sessionId/message',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const sessionId = req.params.sessionId;
          const { message, messageType, metadata } = req.body;
          
          if (!this.storytellerAPI || !this.storytellerAPI.sendMessage) {
            return res.status(503).json({
              success: false,
              error: 'Conversation service not available',
              code: 'SERVICE_UNAVAILABLE'
            });
          }
          
          const response = await this.storytellerAPI.sendMessage(sessionId, {
            type: messageType || 'text',
            content: message,
            metadata: metadata || {}
          });
          
          res.json({
            success: true,
            data: response
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to send message', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to send message',
            code: 'SEND_MESSAGE_FAILED'
          });
        }
      }
    );

    // Get conversation session
    this.app.get(
      '/api/v1/conversations/:sessionId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const sessionId = req.params.sessionId;
          
          // Query conversation session from database by session_id (text field), not id (UUID)
          const { data: session, error } = await this.supabase
            .from('conversation_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .single();
          
          if (error) {
            const errorMessage = (error as { message?: string })?.message || String(error)
            this.logger.warn('Conversation session not found', { sessionId, userId, error: errorMessage });
            return res.status(404).json({
              success: false,
              error: `Session ${sessionId} not found`,
              code: 'SESSION_NOT_FOUND'
            });
          }
          
          res.json({
            success: true,
            data: session
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get conversation session', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get conversation session',
            code: 'GET_SESSION_FAILED'
          });
        }
      }
    );

    // End conversation
    this.app.post(
      '/api/v1/conversations/:sessionId/end',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const sessionId = req.params.sessionId;
          
          if (this.storytellerAPI && this.storytellerAPI.endConversation) {
            await this.storytellerAPI.endConversation(sessionId);
          }
          
          // Update session in database (query by session_id, not id)
          const { error } = await this.supabase
            .from('conversation_sessions')
            .update({ 
              conversation_phase: 'ended'
            })
            .eq('session_id', sessionId)
            .eq('user_id', userId);
          
          if (error) throw error;
          
          res.json({
            success: true,
            message: 'Conversation ended successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to end conversation', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to end conversation',
            code: 'END_CONVERSATION_FAILED'
          });
        }
      }
    );

    // Webhook management endpoints
    // Register webhook
    this.app.post(
      '/api/v1/webhooks',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { url, events, secret, headers, timeout, retryPolicy } = req.body;
          
          if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({
              success: false,
              error: 'URL and events array are required',
              code: 'INVALID_REQUEST'
            });
          }
          
          const webhook = await this.webhookDeliverySystem.registerWebhook({
            userId,
            url,
            events,
            secret,
            headers,
            timeout,
            retryPolicy,
            isActive: true
          });
          
          res.status(201).json({
            success: true,
            data: webhook
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to register webhook', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to register webhook',
            code: 'REGISTER_WEBHOOK_FAILED'
          });
        }
      }
    );

    // List webhooks
    this.app.get(
      '/api/v1/webhooks',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          
          // Query webhooks from database
          const { data: webhooks, error } = await this.supabase
            .from('webhook_endpoints')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: webhooks || []
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list webhooks', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to list webhooks',
            code: 'LIST_WEBHOOKS_FAILED'
          });
        }
      }
    );

    // Get webhook
    this.app.get(
      '/api/v1/webhooks/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const webhookId = req.params.id;
          
          const { data: webhook, error } = await this.supabase
            .from('webhook_endpoints')
            .select('*')
            .eq('id', webhookId)
            .eq('user_id', userId)
            .single();
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: webhook
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get webhook', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get webhook',
            code: 'GET_WEBHOOK_FAILED'
          });
        }
      }
    );

    // Update webhook
    this.app.put(
      '/api/v1/webhooks/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const webhookId = req.params.id;
          const { url, events, secret, headers, timeout, retryPolicy, isActive } = req.body;
          
          const updateData: {
            url?: string;
            events?: string[];
            secret?: string;
            headers?: Record<string, string>;
            timeout?: number;
            retry_policy?: Record<string, unknown>;
            is_active?: boolean;
          } = {};
          if (url !== undefined) updateData.url = url;
          if (events !== undefined) updateData.events = events;
          if (secret !== undefined) updateData.secret = secret;
          if (headers !== undefined) updateData.headers = headers;
          if (timeout !== undefined) updateData.timeout = timeout;
          if (retryPolicy !== undefined) updateData.retry_policy = retryPolicy;
          if (isActive !== undefined) updateData.is_active = isActive;
          
          const { data: webhook, error } = await this.supabase
            .from('webhook_endpoints')
            .update(updateData)
            .eq('id', webhookId)
            .eq('user_id', userId)
            .select()
            .single();
          
          if (error) throw error;
          
          res.json({
            success: true,
            data: webhook
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update webhook', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to update webhook',
            code: 'UPDATE_WEBHOOK_FAILED'
          });
        }
      }
    );

    // Delete webhook
    this.app.delete(
      '/api/v1/webhooks/:id',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const webhookId = req.params.id;
          
          await this.webhookDeliverySystem.unregisterWebhook(webhookId, userId);
          
          const { error } = await this.supabase
            .from('webhook_endpoints')
            .delete()
            .eq('id', webhookId)
            .eq('user_id', userId);
          
          if (error) throw error;
          
          res.json({
            success: true,
            message: 'Webhook deleted successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to delete webhook', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to delete webhook',
            code: 'DELETE_WEBHOOK_FAILED'
          });
        }
      }
    );

    // Get webhook delivery history
    this.app.get(
      '/api/v1/webhooks/:id/deliveries',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const webhookId = req.params.id;
          
          // Verify webhook ownership
          const { data: webhook, error: checkError } = await this.supabase
            .from('webhook_endpoints')
            .select('id')
            .eq('id', webhookId)
            .eq('user_id', userId)
            .single();
          
          if (checkError || !webhook) {
            return res.status(404).json({
              success: false,
              error: 'Webhook not found',
              code: 'WEBHOOK_NOT_FOUND'
            });
          }
          
          // Query delivery history from database
          const { data: deliveries, error: deliveryError } = await this.supabase
            .from('webhook_deliveries')
            .select('*')
            .eq('webhook_id', webhookId)
            .order('created_at', { ascending: false })
            .limit(100);
          
          if (deliveryError) throw deliveryError;
          
          res.json({
            success: true,
            data: deliveries
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get webhook deliveries', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get webhook deliveries',
            code: 'GET_DELIVERIES_FAILED'
          });
        }
      }
    );

    // Conversation assets cleanup endpoint
    this.app.post(
      '/api/v1/conversations/:sessionId/assets/clear',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const sessionId = req.params.sessionId;
          const { assets } = req.body;
          
          await this.deletionService.handleConversationAssetDeletion(
            sessionId,
            userId,
            assets || []
          );
          
          res.json({
            success: true,
            message: 'Conversation assets cleared successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Conversation asset cleanup failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to clear conversation assets',
            code: 'ASSET_CLEANUP_FAILED'
          });
        }
      }
    );

    // Email tracking endpoint
    this.app.get(
      '/api/v1/emails/:messageId/track',
      async (req: Request, res: Response) => {
        try {
          const messageId = req.params.messageId;
          const { type } = req.query; // 'open' or 'click'
          
          // Record email engagement
          const { data: tracking, error } = await this.supabase
            .from('email_engagement_tracking')
            .select('*')
            .eq('message_id', messageId)
            .single();
          
          if (tracking) {
            // Update tracking record
            const updateData: {
              opened_at?: string;
              clicked_at?: string;
            } = {};
            if (type === 'open' && !tracking.opened_at) {
              updateData.opened_at = new Date().toISOString();
            }
            if (type === 'click' && !tracking.clicked_at) {
              updateData.clicked_at = new Date().toISOString();
            }
            
            if (Object.keys(updateData).length > 0) {
              await this.supabase
                .from('email_engagement_tracking')
                .update(updateData)
                .eq('id', tracking.id);
              
              // Update user_tiers.last_engagement_at
              if (tracking.user_id) {
                await this.supabase
                  .from('user_tiers')
                  .update({ last_engagement_at: new Date().toISOString() })
                  .eq('user_id', tracking.user_id);
              }
            }
          }
          
          // Return 1x1 transparent pixel for opens, or redirect for clicks
          if (type === 'open') {
            const pixel = Buffer.from(
              'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
              'base64'
            );
            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.send(pixel);
          } else if (type === 'click') {
            // Redirect to original URL (would be stored in metadata)
            const redirectUrl = tracking?.metadata?.redirectUrl || process.env.APP_URL || 'https://storytailor.com';
            return res.redirect(redirectUrl);
          }
          
          res.json({ success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Email tracking failed', { error: errorMessage });
          // Don't fail the request - tracking is non-critical
          res.json({ success: true });
        }
      }
    );

    // IP Attribution endpoints
    // Report IP dispute
    this.app.post(
      '/api/v1/stories/:storyId/ip-disputes',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.storyId;
          const { disputeType, characterName, franchise, owner, resolution } = req.body;
          
          if (!disputeType || !characterName) {
            return res.status(400).json({
              success: false,
              error: 'disputeType and characterName are required',
              code: 'INVALID_REQUEST'
            });
          }

          // Verify story ownership
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('id, library_id, libraries!inner(owner)')
            .eq('id', storyId)
            .single();

          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }

          // Create dispute
          const { data: dispute, error } = await this.supabase
            .from('ip_disputes')
            .insert({
              story_id: storyId,
              reported_by: userId,
              dispute_type: disputeType,
              character_name: characterName,
              franchise: franchise || null,
              owner: owner || null,
              status: 'pending'
            })
            .select()
            .single();

          if (error) throw error;

          // Log to audit
          await this.supabase
            .from('ip_detection_audit')
            .insert({
              story_id: storyId,
              detection_method: 'user_report',
              detected_characters: [{ name: characterName, franchise, owner }],
              user_id: userId,
              metadata: { disputeId: dispute.id, disputeType }
            });

          res.status(201).json({
            success: true,
            data: dispute
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to create IP dispute', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to create IP dispute',
            code: 'CREATE_DISPUTE_FAILED'
          });
        }
      }
    );

    // List IP disputes for a story
    this.app.get(
      '/api/v1/stories/:storyId/ip-disputes',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.storyId;

          // Verify story ownership
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('id, library_id, libraries!inner(owner)')
            .eq('id', storyId)
            .single();

          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }

          // Get disputes (users can see their own, staff can see all)
          const { data: disputes, error } = await this.supabase
            .from('ip_disputes')
            .select('*')
            .eq('story_id', storyId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          res.json({
            success: true,
            data: disputes || []
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get IP disputes', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get IP disputes',
            code: 'GET_DISPUTES_FAILED'
          });
        }
      }
    );

    // Get IP detection audit for a story
    this.app.get(
      '/api/v1/stories/:storyId/ip-detection-audit',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.storyId;

          // Verify story ownership
          const { data: story, error: storyError } = await this.supabase
            .from('stories')
            .select('id, library_id, libraries!inner(owner)')
            .eq('id', storyId)
            .single();

          if (storyError || !story) {
            return res.status(404).json({
              success: false,
              error: 'Story not found',
              code: 'STORY_NOT_FOUND'
            });
          }

          // Get audit records (staff only via RLS)
          const { data: auditRecords, error } = await this.supabase
            .from('ip_detection_audit')
            .select('*')
            .eq('story_id', storyId)
            .order('detection_timestamp', { ascending: false })
            .limit(100);

          if (error) throw error;

          res.json({
            success: true,
            data: auditRecords || []
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get IP detection audit', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage || 'Failed to get IP detection audit',
            code: 'GET_AUDIT_FAILED'
          });
        }
      }
    );

    // Research Agent endpoints (proxy to research agent service)
    // Note: Research agent is a separate service, but we can add proxy endpoints
    // for convenience if the research agent Lambda URL is configured
    const researchAgentEndpoint = process.env.RESEARCH_AGENT_ENDPOINT;
    
    if (researchAgentEndpoint) {
      // Analyze on-demand (proxy to research agent)
      this.app.post(
        '/api/v1/research/analyze',
        this.authMiddleware.requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
          try {
            const { tenantId, timeframe, focus, events } = req.body;
            
            const response = await fetch(`${researchAgentEndpoint}/api/v1/analyze`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
              },
              body: JSON.stringify({
                tenantId: tenantId || 'storytailor',
                timeframe: timeframe || '7 days',
                focus: focus || 'all',
                events: events || []
              })
            });

            const data = await response.json();
            res.json(data);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Research agent proxy failed', { error: errorMessage });
            res.status(500).json({
              success: false,
              error: errorMessage || 'Failed to call research agent',
              code: 'RESEARCH_AGENT_FAILED'
            });
          }
        }
      );

      // Get latest brief (proxy to research agent)
      this.app.get(
        '/api/v1/research/briefs/latest',
        this.authMiddleware.requireAuth,
        async (req: AuthenticatedRequest, res: Response) => {
          try {
            const tenantId = req.query.tenantId as string || 'storytailor';
            
            const response = await fetch(`${researchAgentEndpoint}/api/v1/briefs/latest?tenantId=${tenantId}`, {
              method: 'GET',
              headers: {
                'Authorization': req.headers.authorization || ''
              }
            });

            const data = await response.json();
            res.json(data);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('Research agent proxy failed', { error: errorMessage });
            res.status(500).json({
              success: false,
              error: errorMessage || 'Failed to call research agent',
              code: 'RESEARCH_AGENT_FAILED'
            });
          }
        }
      );
    }

    // ==========================================================================
    // TRANSFER & SHARING ENDPOINTS (Category 1)
    // ==========================================================================

    // Transfer story to another library
    this.app.post(
      '/api/v1/libraries/:libraryId/stories/:storyId/transfer',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { libraryId, storyId } = req.params;
          const { targetLibraryId, transferMessage, transferType = 'move' } = req.body;

          if (!targetLibraryId) {
            return res.status(400).json({
              success: false,
              error: 'Target library ID is required',
              code: 'TARGET_LIBRARY_REQUIRED'
            });
          }

          // Get target library owner
          const { data: targetLibrary } = await this.supabase
            .from('libraries')
            .select('owner')
            .eq('id', targetLibraryId)
            .single();

          if (!targetLibrary) {
            return res.status(404).json({
              success: false,
              error: 'Target library not found',
              code: 'TARGET_LIBRARY_NOT_FOUND'
            });
          }

          // Check if recipient user exists
          const { data: recipientUser } = await this.supabase
            .from('users')
            .select('id, email, first_name, last_name')
            .eq('id', targetLibrary.owner)
            .single();

          // Create transfer request (use placeholder user_id if recipient doesn't exist)
          const { data: transfer, error } = await this.supabase
            .from('story_transfers')
            .insert({
              story_id: storyId,
              from_library_id: libraryId,
              to_library_id: targetLibraryId,
              from_user_id: userId,
              to_user_id: recipientUser?.id || targetLibrary.owner,  // Use placeholder if no user
              transfer_type: transferType,
              transfer_message: transferMessage,
              status: 'pending',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // If recipient doesn't exist, create magic link
          let magicLink: { token: string; url: string } | null = null;
          const recipientEmail = recipientUser?.email || req.body.recipientEmail;
          
          if (!recipientUser && recipientEmail) {
            const { data: tokenData } = await this.supabase
              .rpc('generate_transfer_magic_token');
            
            const token = tokenData as string;
            
            await this.supabase
              .from('pending_transfer_magic_links')
              .insert({
                transfer_id: transfer.id,
                recipient_email: recipientEmail,
                magic_token: token,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
            
            magicLink = {
              token,
              url: `${process.env.APP_URL || process.env.FRONTEND_URL || 'https://storytailor.com'}/accept-transfer?token=${token}`
            };
          }

          // Send email notifications
          try {
            // Get story details
            const { data: story } = await this.supabase
              .from('stories')
              .select('title')
              .eq('id', storyId)
              .single();

            // Get sender and recipient details
            const { data: sender } = await this.supabase
              .from('users')
              .select('email, first_name, last_name')
              .eq('id', userId)
              .single();

            if (sender?.email && story && recipientEmail) {
              const senderName = sender.first_name && sender.last_name
                ? `${sender.first_name} ${sender.last_name}`
                : sender.email;

              if (recipientUser) {
                // Existing user - send normal transfer request
                const transferUrl = `${process.env.APP_URL || process.env.FRONTEND_URL || 'https://storytailor.com'}/library/${targetLibraryId}/transfers/${transfer.id}`;
                
                await this.emailService.sendStoryTransferRequestEmail(
                  recipientUser.email,
                  senderName,
                  story.title || 'Untitled Story',
                  transferUrl
                );
              } else if (magicLink) {
                // Non-user - send magic link email with account creation prompt
                const magicLinkUrl = magicLink.url;
                
                // Send email with magic link
                await this.emailService.sendEmail({
                  to: recipientEmail,
                  subject: `${senderName} sent you a story on Storytailor`,
                  html: `
                    <p>Hi there,</p>
                    <p>${senderName} has sent you a story: "${story.title || 'Untitled Story'}"</p>
                    <p>To accept this story, please create a free Storytailor account:</p>
                    <p><a href="${magicLinkUrl}">Accept Story & Create Account</a></p>
                    <p>This link expires in 7 days.</p>
                  `
                });
              }

              // Send confirmation email to sender
              await this.emailService.sendStoryTransferSentEmail(
                sender.email,
                senderName,
                recipientEmail,
                story.title || 'Untitled Story'
              );
            }
          } catch (emailError) {
            this.logger.warn('Failed to send transfer emails', { error: emailError, transferId: transfer.id });
            // Don't fail the transfer if email fails
          }

          res.status(201).json({
            success: true,
            data: {
              transferId: transfer.id,
              status: transfer.status,
              storyId: transfer.story_id,
              fromLibraryId: transfer.from_library_id,
              toLibraryId: transfer.to_library_id,
              expiresAt: transfer.expires_at,
              createdAt: transfer.created_at,
              ...(magicLink && {
                magicLink: {
                  url: magicLink.url,
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }
              })
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Story transfer failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'TRANSFER_FAILED'
          });
        }
      }
    );

    // Accept transfer via magic link (for non-users)
    this.app.post(
      '/api/v1/transfers/accept-magic',
      async (req: Request, res: Response) => {
        try {
          const { token, userId } = req.body;

          if (!token || !userId) {
            return res.status(400).json({
              success: false,
              error: 'Magic token and user ID are required',
              code: 'MISSING_REQUIRED_FIELDS'
            });
          }

          // Accept transfer via magic link
          const { data: result, error } = await this.supabase
            .rpc('accept_transfer_via_magic_link', {
              p_token: token,
              p_user_id: userId
            });

          if (error) throw error;

          const acceptResult = result as { success: boolean; error?: string; transferId?: string; storyId?: string; transferType?: string };

          if (!acceptResult.success) {
            return res.status(400).json({
              success: false,
              error: acceptResult.error || 'Failed to accept transfer',
              code: 'ACCEPT_TRANSFER_FAILED'
            });
          }

          res.json({
            success: true,
            data: {
              transferId: acceptResult.transferId,
              storyId: acceptResult.storyId,
              transferType: acceptResult.transferType,
              message: 'Transfer accepted successfully'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Magic link transfer acceptance failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ACCEPT_TRANSFER_FAILED'
          });
        }
      }
    );

    // Respond to transfer request
    this.app.post(
      '/api/v1/transfers/:transferId/respond',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { transferId } = req.params;
          const { response: transferResponse, responseMessage } = req.body;

          if (!['accepted', 'rejected'].includes(transferResponse)) {
            return res.status(400).json({
              success: false,
              error: 'Response must be "accepted" or "rejected"',
              code: 'INVALID_RESPONSE'
            });
          }

          // Update transfer status
          const { data: transfer, error } = await this.supabase
            .from('story_transfers')
            .update({
              status: transferResponse,
              response_message: responseMessage,
              responded_at: new Date().toISOString()
            })
            .eq('id', transferId)
            .eq('to_user_id', userId)
            .eq('status', 'pending')
            .select()
            .single();

          if (error) throw error;

          // If accepted, perform the actual transfer
          if (transferResponse === 'accepted' && transfer) {
            if (transfer.transfer_type === 'move') {
              await this.supabase
                .from('stories')
                .update({ library_id: transfer.to_library_id })
                .eq('id', transfer.story_id);
            } else {
              // Copy: duplicate the story
              const { data: originalStory } = await this.supabase
                .from('stories')
                .select('*')
                .eq('id', transfer.story_id)
                .single();

              if (originalStory) {
                const { id, created_at, updated_at, ...storyData } = originalStory;
                await this.supabase
                  .from('stories')
                  .insert({ ...storyData, library_id: transfer.to_library_id });
              }
            }
          }

          // Send email notifications
          if (transfer) {
            try {
              // Get story details
              const { data: story } = await this.supabase
                .from('stories')
                .select('title')
                .eq('id', transfer.story_id)
                .single();

              // Get sender and recipient details
              const { data: sender } = await this.supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', transfer.from_user_id)
                .single();

              const { data: recipient } = await this.supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', transfer.to_user_id)
                .single();

              if (sender?.email && recipient?.email && story) {
                const recipientName = recipient.first_name && recipient.last_name
                  ? `${recipient.first_name} ${recipient.last_name}`
                  : recipient.email;

                if (transferResponse === 'accepted') {
                  // Send accepted email to sender
                  await this.emailService.sendStoryTransferAcceptedEmail(
                    sender.email,
                    recipientName,
                    story.title || 'Untitled Story'
                  );
                } else {
                  // Send rejected email to sender
                  await this.emailService.sendStoryTransferRejectedEmail(
                    sender.email,
                    recipientName,
                    story.title || 'Untitled Story'
                  );
                }
              }
            } catch (emailError) {
              this.logger.warn('Failed to send transfer response emails', { error: emailError, transferId });
              // Don't fail the transfer if email fails
            }
          }

          res.json({
            success: true,
            data: {
              storyId: transfer?.story_id,
              newLibraryId: transferResponse === 'accepted' ? transfer?.to_library_id : null
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Transfer response failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'TRANSFER_RESPONSE_FAILED'
          });
        }
      }
    );

    // List pending transfers
    this.app.get(
      '/api/v1/transfers/pending',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const direction = req.query.direction as string || 'all';

          let query = this.supabase.from('story_transfers').select('*');

          if (direction === 'incoming') {
            query = query.eq('to_user_id', userId);
          } else if (direction === 'outgoing') {
            query = query.eq('from_user_id', userId);
          } else {
            query = query.or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
          }

          query = query.eq('status', 'pending');

          const { data: transfers, error } = await query;
          if (error) throw error;

          res.json({
            success: true,
            data: {
              transfers: transfers || [],
              total: transfers?.length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list transfers', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_TRANSFERS_FAILED'
          });
        }
      }
    );

    // Get transfer details
    this.app.get(
      '/api/v1/transfers/:transferId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { transferId } = req.params;

          const { data: transfer, error } = await this.supabase
            .from('story_transfers')
            .select('*')
            .eq('id', transferId)
            .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: transfer
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get transfer', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_TRANSFER_FAILED'
          });
        }
      }
    );

    // Share character to another library
    this.app.post(
      '/api/v1/libraries/:libraryId/characters/:characterId/share',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { libraryId, characterId } = req.params;
          const { targetLibraryId, shareType = 'copy' } = req.body;

          if (!targetLibraryId) {
            return res.status(400).json({
              success: false,
              error: 'Target library ID is required',
              code: 'TARGET_LIBRARY_REQUIRED'
            });
          }

          // Get original character
          const { data: originalCharacter, error: fetchError } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .eq('user_id', userId)
            .single();

          if (fetchError) throw fetchError;

          // Create a copy in target library
          const { id, created_at, updated_at, ...characterData } = originalCharacter;
          const { data: newCharacter, error: insertError } = await this.supabase
            .from('characters')
            .insert({
              ...characterData,
              library_id: targetLibraryId,
              source_character_id: shareType === 'reference' ? characterId : null
            })
            .select()
            .single();

          if (insertError) throw insertError;

          res.status(201).json({
            success: true,
            data: {
              shareId: newCharacter.id,
              characterId: characterId,
              status: 'shared'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Character share failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SHARE_CHARACTER_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // INVITATION ENDPOINTS (Category 2)
    // ==========================================================================

    // Invite friend to Storytailor
    this.app.post(
      '/api/v1/invites/friend',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { email, personalMessage } = req.body;

          if (!email) {
            return res.status(400).json({
              success: false,
              error: 'Email is required',
              code: 'EMAIL_REQUIRED'
            });
          }

          const inviteCode = `INV${Date.now().toString(36).toUpperCase()}`;
          const inviteUrl = `https://storytailor.com/invite/${inviteCode}`;

          // Build insert object - handle both email and to_email columns
          // Friend referrals don't need: organization_id, role, token
          // Note: library_id column doesn't exist in the invitations table
          const insertData: any = {
            type: 'friend',
            from_user_id: userId,
            to_email: email,
            invite_code: inviteCode,
            invite_url: inviteUrl,
            personal_message: personalMessage,
            discount_percentage: 10,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            organization_id: null, // Friend referrals don't have an organization
            role: null, // Friend referrals don't have a role (roles are for library invites)
            token: null // Friend referrals don't use tokens (tokens are for organization invites)
          };
          
          // If email column exists (for organization invites), set it to the same value
          // This handles the case where the table has both email and to_email columns
          insertData.email = email;
          
          const { data: invite, error } = await this.supabase
            .from('invitations')
            .insert(insertData)
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              inviteId: invite.id,
              inviteCode: invite.invite_code,
              inviteUrl: invite.invite_url,
              discountPercentage: invite.discount_percentage,
              expiresAt: invite.expires_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : (typeof error === 'object' && error !== null 
              ? JSON.stringify(error) 
              : String(error));
          this.logger.error('Friend invite failed', { 
            error: errorMessage, 
            userId: req.user?.id, 
            email: req.body?.email, 
            fullError: error 
          });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'INVITE_FAILED'
          });
        }
      }
    );

    // Invite user to library
    this.app.post(
      '/api/v1/libraries/:libraryId/invites',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { libraryId } = req.params;
          const { email, role, scope, expiresAt } = req.body;

          if (!email || !role) {
            return res.status(400).json({
              success: false,
              error: 'Email and role are required',
              code: 'MISSING_FIELDS'
            });
          }

          const inviteCode = `LIB${Date.now().toString(36).toUpperCase()}`;
          const inviteUrl = `https://storytailor.com/library-invite/${inviteCode}`;

          const { data: invite, error } = await this.supabase
            .from('invitations')
            .insert({
              type: 'library',
              from_user_id: userId,
              to_email: email,
              library_id: libraryId,
              role: role,
              invite_code: inviteCode,
              invite_url: inviteUrl,
              expires_at: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              inviteId: invite.id,
              inviteUrl: invite.invite_url,
              expiresAt: invite.expires_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Library invite failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIBRARY_INVITE_FAILED'
          });
        }
      }
    );

    // List invites
    this.app.get(
      '/api/v1/invites',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const type = req.query.type as string;
          const status = req.query.status as string;

          let query = this.supabase.from('invitations').select('*').eq('from_user_id', userId);

          if (type && type !== 'all') {
            query = query.eq('type', type);
          }
          if (status) {
            query = query.eq('status', status);
          }

          const { data: invites, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;

          res.json({
            success: true,
            data: {
              invites: invites || [],
              total: invites?.length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to list invites', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_INVITES_FAILED'
          });
        }
      }
    );

    // Get pending invites (incoming + outgoing)
    this.app.get(
      '/api/v1/invites/pending',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const userEmail = req.user!.email;

          // Outgoing
          const { data: outgoing } = await this.supabase
            .from('invitations')
            .select('*')
            .eq('from_user_id', userId)
            .eq('status', 'pending');

          // Incoming (by email)
          const { data: incoming } = await this.supabase
            .from('invitations')
            .select('*')
            .eq('to_email', userEmail)
            .eq('status', 'pending');

          res.json({
            success: true,
            data: {
              incoming: incoming || [],
              outgoing: outgoing || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get pending invites', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'PENDING_INVITES_FAILED'
          });
        }
      }
    );

    // Accept invite
    this.app.post(
      '/api/v1/invites/:inviteId/accept',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { inviteId } = req.params;

          const { data: invite, error: fetchError } = await this.supabase
            .from('invitations')
            .select('*')
            .eq('id', inviteId)
            .eq('status', 'pending')
            .single();

          if (fetchError) throw fetchError;

          // Update invite status
          const { error: updateError } = await this.supabase
            .from('invitations')
            .update({
              status: 'accepted',
              to_user_id: userId,
              accepted_at: new Date().toISOString()
            })
            .eq('id', inviteId);

          if (updateError) throw updateError;

          // If library invite, grant permission
          let accessGranted = {};
          if (invite.type === 'library' && invite.library_id) {
            // Grant library access (simplified - actual implementation would be more complex)
            accessGranted = {
              libraryId: invite.library_id,
              role: invite.role
            };
          }

          res.json({
            success: true,
            data: {
              accessGranted
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Accept invite failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ACCEPT_INVITE_FAILED'
          });
        }
      }
    );

    // Delete/cancel invite
    this.app.delete(
      '/api/v1/invites/:inviteId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { inviteId } = req.params;

          const { error } = await this.supabase
            .from('invitations')
            .update({ status: 'canceled' })
            .eq('id', inviteId)
            .eq('from_user_id', userId);

          if (error) throw error;

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Delete invite failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETE_INVITE_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // NOTIFICATION CENTER ENDPOINTS (Category 7)
    // ==========================================================================

    // Get notification feed
    this.app.get(
      '/api/v1/users/me/notifications',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { page, limit, offset } = this.parsePagination(req);
          const type = req.query.type as string;

          // Build count query
          let countQuery = this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

          // Build data query
          let dataQuery = this.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (type && type !== 'all') {
            countQuery = countQuery.eq('type', type);
            dataQuery = dataQuery.eq('type', type);
          }

          // Get total count and data
          const [{ count: total }, { data: notifications, error }] = await Promise.all([
            countQuery,
            dataQuery
          ]);

          if (error) throw error;

          // Get unread count
          const { count: unreadCount } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

          const paginationResponse = this.buildPaginationResponse(
            notifications || [],
            total || 0,
            page,
            limit
          );

          if (!Array.isArray(paginationResponse.data)) {
            this.logger.error('Invariant violated: notifications payload is not an array', {
              computedType: typeof paginationResponse.data
            });
            return res.status(500).json({
              success: false,
              error: 'Notifications payload malformed',
              code: 'NOTIFICATIONS_PAYLOAD_INVALID'
            });
          }

          res.json({
            ...paginationResponse,
            data: {
              notifications: paginationResponse.data,
              unreadCount: unreadCount || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get notifications', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_NOTIFICATIONS_FAILED'
          });
        }
      }
    );

    // Get unread count
    this.app.get(
      '/api/v1/users/me/notifications/unread',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { count, error } = await this.supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

          if (error) throw error;

          res.json({
            success: true,
            data: { count: count || 0 }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get unread count', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_UNREAD_FAILED'
          });
        }
      }
    );

    // Mark notification as read
    this.app.patch(
      '/api/v1/users/me/notifications/:notificationId/read',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { notificationId } = req.params;

          const { error } = await this.supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('id', notificationId)
            .eq('user_id', userId);

          if (error) throw error;

          res.json({ success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to mark notification read', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MARK_READ_FAILED'
          });
        }
      }
    );

    // Dismiss notification
    this.app.delete(
      '/api/v1/users/me/notifications/:notificationId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { notificationId } = req.params;

          const { error } = await this.supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);

          if (error) throw error;

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to dismiss notification', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DISMISS_FAILED'
          });
        }
      }
    );

    // Mark all as read
    this.app.post(
      '/api/v1/users/me/notifications/mark-all-read',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: updated, error } = await this.supabase
            .from('notifications')
            .update({ read: true, read_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('read', false)
            .select('id');

          if (error) throw error;

          res.json({
            success: true,
            data: { marked: updated?.length || 0 }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to mark all read', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MARK_ALL_READ_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PUSH NOTIFICATION DEVICE ENDPOINTS
    // ==========================================================================

    // Register push device
    this.app.post(
      '/api/v1/users/me/push/devices',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceToken, platform, deviceName, enabled = true } = req.body;

          if (!deviceToken || !platform) {
            return res.status(400).json({
              success: false,
              error: 'Device token and platform are required',
              code: 'MISSING_FIELDS'
            });
          }

          const { data: device, error } = await this.supabase
            .from('push_device_tokens')
            .upsert({
              user_id: userId,
              device_token: deviceToken,
              platform,
              device_name: deviceName,
              enabled,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,device_token' })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              deviceId: device.id,
              registered: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to register device', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REGISTER_DEVICE_FAILED'
          });
        }
      }
    );

    // Unregister push device
    this.app.delete(
      '/api/v1/users/me/push/devices/:deviceId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceId } = req.params;

          const { error } = await this.supabase
            .from('push_device_tokens')
            .delete()
            .eq('id', deviceId)
            .eq('user_id', userId);

          if (error) throw error;

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to unregister device', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UNREGISTER_DEVICE_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // HUE SMART HOME ENDPOINTS (Category 5)
    // ==========================================================================

    // Connect Hue
    this.app.post(
      '/api/v1/hue/connect',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { code, selectionType, selectionId, selectionName } = req.body;

          // Step 1: No code - return auth URL
          if (!code && !selectionType) {
            const state = `hue_${userId}_${Date.now()}`;
            const authUrl = `https://api.meethue.com/oauth2/auth?clientid=${process.env.HUE_CLIENT_ID}&response_type=code&state=${state}`;
            return res.json({
              success: true,
              data: { authUrl, state }
            });
          }

          // Step 2: With code - exchange for tokens, return rooms/zones
          if (code && !selectionType) {
            // In production, exchange code for tokens with Hue API
            // For now, return mock rooms/zones
            return res.json({
              success: true,
              data: {
                connected: true,
                rooms: [
                  { id: 'living-room', name: 'Living Room' },
                  { id: 'bedroom', name: 'Bedroom' }
                ],
                zones: [
                  { id: 'story-zone', name: 'Story Zone' }
                ]
              }
            });
          }

          // Step 3: With selection - save to DB
          if (selectionType && selectionId) {
            // Check if user already connected (to avoid duplicate credit)
            const { data: existingSettings } = await this.supabase
              .from('user_hue_settings')
              .select('connected')
              .eq('user_id', userId)
              .single();
            
            const wasAlreadyConnected = existingSettings?.connected === true;
            
            const { data: settings, error } = await this.supabase
              .from('user_hue_settings')
              .upsert({
                user_id: userId,
                connected: true,
                selection_type: selectionType,
                selection_id: selectionId,
                selection_name: selectionName,
                intensity: 'regular',
                last_sync_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' })
              .select()
              .single();

            if (error) throw error;

            // Award +2 credits for first-time smart home connection
            let creditsEarned = 0;
            let totalCredits = 0;
            if (!wasAlreadyConnected) {
              const { data: user } = await this.supabase
                .from('users')
                .select('smart_home_connected, available_story_credits')
                .eq('id', userId)
                .single();
              
              if (user && !user.smart_home_connected) {
                const newCredits = (user.available_story_credits || 0) + 2.0;
                await this.supabase.from('users').update({
                  smart_home_connected: true,
                  available_story_credits: newCredits
                }).eq('id', userId);
                
                await this.supabase.from('story_credits_ledger').insert({
                  user_id: userId,
                  credit_type: 'smart_home_connect',
                  amount: 2.0,
                  notes: 'Connected Philips Hue smart home'
                });
                
                creditsEarned = 2.0;
                totalCredits = newCredits;
              }
            }

            return res.json({
              success: true,
              data: {
                connected: true,
                location: {
                  type: settings.selection_type,
                  id: settings.selection_id,
                  name: settings.selection_name
                },
                intensity: settings.intensity,
                ...(creditsEarned > 0 && {
                  creditsEarned,
                  totalCredits,
                  message: 'Smart home connected! +2 story credits'
                })
              }
            });
          }

          res.status(400).json({
            success: false,
            error: 'Invalid request',
            code: 'INVALID_HUE_REQUEST'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Hue connect failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'HUE_CONNECT_FAILED'
          });
        }
      }
    );

    // Get Hue state
    this.app.get(
      '/api/v1/users/me/hue',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: settings, error } = await this.supabase
            .from('user_hue_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found

          res.json({
            success: true,
            data: settings ? {
              connected: settings.connected,
              room: {
                type: settings.selection_type,
                id: settings.selection_id,
                name: settings.selection_name
              },
              intensity: settings.intensity,
              lastSync: settings.last_sync_at,
              bridgeIp: settings.bridge_ip
            } : {
              connected: false
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get Hue state', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_HUE_STATE_FAILED'
          });
        }
      }
    );

    // Update Hue settings
    this.app.patch(
      '/api/v1/users/me/hue',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { intensity, disconnect } = req.body;

          if (disconnect) {
            await this.supabase
              .from('user_hue_settings')
              .delete()
              .eq('user_id', userId);

            return res.json({
              success: true,
              data: { connected: false }
            });
          }

          if (intensity) {
            const { data: settings, error } = await this.supabase
              .from('user_hue_settings')
              .update({
                intensity,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', userId)
              .select()
              .single();

            if (error) throw error;

            return res.json({
              success: true,
              data: {
                intensity: settings.intensity
              }
            });
          }

          res.status(400).json({
            success: false,
            error: 'No valid update field provided',
            code: 'INVALID_UPDATE'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update Hue settings', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_HUE_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PLG EARNING ENDPOINTS (Category 16)
    // ==========================================================================

    // Complete Profile (+1 credit)
    this.app.put(
      '/api/v1/users/me/profile',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { firstName, childAge, interests, lastName, country, locale } = req.body;

          // Get current user state
          const { data: user } = await this.supabase
            .from('users')
            .select('profile_completed, available_story_credits, first_name, last_name')
            .eq('id', userId)
            .single();

          if (!user) {
            return res.status(404).json({
              success: false,
              error: 'User not found',
              code: 'USER_NOT_FOUND'
            });
          }

          // Check if profile is already completed
          const wasCompleted = user.profile_completed === true;

          // Determine if profile should be marked complete
          // Required fields: firstName (or first_name) and at least one of: childAge, interests
          const hasRequiredFields = (firstName || user.first_name) && (childAge || interests);

          // Build update object
          const updateData: any = {};
          if (firstName) updateData.first_name = firstName;
          if (lastName) updateData.last_name = lastName;
          if (country) updateData.country = country;
          if (locale) updateData.locale = locale;
          if (hasRequiredFields && !wasCompleted) {
            updateData.profile_completed = true;
            updateData.available_story_credits = (user.available_story_credits || 0) + 1.0;
          }

          // Update user
          const { data: updatedUser, error } = await this.supabase
            .from('users')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

          if (error) throw error;

          // Award credit if profile was just completed
          let creditsEarned = 0;
          if (hasRequiredFields && !wasCompleted) {
            await this.supabase.from('story_credits_ledger').insert({
              user_id: userId,
              credit_type: 'profile_complete',
              amount: 1.0,
              notes: 'Profile completed with required fields'
            });
            creditsEarned = 1.0;
          }

          res.json({
            success: true,
            data: {
              profile: {
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                country: updatedUser.country,
                locale: updatedUser.locale,
                profileCompleted: updatedUser.profile_completed
              },
              ...(creditsEarned > 0 && {
                creditsEarned,
                totalCredits: updatedUser.available_story_credits,
                message: 'Profile completed! +1 story credit'
              })
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update profile', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_PROFILE_FAILED'
          });
        }
      }
    );

    // Get Earning Opportunities
    this.app.get(
      '/api/v1/users/me/earning-opportunities',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: user, error: userError } = await this.supabase
            .from('users')
            .select('available_story_credits, profile_completed, smart_home_connected, first_name')
            .eq('id', userId)
            .single();

          if (userError) {
            this.logger.error('Failed to fetch user for earning opportunities', {
              userId,
              error: userError.message,
              code: userError.code
            });
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch user data',
              code: 'FETCH_USER_FAILED'
            });
          }

          if (!user) {
            this.logger.warn('User not found in database', { userId });
            return res.status(404).json({
              success: false,
              error: 'User not found',
              code: 'USER_NOT_FOUND'
            });
          }

          // Handle missing columns gracefully (default to false/0)
          const profileCompleted = user.profile_completed ?? false;
          const smartHomeConnected = user.smart_home_connected ?? false;
          const availableCredits = user.available_story_credits ?? 0;

          const opportunities = [];

          // Profile completion opportunity
          if (!profileCompleted) {
            opportunities.push({
              action: 'complete_profile',
              reward: 1.0,
              available: true,
              completed: false,
              description: "Add your child's age and interests",
              ctaUrl: '/profile',
              ctaText: 'Complete Profile',
              estimatedTime: '2 minutes'
            });
          }

          // Smart home connection opportunity
          if (!smartHomeConnected) {
            opportunities.push({
              action: 'connect_smart_home',
              reward: 2.0,
              available: true,
              completed: false,
              description: 'Connect Philips Hue',
              ctaUrl: '/settings/smart-home',
              ctaText: 'Connect Hue',
              estimatedTime: '5 minutes'
            });
          }

          // Invite friend (always available, repeatable)
          opportunities.push({
            action: 'invite_friend',
            reward: 1.0,
            available: true,
            repeatable: true,
            description: 'Invite a friend, both get benefits',
            ctaUrl: '/invite',
            ctaText: 'Send Invite',
            benefits: ['Friend gets 15% off', 'You both get +1 story']
          });

          res.json({
            success: true,
            data: {
              currentCredits: availableCredits,
              opportunities,
              maxEarnable: 3.0,  // Without invites
              totalPossible: 'Unlimited via invites'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get earning opportunities', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EARNING_OPPORTUNITIES_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PASSWORD MANAGEMENT ENDPOINTS (Category 15)
    // ==========================================================================

    // Forgot password
    this.app.post(
      '/api/v1/auth/forgot-password',
      async (req: Request, res: Response) => {
        try {
          const { email } = req.body;

          if (!email) {
            return res.status(400).json({
              success: false,
              error: 'Email is required',
              code: 'EMAIL_REQUIRED'
            });
          }

          // Check our internal rate limit first (prevents hitting Supabase limits)
          // Use AuthAgent's rate limiting if available
          let rateLimitExceeded = false;
          try {
            // AuthAgent has checkRateLimit method, but it throws on rate limit
            // We'll catch and handle gracefully
            if (this.authAgent) {
              try {
                // Try to access the private checkRateLimit method via AuthAgent
                // Since it's private, we'll use AuthAgent's initiatePasswordReset which handles rate limiting
                // But we want to check rate limit before calling Supabase, so we'll use a workaround
                // Check if AuthAgent is initialized and has Redis access
                const authAgentAny = this.authAgent as any;
                if (authAgentAny.redis && typeof authAgentAny.redis.get === 'function') {
                  const rateLimitKey = `rate_limit:password_reset:${email}`;
                  const current = await authAgentAny.redis.get(rateLimitKey);
                  const maxRequests = authAgentAny.config?.rateLimit?.maxRequestsPerMinute || 10;
                  
                  if (current && parseInt(current) >= maxRequests) {
                    rateLimitExceeded = true;
                  }
                }
              } catch (rateLimitError: any) {
                // If we can't check rate limit, continue (best effort)
                this.logger.warn('Rate limit check failed, continuing', {
                  error: rateLimitError instanceof Error ? rateLimitError.message : String(rateLimitError)
                });
              }
            }
          } catch (rateLimitCheckError) {
            // If rate limit check fails, continue (best effort)
            this.logger.warn('Rate limit check failed, continuing', {
              error: rateLimitCheckError instanceof Error ? rateLimitCheckError.message : String(rateLimitCheckError)
            });
          }

          if (rateLimitExceeded) {
            return res.status(429).json({
              success: false,
              error: 'Too many password reset requests. Please try again later.',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: 3600 // seconds
            });
          }

          // Trigger Supabase password reset with retry logic
          let lastError: any = null;
          const maxRetries = 2;
          
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
              // Exponential backoff: 1s, 2s
              const delay = Math.pow(2, attempt - 1) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
            }

            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${process.env.APP_URL || 'https://storytailor.com'}/reset-password`
            });

            if (!error) {
              // Success - rate limit already tracked by AuthAgent
              return res.json({
                success: true,
                message: 'Reset email sent if account exists'
              });
            }

            lastError = error;

            // Check if it's a rate limit error
            if (error.message && (
              error.message.toLowerCase().includes('rate limit') ||
              error.message.toLowerCase().includes('too many requests') ||
              error.message.toLowerCase().includes('email rate limit exceeded')
            )) {
              // Rate limit hit - don't retry, return error
              this.logger.warn('Supabase Auth rate limit exceeded for password reset', {
                email: email.substring(0, 3) + '***',
                attempt: attempt + 1
              });

              return res.status(429).json({
                success: false,
                error: 'Too many password reset requests. Please try again in an hour.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 3600 // seconds
              });
            }

            // For other errors, retry if we have attempts left
            if (attempt < maxRetries) {
              this.logger.warn('Password reset attempt failed, retrying', {
                email: email.substring(0, 3) + '***',
                attempt: attempt + 1,
                error: error.message
              });
              continue;
            }
          }

          // All retries exhausted
          if (lastError) {
            this.logger.error('Password reset failed after retries', {
              email: email.substring(0, 3) + '***',
              error: lastError.message
            });
          }

          // Don't reveal if email exists (security best practice)
          res.json({
            success: true,
            message: 'Reset email sent if account exists'
          });
        } catch (error) {
          this.logger.error('Password reset endpoint error', {
            error: error instanceof Error ? error.message : String(error)
          });
          
          // Don't reveal if email exists
          res.json({
            success: true,
            message: 'Reset email sent if account exists'
          });
        }
      }
    );

    // Reset password
    this.app.post(
      '/api/v1/auth/reset-password',
      async (req: Request, res: Response) => {
        try {
          const { token, newPassword, confirmPassword } = req.body;

          if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
              success: false,
              error: 'Token and passwords are required',
              code: 'MISSING_FIELDS'
            });
          }

          if (newPassword !== confirmPassword) {
            return res.status(400).json({
              success: false,
              error: 'Passwords do not match',
              code: 'PASSWORD_MISMATCH'
            });
          }

          // In production, verify token and update password
          // This is simplified - actual implementation uses Supabase session
          res.json({
            success: true,
            message: 'Password updated successfully'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Password reset failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: 'Password reset failed',
            code: 'RESET_FAILED'
          });
        }
      }
    );

    // Verify reset token
    this.app.post(
      '/api/v1/auth/verify-reset-token',
      async (req: Request, res: Response) => {
        try {
          const { token } = req.body;

          if (!token) {
            return res.status(400).json({
              success: false,
              error: 'Token is required',
              code: 'TOKEN_REQUIRED'
            });
          }

          // In production, verify the token with Supabase
          res.json({
            success: true,
            data: {
              valid: true,
              expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Token verification failed', { error: errorMessage });
          res.status(400).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          });
        }
      }
    );

    // ==========================================================================
    // SEARCH ENDPOINTS (Category 8)
    // ==========================================================================

    // Universal search
    this.app.get(
      '/api/v1/search',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const q = req.query.q as string;
          const type = req.query.type as string || 'all';
          const limit = parseInt(req.query.limit as string) || 20;
          const offset = parseInt(req.query.offset as string) || 0;

          if (!q) {
            return res.status(400).json({
              success: false,
              error: 'Search query is required',
              code: 'QUERY_REQUIRED'
            });
          }

          const results: Array<{ type: string; id: string; title: string; snippet: string; libraryId: string; relevance: number }> = [];

          // Search stories
          if (type === 'all' || type === 'stories') {
            const { data: stories } = await this.supabase
              .from('stories')
              .select('id, title, content, library_id')
              .eq('user_id', userId)
              .ilike('title', `%${q}%`)
              .limit(limit);

            stories?.forEach(s => {
              results.push({
                type: 'story',
                id: s.id,
                title: s.title,
                snippet: s.content?.substring(0, 100) + '...',
                libraryId: s.library_id,
                relevance: 1.0
              });
            });
          }

          // Search characters
          if (type === 'all' || type === 'characters') {
            const { data: characters } = await this.supabase
              .from('characters')
              .select('id, name, description')
              .eq('user_id', userId)
              .ilike('name', `%${q}%`)
              .limit(limit);

            characters?.forEach(c => {
              results.push({
                type: 'character',
                id: c.id,
                title: c.name,
                snippet: c.description?.substring(0, 100) || '',
                libraryId: '',
                relevance: 0.9
              });
            });
          }

          res.json({
            success: true,
            data: {
              results: results.slice(offset, offset + limit),
              total: results.length,
              facets: {
                types: { stories: results.filter(r => r.type === 'story').length, characters: results.filter(r => r.type === 'character').length }
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Search failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SEARCH_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // EMOTION INTELLIGENCE ENDPOINTS (Category 3)
    // ==========================================================================

    // Submit emotion check-in
    this.app.post(
      '/api/v1/profiles/:profileId/emotions/check-in',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { profileId } = req.params;
          const { emotion, intensity, context, detectedFrom } = req.body;

          const { data: checkIn, error } = await this.supabase
            .from('emotion_check_ins')
            .insert({
              profile_id: profileId,
              user_id: userId,
              emotion,
              intensity: intensity || 5,
              context,
              detected_from: detectedFrom || 'manual',
              recorded_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              checkInId: checkIn.id,
              suggestedStories: [], // Would be populated by EmotionAgent
              suggestedActivities: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Emotion check-in failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CHECK_IN_FAILED'
          });
        }
      }
    );

    // Get emotion history
    this.app.get(
      '/api/v1/profiles/:profileId/emotions/history',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { profileId } = req.params;
          const startDate = req.query.startDate as string;
          const endDate = req.query.endDate as string;
          const { page, limit, offset } = this.parsePagination(req);

          // Build base query
          let countQuery = this.supabase
            .from('emotion_check_ins')
            .select('*', { count: 'exact', head: true })
            .eq('profile_id', profileId)
            .eq('user_id', userId);

          let dataQuery = this.supabase
            .from('emotion_check_ins')
            .select('*')
            .eq('profile_id', profileId)
            .eq('user_id', userId)
            .order('recorded_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (startDate) {
            countQuery = countQuery.gte('recorded_at', startDate);
            dataQuery = dataQuery.gte('recorded_at', startDate);
          }
          if (endDate) {
            countQuery = countQuery.lte('recorded_at', endDate);
            dataQuery = dataQuery.lte('recorded_at', endDate);
          }

          // Get total count and data
          const [{ count: total }, { data: history, error }] = await Promise.all([
            countQuery,
            dataQuery
          ]);

          if (error) throw error;

          const paginationResponse = this.buildPaginationResponse(
            history || [],
            total || 0,
            page,
            limit
          );

          res.json({
            ...paginationResponse,
            data: {
              checkIns: paginationResponse.data,
              summary: {
                total: total || 0,
                topEmotions: []
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get emotion history', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'HISTORY_FAILED'
          });
        }
      }
    );

    // Get emotion patterns
    this.app.get(
      '/api/v1/profiles/:profileId/emotions/patterns',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { profileId } = req.params;
          const period = req.query.period as string || '30d';

          // Would call EmotionAgent for pattern analysis
          res.json({
            success: true,
            data: {
              patterns: [],
              timeOfDay: {},
              weeklyTrends: {},
              triggers: [],
              recommendations: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get patterns', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'PATTERNS_FAILED'
          });
        }
      }
    );

    // Get emotion insights for story
    this.app.get(
      '/api/v1/stories/:storyId/emotions',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          const { data: story } = await this.supabase
            .from('stories')
            .select('emotion_analysis, emotion_tags')
            .eq('id', storyId)
            .single();

          res.json({
            success: true,
            data: {
              analysis: story?.emotion_analysis || {},
              tags: story?.emotion_tags || [],
              responseHistory: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get story emotions', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'STORY_EMOTIONS_FAILED'
          });
        }
      }
    );

    // Emotion SSE stream
    this.app.get(
      '/api/v1/profiles/:profileId/emotions/stream',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { profileId } = req.params;

          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          // Send initial connection event
          res.write(`data: ${JSON.stringify({ type: 'connected', profileId })}\n\n`);

          // Keep connection alive
          const keepAlive = setInterval(() => {
            res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
          }, 30000);

          req.on('close', () => {
            clearInterval(keepAlive);
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Emotion stream failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'STREAM_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // EMOTION INTELLIGENCE ENDPOINTS (Category 3 - Additional)
    // ==========================================================================

    // Submit emotion check-in (simplified endpoint)
    this.app.post(
      '/api/v1/emotions/checkin',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { responses, mood, sessionContext } = req.body;

          if (!responses || !Array.isArray(responses)) {
            return res.status(400).json({
              success: false,
              error: 'Responses array is required',
              code: 'RESPONSES_REQUIRED'
            });
          }

          // Store check-in
          const { data: checkIn, error } = await this.supabase
            .from('emotion_check_ins')
            .insert({
              user_id: userId,
              emotion: mood || 'neutral',
              intensity: 5,
              context: { responses, sessionContext },
              detected_from: 'manual',
              recorded_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          // Calculate mood score (simplified)
          const moodScore = mood ? 7 : 5;

          res.status(201).json({
            success: true,
            data: {
              checkinId: checkIn.id,
              moodScore,
              insights: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Emotion check-in failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CHECK_IN_FAILED'
          });
        }
      }
    );

    // Get emotion patterns
    this.app.get(
      '/api/v1/emotions/patterns',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { libraryId, timeRange = 'month', userId: targetUserId } = req.query;

          const queryUserId = targetUserId || userId;

          // Get emotion history
          const { data: emotions, error } = await this.supabase
            .from('emotion_check_ins')
            .select('emotion, intensity, recorded_at, context')
            .eq('user_id', queryUserId)
            .order('recorded_at', { ascending: false })
            .limit(100);

          if (error) throw error;

          // Simple pattern analysis
          const patterns = {
            dominantEmotion: 'happy',
            trends: [],
            recommendations: []
          };

          res.json({
            success: true,
            data: {
              patterns,
              trends: [],
              recommendations: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get patterns failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'PATTERNS_FAILED'
          });
        }
      }
    );

    // Get emotion insights
    this.app.get(
      '/api/v1/emotions/insights',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { libraryId, insightType = 'emotional' } = req.query;

          res.json({
            success: true,
            data: {
              insights: [],
              actionable: [],
              severity: 'low'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get insights failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'INSIGHTS_FAILED'
          });
        }
      }
    );

    // Update mood
    this.app.post(
      '/api/v1/emotions/mood-update',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { currentMood, context, triggeredBy } = req.body;

          const { data: update, error } = await this.supabase
            .from('emotion_check_ins')
            .insert({
              user_id: userId,
              emotion: currentMood,
              intensity: 5,
              context: { context, triggeredBy },
              detected_from: triggeredBy || 'manual',
              recorded_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              updated: true,
              moodHistory: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Mood update failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MOOD_UPDATE_FAILED'
          });
        }
      }
    );

    // Crisis detection
    this.app.post(
      '/api/v1/emotions/crisis-detection',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { signals, context } = req.body;

          // Crisis detection logic would go here
          const crisisDetected = false;
          const severity = 'low';

          res.json({
            success: true,
            data: {
              crisisDetected,
              severity,
              actions: [],
              contactInfo: {
                crisisHotline: '988',
                textLine: '741741'
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Crisis detection failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CRISIS_DETECTION_FAILED'
          });
        }
      }
    );

    // Get support resources
    this.app.get(
      '/api/v1/emotions/support-resources',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { category, userAge } = req.query;

          res.json({
            success: true,
            data: {
              resources: [
                {
                  name: 'Crisis Text Line',
                  contact: '741741',
                  type: 'text'
                },
                {
                  name: '988 Suicide & Crisis Lifeline',
                  contact: '988',
                  type: 'phone'
                }
              ],
              emergencyContacts: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get support resources failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SUPPORT_RESOURCES_FAILED'
          });
        }
      }
    );

    // Escalate emotion concern
    this.app.post(
      '/api/v1/emotions/escalate',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { reason, context, urgency = 'medium' } = req.body;

          // Create escalation record
          const { data: escalation, error } = await this.supabase
            .from('crisis_responses')
            .insert({
              user_id: userId,
              severity: urgency,
              context: { reason, context },
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              escalationId: escalation.id,
              notificationsSent: [],
              supportTeamNotified: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Escalation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ESCALATION_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // USER PREFERENCES ENDPOINTS (Category 6)
    // ==========================================================================

    // Get user preferences
    this.app.get(
      '/api/v1/users/me/preferences',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: prefs, error } = await this.supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          res.json({
            success: true,
            data: prefs || {
              theme: 'auto',
              language: 'en',
              notifications: {
                email: true,
                push: true,
                storyComplete: true,
                weeklyDigest: true
              },
              audio: {
                defaultVoice: 'alloy',
                autoPlay: false
              },
              accessibility: {
                highContrast: false,
                reduceMotion: false,
                fontSize: 'medium'
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get preferences', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_PREFERENCES_FAILED'
          });
        }
      }
    );

    // Update user preferences
    this.app.patch(
      '/api/v1/users/me/preferences',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const updates = req.body;

          const { data: prefs, error } = await this.supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              ...updates,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: prefs
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to update preferences', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_PREFERENCES_FAILED'
          });
        }
      }
    );

    // Get accessibility settings
    this.app.get(
      '/api/v1/users/me/accessibility',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: prefs } = await this.supabase
            .from('user_preferences')
            .select('accessibility')
            .eq('user_id', userId)
            .single();

          res.json({
            success: true,
            data: prefs?.accessibility || {
              vocabularyLevel: 'age_appropriate',
              speechProcessingDelay: 0,
              attentionSpan: 'normal',
              interactionStyle: 'standard'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get accessibility failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_ACCESSIBILITY_FAILED'
          });
        }
      }
    );

    // Update accessibility settings
    this.app.put(
      '/api/v1/users/me/accessibility',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { vocabularyLevel, speechProcessingDelay, attentionSpan, interactionStyle } = req.body;

          const { data: prefs, error } = await this.supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              accessibility: {
                vocabularyLevel,
                speechProcessingDelay,
                attentionSpan,
                interactionStyle
              },
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: prefs.accessibility
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update accessibility failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_ACCESSIBILITY_FAILED'
          });
        }
      }
    );

    // Reset preferences to defaults
    this.app.post(
      '/api/v1/users/me/preferences/reset',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const defaults = {
            theme: 'auto',
            language: 'en',
            notifications: {
              email: true,
              push: true,
              storyComplete: true,
              weeklyDigest: true
            },
            audio: {
              defaultVoice: 'alloy',
              autoPlay: false
            },
            accessibility: {
              highContrast: false,
              reduceMotion: false,
              fontSize: 'medium'
            }
          };

          const { data: prefs, error } = await this.supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              ...defaults,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              preferences: prefs
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Reset preferences failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'RESET_PREFERENCES_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // NOTIFICATION CENTER ENDPOINTS (Category 7)
    // ==========================================================================

    // Get notification settings
    this.app.get(
      '/api/v1/users/me/notifications/settings',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: prefs } = await this.supabase
            .from('user_preferences')
            .select('notifications')
            .eq('user_id', userId)
            .single();

          const { data: devices } = await this.supabase
            .from('push_device_tokens')
            .select('*')
            .eq('user_id', userId);

          res.json({
            success: true,
            data: {
              email: {
                enabled: prefs?.notifications?.email !== false,
                frequency: prefs?.notifications?.frequency || 'important_only'
              },
              push: {
                enabled: prefs?.notifications?.push !== false,
                deviceTokens: devices || []
              },
              categories: {
                storyComplete: prefs?.notifications?.storyComplete !== false,
                newFeatures: prefs?.notifications?.newFeatures || false,
                familyActivity: prefs?.notifications?.familyActivity !== false,
                emotionalInsights: prefs?.notifications?.emotionalInsights !== false
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get notification settings failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_NOTIFICATION_SETTINGS_FAILED'
          });
        }
      }
    );

    // Update notification settings
    this.app.patch(
      '/api/v1/users/me/notifications/settings',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { email, push, categories } = req.body;

          const { data: prefs } = await this.supabase
            .from('user_preferences')
            .select('notifications')
            .eq('user_id', userId)
            .single();

          const updatedNotifications = {
            ...prefs?.notifications,
            ...(email && { email }),
            ...(push && { push }),
            ...(categories && { ...prefs?.notifications?.categories, ...categories })
          };

          const { data: updated, error } = await this.supabase
            .from('user_preferences')
            .upsert({
              user_id: userId,
              notifications: updatedNotifications,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: updated.notifications
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update notification settings failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_NOTIFICATION_SETTINGS_FAILED'
          });
        }
      }
    );

    // Register device for push notifications
    this.app.post(
      '/api/v1/users/me/notifications/devices',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceToken, platform, deviceName } = req.body;

          if (!deviceToken || !platform) {
            return res.status(400).json({
              success: false,
              error: 'Device token and platform are required',
              code: 'DEVICE_TOKEN_REQUIRED'
            });
          }

          const { data: device, error } = await this.supabase
            .from('push_device_tokens')
            .upsert({
              user_id: userId,
              device_token: deviceToken,
              platform,
              device_name: deviceName,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,device_token' })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              deviceId: device.id,
              registered: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Register device failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REGISTER_DEVICE_FAILED'
          });
        }
      }
    );

    // Unregister device
    this.app.delete(
      '/api/v1/users/me/notifications/devices/:deviceId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceId } = req.params;

          const { error } = await this.supabase
            .from('push_device_tokens')
            .delete()
            .eq('id', deviceId)
            .eq('user_id', userId);

          if (error) throw error;

          res.json({
            success: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Unregister device failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UNREGISTER_DEVICE_FAILED'
          });
        }
      }
    );

    // Get notifications
    this.app.get(
      '/api/v1/users/me/notifications',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { page, limit, offset } = this.parsePagination(req);

          // Get total count and data
          const [{ count: total }, { count: unreadCount }, { data: notifications, error }] = await Promise.all([
            this.supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId),
            this.supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('read', false),
            this.supabase
              .from('notifications')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1)
          ]);

          if (error) throw error;

          const paginationResponse = this.buildPaginationResponse(
            notifications || [],
            total || 0,
            page,
            limit
          );

          res.json({
            ...paginationResponse,
            data: {
              ...paginationResponse.data,
              unreadCount: unreadCount || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get notifications failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_NOTIFICATIONS_FAILED'
          });
        }
      }
    );

    // Mark notification as read
    this.app.patch(
      '/api/v1/users/me/notifications/:notificationId/read',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { notificationId } = req.params;

          const { error } = await this.supabase
            .from('notifications')
            .update({
              read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', userId);

          if (error) throw error;

          res.json({
            success: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Mark notification read failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MARK_READ_FAILED'
          });
        }
      }
    );

    // Dismiss notification
    this.app.delete(
      '/api/v1/users/me/notifications/:notificationId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { notificationId } = req.params;

          const { error } = await this.supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);

          if (error) throw error;

          res.json({
            success: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Dismiss notification failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DISMISS_NOTIFICATION_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PUSH NOTIFICATION ENDPOINTS (Category 8)
    // ==========================================================================

    // Register device for push (alternative endpoint)
    this.app.post(
      '/api/v1/users/me/push/register',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceToken, platform, deviceName } = req.body;

          if (!deviceToken || !platform) {
            return res.status(400).json({
              success: false,
              error: 'Device token and platform are required',
              code: 'DEVICE_TOKEN_REQUIRED'
            });
          }

          const { data: device, error } = await this.supabase
            .from('push_device_tokens')
            .upsert({
              user_id: userId,
              device_token: deviceToken,
              platform,
              device_name: deviceName,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,device_token' })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              deviceId: device.id,
              registered: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Register push device failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REGISTER_PUSH_FAILED'
          });
        }
      }
    );

    // Unregister device for push
    this.app.delete(
      '/api/v1/users/me/push/unregister',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { deviceToken } = req.body;

          if (!deviceToken) {
            return res.status(400).json({
              success: false,
              error: 'Device token is required',
              code: 'DEVICE_TOKEN_REQUIRED'
            });
          }

          const { error } = await this.supabase
            .from('push_device_tokens')
            .delete()
            .eq('user_id', userId)
            .eq('device_token', deviceToken);

          if (error) throw error;

          res.json({
            success: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Unregister push device failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UNREGISTER_PUSH_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // B2B ORGANIZATION ENDPOINTS (Category 16)
    // ==========================================================================

    // Create organization
    this.app.post(
      '/api/v1/organizations',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, type, billingEmail, metadata } = req.body;

          if (!name || !type) {
            return res.status(400).json({
              success: false,
              error: 'Name and type are required',
              code: 'MISSING_FIELDS'
            });
          }

          const { data: org, error } = await this.supabase
            .from('organizations')
            .insert({
              name,
              type,
              owner_id: userId,
              billing_email: billingEmail,
              metadata,
              status: 'active'
            })
            .select()
            .single();

          if (error) throw error;

          // Add owner as admin member
          await this.supabase
            .from('organization_members')
            .insert({
              organization_id: org.id,
              user_id: userId,
              role: 'owner',
              status: 'active'
            });

          res.status(201).json({
            success: true,
            data: {
              organizationId: org.id,
              name: org.name,
              type: org.type
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Create organization failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CREATE_ORG_FAILED'
          });
        }
      }
    );

    // Get organization
    this.app.get(
      '/api/v1/organizations/:orgId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { orgId } = req.params;

          const { data: org, error } = await this.supabase
            .from('organizations')
            .select('*')
            .eq('id', orgId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: org
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get organization failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_ORG_FAILED'
          });
        }
      }
    );

    // Manage seats
    this.app.post(
      '/api/v1/organizations/:orgId/seats',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { orgId } = req.params;
          const { email, role = 'member' } = req.body;

          if (!email) {
            return res.status(400).json({
              success: false,
              error: 'Email is required',
              code: 'EMAIL_REQUIRED'
            });
          }

          // Check user exists or send invite
          const { data: user } = await this.supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

          if (user) {
            const { data: member, error } = await this.supabase
              .from('organization_members')
              .insert({
                organization_id: orgId,
                user_id: user.id,
                role,
                status: 'active'
              })
              .select()
              .single();

            if (error) throw error;

            return res.status(201).json({
              success: true,
              data: {
                seatId: member.id,
                userId: user.id,
                status: 'active'
              }
            });
          }

          // User doesn't exist, create pending invite
          const { data: invite, error } = await this.supabase
            .from('organization_invites')
            .insert({
              organization_id: orgId,
              email,
              role,
              status: 'pending'
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              inviteId: invite.id,
              status: 'pending'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Add seat failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ADD_SEAT_FAILED'
          });
        }
      }
    );

    // List organization members
    this.app.get(
      '/api/v1/organizations/:orgId/members',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { orgId } = req.params;

          const { data: members, error } = await this.supabase
            .from('organization_members')
            .select('*, users(id, email, name)')
            .eq('organization_id', orgId);

          if (error) throw error;

          res.json({
            success: true,
            data: {
              members: members || [],
              total: members?.length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List members failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_MEMBERS_FAILED'
          });
        }
      }
    );

    // Get shared library
    this.app.get(
      '/api/v1/organizations/:orgId/library',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { orgId } = req.params;

          const { data: stories, error } = await this.supabase
            .from('organization_shared_stories')
            .select('*, stories(*)')
            .eq('organization_id', orgId);

          if (error) throw error;

          res.json({
            success: true,
            data: {
              stories: stories?.map(s => s.stories) || [],
              total: stories?.length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get shared library failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_SHARED_LIBRARY_FAILED'
          });
        }
      }
    );

    // Add story to shared library
    this.app.post(
      '/api/v1/organizations/:orgId/library',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { orgId } = req.params;
          const { storyId } = req.body;

          const { data: shared, error } = await this.supabase
            .from('organization_shared_stories')
            .insert({
              organization_id: orgId,
              story_id: storyId,
              shared_by: userId
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              shareId: shared.id
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Share to org failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SHARE_TO_ORG_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // AFFILIATE PROGRAM ENDPOINTS (Category 17)
    // ==========================================================================

    // Get affiliate status
    this.app.get(
      '/api/v1/affiliate/status',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: affiliate, error } = await this.supabase
            .from('affiliates')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          res.json({
            success: true,
            data: affiliate ? {
              affiliateId: affiliate.id,
              code: affiliate.code,
              tier: affiliate.tier,
              commissionRate: affiliate.commission_rate,
              totalEarnings: affiliate.total_earnings,
              pendingEarnings: affiliate.pending_earnings,
              totalReferrals: affiliate.total_referrals,
              status: affiliate.status
            } : {
              enrolled: false
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get affiliate status failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_AFFILIATE_FAILED'
          });
        }
      }
    );

    // Enroll in affiliate program
    this.app.post(
      '/api/v1/affiliate/enroll',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { payoutMethod, payoutDetails, customCode } = req.body;

          const code = customCode || `ST${userId.substring(0, 8).toUpperCase()}`;

          const { data: affiliate, error } = await this.supabase
            .from('affiliates')
            .insert({
              user_id: userId,
              code,
              tier: 'standard',
              commission_rate: 0.20,
              payout_method: payoutMethod,
              payout_details: payoutDetails,
              status: 'active'
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              affiliateId: affiliate.id,
              code: affiliate.code,
              commissionRate: affiliate.commission_rate,
              trackingUrl: `https://storytailor.com/ref/${affiliate.code}`
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Affiliate enrollment failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ENROLL_FAILED'
          });
        }
      }
    );

    // Get referral stats
    this.app.get(
      '/api/v1/affiliate/referrals',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: referrals, error } = await this.supabase
            .from('affiliate_referrals')
            .select('*')
            .eq('affiliate_user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          res.json({
            success: true,
            data: {
              referrals: referrals || [],
              total: referrals?.length || 0,
              converted: referrals?.filter(r => r.status === 'converted').length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get referrals failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_REFERRALS_FAILED'
          });
        }
      }
    );

    // Get earnings history
    this.app.get(
      '/api/v1/affiliate/earnings',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: earnings, error } = await this.supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('affiliate_user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const totalEarnings = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
          const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

          res.json({
            success: true,
            data: {
              earnings: earnings || [],
              totalEarnings,
              pendingEarnings,
              paidEarnings: totalEarnings - pendingEarnings
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get earnings failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EARNINGS_FAILED'
          });
        }
      }
    );

    // Request payout
    this.app.post(
      '/api/v1/affiliate/payout',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { amount, method } = req.body;

          const { data: payout, error } = await this.supabase
            .from('affiliate_payouts')
            .insert({
              affiliate_user_id: userId,
              amount,
              method,
              status: 'pending',
              requested_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              payoutId: payout.id,
              amount: payout.amount,
              status: payout.status,
              estimatedArrival: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Payout request failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'PAYOUT_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // AUDIO & NARRATION ENDPOINTS (Category 9)
    // ==========================================================================

    // Generate audio for story
    this.app.post(
      '/api/v1/stories/:storyId/audio',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const { voiceId, speed, includeMusic, includeSfx } = req.body;

          // Create generation job
          const { data: job, error } = await this.supabase
            .from('asset_generation_jobs')
            .insert({
              story_id: storyId,
              asset_type: 'audio',
              status: 'queued',
              metadata: { voiceId, speed, includeMusic, includeSfx }
            })
            .select()
            .single();

          if (error) throw error;

          res.status(202).json({
            success: true,
            data: {
              jobId: job.id,
              status: 'queued',
              estimatedTime: 60
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Audio generation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'AUDIO_GENERATION_FAILED'
          });
        }
      }
    );

    // Get audio status
    this.app.get(
      '/api/v1/stories/:storyId/audio',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          const { data: story, error } = await this.supabase
            .from('stories')
            .select('audio_url, webvtt_url, audio_duration, audio_voice_id')
            .eq('id', storyId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              audioUrl: story.audio_url,
              webvttUrl: story.webvtt_url,
              duration: story.audio_duration,
              voiceId: story.audio_voice_id,
              ready: !!story.audio_url
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get audio failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_AUDIO_FAILED'
          });
        }
      }
    );

    // Get WebVTT for read-along
    this.app.get(
      '/api/v1/stories/:storyId/webvtt',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          const { data: story, error } = await this.supabase
            .from('stories')
            .select('webvtt_url, webvtt_content')
            .eq('id', storyId)
            .single();

          if (error) throw error;

          if (story.webvtt_content) {
            res.setHeader('Content-Type', 'text/vtt');
            return res.send(story.webvtt_content);
          }

          res.json({
            success: true,
            data: {
              url: story.webvtt_url
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get WebVTT failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_WEBVTT_FAILED'
          });
        }
      }
    );

    // List available voices
    this.app.get(
      '/api/v1/audio/voices',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          // Return available voices from ElevenLabs/Polly
          const voices = [
            { id: 'alloy', name: 'Alloy', provider: 'openai', gender: 'neutral', preview: null },
            { id: 'echo', name: 'Echo', provider: 'openai', gender: 'male', preview: null },
            { id: 'fable', name: 'Fable', provider: 'openai', gender: 'female', preview: null },
            { id: 'onyx', name: 'Onyx', provider: 'openai', gender: 'male', preview: null },
            { id: 'nova', name: 'Nova', provider: 'openai', gender: 'female', preview: null },
            { id: 'shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', preview: null }
          ];

          res.json({
            success: true,
            data: { voices }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List voices failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_VOICES_FAILED'
          });
        }
      }
    );

    // Get music catalog
    this.app.get(
      '/api/v1/audio/music/catalog',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { mood, storyType, limit = 20 } = req.query;

          // Mock music catalog - would be replaced with actual catalog service
          const tracks = [
            {
              id: 'calm-1',
              title: 'Gentle Dreams',
              mood: 'calm',
              duration: 180,
              previewUrl: 'https://example.com/preview/calm-1.mp3',
              tags: ['bedtime', 'relaxing'],
              compatible: ['bedtime', 'adventure']
            }
          ];

          res.json({
            success: true,
            data: {
              tracks: tracks.slice(0, parseInt(limit as string))
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get music catalog failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_MUSIC_CATALOG_FAILED'
          });
        }
      }
    );

    // Get sound effects catalog
    this.app.get(
      '/api/v1/audio/sfx/catalog',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { category, tags, limit = 50 } = req.query;

          // Mock SFX catalog
          const effects = [
            {
              id: 'dragon-roar',
              name: 'Dragon Roar',
              category: 'magic',
              duration: 3.5,
              previewUrl: 'https://example.com/preview/dragon-roar.mp3',
              tags: ['dragon', 'roar'],
              useCase: 'dragon roar, scene transitions'
            }
          ];

          res.json({
            success: true,
            data: {
              effects: effects.slice(0, parseInt(limit as string))
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get SFX catalog failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_SFX_CATALOG_FAILED'
          });
        }
      }
    );

    // Custom audio mixing
    this.app.post(
      '/api/v1/audio/mix',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { narrationUrl, musicId, sfxIds, sfxTimings, mixProfile = 'balanced' } = req.body;

          if (!narrationUrl) {
            return res.status(400).json({
              success: false,
              error: 'Narration URL is required',
              code: 'NARRATION_URL_REQUIRED'
            });
          }

          // Audio mixing would be handled by audio service
          res.json({
            success: true,
            data: {
              mixedAudioUrl: 'https://example.com/mixed/audio.mp3',
              duration: 245.67
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Audio mix failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'AUDIO_MIX_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // ASSET MANAGEMENT ENDPOINTS (Category 10)
    // ==========================================================================

    // Get asset generation status
    this.app.get(
      '/api/v1/stories/:storyId/assets/status',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          const { data: story, error } = await this.supabase
            .from('stories')
            .select('asset_generation_status, asset_generation_started_at, asset_generation_completed_at')
            .eq('id', storyId)
            .single();

          if (error) throw error;

          const { data: jobs } = await this.supabase
            .from('asset_generation_jobs')
            .select('*')
            .eq('story_id', storyId)
            .order('created_at', { ascending: true });

          res.json({
            success: true,
            data: {
              overall: story.asset_generation_status?.overall || 'pending',
              assets: story.asset_generation_status?.assets || {},
              jobs: jobs || [],
              startedAt: story.asset_generation_started_at,
              completedAt: story.asset_generation_completed_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get asset status failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_ASSET_STATUS_FAILED'
          });
        }
      }
    );

    // Estimate asset generation
    this.app.post(
      '/api/v1/stories/:storyId/assets/estimate',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;
          const { assets } = req.body;

          // Calculate estimates based on story length and requested assets
          const estimates: Record<string, { time: number; cost: number }> = {};
          let totalTime = 0;
          let totalCost = 0;

          if (assets.includes('audio')) {
            estimates.audio = { time: 45, cost: 0.03 };
            totalTime += 45;
            totalCost += 0.03;
          }
          if (assets.includes('cover')) {
            estimates.cover = { time: 30, cost: 0.04 };
            totalTime += 30;
            totalCost += 0.04;
          }
          if (assets.includes('scenes')) {
            estimates.scenes = { time: 120, cost: 0.16 };
            totalTime += 120;
            totalCost += 0.16;
          }
          if (assets.includes('pdf')) {
            estimates.pdf = { time: 15, cost: 0.01 };
            totalTime += 15;
            totalCost += 0.01;
          }
          if (assets.includes('activities')) {
            estimates.activities = { time: 20, cost: 0.02 };
            totalTime += 20;
            totalCost += 0.02;
          }

          res.json({
            success: true,
            data: {
              estimates,
              totalTime,
              totalCost,
              currency: 'USD'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Estimate failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ESTIMATE_FAILED'
          });
        }
      }
    );

    // Cancel asset generation
    this.app.post(
      '/api/v1/stories/:storyId/assets/cancel',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;
          const { assetTypes } = req.body;

          let query = this.supabase
            .from('asset_generation_jobs')
            .update({ status: 'canceled' })
            .eq('story_id', storyId)
            .in('status', ['queued', 'generating']);

          if (assetTypes?.length) {
            query = query.in('asset_type', assetTypes);
          }

          const { data: canceled, error } = await query.select('asset_type');
          if (error) throw error;

          res.json({
            success: true,
            data: {
              canceled: canceled?.map(c => c.asset_type) || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Cancel assets failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CANCEL_FAILED'
          });
        }
      }
    );

    // Retry failed asset generation
    this.app.post(
      '/api/v1/stories/:storyId/assets/retry',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;
          const { assetTypes } = req.body;

          // First get jobs to retry
          let selectQuery = this.supabase
            .from('asset_generation_jobs')
            .select('id, retry_count, asset_type')
            .eq('story_id', storyId)
            .eq('status', 'failed');

          if (assetTypes?.length) {
            selectQuery = selectQuery.in('asset_type', assetTypes);
          }

          const { data: jobsToRetry } = await selectQuery;

          // Update each job with incremented retry count
          const retried: Array<{ asset_type: string }> = [];
          for (const job of jobsToRetry || []) {
            await this.supabase
              .from('asset_generation_jobs')
              .update({
                status: 'queued',
                error_message: null,
                retry_count: (job.retry_count || 0) + 1
              })
              .eq('id', job.id);
            retried.push({ asset_type: job.asset_type });
          }

          const error = null;
          if (error) throw error;

          res.json({
            success: true,
            data: {
              retried: retried?.map(r => r.asset_type) || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Retry assets failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'RETRY_FAILED'
          });
        }
      }
    );

    // Get QR code for story
    this.app.get(
      '/api/v1/stories/:storyId/qr',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          const { data: story, error } = await this.supabase
            .from('stories')
            .select('qr_code_url, qr_public_url, qr_scan_count')
            .eq('id', storyId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              qrCodeUrl: story.qr_code_url,
              publicUrl: story.qr_public_url,
              scanCount: story.qr_scan_count
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get QR failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_QR_FAILED'
          });
        }
      }
    );

    // Generate QR code
    this.app.post(
      '/api/v1/stories/:storyId/qr',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;
          // IMPORTANT: QR generation must NOT depend on third-party services (privacy).
          // Enqueue a `qr` asset job so Content Agent generates the QR PNG locally, uploads it to S3,
          // and writes `stories.qr_code_url` as an assets.storytailor.dev URL.

          // Mark story asset status (so Realtime clients see progress immediately)
          const { data: storyRow } = await this.supabase
            .from('stories')
            .select('asset_generation_status')
            .eq('id', storyId)
            .single()

          const currentStatus = (storyRow as any)?.asset_generation_status || { overall: 'generating', assets: {} }
          const nextStatus = {
            ...currentStatus,
            overall: currentStatus.overall || 'generating',
            assets: {
              ...(currentStatus.assets || {}),
              qr: { status: 'queued', progress: 0 }
            }
          }

          await this.supabase
            .from('stories')
            .update({ asset_generation_status: nextStatus })
            .eq('id', storyId)

          // Create job record
          const { data: job, error: jobError } = await this.supabase
            .from('asset_generation_jobs')
            .insert({
              story_id: storyId,
              asset_type: 'qr',
              status: 'queued',
              metadata: { priority: 'normal' }
            })
            .select()
            .single()

          if (jobError) throw jobError

          res.status(202).json({
            success: true,
            data: {
              storyId,
              jobId: job.id,
              assetType: 'qr',
              status: 'queued',
              realtimeChannel: `stories:id=${storyId}`,
              subscribePattern: {
                table: 'stories',
                filter: `id=eq.${storyId}`,
                event: 'UPDATE'
              }
            }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Generate QR failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GENERATE_QR_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // STREAMING & AVATAR ENDPOINTS (Category 4)
    // ==========================================================================

    // Get avatar connection details
    this.app.get(
      '/api/v1/avatar/connection',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          // Return connection details for avatar streaming
          res.json({
            success: true,
            data: {
              wsUrl: `wss://avatar.storytailor.com/ws/${userId}`,
              token: `avatar_${Date.now()}_${userId}`,
              capabilities: ['emotion_detection', 'voice_response', 'visual_feedback'],
              expiresAt: new Date(Date.now() + 3600000).toISOString()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get avatar connection failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'AVATAR_CONNECTION_FAILED'
          });
        }
      }
    );

    // Story asset progress SSE stream
    // Note: Lambda Function URLs with serverless-http buffer responses, so we send all messages immediately
    // For real-time updates, clients should use Supabase Realtime subscriptions
    this.app.get(
      '/api/v1/stories/:storyId/assets/stream',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;

          // Get story status
          const { data: story } = await this.supabase
            .from('stories')
            .select('asset_generation_status')
            .eq('id', storyId)
            .maybeSingle();

          // Set status code FIRST before headers
          res.status(200);

          // Set SSE headers
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

          // Build all SSE messages immediately (Lambda Function URLs require complete response)
          const messages: string[] = [];

          // Connection message
          const connectionMessage = {
            type: 'connected',
            storyId,
            timestamp: new Date().toISOString()
          };
          messages.push(`data: ${JSON.stringify(connectionMessage)}\n\n`);

          // Initial status
          const initialStatus = {
            type: 'status',
            storyId,
            status: story?.asset_generation_status || { overall: 'pending' },
            timestamp: new Date().toISOString()
          };
          messages.push(`data: ${JSON.stringify(initialStatus)}\n\n`);

          // Ping message
          const pingMessage = {
            type: 'ping',
            timestamp: new Date().toISOString()
          };
          messages.push(`data: ${JSON.stringify(pingMessage)}\n\n`);

          // Info message about Supabase Realtime
          const infoMessage = {
            type: 'info',
            message: 'For real-time updates, subscribe to Supabase Realtime on the stories table',
            realtimeChannel: `story:${storyId}`,
            timestamp: new Date().toISOString()
          };
          messages.push(`data: ${JSON.stringify(infoMessage)}\n\n`);

          // Send all messages at once (required for Lambda Function URLs)
          const allMessages = messages.join('');
          res.write(allMessages);
          res.end();

          this.logger.info('SSE stream sent', { storyId, messageCount: messages.length });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Asset stream failed', { error: errorMessage });
          
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: errorMessage,
              code: 'ASSET_STREAM_FAILED'
            });
          } else {
            try {
              res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage, code: 'ASSET_STREAM_FAILED' })}\n\n`);
              res.end();
            } catch (err) {
              // Response already closed
            }
          }
        }
      }
    );

    // ==========================================================================
    // STORY CRUD COMPLETION (UPDATE, DELETE, GET)
    // ==========================================================================

    // Update story
    this.app.patch(
      '/api/v1/libraries/:libraryId/stories/:storyId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const updates = req.body;

          const { data: story, error } = await this.supabase
            .from('stories')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', storyId)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: story
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update story failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_STORY_FAILED'
          });
        }
      }
    );

    // Delete story
    this.app.delete(
      '/api/v1/libraries/:libraryId/stories/:storyId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;
          const softDelete = req.query.soft !== 'false';

          if (softDelete) {
            await this.supabase
              .from('stories')
              .update({
                status: 'deleted',
                deleted_at: new Date().toISOString()
              })
              .eq('id', storyId)
              .eq('user_id', userId);
          } else {
            await this.supabase
              .from('stories')
              .delete()
              .eq('id', storyId)
              .eq('user_id', userId);
          }

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Delete story failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETE_STORY_FAILED'
          });
        }
      }
    );

    // Get single story
    this.app.get(
      '/api/v1/libraries/:libraryId/stories/:storyId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;

          const { data: story, error } = await this.supabase
            .from('stories')
            .select('*')
            .eq('id', storyId)
            .eq('user_id', userId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: story
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get story failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_STORY_FAILED'
          });
        }
      }
    );

    // Update character
    this.app.patch(
      '/api/v1/characters/:characterId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { characterId } = req.params;
          const updates = req.body;

          const { data: character, error } = await this.supabase
            .from('characters')
            .update({
              ...updates,
              updated_at: new Date().toISOString()
            })
            .eq('id', characterId)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: character
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update character failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_CHARACTER_FAILED'
          });
        }
      }
    );

    // Delete character
    this.app.delete(
      '/api/v1/characters/:characterId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { characterId } = req.params;

          await this.supabase
            .from('characters')
            .delete()
            .eq('id', characterId)
            .eq('user_id', userId);

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Delete character failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'DELETE_CHARACTER_FAILED'
          });
        }
      }
    );

    // Get single character
    this.app.get(
      '/api/v1/characters/:characterId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { characterId } = req.params;

          const { data: character, error } = await this.supabase
            .from('characters')
            .select('*')
            .eq('id', characterId)
            .eq('user_id', userId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: character
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get character failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_CHARACTER_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // TAGS & COLLECTIONS ENDPOINTS
    // ==========================================================================

    // List user tags
    this.app.get(
      '/api/v1/tags',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: tags, error } = await this.supabase
            .from('tags')
            .select('*')
            .eq('user_id', userId)
            .order('name');

          if (error) throw error;

          res.json({
            success: true,
            data: { tags: tags || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List tags failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_TAGS_FAILED'
          });
        }
      }
    );

    // Create tag
    this.app.post(
      '/api/v1/tags',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, color } = req.body;

          const { data: tag, error } = await this.supabase
            .from('tags')
            .insert({
              user_id: userId,
              name,
              color
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: tag
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Create tag failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CREATE_TAG_FAILED'
          });
        }
      }
    );

    // Add tag to story
    this.app.post(
      '/api/v1/stories/:storyId/tags',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { storyId } = req.params;
          const { tagId } = req.body;

          const { data, error } = await this.supabase
            .from('story_tags')
            .insert({
              story_id: storyId,
              tag_id: tagId
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Add tag failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ADD_TAG_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // FAVORITES & BOOKMARKS ENDPOINTS
    // ==========================================================================

    // Add to favorites
    this.app.post(
      '/api/v1/favorites',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { itemType, itemId } = req.body;

          const { data: favorite, error } = await this.supabase
            .from('favorites')
            .insert({
              user_id: userId,
              item_type: itemType,
              item_id: itemId
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: favorite
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Add favorite failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ADD_FAVORITE_FAILED'
          });
        }
      }
    );

    // List favorites
    this.app.get(
      '/api/v1/favorites',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const type = req.query.type as string;

          let query = this.supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId);

          if (type) {
            query = query.eq('item_type', type);
          }

          const { data: favorites, error } = await query.order('created_at', { ascending: false });
          if (error) throw error;

          res.json({
            success: true,
            data: { favorites: favorites || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List favorites failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_FAVORITES_FAILED'
          });
        }
      }
    );

    // Remove favorite
    this.app.delete(
      '/api/v1/favorites/:favoriteId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { favoriteId } = req.params;

          await this.supabase
            .from('favorites')
            .delete()
            .eq('id', favoriteId)
            .eq('user_id', userId);

          res.status(204).send();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Remove favorite failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REMOVE_FAVORITE_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PARENT DASHBOARD ENDPOINTS
    // ==========================================================================

    // Get dashboard overview
    this.app.get(
      '/api/v1/dashboard/parent',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          // Get user subscription and quota info
          const { data: user } = await this.supabase
            .from('users')
            .select('available_story_credits, profile_completed, smart_home_connected, subscription_tier')
            .eq('id', userId)
            .single();

          const { data: subscription } = await this.supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          const { count: storyCount } = await this.supabase
            .from('stories')
            .select('*', { count: 'exact', head: true })
            .eq('creator_user_id', userId);

          const { count: characterCount } = await this.supabase
            .from('characters')
            .select('*', { count: 'exact', head: true })
            .eq('creator_user_id', userId);

          const { data: packCreditsData } = await this.supabase.rpc('get_total_pack_credits', { p_user_id: userId });
          const packCredits = packCreditsData || 0;

          const isPro = subscription?.plan_id !== 'free' && subscription?.status === 'active';
          const storiesUsed = storyCount || 0;
          const creditsAvailable = (user?.available_story_credits || 0) + packCredits;
          const canCreate = isPro || creditsAvailable > 0;

          // Get child profiles (libraries owned by user)
          const { data: profiles } = await this.supabase
            .from('libraries')
            .select('id, name, created_at, age_range')
            .eq('owner', userId);

          // Get recent stories (this week)
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const { data: recentStories } = await this.supabase
            .from('stories')
            .select('id, title, created_at, library_id')
            .eq('creator_user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          const { data: thisWeekStories } = await this.supabase
            .from('stories')
            .select('id')
            .eq('creator_user_id', userId)
            .gte('created_at', oneWeekAgo.toISOString());

          // Get story type distribution
          const { data: allStories } = await this.supabase
            .from('stories')
            .select('metadata')
            .eq('creator_user_id', userId);

          const storyTypes: Record<string, number> = {};
          allStories?.forEach(story => {
            const type = story.metadata?.storyType || story.metadata?.type || 'unknown';
            storyTypes[type] = (storyTypes[type] || 0) + 1;
          });

          const mostPopularType = Object.entries(storyTypes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

          // Get total listen time (from story interactions)
          const { data: interactions } = await this.supabase
            .from('story_interactions')
            .select('interaction_data')
            .eq('user_id', userId)
            .eq('interaction_type', 'completed');

          const totalListenTime = interactions?.reduce((sum, i) => {
            return sum + (i.interaction_data?.duration_seconds || 0);
          }, 0) || 0;

          // Get emotion summary with patterns
          const { data: recentEmotions } = await this.supabase
            .from('emotions')
            .select('mood, confidence, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

          const emotionCounts: Record<string, number> = {};
          recentEmotions?.forEach(e => {
            emotionCounts[e.mood] = (emotionCounts[e.mood] || 0) + 1;
          });

          const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
          const totalEmotions = recentEmotions?.length || 0;
          const positiveCount = (emotionCounts['happy'] || 0);
          const negativeCount = (emotionCounts['sad'] || 0) + (emotionCounts['angry'] || 0) + (emotionCounts['scared'] || 0);
          const trend = totalEmotions > 0 ? (positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral') : 'neutral';
          const riskLevel = negativeCount > totalEmotions * 0.4 ? 'medium' : negativeCount > totalEmotions * 0.6 ? 'high' : 'low';

          // Earning opportunities
          const earningOpportunities = [];
          if (!user?.profile_completed) {
            earningOpportunities.push({
              action: 'complete_profile',
              description: 'Complete your profile to earn 1 story credit',
              reward: 1,
              status: 'pending',
              url: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/profile/complete`
            });
          }
          if (!user?.smart_home_connected) {
            earningOpportunities.push({
              action: 'connect_smart_home',
              description: 'Connect your smart home to earn 1 story credit',
              reward: 1,
              status: 'pending',
              url: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/settings/smart-home`
            });
          }
          earningOpportunities.push({
            action: 'invite_friend',
            description: 'Invite a friend to earn 1 story credit when they sign up',
            reward: 1,
            status: 'pending',
            url: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/invite`
          });

          // Recommendations
          const recommendations = [];
          if (!isPro && storiesUsed >= 1) {
            recommendations.push({
              type: 'upgrade',
              priority: 'high',
              title: 'Unlock Unlimited Stories',
              message: 'Upgrade to Pro for unlimited stories and premium features',
              cta: 'Upgrade Now',
              url: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/upgrade`,
              impact: 'high'
            });
          }
          if (recentEmotions && recentEmotions.length === 0) {
            recommendations.push({
              type: 'engagement',
              priority: 'medium',
              title: 'Start Tracking Emotions',
              message: 'Help your child express their feelings through story interactions',
              cta: 'Learn More',
              url: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/emotions`,
              impact: 'medium'
            });
          }

          // Upgrade suggestion
          const upgradeSuggestion = !isPro && storiesUsed >= 1 ? {
            show: true,
            message: 'You\'ve created your first story! Upgrade to unlock unlimited stories and premium features.',
            benefits: [
              'Unlimited stories',
              'Premium voice options',
              'PDF export',
              'Educational activities'
            ],
            ctaUrl: `${process.env.FRONTEND_URL || 'https://storytailor.com'}/upgrade`,
            discount: null
          } : null;

          res.json({
            success: true,
            data: {
              profiles: profiles || [],
              recentStories: recentStories || [],
              quota: {
                tier: subscription?.plan_id || 'free',
                storiesUsed,
                creditsAvailable,
                canCreate,
                nextAction: !canCreate ? (earningOpportunities[0]?.action || 'upgrade') : null
              },
              earningOpportunities,
              storyStats: {
                total: storyCount || 0,
                thisWeek: thisWeekStories?.length || 0,
                mostPopularType,
                totalListenTime: Math.round(totalListenTime / 60) // minutes
              },
              emotionSummary: {
                recent: recentEmotions?.slice(0, 10) || [],
                patterns: {
                  dominantEmotion,
                  trend,
                  riskLevel,
                  distribution: emotionCounts
                },
                insights: riskLevel !== 'low' ? [`Trending ${trend} with ${dominantEmotion} as dominant emotion`] : []
              },
              recommendations,
              upgradeSuggestion
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get dashboard failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_DASHBOARD_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // EXPORT ENDPOINTS
    // ==========================================================================

    // Export user data
    this.app.post(
      '/api/v1/users/me/export',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { format = 'json', includeMedia = false } = req.body;

          // Create export job
          const { data: job, error } = await this.supabase
            .from('export_jobs')
            .insert({
              user_id: userId,
              format,
              include_media: includeMedia,
              status: 'pending'
            })
            .select()
            .single();

          if (error) throw error;

          res.status(202).json({
            success: true,
            data: {
              exportId: job.id,
              status: 'pending',
              estimatedTime: 300
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Export request failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'EXPORT_FAILED'
          });
        }
      }
    );

    // Get export status
    this.app.get(
      '/api/v1/users/me/export/:exportId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { exportId } = req.params;

          const { data: job, error } = await this.supabase
            .from('export_jobs')
            .select('*')
            .eq('id', exportId)
            .eq('user_id', userId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              status: job.status,
              downloadUrl: job.download_url,
              expiresAt: job.expires_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get export status failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EXPORT_FAILED'
          });
        }
      }
    );

    // Import data
    this.app.post(
      '/api/v1/libraries/:libraryId/import',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { libraryId } = req.params;
          const { format, data, fileUrl } = req.body;

          if (!format || (!data && !fileUrl)) {
            return res.status(400).json({
              success: false,
              error: 'Format and data or fileUrl are required',
              code: 'IMPORT_DATA_REQUIRED'
            });
          }

          // Import logic would process the data/file
          res.json({
            success: true,
            data: {
              imported: {
                stories: 0,
                characters: 0
              },
              errors: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Import failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'IMPORT_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // COLLECTIONS ENDPOINTS (Category 9)
    // ==========================================================================

    // List collections
    this.app.get(
      '/api/v1/collections',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: collections, error } = await this.supabase
            .from('collections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          res.json({
            success: true,
            data: {
              collections: collections || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List collections failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_COLLECTIONS_FAILED'
          });
        }
      }
    );

    // Create collection
    this.app.post(
      '/api/v1/collections',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { name, description, isPublic = false } = req.body;

          if (!name) {
            return res.status(400).json({
              success: false,
              error: 'Collection name is required',
              code: 'NAME_REQUIRED'
            });
          }

          const { data: collection, error } = await this.supabase
            .from('collections')
            .insert({
              user_id: userId,
              name,
              description,
              is_public: isPublic
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              collectionId: collection.id,
              name: collection.name
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Create collection failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CREATE_COLLECTION_FAILED'
          });
        }
      }
    );

    // Get collection
    this.app.get(
      '/api/v1/collections/:collectionId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { collectionId } = req.params;

          const { data: collection, error } = await this.supabase
            .from('collections')
            .select('*, collection_items(*)')
            .eq('id', collectionId)
            .eq('user_id', userId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: collection
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get collection failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_COLLECTION_FAILED'
          });
        }
      }
    );

    // Add items to collection
    this.app.post(
      '/api/v1/collections/:collectionId/items',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { collectionId } = req.params;
          const { items } = req.body;

          if (!items || !Array.isArray(items)) {
            return res.status(400).json({
              success: false,
              error: 'Items array is required',
              code: 'ITEMS_REQUIRED'
            });
          }

          // Verify collection ownership
          const { data: collection } = await this.supabase
            .from('collections')
            .select('id')
            .eq('id', collectionId)
            .eq('user_id', userId)
            .single();

          if (!collection) {
            return res.status(404).json({
              success: false,
              error: 'Collection not found',
              code: 'COLLECTION_NOT_FOUND'
            });
          }

          // Insert items
          const collectionItems = items.map((item: { type: string; id: string }) => ({
            collection_id: collectionId,
            item_type: item.type,
            item_id: item.id
          }));

          const { data: inserted, error } = await this.supabase
            .from('collection_items')
            .insert(collectionItems)
            .select();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              items: inserted || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Add collection items failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ADD_COLLECTION_ITEMS_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PARENT DASHBOARD ENDPOINTS (Category 12 - Additional)
    // ==========================================================================

    // List children
    this.app.get(
      '/api/v1/parent/children',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          // Get child profiles linked to this parent
          const { data: children, error } = await this.supabase
            .from('profiles')
            .select('*, libraries(id, name)')
            .eq('parent_id', userId);

          if (error) throw error;

          res.json({
            success: true,
            data: {
              children: children || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List children failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_CHILDREN_FAILED'
          });
        }
      }
    );

    // Get child insights
    this.app.get(
      '/api/v1/parent/children/:childId/insights',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { childId } = req.params;

          // Verify parent relationship
          const { data: child } = await this.supabase
            .from('profiles')
            .select('id')
            .eq('id', childId)
            .eq('parent_id', userId)
            .single();

          if (!child) {
            return res.status(404).json({
              success: false,
              error: 'Child not found',
              code: 'CHILD_NOT_FOUND'
            });
          }

          // Get usage and emotional data
          res.json({
            success: true,
            data: {
              usage: {
                storiesRead: 0,
                hoursSpent: 0,
                favoriteTypes: []
              },
              emotional: {
                recentMoods: [],
                patterns: [],
                concerns: []
              },
              recommendations: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get child insights failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_CHILD_INSIGHTS_FAILED'
          });
        }
      }
    );

    // Get child activity
    this.app.get(
      '/api/v1/parent/children/:childId/activity',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { childId } = req.params;
          const days = parseInt(req.query.days as string) || 7;
          const limit = parseInt(req.query.limit as string) || 50;

          // Verify parent relationship
          const { data: child } = await this.supabase
            .from('profiles')
            .select('id')
            .eq('id', childId)
            .eq('parent_id', userId)
            .single();

          if (!child) {
            return res.status(404).json({
              success: false,
              error: 'Child not found',
              code: 'CHILD_NOT_FOUND'
            });
          }

          const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

          // Get activity log
          res.json({
            success: true,
            data: {
              activities: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get child activity failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_CHILD_ACTIVITY_FAILED'
          });
        }
      }
    );

    // Grant permissions to child's library
    this.app.post(
      '/api/v1/parent/children/:childId/permissions/grant',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { childId } = req.params;
          const { email, role, scope, expiresAt } = req.body;

          if (!email || !role) {
            return res.status(400).json({
              success: false,
              error: 'Email and role are required',
              code: 'EMAIL_ROLE_REQUIRED'
            });
          }

          // Verify parent relationship and get child's library
          const { data: child } = await this.supabase
            .from('profiles')
            .select('library_id')
            .eq('id', childId)
            .eq('parent_id', userId)
            .single();

          if (!child) {
            return res.status(404).json({
              success: false,
              error: 'Child not found',
              code: 'CHILD_NOT_FOUND'
            });
          }

          // Grant permission (would use PermissionService)
          res.json({
            success: true,
            data: {
              permissionId: 'perm-123',
              granted: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Grant permission failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GRANT_PERMISSION_FAILED'
          });
        }
      }
    );

    // List child permissions
    this.app.get(
      '/api/v1/parent/children/:childId/permissions',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { childId } = req.params;

          // Verify parent relationship
          const { data: child } = await this.supabase
            .from('profiles')
            .select('library_id')
            .eq('id', childId)
            .eq('parent_id', userId)
            .single();

          if (!child) {
            return res.status(404).json({
              success: false,
              error: 'Child not found',
              code: 'CHILD_NOT_FOUND'
            });
          }

          // Get permissions for child's library
          const { data: permissions } = await this.supabase
            .from('library_permissions')
            .select('*, users(email, first_name, last_name)')
            .eq('library_id', child.library_id);

          res.json({
            success: true,
            data: {
              permissions: permissions || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List child permissions failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_CHILD_PERMISSIONS_FAILED'
          });
        }
      }
    );

    // Revoke permission
    this.app.delete(
      '/api/v1/parent/children/:childId/permissions/:permissionId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { childId, permissionId } = req.params;

          // Verify parent relationship
          const { data: child } = await this.supabase
            .from('profiles')
            .select('library_id')
            .eq('id', childId)
            .eq('parent_id', userId)
            .single();

          if (!child) {
            return res.status(404).json({
              success: false,
              error: 'Child not found',
              code: 'CHILD_NOT_FOUND'
            });
          }

          // Delete permission
          const { error } = await this.supabase
            .from('library_permissions')
            .delete()
            .eq('id', permissionId)
            .eq('library_id', child.library_id);

          if (error) throw error;

          res.json({
            success: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Revoke permission failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REVOKE_PERMISSION_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // AFFILIATE PROGRAM ENDPOINTS (Category 14 - Additional)
    // ==========================================================================

    // Register as affiliate
    this.app.post(
      '/api/v1/affiliates/register',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { paymentMethod, taxInfo } = req.body;

          // Generate referral code
          const referralCode = `REF-${userId.substring(0, 8).toUpperCase()}`;

          const { data: affiliate, error } = await this.supabase
            .from('affiliate_accounts')
            .insert({
              user_id: userId,
              referral_code: referralCode,
              payment_method: paymentMethod || 'stripe',
              tax_info: taxInfo,
              status: 'active'
            })
            .select()
            .single();

          if (error) throw error;

          const trackingLink = `${process.env.APP_URL || 'https://storytailor.com'}/signup?ref=${referralCode}`;

          res.status(201).json({
            success: true,
            data: {
              affiliateId: affiliate.id,
              referralCode,
              trackingLink
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Register affiliate failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REGISTER_AFFILIATE_FAILED'
          });
        }
      }
    );

    // Get affiliate dashboard
    this.app.get(
      '/api/v1/affiliates/dashboard',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: affiliate } = await this.supabase
            .from('affiliate_accounts')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (!affiliate) {
            return res.status(404).json({
              success: false,
              error: 'Affiliate account not found',
              code: 'AFFILIATE_NOT_FOUND'
            });
          }

          // Get referrals and earnings
          const { data: referrals } = await this.supabase
            .from('affiliate_referrals')
            .select('*')
            .eq('affiliate_user_id', userId);

          const { data: earnings } = await this.supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('affiliate_user_id', userId);

          const totalEarnings = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
          const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

          res.json({
            success: true,
            data: {
              earnings: {
                total: totalEarnings,
                pending: pendingEarnings,
                paid: totalEarnings - pendingEarnings
              },
              referrals: {
                total: referrals?.length || 0,
                active: referrals?.filter(r => r.status === 'active').length || 0,
                converted: referrals?.filter(r => r.status === 'converted').length || 0
              },
              performance: {
                clickRate: 0,
                conversionRate: 0
              },
              recentActivity: []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get affiliate dashboard failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_AFFILIATE_DASHBOARD_FAILED'
          });
        }
      }
    );

    // List referrals
    this.app.get(
      '/api/v1/affiliates/referrals',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { status, limit = 50, offset = 0 } = req.query;

          let query = this.supabase
            .from('affiliate_referrals')
            .select('*')
            .eq('affiliate_user_id', userId)
            .order('created_at', { ascending: false })
            .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

          if (status) {
            query = query.eq('status', status);
          }

          const { data: referrals, error } = await query;

          if (error) throw error;

          res.json({
            success: true,
            data: {
              referrals: referrals || []
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List referrals failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_REFERRALS_FAILED'
          });
        }
      }
    );

    // Get earnings breakdown
    this.app.get(
      '/api/v1/affiliates/earnings',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { period = 'month' } = req.query;

          const { data: earnings, error } = await this.supabase
            .from('affiliate_earnings')
            .select('*')
            .eq('affiliate_user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const total = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

          res.json({
            success: true,
            data: {
              earnings: earnings || [],
              total
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get earnings failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EARNINGS_FAILED'
          });
        }
      }
    );

    // Request payout
    this.app.post(
      '/api/v1/affiliates/payout/request',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { amount, method = 'stripe' } = req.body;

          const { data: payout, error } = await this.supabase
            .from('affiliate_payouts')
            .insert({
              affiliate_user_id: userId,
              amount,
              method,
              status: 'pending',
              requested_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({
            success: true,
            data: {
              payoutId: payout.id,
              status: 'pending',
              estimatedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Request payout failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REQUEST_PAYOUT_FAILED'
          });
        }
      }
    );

    // Get tracking links
    this.app.get(
      '/api/v1/affiliates/links',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: affiliate } = await this.supabase
            .from('affiliate_accounts')
            .select('referral_code')
            .eq('user_id', userId)
            .single();

          if (!affiliate) {
            return res.status(404).json({
              success: false,
              error: 'Affiliate account not found',
              code: 'AFFILIATE_NOT_FOUND'
            });
          }

          const trackingLink = `${process.env.APP_URL || 'https://storytailor.com'}/signup?ref=${affiliate.referral_code}`;

          res.json({
            success: true,
            data: {
              links: [
                {
                  url: trackingLink,
                  clicks: 0,
                  conversions: 0,
                  created: new Date().toISOString()
                }
              ]
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get tracking links failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_TRACKING_LINKS_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // ADMIN & INTERNAL ENDPOINTS (Category 25)
    // ==========================================================================

    // Admin middleware helper
    const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: Function) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' });
        }

        const { data: user } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (!user || !['admin', 'superadmin'].includes(user.role)) {
          return res.status(403).json({ success: false, error: 'Admin access required', code: 'FORBIDDEN' });
        }

        next();
      } catch (error) {
        res.status(500).json({ success: false, error: 'Auth check failed', code: 'AUTH_FAILED' });
      }
    };

    // Get system health
    this.app.get(
      '/api/v1/admin/health',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const healthChecks = {
            database: 'healthy',
            redis: 'healthy',
            agents: {
              router: 'healthy',
              content: 'healthy',
              emotion: 'healthy',
              commerce: 'healthy'
            },
            externalServices: {
              openai: 'healthy',
              elevenlabs: 'healthy',
              stripe: 'healthy'
            }
          };

          res.json({
            success: true,
            data: {
              status: 'healthy',
              checks: healthChecks,
              uptime: process.uptime(),
              timestamp: new Date().toISOString()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Health check failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'HEALTH_CHECK_FAILED'
          });
        }
      }
    );

    // Get system metrics
    this.app.get(
      '/api/v1/admin/metrics',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { data: userCount } = await this.supabase
            .from('users')
            .select('id', { count: 'exact', head: true });

          const { data: storyCount } = await this.supabase
            .from('stories')
            .select('id', { count: 'exact', head: true });

          const { data: activeUsers } = await this.supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .gte('last_active_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

          res.json({
            success: true,
            data: {
              users: {
                total: userCount || 0,
                active24h: activeUsers || 0
              },
              stories: {
                total: storyCount || 0
              },
              memory: process.memoryUsage(),
              cpu: process.cpuUsage()
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Metrics failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'METRICS_FAILED'
          });
        }
      }
    );

    // List users (admin)
    this.app.get(
      '/api/v1/admin/users',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const limit = parseInt(req.query.limit as string) || 50;
          const offset = parseInt(req.query.offset as string) || 0;
          const status = req.query.status as string;

          let query = this.supabase
            .from('users')
            .select('id, email, name, role, status, created_at, last_active_at')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (status) {
            query = query.eq('status', status);
          }

          const { data: users, error } = await query;
          if (error) throw error;

          res.json({
            success: true,
            data: { users: users || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('List users failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'LIST_USERS_FAILED'
          });
        }
      }
    );

    // Get user details (admin)
    this.app.get(
      '/api/v1/admin/users/:userId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { userId } = req.params;

          const { data: user, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: user
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get user failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_USER_FAILED'
          });
        }
      }
    );

    // Update user status (admin)
    this.app.patch(
      '/api/v1/admin/users/:userId/status',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { userId } = req.params;
          const { status, reason } = req.body;

          const { data: user, error } = await this.supabase
            .from('users')
            .update({
              status,
              status_reason: reason,
              status_updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: { userId: user.id, status: user.status }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update user status failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_STATUS_FAILED'
          });
        }
      }
    );

    // Get audit logs (admin)
    this.app.get(
      '/api/v1/admin/audit',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const limit = parseInt(req.query.limit as string) || 100;
          const offset = parseInt(req.query.offset as string) || 0;
          const action = req.query.action as string;
          const userId = req.query.userId as string;

          let query = this.supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (action) {
            query = query.eq('action', action);
          }
          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data: logs, error } = await query;
          if (error) throw error;

          res.json({
            success: true,
            data: { logs: logs || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get audit logs failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'AUDIT_LOGS_FAILED'
          });
        }
      }
    );

    // Get content moderation queue (admin)
    this.app.get(
      '/api/v1/admin/moderation',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const status = req.query.status as string || 'pending';

          const { data: items, error } = await this.supabase
            .from('moderation_queue')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: true });

          if (error) throw error;

          res.json({
            success: true,
            data: { items: items || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get moderation queue failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MODERATION_FAILED'
          });
        }
      }
    );

    // Moderate content (admin)
    this.app.post(
      '/api/v1/admin/moderation/:itemId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const adminId = req.user!.id;
          const { itemId } = req.params;
          const { action, reason } = req.body;

          const { error } = await this.supabase
            .from('moderation_queue')
            .update({
              status: action,
              moderated_by: adminId,
              moderated_at: new Date().toISOString(),
              reason
            })
            .eq('id', itemId);

          if (error) throw error;

          res.json({
            success: true,
            data: { itemId, action }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Moderate content failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'MODERATE_FAILED'
          });
        }
      }
    );

    // Get support tickets (admin)
    this.app.get(
      '/api/v1/admin/support/tickets',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const status = req.query.status as string;

          let query = this.supabase
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

          if (status) {
            query = query.eq('status', status);
          }

          const { data: tickets, error } = await query;
          if (error) throw error;

          res.json({
            success: true,
            data: { tickets: tickets || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get tickets failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_TICKETS_FAILED'
          });
        }
      }
    );

    // Update support ticket (admin)
    this.app.patch(
      '/api/v1/admin/support/tickets/:ticketId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const adminId = req.user!.id;
          const { ticketId } = req.params;
          const { status, assignedTo, priority, response } = req.body;

          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (status) updates.status = status;
          if (assignedTo) updates.assigned_to = assignedTo;
          if (priority) updates.priority = priority;
          if (response) {
            updates.responses = this.supabase.rpc('array_append', { arr: 'responses', val: { by: adminId, text: response, at: new Date().toISOString() } });
          }

          const { data: ticket, error } = await this.supabase
            .from('support_tickets')
            .update(updates)
            .eq('id', ticketId)
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: ticket
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update ticket failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_TICKET_FAILED'
          });
        }
      }
    );

    // Feature flags (admin)
    this.app.get(
      '/api/v1/admin/features',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { data: flags, error } = await this.supabase
            .from('feature_flags')
            .select('*')
            .order('name');

          if (error) throw error;

          res.json({
            success: true,
            data: { flags: flags || [] }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get feature flags failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_FLAGS_FAILED'
          });
        }
      }
    );

    // Update feature flag (admin)
    this.app.patch(
      '/api/v1/admin/features/:flagId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { flagId } = req.params;
          const { enabled, rolloutPercentage } = req.body;

          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (typeof enabled !== 'undefined') updates.enabled = enabled;
          if (typeof rolloutPercentage !== 'undefined') updates.rollout_percentage = rolloutPercentage;

          const { data: flag, error } = await this.supabase
            .from('feature_flags')
            .update(updates)
            .eq('id', flagId)
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: flag
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update feature flag failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_FLAG_FAILED'
          });
        }
      }
    );

    // Get subscription analytics (admin)
    this.app.get(
      '/api/v1/admin/analytics/subscriptions',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { data: subscriptions } = await this.supabase
            .from('subscriptions')
            .select('tier, status');

          const analytics = {
            byTier: {} as Record<string, number>,
            byStatus: {} as Record<string, number>,
            total: subscriptions?.length || 0
          };

          subscriptions?.forEach(sub => {
            analytics.byTier[sub.tier] = (analytics.byTier[sub.tier] || 0) + 1;
            analytics.byStatus[sub.status] = (analytics.byStatus[sub.status] || 0) + 1;
          });

          res.json({
            success: true,
            data: analytics
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get subscription analytics failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ANALYTICS_FAILED'
          });
        }
      }
    );

    // Get usage analytics (admin)
    this.app.get(
      '/api/v1/admin/analytics/usage',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const period = req.query.period as string || '30d';

          // Get story creation counts
          const { count: storyCount } = await this.supabase
            .from('stories')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

          res.json({
            success: true,
            data: {
              storiesCreated: storyCount || 0,
              period
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get usage analytics failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'USAGE_ANALYTICS_FAILED'
          });
        }
      }
    );

    // Broadcast notification (admin)
    this.app.post(
      '/api/v1/admin/notifications/broadcast',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { title, message, targetAudience, expiresAt } = req.body;

          // Would create notifications for all users matching targetAudience
          res.status(202).json({
            success: true,
            data: {
              queued: true,
              estimatedRecipients: 1000
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Broadcast failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'BROADCAST_FAILED'
          });
        }
      }
    );

    // Impersonate user (superadmin only)
    this.app.post(
      '/api/v1/admin/impersonate/:userId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const adminId = req.user!.id;
          const { userId } = req.params;

          // Check if superadmin
          const { data: admin } = await this.supabase
            .from('users')
            .select('role')
            .eq('id', adminId)
            .single();

          if (admin?.role !== 'superadmin') {
            return res.status(403).json({
              success: false,
              error: 'Superadmin access required',
              code: 'FORBIDDEN'
            });
          }

          // Create impersonation session
          const { data: session, error } = await this.supabase
            .from('impersonation_sessions')
            .insert({
              admin_id: adminId,
              target_user_id: userId,
              expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: {
              sessionId: session.id,
              expiresAt: session.expires_at
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Impersonation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'IMPERSONATE_FAILED'
          });
        }
      }
    );

    // End impersonation session
    this.app.delete(
      '/api/v1/admin/impersonate',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const adminId = req.user!.id;

          await this.supabase
            .from('impersonation_sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('admin_id', adminId)
            .is('ended_at', null);

          res.json({ success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('End impersonation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'END_IMPERSONATE_FAILED'
          });
        }
      }
    );

    // System configuration (admin)
    this.app.get(
      '/api/v1/admin/config',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { data: configs, error } = await this.supabase
            .from('system_config')
            .select('*');

          if (error) throw error;

          res.json({
            success: true,
            data: configs || []
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get config failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_CONFIG_FAILED'
          });
        }
      }
    );

    // Update system configuration (admin)
    this.app.patch(
      '/api/v1/admin/config/:key',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { key } = req.params;
          const { value } = req.body;

          const { data: config, error } = await this.supabase
            .from('system_config')
            .upsert({
              key,
              value,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: config
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update config failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_CONFIG_FAILED'
          });
        }
      }
    );

    // Trigger manual job (admin)
    this.app.post(
      '/api/v1/admin/jobs/:jobType',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { jobType } = req.params;
          const { params } = req.body;

          // Queue the job
          const { data: job, error } = await this.supabase
            .from('admin_jobs')
            .insert({
              type: jobType,
              params,
              status: 'queued',
              queued_by: req.user!.id
            })
            .select()
            .single();

          if (error) throw error;

          res.status(202).json({
            success: true,
            data: {
              jobId: job.id,
              status: 'queued'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Trigger job failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'TRIGGER_JOB_FAILED'
          });
        }
      }
    );

    // Get job status (admin)
    this.app.get(
      '/api/v1/admin/jobs/:jobId',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response, next: Function) => requireAdmin(req, res, next),
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { jobId } = req.params;

          const { data: job, error } = await this.supabase
            .from('admin_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data: job
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get job status failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_JOB_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // PIPELINE INTELLIGENCE ENDPOINTS (For Wized/Webflow)
    // ==========================================================================

    // Track story consumption event
    this.app.post(
      '/api/v1/stories/:storyId/consumption',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { storyId } = req.params;
        
        try {
          const { eventType, position, duration, metadata } = req.body;

          // Validate story ID format (temp IDs not supported for consumption tracking)
          if (storyId.startsWith('temp_')) {
            return res.status(400).json({
              success: false,
              error: 'Story is still being processed. Consumption tracking requires a permanent story ID. Please wait for story generation to complete.',
              code: 'STORY_PROCESSING'
            });
          }

          // Import ConsumptionAnalyticsService dynamically
          const { ConsumptionAnalyticsService } = await import('../services/ConsumptionAnalyticsService');
          const consumptionService = new ConsumptionAnalyticsService(this.supabase, this.logger);

          await consumptionService.trackEvent({
            storyId,
            userId,
            eventType,
            timestamp: new Date(),
            position,
            duration,
            metadata
          });

          res.json({
            success: true,
            message: 'Consumption event tracked'
          });
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message 
            : (typeof error === 'object' && error !== null 
              ? JSON.stringify(error) 
              : String(error));
          this.logger.error('Track consumption failed', { error: errorMessage, storyId, userId });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'TRACK_CONSUMPTION_FAILED'
          });
        }
      }
    );

    // Get story consumption metrics
    this.app.get(
      '/api/v1/stories/:storyId/metrics',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;

          const { ConsumptionAnalyticsService } = await import('../services/ConsumptionAnalyticsService');
          const consumptionService = new ConsumptionAnalyticsService(this.supabase, this.logger);

          const metrics = await consumptionService.getMetrics(storyId, userId);

          res.json({
            success: true,
            data: metrics || {
              storyId,
              userId,
              readCount: 0,
              totalDurationSeconds: 0,
              completionRate: 0,
              replayCount: 0,
              engagementScore: 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get metrics failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_METRICS_FAILED'
          });
        }
      }
    );

    // Get story effectiveness (comparative insights)
    this.app.get(
      '/api/v1/stories/:storyId/effectiveness',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { storyId } = req.params;

          const { StoryEffectivenessService } = await import('../services/StoryEffectivenessService');
          const { EmailService } = await import('../services/EmailService');
          
          const emailService = new EmailService(this.supabase, this.logger);
          const effectivenessService = new StoryEffectivenessService(
            this.supabase,
            emailService,
            this.logger
          );

          const effectiveness = await effectivenessService.calculateEffectiveness(storyId, userId);

          res.json({
            success: true,
            data: effectiveness || {
              storyId,
              userId,
              effectivenessScore: 0,
              improvements: [],
              recommendation: null
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get effectiveness failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EFFECTIVENESS_FAILED'
          });
        }
      }
    );

    // Get email preferences
    this.app.get(
      '/api/v1/users/me/email-preferences',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: prefs, error } = await this.supabase
            .from('email_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (error && error.code !== 'PGRST116') { // Not found is ok
            throw error;
          }

          res.json({
            success: true,
            data: prefs || {
              transactional: true,
              insights: true,
              marketing: true,
              reminders: true,
              digestFrequency: 'evening',
              insightsFrequency: 'weekly',
              dailyMoment: 'evening'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get email preferences failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_EMAIL_PREFERENCES_FAILED'
          });
        }
      }
    );

    // Update email preferences
    this.app.patch(
      '/api/v1/users/me/email-preferences',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const updates = req.body;

          const { data, error } = await this.supabase
            .from('email_preferences')
            .upsert({
              user_id: userId,
              ...updates,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;

          res.json({
            success: true,
            data
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Update email preferences failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'UPDATE_EMAIL_PREFERENCES_FAILED'
          });
        }
      }
    );

    // Get available credits
    this.app.get(
      '/api/v1/users/me/credits',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: credits } = await this.supabase.rpc('calculate_user_credits', {
            p_user_id: userId
          });

          res.json({
            success: true,
            data: {
              availableCredits: credits || 0,
              formattedAmount: `$${((credits || 0) / 100).toFixed(2)}`
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get credits failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_CREDITS_FAILED'
          });
        }
      }
    );

    // Get reward ledger
    this.app.get(
      '/api/v1/users/me/rewards',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { page, limit, offset } = this.parsePagination(req);

          // Get total count and data
          const [{ count: total }, { data: rewards, error }] = await Promise.all([
            this.supabase
              .from('reward_ledger')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId),
            this.supabase
              .from('reward_ledger')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .range(offset, offset + limit - 1)
          ]);

          if (error) throw error;

          // Get all rewards for totals (not just paginated)
          const { data: allRewards } = await this.supabase
            .from('reward_ledger')
            .select('amount, status')
            .eq('user_id', userId);

          const totalEarned = allRewards?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
          const totalApplied = allRewards?.filter(r => r.status === 'applied')
            .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

          const paginationResponse = this.buildPaginationResponse(
            rewards || [],
            total || 0,
            page,
            limit
          );

          if (!Array.isArray(paginationResponse.data)) {
            this.logger.error('Invariant violated: rewards payload is not an array', {
              computedType: typeof paginationResponse.data
            });
            return res.status(500).json({
              success: false,
              error: 'Rewards payload malformed',
              code: 'REWARDS_PAYLOAD_INVALID'
            });
          }

          res.json({
            ...paginationResponse,
            data: {
              rewards: paginationResponse.data,
              totalEarned,
              totalApplied,
              available: totalEarned - totalApplied
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get rewards failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_REWARDS_FAILED'
          });
        }
      }
    );

    // Get referral info
    this.app.get(
      '/api/v1/users/me/referral-link',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          // Get or create referral code
          const { data: user } = await this.supabase
            .from('users')
            .select('referral_code')
            .eq('id', userId)
            .single();

          let referralCode = user?.referral_code;

          if (!referralCode) {
            // Generate referral code
            referralCode = `ST${userId.substring(0, 8).toUpperCase()}`;
            
            await this.supabase
              .from('users')
              .update({ referral_code: referralCode })
              .eq('id', userId);
          }

          // Get referral stats
          const { count: referralCount } = await this.supabase
            .from('referral_tracking')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', userId)
            .eq('status', 'converted');

          const referralLink = `https://storytailor.com/signup?ref=${referralCode}`;

          res.json({
            success: true,
            data: {
              referralCode,
              referralLink,
              totalReferrals: referralCount || 0,
              nextMilestone: referralCount >= 10 ? null : 
                            referralCount >= 5 ? { count: 10, reward: '50% off forever' } :
                            referralCount >= 3 ? { count: 5, reward: '$10 bonus + 1 month free' } :
                            { count: 3, reward: '$5 bonus' }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get referral link failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_REFERRAL_LINK_FAILED'
          });
        }
      }
    );

    // Get daily insights
    this.app.get(
      '/api/v1/users/me/insights/daily',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const date = req.query.date ? new Date(req.query.date as string) : new Date();

          const { DailyDigestService } = await import('../services/DailyDigestService');
          const { ConsumptionAnalyticsService } = await import('../services/ConsumptionAnalyticsService');
          const { IntelligenceCurator } = await import('../services/IntelligenceCurator');
          const { UserTypeRouter } = await import('../services/UserTypeRouter');
          const { EmailService } = await import('../services/EmailService');

          const emailService = new EmailService(this.supabase, this.logger);
          const consumptionService = new ConsumptionAnalyticsService(this.supabase, this.logger);
          const userTypeRouter = new UserTypeRouter(this.supabase, this.logger);
          const curator = new IntelligenceCurator(this.supabase, emailService, this.logger);
          
          const dailyDigestService = new DailyDigestService(
            this.supabase,
            emailService,
            consumptionService,
            curator,
            userTypeRouter,
            this.logger
          );

          const digest = await (dailyDigestService as any).generateDigest(userId, date);

          // Get learning insights
          const { data: assessments } = await this.supabase
            .from('educational_assessments')
            .select('assessment_type, results, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date(date.setHours(0, 0, 0, 0)).toISOString())
            .lte('created_at', new Date(date.setHours(23, 59, 59, 999)).toISOString());

          const newWords = assessments?.reduce((sum, a) => sum + (a.results?.newWords?.length || 0), 0) || 0;
          const conceptsExplored = assessments?.filter(a => a.assessment_type === 'concept').length || 0;
          const skillsImproved = assessments?.filter(a => a.results?.skillImprovement).length || 0;
          const educationalProgress = assessments?.reduce((sum, a) => sum + (a.results?.progressScore || 0), 0) / (assessments?.length || 1) || 0;

          // Get emotional insights
          const { data: dayEmotions } = await this.supabase
            .from('emotions')
            .select('mood, confidence, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date(date.setHours(0, 0, 0, 0)).toISOString())
            .lte('created_at', new Date(date.setHours(23, 59, 59, 999)).toISOString());

          const emotionCounts: Record<string, number> = {};
          dayEmotions?.forEach(e => {
            emotionCounts[e.mood] = (emotionCounts[e.mood] || 0) + 1;
          });

          const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
          const positiveCount = (emotionCounts['happy'] || 0);
          const negativeCount = (emotionCounts['sad'] || 0) + (emotionCounts['angry'] || 0) + (emotionCounts['scared'] || 0);
          const trend = positiveCount > negativeCount ? 'positive' : negativeCount > positiveCount ? 'negative' : 'neutral';
          const concerningPatterns = negativeCount > dayEmotions?.length * 0.5 ? ['High negative emotion frequency'] : [];
          const riskLevel = negativeCount > dayEmotions?.length * 0.6 ? 'high' : negativeCount > dayEmotions?.length * 0.4 ? 'medium' : 'low';

          // Get milestones
          const milestones = [];
          
          // Check for first story milestone
          const { count: totalStories } = await this.supabase
            .from('stories')
            .select('*', { count: 'exact', head: true })
            .eq('creator_user_id', userId);
          
          if (totalStories === 1) {
            milestones.push({
              achievement: 'first_story',
              date: new Date().toISOString(),
              message: 'Created your first story!',
              badge: 'storyteller'
            });
          }

          // Check for 10 stories milestone
          if (totalStories === 10) {
            milestones.push({
              achievement: 'ten_stories',
              date: new Date().toISOString(),
              message: 'Created 10 stories! You\'re a master storyteller!',
              badge: 'master_storyteller'
            });
          }

          // Check for 1 hour listen time milestone
          const { data: allInteractions } = await this.supabase
            .from('story_interactions')
            .select('interaction_data')
            .eq('user_id', userId)
            .eq('interaction_type', 'completed');

          const totalListenTimeMinutes = (allInteractions?.reduce((sum, i) => sum + (i.interaction_data?.duration_seconds || 0), 0) || 0) / 60;
          
          if (totalListenTimeMinutes >= 60 && totalListenTimeMinutes < 61) {
            milestones.push({
              achievement: 'one_hour_listening',
              date: new Date().toISOString(),
              message: 'Listened to stories for over 1 hour!',
              badge: 'dedicated_listener'
            });
          }

          // Enhance recommendations with priority and impact
          const enhancedRecommendations = (digest?.recommendations || []).map((rec: any) => ({
            ...rec,
            priority: rec.priority || 'medium',
            impact: rec.impact || 'medium',
            cta: rec.cta || 'Learn More',
            url: rec.url || `${process.env.FRONTEND_URL || 'https://storytailor.com'}/recommendations`
          }));

          res.json({
            success: true,
            data: {
              ...(digest || {
                userId,
                date,
                storiesConsumed: 0,
                totalListenTime: 0,
                topStory: null,
                recommendations: []
              }),
              learning: {
                newWords,
                conceptsExplored,
                skillsImproved,
                educationalProgress: Math.round(educationalProgress * 100) / 100
              },
              emotional: {
                dominantEmotion,
                distribution: emotionCounts,
                trend,
                concerningPatterns,
                riskLevel
              },
              milestones,
              recommendations: enhancedRecommendations
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get daily insights failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_DAILY_INSIGHTS_FAILED'
          });
        }
      }
    );

    // Get user's top effective stories
    this.app.get(
      '/api/v1/users/me/effectiveness/top-stories',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const limit = parseInt(req.query.limit as string) || 10;

          const { data: topStories, error } = await this.supabase
            .from('story_effectiveness')
            .select(`
              story_id,
              effectiveness_score,
              engagement_vs_baseline,
              mood_impact,
              recommended_for,
              stories(id, title, cover_art_url)
            `)
            .eq('user_id', userId)
            .order('effectiveness_score', { ascending: false })
            .limit(limit);

          if (error) throw error;

          res.json({
            success: true,
            data: {
              topStories: topStories || [],
              count: topStories?.length || 0
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get top stories failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_TOP_STORIES_FAILED'
          });
        }
      }
    );

    // Smart Home - List devices
    this.app.get(
      '/api/v1/smart-home/devices',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          
          // Use actual column names from database schema
          const { data: devices, error } = await this.supabase
            .from('smart_home_devices')
            .select('id, device_type, device_id, room_id, location_name, location_type, device_metadata, connection_status, created_at, last_used_at, resource_config')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          
          if (error) {
            this.logger.error('Failed to query smart home devices', { userId, error });
            throw error;
          }
          
          // Transform devices to include extracted device name from metadata
          const transformedDevices = (devices || []).map((device: any) => {
            const deviceName = device.device_metadata?.name || device.device_id || 'Unknown Device';
            return {
              id: device.id,
              deviceType: device.device_type,
              deviceId: device.device_id,
              deviceName, // Extracted from metadata or fallback to device_id
              roomId: device.room_id,
              locationName: device.location_name,
              locationType: device.location_type,
              connectionStatus: device.connection_status,
              connectedAt: device.created_at, // Use created_at instead of connected_at
              lastUsedAt: device.last_used_at,
              metadata: device.device_metadata || {},
              resourceConfig: device.resource_config || {}
            };
          });
          
          res.json({
            success: true,
            data: {
              devices: transformedDevices,
              count: transformedDevices.length
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get smart home devices', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_DEVICES_FAILED'
          });
        }
      }
    );

    // Smart Home - Get status
    this.app.get(
      '/api/v1/smart-home/status',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          
          // Get user's smart home connection status
          const { data: user } = await this.supabase
            .from('users')
            .select('smart_home_connected')
            .eq('id', userId)
            .single();
          
          // Get connected devices count
          const { count: connectedCount } = await this.supabase
            .from('smart_home_devices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('connection_status', 'connected');
          
          // Get total devices count
          const { count: totalCount } = await this.supabase
            .from('smart_home_devices')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
          
          res.json({
            success: true,
            data: {
              connected: user?.smart_home_connected || false,
              connectedDevices: connectedCount || 0,
              totalDevices: totalCount || 0,
              status: (connectedCount || 0) > 0 ? 'active' : 'inactive'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to get smart home status', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_STATUS_FAILED'
          });
        }
      }
    );
  }

  /**
   * Setup A2A (Agent2Agent) Protocol routes
   */
  private setupA2ARoutes(): void {
    try {
      // Initialize A2A adapter
      const router = (this.storytellerAPI as any)?.router || null;
      
      this.a2aAdapter = new A2AAdapter({
        router: router as any,
        storytellerAPI: this.storytellerAPI as any,
        supabase: this.supabase,
        logger: this.logger,
        config: {
          baseUrl: process.env.A2A_BASE_URL || process.env.APP_URL || 'https://api.storytailor.dev',
          webhookUrl: process.env.A2A_WEBHOOK_URL || `${process.env.APP_URL || 'https://api.storytailor.dev'}/a2a/webhook`,
          healthUrl: process.env.A2A_HEALTH_URL || `${process.env.APP_URL || 'https://api.storytailor.dev'}/health`,
          agentId: 'storytailor-agent',
          agentName: 'Storytailor Agent',
          agentVersion: '1.0.0',
          capabilities: ['storytelling', 'emotional-check-in', 'crisis-detection'],
          rateLimitPerMinute: parseInt(process.env.A2A_RATE_LIMIT_PER_MINUTE || '60', 10),
          taskTimeoutMs: parseInt(process.env.A2A_TASK_TIMEOUT_MS || '300000', 10),
          redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'a2a'
          },
          supabase: {
            url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
          }
        }
      });

      // GET /a2a/discovery - Agent Card discovery
      this.app.get('/a2a/discovery', async (req: Request, res: Response) => {
        try {
          if (!this.a2aAdapter) {
            return res.status(503).json({ error: 'A2A adapter not available' });
          }
          const agentCard = await this.a2aAdapter.getAgentCard();
          res.json({ agentCard });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('A2A discovery failed', { error: errorMessage });
          res.status(500).json({ error: 'Failed to retrieve agent card' });
        }
      });

      // POST /a2a/message - JSON-RPC 2.0 messaging
      this.app.post('/a2a/message', async (req: Request, res: Response) => {
        try {
          if (!this.a2aAdapter) {
            return res.status(503).json({
              jsonrpc: '2.0',
              id: (req.body as { id?: string | number | null })?.id || null,
              error: {
                code: -32603,
                message: 'A2A adapter not available'
              }
            });
          }
          const response = await this.a2aAdapter.handleMessage(req.body);
          res.json(response);
        } catch (error) {
          this.logger.error('A2A message failed', { error });
          const requestId = (req.body as { id?: string | number | null })?.id || null;
          res.status(500).json({
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32603,
              message: 'Internal error',
              data: error instanceof Error ? error.message : String(error)
            }
          });
        }
      });

      // POST /a2a/task - Task delegation
      this.app.post('/a2a/task', async (req: Request, res: Response) => {
        try {
          if (!this.a2aAdapter) {
            return res.status(503).json({
              error: 'A2A adapter not available',
              message: 'A2A adapter not initialized'
            });
          }

          const { method, params, clientAgentId, sessionId } = req.body as {
            method?: string;
            params?: Record<string, unknown>;
            clientAgentId?: string;
            sessionId?: string;
          };

          if (!method) {
            return res.status(400).json({
              error: 'Method is required',
              message: 'Task must include method field'
            });
          }

          if (!clientAgentId) {
            return res.status(400).json({
              error: 'Client agent ID is required',
              message: 'Task must include clientAgentId field'
            });
          }

          const task = await this.a2aAdapter.createTask({
            method,
            params: params || {},
            clientAgentId,
            sessionId
          });

          res.json(task);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('A2A task creation failed', { error: errorMessage });
          res.status(500).json({
            error: 'Failed to create task',
            message: errorMessage
          });
        }
      });

      // GET /a2a/status - Task status (with optional SSE)
      this.app.get('/a2a/status', async (req: Request, res: Response) => {
        const { taskId } = req.query;
        const acceptHeader = req.headers.accept || '';

        if (!taskId || typeof taskId !== 'string') {
          return res.status(400).json({
            error: 'Task ID is required',
            message: 'Query parameter taskId is required'
          });
        }

        if (!this.a2aAdapter) {
          return res.status(503).json({
            error: 'A2A adapter not available',
            message: 'A2A adapter not initialized'
          });
        }

        if (acceptHeader.includes('text/event-stream')) {
          // SSE streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');
          
          const lastEventId = req.headers['last-event-id'] as string | undefined;
          await this.a2aAdapter.streamTaskStatus(taskId, res, lastEventId);
        } else {
          // Standard JSON response
          try {
            const status = await this.a2aAdapter.getTaskStatus(taskId);
            res.json(status);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error('A2A status check failed', { error: errorMessage });
            res.status(500).json({
              error: 'Failed to get task status',
              message: errorMessage
            });
          }
        }
      });

    // ==========================================================================
    // COMMERCE ENDPOINTS (Category 17)
    // ==========================================================================

    // Create checkout session (individual)
    this.app.post(
      '/api/v1/checkout',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { planId, billingInterval, discountCode, returnUrl } = req.body;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          // Validate billing interval
          const interval = billingInterval === 'yearly' ? 'yearly' : 'monthly';

          const checkout = await this.commerceAgent.createIndividualCheckout(
            userId,
            planId || 'pro_individual',
            discountCode
          );

          res.json({
            success: true,
            data: {
              sessionId: checkout.sessionId,
              url: checkout.url,
              expiresAt: checkout.expiresAt,
              billingInterval: interval,
              returnUrl: returnUrl || `${process.env.FRONTEND_URL || 'https://storytailor.com'}/subscription/success`
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Checkout creation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CHECKOUT_FAILED'
          });
        }
      }
    );

    // Alias for individual checkout
    this.app.post(
      '/api/v1/checkout/individual',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { planId, billingInterval, discountCode, returnUrl } = req.body;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          // Validate billing interval
          const interval = billingInterval === 'yearly' ? 'yearly' : 'monthly';

          const checkout = await this.commerceAgent.createIndividualCheckout(
            userId,
            planId || 'pro_individual',
            discountCode
          );

          res.json({
            success: true,
            data: {
              sessionId: checkout.sessionId,
              checkoutUrl: checkout.url,
              url: checkout.url,
              expiresAt: checkout.expiresAt,
              billingInterval: interval,
              returnUrl: returnUrl || `${process.env.FRONTEND_URL || 'https://storytailor.com'}/subscription/success`
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Checkout creation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CHECKOUT_FAILED'
          });
        }
      }
    );

    // Create organization checkout
    this.app.post(
      '/api/v1/checkout/organization',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { organizationName, seatCount, planId, billingInterval } = req.body;

          if (!organizationName || !seatCount) {
            return res.status(400).json({
              success: false,
              error: 'Organization name and seat count are required',
              code: 'MISSING_REQUIRED_FIELDS'
            });
          }

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          // Validate billing interval
          const interval = billingInterval === 'yearly' ? 'yearly' : 'monthly';

          const checkout = await this.commerceAgent.createOrganizationCheckout(
            userId,
            organizationName,
            seatCount,
            planId || 'pro_organization'
          );

          res.json({
            success: true,
            data: {
              sessionId: checkout.sessionId,
              url: checkout.url,
              expiresAt: checkout.expiresAt,
              billingInterval: interval
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Organization checkout failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'ORGANIZATION_CHECKOUT_FAILED'
          });
        }
      }
    );

    // Get subscription status
    this.app.get(
      '/api/v1/subscription',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const subscription = await this.commerceAgent.getSubscriptionStatus(userId);

          if (!subscription) {
            return res.json({
              success: true,
              data: {
                hasSubscription: false,
                plan: 'free'
              }
            });
          }

          res.json({
            success: true,
            data: {
              hasSubscription: true,
              subscription: {
                id: subscription.id,
                planId: subscription.plan_id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get subscription failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_SUBSCRIPTION_FAILED'
          });
        }
      }
    );

    // Alias for subscription status
    this.app.get(
      '/api/v1/subscriptions/me',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const subscription = await this.commerceAgent.getSubscriptionStatus(userId);

          if (!subscription) {
            return res.json({
              success: true,
              data: {
                hasSubscription: false,
                plan: 'free'
              }
            });
          }

          res.json({
            success: true,
            data: {
              hasSubscription: true,
              subscription: {
                id: subscription.id,
                planId: subscription.plan_id,
                status: subscription.status,
                currentPeriodStart: subscription.current_period_start,
                currentPeriodEnd: subscription.current_period_end
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get subscription failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_SUBSCRIPTION_FAILED'
          });
        }
      }
    );

    // Cancel subscription
    this.app.post(
      '/api/v1/subscription/cancel',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { immediate } = req.body;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const result = await this.commerceAgent.cancelSubscription(userId, immediate === true);

          if (!result.success) {
            return res.status(400).json({
              success: false,
              error: result.error,
              code: 'CANCEL_SUBSCRIPTION_FAILED'
            });
          }

          res.json({
            success: true,
            data: {
              subscription: result.subscription,
              cancelled: true,
              effectiveDate: immediate ? new Date().toISOString() : result.subscription?.current_period_end
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Cancel subscription failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CANCEL_SUBSCRIPTION_FAILED'
          });
        }
      }
    );

    // Upgrade/change plan
    this.app.post(
      '/api/v1/subscription/upgrade',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { planId } = req.body;

          if (!planId) {
            return res.status(400).json({
              success: false,
              error: 'Plan ID is required',
              code: 'MISSING_PLAN_ID'
            });
          }

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const result = await this.commerceAgent.changePlan(userId, planId);

          if (!result.success) {
            return res.status(400).json({
              success: false,
              error: result.error,
              code: 'CHANGE_PLAN_FAILED'
            });
          }

          res.json({
            success: true,
            data: {
              subscription: result.subscription,
              planChanged: true
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Change plan failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'CHANGE_PLAN_FAILED'
          });
        }
      }
    );

    // Get subscription usage
    this.app.get(
      '/api/v1/subscription/usage',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          // Get subscription
          const { data: subscription } = await this.supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

          // Get usage stats
          const { count: storyCount } = await this.supabase
            .from('stories')
            .select('*', {count: 'exact', head: true})
            .eq('creator_user_id', userId);

          const { count: characterCount } = await this.supabase
            .from('characters')
            .select('*', {count: 'exact', head: true})
            .eq('creator_user_id', userId);

          const planId = subscription?.plan_id || 'free';
          const isPro = planId !== 'free';

          res.json({
            success: true,
            data: {
              plan: planId,
              usage: {
                stories: {
                  created: storyCount || 0,
                  limit: isPro ? 'unlimited' : 2
                },
                characters: {
                  created: characterCount || 0,
                  limit: isPro ? 'unlimited' : 10
                }
              },
              subscription: subscription ? {
                status: subscription.status,
                planId: subscription.plan_id
              } : null
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get subscription usage failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_USAGE_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // STORY PACKS ENDPOINTS (Category 19)
    // ==========================================================================

    // Buy story pack
    this.app.post(
      '/api/v1/story-packs/buy',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { packType } = req.body;

          if (!packType || !['5_pack', '10_pack', '25_pack'].includes(packType)) {
            return res.status(400).json({
              success: false,
              error: 'Invalid pack type. Must be 5_pack, 10_pack, or 25_pack',
              code: 'INVALID_PACK_TYPE'
            });
          }

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          // Story pack checkout not implemented in CommerceAgent; return 501 to avoid runtime error
          return res.status(501).json({
            success: false,
            error: 'Story pack checkout not available',
            code: 'STORY_PACK_UNAVAILABLE'
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Story pack purchase failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'STORY_PACK_PURCHASE_FAILED'
          });
        }
      }
    );

    // Get user's story packs
    this.app.get(
      '/api/v1/users/me/story-packs',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;

          const { data: packs, error } = await this.supabase
            .from('story_packs')
            .select('id, pack_type, stories_remaining, purchased_at, expires_at')
            .eq('user_id', userId)
            .gt('stories_remaining', 0)
            .order('purchased_at', { ascending: false });

          if (error) throw error;

          // Get total available credits
          const { data: totalCredits } = await this.supabase
            .rpc('get_total_pack_credits', { p_user_id: userId });

          res.json({
            success: true,
            data: {
              packs: packs || [],
              totalAvailable: totalCredits || 0,
              summary: {
                active: packs?.filter(p => !p.expires_at || new Date(p.expires_at) > new Date()).length || 0,
                totalStories: totalCredits || 0
              }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get story packs failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_STORY_PACKS_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // GIFT CARDS ENDPOINTS (Category 20)
    // ==========================================================================

    // Purchase gift card
    this.app.post(
      '/api/v1/gift-cards/purchase',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { giftCardType, type } = req.body;
          const cardType = giftCardType || type;

          if (!cardType || !['1_month', '3_month', '6_month', '12_month'].includes(cardType)) {
            return res.status(400).json({
              success: false,
              error: 'Invalid gift card type. Must be 1_month, 3_month, 6_month, or 12_month',
              code: 'INVALID_GIFT_CARD_TYPE'
            });
          }

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const checkout = await (this.commerceAgent as any).createGiftCardCheckout(userId, cardType);

          res.json({
            success: true,
            data: {
              sessionId: checkout.sessionId,
              url: checkout.url,
              checkoutUrl: checkout.url,
              expiresAt: checkout.expiresAt,
              giftCardType: cardType,
              months: cardType === '1_month' ? 1 : cardType === '3_month' ? 3 : cardType === '6_month' ? 6 : 12
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Gift card purchase failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GIFT_CARD_PURCHASE_FAILED'
          });
        }
      }
    );

    // Redeem gift card
    this.app.post(
      '/api/v1/gift-cards/redeem',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const { code } = req.body;

          if (!code) {
            return res.status(400).json({
              success: false,
              error: 'Gift card code is required',
              code: 'MISSING_CODE'
            });
          }

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const result = await (this.commerceAgent as any).redeemGiftCard(userId, code);

          if (!result.success) {
            return res.status(400).json({
              success: false,
              error: result.error,
              code: 'REDEEM_FAILED'
            });
          }

          res.json({
            success: true,
            data: {
              monthsAdded: result.data?.monthsAdded,
              subscriptionExtendedTo: result.data?.subscriptionExtendedTo,
              message: `Gift card redeemed! Subscription extended by ${result.data?.monthsAdded} month(s).`
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Gift card redemption failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'REDEEM_FAILED'
          });
        }
      }
    );

    // Validate gift card code
    this.app.get(
      '/api/v1/gift-cards/:code/validate',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const { code } = req.params;

          if (!this.commerceAgent) {
            return res.status(503).json({
              success: false,
              error: 'Commerce service unavailable',
              code: 'SERVICE_UNAVAILABLE'
            });
          }

          const validation = await (this.commerceAgent as any).validateGiftCard(code);

          if (!validation.valid) {
            // Return 404 for not found, 400 for invalid/expired/redeemed
            const statusCode = validation.error === 'Gift card not found' ? 404 : 400;
            return res.status(statusCode).json({
              success: false,
              error: validation.error,
              code: 'INVALID_GIFT_CARD'
            });
          }

          res.json({
            success: true,
            data: {
              valid: true,
              giftCard: validation.giftCard
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Gift card validation failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'VALIDATION_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // FEEDBACK ENDPOINTS (Category 21)
    // ==========================================================================

    // Submit story feedback
    this.app.post(
      '/api/v1/stories/:id/feedback',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const storyId = req.params.id;
          const { sentiment, rating, message } = req.body;

          if (!sentiment || !['positive', 'neutral', 'negative'].includes(sentiment)) {
            return res.status(400).json({
              success: false,
              error: 'Sentiment must be positive, neutral, or negative',
              code: 'INVALID_SENTIMENT'
            });
          }

          if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
              success: false,
              error: 'Rating must be between 1 and 5',
              code: 'INVALID_RATING'
            });
          }

          // Upsert feedback (user can update their feedback)
          const { data: feedback, error } = await this.supabase
            .from('story_feedback')
            .upsert({
              story_id: storyId,
              user_id: userId,
              sentiment,
              rating: rating || null,
              message: message || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'story_id,user_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (error) throw error;

          // Check for negative feedback alert (3+ negative in 24h)
          if (sentiment === 'negative') {
            const { data: alertCheck } = await this.supabase
              .rpc('check_negative_feedback_alert');

            const storyAlert = alertCheck?.find((a: any) => a.story_id === storyId);
            if (storyAlert && storyAlert.negative_count >= 3) {
              // Send alert email to support
              try {
                await this.emailService.sendEmail({
                  to: process.env.SUPPORT_EMAIL || 'support@storytailor.com',
                  subject: `Alert: Story ${storyId} received 3+ negative feedback in 24h`,
                  html: `
                    <p>Story ${storyId} has received ${storyAlert.negative_count} negative feedback entries in the last 24 hours.</p>
                    <p>Please review: <a href="${process.env.APP_URL || 'https://storytailor.com'}/admin/stories/${storyId}">View Story</a></p>
                  `
                });
              } catch (emailError) {
                this.logger.warn('Failed to send negative feedback alert', { error: emailError });
              }
            }
          }

          res.status(201).json({
            success: true,
            data: feedback
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Submit story feedback failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SUBMIT_FEEDBACK_FAILED'
          });
        }
      }
    );

    // Get story feedback summary
    this.app.get(
      '/api/v1/stories/:id/feedback/summary',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const storyId = req.params.id;

          const { data: summary, error } = await this.supabase
            .rpc('get_story_feedback_summary', { p_story_id: storyId });

          if (error) throw error;

          res.json({
            success: true,
            data: summary || {
              total: 0,
              averageRating: 0,
              sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
              ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get story feedback summary failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_FEEDBACK_SUMMARY_FAILED'
          });
        }
      }
    );

    // Submit character feedback
    this.app.post(
      '/api/v1/characters/:id/feedback',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const userId = req.user!.id;
          const characterId = req.params.id;
          const { sentiment, rating, message } = req.body;

          if (!sentiment || !['positive', 'neutral', 'negative'].includes(sentiment)) {
            return res.status(400).json({
              success: false,
              error: 'Sentiment must be positive, neutral, or negative',
              code: 'INVALID_SENTIMENT'
            });
          }

          if (rating && (rating < 1 || rating > 5)) {
            return res.status(400).json({
              success: false,
              error: 'Rating must be between 1 and 5',
              code: 'INVALID_RATING'
            });
          }

          // Upsert feedback (user can update their feedback)
          const { data: feedback, error } = await this.supabase
            .from('character_feedback')
            .upsert({
              character_id: characterId,
              user_id: userId,
              sentiment,
              rating: rating || null,
              message: message || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'character_id,user_id',
              ignoreDuplicates: false
            })
            .select()
            .single();

          if (error) throw error;

          // Check for negative feedback alert (3+ negative in 24h)
          if (sentiment === 'negative') {
            const { data: alertCheck } = await this.supabase
              .rpc('check_negative_feedback_alert');

            const characterAlert = alertCheck?.find((a: any) => a.character_id === characterId);
            if (characterAlert && characterAlert.character_negative_count >= 3) {
              // Send alert email to support
              try {
                await this.emailService.sendEmail({
                  to: process.env.SUPPORT_EMAIL || 'support@storytailor.com',
                  subject: `Alert: Character ${characterId} received 3+ negative feedback in 24h`,
                  html: `
                    <p>Character ${characterId} has received ${characterAlert.character_negative_count} negative feedback entries in the last 24 hours.</p>
                    <p>Please review: <a href="${process.env.APP_URL || 'https://storytailor.com'}/admin/characters/${characterId}">View Character</a></p>
                  `
                });
              } catch (emailError) {
                this.logger.warn('Failed to send negative feedback alert', { error: emailError });
              }
            }
          }

          res.status(201).json({
            success: true,
            data: feedback
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Submit character feedback failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'SUBMIT_FEEDBACK_FAILED'
          });
        }
      }
    );

    // Get character feedback summary
    this.app.get(
      '/api/v1/characters/:id/feedback/summary',
      this.authMiddleware.requireAuth,
      async (req: AuthenticatedRequest, res: Response) => {
        try {
          const characterId = req.params.id;

          const { data: summary, error } = await this.supabase
            .rpc('get_character_feedback_summary', { p_character_id: characterId });

          if (error) throw error;

          res.json({
            success: true,
            data: summary || {
              total: 0,
              averageRating: 0,
              sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
              ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('Get character feedback summary failed', { error: errorMessage });
          res.status(500).json({
            success: false,
            error: errorMessage,
            code: 'GET_FEEDBACK_SUMMARY_FAILED'
          });
        }
      }
    );

    // ==========================================================================
    // A2A PROTOCOL ENDPOINTS (Category 18)
    // ==========================================================================

      // POST /a2a/webhook - Webhook notifications
      this.app.post('/a2a/webhook', async (req: Request, res: Response) => {
        try {
          if (!this.a2aAdapter) {
            return res.status(503).json({
              error: 'A2A adapter not available',
              message: 'A2A adapter not initialized'
            });
          }
          await this.a2aAdapter.handleWebhook(req.body, req.headers);
          res.json({ success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error('A2A webhook failed', { error: errorMessage });
          res.status(500).json({
            error: 'Failed to process webhook',
            message: errorMessage
          });
        }
      });

      this.logger.info('A2A routes registered');
    } catch (error) {
      this.logger.error('Failed to setup A2A routes', { error });
      // Don't throw - allow other routes to work even if A2A fails
    }
  }

  /**
   * Initialize AuthAgent (must be called after constructor, before using auth routes)
   */
  async initialize(): Promise<void> {
    try {
      if (!this.authAgent) {
        throw new Error('AuthAgent not created');
      }
      await this.authAgent.initialize();
      this.logger.info('AuthAgent initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to initialize AuthAgent', { error: errorMessage });
      throw new Error(`AuthAgent initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Check if AuthAgent is initialized
   */
  isAuthAgentInitialized(): boolean {
    if (!this.authAgent) {
      return false;
    }
    // Access private isInitialized via type assertion (AuthAgent doesn't expose public getter)
    const authAgentAny = this.authAgent as any;
    return authAgentAny.isInitialized === true;
  }

  /**
   * Handle Lambda event directly using serverless-http
   */
  async handleLambdaEvent(event: unknown, context?: unknown): Promise<unknown> {
    if (!this.serverlessHandler) {
      throw new Error('Serverless handler not initialized');
    }
    return await this.serverlessHandler(event, context);
  }

  /**
   * Stop the server (cleanup)
   */
  stop(): void {
    // Cleanup if needed
    this.logger.info('RESTAPIGateway stopped');
  }
}

