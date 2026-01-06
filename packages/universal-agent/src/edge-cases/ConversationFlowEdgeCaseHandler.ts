import { EventEmitter } from 'events';
import { ConversationContext, UserInput, ConversationState, InterruptionContext } from '../types';

export interface InterruptionDetection {
  type: 'external' | 'internal' | 'user_initiated' | 'system_initiated';
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  timestamp: Date;
  context: any;
  resumptionStrategy: 'immediate' | 'delayed' | 'contextual' | 'restart';
}

export interface TangentManagement {
  originalTopic: string;
  tangentTopic: string;
  relevanceScore: number;
  redirectionStrategy: 'gentle_redirect' | 'incorporate_tangent' | 'acknowledge_and_return' | 'follow_tangent';
  maxTangentDepth: number;
  currentDepth: number;
}

export interface AttentionLossSignal {
  indicators: string[];
  confidence: number;
  duration: number;
  recoveryStrategy: 'engagement_boost' | 'topic_change' | 'break_suggestion' | 'interactive_element';
  previousAttempts: number;
}

export interface ConversationAbandonment {
  abandonmentType: 'gradual' | 'sudden' | 'distraction' | 'completion';
  lastInteraction: Date;
  contextSnapshot: ConversationContext;
  resumptionPrompt: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContextCorruption {
  corruptedElements: string[];
  severity: 'minor' | 'moderate' | 'severe';
  recoveryMethod: 'partial_recovery' | 'context_rebuild' | 'user_confirmation' | 'fresh_start';
  backupAvailable: boolean;
}

export class ConversationFlowEdgeCaseHandler extends EventEmitter {
  private activeInterruptions: Map<string, InterruptionDetection> = new Map();
  private tangentHistory: Map<string, TangentManagement[]> = new Map();
  private attentionPatterns: Map<string, AttentionLossSignal[]> = new Map();
  private abandonedSessions: Map<string, ConversationAbandonment> = new Map();
  private contextBackups: Map<string, ConversationContext[]> = new Map();
  private engagementStrategies: string[] = [
    'ask_direct_question',
    'introduce_surprise_element',
    'change_narrative_pace',
    'add_interactive_choice',
    'use_humor',
    'reference_user_interests'
  ];

  constructor() {
    super();
    this.initializeEngagementMonitoring();
  }

  /**
   * Initialize engagement monitoring
   */
  private initializeEngagementMonitoring(): void {
    // Monitor for engagement patterns every 30 seconds
    setInterval(() => {
      this.analyzeEngagementPatterns();
    }, 30000);
  }

  /**
   * Detect and handle conversation interruptions
   */
  async detectInterruption(
    userId: string,
    context: ConversationContext,
    interruptionSignal: any
  ): Promise<InterruptionDetection> {
    const interruption = this.analyzeInterruption(interruptionSignal, context);
    this.activeInterruptions.set(userId, interruption);

    // Handle interruption based on type and severity
    switch (interruption.type) {
      case 'external':
        await this.handleExternalInterruption(userId, interruption, context);
        break;
      
      case 'user_initiated':
        await this.handleUserInitiatedInterruption(userId, interruption, context);
        break;
      
      case 'system_initiated':
        await this.handleSystemInterruption(userId, interruption, context);
        break;
      
      case 'internal':
        await this.handleInternalInterruption(userId, interruption, context);
        break;
    }

    this.emit('interruptionDetected', { userId, interruption });
    return interruption;
  }

