import { EmotionalAssessment, CrisisIndicator, TherapeuticSession } from '../types';

export interface VoiceAnalysisResult {
  emotionalIntensity: number; // 0-10 scale
  stressIndicators: string[];
  speechPatterns: {
    pace: 'very_slow' | 'slow' | 'normal' | 'fast' | 'very_fast';
    volume: 'whisper' | 'quiet' | 'normal' | 'loud' | 'shouting';
    clarity: 'unclear' | 'somewhat_clear' | 'clear';
    tremor: boolean;
    breathingPattern: 'normal' | 'shallow' | 'rapid' | 'irregular';
  };
  emotionalMarkers: {
    crying: boolean;
    laughing: boolean;
    sighing: boolean;
    voice_breaking: boolean;
  };
  confidence: number; // 0-1 confidence in analysis
}

export interface InteractionPattern {
  responseLatency: number; // milliseconds
  engagementLevel: number; // 0-10 scale
  coherenceScore: number; // 0-10 scale
  repetitiveResponses: boolean;
  avoidanceIndicators: string[];
  participationLevel: 'minimal' | 'moderate' | 'active' | 'highly_engaged';
}

export interface TriggerDetectionResult {
  triggerDetected: boolean;
  triggerType: 'emotional_escalation' | 'dissociation' | 'panic_response' | 'withdrawal' | 'aggression' | 'self_harm_ideation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
  recommendedResponse: string;
  immediateAction: boolean;
  parentNotification: boolean;
  professionalReferral: boolean;
}

export class EmotionalTriggerDetector {
  private triggerPatterns: Map<string, any> = new Map();
  private baselineProfiles: Map<string, any> = new Map();

  constructor() {
    this.initializeTriggerPatterns();
  }

  private initializeTriggerPatterns(): void {
    // Emotional escalation patterns
    this.triggerPatterns.set('emotional_escalation', {
      voiceIndicators: {
        intensityThreshold: 8,
        paceChanges: ['very_fast', 'very_slow'],
        volumeChanges: ['shouting', 'whisper'],
        emotionalMarkers: ['crying', 'voice_breaking']
      },
      interactionIndicators: {
        responseLatencyIncrease: 3000, // 3 seconds
        engagementDrop: 5, // Drop of 5 points
        coherenceThreshold: 3,
        avoidanceKeywords: ['stop', 'no more', 'go away', 'leave me alone']
      },
      severity: 'high',
      immediateResponse: 'Provide immediate calming support and validation'
    });

    // Dissociation patterns
    this.triggerPatterns.set('dissociation', {
      voiceIndicators: {
        intensityThreshold: 2,
        pace: 'very_slow',
        volume: 'quiet',
        clarity: 'unclear',
        emotionalMarkers: []
      },
      interactionIndicators: {
        responseLatency: 5000, // 5+ seconds
        engagementLevel: 2,
        coherenceScore: 3,
        repetitiveResponses: true,
        participationLevel: 'minimal'
      },
      severity: 'medium',
      immediateResponse: 'Gentle grounding techniques and reality orientation'
    });

    // Panic response patterns
    this.triggerPatterns.set('panic_response', {
      voiceIndicators: {
        intensityThreshold: 9,
        pace: 'very_fast',
        volume: 'loud',
        breathingPattern: 'rapid',
        emotionalMarkers: ['crying']
      },
      interactionIndicators: {
        responseLatency: 500, // Very quick, panicked responses
        engagementLevel: 8, // High but distressed engagement
        coherenceScore: 2,
        avoidanceKeywords: ['can\'t breathe', 'scared', 'help', 'stop']
      },
      severity: 'critical',
      immediateResponse: 'Immediate panic attack intervention protocol'
    });

    // Withdrawal patterns
    this.triggerPatterns.set('withdrawal', {
      voiceIndicators: {
        intensityThreshold: 3,
        pace: 'slow',
        volume: 'quiet',
        emotionalMarkers: []
      },
      interactionIndicators: {
        responseLatency: 4000,
        engagementLevel: 2,
        coherenceScore: 4,
        participationLevel: 'minimal',
        avoidanceKeywords: ['don\'t want to', 'tired', 'nothing', 'fine']
      },
      severity: 'medium',
      immediateResponse: 'Gentle encouragement and validation of feelings'
    });

    // Self-harm ideation patterns (critical)
    this.triggerPatterns.set('self_harm_ideation', {
      voiceIndicators: {
        intensityThreshold: 7,
        emotionalMarkers: ['crying', 'voice_breaking']
      },
      interactionIndicators: {
        harmKeywords: [
          'hurt myself', 'want to die', 'kill myself', 'end it all',
          'better off dead', 'no point', 'hopeless', 'worthless',
          'cut myself', 'hurt me', 'pain', 'deserve to hurt'
        ],
        coherenceScore: 5 // May be coherent but concerning
      },
      severity: 'critical',
      immediateResponse: 'Immediate safety assessment and crisis intervention'
    });
  }

