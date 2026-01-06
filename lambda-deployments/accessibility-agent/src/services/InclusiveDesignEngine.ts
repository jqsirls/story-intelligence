import { SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  AdaptationError,
} from '../types';

interface VoicePaceConfig {
  baseRate: number; // Words per minute
  pauseDuration: number; // Milliseconds between sentences
  emphasisDuration: number; // Extra pause for emphasis
  breathingPauses: boolean; // Add natural breathing pauses
}

interface VisualCueConfig {
  enabled: boolean;
  cueTypes: ('emoji' | 'icons' | 'colors' | 'formatting')[];
  intensity: 'subtle' | 'moderate' | 'prominent';
  customCues: Record<string, string>;
}

interface SimplifiedLanguageConfig {
  maxWordsPerSentence: number;
  maxSyllablesPerWord: number;
  avoidComplexGrammar: boolean;
  useActiveVoice: boolean;
  addDefinitions: boolean;
}

interface ExtendedTimeoutConfig {
  inputTimeout: number; // Milliseconds to wait for input
  processingTimeout: number; // Extra time for processing
  confirmationTimeout: number; // Time to wait for confirmations
  adaptiveTimeout: boolean; // Adjust based on user patterns
}

export class InclusiveDesignEngine {
  private voicePaceCache: Map<string, VoicePaceConfig> = new Map();
  private userPatterns: Map<string, any> = new Map();

  constructor(private supabase: SupabaseClient) {}

  async adjustVoicePace(
    userId: string,
    originalText: string,
    profile: AccessibilityProfile
  ): Promise<{
    adjustedText: string;
    paceMultiplier: number;
    pauseInstructions: Array<{ position: number; duration: number; type: string }>;
  }> {
    try {
      const paceConfig = await this.getVoicePaceConfig(userId, profile);
      
      // Calculate pace adjustments
      const paceMultiplier = profile.voicePaceAdjustment;
      const adjustedText = this.addPauseMarkers(originalText, paceConfig);
      const pauseInstructions = this.generatePauseInstructions(originalText, paceConfig);

      // Log the adjustment for learning
      await this.logVoicePaceAdjustment(userId, {
        originalText,
        adjustedText,
        paceMultiplier,
        pauseCount: pauseInstructions.length,
      });

      return {
        adjustedText,
        paceMultiplier,
        pauseInstructions,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to adjust voice pace: ${message}`, { userId, originalText });
    }
  }

  async addVisualCues(
    userId: string,
    content: string,
    profile: AccessibilityProfile,
    context?: { contentType?: string; importance?: 'low' | 'medium' | 'high' }
  ): Promise<string> {
    try {
      if (!profile.visualCuesEnabled) {
        return content;
      }

      const cueConfig = await this.getVisualCueConfig(userId, profile);
      let enhancedContent = content;

      // Add emoji cues
      if (cueConfig.cueTypes.includes('emoji')) {
        enhancedContent = this.addEmojiCues(enhancedContent, cueConfig);
      }

      // Add icon cues
      if (cueConfig.cueTypes.includes('icons')) {
        enhancedContent = this.addIconCues(enhancedContent, cueConfig);
      }

      // Add color cues (for screen devices)
      if (cueConfig.cueTypes.includes('colors')) {
        enhancedContent = this.addColorCues(enhancedContent, cueConfig, context);
      }

      // Add formatting cues
      if (cueConfig.cueTypes.includes('formatting')) {
        enhancedContent = this.addFormattingCues(enhancedContent, cueConfig);
      }

      // Apply custom cues
      enhancedContent = this.applyCustomCues(enhancedContent, cueConfig.customCues);

      return enhancedContent;
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to add visual cues: ${message}`, { userId, content });
    }
  }

