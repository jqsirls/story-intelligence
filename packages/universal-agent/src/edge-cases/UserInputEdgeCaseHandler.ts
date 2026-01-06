import { EventEmitter } from 'events';
import { ConversationContext, UserInput, InputConflict, ConflictResolution } from '../types';
// TODO: Re-enable when @alexa-multi-agent/kid-communication-intelligence package is available
// import { KidCommunicationIntelligenceService } from '@alexa-multi-agent/kid-communication-intelligence';

// Temporary stub type to avoid compilation errors
type KidCommunicationIntelligenceService = any;


export interface ContradictoryInput {
  field: string;
  previousValue: any;
  newValue: any;
  confidence: number;
  timestamp: Date;
}

export interface AmbiguousInput {
  input: string;
  possibleInterpretations: Array<{
    interpretation: string;
    confidence: number;
    context: string;
  }>;
}

export interface EmotionalDistressSignal {
  type: 'verbal' | 'behavioral' | 'contextual';
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  confidence: number;
  recommendedResponse: string;
}

export interface MultiUserConflict {
  users: string[];
  conflictType: 'simultaneous_input' | 'contradictory_commands' | 'resource_contention';
  resolution: 'queue' | 'merge' | 'prioritize' | 'separate_sessions';
}

export class UserInputEdgeCaseHandler extends EventEmitter {
  private contradictionHistory: Map<string, ContradictoryInput[]> = new Map();
  private distressPatterns: Map<string, EmotionalDistressSignal[]> = new Map();
  private activeUsers: Map<string, { lastInput: Date; priority: number }> = new Map();
  private inappropriateContentRedirects: string[] = [
    "That's an interesting idea! Let's create something magical instead.",
    "How about we make our story even more amazing with this twist...",
    "I have a wonderful idea that might be even better for our story!",
    "Let's try something that will make our story truly special..."
  ];

  constructor() {
    super();
  }
  private kidIntelligence?: KidCommunicationIntelligenceService;


  /**
   * Resolve contradictory input with intelligent reconciliation
   */
  async resolveContradictoryInput(
    userId: string,
    currentInput: UserInput,
    context: ConversationContext
  ): Promise<ConflictResolution> {
    const contradictions = this.detectContradictions(currentInput, context);
    
    if (contradictions.length === 0) {
      return {
        strategy: 'accept',
        conflictedFields: [],
        resolution: currentInput,
        timestamp: new Date()
      };
    }

    // Store contradiction history
    if (!this.contradictionHistory.has(userId)) {
      this.contradictionHistory.set(userId, []);
    }
    this.contradictionHistory.get(userId)!.push(...contradictions);

    // Determine resolution strategy
    const strategy = this.determineContradictionStrategy(contradictions, context);
    
    switch (strategy) {
      case 'clarify':
        return await this.requestClarification(contradictions, context);
      
      case 'merge':
        return await this.mergeContradictoryInputs(contradictions, currentInput);
      
      case 'prefer_recent':
        return this.preferRecentInput(contradictions, currentInput);
      
      case 'prefer_consistent':
        return this.preferConsistentInput(contradictions, context);
      
      default:
        return this.requestUserChoice(contradictions, currentInput);
    }
  }

  /**
   * Detect contradictions in user input
   */
  private detectContradictions(
    input: UserInput,
    context: ConversationContext
  ): ContradictoryInput[] {
    const contradictions: ContradictoryInput[] = [];
    
    // Check character trait contradictions
    if (input.characterTraits && context.character) {
      for (const [field, newValue] of Object.entries(input.characterTraits)) {
        const previousValue = context.character.traits[field];
        
        if (previousValue && this.areContradictory(previousValue, newValue, field)) {
          contradictions.push({
            field,
            previousValue,
            newValue,
            confidence: this.calculateContradictionConfidence(previousValue, newValue, field),
            timestamp: new Date()
          });
        }
      }
    }

    // Check story element contradictions
    if (input.storyElements && context.story) {
      for (const [field, newValue] of Object.entries(input.storyElements)) {
        const previousValue = context.story[field];
        
        if (previousValue && this.areContradictory(previousValue, newValue, field)) {
          contradictions.push({
            field,
            previousValue,
            newValue,
            confidence: this.calculateContradictionConfidence(previousValue, newValue, field),
            timestamp: new Date()
          });
        }
      }
    }

    return contradictions;
  }