  /**
   * Analyze voice patterns for emotional triggers
   */
  analyzeVoicePatterns(audioData: any, userId: string): VoiceAnalysisResult {
    // In a real implementation, this would use actual voice analysis
    // For now, return a structured analysis based on patterns
    
    const baseline = this.baselineProfiles.get(userId);
    
    // Simulate voice analysis results
    const mockAnalysis: VoiceAnalysisResult = {
      emotionalIntensity: Math.floor(Math.random() * 10) + 1,
      stressIndicators: this.detectStressIndicators(audioData),
      speechPatterns: {
        pace: this.analyzeSpeechPace(audioData),
        volume: this.analyzeSpeechVolume(audioData),
        clarity: this.analyzeSpeechClarity(audioData),
        tremor: this.detectVoiceTremor(audioData),
        breathingPattern: this.analyzeBreathingPattern(audioData)
      },
      emotionalMarkers: {
        crying: this.detectCrying(audioData),
        laughing: this.detectLaughing(audioData),
        sighing: this.detectSighing(audioData),
        voice_breaking: this.detectVoiceBreaking(audioData)
      },
      confidence: 0.85
    };

    // Update baseline if this is normal interaction
    if (mockAnalysis.emotionalIntensity < 6 && !this.hasDistressMarkers(mockAnalysis)) {
      this.updateBaseline(userId, mockAnalysis);
    }

    return mockAnalysis;
  }

  /**
   * Analyze interaction patterns for emotional triggers
   */
  analyzeInteractionPatterns(
    responseTime: number,
    userInput: string,
    engagementScore: number,
    sessionHistory: any[]
  ): InteractionPattern {
    const coherenceScore = this.calculateCoherenceScore(userInput);
    const avoidanceIndicators = this.detectAvoidanceLanguage(userInput);
    const repetitiveResponses = this.detectRepetitiveResponses(userInput, sessionHistory);

    let participationLevel: InteractionPattern['participationLevel'] = 'moderate';
    if (engagementScore < 3) participationLevel = 'minimal';
    else if (engagementScore > 7) participationLevel = 'active';
    else if (engagementScore > 9) participationLevel = 'highly_engaged';

    return {
      responseLatency: responseTime,
      engagementLevel: engagementScore,
      coherenceScore,
      repetitiveResponses,
      avoidanceIndicators,
      participationLevel
    };
  }

  /**
   * Detect emotional triggers from combined analysis
   */
  detectTriggers(
    voiceAnalysis: VoiceAnalysisResult,
    interactionPattern: InteractionPattern,
    userInput: string,
    userId: string
  ): TriggerDetectionResult[] {
    const detectedTriggers: TriggerDetectionResult[] = [];

    // Check each trigger pattern
    for (const [triggerType, pattern] of this.triggerPatterns.entries()) {
      const detection = this.evaluateTriggerPattern(
        triggerType,
        pattern,
        voiceAnalysis,
        interactionPattern,
        userInput
      );

      if (detection.triggerDetected) {
        detectedTriggers.push(detection);
      }
    }

    // Sort by severity (critical first)
    detectedTriggers.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    return detectedTriggers;
  }

