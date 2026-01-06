import { SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  MultiModalInput,
  AdaptationError,
} from '../types';

interface VoiceInputData {
  audioData: ArrayBuffer;
  sampleRate: number;
  duration: number;
  confidence?: number;
}

interface TouchInputData {
  coordinates: { x: number; y: number };
  pressure: number;
  duration: number;
  gestureType?: 'tap' | 'hold' | 'swipe' | 'pinch';
}

interface GestureInputData {
  gestureType: 'wave' | 'point' | 'nod' | 'shake' | 'thumbs_up' | 'thumbs_down';
  confidence: number;
  duration: number;
  coordinates?: { x: number; y: number; z: number };
}

interface SwitchInputData {
  switchId: string;
  activationType: 'press' | 'release' | 'hold';
  duration: number;
  sequence?: string[];
}

interface EyeTrackingData {
  gazePoint: { x: number; y: number };
  fixationDuration: number;
  blinkDetected: boolean;
  confidence: number;
}

export class MultiModalInputProcessor {
  private inputHistory: Map<string, MultiModalInput[]> = new Map();
  private processingStrategies: Map<string, (data: any, profile: AccessibilityProfile) => Promise<string>> = new Map();

  constructor(private supabase: SupabaseClient) {
    this.initializeProcessingStrategies();
  }

  async processInput(
    userId: string,
    sessionId: string,
    inputData: {
      type: 'voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking' | 'combined';
      data: any;
      timestamp?: Date;
    },
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number; processingTime: number }> {
    const startTime = Date.now();

    try {
      // Create input record
      const multiModalInput: MultiModalInput = {
        userId,
        sessionId,
        inputType: inputData.type,
        inputData: inputData.data,
        confidence: 0,
        timestamp: inputData.timestamp || new Date(),
        processingTime: 0,
      };

      // Process based on input type
      let processedInput: string;
      let confidence: number;

      switch (inputData.type) {
        case 'voice':
          ({ processedInput, confidence } = await this.processVoiceInput(inputData.data as VoiceInputData, profile));
          break;
        case 'touch':
          ({ processedInput, confidence } = await this.processTouchInput(inputData.data as TouchInputData, profile));
          break;
        case 'gesture':
          ({ processedInput, confidence } = await this.processGestureInput(inputData.data as GestureInputData, profile));
          break;
        case 'switch':
          ({ processedInput, confidence } = await this.processSwitchInput(inputData.data as SwitchInputData, profile));
          break;
        case 'eye_tracking':
          ({ processedInput, confidence } = await this.processEyeTrackingInput(inputData.data as EyeTrackingData, profile));
          break;
        case 'combined':
          ({ processedInput, confidence } = await this.processCombinedInput(inputData.data, profile));
          break;
        default:
          throw new AdaptationError(`Unsupported input type: ${inputData.type}`, { inputType: inputData.type });
      }

      const processingTime = Date.now() - startTime;

      // Update input record
      multiModalInput.confidence = confidence;
      multiModalInput.processingTime = processingTime;

      // Store in database
      await this.storeInputRecord(multiModalInput);

      // Update local history
      this.updateInputHistory(userId, sessionId, multiModalInput);

      // Apply accessibility adaptations
      const adaptedInput = await this.applyAccessibilityAdaptations(processedInput, profile, inputData.type);

      return {
        processedInput: adaptedInput,
        confidence,
        processingTime,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process multi-modal input: ${message}`, { userId, sessionId, inputType: inputData.type });
    }
  }

  async getInputHistory(
    userId: string,
    sessionId?: string,
    limit: number = 50
  ): Promise<MultiModalInput[]> {
    try {
      let query = this.supabase
        .from('multimodal_inputs')
        .select('*')
        .eq('userId', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (sessionId) {
        query = query.eq('sessionId', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to get input history: ${message}`, { userId, sessionId });
    }
  }

