import { Story, StoryContent, StoryBeat, Character } from '@storytailor/shared-types';
import { VoiceService } from '@storytailor/voice-synthesis';
import { VoiceSynthesisRequest, VoiceSynthesisResponse, AudioChunk } from '@storytailor/voice-synthesis';

export interface AudioGenerationConfig {
  voiceService: VoiceService;
  defaultVoiceId: string;
  narratorVoiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
  characterVoiceSettings: Record<string, {
    voiceId: string;
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  }>;
}

export interface VoiceCustomization {
  voiceId: string;
  stability: number; // 0-1, higher = more consistent
  similarityBoost: number; // 0-1, higher = more similar to original
  style: number; // 0-1, higher = more expressive
  useSpeakerBoost: boolean;
  speed: number; // 0.5-2.0, playback speed multiplier
  emotion: 'neutral' | 'excited' | 'calm' | 'mysterious' | 'gentle' | 'adventurous';
}

export interface StoryAudioSegment {
  id: string;
  type: 'narration' | 'character_dialogue' | 'sound_effect_cue';
  text: string;
  voiceSettings: VoiceCustomization;
  startTime?: number;
  duration?: number;
  audioUrl?: string;
}

export interface GeneratedStoryAudio {
  fullNarrationUrl: string;
  segments: StoryAudioSegment[];
  totalDuration: number;
  metadata: {
    storyId: string;
    characterId: string;
    generatedAt: string;
    voiceSettings: VoiceCustomization;
    wordCount: number;
    estimatedCost: number;
  };
}

export interface AudioRegenerationRequest {
  storyId: string;
  changedBeats?: string[]; // Beat IDs that changed
  newContent?: string; // New story content
  voiceSettings?: Partial<VoiceCustomization>;
}

export class AudioGenerationService {
  private config: AudioGenerationConfig;

