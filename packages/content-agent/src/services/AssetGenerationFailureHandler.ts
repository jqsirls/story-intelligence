import { Logger } from 'winston';
import { RedisClientType } from 'redis';
import { AssetType, GeneratedAssets, AssetGenerationRequest } from './AssetGenerationPipeline';

export interface AssetGenerationFailure {
  assetType: AssetType;
  error: Error;
  timestamp: string;
  retryCount: number;
  context: {
    storyId: string;
    characterId: string;
    userId: string;
    sessionId: string;
  };
}

export interface FallbackAssetOptions {
  assetType: AssetType;
  fallbackStrategy: 'placeholder' | 'simplified' | 'text_only' | 'cached_similar' | 'user_notification';
  quality: 'basic' | 'standard' | 'premium';
  estimatedTime: number; // seconds
}

export interface ProgressUpdate {
  sessionId: string;
  assetType: AssetType;
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'fallback';
  progress: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  message: string;
  userVisible: boolean;
}

export interface AssetQualityValidation {
  assetType: AssetType;
  isValid: boolean;
  qualityScore: number; // 0-1
  issues: QualityIssue[];
  recommendation: 'accept' | 'regenerate' | 'fallback' | 'manual_review';
}

export interface QualityIssue {
  type: 'resolution' | 'content_mismatch' | 'age_inappropriate' | 'technical_error' | 'incomplete';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  autoFixable: boolean;
}

export interface UserNotification {
  sessionId: string;
  type: 'progress_update' | 'failure_notification' | 'quality_issue' | 'completion';
  title: string;
  message: string;
  actionRequired: boolean;
  options?: string[];
  priority: 'low' | 'normal' | 'high';
}

