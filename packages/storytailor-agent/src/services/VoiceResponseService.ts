import { VoiceService } from '@alexa-multi-agent/voice-synthesis';
import { VoiceSynthesisRequest, AudioChunk } from '@alexa-multi-agent/voice-synthesis';
import { VoiceSettings, ConversationPhase } from '@alexa-multi-agent/shared-types';
import { SupportedLocale } from '../types/alexa';
import { createLogger } from '../utils/logger';

export interface VoiceResponseOptions {
  text: string;
  emotion: 'excited' | 'calm' | 'mysterious' | 'gentle';
  childAge?: number;
  locale: SupportedLocale;
  sessionId: string;
  userId: string;
  conversationPhase: ConversationPhase;
  storyMood?: 'happy' | 'adventurous' | 'peaceful' | 'mysterious' | 'dramatic';
}

export interface VoiceAdaptationSettings {
  speed: number;
  clarity: 'high' | 'medium' | 'low';
  volume: number;
  emotionalInflection: number; // 0.0 - 1.0
  pauseDuration: number; // milliseconds between sentences
}

export class VoiceResponseService {
  private logger = createLogger('voice-response-service');
  private voiceService: VoiceService;

  constructor(voiceService: VoiceService) {
    this.voiceService = voiceService;
  }

  /**
   * Generates voice response with emotional inflection and age adaptation
   */
  async generateVoiceResponse(options: VoiceResponseOptions): Promise<{
    audioData: Buffer;
    duration: number;
    cost: number;
  }> {
    try {
      this.logger.info('Generating voice response', {
        sessionId: options.sessionId,
        textLength: options.text.length,
        emotion: options.emotion,
        childAge: options.childAge,
        locale: options.locale,
        conversationPhase: options.conversationPhase
      });

      // Adapt text for child's age and emotional context
      const adaptedText = await this.adaptTextForChild(options);

      // Get voice settings optimized for the context
      const voiceSettings = this.getOptimizedVoiceSettings(options);

      // Create synthesis request
      const synthesisRequest: VoiceSynthesisRequest = {
        text: adaptedText,
        language: options.locale,
        emotion: this.mapEmotionToSynthesisEmotion(options.emotion, options.storyMood),
        voiceId: this.selectVoiceForLocale(options.locale, options.childAge),
        userId: options.userId,
        sessionId: options.sessionId,
        priority: 'high', // Voice-first requires high priority
        format: 'pcm',
        sampleRate: 16000,
        streaming: true
      };

      // Generate audio with streaming for low latency
      const chunks: AudioChunk[] = [];
      const response = await this.voiceService.stream(synthesisRequest, (chunk) => {
        chunks.push(chunk);
      });

      if (!response.success || !response.audioData) {
        throw new Error(`Voice synthesis failed: ${response.error}`);
      }

      this.logger.info('Voice response generated successfully', {
        sessionId: options.sessionId,
        engine: response.engine,
        latency: response.latency,
        duration: response.duration,
        cost: response.cost,
        chunksReceived: chunks.length
      });

      return {
        audioData: response.audioData,
        duration: response.duration || 0,
        cost: response.cost || 0
      };

    } catch (error) {
      this.logger.error('Failed to generate voice response', {
        sessionId: options.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Streams voice response in real-time for conversation
   */
  async streamVoiceResponse(
    options: VoiceResponseOptions,
    onChunk: (chunk: AudioChunk) => void
  ): Promise<{
    totalDuration: number;
    cost: number;
    chunkCount: number;
  }> {
    try {
      this.logger.info('Starting voice response streaming', {
        sessionId: options.sessionId,
        textLength: options.text.length,
        emotion: options.emotion
      });

      // Adapt text for streaming (shorter sentences for better flow)
      const streamingText = await this.adaptTextForStreaming(options);

      // Create synthesis request optimized for streaming
      const synthesisRequest: VoiceSynthesisRequest = {
        text: streamingText,
        language: options.locale,
        emotion: this.mapEmotionToSynthesisEmotion(options.emotion, options.storyMood),
        voiceId: this.selectVoiceForLocale(options.locale, options.childAge),
        userId: options.userId,
        sessionId: options.sessionId,
        priority: 'high',
        format: 'pcm',
        sampleRate: 16000,
        streaming: true
      };

      let chunkCount = 0;
      const response = await this.voiceService.stream(synthesisRequest, (chunk) => {
        chunkCount++;
        // Apply voice adaptation settings to chunk
        const adaptedChunk = this.applyVoiceAdaptation(chunk, options);
        onChunk(adaptedChunk);
      });

      if (!response.success) {
        throw new Error(`Voice streaming failed: ${response.error}`);
      }

      this.logger.info('Voice response streaming completed', {
        sessionId: options.sessionId,
        engine: response.engine,
        latency: response.latency,
        duration: response.duration,
        cost: response.cost,
        chunkCount
      });

      return {
        totalDuration: response.duration || 0,
        cost: response.cost || 0,
        chunkCount
      };

    } catch (error) {
      this.logger.error('Failed to stream voice response', {
        sessionId: options.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Adapts voice settings for different child ages and needs
   */
  async adaptVoiceForAge(
    text: string,
    childAge: number,
    locale: SupportedLocale
  ): Promise<VoiceAdaptationSettings> {
    // Age-based voice adaptation
    let adaptationSettings: VoiceAdaptationSettings;

    if (childAge <= 4) {
      // Very young children - slower, clearer speech
      adaptationSettings = {
        speed: 0.8,
        clarity: 'high',
        volume: 0.9,
        emotionalInflection: 0.8,
        pauseDuration: 800
      };
    } else if (childAge <= 7) {
      // Young children - moderate pace, high clarity
      adaptationSettings = {
        speed: 0.9,
        clarity: 'high',
        volume: 0.85,
        emotionalInflection: 0.9,
        pauseDuration: 600
      };
    } else if (childAge <= 10) {
      // School age - normal pace, good clarity
      adaptationSettings = {
        speed: 1.0,
        clarity: 'high',
        volume: 0.8,
        emotionalInflection: 1.0,
        pauseDuration: 400
      };
    } else {
      // Older children - can handle faster pace
      adaptationSettings = {
        speed: 1.1,
        clarity: 'medium',
        volume: 0.8,
        emotionalInflection: 1.0,
        pauseDuration: 300
      };
    }

    this.logger.debug('Adapted voice settings for age', {
      childAge,
      adaptationSettings
    });

    return adaptationSettings;
  }

  /**
   * Adds emotional inflection based on story mood and context
   */
  async addEmotionalInflection(
    text: string,
    storyMood: 'happy' | 'adventurous' | 'peaceful' | 'mysterious' | 'dramatic',
    emotion: 'excited' | 'calm' | 'mysterious' | 'gentle'
  ): Promise<string> {
    // Add SSML tags for emotional inflection
    let inflectedText = text;

    // Apply mood-based inflection
    switch (storyMood) {
      case 'happy':
        inflectedText = `<prosody rate="medium" pitch="high" volume="loud">${text}</prosody>`;
        break;
      case 'adventurous':
        inflectedText = `<prosody rate="fast" pitch="medium" volume="loud"><emphasis level="strong">${text}</emphasis></prosody>`;
        break;
      case 'peaceful':
        inflectedText = `<prosody rate="slow" pitch="low" volume="soft">${text}</prosody>`;
        break;
      case 'mysterious':
        inflectedText = `<prosody rate="slow" pitch="low" volume="medium"><emphasis level="moderate">${text}</emphasis></prosody>`;
        break;
      case 'dramatic':
        inflectedText = `<prosody rate="medium" pitch="high" volume="loud"><emphasis level="strong">${text}</emphasis></prosody>`;
        break;
    }

    // Add pauses for dramatic effect
    if (storyMood === 'mysterious' || storyMood === 'dramatic') {
      inflectedText = inflectedText.replace(/\./g, '.<break time="500ms"/>');
      inflectedText = inflectedText.replace(/!/g, '!<break time="300ms"/>');
      inflectedText = inflectedText.replace(/\?/g, '?<break time="400ms"/>');
    }

    return `<speak>${inflectedText}</speak>`;
  }

  /**
   * Manages voice settings for optimal storytelling experience
   */
  getVoiceSettings(
    emotion: 'excited' | 'calm' | 'mysterious' | 'gentle',
    childAge?: number,
    locale: SupportedLocale = 'en-US'
  ): VoiceSettings {
    const baseSettings: VoiceSettings = {
      voice: this.selectVoiceForLocale(locale, childAge),
      speed: 1.0,
      emotion,
      volume: 0.8,
      clarity: 'high'
    };

    // Adjust based on emotion
    switch (emotion) {
      case 'excited':
        baseSettings.speed = 1.1;
        baseSettings.volume = 0.9;
        break;
      case 'calm':
        baseSettings.speed = 0.9;
        baseSettings.volume = 0.7;
        break;
      case 'mysterious':
        baseSettings.speed = 0.8;
        baseSettings.volume = 0.75;
        break;
      case 'gentle':
        baseSettings.speed = 0.95;
        baseSettings.volume = 0.8;
        break;
    }

    // Age-based adjustments
    if (childAge && childAge <= 5) {
      baseSettings.speed *= 0.9; // Slower for very young children
      baseSettings.clarity = 'high';
    }

    return baseSettings;
  }

  /**
   * Private helper methods
   */

  private async adaptTextForChild(options: VoiceResponseOptions): Promise<string> {
    let adaptedText = options.text;

    // Age-based vocabulary and complexity adaptation
    if (options.childAge && options.childAge <= 5) {
      // Simplify vocabulary for very young children
      adaptedText = this.simplifyVocabulary(adaptedText);
    }

    // Add conversation phase specific adaptations
    switch (options.conversationPhase) {
      case 'character':
        adaptedText = this.addCharacterCreationEnthusiasm(adaptedText);
        break;
      case 'story':
        adaptedText = this.addStorytellingDrama(adaptedText, options.storyMood);
        break;
      case 'editing':
        adaptedText = this.addEditingEncouragement(adaptedText);
        break;
      case 'finalization':
        adaptedText = this.addCompletionCelebration(adaptedText);
        break;
    }

    return adaptedText;
  }

  private async adaptTextForStreaming(options: VoiceResponseOptions): Promise<string> {
    let text = options.text;

    // Break long sentences into shorter chunks for better streaming
    text = text.replace(/([.!?])\s+/g, '$1\n');
    
    // Add natural pauses for breathing
    text = text.replace(/,\s+/g, ', ');
    
    // Ensure sentences aren't too long for streaming
    const sentences = text.split('\n');
    const optimizedSentences = sentences.map(sentence => {
      if (sentence.length > 100) {
        // Break long sentences at natural points
        return sentence.replace(/(,\s+|\s+and\s+|\s+but\s+|\s+so\s+)/g, '$1\n');
      }
      return sentence;
    });

    return optimizedSentences.join('\n').replace(/\n+/g, '\n').trim();
  }

  private applyVoiceAdaptation(chunk: AudioChunk, options: VoiceResponseOptions): AudioChunk {
    // Apply real-time voice adaptations to audio chunks
    // This would involve audio processing for speed, pitch, etc.
    // For now, return the chunk as-is (actual audio processing would be more complex)
    
    return {
      ...chunk,
      timestamp: Date.now() // Update timestamp for adaptation tracking
    };
  }

  private getOptimizedVoiceSettings(options: VoiceResponseOptions): any {
    // Return optimized voice synthesis settings based on context
    return {
      stability: 0.75,
      similarityBoost: 0.8,
      style: options.emotion === 'excited' ? 0.8 : 0.6,
      useSpeakerBoost: true
    };
  }

  private mapEmotionToSynthesisEmotion(
    emotion: 'excited' | 'calm' | 'mysterious' | 'gentle',
    storyMood?: string
  ): 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'dramatic' {
    // Map storytelling emotions to synthesis engine emotions
    const emotionMap: Record<string, 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'dramatic'> = {
      'excited': 'excited',
      'calm': 'calm',
      'mysterious': 'dramatic',
      'gentle': 'calm'
    };

    // Consider story mood for additional context
    if (storyMood === 'happy') return 'happy';
    if (storyMood === 'dramatic') return 'dramatic';

    return emotionMap[emotion] || 'neutral';
  }

  private selectVoiceForLocale(locale: SupportedLocale, childAge?: number): string {
    // Select appropriate voice based on locale and child age
    const voiceMap: Record<SupportedLocale, { child: string; default: string }> = {
      'en-US': { child: 'en-US-AriaNeural', default: 'en-US-AriaNeural' },
      'en-GB': { child: 'en-GB-SoniaNeural', default: 'en-GB-SoniaNeural' },
      'en-CA': { child: 'en-CA-ClaraNeural', default: 'en-CA-ClaraNeural' },
      'en-AU': { child: 'en-AU-NatashaNeural', default: 'en-AU-NatashaNeural' },
      'es-US': { child: 'es-US-PalomaNeural', default: 'es-US-PalomaNeural' },
      'es-ES': { child: 'es-ES-ElviraNeural', default: 'es-ES-ElviraNeural' },
      'fr-FR': { child: 'fr-FR-DeniseNeural', default: 'fr-FR-DeniseNeural' },
      'de-DE': { child: 'de-DE-KatjaNeural', default: 'de-DE-KatjaNeural' },
      'it-IT': { child: 'it-IT-ElsaNeural', default: 'it-IT-ElsaNeural' },
      'ja-JP': { child: 'ja-JP-NanamiNeural', default: 'ja-JP-NanamiNeural' }
    };

    const voices = voiceMap[locale] || voiceMap['en-US'];
    return childAge && childAge <= 8 ? voices.child : voices.default;
  }

  private simplifyVocabulary(text: string): string {
    // Simple vocabulary replacements for very young children
    const replacements: Record<string, string> = {
      'magnificent': 'amazing',
      'extraordinary': 'special',
      'adventure': 'fun trip',
      'character': 'friend',
      'mysterious': 'secret',
      'wonderful': 'great',
      'fantastic': 'super',
      'incredible': 'wow'
    };

    let simplified = text;
    Object.entries(replacements).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    });

    return simplified;
  }

  private addCharacterCreationEnthusiasm(text: string): string {
    // Add enthusiasm markers for character creation
    if (!text.includes('!')) {
      text = text.replace(/\.$/, '!');
    }
    return text;
  }

  private addStorytellingDrama(text: string, storyMood?: string): string {
    // Add dramatic pauses and emphasis for storytelling
    if (storyMood === 'mysterious' || storyMood === 'dramatic') {
      text = text.replace(/\.\.\./g, '... ');
      text = text.replace(/\!/g, '! ');
    }
    return text;
  }

  private addEditingEncouragement(text: string): string {
    // Add encouraging tone for editing phase
    const encouragingPhrases = [
      'Great idea!',
      'That sounds wonderful!',
      'Perfect!',
      'I love that!'
    ];
    
    // Randomly add encouraging phrases (simplified for demo)
    if (Math.random() < 0.3) {
      const phrase = encouragingPhrases[Math.floor(Math.random() * encouragingPhrases.length)];
      text = `${phrase} ${text}`;
    }
    
    return text;
  }

  private addCompletionCelebration(text: string): string {
    // Add celebratory tone for completion
    if (!text.includes('!')) {
      text = text.replace(/\.$/, '!');
    }
    
    // Add celebration markers
    if (text.includes('complete') || text.includes('finished') || text.includes('done')) {
      text = text.replace(/(complete|finished|done)/gi, '$1! 🎉');
    }
    
    return text;
  }
}