  /**
   * Check if two values are contradictory for a given field
   */
  private areContradictory(previous: any, current: any, field: string): boolean {
    // Define contradiction rules for different fields
    const contradictionRules: Record<string, (prev: any, curr: any) => boolean> = {
      species: (prev, curr) => prev !== curr && !this.areCompatibleSpecies(prev, curr),
      age: (prev, curr) => Math.abs(prev - curr) > 2,
      gender: (prev, curr) => prev !== curr,
      eyeColor: (prev, curr) => prev !== curr,
      setting: (prev, curr) => this.areIncompatibleSettings(prev, curr),
      mood: (prev, curr) => this.areOppositeEmotions(prev, curr)
    };

    const rule = contradictionRules[field];
    return rule ? rule(previous, current) : previous !== current;
  }

  /**
   * Handle ambiguous input with clarification system
   */
  async clarifyAmbiguousInput(
    input: string,
    context: ConversationContext
  ): Promise<{ clarification: string; options?: string[] }> {
    const ambiguity = this.detectAmbiguity(input, context);
    
    if (!ambiguity) {
      return { clarification: '' }; // No ambiguity detected
    }

    // Generate clarification question
    const clarification = this.generateClarificationQuestion(ambiguity, context);
    const options = ambiguity.possibleInterpretations.map(interp => interp.interpretation);

    this.emit('ambiguityDetected', { input, ambiguity, clarification });

    return { clarification, options };
  }

  /**
   * Detect ambiguity in user input
   */
  private detectAmbiguity(input: string, context: ConversationContext): AmbiguousInput | null {
    const ambiguousTerms = this.findAmbiguousTerms(input);
    
    if (ambiguousTerms.length === 0) {
      return null;
    }

    const interpretations = this.generateInterpretations(input, ambiguousTerms, context);
    
    if (interpretations.length < 2) {
      return null; // Not ambiguous if only one interpretation
    }

    return {
      input,
      possibleInterpretations: interpretations
    };
  }

  /**
   * Redirect inappropriate content while maintaining engagement
   */
  async redirectInappropriateContent(
    input: string,
    context: ConversationContext
  ): Promise<{ redirect: string; alternativeContent: any }> {
    const inappropriateElements = this.detectInappropriateContent(input);
    
    if (inappropriateElements.length === 0) {
      return { redirect: '', alternativeContent: null };
    }

    // Choose appropriate redirect message
    const redirect = this.selectRedirectMessage(inappropriateElements, context);
    
    // Generate alternative content
    const alternativeContent = await this.generateAlternativeContent(
      input,
      inappropriateElements,
      context
    );

    this.emit('contentRedirected', { 
      originalInput: input, 
      inappropriateElements, 
      redirect, 
      alternativeContent 
    });

    return { redirect, alternativeContent };
  }

  /**
   * Process non-standard language patterns
   */
  async processNonStandardLanguage(
    input: string,
    context: ConversationContext
  ): Promise<{ normalized: string; confidence: number }> {
    // Detect various non-standard patterns
    const patterns = {
      childSpeak: this.detectChildSpeak(input),
      slang: this.detectSlang(input),
      incomplete: this.detectIncompleteThoughts(input),
      repetitive: this.detectRepetitivePatterns(input),
      emotional: this.detectEmotionalLanguage(input)
    };

    let normalized = input;
    let confidence = 1.0;

    // Apply normalization for each detected pattern
    for (const [patternType, detected] of Object.entries(patterns)) {
      if (detected.confidence > 0.7) {
        const normalization = await this.normalizePattern(input, patternType, detected);
        normalized = normalization.text;
        confidence *= normalization.confidence;
      }
    }

    return { normalized, confidence };
  }

  /**
   * Detect and respond to emotional distress
   */
  async detectEmotionalDistress(
    input: string,
    context: ConversationContext,
    userId: string
  ): Promise<EmotionalDistressSignal | null> {
    const distressIndicators = this.analyzeDistressSignals(input, context);
    
    if (distressIndicators.length === 0) {
      return null;
    }

    const severity = this.calculateDistressSeverity(distressIndicators);
    const signal: EmotionalDistressSignal = {
      type: this.categorizeDistressType(distressIndicators),
      severity,
      indicators: distressIndicators,
      confidence: this.calculateDistressConfidence(distressIndicators),
      recommendedResponse: this.generateDistressResponse(severity, distressIndicators)
    };

    // Store distress pattern
    if (!this.distressPatterns.has(userId)) {
      this.distressPatterns.set(userId, []);
    }
    this.distressPatterns.get(userId)!.push(signal);

    // Emit alert for high severity
    if (severity === 'high' || severity === 'critical') {
      this.emit('distressAlert', { userId, signal });
    }

    return signal;
  }

