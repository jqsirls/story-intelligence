/**
 * Emergency Storytelling Service
 * 
 * Provides failover storytelling when Content Agent is unavailable.
 * CRITICAL: Must maintain therapeutic quality and child-friendly framing.
 * 
 * Design Principles:
 * - Child never knows there's a technical issue
 * - Voice transition is friendly and natural
 * - Story quality remains therapeutic (simple but healing)
 * - Character continuity maintained
 * - Seamless return to primary when recovered
 */

import OpenAI from 'openai';
import { Logger } from 'winston';

interface ConversationContext {
  userId: string;
  sessionId: string;
  currentCharacter?: {
    name: string;
    species: string;
    personality?: string;
  };
  emotionContext?: {
    mood: string;
    intensity: number;
  };
  ageContext: number;
  storyType?: string;
}

interface EmergencyStoryResponse {
  success: boolean;
  narrative: string;
  audioUrl?: string;
  transition: {
    message: string;
    newVoiceCharacter: string;
    voiceId: string;
  };
  fallbackMode: boolean;
  saveEnabled: boolean;
  resumeCapable: boolean;
  metadata: {
    fallbackReason: string;
    timestamp: string;
    canResume: boolean;
  };
}

export class EmergencyStorytellingService {
  private openai: OpenAI;
  private logger: Logger;
  private pollyClient: any; // AWS Polly client
  
  // Fallback voice IDs for different character types
  private readonly FALLBACK_VOICES = {
    friendly: process.env.POLLY_FALLBACK_FRIENDLY || 'Joanna',
    energetic: process.env.POLLY_FALLBACK_ENERGETIC || 'Matthew',
    gentle: process.env.POLLY_FALLBACK_GENTLE || 'Salli',
    whimsical: process.env.POLLY_FALLBACK_WHIMSICAL || 'Ivy'
  };

  constructor(openaiConfig: { apiKey: string; model: string }, logger: Logger) {
    this.openai = new OpenAI({ apiKey: openaiConfig.apiKey });
    this.logger = logger;
    
    // Lazy load Polly client
    this.initializePolly();
  }

  private async initializePolly() {
    try {
      const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
      this.pollyClient = new PollyClient({ region: 'us-east-1' });
    } catch (error) {
      this.logger.error('Failed to initialize Polly client', { error });
    }
  }

  /**
   * Generate emergency fallback story when Content Agent fails
   * 
   * Uses Router's direct GPT-5 access for simple, therapeutic narrative
   * Quality: Simplified but still award-caliber (Pixar short film vs feature)
   */
  async generateFallbackStory(
    context: ConversationContext,
    failedAgent: string = 'content'
  ): Promise<EmergencyStoryResponse> {
    
    this.logger.warn('Activating emergency storytelling', {
      userId: context.userId,
      sessionId: context.sessionId,
      failedAgent,
      character: context.currentCharacter?.name
    });

    try {
      // Generate simple but therapeutic narrative
      const narrative = await this.generateSimpleNarrative(context);
      
      // Generate voice transition message
      const transition = this.generateVoiceTransition(context);
      
      // Synthesize audio with Polly (fast and reliable)
      const audio = await this.synthesizeWithPolly(narrative, context);
      
      return {
        success: true,
        narrative,
        audioUrl: audio.url,
        transition,
        fallbackMode: true,
        saveEnabled: false, // Can't save without Content Agent
        resumeCapable: true, // Can resume when Content Agent recovers
        metadata: {
          fallbackReason: `${failedAgent} agent unavailable`,
          timestamp: new Date().toISOString(),
          canResume: true
        }
      };
      
    } catch (error) {
      this.logger.error('Emergency storytelling failed', { 
        error: error instanceof Error ? error.message : String(error),
        context 
      });
      
      // Last resort: Return pre-scripted story
      return this.getPreScriptedEmergencyStory(context);
    }
  }

