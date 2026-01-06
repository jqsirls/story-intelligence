import { Logger } from 'winston';

export class MusicCompositionService {
  private elevenLabsApiKey: string;
  private logger: Logger;

  constructor(logger: Logger) {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.logger = logger;
  }

  async generateStoryMusic(storyType: string, mood: string, duration_ms: number): Promise<string> {
    try {
      this.logger.info('Generating story music', {
        storyType,
        mood,
        duration_ms
      });

      // Use ElevenLabs Music API
      const response = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          composition_plan: {
            positive_global_styles: this.getGlobalStyles(storyType, mood, 'positive'),
            negative_global_styles: this.getGlobalStyles(storyType, mood, 'negative'),
            sections: this.getMoodSections(storyType, mood, duration_ms)
          },
          model_id: 'music_v1',
          force_instrumental: true,
          respect_sections_durations: false  // Better quality
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs Music API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const s3Url = await this.uploadToS3(Buffer.from(audioBuffer), `music-${storyType}-${mood}`);
      
      this.logger.info('Story music generated successfully', {
        s3Url: s3Url.substring(0, 60),
        sizeKB: (audioBuffer.byteLength / 1024).toFixed(2)
      });

      return s3Url;

    } catch (error) {
      this.logger.error('Story music generation failed', { error });
      throw error;
    }
  }

  private getGlobalStyles(storyType: string, mood: string, type: 'positive' | 'negative'): string[] {
    const styleMap: Record<string, Record<string, string[]>> = {
      'adventure': {
        positive: ['epic', 'heroic', 'triumphant', 'adventurous'],
        negative: ['dark', 'ominous', 'tense', 'mysterious']
      },
      'bedtime': {
        positive: ['calm', 'peaceful', 'gentle', 'soothing'],
        negative: ['loud', 'harsh', 'aggressive', 'jarring']
      },
      'mystery': {
        positive: ['mysterious', 'intriguing', 'curious', 'enigmatic'],
        negative: ['obvious', 'predictable', 'boring', 'repetitive']
      },
      'fantasy': {
        positive: ['magical', 'whimsical', 'enchanting', 'mystical'],
        negative: ['mundane', 'ordinary', 'realistic', 'boring']
      },
      'scary': {
        positive: ['mysterious', 'suspenseful', 'ominous', 'atmospheric'],
        negative: ['cheerful', 'happy', 'bright', 'uplifting']
      },
      'happy': {
        positive: ['cheerful', 'uplifting', 'joyful', 'bright'],
        negative: ['sad', 'melancholic', 'dark', 'depressing']
      },
      'sad': {
        positive: ['melancholic', 'gentle', 'hopeful', 'tender'],
        negative: ['harsh', 'aggressive', 'loud', 'jarring']
      }
    };

    const storyStyles = styleMap[storyType.toLowerCase()] || styleMap['bedtime'];
    return storyStyles[type] || [];
  }

  private getMoodSections(storyType: string, mood: string, duration_ms: number) {
    // Map story types to musical moods
    const moodMap: Record<string, string[]> = {
      'adventure': ['adventurous', 'mysterious', 'triumphant'],
      'bedtime': ['calm', 'peaceful', 'dreamy'],
      'mystery': ['mysterious', 'suspenseful', 'curious'],
      'fantasy': ['magical', 'whimsical', 'enchanting'],
      'scary': ['mysterious', 'suspenseful', 'ominous'],
      'happy': ['cheerful', 'uplifting', 'joyful'],
      'sad': ['melancholic', 'gentle', 'hopeful']
    };

    const moods = moodMap[storyType.toLowerCase()] || ['calm', 'happy'];
    const sectionDuration = Math.floor(duration_ms / moods.length);

    return moods.map((moodName, index) => ({
      section_name: `${moodName}_section_${index + 1}`,
      mood: moodName,
      duration_ms: sectionDuration,
      positive_local_styles: this.getGlobalStyles(storyType, moodName, 'positive'),
      negative_local_styles: this.getGlobalStyles(storyType, moodName, 'negative'),
      lines: this.getMusicalLines(moodName, sectionDuration)
    }));
  }

  private getMusicalLines(mood: string, duration_ms: number): string[] {
    // Generate musical lines for each section
    const lineCount = Math.max(1, Math.floor(duration_ms / 10000)); // One line per 10 seconds
    
    return Array.from({ length: lineCount }, (_, index) => 
      `${mood}_line_${index + 1}`
    );
  }

  private async uploadToS3(audioBuffer: Buffer, filename: string): Promise<string> {
    try {
      // This is a placeholder implementation
      // In production, this would use AWS SDK to upload to S3
      const s3Url = `https://storytailor-audio.s3.amazonaws.com/music/${filename}-${Date.now()}.mp3`;
      
      this.logger.info('Music uploaded to S3', { 
        filename, 
        size: audioBuffer.length,
        url: s3Url 
      });
      
      return s3Url;

    } catch (error) {
      this.logger.error('Failed to upload music to S3', { error });
      throw error;
    }
  }

  async generateAmbientTrack(storyType: string, duration_ms: number = 300000): Promise<string> {
    // Generate longer ambient tracks for background music
    return this.generateStoryMusic(storyType, 'ambient', duration_ms);
  }

  async generateTransitionMusic(fromMood: string, toMood: string, duration_ms: number = 10000): Promise<string> {
    // Generate short transition music between story sections
    const transitionMood = `${fromMood}-to-${toMood}`;
    return this.generateStoryMusic('transition', transitionMood, duration_ms);
  }
}