  async getInputPatterns(userId: string): Promise<{
    preferredInputTypes: Array<{ type: string; usage: number; successRate: number }>;
    averageConfidence: Record<string, number>;
    processingTimes: Record<string, number>;
    recommendations: string[];
  }> {
    try {
      const history = await this.getInputHistory(userId, undefined, 200);

      if (history.length === 0) {
        return {
          preferredInputTypes: [],
          averageConfidence: {},
          processingTimes: {},
          recommendations: [],
        };
      }

      // Analyze input type preferences
      const typeUsage: Record<string, { count: number; totalConfidence: number; totalTime: number }> = {};
      
      for (const input of history) {
        if (!typeUsage[input.inputType]) {
          typeUsage[input.inputType] = { count: 0, totalConfidence: 0, totalTime: 0 };
        }
        typeUsage[input.inputType].count++;
        typeUsage[input.inputType].totalConfidence += input.confidence;
        typeUsage[input.inputType].totalTime += input.processingTime;
      }

      // Calculate preferred input types
      const preferredInputTypes = Object.entries(typeUsage)
        .map(([type, stats]) => ({
          type,
          usage: stats.count,
          successRate: stats.totalConfidence / stats.count,
        }))
        .sort((a, b) => b.usage - a.usage);

      // Calculate average confidence by type
      const averageConfidence: Record<string, number> = {};
      const processingTimes: Record<string, number> = {};

      for (const [type, stats] of Object.entries(typeUsage)) {
        averageConfidence[type] = stats.totalConfidence / stats.count;
        processingTimes[type] = stats.totalTime / stats.count;
      }

      // Generate recommendations
      const recommendations = this.generateInputRecommendations(preferredInputTypes, averageConfidence, processingTimes);

      return {
        preferredInputTypes,
        averageConfidence,
        processingTimes,
        recommendations,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to get input patterns: ${message}`, { userId });
    }
  }

  private initializeProcessingStrategies(): void {
    this.processingStrategies.set('voice', this.processVoiceStrategy.bind(this));
    this.processingStrategies.set('touch', this.processTouchStrategy.bind(this));
    this.processingStrategies.set('gesture', this.processGestureStrategy.bind(this));
    this.processingStrategies.set('switch', this.processSwitchStrategy.bind(this));
    this.processingStrategies.set('eye_tracking', this.processEyeTrackingStrategy.bind(this));
  }

  private async processVoiceInput(
    data: VoiceInputData,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      // Mock voice processing - in real implementation, this would use speech recognition
      const mockTranscription = "I want to create a story about a dragon";
      let confidence = data.confidence || 0.8;

      // Apply speech processing adaptations
      if (profile.speechProcessingDelay > 0) {
        // Allow extra processing time for speech difficulties
        await new Promise(resolve => setTimeout(resolve, profile.speechProcessingDelay));
        confidence = Math.min(confidence + 0.1, 1.0); // Boost confidence with extra processing time
      }

      // Filter out speech artifacts if needed
      let processedInput = mockTranscription;
      if (profile.extendedResponseTime) {
        processedInput = this.cleanSpeechArtifacts(processedInput);
      }

      return { processedInput, confidence };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process voice input: ${message}`, { data });
    }
  }