  async simplifyLanguage(
    userId: string,
    text: string,
    profile: AccessibilityProfile,
    targetLevel?: 'basic' | 'intermediate' | 'advanced'
  ): Promise<{
    simplifiedText: string;
    readabilityScore: number;
    simplifications: Array<{ original: string; simplified: string; reason: string }>;
  }> {
    try {
      if (!profile.simplifiedLanguageMode && !targetLevel) {
        return {
          simplifiedText: text,
          readabilityScore: this.calculateReadabilityScore(text),
          simplifications: [],
        };
      }

      const languageConfig = await this.getSimplifiedLanguageConfig(userId, profile, targetLevel);
      const simplifications: Array<{ original: string; simplified: string; reason: string }> = [];
      
      let simplifiedText = text;

      // Simplify sentence structure
      const { text: restructuredText, changes: structureChanges } = this.simplifysentenceStructure(simplifiedText, languageConfig);
      simplifiedText = restructuredText;
      simplifications.push(...structureChanges);

      // Simplify vocabulary
      const { text: vocabularyText, changes: vocabularyChanges } = await this.simplifyVocabulary(simplifiedText, languageConfig);
      simplifiedText = vocabularyText;
      simplifications.push(...vocabularyChanges);

      // Add definitions for complex terms
      if (languageConfig.addDefinitions) {
        simplifiedText = await this.addDefinitions(simplifiedText, profile);
      }

      // Convert to active voice
      if (languageConfig.useActiveVoice) {
        const { text: activeText, changes: voiceChanges } = this.convertToActiveVoice(simplifiedText);
        simplifiedText = activeText;
        simplifications.push(...voiceChanges);
      }

      const readabilityScore = this.calculateReadabilityScore(simplifiedText);

      // Log the simplification for learning
      await this.logLanguageSimplification(userId, {
        originalText: text,
        simplifiedText,
        readabilityScore,
        simplificationCount: simplifications.length,
      });

      return {
        simplifiedText,
        readabilityScore,
        simplifications,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to simplify language: ${message}`, { userId, text });
    }
  }

  async configureExtendedTimeouts(
    userId: string,
    profile: AccessibilityProfile,
    interactionType: 'input' | 'processing' | 'confirmation' | 'general'
  ): Promise<ExtendedTimeoutConfig> {
    try {
      const baseTimeouts = {
        input: 10000,
        processing: 5000,
        confirmation: 15000,
        general: 8000,
      };

      const config: ExtendedTimeoutConfig = {
        inputTimeout: baseTimeouts.input,
        processingTimeout: baseTimeouts.processing,
        confirmationTimeout: baseTimeouts.confirmation,
        adaptiveTimeout: profile.extendedTimeouts,
      };

      if (profile.extendedTimeouts) {
        // Apply extended timeouts based on profile
        const multiplier = profile.motorDifficultySupport ? 2.0 : 1.5;
        
        config.inputTimeout = Math.max(profile.customTimeoutDuration, baseTimeouts.input * multiplier);
        config.processingTimeout = baseTimeouts.processing * multiplier;
        config.confirmationTimeout = baseTimeouts.confirmation * multiplier;
      }

      // Apply adaptive timeouts based on user patterns
      if (config.adaptiveTimeout) {
        const userPattern = await this.getUserInteractionPattern(userId);
        if (userPattern) {
          config.inputTimeout = Math.max(config.inputTimeout, userPattern.averageResponseTime * 1.2);
          config.processingTimeout = Math.max(config.processingTimeout, userPattern.averageProcessingTime * 1.1);
        }
      }

      return config;
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to configure extended timeouts: ${message}`, { userId, interactionType });
    }
  }

  async enableMultiModalSupport(
    userId: string,
    profile: AccessibilityProfile,
    availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[]
  ): Promise<{
    recommendedModalities: string[];
    fallbackSequence: string[];
    adaptationSettings: Record<string, any>;
  }> {
    try {
      const recommendedModalities: string[] = [];
      const fallbackSequence: string[] = [];
      const adaptationSettings: Record<string, any> = {};

      // Analyze profile to recommend modalities
      if (profile.alternativeInputMethods.length > 0) {
        for (const method of profile.alternativeInputMethods) {
          if (availableModalities.includes(method as any)) {
            recommendedModalities.push(method);
          }
        }
      }

      // Add voice if no speech difficulties
      if (!profile.extendedResponseTime && availableModalities.includes('voice')) {
        recommendedModalities.unshift('voice');
      }

      // Configure fallback sequence
      if (profile.motorDifficultySupport) {
        fallbackSequence.push('voice', 'eye_tracking', 'switch');
      } else {
        fallbackSequence.push('voice', 'touch', 'gesture');
      }

      // Filter fallback sequence to only available modalities
      const filteredFallback = fallbackSequence.filter(modality => 
        availableModalities.includes(modality as any)
      );

      // Configure adaptation settings for each modality
      for (const modality of availableModalities) {
        if (recommendedModalities.includes(modality) || filteredFallback.includes(modality)) {
          adaptationSettings[modality] = this.getModalityAdaptationSettings(modality, profile);
        }
      }

      return {
        recommendedModalities,
        fallbackSequence: filteredFallback,
        adaptationSettings,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to enable multi-modal support: ${message}`, { userId, availableModalities });
    }
  }

  async generateAccessibilityReport(userId: string): Promise<{
    profileSummary: any;
    adaptationUsage: any;
    effectivenessMetrics: any;
    recommendations: string[];
  }> {
    try {
      // Get profile summary
      const profile = await this.getUserProfile(userId);
      const profileSummary = {
        activeFeatures: this.getActiveFeatures(profile),
        difficultyAreas: this.identifyDifficultyAreas(profile),
        preferredInteractionStyle: profile?.preferredInteractionStyle,
      };

      // Get adaptation usage statistics
      const adaptationUsage = await this.getAdaptationUsageStats(userId);

      // Calculate effectiveness metrics
      const effectivenessMetrics = await this.calculateEffectivenessMetrics(userId);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(userId, profile, effectivenessMetrics);

      return {
        profileSummary,
        adaptationUsage,
        effectivenessMetrics,
        recommendations,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to generate accessibility report: ${message}`, { userId });
    }
  }

