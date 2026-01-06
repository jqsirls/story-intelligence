import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  AccessibilityProfileSchema,
  CommunicationAdaptation,
  EngagementCheck,
  AssistiveTechnology,
  VocabularyAdaptation,
  MultiModalInput,
  ResponseAdaptation,
  ProfileNotFoundError,
  AdaptationError,
  AssistiveTechnologyError,
} from './types';
import { AdaptiveCommunicationEngine } from './services/AdaptiveCommunicationEngine';
import { VocabularyAdapter } from './services/VocabularyAdapter';
import { EngagementManager } from './services/EngagementManager';
import { AssistiveTechnologyIntegrator } from './services/AssistiveTechnologyIntegrator';
import { MultiModalInputProcessor } from './services/MultiModalInputProcessor';
import { InclusiveDesignEngine } from './services/InclusiveDesignEngine';

export interface AccessibilityAgentConfig {
  supabaseUrl: string;
  supabaseKey: string;
  enableLogging?: boolean;
  defaultTimeout?: number;
}

export class AccessibilityAgent {
  private supabase: SupabaseClient;
  private communicationEngine: AdaptiveCommunicationEngine;
  private vocabularyAdapter: VocabularyAdapter;
  private engagementManager: EngagementManager;
  private assistiveTechIntegrator: AssistiveTechnologyIntegrator;
  private multiModalProcessor: MultiModalInputProcessor;
  private inclusiveDesignEngine: InclusiveDesignEngine;
  private config: AccessibilityAgentConfig;

  constructor(config: AccessibilityAgentConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Initialize service components
    this.communicationEngine = new AdaptiveCommunicationEngine(this.supabase);
    this.vocabularyAdapter = new VocabularyAdapter(this.supabase);
    this.engagementManager = new EngagementManager(this.supabase);
    this.assistiveTechIntegrator = new AssistiveTechnologyIntegrator(this.supabase);
    this.multiModalProcessor = new MultiModalInputProcessor(this.supabase);
    this.inclusiveDesignEngine = new InclusiveDesignEngine(this.supabase);
  }

