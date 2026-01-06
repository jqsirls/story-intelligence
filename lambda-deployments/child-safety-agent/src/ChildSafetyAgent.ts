import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { createLogger, Logger, format, transports } from 'winston';
import {
  ChildSafetyConfig,
  DisclosureDetectionRequest,
  DisclosureDetectionResult,
  DistressDetectionRequest,
  DistressDetectionResult,
  CrisisInterventionRequest,
  CrisisInterventionResult,
  CrisisType,
  CommunicationAdaptationRequest,
  CommunicationAdaptationResult,
  InappropriateContentRequest,
  InappropriateContentResult,
  SafetyIncident,
  ParentNotification,
  MandatoryReportingRecord,
  DisclosureType,
  DisclosureDetectionRequestSchema,
  DistressDetectionRequestSchema,
  CommunicationAdaptationRequestSchema,
  InappropriateContentRequestSchema
} from './types';
import { DisclosureDetectionService } from './services/DisclosureDetectionService';
import { DistressDetectionService } from './services/DistressDetectionService';
import { CrisisInterventionService } from './services/CrisisInterventionService';
import { CommunicationAdaptationService } from './services/CommunicationAdaptationService';
import { InappropriateContentHandler } from './services/InappropriateContentHandler';
import { SafetyMonitoringService } from './services/SafetyMonitoringService';
import { ParentNotificationService } from './services/ParentNotificationService';
import { MandatoryReportingService } from './services/MandatoryReportingService';

export class ChildSafetyAgent {
  private openai!: OpenAI;
  private supabase!: SupabaseClient;
  private redis!: RedisClientType;
  private logger!: Logger;
  private config: ChildSafetyConfig;

  // Services
  private disclosureDetection!: DisclosureDetectionService;
  private distressDetection!: DistressDetectionService;
  private crisisIntervention!: CrisisInterventionService;
  private communicationAdaptation!: CommunicationAdaptationService;
  private inappropriateContentHandler!: InappropriateContentHandler;
  private safetyMonitoring!: SafetyMonitoringService;
  private parentNotification!: ParentNotificationService;
  private mandatoryReporting!: MandatoryReportingService;

  constructor(config: ChildSafetyConfig) {
    this.config = config;
    this.initializeLogger();
    this.initializeClients();
    this.initializeServices();
  }