  // Private helper methods
  private async getVoicePaceConfig(userId: string, profile: AccessibilityProfile): Promise<VoicePaceConfig> {
    const cached = this.voicePaceCache.get(userId);
    if (cached) return cached;

    const config: VoicePaceConfig = {
      baseRate: 150, // Default words per minute
      pauseDuration: 500, // Default pause between sentences
      emphasisDuration: 800, // Extra pause for emphasis
      breathingPauses: true,
    };

    // Adjust based on profile
    if (profile.voicePaceAdjustment < 1.0) {
      config.baseRate = Math.round(config.baseRate * profile.voicePaceAdjustment);
      config.pauseDuration = Math.round(config.pauseDuration / profile.voicePaceAdjustment);
    }

    if (profile.speechProcessingDelay > 0) {
      config.pauseDuration += profile.speechProcessingDelay / 2;
      config.emphasisDuration += profile.speechProcessingDelay;
    }

    this.voicePaceCache.set(userId, config);
    return config;
  }

  private async getVisualCueConfig(userId: string, profile: AccessibilityProfile): Promise<VisualCueConfig> {
    return {
      enabled: profile.visualCuesEnabled,
      cueTypes: ['emoji', 'icons', 'formatting'],
      intensity: profile.highContrastMode ? 'prominent' : 'moderate',
      customCues: {}, // Would be loaded from user preferences
    };
  }

  private async getSimplifiedLanguageConfig(
    userId: string,
    profile: AccessibilityProfile,
    targetLevel?: string
  ): Promise<SimplifiedLanguageConfig> {
    const baseConfig: SimplifiedLanguageConfig = {
      maxWordsPerSentence: 15,
      maxSyllablesPerWord: 3,
      avoidComplexGrammar: true,
      useActiveVoice: true,
      addDefinitions: false,
    };

    // Adjust based on vocabulary level
    switch (profile.vocabularyLevel) {
      case 'simple':
        baseConfig.maxWordsPerSentence = 10;
        baseConfig.maxSyllablesPerWord = 2;
        baseConfig.addDefinitions = true;
        break;
      case 'advanced':
        baseConfig.maxWordsPerSentence = 20;
        baseConfig.maxSyllablesPerWord = 4;
        baseConfig.avoidComplexGrammar = false;
        break;
    }

    return baseConfig;
  }

  private addPauseMarkers(text: string, config: VoicePaceConfig): string {
    let markedText = text;

    // Add pause markers after sentences
    markedText = markedText.replace(/([.!?])\s+/g, `$1 <pause:${config.pauseDuration}ms> `);

    // Add emphasis pauses
    markedText = markedText.replace(/\*\*(.*?)\*\*/g, `<pause:${config.emphasisDuration}ms> $1 <pause:${config.emphasisDuration}ms>`);

    // Add breathing pauses for long sentences
    if (config.breathingPauses) {
      markedText = markedText.replace(/,\s+/g, ', <pause:200ms> ');
    }

    return markedText;
  }

