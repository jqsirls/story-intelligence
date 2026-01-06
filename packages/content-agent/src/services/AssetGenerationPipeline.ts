import { Story, Character } from '@storytailor/shared-types';
import { ArtGenerationService, GeneratedArt, ArtGenerationConfig } from './ArtGenerationService';
import { AudioGenerationService, GeneratedStoryAudio, AudioGenerationConfig } from './AudioGenerationService';
import { EducationalActivitiesService, GeneratedActivities, EducationalActivitiesConfig } from './EducationalActivitiesService';
import { PDFGenerationService, GeneratedPDF, PDFGenerationConfig } from './PDFGenerationService';
import { createLogger, Logger } from 'winston';

export interface AssetGenerationPipelineConfig {
  artGeneration: ArtGenerationConfig;
  audioGeneration: AudioGenerationConfig;
  educationalActivities: EducationalActivitiesConfig;
  pdfGeneration: PDFGenerationConfig;
  logLevel: string;
  enableParallelGeneration: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

export interface AssetGenerationRequest {
  story: Story;
  character: Character;
  targetAge?: number;
  assetTypes: AssetType[];
  customization?: {
    voiceSettings?: any;
    pdfOptions?: any;
    activityPreferences?: any;
    artStyle?: any;
  };
  priority?: 'low' | 'normal' | 'high';
}

export type AssetType = 'art' | 'audio' | 'activities' | 'pdf';

export interface GeneratedAssets {
  storyId: string;
  characterId: string;
  generatedAt: string;
  assets: {
    art?: GeneratedArt;
    audio?: GeneratedStoryAudio;
    activities?: GeneratedActivities;
    pdf?: GeneratedPDF;
  };
  metadata: {
    generationTime: number;
    totalCost: number;
    errors: string[];
    warnings: string[];
  };
}

export interface AssetRegenerationRequest {
  originalAssets: GeneratedAssets;
  updatedStory?: Story;
  updatedCharacter?: Character;
  changedElements?: string[];
  assetTypesToRegenerate: AssetType[];
  customization?: any;
}

export class AssetGenerationPipeline {
  private artService: ArtGenerationService;
  private audioService: AudioGenerationService;
  private activitiesService: EducationalActivitiesService;
  private pdfService: PDFGenerationService;
  private logger: Logger;
  private config: AssetGenerationPipelineConfig;

  constructor(config: AssetGenerationPipelineConfig) {
    this.config = config;
    this.initializeLogger();
    this.initializeServices();
  }

  private initializeLogger(): void {
    this.logger = createLogger({
      level: this.config.logLevel,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      transports: [
        new (require('winston').transports.Console)()
      ]
    });
  }

  private initializeServices(): void {
    this.artService = new ArtGenerationService(this.config.artGeneration);
    this.audioService = new AudioGenerationService(this.config.audioGeneration);
    this.activitiesService = new EducationalActivitiesService(this.config.educationalActivities);
    this.pdfService = new PDFGenerationService(this.config.pdfGeneration);
  }

  /**
   * Generate all requested assets for a story
   */
  async generateAssets(request: AssetGenerationRequest): Promise<GeneratedAssets> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalCost = 0;

    this.logger.info('Starting asset generation pipeline', {
      storyId: request.story.id,
      characterId: request.character.id,
      assetTypes: request.assetTypes,
      priority: request.priority
    });

