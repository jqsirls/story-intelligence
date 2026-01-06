import * as crypto from 'crypto';
import { PIIDetectionResult, PIIType } from '../types';
import { EventEmitter } from 'events';

export interface NLPPIIDetectionResult extends PIIDetectionResult {
  contextualAnalysis: {
    sentiment: 'positive' | 'negative' | 'neutral';
    entities: Array<{
      text: string;
      type: string;
      confidence: number;
      start: number;
      end: number;
    }>;
    topics: string[];
    riskScore: number;
  };
  advancedRedaction: {
    preserveContext: boolean;
    replacementStrategy: 'placeholder' | 'synthetic' | 'generalization';
    redactedText: string;
  };
}

export interface PIIPattern {
  type: PIIType;
  regex: RegExp;
  contextualRules?: Array<{
    condition: (context: string, match: string) => boolean;
    confidenceModifier: number;
  }>;
  nlpValidation?: (text: string, match: string) => boolean;
}

export class PIIDetectionService extends EventEmitter {
  private patterns: Map<PIIType, PIIPattern[]> = new Map();
  private hashSalt: string;
  private contextualKeywords: Map<PIIType, string[]> = new Map();
  private falsePositivePatterns: Map<PIIType, RegExp[]> = new Map();
  private syntheticReplacements: Map<PIIType, () => string> = new Map();

  constructor(hashSalt?: string) {
    super();
    this.hashSalt = hashSalt || crypto.randomBytes(32).toString('hex');
    this.initializePatterns();
    this.initializeContextualKeywords();
    this.initializeFalsePositivePatterns();
    this.initializeSyntheticReplacements();
  }

  /**
   * Detects and redacts PII from text
   */
  async detectAndRedactPII(text: string): Promise<PIIDetectionResult> {
    const detectedTypes: PIIType[] = [];
    let redactedText = text;
    let totalConfidence = 0;
    let detectionCount = 0;

    for (const [piiType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          detectedTypes.push(piiType);
          redactedText = redactedText.replace(pattern, this.getRedactionPlaceholder(piiType));
          totalConfidence += this.getConfidenceScore(piiType, matches[0]);
          detectionCount++;
        }
      }
    }

    const averageConfidence = detectionCount > 0 ? totalConfidence / detectionCount : 0;

