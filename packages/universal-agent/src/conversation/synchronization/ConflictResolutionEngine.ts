import { Logger } from 'winston';

/**
 * Conflict Resolution Engine for cross-channel synchronization
 */
export class ConflictResolutionEngine {
  private logger: Logger;
  private resolutionStrategies: Map<string, ResolutionStrategy> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeResolutionStrategies();
  }

  /**
   * Resolve conflicts between channel states
   */
  async resolveConflicts(
    conflicts: ConflictDescriptor[],
    resolutionPolicy: ResolutionPolicy
  ): Promise<ConflictResolutionResult> {
    const startTime = Date.now();
    const resolutionId = this.generateResolutionId();

    try {
      this.logger.info('Starting conflict resolution', {
        resolutionId,
        conflictCount: conflicts.length,
        policy: resolutionPolicy.defaultStrategy
      });

      const resolvedConflicts: ResolvedConflict[] = [];
      const unresolvedConflicts: ConflictDescriptor[] = [];

      for (const conflict of conflicts) {
        try {
          const resolved = await this.resolveConflict(conflict, resolutionPolicy);
          resolvedConflicts.push(resolved);
        } catch (error) {
          this.logger.warn('Conflict resolution failed', {
            resolutionId,
            conflictField: conflict.field,
            error: error instanceof Error ? error.message : String(error)
          });
          
          unresolvedConflicts.push({
            ...conflict,
            resolutionError: error instanceof Error ? error.message : String(error)
          });
        }
      }

      const result: ConflictResolutionResult = {
        resolutionId,
        totalConflicts: conflicts.length,
        resolvedConflicts,
        unresolvedConflicts,
        resolutionPolicy,
        success: unresolvedConflicts.length === 0,
        metadata: {
          duration: Date.now() - startTime,
          resolutionRate: resolvedConflicts.length / conflicts.length,
          strategiesUsed: this.getUsedStrategies(resolvedConflicts),
          complexityScore: this.calculateComplexityScore(conflicts)
        }
      };

      this.logger.info('Conflict resolution completed', {
        resolutionId,
        success: result.success,
        resolutionRate: result.metadata.resolutionRate,
        duration: result.metadata.duration
      });

      return result;

    } catch (error) {
      this.logger.error('Conflict resolution engine failed', {
        resolutionId,
        error: error instanceof Error ? error.message : String(error),
        conflictCount: conflicts.length
      });

      return {
        resolutionId,
        totalConflicts: conflicts.length,
        resolvedConflicts: [],
        unresolvedConflicts: conflicts,
        resolutionPolicy,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration: Date.now() - startTime,
          resolutionRate: 0,
          strategiesUsed: [],
          complexityScore: this.calculateComplexityScore(conflicts)
        }
      };
    }
  }

  /**
   * Analyze conflicts and suggest optimal resolution strategies
   */
  analyzeConflicts(conflicts: ConflictDescriptor[]): ConflictAnalysis {
    const analysis: ConflictAnalysis = {
      totalConflicts: conflicts.length,
      conflictsByType: this.groupConflictsByType(conflicts),
      conflictsBySeverity: this.groupConflictsBySeverity(conflicts),
      complexityScore: this.calculateComplexityScore(conflicts),
      suggestedStrategies: this.suggestResolutionStrategies(conflicts),
      riskAssessment: this.assessResolutionRisk(conflicts),
      estimatedResolutionTime: this.estimateResolutionTime(conflicts)
    };

    this.logger.debug('Conflict analysis completed', {
      totalConflicts: analysis.totalConflicts,
      complexityScore: analysis.complexityScore,
      highRiskConflicts: analysis.riskAssessment.highRiskCount
    });

    return analysis;
  }

  /**
   * Create custom resolution strategy
   */
  registerResolutionStrategy(name: string, strategy: ResolutionStrategy): void {
    this.resolutionStrategies.set(name, strategy);
    
    this.logger.info('Resolution strategy registered', {
      strategyName: name,
      supportedConflictTypes: strategy.supportedConflictTypes
    });
  }

  /**
   * Validate resolution policy
   */
  validateResolutionPolicy(policy: ResolutionPolicy): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate default strategy
    if (!this.resolutionStrategies.has(policy.defaultStrategy)) {
      errors.push(`Unknown default strategy: ${policy.defaultStrategy}`);
    }

    // Validate field-specific strategies
    for (const [field, strategy] of Object.entries(policy.fieldStrategies || {})) {
      if (!this.resolutionStrategies.has(strategy)) {
        errors.push(`Unknown strategy for field ${field}: ${strategy}`);
      }
    }

    // Validate type-specific strategies
    for (const [type, strategy] of Object.entries(policy.typeStrategies || {})) {
      if (!this.resolutionStrategies.has(strategy)) {
        errors.push(`Unknown strategy for type ${type}: ${strategy}`);
      }
    }

    // Check for potential conflicts in policy
    if (policy.prioritizeRecent && policy.prioritizeSource) {
      warnings.push('Both prioritizeRecent and prioritizeSource are enabled, may cause conflicts');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: this.generatePolicyRecommendations(policy)
    };
  }

  // Private methods

  private async resolveConflict(
    conflict: ConflictDescriptor,
    policy: ResolutionPolicy
  ): Promise<ResolvedConflict> {
    // Determine resolution strategy
    const strategy = this.selectResolutionStrategy(conflict, policy);
    
    // Apply strategy
    const resolvedValue = await strategy.resolve(conflict, policy);
    
    // Validate resolution
    this.validateResolution(conflict, resolvedValue);

    return {
      field: conflict.field,
      originalConflict: conflict,
      resolvedValue,
      strategy: strategy.name,
      confidence: strategy.calculateConfidence(conflict),
      metadata: {
        resolutionTime: Date.now(),
        strategyUsed: strategy.name,
        validationPassed: true
      }
    };
  }

  private selectResolutionStrategy(
    conflict: ConflictDescriptor,
    policy: ResolutionPolicy
  ): ResolutionStrategy {
    // Check field-specific strategy
    if (policy.fieldStrategies?.[conflict.field]) {
      const strategyName = policy.fieldStrategies[conflict.field];
      const strategy = this.resolutionStrategies.get(strategyName);
      if (strategy) return strategy;
    }

    // Check type-specific strategy
    if (policy.typeStrategies?.[conflict.type]) {
      const strategyName = policy.typeStrategies[conflict.type];
      const strategy = this.resolutionStrategies.get(strategyName);
      if (strategy) return strategy;
    }

    // Use default strategy
    const defaultStrategy = this.resolutionStrategies.get(policy.defaultStrategy);
    if (!defaultStrategy) {
      throw new Error(`Default strategy not found: ${policy.defaultStrategy}`);
    }

    return defaultStrategy;
  }

  private validateResolution(conflict: ConflictDescriptor, resolvedValue: any): void {
    // Validate that resolved value is reasonable
    if (resolvedValue === undefined || resolvedValue === null) {
      if (conflict.sourceValue !== null && conflict.targetValue !== null) {
        throw new Error('Resolution resulted in null/undefined value');
      }
    }

    // Type validation
    const sourceType = typeof conflict.sourceValue;
    const targetType = typeof conflict.targetValue;
    const resolvedType = typeof resolvedValue;

    if (sourceType === targetType && resolvedType !== sourceType) {
      this.logger.warn('Resolution changed value type', {
        field: conflict.field,
        originalType: sourceType,
        resolvedType
      });
    }
  }

  private initializeResolutionStrategies(): void {
    // Source wins strategy
    this.resolutionStrategies.set('source_wins', {
      name: 'source_wins',
      description: 'Always prefer source value',
      supportedConflictTypes: ['*'],
      resolve: async (conflict) => conflict.sourceValue,
      calculateConfidence: () => 1.0
    });

    // Target wins strategy
    this.resolutionStrategies.set('target_wins', {
      name: 'target_wins',
      description: 'Always prefer target value',
      supportedConflictTypes: ['*'],
      resolve: async (conflict) => conflict.targetValue,
      calculateConfidence: () => 1.0
    });

    // Most recent strategy
    this.resolutionStrategies.set('most_recent', {
      name: 'most_recent',
      description: 'Prefer most recently updated value',
      supportedConflictTypes: ['*'],
      resolve: async (conflict) => {
        const sourceTime = new Date(conflict.sourceTimestamp || 0).getTime();
        const targetTime = new Date(conflict.targetTimestamp || 0).getTime();
        return sourceTime > targetTime ? conflict.sourceValue : conflict.targetValue;
      },
      calculateConfidence: (conflict) => {
        const sourceTime = new Date(conflict.sourceTimestamp || 0).getTime();
        const targetTime = new Date(conflict.targetTimestamp || 0).getTime();
        const timeDiff = Math.abs(sourceTime - targetTime);
        return Math.min(1.0, timeDiff / (60 * 1000)); // Higher confidence for larger time differences
      }
    });

    // Merge strategy
    this.resolutionStrategies.set('merge', {
      name: 'merge',
      description: 'Merge source and target values',
      supportedConflictTypes: ['object', 'array'],
      resolve: async (conflict) => {
        if (conflict.type === 'object') {
          return { ...conflict.targetValue, ...conflict.sourceValue };
        } else if (conflict.type === 'array') {
          return [...new Set([...conflict.targetValue, ...conflict.sourceValue])];
        }
        throw new Error(`Merge strategy not supported for type: ${conflict.type}`);
      },
      calculateConfidence: () => 0.8
    });

    // Longest value strategy
    this.resolutionStrategies.set('longest_value', {
      name: 'longest_value',
      description: 'Prefer longer/more complete value',
      supportedConflictTypes: ['string', 'array'],
      resolve: async (conflict) => {
        const sourceLength = this.getValueLength(conflict.sourceValue);
        const targetLength = this.getValueLength(conflict.targetValue);
        return sourceLength > targetLength ? conflict.sourceValue : conflict.targetValue;
      },
      calculateConfidence: (conflict) => {
        const sourceLength = this.getValueLength(conflict.sourceValue);
        const targetLength = this.getValueLength(conflict.targetValue);
        const lengthDiff = Math.abs(sourceLength - targetLength);
        return Math.min(1.0, lengthDiff / Math.max(sourceLength, targetLength));
      }
    });

    // Semantic merge strategy for story content
    this.resolutionStrategies.set('semantic_merge', {
      name: 'semantic_merge',
      description: 'Intelligently merge story content',
      supportedConflictTypes: ['story_content'],
      resolve: async (conflict) => {
        return this.semanticMergeStoryContent(conflict.sourceValue, conflict.targetValue);
      },
      calculateConfidence: () => 0.7
    });

    // User preference strategy
    this.resolutionStrategies.set('user_preference', {
      name: 'user_preference',
      description: 'Use user-defined preferences',
      supportedConflictTypes: ['*'],
      resolve: async (conflict, policy) => {
        const userPrefs = policy.userPreferences || {};
        if (userPrefs[conflict.field]) {
          return userPrefs[conflict.field];
        }
        // Fallback to source
        return conflict.sourceValue;
      },
      calculateConfidence: (conflict, policy) => {
        const userPrefs = policy?.userPreferences || {};
        return userPrefs[conflict.field] ? 1.0 : 0.5;
      }
    });
  }

  private getValueLength(value: any): number {
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length;
    return 0;
  }

  private semanticMergeStoryContent(sourceContent: string, targetContent: string): string {
    // Simple semantic merge - in practice, this would use NLP
    const sourceWords = new Set(sourceContent.toLowerCase().split(/\s+/));
    const targetWords = new Set(targetContent.toLowerCase().split(/\s+/));
    
    // If source contains significantly more unique words, prefer source
    const sourceUnique = [...sourceWords].filter(word => !targetWords.has(word)).length;
    const targetUnique = [...targetWords].filter(word => !sourceWords.has(word)).length;
    
    if (sourceUnique > targetUnique * 1.5) {
      return sourceContent;
    } else if (targetUnique > sourceUnique * 1.5) {
      return targetContent;
    }
    
    // Otherwise, prefer longer content
    return sourceContent.length > targetContent.length ? sourceContent : targetContent;
  }

  private groupConflictsByType(conflicts: ConflictDescriptor[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const conflict of conflicts) {
      groups[conflict.type] = (groups[conflict.type] || 0) + 1;
    }
    
    return groups;
  }

  private groupConflictsBySeverity(conflicts: ConflictDescriptor[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const conflict of conflicts) {
      groups[conflict.severity] = (groups[conflict.severity] || 0) + 1;
    }
    
    return groups;
  }

  private calculateComplexityScore(conflicts: ConflictDescriptor[]): number {
    let score = 0;
    
    for (const conflict of conflicts) {
      // Base score by severity
      switch (conflict.severity) {
        case 'low': score += 1; break;
        case 'medium': score += 3; break;
        case 'high': score += 5; break;
        case 'critical': score += 10; break;
      }
      
      // Additional score for complex types
      if (conflict.type === 'object' || conflict.type === 'array') {
        score += 2;
      }
      
      // Additional score for story content
      if (conflict.field.includes('story') || conflict.field.includes('character')) {
        score += 3;
      }
    }
    
    return score;
  }

  private suggestResolutionStrategies(conflicts: ConflictDescriptor[]): StrategySuggestion[] {
    const suggestions: StrategySuggestion[] = [];
    const conflictsByType = this.groupConflictsByType(conflicts);
    
    for (const [type, count] of Object.entries(conflictsByType)) {
      if (type === 'object' || type === 'array') {
        suggestions.push({
          strategy: 'merge',
          reason: `${count} ${type} conflicts can be merged`,
          confidence: 0.8,
          applicableConflicts: count
        });
      }
      
      if (type === 'string' && count > 3) {
        suggestions.push({
          strategy: 'longest_value',
          reason: `${count} string conflicts, prefer more complete content`,
          confidence: 0.7,
          applicableConflicts: count
        });
      }
    }
    
    // Check for timestamp-based conflicts
    const hasTimestamps = conflicts.some(c => c.sourceTimestamp && c.targetTimestamp);
    if (hasTimestamps) {
      suggestions.push({
        strategy: 'most_recent',
        reason: 'Conflicts have timestamps, can use recency',
        confidence: 0.9,
        applicableConflicts: conflicts.filter(c => c.sourceTimestamp && c.targetTimestamp).length
      });
    }
    
    return suggestions;
  }

  private assessResolutionRisk(conflicts: ConflictDescriptor[]): RiskAssessment {
    let highRiskCount = 0;
    let dataLossRisk = 0;
    let inconsistencyRisk = 0;
    
    for (const conflict of conflicts) {
      if (conflict.severity === 'high' || conflict.severity === 'critical') {
        highRiskCount++;
      }
      
      // Check for potential data loss
      if (conflict.type === 'string' || conflict.type === 'array') {
        const sourceLength = this.getValueLength(conflict.sourceValue);
        const targetLength = this.getValueLength(conflict.targetValue);
        
        if (Math.abs(sourceLength - targetLength) > Math.max(sourceLength, targetLength) * 0.5) {
          dataLossRisk++;
        }
      }
      
      // Check for story/character inconsistencies
      if (conflict.field.includes('story') || conflict.field.includes('character')) {
        inconsistencyRisk++;
      }
    }
    
    return {
      overallRisk: this.calculateOverallRisk(highRiskCount, dataLossRisk, inconsistencyRisk),
      highRiskCount,
      dataLossRisk,
      inconsistencyRisk,
      recommendations: this.generateRiskRecommendations(highRiskCount, dataLossRisk, inconsistencyRisk)
    };
  }

  private calculateOverallRisk(highRisk: number, dataLoss: number, inconsistency: number): 'low' | 'medium' | 'high' | 'critical' {
    const totalRisk = highRisk * 3 + dataLoss * 2 + inconsistency;
    
    if (totalRisk === 0) return 'low';
    if (totalRisk <= 3) return 'medium';
    if (totalRisk <= 8) return 'high';
    return 'critical';
  }

  private generateRiskRecommendations(highRisk: number, dataLoss: number, inconsistency: number): string[] {
    const recommendations: string[] = [];
    
    if (highRisk > 0) {
      recommendations.push('Consider manual review for high-severity conflicts');
    }
    
    if (dataLoss > 0) {
      recommendations.push('Use merge strategies to prevent data loss');
    }
    
    if (inconsistency > 0) {
      recommendations.push('Validate story/character consistency after resolution');
    }
    
    if (highRisk + dataLoss + inconsistency > 5) {
      recommendations.push('Consider staged resolution with user confirmation');
    }
    
    return recommendations;
  }

  private estimateResolutionTime(conflicts: ConflictDescriptor[]): number {
    // Estimate resolution time in milliseconds
    let baseTime = conflicts.length * 10; // 10ms per conflict
    
    for (const conflict of conflicts) {
      // Add time for complex types
      if (conflict.type === 'object' || conflict.type === 'array') {
        baseTime += 50;
      }
      
      // Add time for story content
      if (conflict.field.includes('story') && conflict.type === 'string') {
        baseTime += 100;
      }
      
      // Add time for high severity
      if (conflict.severity === 'high' || conflict.severity === 'critical') {
        baseTime += 25;
      }
    }
    
    return baseTime;
  }

  private generatePolicyRecommendations(policy: ResolutionPolicy): string[] {
    const recommendations: string[] = [];
    
    if (!policy.fieldStrategies || Object.keys(policy.fieldStrategies).length === 0) {
      recommendations.push('Consider adding field-specific strategies for better resolution');
    }
    
    if (policy.defaultStrategy === 'source_wins' || policy.defaultStrategy === 'target_wins') {
      recommendations.push('Consider using more sophisticated strategies like most_recent or merge');
    }
    
    if (!policy.userPreferences) {
      recommendations.push('Consider adding user preferences for personalized conflict resolution');
    }
    
    return recommendations;
  }

  private getUsedStrategies(resolvedConflicts: ResolvedConflict[]): string[] {
    const strategies = new Set<string>();
    
    for (const resolved of resolvedConflicts) {
      strategies.add(resolved.strategy);
    }
    
    return Array.from(strategies);
  }

  private generateResolutionId(): string {
    return `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Type definitions
export interface ConflictDescriptor {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'story_content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceValue: any;
  targetValue: any;
  sourceTimestamp?: string;
  targetTimestamp?: string;
  sourceChannel?: string;
  targetChannel?: string;
  resolutionError?: string;
}

export interface ResolutionPolicy {
  defaultStrategy: string;
  fieldStrategies?: Record<string, string>;
  typeStrategies?: Record<string, string>;
  prioritizeRecent?: boolean;
  prioritizeSource?: boolean;
  userPreferences?: Record<string, any>;
  allowManualResolution?: boolean;
  maxResolutionTime?: number;
}

export interface ConflictResolutionResult {
  resolutionId: string;
  totalConflicts: number;
  resolvedConflicts: ResolvedConflict[];
  unresolvedConflicts: ConflictDescriptor[];
  resolutionPolicy: ResolutionPolicy;
  success: boolean;
  error?: string;
  metadata: {
    duration: number;
    resolutionRate: number;
    strategiesUsed: string[];
    complexityScore: number;
  };
}

export interface ResolvedConflict {
  field: string;
  originalConflict: ConflictDescriptor;
  resolvedValue: any;
  strategy: string;
  confidence: number;
  metadata: {
    resolutionTime: number;
    strategyUsed: string;
    validationPassed: boolean;
  };
}

interface ResolutionStrategy {
  name: string;
  description: string;
  supportedConflictTypes: string[];
  resolve: (conflict: ConflictDescriptor, policy?: ResolutionPolicy) => Promise<any>;
  calculateConfidence: (conflict: ConflictDescriptor, policy?: ResolutionPolicy) => number;
}

interface ConflictAnalysis {
  totalConflicts: number;
  conflictsByType: Record<string, number>;
  conflictsBySeverity: Record<string, number>;
  complexityScore: number;
  suggestedStrategies: StrategySuggestion[];
  riskAssessment: RiskAssessment;
  estimatedResolutionTime: number;
}

interface StrategySuggestion {
  strategy: string;
  reason: string;
  confidence: number;
  applicableConflicts: number;
}

interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  highRiskCount: number;
  dataLossRisk: number;
  inconsistencyRisk: number;
  recommendations: string[];
}

interface PolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}