  private async processTouchInput(
    data: TouchInputData,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      let processedInput = '';
      let confidence = 0.7;

      // Interpret touch gesture
      switch (data.gestureType) {
        case 'tap':
          processedInput = 'select';
          confidence = 0.9;
          break;
        case 'hold':
          processedInput = 'menu';
          confidence = 0.8;
          break;
        case 'swipe':
          processedInput = this.interpretSwipe(data.coordinates);
          confidence = 0.7;
          break;
        case 'pinch':
          processedInput = 'zoom';
          confidence = 0.8;
          break;
        default:
          processedInput = 'touch';
          confidence = 0.5;
      }

      // Apply motor difficulty adaptations
      if (profile.motorDifficultySupport) {
        // Be more lenient with touch accuracy
        confidence = Math.min(confidence + 0.2, 1.0);
        
        // Extend timeout for motor difficulties
        if (data.duration < profile.customTimeoutDuration / 1000) {
          confidence = Math.max(confidence - 0.1, 0.1);
        }
      }

      return { processedInput, confidence };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process touch input: ${message}`, { data });
    }
  }

  private async processGestureInput(
    data: GestureInputData,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      let processedInput = '';
      let confidence = data.confidence;

      // Interpret gesture
      switch (data.gestureType) {
        case 'wave':
          processedInput = 'hello';
          break;
        case 'point':
          processedInput = 'select that';
          break;
        case 'nod':
          processedInput = 'yes';
          break;
        case 'shake':
          processedInput = 'no';
          break;
        case 'thumbs_up':
          processedInput = 'good';
          break;
        case 'thumbs_down':
          processedInput = 'bad';
          break;
        default:
          processedInput = 'gesture';
          confidence = 0.3;
      }

      // Apply accessibility adaptations
      if (profile.extendedTimeouts && data.duration < 2000) {
        // Reduce confidence for quick gestures if extended timeouts are needed
        confidence = Math.max(confidence - 0.2, 0.1);
      }

      return { processedInput, confidence };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process gesture input: ${message}`, { data });
    }
  }

  private async processSwitchInput(
    data: SwitchInputData,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      let processedInput = '';
      let confidence = 0.9; // Switch inputs are typically very reliable

      // Interpret switch activation
      switch (data.activationType) {
        case 'press':
          processedInput = 'select';
          break;
        case 'hold':
          processedInput = 'menu';
          break;
        case 'release':
          processedInput = 'cancel';
          break;
      }

      // Handle switch sequences
      if (data.sequence && data.sequence.length > 1) {
        processedInput = this.interpretSwitchSequence(data.sequence);
        confidence = Math.max(0.7, confidence - (data.sequence.length * 0.05));
      }

      // Apply switch control adaptations
      if (profile.switchControlSupport) {
        // Adjust for switch control timing preferences
        const expectedDuration = 500; // Default expected duration
        if (Math.abs(data.duration - expectedDuration) > 200) {
          confidence = Math.max(confidence - 0.1, 0.5);
        }
      }

      return { processedInput, confidence };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process switch input: ${message}`, { data });
    }
  }

  private async processEyeTrackingInput(
    data: EyeTrackingData,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      let processedInput = '';
      let confidence = data.confidence;

      // Interpret eye tracking data
      if (data.fixationDuration > 1000) {
        processedInput = 'select';
        confidence = Math.min(confidence + 0.1, 1.0);
      } else if (data.blinkDetected) {
        processedInput = 'blink select';
        confidence = 0.8;
      } else {
        processedInput = 'look';
        confidence = Math.max(confidence - 0.2, 0.3);
      }

      // Apply eye tracking adaptations
      if (profile.eyeTrackingSupport) {
        // Adjust confidence based on gaze stability
        const gazeStability = this.calculateGazeStability(data.gazePoint);
        confidence = confidence * gazeStability;
      }

      return { processedInput, confidence };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process eye tracking input: ${message}`, { data });
    }
  }

  private async processCombinedInput(
    data: any,
    profile: AccessibilityProfile
  ): Promise<{ processedInput: string; confidence: number }> {
    try {
      // Process multiple input types simultaneously
      const inputs = data.inputs || [];
      const processedInputs: Array<{ input: string; confidence: number; weight: number }> = [];

      for (const input of inputs) {
        const result = await this.processInput(
          profile.userId,
          'combined-session',
          input,
          profile
        );
        
        processedInputs.push({
          input: result.processedInput,
          confidence: result.confidence,
          weight: this.getInputTypeWeight(input.type),
        });
      }

      // Combine inputs using weighted confidence
      let combinedInput = '';
      let totalWeight = 0;
      let weightedConfidence = 0;

      for (const processed of processedInputs) {
        if (processed.confidence > 0.5) { // Only include confident inputs
          combinedInput += processed.input + ' ';
          weightedConfidence += processed.confidence * processed.weight;
          totalWeight += processed.weight;
        }
      }

      const finalConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0.3;

      return {
        processedInput: combinedInput.trim(),
        confidence: finalConfidence,
      };
    } catch (error: unknown) {
      const message = (error && typeof error === 'object' && 'message' in error) ? String((error as any).message) : String(error);
      throw new AdaptationError(`Failed to process combined input: ${message}`, { data });
    }
  }

  private async applyAccessibilityAdaptations(
    input: string,
    profile: AccessibilityProfile,
    inputType: string
  ): Promise<string> {
    let adaptedInput = input;

    // Apply vocabulary adaptations
    if (profile.vocabularyLevel === 'simple' || profile.simplifiedLanguageMode) {
      adaptedInput = this.simplifyInputVocabulary(adaptedInput);
    }

    // Apply custom vocabulary terms
    for (const term of profile.customVocabularyTerms) {
      const [complex, simple] = term.split(':');
      if (complex && simple) {
        const regex = new RegExp(`\\b${complex}\\b`, 'gi');
        adaptedInput = adaptedInput.replace(regex, simple);
      }
    }

    return adaptedInput;
  }

  // Helper methods
  private cleanSpeechArtifacts(text: string): string {
    return text
      .replace(/\b(um|uh|er|ah)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private interpretSwipe(coordinates: { x: number; y: number }): string {
    // Simple swipe direction interpretation
    if (Math.abs(coordinates.x) > Math.abs(coordinates.y)) {
      return coordinates.x > 0 ? 'next' : 'previous';
    } else {
      return coordinates.y > 0 ? 'down' : 'up';
    }
  }

  private interpretSwitchSequence(sequence: string[]): string {
    // Interpret common switch sequences
    const sequenceMap: Record<string, string> = {
      'press,press': 'double select',
      'press,hold': 'context menu',
      'hold,press': 'special action',
      'press,release,press': 'confirm',
    };

    const sequenceKey = sequence.join(',');
    return sequenceMap[sequenceKey] || 'sequence';
  }

  private calculateGazeStability(gazePoint: { x: number; y: number }): number {
    // Mock gaze stability calculation
    // In real implementation, this would analyze gaze point variance over time
    return Math.random() * 0.3 + 0.7; // Return value between 0.7 and 1.0
  }

  private getInputTypeWeight(inputType: string): number {
    const weights: Record<string, number> = {
      'voice': 1.0,
      'touch': 0.8,
      'gesture': 0.6,
      'switch': 0.9,
      'eye_tracking': 0.7,
    };

    return weights[inputType] || 0.5;
  }

  private simplifyInputVocabulary(input: string): string {
    const simplifications: Record<string, string> = {
      'select': 'pick',
      'menu': 'list',
      'cancel': 'stop',
      'confirm': 'yes',
      'previous': 'back',
      'next': 'forward',
    };

    let simplified = input;
    for (const [complex, simple] of Object.entries(simplifications)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    return simplified;
  }

  private generateInputRecommendations(
    preferredTypes: Array<{ type: string; usage: number; successRate: number }>,
    averageConfidence: Record<string, number>,
    processingTimes: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Recommend most successful input types
    const bestType = preferredTypes.find(type => type.successRate > 0.8);
    if (bestType) {
      recommendations.push(`Continue using ${bestType.type} input - you have a ${Math.round(bestType.successRate * 100)}% success rate`);
    }

    // Recommend alternatives for low-confidence types
    for (const [type, confidence] of Object.entries(averageConfidence)) {
      if (confidence < 0.6) {
        recommendations.push(`Consider alternative to ${type} input - current confidence is ${Math.round(confidence * 100)}%`);
      }
    }

    // Recommend optimizations for slow processing
    for (const [type, time] of Object.entries(processingTimes)) {
      if (time > 2000) {
        recommendations.push(`${type} input processing is slow (${Math.round(time)}ms) - consider enabling extended timeouts`);
      }
    }

    return recommendations;
  }

  // Strategy methods (for future extensibility)
  private async processVoiceStrategy(data: any, profile: AccessibilityProfile): Promise<string> {
    return this.processVoiceInput(data, profile).then(result => result.processedInput);
  }

  private async processTouchStrategy(data: any, profile: AccessibilityProfile): Promise<string> {
    return this.processTouchInput(data, profile).then(result => result.processedInput);
  }

  private async processGestureStrategy(data: any, profile: AccessibilityProfile): Promise<string> {
    return this.processGestureInput(data, profile).then(result => result.processedInput);
  }

  private async processSwitchStrategy(data: any, profile: AccessibilityProfile): Promise<string> {
    return this.processSwitchInput(data, profile).then(result => result.processedInput);
  }

  private async processEyeTrackingStrategy(data: any, profile: AccessibilityProfile): Promise<string> {
    return this.processEyeTrackingInput(data, profile).then(result => result.processedInput);
  }

  private async storeInputRecord(input: MultiModalInput): Promise<void> {
    try {
      await this.supabase
        .from('multimodal_inputs')
        .insert(input);
    } catch (error: unknown) {
      // Log error but don't throw - input logging shouldn't break the main flow
      console.error('Failed to store input record:', error);
    }
  }

  private updateInputHistory(userId: string, sessionId: string, input: MultiModalInput): void {
    const key = `${userId}-${sessionId}`;
    const history = this.inputHistory.get(key) || [];
    history.push(input);
    
    // Keep only last 100 inputs in memory
    if (history.length > 100) {
      history.shift();
    }
    
    this.inputHistory.set(key, history);
  }
}