  private generatePauseInstructions(text: string, config: VoicePaceConfig): Array<{ position: number; duration: number; type: string }> {
    const instructions: Array<{ position: number; duration: number; type: string }> = [];
    
    // Find sentence endings
    const sentenceRegex = /[.!?]/g;
    let match;
    while ((match = sentenceRegex.exec(text)) !== null) {
      instructions.push({
        position: match.index + 1,
        duration: config.pauseDuration,
        type: 'sentence_end',
      });
    }

    // Find comma pauses
    const commaRegex = /,/g;
    while ((match = commaRegex.exec(text)) !== null) {
      instructions.push({
        position: match.index + 1,
        duration: 200,
        type: 'comma_pause',
      });
    }

    return instructions.sort((a, b) => a.position - b.position);
  }

  private addEmojiCues(content: string, config: VisualCueConfig): string {
    const emojiMap: Record<string, string> = {
      'question': '❓',
      'important': '⚠️',
      'good': '✅',
      'bad': '❌',
      'happy': '😊',
      'sad': '😢',
      'excited': '🎉',
      'thinking': '🤔',
      'story': '📚',
      'character': '👤',
    };

    let enhanced = content;
    for (const [keyword, emoji] of Object.entries(emojiMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      enhanced = enhanced.replace(regex, `${emoji} ${keyword}`);
    }

    return enhanced;
  }

  private addIconCues(content: string, config: VisualCueConfig): string {
    // Add text-based icons for better screen reader compatibility
    const iconMap: Record<string, string> = {
      'start': '[START]',
      'end': '[END]',
      'next': '[NEXT]',
      'previous': '[BACK]',
      'menu': '[MENU]',
      'help': '[HELP]',
    };

    let enhanced = content;
    for (const [keyword, icon] of Object.entries(iconMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      enhanced = enhanced.replace(regex, `${icon} ${keyword}`);
    }

    return enhanced;
  }

  private addColorCues(content: string, config: VisualCueConfig, context?: any): string {
    // Add color coding for different types of content
    if (context?.importance === 'high') {
      return `<span style="color: red; font-weight: bold;">${content}</span>`;
    } else if (context?.contentType === 'instruction') {
      return `<span style="color: blue;">${content}</span>`;
    } else if (context?.contentType === 'confirmation') {
      return `<span style="color: green;">${content}</span>`;
    }

    return content;
  }

  private addFormattingCues(content: string, config: VisualCueConfig): string {
    // Add formatting for better visual structure
    let formatted = content;

    // Make questions bold
    formatted = formatted.replace(/\?/g, '**?**');

    // Add line breaks for better readability
    formatted = formatted.replace(/([.!?])\s+/g, '$1\n\n');

    return formatted;
  }

  private applyCustomCues(content: string, customCues: Record<string, string>): string {
    let enhanced = content;
    for (const [trigger, cue] of Object.entries(customCues)) {
      const regex = new RegExp(`\\b${trigger}\\b`, 'gi');
      enhanced = enhanced.replace(regex, `${cue} ${trigger}`);
    }
    return enhanced;
  }

  private simplifysentenceStructure(
    text: string,
    config: SimplifiedLanguageConfig
  ): { text: string; changes: Array<{ original: string; simplified: string; reason: string }> } {
    const changes: Array<{ original: string; simplified: string; reason: string }> = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const simplifiedSentences: string[] = [];

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/);
      
      if (words.length > config.maxWordsPerSentence) {
        // Break long sentences
        const breakPoint = Math.floor(config.maxWordsPerSentence / 2);
        const firstPart = words.slice(0, breakPoint).join(' ');
        const secondPart = words.slice(breakPoint).join(' ');
        
        simplifiedSentences.push(firstPart + '.');
        simplifiedSentences.push(secondPart + '.');
        
        changes.push({
          original: sentence.trim(),
          simplified: `${firstPart}. ${secondPart}`,
          reason: 'Broke long sentence for better comprehension',
        });
      } else {
        simplifiedSentences.push(sentence.trim() + '.');
      }
    }

    return {
      text: simplifiedSentences.join(' '),
      changes,
    };
  }