  private initializeLogger(): void {
    this.logger = createLogger({
      level: this.config.logLevel,
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.Console()
      ]
    });
  }

  private initializeClients(): void {
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });

    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseKey
    );

    this.redis = createRedisClient({
      url: this.config.redisUrl
    });
  }

  private initializeServices(): void {
    this.disclosureDetection = new DisclosureDetectionService(this.openai, this.logger);
    this.distressDetection = new DistressDetectionService(this.openai, this.logger);
    this.crisisIntervention = new CrisisInterventionService(
      this.config.emergencyContactWebhook,
      this.config.crisisHotlineNumbers,
      this.logger
    );
    this.communicationAdaptation = new CommunicationAdaptationService(this.openai, this.logger);
    this.inappropriateContentHandler = new InappropriateContentHandler(this.openai, this.logger);
    this.safetyMonitoring = new SafetyMonitoringService(this.supabase, this.redis, this.logger);
    this.parentNotification = new ParentNotificationService(
      this.config.parentNotificationEmail,
      this.logger
    );
    this.mandatoryReporting = new MandatoryReportingService(
      this.config.mandatoryReportingWebhook,
      this.supabase,
      this.logger
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      await this.disclosureDetection.initialize();
      await this.distressDetection.initialize();
      await this.crisisIntervention.initialize();
      await this.communicationAdaptation.initialize();
      await this.inappropriateContentHandler.initialize();
      await this.safetyMonitoring.initialize();
      await this.parentNotification.initialize();
      await this.mandatoryReporting.initialize();
      
      this.logger.info('ChildSafetyAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ChildSafetyAgent', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('ChildSafetyAgent shutdown successfully');
    } catch (error) {
      this.logger.error('Error during ChildSafetyAgent shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Detect concerning disclosures in user input
   */
  async detectDisclosure(request: DisclosureDetectionRequest): Promise<DisclosureDetectionResult> {
    try {
      // Validate request
      const validatedRequest = DisclosureDetectionRequestSchema.parse(request);
      
      this.logger.info('Processing disclosure detection request', {
        userId: validatedRequest.userId,
        sessionId: validatedRequest.sessionId,
        inputLength: validatedRequest.userInput.length
      });

      // Detect disclosure
      const result = await this.disclosureDetection.detectDisclosure(validatedRequest);

      // Log safety incident if disclosure detected
      if (result.hasDisclosure) {
        await this.logSafetyIncident({
          id: `disclosure_${Date.now()}_${validatedRequest.userId}`,
          userId: validatedRequest.userId,
          sessionId: validatedRequest.sessionId,
          incidentType: result.disclosureType,
          severity: result.severity,
          description: `Disclosure detected: ${result.disclosureType}`,
          context: validatedRequest.userInput,
          actionsTaken: ['disclosure_detection_triggered'],
          reportingRequired: result.requiresMandatoryReporting,
          reportingCompleted: false,
          followUpRequired: result.escalationRequired,
          timestamp: new Date().toISOString()
        });

        // Trigger mandatory reporting if required
        if (result.requiresMandatoryReporting) {
          await this.triggerMandatoryReporting(validatedRequest.userId, result);
        }

        // Send parent notification for high severity cases
        if (result.severity === 'high' || result.severity === 'critical') {
          await this.sendParentNotification(validatedRequest.userId, 'safety_concern', result.severity, {
            message: 'A safety concern has been detected during your child\'s interaction.',
            actionsTaken: ['Professional assessment initiated', 'Appropriate response provided'],
            recommendedActions: ['Monitor child\'s wellbeing', 'Consider professional consultation']
          });
        }
      }

      this.logger.info('Disclosure detection completed', {
        userId: validatedRequest.userId,
        hasDisclosure: result.hasDisclosure,
        severity: result.severity,
        requiresReporting: result.requiresMandatoryReporting
      });

      return result;

    } catch (error) {
      this.logger.error('Error in disclosure detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Detect distress patterns in user behavior
   */
  async detectDistress(request: DistressDetectionRequest): Promise<DistressDetectionResult> {
    try {
      // Validate request
      const validatedRequest = DistressDetectionRequestSchema.parse(request);
      
      this.logger.info('Processing distress detection request', {
        userId: validatedRequest.userId,
        sessionId: validatedRequest.sessionId,
        hasVoiceData: !!validatedRequest.voicePatterns
      });

      // Detect distress
      const result = await this.distressDetection.detectDistress(validatedRequest);

      // Log and handle distress if detected
      if (result.isInDistress && result.distressLevel !== 'none') {
        await this.logSafetyIncident({
          id: `distress_${Date.now()}_${validatedRequest.userId}`,
          userId: validatedRequest.userId,
          sessionId: validatedRequest.sessionId,
          incidentType: DisclosureType.MENTAL_HEALTH_CRISIS,
          severity: result.distressLevel === 'critical' || result.distressLevel === 'severe' ? 'critical' : 'medium',
          description: `Distress detected: ${result.distressLevel}`,
          context: JSON.stringify(result.distressIndicators),
          actionsTaken: ['distress_detection_triggered', 'supportive_response_provided'],
          reportingRequired: result.requiresImmediateAttention,
          reportingCompleted: false,
          followUpRequired: true,
          timestamp: new Date().toISOString()
        });

        // Trigger crisis intervention for severe cases
        if (result.requiresImmediateAttention) {
          await this.triggerCrisisIntervention({
            userId: validatedRequest.userId,
            sessionId: validatedRequest.sessionId,
            userAge: validatedRequest.userAge,
            crisisType: CrisisType.MENTAL_HEALTH_EMERGENCY,
            severity: result.distressLevel === 'critical' ? 'critical' : 'high',
            context: `Distress detected with level: ${result.distressLevel}`
          });
        }

        // Send parent notification for moderate to severe distress
        if (['moderate', 'severe', 'critical'].includes(result.distressLevel)) {
          await this.sendParentNotification(validatedRequest.userId, 'distress_detected', 
            result.distressLevel === 'critical' ? 'critical' : 'medium', {
            message: `Signs of distress have been detected during your child's interaction (Level: ${result.distressLevel}).`,
            actionsTaken: ['Supportive response provided', 'Monitoring increased'],
            recommendedActions: ['Check in with your child', 'Consider professional support if needed']
          });
        }
      }

      this.logger.info('Distress detection completed', {
        userId: validatedRequest.userId,
        isInDistress: result.isInDistress,
        distressLevel: result.distressLevel,
        requiresAttention: result.requiresImmediateAttention
      });

      return result;

    } catch (error) {
      this.logger.error('Error in distress detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Trigger crisis intervention protocols
   */
  async triggerCrisisIntervention(request: CrisisInterventionRequest): Promise<CrisisInterventionResult> {
    try {
      this.logger.warn('Crisis intervention triggered', {
        userId: request.userId,
        crisisType: request.crisisType,
        severity: request.severity
      });

      // Execute crisis intervention
      const result = await this.crisisIntervention.handleCrisis(request);

      // Log the crisis incident
      await this.logSafetyIncident({
        id: `crisis_${Date.now()}_${request.userId}`,
        userId: request.userId,
        sessionId: request.sessionId,
        incidentType: request.crisisType,
        severity: request.severity,
        description: `Crisis intervention triggered: ${request.crisisType}`,
        context: request.context,
        actionsTaken: [`crisis_intervention_${result.interventionType}`, 'resources_provided'],
        reportingRequired: result.reportingCompleted,
        reportingCompleted: result.reportingCompleted,
        followUpRequired: result.followUpRequired,
        timestamp: new Date().toISOString()
      });

      // Always notify parents for crisis situations
      await this.sendParentNotification(request.userId, 'crisis_intervention', request.severity, {
        message: `A crisis intervention has been triggered for your child (Type: ${request.crisisType}).`,
        actionsTaken: [`${result.interventionType} activated`, 'Crisis resources provided'],
        recommendedActions: ['Contact your child immediately', 'Seek professional help', 'Contact emergency services if needed']
      });

      this.logger.warn('Crisis intervention completed', {
        userId: request.userId,
        interventionType: result.interventionType,
        escalationLevel: result.escalationLevel
      });

      return result;

    } catch (error) {
      this.logger.error('Error in crisis intervention', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        crisisType: request.crisisType
      });
      throw error;
    }
  }

  /**
   * Adapt communication for special needs
   */
  async adaptCommunication(request: CommunicationAdaptationRequest): Promise<CommunicationAdaptationResult> {
    try {
      // Validate request
      const validatedRequest = CommunicationAdaptationRequestSchema.parse(request);
      
      this.logger.debug('Processing communication adaptation request', {
        userId: validatedRequest.userId,
        hasSpecialNeeds: !!validatedRequest.specialNeeds?.length,
        vocabularyLevel: validatedRequest.communicationProfile.vocabularyLevel
      });

      // Adapt communication
      const result = await this.communicationAdaptation.adaptMessage(validatedRequest);

      this.logger.debug('Communication adaptation completed', {
        userId: validatedRequest.userId,
        adaptationsMade: result.adaptationsMade.length,
        estimatedProcessingTime: result.estimatedProcessingTime
      });

      return result;

    } catch (error) {
      this.logger.error('Error in communication adaptation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Handle inappropriate content requests
   */
  async handleInappropriateContent(request: InappropriateContentRequest): Promise<InappropriateContentResult> {
    try {
      // Validate request
      const validatedRequest = InappropriateContentRequestSchema.parse(request);
      
      this.logger.info('Processing inappropriate content request', {
        userId: validatedRequest.userId,
        sessionId: validatedRequest.sessionId,
        previousRequests: validatedRequest.previousInappropriateRequests
      });

      // Handle inappropriate content
      const result = await this.inappropriateContentHandler.handleInappropriateContent(validatedRequest);

      // Log incident if inappropriate content detected
      if (result.isInappropriate) {
        await this.logSafetyIncident({
          id: `inappropriate_${Date.now()}_${validatedRequest.userId}`,
          userId: validatedRequest.userId,
          sessionId: validatedRequest.sessionId,
          incidentType: result.inappropriateCategories[0], // Use first category as primary
          severity: result.severity === 'extreme' ? 'critical' : result.severity === 'severe' ? 'high' : 'medium',
          description: `Inappropriate content detected: ${result.inappropriateCategories.join(', ')}`,
          context: validatedRequest.userInput,
          actionsTaken: ['content_redirected', 'educational_response_provided'],
          reportingRequired: result.escalationRequired,
          reportingCompleted: false,
          followUpRequired: result.patternConcern,
          timestamp: new Date().toISOString()
        });

        // Send parent notification for severe cases or pattern concerns
        if (result.severity === 'severe' || result.severity === 'extreme' || result.patternConcern) {
          await this.sendParentNotification(validatedRequest.userId, 'inappropriate_content', 
            result.severity === 'extreme' ? 'critical' : 'medium', {
            message: `Your child has made inappropriate content requests (Categories: ${result.inappropriateCategories.join(', ')}).`,
            actionsTaken: ['Content redirected appropriately', 'Educational guidance provided'],
            recommendedActions: ['Discuss appropriate content with your child', 'Monitor online activities']
          });
        }
      }

      this.logger.info('Inappropriate content handling completed', {
        userId: validatedRequest.userId,
        isInappropriate: result.isInappropriate,
        severity: result.severity,
        patternConcern: result.patternConcern
      });

      return result;

    } catch (error) {
      this.logger.error('Error in inappropriate content handling', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      throw error;
    }
  }

  /**
   * Get safety incidents for a user
   */
  async getSafetyIncidents(userId: string, limit: number = 50): Promise<SafetyIncident[]> {
    try {
      return await this.safetyMonitoring.getSafetyIncidents(userId, limit);
    } catch (error) {
      this.logger.error('Error retrieving safety incidents', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get safety metrics for monitoring
   */
  async getSafetyMetrics(timeRange: { start: string; end: string }): Promise<{
    totalIncidents: number;
    incidentsByType: Record<string, number>;
    incidentsBySeverity: Record<string, number>;
    mandatoryReports: number;
    crisisInterventions: number;
    parentNotifications: number;
  }> {
    try {
      return await this.safetyMonitoring.getSafetyMetrics(timeRange);
    } catch (error) {
      this.logger.error('Error retrieving safety metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timeRange
      });
      throw error;
    }
  }

  /**
   * Health check for the child safety agent
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      openai: boolean;
      supabase: boolean;
      redis: boolean;
      disclosureDetection: boolean;
      distressDetection: boolean;
      crisisIntervention: boolean;
      communicationAdaptation: boolean;
      inappropriateContentHandler: boolean;
      safetyMonitoring: boolean;
      parentNotification: boolean;
      mandatoryReporting: boolean;
    };
    timestamp: string;
  }> {
    const services = {
      openai: false,
      supabase: false,
      redis: false,
      disclosureDetection: false,
      distressDetection: false,
      crisisIntervention: false,
      communicationAdaptation: false,
      inappropriateContentHandler: false,
      safetyMonitoring: false,
      parentNotification: false,
      mandatoryReporting: false
    };

    try {
      // Test OpenAI connection
      await this.openai.models.list();
      services.openai = true;
    } catch (error) {
      this.logger.warn('OpenAI health check failed', { error });
    }

    try {
      // Test Supabase connection
      const { error } = await this.supabase.from('safety_incidents').select('id').limit(1);
      services.supabase = !error;
    } catch (error) {
      this.logger.warn('Supabase health check failed', { error });
    }

    try {
      // Test Redis connection
      await this.redis.ping();
      services.redis = true;
    } catch (error) {
      this.logger.warn('Redis health check failed', { error });
    }

    // Test individual services
    services.disclosureDetection = await this.disclosureDetection.healthCheck();
    services.distressDetection = await this.distressDetection.healthCheck();
    services.crisisIntervention = await this.crisisIntervention.healthCheck();
    services.communicationAdaptation = await this.communicationAdaptation.healthCheck();
    services.inappropriateContentHandler = await this.inappropriateContentHandler.healthCheck();
    services.safetyMonitoring = await this.safetyMonitoring.healthCheck();
    services.parentNotification = await this.parentNotification.healthCheck();
    services.mandatoryReporting = await this.mandatoryReporting.healthCheck();

    const allHealthy = Object.values(services).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
  }

  // Private helper methods

  private async logSafetyIncident(incident: SafetyIncident): Promise<void> {
    try {
      await this.safetyMonitoring.logSafetyIncident(incident);
    } catch (error) {
      this.logger.error('Failed to log safety incident', {
        error: error instanceof Error ? error.message : 'Unknown error',
        incidentId: incident.id
      });
    }
  }

  private async sendParentNotification(
    userId: string, 
    type: ParentNotification['notificationType'], 
    severity: ParentNotification['severity'],
    details: { message: string; actionsTaken: string[]; recommendedActions: string[] }
  ): Promise<void> {
    try {
      await this.parentNotification.sendNotification({
        userId,
        parentEmail: '', // Will be retrieved by the service
        notificationType: type,
        severity,
        message: details.message,
        actionsTaken: details.actionsTaken,
        recommendedActions: details.recommendedActions,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to send parent notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type,
        severity
      });
    }
  }

  private async triggerMandatoryReporting(userId: string, disclosureResult: DisclosureDetectionResult): Promise<void> {
    try {
      await this.mandatoryReporting.submitReport({
        id: `report_${Date.now()}_${userId}`,
        userId,
        reportType: disclosureResult.disclosureType,
        severity: disclosureResult.severity === 'critical' ? 'critical' : 'high',
        evidence: disclosureResult.detectedConcerns.map(c => c.indicators.join('; ')),
        reportingAgency: 'Child Protective Services', // This would be configurable
        reportedAt: new Date().toISOString(),
        followUpRequired: true,
        status: 'pending'
      });
    } catch (error) {
      this.logger.error('Failed to trigger mandatory reporting', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        disclosureType: disclosureResult.disclosureType
      });
    }
  }
}