  /**
   * Gracefully resume conversation after interruption
   */
  async resumeConversation(
    userId: string,
    context: ConversationContext
  ): Promise<{ resumptionPrompt: string; contextRestored: boolean }> {
    const interruption = this.activeInterruptions.get(userId);
    
    if (!interruption) {
      return {
        resumptionPrompt: "Welcome back! Let's continue our story.",
        contextRestored: true
      };
    }

    let resumptionPrompt: string;
    let contextRestored = true;

    switch (interruption.resumptionStrategy) {
      case 'immediate':
        resumptionPrompt = await this.generateImmediateResumption(context);
        break;
      
      case 'delayed':
        resumptionPrompt = await this.generateDelayedResumption(context, interruption);
        break;
      
      case 'contextual':
        resumptionPrompt = await this.generateContextualResumption(context, interruption);
        break;
      
      case 'restart':
        resumptionPrompt = await this.generateRestartPrompt(context);
        contextRestored = false;
        break;
      
      default:
        resumptionPrompt = "I'm glad you're back! Where would you like to continue?";
    }

    // Clear the interruption
    this.activeInterruptions.delete(userId);

    this.emit('conversationResumed', { userId, resumptionPrompt, contextRestored });

    return { resumptionPrompt, contextRestored };
  }

  /**
   * Manage conversation tangents with gentle redirection
   */
  async manageTangent(
    userId: string,
    tangentInput: UserInput,
    context: ConversationContext
  ): Promise<TangentManagement> {
    const currentTopic = this.extractCurrentTopic(context);
    const tangentTopic = this.extractTangentTopic(tangentInput);
    const relevanceScore = this.calculateRelevance(currentTopic, tangentTopic);

    const tangentManagement: TangentManagement = {
      originalTopic: currentTopic,
      tangentTopic,
      relevanceScore,
      redirectionStrategy: this.selectRedirectionStrategy(relevanceScore, context),
      maxTangentDepth: this.getMaxTangentDepth(context.user?.age || 6),
      currentDepth: this.getCurrentTangentDepth(userId)
    };

    // Store tangent history
    if (!this.tangentHistory.has(userId)) {
      this.tangentHistory.set(userId, []);
    }
    this.tangentHistory.get(userId)!.push(tangentManagement);

    // Apply redirection strategy
    const redirectionResponse = await this.applyRedirectionStrategy(
      tangentManagement,
      context
    );

    this.emit('tangentManaged', { userId, tangentManagement, redirectionResponse });

    return tangentManagement;
  }

  /**
   * Detect and recover from attention loss
   */
  async detectAttentionLoss(
    userId: string,
    context: ConversationContext,
    behaviorSignals: any[]
  ): Promise<AttentionLossSignal | null> {
    const indicators = this.analyzeAttentionIndicators(behaviorSignals, context);
    
    if (indicators.length === 0) {
      return null; // No attention loss detected
    }

    const confidence = this.calculateAttentionLossConfidence(indicators);
    const duration = this.calculateAttentionLossDuration(userId, indicators);
    const previousAttempts = this.getPreviousRecoveryAttempts(userId);

    const attentionLoss: AttentionLossSignal = {
      indicators,
      confidence,
      duration,
      recoveryStrategy: this.selectRecoveryStrategy(indicators, previousAttempts, context),
      previousAttempts
    };

    // Store attention pattern
    if (!this.attentionPatterns.has(userId)) {
      this.attentionPatterns.set(userId, []);
    }
    this.attentionPatterns.get(userId)!.push(attentionLoss);

    // Apply recovery strategy
    const recoveryResponse = await this.applyAttentionRecovery(attentionLoss, context);

    this.emit('attentionLossDetected', { userId, attentionLoss, recoveryResponse });

    return attentionLoss;
  }