export class AssetGenerationFailureHandler {
  private redis: RedisClientType;
  private logger: Logger;
  private fallbackStrategies: Map<AssetType, FallbackAssetOptions[]>;
  private qualityThresholds: Map<AssetType, number>;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
    this.initializeFallbackStrategies();
    this.initializeQualityThresholds();
  }

  /**
   * Handle asset generation failure with intelligent fallback
   */
  async handleGenerationFailure(failure: AssetGenerationFailure): Promise<{
    fallbackAsset?: any;
    userNotification: UserNotification;
    retryRecommended: boolean;
    fallbackStrategy: string;
  }> {
    this.logger.error('Asset generation failed', {
      assetType: failure.assetType,
      error: failure.error.message,
      retryCount: failure.retryCount,
      storyId: failure.context.storyId
    });

    // Determine best fallback strategy
    const fallbackOptions = this.getFallbackOptions(failure.assetType, failure.retryCount);
    const selectedStrategy = this.selectBestFallback(fallbackOptions, failure);

    // Generate fallback asset
    const fallbackAsset = await this.generateFallbackAsset(selectedStrategy, failure);

    // Create user notification
    const userNotification = this.createFailureNotification(failure, selectedStrategy);

    // Determine if retry is recommended
    const retryRecommended = this.shouldRetry(failure);

    // Cache failure for learning
    await this.cacheFailurePattern(failure);

    return {
      fallbackAsset,
      userNotification,
      retryRecommended,
      fallbackStrategy: selectedStrategy.fallbackStrategy
    };
  }

  /**
   * Implement progressive asset generation with user updates
   */
  async generateWithProgressUpdates(
    request: AssetGenerationRequest,
    updateCallback: (update: ProgressUpdate) => Promise<void>
  ): Promise<GeneratedAssets> {
    const sessionId = request.story.id; // Use story ID as session ID
    const totalAssets = request.assetTypes.length;
    let completedAssets = 0;

    this.logger.info('Starting progressive asset generation', {
      sessionId,
      assetTypes: request.assetTypes,
      totalAssets
    });

    const results: GeneratedAssets = {
      storyId: request.story.id,
      characterId: request.character.id,
      generatedAt: new Date().toISOString(),
      assets: {},
      metadata: {
        generationTime: 0,
        totalCost: 0,
        errors: [],
        warnings: []
      }
    };

    const startTime = Date.now();

    for (const assetType of request.assetTypes) {
      try {
        // Send progress update - starting generation
        await updateCallback({
          sessionId,
          assetType,
          status: 'generating',
          progress: Math.round((completedAssets / totalAssets) * 100),
          estimatedTimeRemaining: this.estimateRemainingTime(assetType, totalAssets - completedAssets),
          message: this.getGenerationMessage(assetType, 'generating'),
          userVisible: true
        });

        // Generate the asset (this would call the actual generation service)
        const asset = await this.generateSingleAsset(assetType, request);
        
        // Validate quality
        const qualityValidation = await this.validateAssetQuality(asset, assetType);
        
        if (qualityValidation.recommendation === 'accept') {
          results.assets[assetType] = asset;
          completedAssets++;

          // Send completion update
          await updateCallback({
            sessionId,
            assetType,
            status: 'completed',
            progress: Math.round((completedAssets / totalAssets) * 100),
            estimatedTimeRemaining: this.estimateRemainingTime(assetType, totalAssets - completedAssets),
            message: this.getGenerationMessage(assetType, 'completed'),
            userVisible: true
          });
        } else {
          // Handle quality issues
          await this.handleQualityIssues(qualityValidation, sessionId, updateCallback);
        }

      } catch (error) {
        // Handle generation failure
        const failure: AssetGenerationFailure = {
          assetType,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date().toISOString(),
          retryCount: 0,
          context: {
            storyId: request.story.id,
            characterId: request.character.id,
            userId: 'unknown', // Would be passed in real implementation
            sessionId
          }
        };

        const fallbackResult = await this.handleGenerationFailure(failure);
        
        if (fallbackResult.fallbackAsset) {
          results.assets[assetType] = fallbackResult.fallbackAsset;
        }

        results.metadata.errors.push(`${assetType}: ${error}`);

        // Send failure update
        await updateCallback({
          sessionId,
          assetType,
          status: 'fallback',
          progress: Math.round((completedAssets / totalAssets) * 100),
          estimatedTimeRemaining: this.estimateRemainingTime(assetType, totalAssets - completedAssets),
          message: fallbackResult.userNotification.message,
          userVisible: true
        });

        completedAssets++;
      }
    }

    results.metadata.generationTime = Date.now() - startTime;

    // Send final completion update
    await updateCallback({
      sessionId,
      assetType: 'pdf', // Use last asset type
      status: 'completed',
      progress: 100,
      estimatedTimeRemaining: 0,
      message: 'All assets have been generated! Your story is ready.',
      userVisible: true
    });

    return results;
  }

  /**
   * Implement asset regeneration system for user-requested changes
   */
  async regenerateAssetWithUserFeedback(
    originalAsset: any,
    assetType: AssetType,
    userFeedback: string,
    context: {
      storyId: string;
      characterId: string;
      sessionId: string;
    }
  ): Promise<{
    regeneratedAsset: any;
    improvementsMade: string[];
    userNotification: UserNotification;
  }> {
    this.logger.info('Regenerating asset with user feedback', {
      assetType,
      feedback: userFeedback,
      storyId: context.storyId
    });

    try {
      // Parse user feedback to understand what needs to change
      const changeRequests = await this.parseUserFeedback(userFeedback, assetType);

      // Apply changes and regenerate
      const regeneratedAsset = await this.applyChangesAndRegenerate(
        originalAsset,
        assetType,
        changeRequests,
        context
      );

      // Validate the regenerated asset
      const qualityValidation = await this.validateAssetQuality(regeneratedAsset, assetType);

      if (qualityValidation.recommendation === 'accept') {
        const userNotification: UserNotification = {
          sessionId: context.sessionId,
          type: 'completion',
          title: 'Asset Updated!',
          message: `I've updated your ${assetType} based on your feedback. How does it look now?`,
          actionRequired: false,
          priority: 'normal'
        };

        return {
          regeneratedAsset,
          improvementsMade: changeRequests.map(req => req.description),
          userNotification
        };
      } else {
        throw new Error(`Regenerated asset did not meet quality standards: ${qualityValidation.issues.map(i => i.description).join(', ')}`);
      }

    } catch (error) {
      this.logger.error('Asset regeneration failed', {
        assetType,
        error: error instanceof Error ? error.message : String(error)
      });

      const userNotification: UserNotification = {
        sessionId: context.sessionId,
        type: 'failure_notification',
        title: 'Regeneration Issue',
        message: `I had trouble updating your ${assetType}. Would you like me to try a different approach?`,
        actionRequired: true,
        options: ['Try again', 'Use original', 'Try different style'],
        priority: 'normal'
      };

      return {
        regeneratedAsset: originalAsset, // Return original as fallback
        improvementsMade: [],
        userNotification
      };
    }
  }

  /**
   * Validate asset quality with comprehensive checks
   */
  async validateAssetQuality(asset: any, assetType: AssetType): Promise<AssetQualityValidation> {
    const issues: QualityIssue[] = [];
    let qualityScore = 1.0;

    try {
      switch (assetType) {
        case 'art':
          await this.validateArtQuality(asset, issues);
          break;
        case 'audio':
          await this.validateAudioQuality(asset, issues);
          break;
        case 'activities':
          await this.validateActivitiesQuality(asset, issues);
          break;
        case 'pdf':
          await this.validatePDFQuality(asset, issues);
          break;
      }

      // Calculate quality score based on issues
      qualityScore = this.calculateQualityScore(issues);

      // Determine recommendation
      const threshold = this.qualityThresholds.get(assetType) || 0.7;
      let recommendation: AssetQualityValidation['recommendation'] = 'accept';

      if (qualityScore < threshold) {
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
          recommendation = 'fallback';
        } else {
          recommendation = 'regenerate';
        }
      }

      return {
        assetType,
        isValid: qualityScore >= threshold,
        qualityScore,
        issues,
        recommendation
      };

    } catch (error) {
      this.logger.error('Quality validation failed', {
        assetType,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        assetType,
        isValid: false,
        qualityScore: 0,
        issues: [{
          type: 'technical_error',
          severity: 'critical',
          description: 'Quality validation failed',
          autoFixable: false
        }],
        recommendation: 'fallback'
      };
    }
  }

  /**
   * Create user notification system for asset generation issues
   */
  createUserNotification(
    sessionId: string,
    type: UserNotification['type'],
    assetType: AssetType,
    issue?: string
  ): UserNotification {
    const notifications: Record<UserNotification['type'], (assetType: AssetType, issue?: string) => UserNotification> = {
      progress_update: (assetType) => ({
        sessionId,
        type: 'progress_update',
        title: 'Creating Your Story Assets',
        message: `I'm working on your ${assetType}. This might take a moment...`,
        actionRequired: false,
        priority: 'low'
      }),

      failure_notification: (assetType, issue) => ({
        sessionId,
        type: 'failure_notification',
        title: 'Small Hiccup',
        message: `I had trouble creating your ${assetType}${issue ? `: ${issue}` : ''}. I'll try a different approach!`,
        actionRequired: false,
        priority: 'normal'
      }),

      quality_issue: (assetType, issue) => ({
        sessionId,
        type: 'quality_issue',
        title: 'Let Me Make That Better',
        message: `Your ${assetType} needs a little touch-up${issue ? `: ${issue}` : ''}. I'll fix that right away!`,
        actionRequired: false,
        priority: 'normal'
      }),

      completion: (assetType) => ({
        sessionId,
        type: 'completion',
        title: 'All Done!',
        message: `Your ${assetType} is ready! I think you're going to love it.`,
        actionRequired: false,
        priority: 'normal'
      })
    };

    return notifications[type](assetType, issue);
  }

  // Private helper methods

  private initializeFallbackStrategies(): void {
    this.fallbackStrategies = new Map([
      ['art', [
        {
          assetType: 'art',
          fallbackStrategy: 'simplified',
          quality: 'basic',
          estimatedTime: 30
        },
        {
          assetType: 'art',
          fallbackStrategy: 'placeholder',
          quality: 'basic',
          estimatedTime: 5
        }
      ]],
      ['audio', [
        {
          assetType: 'audio',
          fallbackStrategy: 'text_only',
          quality: 'standard',
          estimatedTime: 10
        },
        {
          assetType: 'audio',
          fallbackStrategy: 'cached_similar',
          quality: 'basic',
          estimatedTime: 5
        }
      ]],
      ['activities', [
        {
          assetType: 'activities',
          fallbackStrategy: 'simplified',
          quality: 'standard',
          estimatedTime: 15
        }
      ]],
      ['pdf', [
        {
          assetType: 'pdf',
          fallbackStrategy: 'text_only',
          quality: 'basic',
          estimatedTime: 10
        }
      ]]
    ]);
  }

  private initializeQualityThresholds(): void {
    this.qualityThresholds = new Map([
      ['art', 0.7],
      ['audio', 0.8],
      ['activities', 0.6],
      ['pdf', 0.5]
    ]);
  }

  private getFallbackOptions(assetType: AssetType, retryCount: number): FallbackAssetOptions[] {
    const options = this.fallbackStrategies.get(assetType) || [];
    
    // Return more aggressive fallbacks for higher retry counts
    if (retryCount > 2) {
      return options.filter(opt => opt.fallbackStrategy === 'placeholder' || opt.fallbackStrategy === 'text_only');
    }
    
    return options;
  }

  private selectBestFallback(options: FallbackAssetOptions[], failure: AssetGenerationFailure): FallbackAssetOptions {
    // Simple selection logic - would be more sophisticated in real implementation
    return options[0] || {
      assetType: failure.assetType,
      fallbackStrategy: 'user_notification',
      quality: 'basic',
      estimatedTime: 0
    };
  }

  private async generateFallbackAsset(strategy: FallbackAssetOptions, failure: AssetGenerationFailure): Promise<any> {
    switch (strategy.fallbackStrategy) {
      case 'placeholder':
        return this.generatePlaceholderAsset(strategy.assetType);
      case 'simplified':
        return this.generateSimplifiedAsset(strategy.assetType, failure.context);
      case 'text_only':
        return this.generateTextOnlyAsset(strategy.assetType, failure.context);
      case 'cached_similar':
        return this.findSimilarCachedAsset(strategy.assetType, failure.context);
      default:
        return null;
    }
  }

  private createFailureNotification(failure: AssetGenerationFailure, strategy: FallbackAssetOptions): UserNotification {
    return {
      sessionId: failure.context.sessionId,
      type: 'failure_notification',
      title: 'Working on Your Story',
      message: this.getFailureMessage(failure.assetType, strategy.fallbackStrategy),
      actionRequired: false,
      priority: 'normal'
    };
  }

  private shouldRetry(failure: AssetGenerationFailure): boolean {
    return failure.retryCount < 3 && !this.isPermanentFailure(failure.error);
  }

  private isPermanentFailure(error: Error): boolean {
    // Check for permanent failure patterns
    const permanentPatterns = [
      'quota exceeded',
      'service unavailable',
      'invalid api key',
      'content policy violation'
    ];
    
    return permanentPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern)
    );
  }

  private async cacheFailurePattern(failure: AssetGenerationFailure): Promise<void> {
    try {
      const key = `failure_pattern:${failure.assetType}:${Date.now()}`;
      await this.redis.setEx(key, 3600, JSON.stringify({
        assetType: failure.assetType,
        errorType: failure.error.name,
        errorMessage: failure.error.message,
        timestamp: failure.timestamp,
        context: failure.context
      }));
    } catch (error) {
      this.logger.warn('Failed to cache failure pattern', { error });
    }
  }

  private estimateRemainingTime(assetType: AssetType, remainingAssets: number): number {
    const timeEstimates: Record<AssetType, number> = {
      art: 60,
      audio: 45,
      activities: 20,
      pdf: 15
    };
    
    return (timeEstimates[assetType] || 30) * remainingAssets;
  }

  private getGenerationMessage(assetType: AssetType, status: 'generating' | 'completed'): string {
    const messages: Record<AssetType, Record<string, string>> = {
      art: {
        generating: 'Creating beautiful artwork for your story...',
        completed: 'Your story artwork is ready!'
      },
      audio: {
        generating: 'Recording your story with a lovely voice...',
        completed: 'Your story audio is ready to listen to!'
      },
      activities: {
        generating: 'Designing fun activities for you and your grown-ups...',
        completed: 'Your activities are ready to try!'
      },
      pdf: {
        generating: 'Making a beautiful book you can print and keep...',
        completed: 'Your printable book is ready!'
      }
    };
    
    return messages[assetType]?.[status] || `Working on your ${assetType}...`;
  }

  private getFailureMessage(assetType: AssetType, fallbackStrategy: string): string {
    const messages: Record<string, string> = {
      placeholder: `I'll use a simple placeholder for your ${assetType} for now, and we can make it better later!`,
      simplified: `I'm making a simpler version of your ${assetType} that will still be great!`,
      text_only: `I'll create a text version of your ${assetType} that you can enjoy right away!`,
      cached_similar: `I found something similar that might work perfectly for your ${assetType}!`,
      user_notification: `I'm having trouble with your ${assetType}, but don't worry - we'll figure it out together!`
    };
    
    return messages[fallbackStrategy] || `Working on your ${assetType}...`;
  }

  private async generateSingleAsset(assetType: AssetType, request: AssetGenerationRequest): Promise<any> {
    // This would call the actual generation services
    // For now, return a mock asset
    return {
      type: assetType,
      url: `https://example.com/${assetType}/${request.story.id}`,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'standard'
      }
    };
  }

  private async handleQualityIssues(
    validation: AssetQualityValidation,
    sessionId: string,
    updateCallback: (update: ProgressUpdate) => Promise<void>
  ): Promise<void> {
    const criticalIssues = validation.issues.filter(i => i.severity === 'critical');
    
    if (criticalIssues.length > 0) {
      await updateCallback({
        sessionId,
        assetType: validation.assetType,
        status: 'failed',
        progress: 0,
        estimatedTimeRemaining: 0,
        message: `Quality issue detected with ${validation.assetType}. Trying a different approach...`,
        userVisible: true
      });
    }
  }

  private async parseUserFeedback(feedback: string, assetType: AssetType): Promise<ChangeRequest[]> {
    // Simple parsing - would use AI in real implementation
    return [{
      type: 'general_improvement',
      description: feedback,
      priority: 'normal'
    }];
  }

  private async applyChangesAndRegenerate(
    originalAsset: any,
    assetType: AssetType,
    changeRequests: ChangeRequest[],
    context: any
  ): Promise<any> {
    // Mock regeneration - would call actual services
    return {
      ...originalAsset,
      version: (originalAsset.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      changes: changeRequests.map(req => req.description)
    };
  }

  private async validateArtQuality(asset: any, issues: QualityIssue[]): Promise<void> {
    // Mock validation - would check actual image quality
    if (!asset.url) {
      issues.push({
        type: 'technical_error',
        severity: 'critical',
        description: 'Missing image URL',
        autoFixable: false
      });
    }
  }

  private async validateAudioQuality(asset: any, issues: QualityIssue[]): Promise<void> {
    // Mock validation - would check audio quality
    if (!asset.url) {
      issues.push({
        type: 'technical_error',
        severity: 'critical',
        description: 'Missing audio URL',
        autoFixable: false
      });
    }
  }

  private async validateActivitiesQuality(asset: any, issues: QualityIssue[]): Promise<void> {
    // Mock validation - would check activities content
    if (!asset.activities || asset.activities.length === 0) {
      issues.push({
        type: 'incomplete',
        severity: 'high',
        description: 'No activities generated',
        autoFixable: true
      });
    }
  }

  private async validatePDFQuality(asset: any, issues: QualityIssue[]): Promise<void> {
    // Mock validation - would check PDF quality
    if (!asset.url) {
      issues.push({
        type: 'technical_error',
        severity: 'critical',
        description: 'Missing PDF URL',
        autoFixable: false
      });
    }
  }

  private calculateQualityScore(issues: QualityIssue[]): number {
    if (issues.length === 0) return 1.0;
    
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.5, critical: 1.0 };
    const totalDeduction = issues.reduce((sum, issue) => sum + severityWeights[issue.severity], 0);
    
    return Math.max(0, 1.0 - (totalDeduction / issues.length));
  }

  private generatePlaceholderAsset(assetType: AssetType): any {
    return {
      type: assetType,
      url: `https://placeholder.com/${assetType}`,
      isPlaceholder: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'placeholder'
      }
    };
  }

  private generateSimplifiedAsset(assetType: AssetType, context: any): any {
    return {
      type: assetType,
      url: `https://simplified.com/${assetType}/${context.storyId}`,
      isSimplified: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'simplified'
      }
    };
  }

  private generateTextOnlyAsset(assetType: AssetType, context: any): any {
    return {
      type: assetType,
      content: `Text-only version of ${assetType} for story ${context.storyId}`,
      isTextOnly: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'text_only'
      }
    };
  }

  private async findSimilarCachedAsset(assetType: AssetType, context: any): Promise<any> {
    // Mock cached asset lookup
    return {
      type: assetType,
      url: `https://cached.com/${assetType}/similar`,
      isCached: true,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'cached'
      }
    };
  }
}

export interface ChangeRequest {
  type: 'color_change' | 'style_change' | 'content_change' | 'general_improvement';
  description: string;
  priority: 'low' | 'normal' | 'high';
}