  /**
   * Resolve multi-user conflicts on shared devices
   */
  async resolveMultiUserConflict(
    users: string[],
    inputs: UserInput[],
    context: ConversationContext
  ): Promise<MultiUserConflict> {
    const conflictType = this.identifyConflictType(users, inputs);
    const resolution = this.determineMultiUserResolution(conflictType, users, inputs, context);

    const conflict: MultiUserConflict = {
      users,
      conflictType,
      resolution
    };

    // Apply resolution strategy
    switch (resolution) {
      case 'queue':
        await this.queueUserInputs(users, inputs);
        break;
      
      case 'merge':
        await this.mergeUserInputs(users, inputs, context);
        break;
      
      case 'prioritize':
        await this.prioritizeUserInput(users, inputs, context);
        break;
      
      case 'separate_sessions':
        await this.createSeparateSessions(users, context);
        break;
    }

    this.emit('multiUserConflictResolved', conflict);
    return conflict;
  }

  // Helper methods for contradiction resolution
  private determineContradictionStrategy(
    contradictions: ContradictoryInput[],
    context: ConversationContext
  ): string {
    // High confidence contradictions need clarification
    if (contradictions.some(c => c.confidence > 0.8)) {
      return 'clarify';
    }

    // Multiple contradictions suggest confusion
    if (contradictions.length > 2) {
      return 'clarify';
    }

    // Recent inputs with low confidence can be merged
    if (contradictions.every(c => c.confidence < 0.6)) {
      return 'merge';
    }

    return 'prefer_recent';
  }

  private async requestClarification(
    contradictions: ContradictoryInput[],
    context: ConversationContext
  ): Promise<ConflictResolution> {
    const clarificationText = this.generateContradictionClarification(contradictions);
    
    return {
      strategy: 'clarify',
      conflictedFields: contradictions.map(c => c.field),
      resolution: { clarificationRequired: true, text: clarificationText },
      timestamp: new Date()
    };
  }

  private generateContradictionClarification(contradictions: ContradictoryInput[]): string {
    if (contradictions.length === 1) {
      const c = contradictions[0];
      return `I want to make sure I understand correctly. Earlier you said your character's ${c.field} was ${c.previousValue}, but now you're saying ${c.newValue}. Which would you like for your story?`;
    }

    return `I noticed a few different details about your character. Let's make sure I have everything right. Which of these would you like to keep?`;
  }

  // Helper methods for ambiguity handling
  private findAmbiguousTerms(input: string): string[] {
    const ambiguousWords = [
      'big', 'small', 'nice', 'pretty', 'cool', 'awesome',
      'thing', 'stuff', 'it', 'that', 'there'
    ];
    
    return ambiguousWords.filter(word => 
      input.toLowerCase().includes(word.toLowerCase())
    );
  }

  private generateInterpretations(
    input: string,
    ambiguousTerms: string[],
    context: ConversationContext
  ): Array<{ interpretation: string; confidence: number; context: string }> {
    // Generate multiple interpretations based on context
    const interpretations = [];
    
    for (const term of ambiguousTerms) {
      const contextualMeanings = this.getContextualMeanings(term, context);
      interpretations.push(...contextualMeanings);
    }
    
    return interpretations.slice(0, 3); // Limit to top 3 interpretations
  }

  private getContextualMeanings(
    term: string,
    context: ConversationContext
  ): Array<{ interpretation: string; confidence: number; context: string }> {
    // Context-specific interpretations
    const meanings: Record<string, any> = {
      'big': [
        { interpretation: 'tall', confidence: 0.8, context: 'physical description' },
        { interpretation: 'important', confidence: 0.6, context: 'story role' },
        { interpretation: 'older', confidence: 0.7, context: 'age description' }
      ],
      'cool': [
        { interpretation: 'temperature cold', confidence: 0.5, context: 'weather/environment' },
        { interpretation: 'awesome/impressive', confidence: 0.9, context: 'character trait' },
        { interpretation: 'calm/collected', confidence: 0.7, context: 'personality' }
      ]
    };

    return meanings[term.toLowerCase()] || [];
  }

