import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

import {
  LightingProfile,
  StoryLightingProfile,
  NarrativeEvent,
  LightingTransition
} from '@alexa-multi-agent/shared-types';

import { SmartHomeAgentConfig } from '../types';

export class LightingOrchestrator {
  private logger: Logger;
  private lightingProfiles: Map<string, StoryLightingProfile> = new Map();

  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: SmartHomeAgentConfig
  ) {
    this.logger = require('winston').createLogger({
      level: config.logging.level,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      defaultMeta: { service: 'lighting-orchestrator' },
      transports: [new (require('winston').transports.Console)()]
    });
  }

  async initialize(): Promise<void> {
    try {
      // Load lighting profiles from database
      await this.loadLightingProfiles();
      this.logger.info('LightingOrchestrator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize LightingOrchestrator', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get story lighting profile with age restrictions applied
   */
  async getStoryLightingProfile(storyType: string, userId: string): Promise<LightingProfile> {
    try {
      this.logger.info('Getting story lighting profile', { storyType, userId });

      // Get base profile from cache or database
      let profile = this.lightingProfiles.get(storyType);
      
      if (!profile) {
        profile = (await this.loadStoryProfile(storyType)) || undefined;
        if (profile) {
          this.lightingProfiles.set(storyType, profile);
        }
      }

      if (!profile) {
        // Return default profile if story type not found
        this.logger.warn('Story lighting profile not found, using default', { storyType });
        return this.getDefaultLightingProfile();
      }

      // Apply age restrictions
      const ageRestrictedProfile = await this.applyAgeRestrictions(profile, userId);

      this.logger.debug('Story lighting profile retrieved', {
        storyType,
        userId,
        brightness: ageRestrictedProfile.brightness,
        color: ageRestrictedProfile.color
      });

      return ageRestrictedProfile;

    } catch (error) {
      this.logger.error('Failed to get story lighting profile', {
        error: error instanceof Error ? error.message : String(error),
        storyType,
        userId
      });
      return this.getDefaultLightingProfile();
    }
  }

  /**
   * Get lighting transition for narrative event
   */
  async getNarrativeEventLighting(event: NarrativeEvent): Promise<LightingTransition | null> {
    try {
      this.logger.debug('Getting narrative event lighting', {
        eventType: event.type,
        intensity: event.intensity
      });

      // Map narrative events to lighting transitions
      const eventLightingMap: Record<string, LightingTransition> = {
        'peaceful_moment': {
          color: '#FFB347', // Peach
          brightness: Math.max(15, 30 * event.intensity),
          saturation: 60,
          transition: 3000
        },
        'exciting_moment': {
          color: '#FFD700', // Gold
          brightness: Math.min(90, 60 + 30 * event.intensity),
          saturation: 80,
          transition: 1000
        },
        'mysterious_scene': {
          color: '#9370DB', // Medium Purple
          brightness: Math.max(20, 40 * event.intensity),
          saturation: 70,
          transition: 2000
        },
        'victory_moment': {
          color: '#00FF00', // Lime Green
          brightness: Math.min(95, 70 + 25 * event.intensity),
          saturation: 90,
          transition: 500
        },
        'story_end': {
          brightness: 5,
          transition: 10000 // 10 second fade
        }
      };

      const transition = eventLightingMap[event.type];
      
      if (transition) {
        // Apply duration if specified in event
        if (event.duration) {
          transition.transition = event.duration;
        }

        this.logger.debug('Narrative event lighting transition created', {
          eventType: event.type,
          transition
        });

        return transition;
      }

      this.logger.debug('No lighting transition found for event type', {
        eventType: event.type
      });

      return null;

    } catch (error) {
      this.logger.error('Failed to get narrative event lighting', {
        error: error instanceof Error ? error.message : String(error),
        eventType: event.type
      });
      return null;
    }
  }

  /**
   * Create custom lighting profile
   */
  async createCustomProfile(
    storyType: string,
    profile: StoryLightingProfile,
    userId: string
  ): Promise<void> {
    try {
      this.logger.info('Creating custom lighting profile', {
        storyType,
        userId
      });

      // Validate profile against age restrictions
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('age, is_coppa_protected')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error(`Failed to get user info: ${userError.message}`);
      }

      // Apply age restrictions to custom profile
      if (user?.is_coppa_protected || (user?.age && user.age < 13)) {
        profile = this.applyChildSafetyRestrictions(profile);
      }

      // Store in database
      const { error: insertError } = await this.supabase
        .from('story_lighting_profiles')
        .upsert({
          story_type: storyType,
          profile_name: 'custom',
          base_profile: profile.baseProfile,
          narrative_events: profile.narrativeEvents,
          age_appropriate: profile.ageAppropriate,
          platform_compatibility: profile.platformCompatibility
        });

      if (insertError) {
        throw new Error(`Failed to store custom profile: ${insertError.message}`);
      }

      // Update cache
      this.lightingProfiles.set(storyType, profile);

      this.logger.info('Custom lighting profile created successfully', {
        storyType,
        userId
      });

    } catch (error) {
      this.logger.error('Failed to create custom lighting profile', {
        error: error instanceof Error ? error.message : String(error),
        storyType,
        userId
      });
      throw error;
    }
  }

  /**
   * Get available story types with lighting profiles
   */
  async getAvailableStoryTypes(): Promise<string[]> {
    try {
      const { data: profiles, error } = await this.supabase
        .from('story_lighting_profiles')
        .select('story_type')
        .order('story_type');

      if (error) {
        throw new Error(`Failed to get story types: ${error.message}`);
      }

      const storyTypes = (profiles || []).map(p => p.story_type);
      
      this.logger.debug('Available story types retrieved', {
        count: storyTypes.length,
        types: storyTypes
      });

      return storyTypes;

    } catch (error) {
      this.logger.error('Failed to get available story types', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Private helper methods

  private async loadLightingProfiles(): Promise<void> {
    const { data: profiles, error } = await this.supabase
      .from('story_lighting_profiles')
      .select('*');

    if (error) {
      throw new Error(`Failed to load lighting profiles: ${error.message}`);
    }

    for (const profile of profiles || []) {
      const storyProfile: StoryLightingProfile = {
        storyType: profile.story_type,
        baseProfile: profile.base_profile,
        narrativeEvents: profile.narrative_events,
        ageAppropriate: profile.age_appropriate,
        platformCompatibility: profile.platform_compatibility
      };

      this.lightingProfiles.set(profile.story_type, storyProfile);
    }

    this.logger.info('Lighting profiles loaded', {
      count: this.lightingProfiles.size
    });
  }

  private async loadStoryProfile(storyType: string): Promise<StoryLightingProfile | null> {
    const { data: profile, error } = await this.supabase
      .from('story_lighting_profiles')
      .select('*')
      .eq('story_type', storyType)
      .eq('profile_name', 'default')
      .single();

    if (error || !profile) {
      return null;
    }

    return {
      storyType: profile.story_type,
      baseProfile: profile.base_profile,
      narrativeEvents: profile.narrative_events,
      ageAppropriate: profile.age_appropriate,
      platformCompatibility: profile.platform_compatibility
    };
  }

  private async applyAgeRestrictions(
    profile: StoryLightingProfile,
    userId: string
  ): Promise<LightingProfile> {
    // Get user age information
    const { data: user, error } = await this.supabase
      .from('users')
      .select('age, is_coppa_protected')
      .eq('id', userId)
      .single();

    if (error || !user) {
      // If we can't get user info, apply conservative restrictions
      return this.applyConservativeRestrictions(profile.baseProfile);
    }

    // Apply age-appropriate restrictions
    if (user.is_coppa_protected || (user.age && user.age < 13)) {
      return this.applyChildRestrictions(profile);
    }

    if (user.age && user.age < 16) {
      return this.applyTeenRestrictions(profile);
    }

    // No restrictions for adults
    return {
      brightness: profile.baseProfile.brightness,
      color: profile.baseProfile.color,
      saturation: profile.baseProfile.saturation,
      transitionDuration: (profile.baseProfile as any).transitionDuration
    };
  }

  private applyChildRestrictions(profile: StoryLightingProfile): LightingProfile {
    const restrictions = profile.ageAppropriate;
    
    return {
      brightness: Math.min(profile.baseProfile.brightness, restrictions.brightness.max),
      color: this.isColorAllowed(profile.baseProfile.color, restrictions.colorRestrictions) 
        ? profile.baseProfile.color 
        : '#FFFFFF', // Default to white if color not allowed
      saturation: Math.min(profile.baseProfile.saturation, 60), // Limit saturation for children
      transitionDuration: Math.max((profile.baseProfile as any).transitionDuration || 1000, 2000) // Slower transitions
    };
  }

  private applyTeenRestrictions(profile: StoryLightingProfile): LightingProfile {
    // Less restrictive than child restrictions
    return {
      brightness: Math.min(profile.baseProfile.brightness, 85),
      color: profile.baseProfile.color,
      saturation: profile.baseProfile.saturation,
      transitionDuration: (profile.baseProfile as any).transitionDuration
    };
  }

  private applyConservativeRestrictions(baseProfile: any): LightingProfile {
    // Apply most restrictive settings when user info unavailable
    return {
      brightness: Math.min(baseProfile.brightness, 30),
      color: '#FFFFFF', // Safe white color
      saturation: 0, // No color saturation
      transitionDuration: 3000 // Slow transitions
    };
  }

  private applyChildSafetyRestrictions(profile: StoryLightingProfile): StoryLightingProfile {
    // Apply child safety restrictions to custom profile
    const safeProfile = { ...profile };
    
    // Restrict base profile
    safeProfile.baseProfile.brightness = Math.min(safeProfile.baseProfile.brightness, 30);
    safeProfile.baseProfile.saturation = Math.min(safeProfile.baseProfile.saturation, 60);
    
    // Restrict narrative events
    for (const [eventType, transition] of Object.entries(safeProfile.narrativeEvents)) {
      const typedTransition = transition as any;
      if (typedTransition.brightness) {
        typedTransition.brightness = Math.min(typedTransition.brightness, 30);
      }
      if (typedTransition.saturation) {
        typedTransition.saturation = Math.min(typedTransition.saturation, 60);
      }
      if (typedTransition.transition) {
        typedTransition.transition = Math.max(typedTransition.transition, 2000); // Minimum 2 second transitions
      }
    }

    return safeProfile;
  }

  private isColorAllowed(color: string, restrictions: string[]): boolean {
    const colorLower = color.toLowerCase();
    
    for (const restriction of restrictions) {
      switch (restriction) {
        case 'no_red':
          if (this.isRedColor(colorLower)) return false;
          break;
        case 'no_bright_blue':
          if (this.isBrightBlue(colorLower)) return false;
          break;
        case 'no_orange':
          if (this.isOrangeColor(colorLower)) return false;
          break;
      }
    }
    
    return true;
  }

  private isRedColor(color: string): boolean {
    const redColors = ['#ff0000', '#dc143c', '#b22222', '#8b0000'];
    return redColors.includes(color) || color.startsWith('#ff0') || color.startsWith('#f00');
  }

  private isBrightBlue(color: string): boolean {
    const brightBlues = ['#0000ff', '#0080ff', '#1e90ff'];
    return brightBlues.includes(color) || (color.startsWith('#00') && color.includes('ff'));
  }

  private isOrangeColor(color: string): boolean {
    const orangeColors = ['#ffa500', '#ff8c00', '#ff7f50', '#ff6347'];
    return orangeColors.includes(color) || color.startsWith('#ff8') || color.startsWith('#ffa');
  }

  private getDefaultLightingProfile(): LightingProfile {
    return {
      brightness: 50,
      color: '#FFFFFF',
      saturation: 0,
      transitionDuration: 1000
    };
  }
}