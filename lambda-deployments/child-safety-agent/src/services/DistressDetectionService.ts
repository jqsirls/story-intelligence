import OpenAI from 'openai';
import { Logger } from 'winston';
import {
  DistressDetectionRequest,
  DistressDetectionResult,
  DistressIndicator,
  RecommendedAction,
  VoicePatternData,
  InteractionBehaviorData
} from '../types';

export class DistressDetectionService {
  private openai: OpenAI;
  private logger: Logger;

  // Distress detection thresholds and patterns
  private readonly distressThresholds = {
    voice: {
      pitchVariation: 0.3, // High variation indicates stress
      volumeFluctuation: 0.4,
      speechRateChange: 0.5, // Significant change from baseline
      pauseFrequencyHigh: 0.6,
      stressIndicatorCount: 2
    },
    behavioral: {
      responseLatencyHigh: 5000, // ms
      responseLatencyLow: 500, // ms (too quick, might indicate anxiety)
      engagementLevelLow: 0.3,
      topicAvoidanceCount: 3,
      repetitivePatternCount: 3,
      unusualRequestCount: 2
    },
    conversational: {
      negativeEmotionWords: ['sad', 'scared', 'angry', 'hurt', 'worried', 'anxious', 'upset', 'mad'],
      distressExpressions: ['I can\'t', 'it\'s too hard', 'I give up', 'nothing works', 'I hate', 'I\'m stupid'],
      withdrawalIndicators: ['never mind', 'forget it', 'doesn\'t matter', 'I don\'t care', 'whatever']
    }
  };

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('DistressDetectionService initialized');
  }

  async detectDistress(request: DistressDetectionRequest): Promise<DistressDetectionResult> {
    try {
      // Analyze different aspects of distress
      const voiceIndicators = this.analyzeVoicePatterns(request.voicePatterns);
      const behavioralIndicators = this.analyzeBehavioralPatterns(request.interactionBehavior);
      const conversationalIndicators = this.analyzeConversationalPatterns(request.conversationHistory);
      
      // Get SI Enhanced contextual analysis
      const aiAnalysis = await this.performAIDistressAnalysis(request);
      
      // Combine all indicators
      const allIndicators = [...voiceIndicators, ...behavioralIndicators, ...conversationalIndicators];
      
      // Calculate overall distress level
      const distressLevel = this.calculateDistressLevel(allIndicators, aiAnalysis);
      
      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(distressLevel, allIndicators, request.userAge);
      
      // Generate appropriate response
      const suggestedResponse = this.generateSuggestedResponse(distressLevel, allIndicators, request.userAge);
      
      // Determine if immediate attention is required
      const requiresImmediateAttention = distressLevel === 'critical' || distressLevel === 'severe';
      
      const result: DistressDetectionResult = {
        isInDistress: distressLevel !== 'none',
        distressLevel,
        confidence: this.calculateConfidence(allIndicators, aiAnalysis),
        distressIndicators: allIndicators,
        recommendedActions,
        requiresImmediateAttention,
        suggestedResponse
      };

      this.logger.debug('Distress detection completed', {
        userId: request.userId,
        distressLevel: result.distressLevel,
        indicatorCount: allIndicators.length,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      this.logger.error('Error in distress detection', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      
      // Return safe default
      return {
        isInDistress: false,
        distressLevel: 'none',
        confidence: 0,
        distressIndicators: [],
        recommendedActions: [],
        requiresImmediateAttention: false,
        suggestedResponse: 'I\'m here to help you create wonderful stories. How are you feeling today?'
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test AI analysis with a simple request
      await this.performAIDistressAnalysis({
        userId: 'health_check',
        sessionId: 'health_check',
        interactionBehavior: {
          responseLatency: [1000],
          engagementLevel: 0.8,
          conversationFlow: 'normal',
          topicAvoidance: [],
          repetitivePatterns: [],
          unusualRequests: []
        },
        conversationHistory: [
          { speaker: 'user', content: 'I want to create a story', timestamp: new Date().toISOString() }
        ],
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      this.logger.warn('DistressDetectionService health check failed', { error });
      return false;
    }
  }

  private analyzeVoicePatterns(voicePatterns?: VoicePatternData): DistressIndicator[] {
    const indicators: DistressIndicator[] = [];
    
    if (!voicePatterns) {
      return indicators;
    }

    // Analyze pitch variation
    if (voicePatterns.pitch.length > 1) {
      const pitchVariation = this.calculateVariation(voicePatterns.pitch);
      if (pitchVariation > this.distressThresholds.voice.pitchVariation) {
        indicators.push({
          type: 'voice',
          indicator: 'high_pitch_variation',
          severity: Math.min(pitchVariation / this.distressThresholds.voice.pitchVariation, 1.0),
          confidence: 0.7,
          description: 'Significant variation in voice pitch may indicate emotional distress'
        });
      }
    }

    // Analyze volume fluctuation
    if (voicePatterns.volume.length > 1) {
      const volumeVariation = this.calculateVariation(voicePatterns.volume);
      if (volumeVariation > this.distressThresholds.voice.volumeFluctuation) {
        indicators.push({
          type: 'voice',
          indicator: 'volume_fluctuation',
          severity: Math.min(volumeVariation / this.distressThresholds.voice.volumeFluctuation, 1.0),
          confidence: 0.6,
          description: 'Unusual volume changes may indicate emotional instability'
        });
      }
    }

    // Analyze speech rate changes
    const normalSpeechRate = 150; // words per minute baseline
    const speechRateDeviation = Math.abs(voicePatterns.speechRate - normalSpeechRate) / normalSpeechRate;
    if (speechRateDeviation > this.distressThresholds.voice.speechRateChange) {
      indicators.push({
        type: 'voice',
        indicator: voicePatterns.speechRate > normalSpeechRate ? 'rapid_speech' : 'slow_speech',
        severity: Math.min(speechRateDeviation / this.distressThresholds.voice.speechRateChange, 1.0),
        confidence: 0.8,
        description: `${voicePatterns.speechRate > normalSpeechRate ? 'Rapid' : 'Slow'} speech may indicate anxiety or depression`
      });
    }

    // Analyze pause frequency
    if (voicePatterns.pauseFrequency > this.distressThresholds.voice.pauseFrequencyHigh) {
      indicators.push({
        type: 'voice',
        indicator: 'frequent_pauses',
        severity: Math.min(voicePatterns.pauseFrequency / this.distressThresholds.voice.pauseFrequencyHigh, 1.0),
        confidence: 0.7,
        description: 'Frequent pauses may indicate difficulty processing or emotional overwhelm'
      });
    }

    // Analyze stress indicators
    if (voicePatterns.stressIndicators.length >= this.distressThresholds.voice.stressIndicatorCount) {
      indicators.push({
        type: 'voice',
        indicator: 'multiple_stress_markers',
        severity: Math.min(voicePatterns.stressIndicators.length / 5, 1.0),
        confidence: 0.9,
        description: `Multiple vocal stress indicators detected: ${voicePatterns.stressIndicators.join(', ')}`
      });
    }

    return indicators;
  }

  private analyzeBehavioralPatterns(behavior: InteractionBehaviorData): DistressIndicator[] {
    const indicators: DistressIndicator[] = [];

    // Analyze response latency patterns
    if (behavior.responseLatency.length > 0) {
      const avgLatency = behavior.responseLatency.reduce((sum, lat) => sum + lat, 0) / behavior.responseLatency.length;
      
      if (avgLatency > this.distressThresholds.behavioral.responseLatencyHigh) {
        indicators.push({
          type: 'behavioral',
          indicator: 'slow_responses',
          severity: Math.min((avgLatency - this.distressThresholds.behavioral.responseLatencyHigh) / 5000, 1.0),
          confidence: 0.7,
          description: 'Unusually slow responses may indicate processing difficulties or emotional overwhelm'
        });
      } else if (avgLatency < this.distressThresholds.behavioral.responseLatencyLow) {
        indicators.push({
          type: 'behavioral',
          indicator: 'rapid_responses',
          severity: Math.min((this.distressThresholds.behavioral.responseLatencyLow - avgLatency) / 500, 1.0),
          confidence: 0.6,
          description: 'Very quick responses may indicate anxiety or impulsivity'
        });
      }
    }

    // Analyze engagement level
    if (behavior.engagementLevel < this.distressThresholds.behavioral.engagementLevelLow) {
      indicators.push({
        type: 'behavioral',
        indicator: 'low_engagement',
        severity: (this.distressThresholds.behavioral.engagementLevelLow - behavior.engagementLevel) / this.distressThresholds.behavioral.engagementLevelLow,
        confidence: 0.8,
        description: 'Low engagement may indicate depression, anxiety, or other emotional difficulties'
      });
    }

    // Analyze conversation flow
    if (behavior.conversationFlow !== 'normal') {
      const severityMap = { hesitant: 0.4, agitated: 0.7, withdrawn: 0.8 };
      indicators.push({
        type: 'behavioral',
        indicator: `conversation_flow_${behavior.conversationFlow}`,
        severity: severityMap[behavior.conversationFlow] || 0.5,
        confidence: 0.7,
        description: `${behavior.conversationFlow.charAt(0).toUpperCase() + behavior.conversationFlow.slice(1)} conversation flow may indicate emotional distress`
      });
    }

    // Analyze topic avoidance
    if (behavior.topicAvoidance.length >= this.distressThresholds.behavioral.topicAvoidanceCount) {
      indicators.push({
        type: 'behavioral',
        indicator: 'topic_avoidance',
        severity: Math.min(behavior.topicAvoidance.length / 5, 1.0),
        confidence: 0.6,
        description: `Avoiding multiple topics: ${behavior.topicAvoidance.join(', ')}`
      });
    }

    // Analyze repetitive patterns
    if (behavior.repetitivePatterns.length >= this.distressThresholds.behavioral.repetitivePatternCount) {
      indicators.push({
        type: 'behavioral',
        indicator: 'repetitive_patterns',
        severity: Math.min(behavior.repetitivePatterns.length / 5, 1.0),
        confidence: 0.7,
        description: `Repetitive behavioral patterns may indicate anxiety or obsessive thoughts`
      });
    }

    // Analyze unusual requests
    if (behavior.unusualRequests.length >= this.distressThresholds.behavioral.unusualRequestCount) {
      indicators.push({
        type: 'behavioral',
        indicator: 'unusual_requests',
        severity: Math.min(behavior.unusualRequests.length / 3, 1.0),
        confidence: 0.5,
        description: `Unusual or concerning requests detected`
      });
    }

    return indicators;
  }

  private analyzeConversationalPatterns(conversationHistory: any[]): DistressIndicator[] {
    const indicators: DistressIndicator[] = [];
    
    if (conversationHistory.length === 0) {
      return indicators;
    }

    // Combine all user messages
    const userMessages = conversationHistory
      .filter(turn => turn.speaker === 'user')
      .map(turn => turn.content.toLowerCase())
      .join(' ');

    // Count negative emotion words
    const negativeEmotionCount = this.distressThresholds.conversational.negativeEmotionWords
      .filter(word => userMessages.includes(word)).length;

    if (negativeEmotionCount >= 2) {
      indicators.push({
        type: 'conversational',
        indicator: 'negative_emotions',
        severity: Math.min(negativeEmotionCount / 5, 1.0),
        confidence: 0.7,
        description: 'Multiple negative emotion words detected in conversation'
      });
    }

    // Check for distress expressions
    const distressExpressionCount = this.distressThresholds.conversational.distressExpressions
      .filter(expr => userMessages.includes(expr.toLowerCase())).length;

    if (distressExpressionCount >= 1) {
      indicators.push({
        type: 'conversational',
        indicator: 'distress_expressions',
        severity: Math.min(distressExpressionCount / 3, 1.0),
        confidence: 0.8,
        description: 'Expressions of distress or helplessness detected'
      });
    }

    // Check for withdrawal indicators
    const withdrawalCount = this.distressThresholds.conversational.withdrawalIndicators
      .filter(indicator => userMessages.includes(indicator.toLowerCase())).length;

    if (withdrawalCount >= 1) {
      indicators.push({
        type: 'conversational',
        indicator: 'withdrawal_signs',
        severity: Math.min(withdrawalCount / 2, 1.0),
        confidence: 0.6,
        description: 'Signs of emotional withdrawal detected'
      });
    }

    // Analyze emotional context if available
    const emotionalContexts = conversationHistory
      .filter(turn => turn.speaker === 'user' && turn.emotionalContext)
      .map(turn => turn.emotionalContext);

    if (emotionalContexts.length > 0) {
      const negativeContexts = emotionalContexts.filter(context => 
        ['sad', 'angry', 'frustrated', 'anxious', 'scared', 'upset'].includes(context?.toLowerCase() || '')
      );

      if (negativeContexts.length >= 2) {
        indicators.push({
          type: 'conversational',
          indicator: 'persistent_negative_emotion',
          severity: Math.min(negativeContexts.length / emotionalContexts.length, 1.0),
          confidence: 0.8,
          description: 'Persistent negative emotional context throughout conversation'
        });
      }
    }

    return indicators;
  }

  private async performAIDistressAnalysis(request: DistressDetectionRequest): Promise<{
    distressLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
    confidence: number;
    reasoning: string;
  }> {
    try {
      const conversationText = request.conversationHistory
        .map(turn => `${turn.speaker}: ${turn.content}`)
        .join('\n');

      const prompt = `You are a child psychology expert analyzing a conversation for signs of emotional distress in a child.

Analyze the following conversation and behavioral data for signs of:
- Emotional distress or overwhelm
- Anxiety or panic
- Depression or sadness
- Anger or frustration
- Fear or trauma responses
- Social or academic stress
- Family or relationship problems

Conversation:
${conversationText}

Behavioral data:
- Engagement level: ${request.interactionBehavior.engagementLevel}
- Conversation flow: ${request.interactionBehavior.conversationFlow}
- Response patterns: ${request.interactionBehavior.responseLatency.length > 0 ? 'Available' : 'Not available'}
- Voice patterns: ${request.voicePatterns ? 'Available' : 'Not available'}

Child's age: ${request.userAge || 'unknown'}

Respond with a JSON object:
{
  "distressLevel": "none|mild|moderate|severe|critical",
  "confidence": number (0-1 scale),
  "reasoning": "Brief explanation of analysis"
}

Consider developmental appropriateness and err on the side of caution for child safety.`;

      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_SAFETY || process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a child psychology expert analyzing conversations for emotional distress with sensitivity and care.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 400
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI analysis');
      }

      const analysis = JSON.parse(content);
      
      return {
        distressLevel: analysis.distressLevel || 'none',
        confidence: Math.min(Math.max(analysis.confidence || 0, 0), 1),
        reasoning: analysis.reasoning || 'AI analysis completed'
      };

    } catch (error) {
      this.logger.warn('AI distress analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        distressLevel: 'none',
        confidence: 0,
        reasoning: 'AI analysis unavailable'
      };
    }
  }

  private calculateDistressLevel(
    indicators: DistressIndicator[], 
    aiAnalysis: { distressLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'critical'; confidence: number }
  ): 'none' | 'mild' | 'moderate' | 'severe' | 'critical' {
    
    if (indicators.length === 0 && aiAnalysis.distressLevel === 'none') {
      return 'none';
    }

    // Calculate severity from indicators
    const avgSeverity = indicators.length > 0 
      ? indicators.reduce((sum, ind) => sum + ind.severity, 0) / indicators.length 
      : 0;

    // Map AI analysis to numeric scale
    const aiSeverityMap = { none: 0, mild: 0.2, moderate: 0.4, severe: 0.7, critical: 1.0 };
    const aiSeverity = aiSeverityMap[aiAnalysis.distressLevel];

    // Combine with weighting (indicators 60%, AI 40%)
    const combinedSeverity = (avgSeverity * 0.6) + (aiSeverity * 0.4);

    // Map back to categorical levels
    if (combinedSeverity >= 0.8) return 'critical';
    if (combinedSeverity >= 0.6) return 'severe';
    if (combinedSeverity >= 0.4) return 'moderate';
    if (combinedSeverity >= 0.2) return 'mild';
    return 'none';
  }

  private calculateConfidence(
    indicators: DistressIndicator[], 
    aiAnalysis: { confidence: number }
  ): number {
    if (indicators.length === 0) {
      return aiAnalysis.confidence;
    }

    const avgIndicatorConfidence = indicators.reduce((sum, ind) => sum + ind.confidence, 0) / indicators.length;
    
    // Combine confidences with weighting
    return (avgIndicatorConfidence * 0.7) + (aiAnalysis.confidence * 0.3);
  }

  private generateRecommendedActions(
    distressLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'critical',
    indicators: DistressIndicator[],
    userAge?: number
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];

    if (distressLevel === 'none') {
      return actions;
    }

    // Always start with gentle inquiry for any distress
    if (distressLevel === 'mild' || distressLevel === 'moderate') {
      actions.push({
        action: 'gentle_inquiry',
        priority: 'medium',
        description: 'Gently check in on the child\'s emotional state',
        timeframe: 'immediate'
      });
    }

    // Comfort response for moderate to severe distress
    if (['moderate', 'severe', 'critical'].includes(distressLevel)) {
      actions.push({
        action: 'comfort_response',
        priority: 'high',
        description: 'Provide immediate emotional comfort and validation',
        timeframe: 'immediate'
      });
    }

    // Parent notification for moderate and above
    if (['moderate', 'severe', 'critical'].includes(distressLevel)) {
      actions.push({
        action: 'parent_notification',
        priority: distressLevel === 'critical' ? 'urgent' : 'high',
        description: 'Notify parent/guardian of child\'s emotional state',
        timeframe: distressLevel === 'critical' ? 'immediate' : 'within 1 hour'
      });
    }

    // Crisis intervention for severe/critical
    if (['severe', 'critical'].includes(distressLevel)) {
      actions.push({
        action: 'crisis_intervention',
        priority: 'urgent',
        description: 'Initiate crisis intervention protocols',
        timeframe: 'immediate'
      });
    }

    // Professional referral for critical cases
    if (distressLevel === 'critical') {
      actions.push({
        action: 'professional_referral',
        priority: 'urgent',
        description: 'Connect with mental health professionals',
        timeframe: 'immediate'
      });
    }

    // Topic redirect for mild cases
    if (distressLevel === 'mild') {
      actions.push({
        action: 'topic_redirect',
        priority: 'low',
        description: 'Gently redirect to positive, engaging content',
        timeframe: 'immediate'
      });
    }

    return actions;
  }

  private generateSuggestedResponse(
    distressLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'critical',
    indicators: DistressIndicator[],
    userAge?: number
  ): string {
    const isYoungChild = userAge && userAge < 8;

    if (distressLevel === 'critical') {
      return isYoungChild
        ? "I can tell you might be having some big, hard feelings right now. That's okay - everyone has difficult times. I want to make sure you're safe and get you some help from people who care about you."
        : "I can sense that you might be going through something really difficult right now. Your feelings are valid, and you don't have to handle this alone. Let's make sure you get the support you need.";
    }

    if (distressLevel === 'severe') {
      return isYoungChild
        ? "It seems like you might be feeling upset or worried about something. Sometimes talking about our feelings can help. Would you like to tell me what's on your mind?"
        : "I'm noticing that you might be feeling stressed or overwhelmed. It's completely normal to have difficult emotions, and I'm here to listen if you'd like to share what's going on.";
    }

    if (distressLevel === 'moderate') {
      return isYoungChild
        ? "I can tell something might be bothering you a little bit. Sometimes when we're feeling different, it helps to talk about it or do something fun. How are you feeling right now?"
        : "I'm picking up that you might be feeling a bit stressed or down. That's totally understandable - we all have ups and downs. Would you like to talk about it, or would you prefer to focus on creating something positive together?";
    }

    if (distressLevel === 'mild') {
      return isYoungChild
        ? "You seem a little quiet today. That's okay! Sometimes we all need quiet time. Would you like to create a gentle, happy story together?"
        : "I'm sensing you might be feeling a bit off today. That's completely normal - we all have those days. Would you like to create something that might help you feel better?";
    }

    return "I'm here to help you create wonderful stories. How are you feeling today?";
  }

  private calculateVariation(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    return standardDeviation / mean; // Coefficient of variation
  }
}