  /**
   * Generate crisis indicators from trigger detection
   */
  generateCrisisIndicators(
    triggers: TriggerDetectionResult[],
    sessionContext: TherapeuticSession
  ): CrisisIndicator[] {
    const indicators: CrisisIndicator[] = [];

    triggers.forEach(trigger => {
      if (trigger.severity === 'critical' || trigger.immediateAction) {
        const indicator: CrisisIndicator = {
          type: this.mapTriggerToCrisisType(trigger.triggerType),
          severity: trigger.severity,
          description: `Detected ${trigger.triggerType}: ${trigger.indicators.join(', ')}`,
          detectedAt: new Date(),
          context: `Session ${sessionContext.sessionNumber}, Pathway: ${sessionContext.pathwayId}`,
          immediateResponse: trigger.recommendedResponse,
          escalationRequired: trigger.professionalReferral || trigger.severity === 'critical',
          mandatoryReporting: trigger.triggerType === 'self_harm_ideation'
        };

        indicators.push(indicator);
      }
    });

    return indicators;
  }

  /**
   * Generate supportive response for detected emotional state
   */
  generateSupportiveResponse(
    triggers: TriggerDetectionResult[],
    emotionalState: EmotionalAssessment
  ): string {
    if (triggers.length === 0) {
      return this.generateNormalSupportiveResponse(emotionalState);
    }

    const primaryTrigger = triggers[0]; // Highest severity trigger

    const supportiveResponses: Record<string, string[]> = {
      'emotional_escalation': [
        "I can hear that you're feeling really strong emotions right now. That's okay - all feelings are valid.",
        "Let's take a moment to breathe together. Can you take a slow, deep breath with me?",
        "You're safe here with me. We can go as slowly as you need."
      ],
      'dissociation': [
        "I notice you might be feeling a bit disconnected right now. That's okay.",
        "Can you tell me three things you can see around you right now?",
        "You're here with me, and you're safe. Let's take this one step at a time."
      ],
      'panic_response': [
        "I can hear that you're feeling very scared right now. You're safe, and I'm here with you.",
        "Let's focus on your breathing. Can you breathe in for 4 counts and out for 4 counts?",
        "This feeling will pass. You're going to be okay."
      ],
      'withdrawal': [
        "I notice you might be feeling tired or overwhelmed. That's completely understandable.",
        "We don't have to talk about anything difficult right now. We can just be here together.",
        "Your feelings matter, and I'm here to listen whenever you're ready."
      ],
      'self_harm_ideation': [
        "Thank you for sharing these difficult feelings with me. You're very brave.",
        "These feelings are temporary, even though they feel overwhelming right now.",
        "You matter, and there are people who care about you and want to help."
      ]
    };

    const responses = supportiveResponses[primaryTrigger.triggerType] || [
      "I can see you're going through something difficult right now.",
      "Your feelings are important, and I'm here to support you.",
      "We can take this at whatever pace feels right for you."
    ];

    // Select response based on severity and context
    let selectedResponse = responses[0];
    if (primaryTrigger.severity === 'critical') {
      selectedResponse = responses[responses.length - 1]; // Most supportive response
    } else if (primaryTrigger.severity === 'high') {
      selectedResponse = responses[Math.min(1, responses.length - 1)];
    }

    return selectedResponse;
  }

  // Private helper methods

  private detectStressIndicators(audioData: any): string[] {
    // Mock implementation - would analyze actual audio
    const indicators = [];
    if (Math.random() > 0.7) indicators.push('elevated_pitch');
    if (Math.random() > 0.8) indicators.push('voice_tremor');
    if (Math.random() > 0.9) indicators.push('irregular_breathing');
    return indicators;
  }

  private analyzeSpeechPace(audioData: any): VoiceAnalysisResult['speechPatterns']['pace'] {
    // Mock implementation
    const paces: VoiceAnalysisResult['speechPatterns']['pace'][] = 
      ['very_slow', 'slow', 'normal', 'fast', 'very_fast'];
    return paces[Math.floor(Math.random() * paces.length)];
  }