  /**
   * Handle conversation abandonment with intelligent resumption
   */
  async handleConversationAbandonment(
    userId: string,
    context: ConversationContext,
    abandonmentSignals: any
  ): Promise<ConversationAbandonment> {
    const abandonment = this.analyzeAbandonment(abandonmentSignals, context);
    
    // Create context snapshot for resumption
    const contextSnapshot = this.createContextSnapshot(context);
    
    // Generate resumption prompt based on abandonment type
    const resumptionPrompt = await this.generateResumptionPrompt(
      abandonment.abandonmentType,
      contextSnapshot
    );

    const abandonmentRecord: ConversationAbandonment = {
      ...abandonment,
      contextSnapshot,
      resumptionPrompt,
      priority: this.calculateResumptionPriority(abandonment, context)
    };

    this.abandonedSessions.set(userId, abandonmentRecord);

    // Schedule cleanup if abandonment is permanent
    if (abandonment.abandonmentType === 'completion') {
      setTimeout(() => {
        this.cleanupAbandonedSession(userId);
      }, 24 * 60 * 60 * 1000); // 24 hours
    }

    this.emit('conversationAbandoned', { userId, abandonment: abandonmentRecord });

    return abandonmentRecord;
  }

  /**
   * Recover from context corruption
   */
  async recoverFromContextCorruption(
    userId: string,
    corruptedContext: ConversationContext
  ): Promise<{ recoveredContext: ConversationContext; corruption: ContextCorruption }> {
    const corruption = this.analyzeContextCorruption(corruptedContext);
    let recoveredContext: ConversationContext;

    switch (corruption.recoveryMethod) {
      case 'partial_recovery':
        recoveredContext = await this.performPartialRecovery(corruptedContext, corruption);
        break;
      
      case 'context_rebuild':
        recoveredContext = await this.rebuildContext(userId, corruptedContext);
        break;
      
      case 'user_confirmation':
        recoveredContext = await this.requestUserConfirmation(userId, corruptedContext);
        break;
      
      case 'fresh_start':
        recoveredContext = this.createFreshContext(userId);
        break;
      
      default:
        recoveredContext = corruptedContext; // Fallback to original
    }

    this.emit('contextCorruptionRecovered', { userId, corruption, recoveredContext });

    return { recoveredContext, corruption };
  }

  /**
   * Analyze interruption type and severity
   */
  private analyzeInterruption(
    signal: any,
    context: ConversationContext
  ): InterruptionDetection {
    const type = this.classifyInterruptionType(signal);
    const severity = this.assessInterruptionSeverity(signal, context);
    const resumptionStrategy = this.determineResumptionStrategy(type, severity);

    return {
      type,
      severity,
      timestamp: new Date(),
      context: signal,
      resumptionStrategy
    };
  }

  private classifyInterruptionType(signal: any): 'external' | 'internal' | 'user_initiated' | 'system_initiated' {
    if (signal.source === 'user_command') return 'user_initiated';
    if (signal.source === 'system_error') return 'system_initiated';
    if (signal.source === 'external_event') return 'external';
    return 'internal';
  }

  private assessInterruptionSeverity(
    signal: any,
    context: ConversationContext
  ): 'minor' | 'moderate' | 'major' | 'critical' {
    // Assess based on conversation phase and user engagement
    if (context.phase === 'story_climax') return 'major';
    if (context.phase === 'character_creation') return 'moderate';
    if (signal.duration > 300000) return 'critical'; // 5 minutes
    return 'minor';
  }

  private determineResumptionStrategy(
    type: string,
    severity: string
  ): 'immediate' | 'delayed' | 'contextual' | 'restart' {
    if (severity === 'critical') return 'restart';
    if (severity === 'major') return 'contextual';
    if (type === 'user_initiated') return 'immediate';
    return 'delayed';
  }

  /**
   * Handle different types of interruptions
   */
  private async handleExternalInterruption(
    userId: string,
    interruption: InterruptionDetection,
    context: ConversationContext
  ): Promise<void> {
    // Save current state for resumption
    await this.saveConversationState(userId, context);
    
    // Prepare graceful pause message
    const pauseMessage = this.generatePauseMessage(interruption, context);
    this.emit('interruptionHandled', { userId, message: pauseMessage });
  }