  private async simplifyVocabulary(
    text: string,
    config: SimplifiedLanguageConfig
  ): Promise<{ text: string; changes: Array<{ original: string; simplified: string; reason: string }> }> {
    const changes: Array<{ original: string; simplified: string; reason: string }> = [];
    const vocabularyMap: Record<string, string> = {
      'utilize': 'use',
      'demonstrate': 'show',
      'facilitate': 'help',
      'implement': 'do',
      'subsequently': 'then',
      'approximately': 'about',
      'magnificent': 'great',
      'extraordinarily': 'amazing',
      'tremendously': 'big',
    };

    let simplifiedText = text;
    for (const [complex, simple] of Object.entries(vocabularyMap)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      if (regex.test(simplifiedText)) {
        simplifiedText = simplifiedText.replace(regex, simple);
        changes.push({
          original: complex,
          simplified: simple,
          reason: 'Simplified complex vocabulary',
        });
      }
    }

    return { text: simplifiedText, changes };
  }

  private async addDefinitions(text: string, profile: AccessibilityProfile): Promise<string> {
    // Add simple definitions for potentially complex terms
    const definitionMap: Record<string, string> = {
      'character': 'character (the person in the story)',
      'adventure': 'adventure (an exciting trip)',
      'mysterious': 'mysterious (strange and unknown)',
      'journey': 'journey (a long trip)',
    };

    let definedText = text;
    for (const [term, definition] of Object.entries(definitionMap)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      definedText = definedText.replace(regex, definition);
    }

    return definedText;
  }

  private convertToActiveVoice(
    text: string
  ): { text: string; changes: Array<{ original: string; simplified: string; reason: string }> } {
    const changes: Array<{ original: string; simplified: string; reason: string }> = [];
    
    // Simple passive to active voice conversions
    const passivePatterns: Array<{ pattern: RegExp; replacement: string }> = [
      {
        pattern: /was created by/gi,
        replacement: 'created',
      },
      {
        pattern: /is being done by/gi,
        replacement: 'is doing',
      },
      {
        pattern: /will be made by/gi,
        replacement: 'will make',
      },
    ];

    let activeText = text;
    for (const { pattern, replacement } of passivePatterns) {
      if (pattern.test(activeText)) {
        const original = activeText.match(pattern)?.[0] || '';
        activeText = activeText.replace(pattern, replacement);
        if (original) {
          changes.push({
            original,
            simplified: replacement,
            reason: 'Converted passive voice to active voice',
          });
        }
      }
    }

    return { text: activeText, changes };
  }

  private calculateReadabilityScore(text: string): number {
    // Simple readability calculation (Flesch Reading Ease approximation)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const avgSentenceLength = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    // Simplified Flesch Reading Ease formula
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
    
    // Normalize to 0-1 scale
    return Math.max(0, Math.min(1, score / 100));
  }

  private countSyllables(text: string): number {
    // Simple syllable counting
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      const vowels = word.match(/[aeiouy]+/g);
      let syllables = vowels ? vowels.length : 1;
      
      // Adjust for silent e
      if (word.endsWith('e') && syllables > 1) {
        syllables--;
      }
      
      totalSyllables += Math.max(1, syllables);
    }