  // Helper methods for inappropriate content handling
  private detectInappropriateContent(input: string): string[] {
    const inappropriate = [];
    
    // Violence indicators
    if (this.containsViolence(input)) {
      inappropriate.push('violence');
    }
    
    // Scary content for young children
    if (this.containsScaryContent(input)) {
      inappropriate.push('scary');
    }
    
    // Adult themes
    if (this.containsAdultThemes(input)) {
      inappropriate.push('adult_themes');
    }
    
    return inappropriate;
  }

  private containsViolence(input: string): boolean {
    const violentWords = ['fight', 'kill', 'hurt', 'blood', 'weapon', 'war'];
    return violentWords.some(word => input.toLowerCase().includes(word));
  }

  private containsScaryContent(input: string): boolean {
    const scaryWords = ['monster', 'ghost', 'scary', 'nightmare', 'dark', 'afraid'];
    return scaryWords.some(word => input.toLowerCase().includes(word));
  }

  private containsAdultThemes(input: string): boolean {
    // Implementation for adult theme detection
    return false; // Placeholder
  }

  private selectRedirectMessage(
    inappropriateElements: string[],
    context: ConversationContext
  ): string {
    // Select appropriate redirect based on context and child's age
    const age = context.user?.age || 6;
    
    if (age < 5) {
      return "Let's make something happy and fun instead!";
    } else if (age < 8) {
      return "That's an interesting idea! How about we make it more magical?";
    } else {
      return "I have an even better idea that will make our story amazing!";
    }
  }

  private async generateAlternativeContent(
    originalInput: string,
    inappropriateElements: string[],
    context: ConversationContext
  ): Promise<any> {
    // Generate age-appropriate alternatives
    const alternatives: Record<string, string> = {
      'violence': 'friendly competition',
      'scary': 'mysterious adventure',
      'adult_themes': 'grown-up responsibility'
    };

    let alternativeText = originalInput;
    for (const element of inappropriateElements) {
      const alternative = alternatives[element];
      if (alternative) {
        alternativeText = this.replaceInappropriateContent(alternativeText, element, alternative);
      }
    }

    return { text: alternativeText, type: 'alternative_content' };
  }

  private replaceInappropriateContent(text: string, inappropriate: string, alternative: string): string {
    // Simple replacement logic - in production, this would be more sophisticated
    return text.replace(new RegExp(inappropriate, 'gi'), alternative);
  }

  // Helper methods for distress detection
  private analyzeDistressSignals(input: string, context: ConversationContext): string[] {
    const signals = [];
    
    // Emotional distress words
    const distressWords = ['sad', 'scared', 'angry', 'hurt', 'lonely', 'worried', 'upset'];
    if (distressWords.some(word => input.toLowerCase().includes(word))) {
      signals.push('emotional_language');
    }
    
    // Repetitive patterns might indicate distress
    if (this.hasRepetitivePattern(input)) {
      signals.push('repetitive_speech');
    }
    
    // Sudden topic changes
    if (this.hasSuddenTopicChange(input, context)) {
      signals.push('topic_avoidance');
    }
    
    return signals;
  }

  private calculateDistressSeverity(indicators: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (indicators.length >= 4) return 'critical';
    if (indicators.length >= 3) return 'high';
    if (indicators.length >= 2) return 'medium';
    return 'low';
  }

  private categorizeDistressType(indicators: string[]): 'verbal' | 'behavioral' | 'contextual' {
    if (indicators.includes('emotional_language')) return 'verbal';
    if (indicators.includes('repetitive_speech')) return 'behavioral';
    return 'contextual';
  }

  private calculateDistressConfidence(indicators: string[]): number {
    // Simple confidence calculation based on number and type of indicators
    return Math.min(indicators.length * 0.25, 1.0);
  }

  private generateDistressResponse(
    severity: 'low' | 'medium' | 'high' | 'critical',
    indicators: string[]
  ): string {
    const responses = {
      low: "I can hear that you might be feeling something. Would you like to talk about it, or shall we continue with our story?",
      medium: "It sounds like you might be having some big feelings. That's okay - everyone has big feelings sometimes. Would you like to make a story about feeling better?",
      high: "I can tell you're having a hard time right now. You're safe here with me. Would you like to take a break, or would talking about it in a story help?",
      critical: "I can hear that you're really upset. It's important that you talk to a grown-up about how you're feeling. Should we pause our story so you can find someone to talk to?"
    };
    
    return responses[severity];
  }