  private async handleUserInitiatedInterruption(
    userId: string,
    interruption: InterruptionDetection,
    context: ConversationContext
  ): Promise<void> {
    // User wants to pause or change direction
    const acknowledgment = this.generateUserInterruptionAcknowledgment(context);
    this.emit('interruptionHandled', { userId, message: acknowledgment });
  }

  private async handleSystemInterruption(
    userId: string,
    interruption: InterruptionDetection,
    context: ConversationContext
  ): Promise<void> {
    // System-initiated interruption (error, maintenance, etc.)
    const systemMessage = this.generateSystemInterruptionMessage(interruption, context);
    this.emit('interruptionHandled', { userId, message: systemMessage });
  }

  private async handleInternalInterruption(
    userId: string,
    interruption: InterruptionDetection,
    context: ConversationContext
  ): Promise<void> {
    // Internal processing interruption
    const processingMessage = "Just a moment while I gather my thoughts...";
    this.emit('interruptionHandled', { userId, message: processingMessage });
  }

  /**
   * Generate resumption prompts
   */
  private async generateImmediateResumption(context: ConversationContext): Promise<string> {
    const age = context.user?.age || 6;
    
    if (age < 6) {
      return "I'm back! Let's keep playing with our story!";
    } else if (age < 9) {
      return "Great! Now, where were we in our adventure?";
    } else {
      return "Perfect timing! Let's continue right where we left off.";
    }
  }

  private async generateDelayedResumption(
    context: ConversationContext,
    interruption: InterruptionDetection
  ): Promise<string> {
    const timeSinceInterruption = Date.now() - interruption.timestamp.getTime();
    const minutes = Math.floor(timeSinceInterruption / 60000);
    
    if (minutes < 5) {
      return "Welcome back! I was just thinking about our story. Ready to continue?";
    } else if (minutes < 30) {
      return "Hi again! I've been waiting patiently. Should we pick up where we left off?";
    } else {
      return "It's wonderful to see you again! Would you like me to remind you where we were in our story?";
    }
  }

  private async generateContextualResumption(
    context: ConversationContext,
    interruption: InterruptionDetection
  ): Promise<string> {
    const currentPhase = context.phase || 'story_building';
    const characterName = context.character?.name || 'our hero';
    
    switch (currentPhase) {
      case 'character_creation':
        return `Welcome back! We were creating ${characterName}. Should we continue adding details to make them even more amazing?`;
      
      case 'story_building':
        return `Hi again! ${characterName} was just about to have an exciting adventure. Ready to see what happens next?`;
      
      case 'story_climax':
        return `Perfect timing! We're at the most exciting part of ${characterName}'s story. Let's see how this adventure ends!`;
      
      default:
        return `I'm so glad you're back! Let's continue our creative journey together.`;
    }
  }

  private async generateRestartPrompt(context: ConversationContext): Promise<string> {
    return "It looks like we had a little mix-up, but that's okay! Would you like to start a brand new story, or should I try to remember where we were?";
  }

  /**
   * Tangent management methods
   */
  private extractCurrentTopic(context: ConversationContext): string {
    return context.currentTopic || context.story?.type || 'general_story';
  }

  private extractTangentTopic(input: UserInput): string {
    // Simple topic extraction - in production, this would use NLP
    const topics = input.text.toLowerCase().split(' ');
    return topics.find(word => word.length > 4) || 'unknown';
  }

  private calculateRelevance(currentTopic: string, tangentTopic: string): number {
    // Simple relevance calculation - in production, this would use semantic similarity
    if (currentTopic === tangentTopic) return 1.0;
    if (currentTopic.includes(tangentTopic) || tangentTopic.includes(currentTopic)) return 0.7;
    return 0.3; // Default low relevance
  }

  private selectRedirectionStrategy(
    relevanceScore: number,
    context: ConversationContext
  ): 'gentle_redirect' | 'incorporate_tangent' | 'acknowledge_and_return' | 'follow_tangent' {
    if (relevanceScore > 0.8) return 'incorporate_tangent';
    if (relevanceScore > 0.5) return 'acknowledge_and_return';
    if (context.user?.age && context.user.age < 7) return 'gentle_redirect';
    return 'follow_tangent';
  }