    return totalSyllables;
  }

  private getModalityAdaptationSettings(modality: string, profile: AccessibilityProfile): any {
    const settings: Record<string, any> = {};

    switch (modality) {
      case 'voice':
        settings.paceAdjustment = profile.voicePaceAdjustment;
        settings.processingDelay = profile.speechProcessingDelay;
        settings.extendedTimeout = profile.extendedResponseTime;
        break;
      case 'touch':
        settings.extendedTimeout = profile.extendedTimeouts;
        settings.motorSupport = profile.motorDifficultySupport;
        settings.customTimeout = profile.customTimeoutDuration;
        break;
      case 'gesture':
        settings.extendedTimeout = profile.extendedTimeouts;
        settings.simplifiedGestures = profile.motorDifficultySupport;
        break;
      case 'switch':
        settings.switchSupport = profile.switchControlSupport;
        settings.customTimeout = profile.customTimeoutDuration;
        break;
      case 'eye_tracking':
        settings.eyeTrackingSupport = profile.eyeTrackingSupport;
        settings.dwellTime = profile.customTimeoutDuration / 2;
        break;
    }

    return settings;
  }

  // Data access methods
  private async getUserProfile(userId: string): Promise<any> {
    const { data } = await this.supabase
      .from('accessibility_profiles')
      .select('*')
      .eq('userId', userId)
      .eq('isActive', true)
      .single();
    
    return data;
  }

  private async getUserInteractionPattern(userId: string): Promise<any> {
    // Get user interaction patterns from cache or database
    return this.userPatterns.get(userId) || null;
  }

  private getActiveFeatures(profile: any): string[] {
    if (!profile) return [];
    
    const features: string[] = [];
    if (profile.speechProcessingDelay > 0) features.push('Speech Processing Delay');
    if (profile.extendedResponseTime) features.push('Extended Response Time');
    if (profile.simplifiedLanguageMode) features.push('Simplified Language');
    if (profile.visualCuesEnabled) features.push('Visual Cues');
    if (profile.memoryAidsEnabled) features.push('Memory Aids');
    if (profile.extendedTimeouts) features.push('Extended Timeouts');
    if (profile.breakReminders) features.push('Break Reminders');
    
    return features;
  }

  private identifyDifficultyAreas(profile: any): string[] {
    if (!profile) return [];
    
    const areas: string[] = [];
    if (profile.speechProcessingDelay > 0) areas.push('Speech Processing');
    if (profile.motorDifficultySupport) areas.push('Motor Skills');
    if (profile.attentionSpanMinutes < 10) areas.push('Attention Span');
    if (profile.vocabularyLevel === 'simple') areas.push('Vocabulary Comprehension');
    
    return areas;
  }

  private async getAdaptationUsageStats(userId: string): Promise<any> {
    try {
      // Get adaptation usage statistics from database
      const { data } = await this.supabase
        .from('communication_adaptations')
        .select('adaptationType')
        .eq('userId', userId);
      
      if (!data) return [];

      // Group by adaptation type manually
      const grouped = data.reduce((acc: any, item: any) => {
        const type = item.adaptationType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(grouped).map(([adaptationType, count]) => ({
        adaptationType,
        count,
      }));
    } catch (error) {
      console.error('Failed to get adaptation usage stats:', error);
      return [];
    }
  }

  private async calculateEffectivenessMetrics(userId: string): Promise<any> {
    try {
      // Calculate effectiveness metrics
      const { data } = await this.supabase
        .from('communication_adaptations')
        .select('effectivenessScore')
        .eq('userId', userId);
      
      if (!data || data.length === 0) {
        return { averageEffectiveness: 0, totalAdaptations: 0 };
      }

      // Filter out null effectiveness scores
      const validScores = data
        .filter(d => d.effectivenessScore !== null && d.effectivenessScore !== undefined)
        .map(d => d.effectivenessScore);

      if (validScores.length === 0) {
        return { averageEffectiveness: 0, totalAdaptations: data.length };
      }

      const averageEffectiveness = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
      
      return {
        averageEffectiveness,
        totalAdaptations: data.length,
      };
    } catch (error: unknown) {
      console.error('Failed to calculate effectiveness metrics:', error);
      return { averageEffectiveness: 0, totalAdaptations: 0 };
    }
  }

  private async generateRecommendations(userId: string, profile: any, metrics: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (!profile) {
      recommendations.push('Create an accessibility profile to get personalized adaptations');
      return recommendations;
    }

    // Analyze effectiveness and suggest improvements
    if (metrics.averageEffectiveness < 0.6) {
      recommendations.push('Consider adjusting accessibility settings - current effectiveness is below optimal');
    }

    if (profile.attentionSpanMinutes < 10 && !profile.breakReminders) {
      recommendations.push('Enable break reminders to help maintain focus during longer sessions');
    }

    if (profile.vocabularyLevel === 'simple' && !profile.memoryAidsEnabled) {
      recommendations.push('Enable memory aids to help with story comprehension and retention');
    }

    if (profile.motorDifficultySupport && !profile.extendedTimeouts) {
      recommendations.push('Enable extended timeouts to allow more time for input');
    }

    if (!profile.visualCuesEnabled && profile.simplifiedLanguageMode) {
      recommendations.push('Consider enabling visual cues to complement simplified language');
    }

    return recommendations;
  }

  // Logging methods
  private async logVoicePaceAdjustment(userId: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('voice_pace_adjustments')
        .insert({
          userId,
          ...data,
          timestamp: new Date(),
        });
    } catch (error: unknown) {
      console.error('Failed to log voice pace adjustment:', error);
    }
  }

  private async logLanguageSimplification(userId: string, data: any): Promise<void> {
    try {
      await this.supabase
        .from('language_simplifications')
        .insert({
          userId,
          ...data,
          timestamp: new Date(),
        });
    } catch (error: unknown) {
      console.error('Failed to log language simplification:', error);
    }
  }
}