  // Helper methods for multi-user conflict resolution
  private identifyConflictType(
    users: string[],
    inputs: UserInput[]
  ): 'simultaneous_input' | 'contradictory_commands' | 'resource_contention' {
    // Analyze timing and content to identify conflict type
    const timeDiff = this.calculateInputTimeDifference(inputs);
    
    if (timeDiff < 1000) { // Within 1 second
      return 'simultaneous_input';
    }
    
    if (this.haveContradictoryCommands(inputs)) {
      return 'contradictory_commands';
    }
    
    return 'resource_contention';
  }

  private determineMultiUserResolution(
    conflictType: string,
    users: string[],
    inputs: UserInput[],
    context: ConversationContext
  ): 'queue' | 'merge' | 'prioritize' | 'separate_sessions' {
    switch (conflictType) {
      case 'simultaneous_input':
        return users.length > 2 ? 'separate_sessions' : 'queue';
      
      case 'contradictory_commands':
        return 'prioritize';
      
      case 'resource_contention':
        return 'merge';
      
      default:
        return 'queue';
    }
  }

  // Additional helper methods
  private areCompatibleSpecies(species1: string, species2: string): boolean {
    // Define compatible species transformations
    const compatibleGroups = [
      ['human', 'elf', 'fairy'],
      ['cat', 'tiger', 'lion'],
      ['dog', 'wolf', 'fox']
    ];
    
    return compatibleGroups.some(group => 
      group.includes(species1) && group.includes(species2)
    );
  }

  private areIncompatibleSettings(setting1: string, setting2: string): boolean {
    const incompatiblePairs = [
      ['underwater', 'desert'],
      ['space', 'underground'],
      ['arctic', 'tropical']
    ];
    
    return incompatiblePairs.some(pair => 
      (pair[0] === setting1 && pair[1] === setting2) ||
      (pair[1] === setting1 && pair[0] === setting2)
    );
  }

  private areOppositeEmotions(emotion1: string, emotion2: string): boolean {
    const opposites = [
      ['happy', 'sad'],
      ['excited', 'calm'],
      ['brave', 'scared']
    ];
    
    return opposites.some(pair => 
      (pair[0] === emotion1 && pair[1] === emotion2) ||
      (pair[1] === emotion1 && pair[0] === emotion2)
    );
  }