  private getMaxTangentDepth(age: number): number {
    if (age < 5) return 1; // Very young children need simple focus
    if (age < 8) return 2; // School age can handle some tangents
    return 3; // Older children can follow more complex tangents
  }

  private getCurrentTangentDepth(userId: string): number {
    const history = this.tangentHistory.get(userId) || [];
    return history.length;
  }

  private async applyRedirectionStrategy(
    tangent: TangentManagement,
    context: ConversationContext
  ): Promise<string> {
    switch (tangent.redirectionStrategy) {
      case 'gentle_redirect':
        return `That's interesting! But let's get back to ${context.character?.name || 'our hero'}'s adventure. What should happen next?`;
      
      case 'incorporate_tangent':
        return `What a great idea! Let's add that to our story. How can we make ${tangent.tangentTopic} part of ${context.character?.name || 'our hero'}'s adventure?`;
      
      case 'acknowledge_and_return':
        return `I love that you're thinking about ${tangent.tangentTopic}! We could explore that in another story. For now, let's see what ${context.character?.name || 'our hero'} does next.`;
      
      case 'follow_tangent':
        return `Ooh, ${tangent.tangentTopic} sounds fascinating! Tell me more about that - maybe we can create a whole new adventure around it!`;
      
      default:
        return "That's a wonderful thought! How does that connect to our story?";
    }
  }

  /**
   * Attention loss detection and recovery
   */
  private analyzeAttentionIndicators(
    signals: any[],
    context: ConversationContext
  ): string[] {
    const indicators = [];
    
    // Check for various attention loss signals
    if (signals.some(s => s.type === 'delayed_response')) {
      indicators.push('delayed_response');
    }
    
    if (signals.some(s => s.type === 'short_responses')) {
      indicators.push('short_responses');
    }
    
    if (signals.some(s => s.type === 'repetitive_input')) {
      indicators.push('repetitive_input');
    }
    
    if (signals.some(s => s.type === 'off_topic')) {
      indicators.push('off_topic');
    }
    
    if (signals.some(s => s.type === 'distraction_words')) {
      indicators.push('distraction_words');
    }
    
    return indicators;
  }

  private calculateAttentionLossConfidence(indicators: string[]): number {
    // More indicators = higher confidence
    const baseConfidence = indicators.length * 0.2;
    const weightedConfidence = indicators.reduce((acc, indicator) => {
      const weights: Record<string, number> = {
        'delayed_response': 0.3,
        'short_responses': 0.2,
        'repetitive_input': 0.4,
        'off_topic': 0.3,
        'distraction_words': 0.5
      };
      return acc + (weights[indicator] || 0.1);
    }, 0);
    
    return Math.min(baseConfidence + weightedConfidence, 1.0);
  }

  private calculateAttentionLossDuration(userId: string, indicators: string[]): number {
    // Estimate how long attention has been lost
    const patterns = this.attentionPatterns.get(userId) || [];
    const recentPatterns = patterns.filter(p => 
      Date.now() - p.duration < 300000 // Last 5 minutes
    );
    
    return recentPatterns.length * 30000; // 30 seconds per pattern
  }

  private getPreviousRecoveryAttempts(userId: string): number {
    const patterns = this.attentionPatterns.get(userId) || [];
    return patterns.filter(p => 
      Date.now() - p.duration < 600000 // Last 10 minutes
    ).length;
  }

  private selectRecoveryStrategy(
    indicators: string[],
    previousAttempts: number,
    context: ConversationContext
  ): 'engagement_boost' | 'topic_change' | 'break_suggestion' | 'interactive_element' {
    if (previousAttempts > 2) return 'break_suggestion';
    if (indicators.includes('off_topic')) return 'topic_change';
    if (indicators.includes('delayed_response')) return 'interactive_element';
    return 'engagement_boost';
  }