  private analyzeSpeechVolume(audioData: any): VoiceAnalysisResult['speechPatterns']['volume'] {
    const volumes: VoiceAnalysisResult['speechPatterns']['volume'][] = 
      ['whisper', 'quiet', 'normal', 'loud', 'shouting'];
    return volumes[Math.floor(Math.random() * volumes.length)];
  }

  private analyzeSpeechClarity(audioData: any): VoiceAnalysisResult['speechPatterns']['clarity'] {
    const clarities: VoiceAnalysisResult['speechPatterns']['clarity'][] = 
      ['unclear', 'somewhat_clear', 'clear'];
    return clarities[Math.floor(Math.random() * clarities.length)];
  }

  private detectVoiceTremor(audioData: any): boolean {
    return Math.random() > 0.8;
  }

  private analyzeBreathingPattern(audioData: any): VoiceAnalysisResult['speechPatterns']['breathingPattern'] {
    const patterns: VoiceAnalysisResult['speechPatterns']['breathingPattern'][] = 
      ['normal', 'shallow', 'rapid', 'irregular'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private detectCrying(audioData: any): boolean {
    return Math.random() > 0.9;
  }

  private detectLaughing(audioData: any): boolean {
    return Math.random() > 0.7;
  }

  private detectSighing(audioData: any): boolean {
    return Math.random() > 0.8;
  }

  private detectVoiceBreaking(audioData: any): boolean {
    return Math.random() > 0.85;
  }

  private hasDistressMarkers(analysis: VoiceAnalysisResult): boolean {
    return analysis.emotionalMarkers.crying || 
           analysis.emotionalMarkers.voice_breaking ||
           analysis.speechPatterns.tremor ||
           analysis.stressIndicators.length > 0;
  }

  private updateBaseline(userId: string, analysis: VoiceAnalysisResult): void {
    const existing = this.baselineProfiles.get(userId) || { samples: [], average: null };
    existing.samples.push(analysis);
    
    // Keep only last 10 samples for baseline
    if (existing.samples.length > 10) {
      existing.samples = existing.samples.slice(-10);
    }

    this.baselineProfiles.set(userId, existing);
  }

  private calculateCoherenceScore(userInput: string): number {
    // Simple coherence scoring based on text analysis
    const words = userInput.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    
    // Score from 1-10, where 10 is most coherent
    return Math.max(1, Math.min(10, Math.round((1 - repetitionRatio) * 10)));
  }

  private detectAvoidanceLanguage(userInput: string): string[] {
    const avoidancePatterns = [
      'don\'t want to', 'don\'t care', 'whatever', 'fine', 'nothing',
      'i don\'t know', 'maybe', 'i guess', 'tired', 'bored'
    ];

    const lowerInput = userInput.toLowerCase();
    return avoidancePatterns.filter(pattern => lowerInput.includes(pattern));
  }

  private detectRepetitiveResponses(userInput: string, sessionHistory: any[]): boolean {
    if (sessionHistory.length < 2) return false;
    
    const recentResponses = sessionHistory.slice(-3).map(h => h.userInput?.toLowerCase() || '');
    const currentInput = userInput.toLowerCase();
    
    return recentResponses.some(response => 
      response === currentInput || 
      (response.length > 5 && currentInput.includes(response))
    );
  }

  private evaluateTriggerPattern(
    triggerType: string,
    pattern: any,
    voiceAnalysis: VoiceAnalysisResult,
    interactionPattern: InteractionPattern,
    userInput: string
  ): TriggerDetectionResult {
    let score = 0;
    let maxScore = 0;
    const indicators: string[] = [];

    // Evaluate voice indicators
    if (pattern.voiceIndicators) {
      maxScore += 10;
      
      if (pattern.voiceIndicators.intensityThreshold && 
          voiceAnalysis.emotionalIntensity >= pattern.voiceIndicators.intensityThreshold) {
        score += 3;
        indicators.push(`High emotional intensity: ${voiceAnalysis.emotionalIntensity}`);
      }

      if (pattern.voiceIndicators.paceChanges && 
          pattern.voiceIndicators.paceChanges.includes(voiceAnalysis.speechPatterns.pace)) {
        score += 2;
        indicators.push(`Speech pace: ${voiceAnalysis.speechPatterns.pace}`);
      }

      if (pattern.voiceIndicators.emotionalMarkers) {
        pattern.voiceIndicators.emotionalMarkers.forEach((marker: string) => {
          if (voiceAnalysis.emotionalMarkers[marker as keyof typeof voiceAnalysis.emotionalMarkers]) {
            score += 2;
            indicators.push(`Emotional marker: ${marker}`);
          }
        });
      }
    }

    // Evaluate interaction indicators
    if (pattern.interactionIndicators) {
      maxScore += 10;

      if (pattern.interactionIndicators.responseLatencyIncrease && 
          interactionPattern.responseLatency > pattern.interactionIndicators.responseLatencyIncrease) {
        score += 2;
        indicators.push(`Delayed response: ${interactionPattern.responseLatency}ms`);
      }

      if (pattern.interactionIndicators.engagementDrop && 
          interactionPattern.engagementLevel < pattern.interactionIndicators.engagementDrop) {
        score += 3;
        indicators.push(`Low engagement: ${interactionPattern.engagementLevel}`);
      }

      if (pattern.interactionIndicators.avoidanceKeywords) {
        const foundKeywords = pattern.interactionIndicators.avoidanceKeywords.filter((keyword: string) =>
          userInput.toLowerCase().includes(keyword.toLowerCase())
        );
        if (foundKeywords.length > 0) {
          score += foundKeywords.length * 2;
          indicators.push(`Avoidance language: ${foundKeywords.join(', ')}`);
        }
      }

      // Special handling for self-harm keywords
      if (pattern.interactionIndicators.harmKeywords) {
        const foundHarmKeywords = pattern.interactionIndicators.harmKeywords.filter((keyword: string) =>
          userInput.toLowerCase().includes(keyword.toLowerCase())
        );
        if (foundHarmKeywords.length > 0) {
          score += 10; // Maximum score for harm indicators
          indicators.push(`Self-harm language detected: ${foundHarmKeywords.join(', ')}`);
        }
      }
    }

    const confidence = maxScore > 0 ? score / maxScore : 0;
    const triggerDetected = confidence > 0.3; // 30% threshold

    return {
      triggerDetected,
      triggerType: triggerType as any,
      severity: pattern.severity,
      confidence,
      indicators,
      recommendedResponse: pattern.immediateResponse,
      immediateAction: pattern.severity === 'critical' || triggerType === 'self_harm_ideation',
      parentNotification: confidence > 0.5,
      professionalReferral: pattern.severity === 'critical' || triggerType === 'self_harm_ideation'
    };
  }

  private mapTriggerToCrisisType(triggerType: string): CrisisIndicator['type'] {
    const mapping: Record<string, CrisisIndicator['type']> = {
      'emotional_escalation': 'emotional_escalation',
      'panic_response': 'emotional_escalation',
      'withdrawal': 'behavioral_pattern',
      'dissociation': 'behavioral_pattern',
      'self_harm_ideation': 'safety_concern'
    };

    return mapping[triggerType] || 'behavioral_pattern';
  }

  private generateNormalSupportiveResponse(emotionalState: EmotionalAssessment): string {
    const responses = [
      "I'm here to listen and support you through this story.",
      "You're doing great. Let's continue exploring this together.",
      "I appreciate you sharing your thoughts and feelings with me.",
      "You're safe here, and we can take this at your own pace."
    ];

    // Select based on emotional state
    if (emotionalState.anxiety > 6) {
      return "I can sense you might be feeling a bit worried. That's completely normal, and we can work through this together.";
    } else if (emotionalState.confidence < 4) {
      return "You're being very brave by being here. I believe in you, and we'll take this one step at a time.";
    } else if (emotionalState.engagement < 4) {
      return "I notice you might be feeling a bit tired or distracted. That's okay - we can adjust our pace to what feels right for you.";
    }

    return responses[Math.floor(Math.random() * responses.length)];
  }
}