  private calculateContradictionConfidence(
    previous: any,
    current: any,
    field: string
  ): number {
    // Calculate confidence based on how different the values are
    if (typeof previous === 'string' && typeof current === 'string') {
      const similarity = this.calculateStringSimilarity(previous, current);
      return 1 - similarity;
    }
    
    return 0.8; // Default confidence for contradictions
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Placeholder methods for non-standard language processing
  
  /**
   * Set Kid Communication Intelligence Service (optional enhancement)
   */
  // TODO: Re-enable when @alexa-multi-agent/kid-communication-intelligence package is available
  // setKidIntelligence(service: KidCommunicationIntelligenceService): void {
  //   this.kidIntelligence = service;
  // }

  private detectChildSpeak(input: string): { confidence: number; patterns: string[] } {
    const childSpeakPatterns = ['me want', 'me like', 'no no no', 'mine mine'];
    const detected = childSpeakPatterns.filter(pattern => 
      input.toLowerCase().includes(pattern)
    );
    
    return {
      confidence: detected.length > 0 ? 0.8 : 0,
      patterns: detected
    };
  }

  private detectSlang(input: string): { confidence: number; patterns: string[] } {
    return { confidence: 0, patterns: [] }; // Placeholder
  }

  private detectIncompleteThoughts(input: string): { confidence: number; patterns: string[] } {
    const incomplete = input.trim().endsWith('...') || input.split(' ').length < 3;
    return {
      confidence: incomplete ? 0.7 : 0,
      patterns: incomplete ? ['incomplete'] : []
    };
  }

  private detectRepetitivePatterns(input: string): { confidence: number; patterns: string[] } {
    const words = input.toLowerCase().split(' ');
    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const repetitive = Object.values(wordCounts).some(count => count > 2);
    return {
      confidence: repetitive ? 0.8 : 0,
      patterns: repetitive ? ['repetitive'] : []
    };
  }

  private detectEmotionalLanguage(input: string): { confidence: number; patterns: string[] } {
    const emotionalWords = ['love', 'hate', 'amazing', 'terrible', 'best', 'worst'];
    const detected = emotionalWords.filter(word => 
      input.toLowerCase().includes(word)
    );
    
    return {
      confidence: detected.length > 0 ? 0.6 : 0,
      patterns: detected
    };
  }

  private async normalizePattern(
    input: string,
    patternType: string,
    detected: any
  ): Promise<{ text: string; confidence: number }> {
    // Normalize different patterns
    switch (patternType) {
      case 'childSpeak':
        return {
          text: input.replace(/me want/gi, 'I want').replace(/me like/gi, 'I like'),
          confidence: 0.9
        };
      
      case 'incomplete':
        return {
          text: input + ' in our story',
          confidence: 0.7
        };
      
      default:
        return { text: input, confidence: 1.0 };
    }
  }

  // Additional helper methods for multi-user handling
  private calculateInputTimeDifference(inputs: UserInput[]): number {
    if (inputs.length < 2) return Infinity;
    
    const timestamps = inputs.map(input => input.timestamp?.getTime() || 0);
    return Math.max(...timestamps) - Math.min(...timestamps);
  }

  private haveContradictoryCommands(inputs: UserInput[]): boolean {
    // Check if inputs have contradictory commands
    return inputs.some((input1, i) => 
      inputs.slice(i + 1).some(input2 => 
        this.areInputsContradictory(input1, input2)
      )
    );
  }

  private areInputsContradictory(input1: UserInput, input2: UserInput): boolean {
    // Simple contradiction check
    return input1.intent !== input2.intent && 
           (input1.intent === 'stop' || input2.intent === 'stop');
  }

  private async queueUserInputs(users: string[], inputs: UserInput[]): Promise<void> {
    // Queue inputs for sequential processing
    for (let i = 0; i < users.length; i++) {
      this.activeUsers.set(users[i], {
        lastInput: new Date(),
        priority: i
      });
    }
  }

  private async mergeUserInputs(
    users: string[],
    inputs: UserInput[],
    context: ConversationContext
  ): Promise<void> {
    // Merge compatible inputs
    const mergedInput = this.combineInputs(inputs);
    this.emit('inputsMerged', { users, mergedInput });
  }

  private async prioritizeUserInput(
    users: string[],
    inputs: UserInput[],
    context: ConversationContext
  ): Promise<void> {
    // Prioritize based on user history or context
    const prioritizedUser = this.selectPriorityUser(users, context);
    this.emit('userPrioritized', { prioritizedUser, users });
  }

  private async createSeparateSessions(
    users: string[],
    context: ConversationContext
  ): Promise<void> {
    // Create separate conversation sessions
    for (const user of users) {
      this.emit('sessionCreated', { userId: user, context });
    }
  }

  private combineInputs(inputs: UserInput[]): UserInput {
    // Combine multiple inputs into one
    const combined: UserInput = {
      text: inputs.map(input => input.text).join(' and '),
      intent: inputs[0].intent, // Use first intent
      timestamp: new Date()
    };
    
    return combined;
  }

  private selectPriorityUser(users: string[], context: ConversationContext): string {
    // Select user based on priority rules
    return users[0]; // Simple: first user has priority
  }

  private hasRepetitivePattern(input: string): boolean {
    const words = input.toLowerCase().split(' ');
    const uniqueWords = new Set(words);
    return words.length > uniqueWords.size * 1.5;
  }

  private hasSuddenTopicChange(input: string, context: ConversationContext): boolean {
    // Detect if input is completely unrelated to current context
    if (!context.currentTopic) return false;
    
    const inputWords = input.toLowerCase().split(' ');
    const topicWords = context.currentTopic.toLowerCase().split(' ');
    
    const overlap = inputWords.filter(word => topicWords.includes(word));
    return overlap.length === 0 && inputWords.length > 3;
  }

  /**
   * Get contradiction history for a user
   */
  getContradictionHistory(userId: string): ContradictoryInput[] {
    return this.contradictionHistory.get(userId) || [];
  }

  /**
   * Get distress patterns for a user
   */
  getDistressPatterns(userId: string): EmotionalDistressSignal[] {
    return this.distressPatterns.get(userId) || [];
  }

  /**
   * Clear user history (for privacy compliance)
   */
  clearUserHistory(userId: string): void {
    this.contradictionHistory.delete(userId);
    this.distressPatterns.delete(userId);
    this.activeUsers.delete(userId);
  }
}