  private async applyAttentionRecovery(
    attentionLoss: AttentionLossSignal,
    context: ConversationContext
  ): Promise<string> {
    const age = context.user?.age || 6;
    
    switch (attentionLoss.recoveryStrategy) {
      case 'engagement_boost':
        return this.generateEngagementBoost(age, context);
      
      case 'topic_change':
        return this.generateTopicChange(age, context);
      
      case 'break_suggestion':
        return this.generateBreakSuggestion(age);
      
      case 'interactive_element':
        return this.generateInteractiveElement(age, context);
      
      default:
        return "What would you like to do next in our story?";
    }
  }

  private generateEngagementBoost(age: number, context: ConversationContext): string {
    const characterName = context.character?.name || 'our hero';
    
    if (age < 6) {
      return `Wow! ${characterName} just found something AMAZING! What do you think it could be?`;
    } else if (age < 9) {
      return `Suddenly, ${characterName} heard a mysterious sound! What do you think is making that noise?`;
    } else {
      return `Plot twist! ${characterName} just discovered something that changes everything. What should they do?`;
    }
  }

  private generateTopicChange(age: number, context: ConversationContext): string {
    const topics = ['magical powers', 'hidden treasure', 'friendly animals', 'secret doors'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    return `You know what? Let's add ${randomTopic} to our story! How should that work?`;
  }

  private generateBreakSuggestion(age: number): string {
    if (age < 6) {
      return "You've been such a great storyteller! Would you like to take a little break and come back to our story later?";
    } else {
      return "We've created so much together! Would you like to save our story and continue it another time?";
    }
  }

  private generateInteractiveElement(age: number, context: ConversationContext): string {
    const characterName = context.character?.name || 'our hero';
    
    return `Quick! ${characterName} needs to make a choice RIGHT NOW! Should they go left or right? You decide!`;
  }

  /**
   * Conversation abandonment analysis
   */
  private analyzeAbandonment(
    signals: any,
    context: ConversationContext
  ): Omit<ConversationAbandonment, 'contextSnapshot' | 'resumptionPrompt' | 'priority'> {
    const abandonmentType = this.classifyAbandonmentType(signals, context);
    
    return {
      abandonmentType,
      lastInteraction: new Date(signals.lastInteraction || Date.now())
    };
  }

  private classifyAbandonmentType(
    signals: any,
    context: ConversationContext
  ): 'gradual' | 'sudden' | 'distraction' | 'completion' {
    if (context.phase === 'story_complete') return 'completion';
    if (signals.responseTime && signals.responseTime > 300000) return 'gradual';
    if (signals.distractionIndicators) return 'distraction';
    return 'sudden';
  }

  private async generateResumptionPrompt(
    abandonmentType: string,
    context: ConversationContext
  ): Promise<string> {
    const characterName = context.character?.name || 'our hero';
    
    switch (abandonmentType) {
      case 'gradual':
        return `Hi there! I've been thinking about ${characterName} and wondering what adventure they should have next. Ready to continue?`;
      
      case 'sudden':
        return `Welcome back! ${characterName} is waiting patiently for their next adventure. Should we continue where we left off?`;
      
      case 'distraction':
        return `I hope you had fun with whatever caught your attention! ${characterName} is excited to continue their story with you.`;
      
      case 'completion':
        return `That was such a wonderful story we created together! Would you like to make a new adventure or continue with ${characterName}?`;
      
      default:
        return `I'm so happy you're back! Let's continue our creative journey.`;
    }
  }

  private calculateResumptionPriority(
    abandonment: Omit<ConversationAbandonment, 'contextSnapshot' | 'resumptionPrompt' | 'priority'>,
    context: ConversationContext
  ): 'high' | 'medium' | 'low' {
    if (context.phase === 'story_climax') return 'high';
    if (abandonment.abandonmentType === 'sudden') return 'medium';
    return 'low';
  }

  /**
   * Context corruption analysis and recovery
   */
  private analyzeContextCorruption(context: ConversationContext): ContextCorruption {
    const corruptedElements = this.identifyCorruptedElements(context);
    const severity = this.assessCorruptionSeverity(corruptedElements);
    const recoveryMethod = this.selectRecoveryMethod(severity, corruptedElements);
    const backupAvailable = this.hasContextBackup(context.userId);

    return {
      corruptedElements,
      severity,
      recoveryMethod,
      backupAvailable
    };
  }

  private identifyCorruptedElements(context: ConversationContext): string[] {
    const corrupted = [];
    
    if (!context.userId) corrupted.push('userId');
    if (!context.sessionId) corrupted.push('sessionId');
    if (context.character && typeof context.character !== 'object') corrupted.push('character');
    if (context.story && typeof context.story !== 'object') corrupted.push('story');
    if (context.phase && typeof context.phase !== 'string') corrupted.push('phase');
    
    return corrupted;
  }

  private assessCorruptionSeverity(corruptedElements: string[]): 'minor' | 'moderate' | 'severe' {
    if (corruptedElements.includes('userId') || corruptedElements.includes('sessionId')) {
      return 'severe';
    }
    if (corruptedElements.length > 2) return 'moderate';
    return 'minor';
  }

  private selectRecoveryMethod(
    severity: string,
    corruptedElements: string[]
  ): 'partial_recovery' | 'context_rebuild' | 'user_confirmation' | 'fresh_start' {
    if (severity === 'severe') return 'fresh_start';
    if (severity === 'moderate') return 'context_rebuild';
    if (corruptedElements.includes('character') || corruptedElements.includes('story')) {
      return 'user_confirmation';
    }
    return 'partial_recovery';
  }

  private async performPartialRecovery(
    context: ConversationContext,
    corruption: ContextCorruption
  ): Promise<ConversationContext> {
    const recovered = { ...context };
    
    // Fix corrupted elements with defaults
    for (const element of corruption.corruptedElements) {
      switch (element) {
        case 'phase':
          recovered.phase = 'story_building';
          break;
        case 'character':
          recovered.character = this.createDefaultCharacter();
          break;
        case 'story':
          recovered.story = this.createDefaultStory();
          break;
      }
    }
    
    return recovered;
  }

  private async rebuildContext(
    userId: string,
    corruptedContext: ConversationContext
  ): Promise<ConversationContext> {
    // Try to rebuild from backup
    const backup = this.getLatestContextBackup(userId);
    
    if (backup) {
      return backup;
    }
    
    // Create new context with minimal information
    return {
      userId,
      sessionId: `rebuilt_${Date.now()}`,
      phase: 'story_building',
      timestamp: new Date(),
      isRebuilt: true
    };
  }

  private async requestUserConfirmation(
    userId: string,
    context: ConversationContext
  ): Promise<ConversationContext> {
    // In a real implementation, this would prompt the user
    // For now, return a safe default
    return {
      ...context,
      needsUserConfirmation: true,
      confirmationPrompt: "I want to make sure I have your story details right. Can you tell me about your character again?"
    };
  }

  private createFreshContext(userId: string): ConversationContext {
    return {
      userId,
      sessionId: `fresh_${Date.now()}`,
      phase: 'greeting',
      timestamp: new Date(),
      isFreshStart: true
    };
  }

  // Helper methods
  private createContextSnapshot(context: ConversationContext): ConversationContext {
    return JSON.parse(JSON.stringify(context));
  }

  private async saveConversationState(userId: string, context: ConversationContext): Promise<void> {
    // Save context backup
    if (!this.contextBackups.has(userId)) {
      this.contextBackups.set(userId, []);
    }
    
    const backups = this.contextBackups.get(userId)!;
    backups.push(this.createContextSnapshot(context));
    
    // Keep only last 5 backups
    if (backups.length > 5) {
      backups.shift();
    }
  }

  private hasContextBackup(userId: string): boolean {
    const backups = this.contextBackups.get(userId);
    return backups ? backups.length > 0 : false;
  }

  private getLatestContextBackup(userId: string): ConversationContext | null {
    const backups = this.contextBackups.get(userId);
    return backups && backups.length > 0 ? backups[backups.length - 1] : null;
  }

  private generatePauseMessage(
    interruption: InterruptionDetection,
    context: ConversationContext
  ): string {
    const age = context.user?.age || 6;
    
    if (age < 6) {
      return "I'll wait right here for you! Come back when you're ready to play!";
    } else {
      return "No problem! I'll keep our story safe until you return.";
    }
  }

  private generateUserInterruptionAcknowledgment(context: ConversationContext): string {
    return "Of course! What would you like to do?";
  }

  private generateSystemInterruptionMessage(
    interruption: InterruptionDetection,
    context: ConversationContext
  ): string {
    return "I need to take a quick break, but I'll be right back with you!";
  }

  private createDefaultCharacter(): any {
    return {
      name: 'Hero',
      species: 'human',
      age: 8,
      traits: { brave: true, kind: true }
    };
  }

  private createDefaultStory(): any {
    return {
      title: 'A New Adventure',
      content: 'Once upon a time...',
      type: 'adventure'
    };
  }

  private analyzeEngagementPatterns(): void {
    // Analyze engagement patterns across all users
    for (const [userId, patterns] of this.attentionPatterns.entries()) {
      const recentPatterns = patterns.filter(p => 
        Date.now() - p.duration < 3600000 // Last hour
      );
      
      if (recentPatterns.length > 3) {
        this.emit('chronicAttentionIssues', { userId, patterns: recentPatterns });
      }
    }
  }

  private cleanupAbandonedSession(userId: string): void {
    this.abandonedSessions.delete(userId);
    this.contextBackups.delete(userId);
    this.emit('sessionCleaned', { userId });
  }

  /**
   * Get interruption history for a user
   */
  getInterruptionHistory(userId: string): InterruptionDetection | undefined {
    return this.activeInterruptions.get(userId);
  }

  /**
   * Get tangent history for a user
   */
  getTangentHistory(userId: string): TangentManagement[] {
    return this.tangentHistory.get(userId) || [];
  }

  /**
   * Get attention patterns for a user
   */
  getAttentionPatterns(userId: string): AttentionLossSignal[] {
    return this.attentionPatterns.get(userId) || [];
  }

  /**
   * Get abandoned session info
   */
  getAbandonedSession(userId: string): ConversationAbandonment | undefined {
    return this.abandonedSessions.get(userId);
  }

  /**
   * Clear user data (for privacy compliance)
   */
  clearUserData(userId: string): void {
    this.activeInterruptions.delete(userId);
    this.tangentHistory.delete(userId);
    this.attentionPatterns.delete(userId);
    this.abandonedSessions.delete(userId);
    this.contextBackups.delete(userId);
  }

  /**
   * Get system statistics
   */
  getSystemStats(): {
    activeInterruptions: number;
    abandonedSessions: number;
    totalTangents: number;
    attentionIssues: number;
  } {
    return {
      activeInterruptions: this.activeInterruptions.size,
      abandonedSessions: this.abandonedSessions.size,
      totalTangents: Array.from(this.tangentHistory.values()).reduce((sum, arr) => sum + arr.length, 0),
      attentionIssues: Array.from(this.attentionPatterns.values()).reduce((sum, arr) => sum + arr.length, 0)
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.removeAllListeners();
    this.activeInterruptions.clear();
    this.tangentHistory.clear();
    this.attentionPatterns.clear();
    this.abandonedSessions.clear();
    this.contextBackups.clear();
  }
}