    try {
      const assets: GeneratedAssets['assets'] = {};

      if (this.config.enableParallelGeneration) {
        // Generate assets in parallel for better performance
        const promises = await this.generateAssetsInParallel(request, errors, warnings);
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const assetType = request.assetTypes[index];
            assets[assetType] = result.value;
          } else {
            errors.push(`Failed to generate ${request.assetTypes[index]}: ${result.reason}`);
          }
        });
      } else {
        // Generate assets sequentially
        await this.generateAssetsSequentially(request, assets, errors, warnings);
      }

      // Calculate total cost
      totalCost = this.calculateTotalCost(assets);

      const generationTime = Date.now() - startTime;

      this.logger.info('Asset generation pipeline completed', {
        storyId: request.story.id,
        generationTime,
        totalCost,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return {
        storyId: request.story.id,
        characterId: request.character.id,
        generatedAt: new Date().toISOString(),
        assets,
        metadata: {
          generationTime,
          totalCost,
          errors,
          warnings
        }
      };

    } catch (error) {
      this.logger.error('Asset generation pipeline failed', {
        storyId: request.story.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Regenerate specific assets when story content changes
   */
  async regenerateAssets(request: AssetRegenerationRequest): Promise<GeneratedAssets> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    this.logger.info('Starting asset regeneration', {
      storyId: request.originalAssets.storyId,
      assetTypes: request.assetTypesToRegenerate,
      changedElements: request.changedElements
    });

    try {
      const updatedAssets = { ...request.originalAssets.assets };

      // Regenerate each requested asset type
      for (const assetType of request.assetTypesToRegenerate) {
        try {
          switch (assetType) {
            case 'art':
              if (request.updatedStory && request.updatedCharacter) {
                updatedAssets.art = await this.artService.generateStoryArt(
                  request.updatedStory,
                  request.updatedCharacter
                );
              }
              break;

            case 'audio':
              if (request.updatedStory && request.updatedCharacter && updatedAssets.audio) {
                updatedAssets.audio = await this.audioService.regenerateAudio(
                  updatedAssets.audio,
                  {
                    storyId: request.originalAssets.storyId,
                    changedBeats: request.changedElements?.filter(el => el.startsWith('beat_')),
                    newContent: request.updatedStory ? JSON.stringify(request.updatedStory.content) : undefined,
                    voiceSettings: request.customization?.voiceSettings
                  }
                );
              }
              break;

            case 'activities':
              if (request.updatedStory && request.updatedCharacter && updatedAssets.activities) {
                updatedAssets.activities = await this.activitiesService.regenerateActivities(
                  updatedAssets.activities,
                  request.updatedStory,
                  request.changedElements
                );
              }
              break;

            case 'pdf':
              if (updatedAssets.pdf) {
                updatedAssets.pdf = await this.pdfService.regeneratePDF({
                  originalPDF: updatedAssets.pdf,
                  updatedStory: request.updatedStory,
                  updatedArt: updatedAssets.art,
                  updatedActivities: updatedAssets.activities,
                  changedElements: request.changedElements
                });
              }
              break;
          }
        } catch (error) {
          errors.push(`Failed to regenerate ${assetType}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const totalCost = this.calculateTotalCost(updatedAssets);
      const generationTime = Date.now() - startTime;

      return {
        storyId: request.originalAssets.storyId,
        characterId: request.originalAssets.characterId,
        generatedAt: new Date().toISOString(),
        assets: updatedAssets,
        metadata: {
          generationTime,
          totalCost,
          errors,
          warnings
        }
      };

    } catch (error) {
      this.logger.error('Asset regeneration failed', {
        storyId: request.originalAssets.storyId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get asset generation status and progress
   */
  async getGenerationStatus(storyId: string): Promise<{
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number; // 0-100
    currentStep: string;
    estimatedTimeRemaining: number; // milliseconds
    errors: string[];
  }> {
    // This would typically check a job queue or database
    // For now, return a mock status
    return {
      status: 'completed',
      progress: 100,
      currentStep: 'completed',
      estimatedTimeRemaining: 0,
      errors: []
    };
  }

  /**
   * Cancel asset generation in progress
   */
  async cancelGeneration(storyId: string): Promise<void> {
    this.logger.info('Cancelling asset generation', { storyId });
    // Implementation would cancel running jobs
  }

  /**
   * Get asset generation cost estimate
   */
  async estimateGenerationCost(request: AssetGenerationRequest): Promise<{
    totalCost: number;
    breakdown: {
      art: number;
      audio: number;
      activities: number;
      pdf: number;
    };
    currency: string;
  }> {
    const wordCount = request.story.content.beats.reduce((count, beat) => 
      count + beat.content.split(' ').length, 0
    );

    // Rough cost estimates (would be more sophisticated in production)
    const costs = {
      art: request.assetTypes.includes('art') ? 2.00 : 0, // DALL-E 3 cost
      audio: request.assetTypes.includes('audio') ? (wordCount * 5 / 1000) * 0.30 : 0, // ElevenLabs cost
      activities: request.assetTypes.includes('activities') ? 0.10 : 0, // OpenAI cost
      pdf: request.assetTypes.includes('pdf') ? 0.05 : 0 // Processing cost
    };

    return {
      totalCost: Object.values(costs).reduce((sum, cost) => sum + cost, 0),
      breakdown: costs,
      currency: 'USD'
    };
  }

  // Private helper methods

  private async generateAssetsInParallel(
    request: AssetGenerationRequest,
    errors: string[],
    warnings: string[]
  ): Promise<Promise<any>[]> {
    const promises: Promise<any>[] = [];

    if (request.assetTypes.includes('art')) {
      promises.push(
        this.withTimeout(
          this.artService.generateStoryArt(request.story, request.character),
          this.config.timeoutMs,
          'Art generation timeout'
        )
      );
    }

    if (request.assetTypes.includes('audio')) {
      promises.push(
        this.withTimeout(
          this.audioService.generateStoryNarration(
            request.story,
            request.character,
            request.customization?.voiceSettings
          ),
          this.config.timeoutMs,
          'Audio generation timeout'
        )
      );
    }

    if (request.assetTypes.includes('activities')) {
      promises.push(
        this.withTimeout(
          this.activitiesService.generateActivities({
            story: request.story,
            character: request.character,
            targetAge: request.targetAge || 6,
            ...request.customization?.activityPreferences
          }),
          this.config.timeoutMs,
          'Activities generation timeout'
        )
      );
    }

    return promises;
  }

  private async generateAssetsSequentially(
    request: AssetGenerationRequest,
    assets: GeneratedAssets['assets'],
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    // Generate art first (needed for PDF)
    if (request.assetTypes.includes('art')) {
      try {
        assets.art = await this.withRetry(
          () => this.artService.generateStoryArt(request.story, request.character),
          this.config.retryAttempts
        );
      } catch (error) {
        errors.push(`Art generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate audio
    if (request.assetTypes.includes('audio')) {
      try {
        assets.audio = await this.withRetry(
          () => this.audioService.generateStoryNarration(
            request.story,
            request.character,
            request.customization?.voiceSettings
          ),
          this.config.retryAttempts
        );
      } catch (error) {
        errors.push(`Audio generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate activities
    if (request.assetTypes.includes('activities')) {
      try {
        assets.activities = await this.withRetry(
          () => this.activitiesService.generateActivities({
            story: request.story,
            character: request.character,
            targetAge: request.targetAge || 6,
            ...request.customization?.activityPreferences
          }),
          this.config.retryAttempts
        );
      } catch (error) {
        errors.push(`Activities generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate PDF last (needs other assets)
    if (request.assetTypes.includes('pdf')) {
      try {
        if (assets.art) {
          assets.pdf = await this.withRetry(
            () => this.pdfService.generateStoryPDF({
              story: request.story,
              character: request.character,
              generatedArt: assets.art!,
              activities: assets.activities,
              includeActivities: !!assets.activities,
              customization: request.customization?.pdfOptions
            }),
            this.config.retryAttempts
          );
        } else {
          warnings.push('PDF generation skipped: art generation failed');
        }
      } catch (error) {
        errors.push(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private calculateTotalCost(assets: GeneratedAssets['assets']): number {
    let totalCost = 0;

    if (assets.art) {
      totalCost += 2.00; // DALL-E 3 cost estimate
    }

    if (assets.audio?.metadata?.estimatedCost) {
      totalCost += assets.audio.metadata.estimatedCost;
    }

    if (assets.activities) {
      totalCost += 0.10; // OpenAI cost estimate
    }

    if (assets.pdf) {
      totalCost += 0.05; // Processing cost estimate
    }

    return totalCost;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.logger.warn(`Asset generation attempt ${attempt} failed, retrying...`, {
          error: lastError.message,
          nextAttemptIn: delay
        });
      }
    }

    throw lastError!;
  }

  /**
   * Health check for all asset generation services
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      art: boolean;
      audio: boolean;
      activities: boolean;
      pdf: boolean;
    };
    timestamp: string;
  }> {
    const services = {
      art: true, // ArtGenerationService doesn't have health check, assume healthy
      audio: true, // AudioGenerationService doesn't have health check, assume healthy
      activities: true, // EducationalActivitiesService doesn't have health check, assume healthy
      pdf: true // PDFGenerationService doesn't have health check, assume healthy
    };

    // In production, you would actually test each service
    const allHealthy = Object.values(services).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
  }
}