  constructor(config: AudioGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate complete story narration audio
   */
  async generateStoryNarration(
    story: Story,
    character: Character,
    voiceSettings?: Partial<VoiceCustomization>
  ): Promise<GeneratedStoryAudio> {
    const startTime = Date.now();
    
    try {
      // Prepare voice settings
      const finalVoiceSettings = this.prepareVoiceSettings(story, character, voiceSettings);
      
      // Convert story to narration text
      const narrationText = this.convertStoryToNarration(story);
      
      // Create audio segments for better control
      const segments = this.createAudioSegments(story, finalVoiceSettings);
      
      // Generate audio for each segment
      const generatedSegments = await this.generateSegmentAudio(segments);
      
      // Generate full narration
      const fullNarrationResponse = await this.generateFullNarration(
        narrationText,
        finalVoiceSettings
      );
      
      const totalDuration = generatedSegments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
      const wordCount = narrationText.split(' ').length;
      const estimatedCost = this.estimateCost(wordCount);
      
      return {
        fullNarrationUrl: fullNarrationResponse.audioUrl || '',
        segments: generatedSegments,
        totalDuration,
        metadata: {
          storyId: story.id,
          characterId: character.id,
          generatedAt: new Date().toISOString(),
          voiceSettings: finalVoiceSettings,
          wordCount,
          estimatedCost
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to generate story narration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Regenerate audio when story content changes
   */
  async regenerateAudio(
    originalAudio: GeneratedStoryAudio,
    regenerationRequest: AudioRegenerationRequest
  ): Promise<GeneratedStoryAudio> {
    try {
      // If voice settings changed, regenerate everything
      if (regenerationRequest.voiceSettings) {
        // Get the updated story (this would come from the story service)
        // For now, we'll assume the story is passed in newContent
        if (!regenerationRequest.newContent) {
          throw new Error('New content required when voice settings change');
        }
        
        // Create a mock story object for regeneration
        const updatedStory: Story = {
          ...originalAudio.metadata,
          content: JSON.parse(regenerationRequest.newContent) as StoryContent
        } as Story;
        
        // Get character (would normally come from character service)
        const character: Character = {
          id: originalAudio.metadata.characterId,
          libraryId: '',
          name: '',
          traits: { name: '', species: 'human', appearance: {} },
          createdAt: '',
          updatedAt: ''
        };
        
        return this.generateStoryNarration(
          updatedStory,
          character,
          regenerationRequest.voiceSettings
        );
      }
      
      // If only specific beats changed, regenerate those segments
      if (regenerationRequest.changedBeats && regenerationRequest.changedBeats.length > 0) {
        const updatedSegments = [...originalAudio.segments];
        
        for (const beatId of regenerationRequest.changedBeats) {
          const segmentIndex = updatedSegments.findIndex(seg => seg.id === beatId);
          if (segmentIndex >= 0) {
            const segment = updatedSegments[segmentIndex];
            const response = await this.config.voiceService.synthesize({
              text: segment.text,
              voiceId: segment.voiceSettings.voiceId,
              format: 'mp3',
              sessionId: `regen-${beatId}-${Date.now()}`
            });
            
            updatedSegments[segmentIndex] = {
              ...segment,
              audioUrl: response.audioUrl,
              duration: response.duration
            };
          }
        }
        
        return {
          ...originalAudio,
          segments: updatedSegments,
          metadata: {
            ...originalAudio.metadata,
            generatedAt: new Date().toISOString()
          }
        };
      }
      
      throw new Error('No regeneration criteria specified');
      
    } catch (error) {
      throw new Error(`Failed to regenerate audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get available voice options for story narration
   */
  async getAvailableVoices(): Promise<{
    id: string;
    name: string;
    description: string;
    ageGroup: 'child' | 'teen' | 'adult' | 'elderly';
    gender: 'male' | 'female' | 'neutral';
    accent: string;
    sampleUrl?: string;
  }[]> {
    // This would typically call the voice service to get available voices
    // For now, return a curated list suitable for children's stories
    return [
      {
        id: 'narrator-warm-female',
        name: 'Sarah (Warm Narrator)',
        description: 'Warm, motherly voice perfect for bedtime stories',
        ageGroup: 'adult',
        gender: 'female',
        accent: 'American'
      },
      {
        id: 'narrator-gentle-male',
        name: 'David (Gentle Narrator)',
        description: 'Gentle, fatherly voice great for adventure stories',
        ageGroup: 'adult',
        gender: 'male',
        accent: 'British'
      },
      {
        id: 'narrator-energetic-female',
        name: 'Emma (Energetic Narrator)',
        description: 'Energetic, youthful voice for exciting adventures',
        ageGroup: 'teen',
        gender: 'female',
        accent: 'American'
      },
      {
        id: 'narrator-wise-male',
        name: 'Oliver (Wise Narrator)',
        description: 'Wise, grandfatherly voice for educational stories',
        ageGroup: 'elderly',
        gender: 'male',
        accent: 'British'
      }
    ];
  }

  /**
   * Stream audio generation for real-time playback
   */
  async streamStoryNarration(
    story: Story,
    character: Character,
    voiceSettings: Partial<VoiceCustomization>,
    onChunk: (chunk: AudioChunk) => void
  ): Promise<void> {
    try {
      const finalVoiceSettings = this.prepareVoiceSettings(story, character, voiceSettings);
      const narrationText = this.convertStoryToNarration(story);
      
      await this.config.voiceService.stream({
        text: narrationText,
        voiceId: finalVoiceSettings.voiceId,
        format: 'mp3',
        sessionId: `stream-${story.id}-${Date.now()}`
      }, onChunk);
      
    } catch (error) {
      throw new Error(`Failed to stream story narration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private helper methods

  private prepareVoiceSettings(
    story: Story,
    character: Character,
    customSettings?: Partial<VoiceCustomization>
  ): VoiceCustomization {
    // Select appropriate voice based on story type and character
    const baseVoiceId = this.selectVoiceForStory(story, character);
    
    // Get base settings for the story mood
    const moodSettings = this.getVoiceSettingsForMood(story.content.mood);
    
    // Merge with custom settings
    return {
      voiceId: baseVoiceId,
      ...moodSettings,
      ...customSettings
    };
  }

  private selectVoiceForStory(story: Story, character: Character): string {
    // Select voice based on story type and target age
    const storyTypeVoiceMap: Record<string, string> = {
      'Bedtime': 'narrator-warm-female',
      'Adventure': 'narrator-energetic-female',
      'Educational': 'narrator-wise-male',
      'Birthday': 'narrator-energetic-female',
      'Medical Bravery': 'narrator-gentle-male',
      'Mental Health': 'narrator-warm-female'
    };
    
    return storyTypeVoiceMap[story.content.type] || this.config.defaultVoiceId;
  }

  private getVoiceSettingsForMood(mood: string): Partial<VoiceCustomization> {
    const moodSettingsMap: Record<string, Partial<VoiceCustomization>> = {
      'excited': {
        stability: 0.6,
        similarityBoost: 0.8,
        style: 0.8,
        useSpeakerBoost: true,
        speed: 1.1,
        emotion: 'excited'
      },
      'calm': {
        stability: 0.8,
        similarityBoost: 0.7,
        style: 0.3,
        useSpeakerBoost: false,
        speed: 0.9,
        emotion: 'calm'
      },
      'mysterious': {
        stability: 0.7,
        similarityBoost: 0.9,
        style: 0.6,
        useSpeakerBoost: true,
        speed: 0.8,
        emotion: 'mysterious'
      },
      'gentle': {
        stability: 0.9,
        similarityBoost: 0.6,
        style: 0.2,
        useSpeakerBoost: false,
        speed: 0.85,
        emotion: 'gentle'
      },
      'adventurous': {
        stability: 0.5,
        similarityBoost: 0.8,
        style: 0.9,
        useSpeakerBoost: true,
        speed: 1.2,
        emotion: 'adventurous'
      },
      'peaceful': {
        stability: 0.9,
        similarityBoost: 0.5,
        style: 0.1,
        useSpeakerBoost: false,
        speed: 0.8,
        emotion: 'calm'
      }
    };
    
    return moodSettingsMap[mood] || moodSettingsMap['gentle'];
  }

  private convertStoryToNarration(story: Story): string {
    const beats = story.content.beats;
    
    // Add story introduction
    let narration = `${story.title}. `;
    
    // Add each story beat with appropriate pacing
    beats.forEach((beat, index) => {
      // Add natural pauses between beats
      if (index > 0) {
        narration += ' ... ';
      }
      
      narration += beat.content;
      
      // Add emotional inflection cues based on beat tone
      if (beat.emotionalTone) {
        narration += this.getEmotionalInflectionCue(beat.emotionalTone);
      }
    });
    
    // Add story conclusion
    narration += ' The End.';
    
    return narration;
  }

  private getEmotionalInflectionCue(emotionalTone: string): string {
    // Add SSML-like cues for emotional inflection
    const inflectionMap: Record<string, string> = {
      'excited': ' <emphasis level="strong">',
      'calm': ' <prosody rate="slow">',
      'mysterious': ' <prosody pitch="low">',
      'happy': ' <prosody pitch="high">',
      'sad': ' <prosody rate="slow" pitch="low">',
      'dramatic': ' <emphasis level="strong"><prosody pitch="high">'
    };
    
    return inflectionMap[emotionalTone] || '';
  }

  private createAudioSegments(
    story: Story,
    voiceSettings: VoiceCustomization
  ): StoryAudioSegment[] {
    const segments: StoryAudioSegment[] = [];
    
    // Create segments for each story beat
    story.content.beats.forEach((beat, index) => {
      segments.push({
        id: beat.id,
        type: 'narration',
        text: beat.content,
        voiceSettings: {
          ...voiceSettings,
          // Adjust settings based on beat's emotional tone
          ...this.getVoiceSettingsForMood(beat.emotionalTone)
        }
      });
    });
    
    return segments;
  }

  private async generateSegmentAudio(
    segments: StoryAudioSegment[]
  ): Promise<StoryAudioSegment[]> {
    const generatedSegments: StoryAudioSegment[] = [];
    
    for (const segment of segments) {
      try {
        const response = await this.config.voiceService.synthesize({
          text: segment.text,
          voiceId: segment.voiceSettings.voiceId,
          format: 'mp3',
          sessionId: `segment-${segment.id}-${Date.now()}`
        });
        
        generatedSegments.push({
          ...segment,
          audioUrl: response.audioUrl,
          duration: response.duration
        });
        
      } catch (error) {
        // Log error but continue with other segments
        console.error(`Failed to generate audio for segment ${segment.id}:`, error);
        generatedSegments.push(segment);
      }
    }
    
    return generatedSegments;
  }

  private async generateFullNarration(
    text: string,
    voiceSettings: VoiceCustomization
  ): Promise<{ audioUrl: string; duration: number }> {
    const response = await this.config.voiceService.synthesize({
      text,
      voiceId: voiceSettings.voiceId,
      format: 'mp3',
      sessionId: `full-narration-${Date.now()}`
    });
    
    return {
      audioUrl: response.audioUrl || '',
      duration: response.duration || 0
    };
  }

  private estimateCost(wordCount: number): number {
    // Rough estimate: ElevenLabs charges per character
    // Average 5 characters per word, $0.30 per 1K characters
    const characterCount = wordCount * 5;
    return (characterCount / 1000) * 0.30;
  }
}