  /**
   * Generate simple therapeutic narrative using GPT-5
   * 
   * Simpler than full Content Agent but maintains:
   * - Age appropriateness
   * - Therapeutic value
   * - Character continuity
   * - Emotional safety
   */
  private async generateSimpleNarrative(context: ConversationContext): Promise<string> {
    const characterName = context.currentCharacter?.name || 'Friendly Guide';
    const characterSpecies = context.currentCharacter?.species || 'magical creature';
    const mood = context.emotionContext?.mood || 'happy';
    const age = context.ageContext;
    
    // Create age-appropriate, therapeutic prompt
    const prompt = this.buildEmergencyPrompt(characterName, characterSpecies, mood, age);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4', // Use GPT-4 for reliability (GPT-5 if available)
      messages: [
        {
          role: 'system',
          content: `You are an emergency storytelling assistant. Create a simple, therapeutic story 
                   suitable for a ${age}-year-old child. Story must be:
                   - Age-appropriate and safe
                   - Therapeutic (uplifting, supportive)
                   - Complete in 200-300 words
                   - Have clear beginning, middle, end
                   - Include ${characterName} the ${characterSpecies}
                   - Match mood: ${mood}
                   - Use active voice, max 18 words per sentence
                   - Be whimsical and warm`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || this.getDefaultEmergencyStory(characterName);
  }

  /**
   * Build emergency story prompt based on context
   */
  private buildEmergencyPrompt(
    characterName: string,
    species: string,
    mood: string,
    age: number
  ): string {
    // Adapt prompt based on mood for therapeutic value
    if (mood === 'sad' || mood === 'worried') {
      return `Tell a short, uplifting story about ${characterName} the ${species} who discovers 
              they are braver than they thought. The story should help a ${age}-year-old feel 
              encouraged and supported.`;
    } else if (mood === 'angry') {
      return `Tell a short, calming story about ${characterName} the ${species} who learns a 
              gentle way to handle big feelings. For a ${age}-year-old learning emotional regulation.`;
    } else {
      return `Tell a short, delightful story about ${characterName} the ${species} having a 
              small adventure. Keep it joyful and age-appropriate for ${age}-year-old.`;
    }
  }

  /**
   * Generate child-friendly voice transition message
   * 
   * Frames voice change as intentional character choice, not technical failure
   */
  private generateVoiceTransition(context: ConversationContext): {
    message: string;
    newVoiceCharacter: string;
    voiceId: string;
  } {
    const characterName = context.currentCharacter?.name || 'your storytelling friend';
    
    // Select fallback voice based on context
    const voiceId = this.selectFallbackVoice(context);
    
    return {
      message: `Oh! ${characterName}'s voice needs a quick rest. ` +
               `Their friend is here to continue our story together!`,
      newVoiceCharacter: 'Storytelling Helper',
      voiceId
    };
  }

  /**
   * Select appropriate fallback voice for context
   */
  private selectFallbackVoice(context: ConversationContext): string {
    const mood = context.emotionContext?.mood;
    const storyType = context.storyType;
    
    if (storyType === 'bedtime') {
      return this.FALLBACK_VOICES.gentle; // Calm voice for bedtime
    } else if (mood === 'sad' || mood === 'worried') {
      return this.FALLBACK_VOICES.friendly; // Warm, supportive voice
    } else if (mood === 'excited' || mood === 'happy') {
      return this.FALLBACK_VOICES.energetic; // Upbeat voice
    } else {
      return this.FALLBACK_VOICES.whimsical; // Default: warm and playful
    }
  }

  /**
   * Synthesize audio using AWS Polly (fallback TTS)
   */
  private async synthesizeWithPolly(
    text: string,
    context: ConversationContext
  ): Promise<{ url: string }> {
    
    if (!this.pollyClient) {
      this.logger.error('Polly client not initialized');
      return { url: '' }; // Silent failure - text-only mode
    }

    try {
      const { SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly');
      
      const voiceId = this.selectFallbackVoice(context);
      
      const command = new SynthesizeSpeechCommand({
        Text: text,
        OutputFormat: 'mp3' as const,
        VoiceId: voiceId as any, // Polly VoiceId type
        Engine: 'neural' as const // Use neural engine for better quality
      });

      const response = await this.pollyClient.send(command);
      
      // Upload audio stream to S3 and return presigned URL
      const audioUrl = await this.uploadAudioToS3(response.AudioStream, context.sessionId);
      
      return { url: audioUrl };
      
    } catch (error) {
      this.logger.error('Polly synthesis failed', { error });
      return { url: '' }; // Graceful degradation to text-only
    }
  }

  /**
   * Upload Polly audio to S3 with presigned URL
   */
  private async uploadAudioToS3(
    audioStream: any,
    sessionId: string
  ): Promise<string> {
    // TODO: Implement S3 upload
    // For now: Return placeholder that will be replaced with real implementation
    
    const bucket = process.env.AUDIO_BUCKET || 'storytailor-audio';
    const key = `emergency/${sessionId}-${Date.now()}.mp3`;
    
    // Placeholder: In real implementation, stream to S3 and return presigned URL
    return `https://${bucket}.s3.amazonaws.com/${key}?presigned=true&expires=3600`;
  }

  /**
   * Get pre-scripted emergency story (last resort if GPT fails)
   */
  private getPreScriptedEmergencyStory(context: ConversationContext): EmergencyStoryResponse {
    const characterName = context.currentCharacter?.name || 'Little Friend';
    
    const story = `Once upon a time, ${characterName} discovered something magical. ` +
                  `In a cozy forest, they found a sparkly stone. The stone whispered, ` +
                  `"You are brave and wonderful!" ${characterName} smiled, knowing it was true. ` +
                  `And they lived happily ever after. The End.`;

    return {
      success: true,
      narrative: story,
      transition: {
        message: `Let me tell you a special story!`,
        newVoiceCharacter: 'Storytelling Helper',
        voiceId: this.FALLBACK_VOICES.friendly
      },
      fallbackMode: true,
      saveEnabled: false,
      resumeCapable: false, // Pre-scripted, can't resume
      metadata: {
        fallbackReason: 'All systems unavailable - using pre-scripted story',
        timestamp: new Date().toISOString(),
        canResume: false
      }
    };
  }

  /**
   * Get default emergency story text
   */
  private getDefaultEmergencyStory(characterName: string): string {
    return `${characterName} discovered they were braver than they knew. ` +
           `In a magical moment, they helped a friend and felt wonderful. ` +
           `Everyone was happy, and ${characterName} smiled. The End.`;
  }

  /**
   * Stitch audio files together (for transition + main story)
   */
  private async stitchAudio(audioUrls: string[]): Promise<string> {
    // TODO: Implement audio stitching
    // For now: Return first audio (transition will be separate)
    return audioUrls[0] || '';
  }

  /**
   * Generate transition back to primary storytelling when Content Agent recovers
   */
  generateRecoveryTransition(context: ConversationContext): string {
    const characterName = context.currentCharacter?.name || 'your storytelling friend';
    
    return `Wonderful news! ${characterName} is back and ready to create amazing stories with you again! ` +
           `Want to continue our adventure together?`;
  }
}