    return {
      hasPII: detectedTypes.length > 0,
      detectedTypes: [...new Set(detectedTypes)], // Remove duplicates
      redactedText,
      confidence: averageConfidence
    };
  }

  /**
   * Hashes PII data using SHA-256 with salt
   */
  hashPII(data: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(data + this.hashSalt);
    return hash.digest('hex');
  }

  /**
   * Validates if text contains potential PII without redaction
   */
  async validateForPII(text: string): Promise<boolean> {
    for (const patterns of this.patterns.values()) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Gets detailed PII analysis
   */
  async analyzePII(text: string): Promise<{
    type: PIIType;
    matches: string[];
    positions: Array<{ start: number; end: number }>;
    confidence: number;
  }[]> {
    const results: Array<{
      type: PIIType;
      matches: string[];
      positions: Array<{ start: number; end: number }>;
      confidence: number;
    }> = [];

    for (const [piiType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        const matches: string[] = [];
        const positions: Array<{ start: number; end: number }> = [];
        
        let match;
        const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        
        while ((match = globalPattern.exec(text)) !== null) {
          matches.push(match[0]);
          positions.push({
            start: match.index,
            end: match.index + match[0].length
          });
        }

        if (matches.length > 0) {
          results.push({
            type: piiType,
            matches,
            positions,
            confidence: this.getConfidenceScore(piiType, matches[0])
          });
        }
      }
    }

    return results;
  }

  /**
   * Initializes PII detection patterns
   */
  private initializePatterns(): void {
    // Email patterns
    this.patterns.set(PIIType.EMAIL, [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ]);

    // Phone number patterns
    this.patterns.set(PIIType.PHONE, [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g,
      /\b\+1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      /\b555-\d{4}\b/g // Simple pattern for test
    ]);

    // SSN patterns
    this.patterns.set(PIIType.SSN, [
      /\b\d{3}-\d{2}-\d{4}\b/g,
      /\b\d{9}\b/g
    ]);

    // Name patterns (basic - can be enhanced with NLP)
    this.patterns.set(PIIType.NAME, [
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
      /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/g // First M. Last
    ]);

    // Address patterns
    this.patterns.set(PIIType.ADDRESS, [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi
    ]);

    // Credit card patterns
    this.patterns.set(PIIType.CREDIT_CARD, [
      /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // MasterCard
      /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g // American Express
    ]);

    // Date of birth patterns
    this.patterns.set(PIIType.DATE_OF_BIRTH, [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g,
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi
    ]);

    // IP address patterns
    this.patterns.set(PIIType.IP_ADDRESS, [
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g // IPv6
    ]);
  }

  /**
   * Gets redaction placeholder for PII type
   */
  private getRedactionPlaceholder(piiType: PIIType): string {
    const placeholders = {
      [PIIType.EMAIL]: '[EMAIL_REDACTED]',
      [PIIType.PHONE]: '[PHONE_REDACTED]',
      [PIIType.SSN]: '[SSN_REDACTED]',
      [PIIType.NAME]: '[NAME_REDACTED]',
      [PIIType.ADDRESS]: '[ADDRESS_REDACTED]',
      [PIIType.CREDIT_CARD]: '[CARD_REDACTED]',
      [PIIType.DATE_OF_BIRTH]: '[DOB_REDACTED]',
      [PIIType.IP_ADDRESS]: '[IP_REDACTED]'
    };

    return placeholders[piiType] || '[PII_REDACTED]';
  }

  /**
   * Advanced PII detection with NLP and contextual analysis
   */
  async detectAndRedactPIIAdvanced(
    text: string,
    options: {
      preserveContext?: boolean;
      replacementStrategy?: 'placeholder' | 'synthetic' | 'generalization';
      enableNLPValidation?: boolean;
      confidenceThreshold?: number;
    } = {}
  ): Promise<NLPPIIDetectionResult> {
    const {
      preserveContext = false,
      replacementStrategy = 'placeholder',
      enableNLPValidation = true,
      confidenceThreshold = 0.7
    } = options;

    // Basic PII detection
    const basicResult = await this.detectAndRedactPII(text);

    // Contextual analysis
    const contextualAnalysis = await this.performContextualAnalysis(text);

    // Advanced entity recognition
    const entities = await this.performEntityRecognition(text);

    // Enhanced redaction with context preservation
    const advancedRedaction = await this.performAdvancedRedaction(
      text,
      basicResult.detectedTypes,
      replacementStrategy,
      preserveContext
    );

    // NLP validation to reduce false positives
    let validatedTypes = basicResult.detectedTypes;
    if (enableNLPValidation) {
      validatedTypes = await this.validateWithNLP(text, basicResult.detectedTypes, confidenceThreshold);
    }

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(validatedTypes, contextualAnalysis, entities);

    const result: NLPPIIDetectionResult = {
      ...basicResult,
      detectedTypes: validatedTypes,
      contextualAnalysis: {
        ...contextualAnalysis,
        entities,
        riskScore
      },
      advancedRedaction
    };

    this.emit('piiDetected', {
      result,
      originalText: text,
      options
    });

    return result;
  }

  /**
   * Performs contextual analysis of text
   */
  private async performContextualAnalysis(text: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
  }> {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'wonderful', 'amazing'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disgusting', 'worst'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;
    
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // Topic extraction (simplified)
    const topics = this.extractTopics(text);

    return { sentiment, topics };
  }

  /**
   * Performs named entity recognition
   */
  private async performEntityRecognition(text: string): Promise<Array<{
    text: string;
    type: string;
    confidence: number;
    start: number;
    end: number;
  }>> {
    const entities: Array<{
      text: string;
      type: string;
      confidence: number;
      start: number;
      end: number;
    }> = [];

    // Person names (enhanced pattern matching)
    const namePattern = /\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/g;
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      const confidence = this.validatePersonName(match[0]);
      if (confidence > 0.5) {
        entities.push({
          text: match[0],
          type: 'PERSON',
          confidence,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }

    // Organizations
    const orgPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g;
    while ((match = orgPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'ORGANIZATION',
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Locations
    const locationPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g;
    while ((match = locationPattern.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'LOCATION',
        confidence: 0.7,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return entities;
  }

  /**
   * Validates person names using contextual clues
   */
  private validatePersonName(name: string): number {
    const commonFirstNames = ['john', 'jane', 'michael', 'sarah', 'david', 'mary', 'robert', 'jennifer'];
    const commonLastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
    
    const parts = name.toLowerCase().split(' ');
    let confidence = 0.3; // Base confidence
    
    if (parts.length >= 2) {
      if (commonFirstNames.includes(parts[0])) confidence += 0.3;
      if (commonLastNames.includes(parts[parts.length - 1])) confidence += 0.3;
    }
    
    // Check for title indicators
    const titlePattern = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam)\.?\s/i;
    if (titlePattern.test(name)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Performs advanced redaction with context preservation
   */
  private async performAdvancedRedaction(
    text: string,
    detectedTypes: PIIType[],
    strategy: 'placeholder' | 'synthetic' | 'generalization',
    preserveContext: boolean
  ): Promise<{
    preserveContext: boolean;
    replacementStrategy: 'placeholder' | 'synthetic' | 'generalization';
    redactedText: string;
  }> {
    let redactedText = text;

    for (const piiType of detectedTypes) {
      const patterns = this.patterns.get(piiType) || [];
      
      for (const patternObj of patterns) {
        const matches = text.match(patternObj.regex);
        if (matches) {
          for (const match of matches) {
            let replacement: string;
            
            switch (strategy) {
              case 'synthetic':
                replacement = this.generateSyntheticReplacement(piiType);
                break;
              case 'generalization':
                replacement = this.generateGeneralization(piiType, match);
                break;
              default:
                replacement = this.getRedactionPlaceholder(piiType);
            }

            if (preserveContext) {
              // Preserve sentence structure and context
              replacement = this.preserveContextualStructure(match, replacement);
            }

            redactedText = redactedText.replace(match, replacement);
          }
        }
      }
    }

    return {
      preserveContext,
      replacementStrategy: strategy,
      redactedText
    };
  }

  /**
   * Validates PII detections using NLP techniques
   */
  private async validateWithNLP(
    text: string,
    detectedTypes: PIIType[],
    confidenceThreshold: number
  ): Promise<PIIType[]> {
    const validatedTypes: PIIType[] = [];

    for (const piiType of detectedTypes) {
      // Check for false positive patterns
      const falsePositives = this.falsePositivePatterns.get(piiType) || [];
      let isFalsePositive = false;

      for (const fpPattern of falsePositives) {
        if (fpPattern.test(text)) {
          isFalsePositive = true;
          break;
        }
      }

      if (!isFalsePositive) {
        // Check contextual keywords
        const contextKeywords = this.contextualKeywords.get(piiType) || [];
        const hasContextualSupport = contextKeywords.some(keyword => 
          text.toLowerCase().includes(keyword.toLowerCase())
        );

        // Calculate confidence with contextual factors
        const baseConfidence = this.getConfidenceScore(piiType, '');
        const contextualBonus = hasContextualSupport ? 0.2 : 0;
        const finalConfidence = Math.min(baseConfidence + contextualBonus, 1.0);

        if (finalConfidence >= confidenceThreshold) {
          validatedTypes.push(piiType);
        }
      }
    }

    return validatedTypes;
  }

  /**
   * Calculates overall risk score
   */
  private calculateRiskScore(
    detectedTypes: PIIType[],
    contextualAnalysis: { sentiment: string; topics: string[] },
    entities: Array<{ type: string; confidence: number }>
  ): number {
    let riskScore = 0;

    // Base risk from PII types
    const piiRiskWeights = {
      [PIIType.SSN]: 0.9,
      [PIIType.CREDIT_CARD]: 0.8,
      [PIIType.EMAIL]: 0.4,
      [PIIType.PHONE]: 0.5,
      [PIIType.ADDRESS]: 0.6,
      [PIIType.NAME]: 0.3,
      [PIIType.DATE_OF_BIRTH]: 0.7,
      [PIIType.IP_ADDRESS]: 0.4
    };

    for (const piiType of detectedTypes) {
      riskScore += piiRiskWeights[piiType] || 0.3;
    }

    // Risk from entity density
    const entityRisk = Math.min(entities.length * 0.1, 0.3);
    riskScore += entityRisk;

    // Risk from sensitive topics
    const sensitiveTopics = ['medical', 'financial', 'legal', 'personal'];
    const topicRisk = contextualAnalysis.topics.filter(topic => 
      sensitiveTopics.includes(topic.toLowerCase())
    ).length * 0.1;
    riskScore += topicRisk;

    return Math.min(riskScore, 1.0);
  }

  /**
   * Extracts topics from text
   */
  private extractTopics(text: string): string[] {
    const topicKeywords = {
      'medical': ['doctor', 'hospital', 'medicine', 'health', 'treatment', 'diagnosis'],
      'financial': ['bank', 'money', 'credit', 'loan', 'payment', 'account'],
      'legal': ['court', 'lawyer', 'legal', 'contract', 'lawsuit', 'attorney'],
      'personal': ['family', 'relationship', 'private', 'personal', 'confidential'],
      'education': ['school', 'university', 'student', 'teacher', 'education', 'grade'],
      'employment': ['job', 'work', 'employer', 'salary', 'career', 'company']
    };

    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matchCount >= 2) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Generates synthetic replacement for PII
   */
  private generateSyntheticReplacement(piiType: PIIType): string {
    const generator = this.syntheticReplacements.get(piiType);
    return generator ? generator() : this.getRedactionPlaceholder(piiType);
  }

  /**
   * Generates generalization for PII
   */
  private generateGeneralization(piiType: PIIType, originalValue: string): string {
    switch (piiType) {
      case PIIType.EMAIL:
        return '[email address]';
      case PIIType.PHONE:
        return '[phone number]';
      case PIIType.ADDRESS:
        return '[street address]';
      case PIIType.NAME:
        return '[person name]';
      case PIIType.DATE_OF_BIRTH:
        return '[date of birth]';
      default:
        return '[personal information]';
    }
  }

  /**
   * Preserves contextual structure during redaction
   */
  private preserveContextualStructure(original: string, replacement: string): string {
    // Preserve capitalization pattern
    if (original[0] === original[0].toUpperCase()) {
      replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }

    // Preserve length approximately
    if (original.length > replacement.length + 5) {
      replacement += ' '.repeat(Math.min(original.length - replacement.length, 10));
    }

    return replacement;
  }

  /**
   * Initializes contextual keywords for each PII type
   */
  private initializeContextualKeywords(): void {
    this.contextualKeywords.set(PIIType.EMAIL, [
      'email', 'e-mail', 'contact', 'send', 'message', 'address'
    ]);
    
    this.contextualKeywords.set(PIIType.PHONE, [
      'phone', 'call', 'number', 'contact', 'mobile', 'cell'
    ]);
    
    this.contextualKeywords.set(PIIType.ADDRESS, [
      'address', 'street', 'home', 'live', 'residence', 'location'
    ]);
    
    this.contextualKeywords.set(PIIType.NAME, [
      'name', 'called', 'person', 'individual', 'mr', 'mrs', 'ms', 'dr'
    ]);
  }

  /**
   * Initializes false positive patterns
   */
  private initializeFalsePositivePatterns(): void {
    // Common false positives for phone numbers
    this.falsePositivePatterns.set(PIIType.PHONE, [
      /\b555-0\d{3}\b/g, // Test numbers
      /\b000-000-0000\b/g, // Placeholder numbers
      /\b123-456-7890\b/g // Example numbers
    ]);

    // Common false positives for emails
    this.falsePositivePatterns.set(PIIType.EMAIL, [
      /\bexample@example\.com\b/g,
      /\btest@test\.com\b/g,
      /\buser@domain\.com\b/g
    ]);
  }

  /**
   * Initializes synthetic replacement generators
   */
  private initializeSyntheticReplacements(): void {
    this.syntheticReplacements.set(PIIType.EMAIL, () => {
      const domains = ['example.com', 'test.org', 'sample.net'];
      const users = ['user', 'person', 'individual', 'contact'];
      const user = users[Math.floor(Math.random() * users.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      return `${user}@${domain}`;
    });

    this.syntheticReplacements.set(PIIType.PHONE, () => {
      return `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
    });

    this.syntheticReplacements.set(PIIType.NAME, () => {
      const firstNames = ['John', 'Jane', 'Alex', 'Sam', 'Chris', 'Taylor'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
      const first = firstNames[Math.floor(Math.random() * firstNames.length)];
      const last = lastNames[Math.floor(Math.random() * lastNames.length)];
      return `${first} ${last}`;
    });
  }

  /**
   * Initializes PII detection patterns with enhanced rules
   */
  private initializePatterns(): void {
    // Enhanced email patterns
    this.patterns.set(PIIType.EMAIL, [{
      type: PIIType.EMAIL,
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      contextualRules: [{
        condition: (context, match) => context.toLowerCase().includes('email'),
        confidenceModifier: 0.2
      }]
    }]);

    // Enhanced phone patterns
    this.patterns.set(PIIType.PHONE, [{
      type: PIIType.PHONE,
      regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      contextualRules: [{
        condition: (context, match) => context.toLowerCase().includes('phone'),
        confidenceModifier: 0.2
      }]
    }]);

    // Continue with other patterns...
    this.patterns.set(PIIType.SSN, [{
      type: PIIType.SSN,
      regex: /\b\d{3}-\d{2}-\d{4}\b/g
    }]);

    this.patterns.set(PIIType.NAME, [{
      type: PIIType.NAME,
      regex: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      nlpValidation: (text, match) => this.validatePersonName(match) > 0.5
    }]);

    this.patterns.set(PIIType.ADDRESS, [{
      type: PIIType.ADDRESS,
      regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi
    }]);

    this.patterns.set(PIIType.CREDIT_CARD, [{
      type: PIIType.CREDIT_CARD,
      regex: /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
    }]);

    this.patterns.set(PIIType.DATE_OF_BIRTH, [{
      type: PIIType.DATE_OF_BIRTH,
      regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g
    }]);

    this.patterns.set(PIIType.IP_ADDRESS, [{
      type: PIIType.IP_ADDRESS,
      regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
    }]);
  }

  /**
   * Gets confidence score for PII detection with enhanced logic
   */
  private getConfidenceScore(piiType: PIIType, match: string, context?: string): number {
    const baseScores = {
      [PIIType.EMAIL]: 0.9,
      [PIIType.PHONE]: 0.8,
      [PIIType.SSN]: 0.95,
      [PIIType.NAME]: 0.6,
      [PIIType.ADDRESS]: 0.7,
      [PIIType.CREDIT_CARD]: 0.95,
      [PIIType.DATE_OF_BIRTH]: 0.8,
      [PIIType.IP_ADDRESS]: 0.85
    };

    let confidence = baseScores[piiType] || 0.5;

    // Apply contextual rules if available
    const patterns = this.patterns.get(piiType) || [];
    for (const pattern of patterns) {
      if (pattern.contextualRules && context) {
        for (const rule of pattern.contextualRules) {
          if (rule.condition(context, match)) {
            confidence += rule.confidenceModifier;
          }
        }
      }
    }

    // Adjust confidence based on match characteristics
    if (match.length > 20) confidence += 0.05;
    if (/\d/.test(match)) confidence += 0.05;
    if (/[A-Z]/.test(match)) confidence += 0.02;

    return Math.min(confidence, 1.0);
  }
}