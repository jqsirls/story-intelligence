/**
 * Complete Playback Controller
 * Orchestrates synchronized playback of all story modalities
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

export interface PlaybackRequest {
  storyId: string;
  userId: string;
  sessionId: string;
  includeAudio?: boolean;
  includeLights?: boolean;
  includeVideo?: boolean;
}

export interface PlaybackTimeline {
  storyId: string;
  duration: number; // Total duration in seconds
  beats: PlaybackBeat[];
  audio?: AudioTrack;
  video?: VideoTrack;
  lighting?: LightingSequence;
}

export interface PlaybackBeat {
  timestamp: number; // Seconds from start
  duration: number; // Duration of this beat
  text: string; // Story text for this beat
  image?: string; // Image URL
  soundEffects?: SoundEffect[];
  lightingPalette?: string[]; // Hex colors for Hue
  emotion?: string; // Emotional tone
}

export interface AudioTrack {
  narrationUrl: string;
  soundEffectUrls: string[];
  spatialConfig?: SpatialAudioConfig;
}

export interface SpatialAudioConfig {
  mainSpeaker: string; // Narration
  leftSpeaker?: string; // Left effects
  rightSpeaker?: string; // Right effects
  surroundSpeakers?: string[]; // Ambient sounds
}

export interface VideoTrack {
  url: string;
  duration: number;
  startTime: number; // When to start in timeline
}

export interface LightingSequence {
  palettes: LightingPalette[];
  transitions: LightingTransition[];
}

export interface LightingPalette {
  timestamp: number;
  colors: string[]; // 6 hex colors
  brightness: number;
  transitionDuration: number; // Seconds
}

export interface LightingTransition {
  from: number; // Beat index
  to: number; // Beat index
  duration: number;
  type: 'fade' | 'instant' | 'pulse';
}

export interface SoundEffect {
  type: string;
  url: string;
  volume: number;
  speaker?: 'left' | 'right' | 'center' | 'all';
}

export class PlaybackController {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}

  /**
   * Prepare complete playback timeline for a story
   */
  async preparePlayback(request: PlaybackRequest): Promise<PlaybackTimeline> {
    try {
      this.logger.info('Preparing playback timeline', {
        storyId: request.storyId,
        userId: request.userId
      });

      // 1. Retrieve story from database
      const story = await this.getStoryWithMedia(request.storyId, request.userId);

      // 2. Parse story into beats (5 beats matching 5 images)
      const beats = this.parseStoryIntoBeats(story);

      // 3. Build audio timeline
      const audio = request.includeAudio ? await this.buildAudioTimeline(story) : undefined;

      // 4. Build video timeline
      const video = request.includeVideo ? await this.buildVideoTimeline(story) : undefined;

      // 5. Build lighting sequence
      const lighting = request.includeLights ? await this.buildLightingSequence(story, beats) : undefined;

      // 6. Calculate total duration
      const duration = this.calculateTotalDuration(beats, audio, video);

      const timeline: PlaybackTimeline = {
        storyId: request.storyId,
        duration,
        beats,
        audio,
        video,
        lighting
      };

      this.logger.info('Playback timeline prepared', {
        storyId: request.storyId,
        duration,
        beatCount: beats.length
      });

      return timeline;

    } catch (error) {
      this.logger.error('Error preparing playback', { error, storyId: request.storyId });
      throw error;
    }
  }

  /**
   * Retrieve story with all associated media
   */
  private async getStoryWithMedia(storyId: string, userId: string): Promise<any> {
    const { data: story, error } = await this.supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (error || !story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    return story;
  }

  /**
   * Parse story content into 5 beats matching the 5 images
   */
  private parseStoryIntoBeats(story: any): PlaybackBeat[] {
    const content = story.content || story.text || '';
    const images = story.images || [];
    
    // Split story into 5 roughly equal beats
    const paragraphs = content.split('\n\n').filter((p: string) => p.trim());
    const beatsPerImage = Math.ceil(paragraphs.length / 5);
    
    const beats: PlaybackBeat[] = [];
    let currentTime = 0;

    for (let i = 0; i < 5; i++) {
      const startIdx = i * beatsPerImage;
      const endIdx = Math.min(startIdx + beatsPerImage, paragraphs.length);
      const beatText = paragraphs.slice(startIdx, endIdx).join('\n\n');
      
      // Estimate duration: ~3 seconds per sentence
      const sentenceCount = (beatText.match(/[.!?]+/g) || []).length;
      const duration = Math.max(sentenceCount * 3, 15); // Minimum 15s per beat

      beats.push({
        timestamp: currentTime,
        duration,
        text: beatText,
        image: images[i] || undefined,
        soundEffects: [],
        emotion: this.inferBeatEmotion(i, beatText)
      });

      currentTime += duration;
    }

    return beats;
  }

  /**
   * Infer emotional tone of a beat
   */
  private inferBeatEmotion(beatIndex: number, text: string): string {
    // Simple emotion arc: wonder → adventure → tension → triumph → peace
    const emotionArc = ['wonder', 'adventure', 'tension', 'triumph', 'peace'];
    return emotionArc[beatIndex] || 'wonder';
  }

  /**
   * Build audio timeline with narration and sound effects
   */
  private async buildAudioTimeline(story: any): Promise<AudioTrack> {
    return {
      narrationUrl: story.audioUrl || story.audio_url || '',
      soundEffectUrls: story.soundEffects || [],
      spatialConfig: {
        mainSpeaker: 'center',
        leftSpeaker: 'ambient',
        rightSpeaker: 'ambient',
        surroundSpeakers: ['background']
      }
    };
  }

  /**
   * Build video timeline
   */
  private async buildVideoTimeline(story: any): Promise<VideoTrack | undefined> {
    const videoUrl = story.animatedCoverUrl || story.video_url;
    
    if (!videoUrl) {
      return undefined;
    }

    return {
      url: videoUrl,
      duration: story.videoDuration || 10,
      startTime: 0
    };
  }

  /**
   * Build lighting sequence for Hue integration
   */
  private async buildLightingSequence(story: any, beats: PlaybackBeat[]): Promise<LightingSequence> {
    // Use 5-step emotional color palette from GLOBAL_STYLE
    const paletteJourney = [
      ['#FFD700', '#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C'], // Sunrise warmth
      ['#40E0D0', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA'], // Teal tension
      ['#FF1493', '#00CED1', '#FFD700', '#32CD32', '#FF69B4', '#1E90FF'], // Vibrant midday
      ['#FF8C00', '#FF1493', '#FFD700', '#FF69B4', '#FF6347', '#DAA520'], // Golden hour
      ['#4B0082', '#8A2BE2', '#9370DB', '#BA55D3', '#9932CC', '#663399']  // Twilight jewels
    ];

    const palettes: LightingPalette[] = beats.map((beat, index) => ({
      timestamp: beat.timestamp,
      colors: paletteJourney[index] || paletteJourney[0],
      brightness: this.calculateBeatBrightness(beat.emotion),
      transitionDuration: 3
    }));

    const transitions: LightingTransition[] = [];
    for (let i = 0; i < beats.length - 1; i++) {
      transitions.push({
        from: i,
        to: i + 1,
        duration: 3,
        type: 'fade'
      });
    }

    // Add bedtime fade-out at end
    if (story.storyType === 'bedtime' || story.story_type === 'bedtime') {
      palettes.push({
        timestamp: beats[beats.length - 1].timestamp + beats[beats.length - 1].duration,
        colors: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
        brightness: 0,
        transitionDuration: 10
      });
    }

    return { palettes, transitions };
  }

  /**
   * Calculate brightness for beat based on emotion
   */
  private calculateBeatBrightness(emotion?: string): number {
    const brightnessMap: Record<string, number> = {
      'wonder': 80,
      'adventure': 100,
      'tension': 60,
      'triumph': 100,
      'peace': 40,
      'bedtime': 20
    };

    return brightnessMap[emotion || 'wonder'] || 80;
  }

  /**
   * Calculate total playback duration
   */
  private calculateTotalDuration(beats: PlaybackBeat[], audio?: AudioTrack, video?: VideoTrack): number {
    const beatDuration = beats.reduce((sum, beat) => sum + beat.duration, 0);
    const audioDuration = audio ? beatDuration : 0; // Audio matches beats
    const videoDuration = video?.duration || 0;

    return Math.max(beatDuration, audioDuration, videoDuration);
  }

  /**
   * Start playback and return timeline for client
   */
  async startPlayback(request: PlaybackRequest): Promise<PlaybackTimeline> {
    const timeline = await this.preparePlayback(request);

    // Log playback start for analytics
    this.logger.info('Playback started', {
      storyId: request.storyId,
      userId: request.userId,
      duration: timeline.duration,
      hasAudio: !!timeline.audio,
      hasVideo: !!timeline.video,
      hasLighting: !!timeline.lighting
    });

    return timeline;
  }

  /**
   * Get playback status
   */
  async getPlaybackStatus(storyId: string, userId: string): Promise<any> {
    // In future: Track playback progress, pause/resume state
    return {
      storyId,
      userId,
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  }
}