  // Profile Management
  async createAccessibilityProfile(
    userId: string,
    profileData: Partial<AccessibilityProfile>
  ): Promise<AccessibilityProfile> {
    try {
      const profile = AccessibilityProfileSchema.parse({
        id: crypto.randomUUID(),
        userId,
        profileName: profileData.profileName || 'Default Profile',
        ...profileData,
      });

      const { data, error } = await this.supabase
        .from('accessibility_profiles')
        .insert(profile)
        .select()
        .single();

      if (error) throw error;

      if (this.config.enableLogging) {
        console.log(`Created accessibility profile for user ${userId}`);
      }

      return data;
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to create accessibility profile: ${message}`, { userId, error });
    }
  }

  async getAccessibilityProfile(userId: string): Promise<AccessibilityProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_profiles')
        .select('*')
        .eq('userId', userId)
        .eq('isActive', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      
      return data ? AccessibilityProfileSchema.parse(data) : null;
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to get accessibility profile: ${message}`, { userId, error });
    }
  }

  async updateAccessibilityProfile(
    userId: string,
    updates: Partial<AccessibilityProfile>
  ): Promise<AccessibilityProfile> {
    try {
      const { data, error } = await this.supabase
        .from('accessibility_profiles')
        .update({ ...updates, updatedAt: new Date() })
        .eq('userId', userId)
        .eq('isActive', true)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new ProfileNotFoundError(userId);

      return AccessibilityProfileSchema.parse(data);
    } catch (error: unknown) {
      if (error instanceof ProfileNotFoundError) throw error;
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to update accessibility profile: ${message}`, { userId, error });
    }
  }

  // Adaptive Communication
  async adaptResponse(
    userId: string,
    originalResponse: string,
    context?: any
  ): Promise<string> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return originalResponse; // No adaptation needed if no profile exists
      }

      return await this.communicationEngine.adaptResponse(originalResponse, profile, context);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to adapt response for user ${userId}:`, error);
      }
      return originalResponse; // Fallback to original response
    }
  }

  async processWithSpeechDelay(
    userId: string,
    input: string,
    sessionId: string
  ): Promise<{ processedInput: string; delayApplied: number }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return { processedInput: input, delayApplied: 0 };
      }

      return await this.communicationEngine.processSpeechDelay(input, profile, sessionId);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process speech delay: ${message}`, { userId, error });
    }
  }

  // Vocabulary Adaptation
  async adaptVocabulary(
    userId: string,
    text: string,
    context?: string
  ): Promise<string> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return text;
      }

      return await this.vocabularyAdapter.adaptText(text, profile, context);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to adapt vocabulary for user ${userId}:`, error);
      }
      return text; // Fallback to original text
    }
  }

  async learnVocabularyPreference(
    userId: string,
    originalWord: string,
    preferredWord: string,
    context: string
  ): Promise<void> {
    try {
      await this.vocabularyAdapter.learnPreference(userId, originalWord, preferredWord, context);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to learn vocabulary preference: ${message}`, { userId, error });
    }
  }

  // Engagement Management
  async checkEngagement(
    userId: string,
    sessionId: string,
    checkType: 'attention' | 'comprehension' | 'interest' | 'fatigue'
  ): Promise<EngagementCheck> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        throw new ProfileNotFoundError(userId);
      }

      return await this.engagementManager.performEngagementCheck(userId, sessionId, checkType, profile);
    } catch (error: unknown) {
      if (error instanceof ProfileNotFoundError) throw error;
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to check engagement: ${message}`, { userId, error });
    }
  }

  async shouldTakeBreak(userId: string, sessionId: string): Promise<boolean> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return false;
      }

      return await this.engagementManager.shouldTakeBreak(userId, sessionId, profile);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to check break requirement for user ${userId}:`, error);
      }
      return false;
    }
  }

  async recordEngagementMetrics(
    userId: string,
    sessionId: string,
    metrics: {
      responseTime: number;
      interactionCount: number;
      errorCount: number;
      completionRate: number;
    }
  ): Promise<void> {
    try {
      await this.engagementManager.recordMetrics(userId, sessionId, metrics);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to record engagement metrics: ${message}`, { userId, error });
    }
  }

  // Assistive Technology Integration
  async registerAssistiveTechnology(
    userId: string,
    technology: Omit<AssistiveTechnology, 'userId' | 'createdAt'>
  ): Promise<AssistiveTechnology> {
    try {
      return await this.assistiveTechIntegrator.registerTechnology(userId, technology);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AssistiveTechnologyError(`Failed to register assistive technology: ${message}`, { userId, error });
    }
  }

  async getAssistiveTechnologies(userId: string): Promise<AssistiveTechnology[]> {
    try {
      return await this.assistiveTechIntegrator.getTechnologies(userId);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AssistiveTechnologyError(`Failed to get assistive technologies: ${message}`, { userId, error });
    }
  }

  async testAssistiveTechnology(
    userId: string,
    technologyId: string
  ): Promise<{ success: boolean; details: string }> {
    try {
      return await this.assistiveTechIntegrator.testTechnology(userId, technologyId);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AssistiveTechnologyError(`Failed to test assistive technology: ${message}`, { userId, error });
    }
  }

  // Multi-modal Input Processing
  async processMultiModalInput(
    userId: string,
    sessionId: string,
    inputData: {
      type: 'voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking' | 'combined';
      data: any;
      timestamp?: Date;
    }
  ): Promise<{ processedInput: string; confidence: number; processingTime: number }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        throw new ProfileNotFoundError(userId);
      }

      return await this.multiModalProcessor.processInput(userId, sessionId, inputData, profile);
    } catch (error: unknown) {
      if (error instanceof ProfileNotFoundError) throw error;
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process multi-modal input: ${message}`, { userId, error });
    }
  }

  // Timeout and Pacing Management
  async getAdaptedTimeout(userId: string, defaultTimeout: number): Promise<number> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return defaultTimeout;
      }

      if (profile.extendedTimeouts) {
        return Math.max(profile.customTimeoutDuration, defaultTimeout * 1.5);
      }

      return defaultTimeout;
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to get adapted timeout for user ${userId}:`, error);
      }
      return defaultTimeout;
    }
  }

  async getVoicePaceMultiplier(userId: string): Promise<number> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      return profile?.voicePaceAdjustment || 1.0;
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to get voice pace multiplier for user ${userId}:`, error);
      }
      return 1.0;
    }
  }

  // Inclusive Design Features
  async adjustVoicePaceForProcessingDifferences(
    userId: string,
    originalText: string
  ): Promise<{
    adjustedText: string;
    paceMultiplier: number;
    pauseInstructions: Array<{ position: number; duration: number; type: string }>;
  }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return {
          adjustedText: originalText,
          paceMultiplier: 1.0,
          pauseInstructions: [],
        };
      }

      return await this.inclusiveDesignEngine.adjustVoicePace(userId, originalText, profile);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to adjust voice pace for user ${userId}:`, error);
      }
      return {
        adjustedText: originalText,
        paceMultiplier: 1.0,
        pauseInstructions: [],
      };
    }
  }

  async addVisualCuesForEchoShow(
    userId: string,
    content: string,
    context?: { contentType?: string; importance?: 'low' | 'medium' | 'high' }
  ): Promise<string> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return content;
      }

      return await this.inclusiveDesignEngine.addVisualCues(userId, content, profile, context);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to add visual cues for user ${userId}:`, error);
      }
      return content;
    }
  }

  async simplifyLanguageForCognitiveAccessibility(
    userId: string,
    text: string,
    targetLevel?: 'basic' | 'intermediate' | 'advanced'
  ): Promise<{
    simplifiedText: string;
    readabilityScore: number;
    simplifications: Array<{ original: string; simplified: string; reason: string }>;
  }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return {
          simplifiedText: text,
          readabilityScore: 0.5,
          simplifications: [],
        };
      }

      return await this.inclusiveDesignEngine.simplifyLanguage(userId, text, profile, targetLevel);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to simplify language for user ${userId}:`, error);
      }
      return {
        simplifiedText: text,
        readabilityScore: 0.5,
        simplifications: [],
      };
    }
  }

  async configureExtendedTimeoutsForMotorDifficulties(
    userId: string,
    interactionType: 'input' | 'processing' | 'confirmation' | 'general'
  ): Promise<{
    inputTimeout: number;
    processingTimeout: number;
    confirmationTimeout: number;
    adaptiveTimeout: boolean;
  }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return {
          inputTimeout: 10000,
          processingTimeout: 5000,
          confirmationTimeout: 15000,
          adaptiveTimeout: false,
        };
      }

      return await this.inclusiveDesignEngine.configureExtendedTimeouts(userId, profile, interactionType);
    } catch (error: unknown) {
      if (this.config.enableLogging) {
        console.error(`Failed to configure extended timeouts for user ${userId}:`, error);
      }
      return {
        inputTimeout: 10000,
        processingTimeout: 5000,
        confirmationTimeout: 15000,
        adaptiveTimeout: false,
      };
    }
  }

  async enableMultiModalInputSupport(
    userId: string,
    availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[]
  ): Promise<{
    recommendedModalities: string[];
    fallbackSequence: string[];
    adaptationSettings: Record<string, any>;
  }> {
    try {
      const profile = await this.getAccessibilityProfile(userId);
      if (!profile) {
        return {
          recommendedModalities: ['voice'],
          fallbackSequence: ['voice', 'touch'],
          adaptationSettings: {},
        };
      }

      return await this.inclusiveDesignEngine.enableMultiModalSupport(userId, profile, availableModalities);
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(`Failed to enable multi-modal support for user ${userId}:`, error);
      }
      return {
        recommendedModalities: ['voice'],
        fallbackSequence: ['voice', 'touch'],
        adaptationSettings: {},
      };
    }
  }

  async generateAccessibilityReport(userId: string): Promise<{
    profileSummary: any;
    adaptationUsage: any;
    effectivenessMetrics: any;
    recommendations: string[];
  }> {
    try {
      return await this.inclusiveDesignEngine.generateAccessibilityReport(userId);
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to generate accessibility report: ${message}`, { userId, error });
    }
  }

  // Analytics and Insights
  async getAccessibilityInsights(userId: string, timeRange?: { start: Date; end: Date }): Promise<{
    adaptationCount: number;
    mostUsedAdaptations: string[];
    engagementTrends: any[];
    effectivenessScores: Record<string, number>;
  }> {
    try {
      // Get adaptation history
      let query = this.supabase
        .from('communication_adaptations')
        .select('*')
        .eq('userId', userId);

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      const { data: adaptations, error } = await query;
      if (error) throw error;

      // Analyze adaptations
      const adaptationCount = adaptations?.length || 0;
      const adaptationTypes = adaptations?.map(a => a.adaptationType) || [];
      const mostUsedAdaptations = [...new Set(adaptationTypes)]
        .map(type => ({
          type,
          count: adaptationTypes.filter(t => t === type).length
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => item.type);

      // Calculate effectiveness scores
      const effectivenessScores: Record<string, number> = {};
      for (const type of mostUsedAdaptations) {
        const typeAdaptations = adaptations?.filter(a => a.adaptationType === type && a.effectivenessScore) || [];
        if (typeAdaptations.length > 0) {
          effectivenessScores[type] = typeAdaptations.reduce((sum, a) => sum + (a.effectivenessScore || 0), 0) / typeAdaptations.length;
        }
      }

      return {
        adaptationCount,
        mostUsedAdaptations,
        engagementTrends: [], // TODO: Implement engagement trend analysis
        effectivenessScores,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to get accessibility insights: ${message}`, { userId, error });
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test database connection
      const { error } = await this.supabase.from('accessibility_profiles').select('count').limit(1);
      
      if (error) {
        return {
          status: 'unhealthy',
          details: { database: 'disconnected', error: error.message }
        };
      }

      return {
        status: 'healthy',
        details: {
          database: 'connected',
          services: {
            communicationEngine: 'active',
            vocabularyAdapter: 'active',
            engagementManager: 'active',
            assistiveTechIntegrator: 'active',
            multiModalProcessor: 'active',
            inclusiveDesignEngine: 'active',
          }
        }
      };
    } catch (error: unknown) {
      return {
        status: 'unhealthy',
        details: { error: (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error) }
      };
    }
  }
}