import { SupabaseClient } from '@supabase/supabase-js';
import {
  AssistiveTechnology,
  AssistiveTechnologyError,
} from '../types';

interface ScreenReaderConfig {
  speechRate: number;
  voiceType: string;
  punctuationLevel: 'none' | 'some' | 'all';
  announceHeadings: boolean;
  announceLinks: boolean;
}

interface VoiceAmplifierConfig {
  amplificationLevel: number;
  noiseReduction: boolean;
  frequencyAdjustment: Record<string, number>;
}

interface SwitchControlConfig {
  switchType: 'single' | 'dual' | 'joystick';
  activationMethod: 'press' | 'hold' | 'release';
  dwellTime: number;
  repeatRate: number;
}

interface EyeTrackingConfig {
  calibrationPoints: number;
  dwellTime: number;
  gazeSmoothing: boolean;
  blinkDetection: boolean;
}

export class AssistiveTechnologyIntegrator {
  private connectedDevices: Map<string, AssistiveTechnology> = new Map();
  private deviceCapabilities: Map<string, string[]> = new Map();

  constructor(private supabase: SupabaseClient) {
    this.initializeDeviceCapabilities();
  }

  async registerTechnology(
    userId: string,
    technology: Omit<AssistiveTechnology, 'userId' | 'createdAt'>
  ): Promise<AssistiveTechnology> {
    try {
      const newTechnology: AssistiveTechnology = {
        ...technology,
        userId,
        createdAt: new Date(),
      };

      const { data, error } = await this.supabase
        .from('assistive_technologies')
        .insert(newTechnology)
        .select()
        .single();

      if (error) throw error;

      // Initialize device connection
      await this.initializeDevice(data);

      // Cache the device
      this.connectedDevices.set(data.id, data);

      return data;
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to register assistive technology: ${error.message}`, { userId, technology });
    }
  }

  async getTechnologies(userId: string): Promise<AssistiveTechnology[]> {
    try {
      const { data, error } = await this.supabase
        .from('assistive_technologies')
        .select('*')
        .eq('userId', userId)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to get assistive technologies: ${error.message}`, { userId });
    }
  }

  async updateTechnologyStatus(
    userId: string,
    technologyId: string,
    status: 'connected' | 'disconnected' | 'error' | 'testing'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('assistive_technologies')
        .update({
          integrationStatus: status,
          lastUsed: status === 'connected' ? new Date() : undefined,
        })
        .eq('id', technologyId)
        .eq('userId', userId);

      if (error) throw error;

      // Update cache
      const cachedDevice = this.connectedDevices.get(technologyId);
      if (cachedDevice) {
        cachedDevice.integrationStatus = status;
        if (status === 'connected') {
          cachedDevice.lastUsed = new Date();
        }
      }
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to update technology status: ${error.message}`, { userId, technologyId, status });
    }
  }

  async testTechnology(
    userId: string,
    technologyId: string
  ): Promise<{ success: boolean; details: string }> {
    try {
      const technology = this.connectedDevices.get(technologyId);
      if (!technology) {
        const technologies = await this.getTechnologies(userId);
        const foundTech = technologies.find(t => t.id === technologyId);
        if (!foundTech) {
          return { success: false, details: 'Technology not found' };
        }
        this.connectedDevices.set(technologyId, foundTech);
      }

      const testResult = await this.performDeviceTest(technology || this.connectedDevices.get(technologyId)!);
      
      // Update status based on test result
      await this.updateTechnologyStatus(
        userId,
        technologyId,
        testResult.success ? 'connected' : 'error'
      );

      return testResult;
    } catch (error) {
      await this.updateTechnologyStatus(userId, technologyId, 'error');
      throw new AssistiveTechnologyError(`Failed to test assistive technology: ${error.message}`, { userId, technologyId });
    }
  }

  async configureScreenReader(
    userId: string,
    technologyId: string,
    config: ScreenReaderConfig
  ): Promise<void> {
    try {
      const technology = await this.getTechnologyById(userId, technologyId);
      if (technology.technologyType !== 'screen_reader') {
        throw new AssistiveTechnologyError('Technology is not a screen reader', { userId, technologyId });
      }

      // Update configuration
      await this.supabase
        .from('assistive_technologies')
        .update({
          configuration: { ...technology.configuration, screenReader: config },
        })
        .eq('id', technologyId)
        .eq('userId', userId);

      // Apply configuration to device
      await this.applyScreenReaderConfig(technology, config);
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to configure screen reader: ${error.message}`, { userId, technologyId, config });
    }
  }

  async configureVoiceAmplifier(
    userId: string,
    technologyId: string,
    config: VoiceAmplifierConfig
  ): Promise<void> {
    try {
      const technology = await this.getTechnologyById(userId, technologyId);
      if (technology.technologyType !== 'voice_amplifier') {
        throw new AssistiveTechnologyError('Technology is not a voice amplifier', { userId, technologyId });
      }

      // Update configuration
      await this.supabase
        .from('assistive_technologies')
        .update({
          configuration: { ...technology.configuration, voiceAmplifier: config },
        })
        .eq('id', technologyId)
        .eq('userId', userId);

      // Apply configuration to device
      await this.applyVoiceAmplifierConfig(technology, config);
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to configure voice amplifier: ${error.message}`, { userId, technologyId, config });
    }
  }

  async configureSwitchControl(
    userId: string,
    technologyId: string,
    config: SwitchControlConfig
  ): Promise<void> {
    try {
      const technology = await this.getTechnologyById(userId, technologyId);
      if (technology.technologyType !== 'switch_control') {
        throw new AssistiveTechnologyError('Technology is not switch control', { userId, technologyId });
      }

      // Update configuration
      await this.supabase
        .from('assistive_technologies')
        .update({
          configuration: { ...technology.configuration, switchControl: config },
        })
        .eq('id', technologyId)
        .eq('userId', userId);

      // Apply configuration to device
      await this.applySwitchControlConfig(technology, config);
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to configure switch control: ${error.message}`, { userId, technologyId, config });
    }
  }

  async configureEyeTracking(
    userId: string,
    technologyId: string,
    config: EyeTrackingConfig
  ): Promise<void> {
    try {
      const technology = await this.getTechnologyById(userId, technologyId);
      if (technology.technologyType !== 'eye_tracking') {
        throw new AssistiveTechnologyError('Technology is not eye tracking', { userId, technologyId });
      }

      // Update configuration
      await this.supabase
        .from('assistive_technologies')
        .update({
          configuration: { ...technology.configuration, eyeTracking: config },
        })
        .eq('id', technologyId)
        .eq('userId', userId);

      // Apply configuration to device
      await this.applyEyeTrackingConfig(technology, config);
    } catch (error) {
      throw new AssistiveTechnologyError(`Failed to configure eye tracking: ${error.message}`, { userId, technologyId, config });
    }
  }

  async getDeviceCapabilities(technologyType: string): Promise<string[]> {
    return this.deviceCapabilities.get(technologyType) || [];
  }

  async generateAccessibilityOutput(
    content: string,
    userId: string,
    outputType: 'screen_reader' | 'visual_cues' | 'simplified_text'
  ): Promise<string> {
    try {
      const technologies = await this.getTechnologies(userId);
      const relevantTech = technologies.find(t => 
        t.integrationStatus === 'connected' && 
        this.isRelevantForOutput(t.technologyType, outputType)
      );

      if (!relevantTech) {
        return content; // Return original content if no relevant technology
      }

      switch (outputType) {
        case 'screen_reader':
          return this.formatForScreenReader(content, relevantTech);
        case 'visual_cues':
          return this.addVisualCues(content);
        case 'simplified_text':
          return this.simplifyForCognitive(content);
        default:
          return content;
      }
    } catch (error) {
      console.error('Failed to generate accessibility output:', error);
      return content; // Fallback to original content
    }
  }

  private async initializeDevice(technology: AssistiveTechnology): Promise<void> {
    // Initialize device connection based on technology type
    switch (technology.technologyType) {
      case 'screen_reader':
        await this.initializeScreenReader(technology);
        break;
      case 'voice_amplifier':
        await this.initializeVoiceAmplifier(technology);
        break;
      case 'switch_control':
        await this.initializeSwitchControl(technology);
        break;
      case 'eye_tracking':
        await this.initializeEyeTracking(technology);
        break;
      default:
        console.log(`Unknown technology type: ${technology.technologyType}`);
    }
  }

  private async performDeviceTest(technology: AssistiveTechnology): Promise<{ success: boolean; details: string }> {
    try {
      switch (technology.technologyType) {
        case 'screen_reader':
          return await this.testScreenReader(technology);
        case 'voice_amplifier':
          return await this.testVoiceAmplifier(technology);
        case 'switch_control':
          return await this.testSwitchControl(technology);
        case 'eye_tracking':
          return await this.testEyeTracking(technology);
        default:
          return { success: false, details: 'Unknown technology type' };
      }
    } catch (error) {
      return { success: false, details: error.message };
    }
  }

  private async getTechnologyById(userId: string, technologyId: string): Promise<AssistiveTechnology> {
    const { data, error } = await this.supabase
      .from('assistive_technologies')
      .select('*')
      .eq('id', technologyId)
      .eq('userId', userId)
      .single();

    if (error || !data) {
      throw new AssistiveTechnologyError('Technology not found', { userId, technologyId });
    }

    return data;
  }

  private initializeDeviceCapabilities(): void {
    this.deviceCapabilities.set('screen_reader', [
      'text_to_speech',
      'navigation_assistance',
      'content_structure_reading',
      'link_identification',
      'heading_navigation',
      'table_reading',
    ]);

    this.deviceCapabilities.set('voice_amplifier', [
      'volume_amplification',
      'noise_reduction',
      'frequency_adjustment',
      'voice_clarity_enhancement',
    ]);

    this.deviceCapabilities.set('switch_control', [
      'single_switch_navigation',
      'dual_switch_control',
      'joystick_input',
      'dwell_selection',
      'scanning_mode',
    ]);

    this.deviceCapabilities.set('eye_tracking', [
      'gaze_pointing',
      'eye_click',
      'dwell_selection',
      'blink_detection',
      'smooth_pursuit',
    ]);
  }

  // Device-specific initialization methods
  private async initializeScreenReader(technology: AssistiveTechnology): Promise<void> {
    // Mock screen reader initialization
    console.log(`Initializing screen reader: ${technology.deviceName}`);
    // In a real implementation, this would connect to actual screen reader APIs
  }

  private async initializeVoiceAmplifier(technology: AssistiveTechnology): Promise<void> {
    console.log(`Initializing voice amplifier: ${technology.deviceName}`);
    // Mock voice amplifier initialization
  }

  private async initializeSwitchControl(technology: AssistiveTechnology): Promise<void> {
    console.log(`Initializing switch control: ${technology.deviceName}`);
    // Mock switch control initialization
  }

  private async initializeEyeTracking(technology: AssistiveTechnology): Promise<void> {
    console.log(`Initializing eye tracking: ${technology.deviceName}`);
    // Mock eye tracking initialization
  }

  // Device testing methods
  private async testScreenReader(technology: AssistiveTechnology): Promise<{ success: boolean; details: string }> {
    // Mock screen reader test
    return { success: true, details: 'Screen reader is responding correctly' };
  }

  private async testVoiceAmplifier(technology: AssistiveTechnology): Promise<{ success: boolean; details: string }> {
    // Mock voice amplifier test
    return { success: true, details: 'Voice amplifier is functioning properly' };
  }

  private async testSwitchControl(technology: AssistiveTechnology): Promise<{ success: boolean; details: string }> {
    // Mock switch control test
    return { success: true, details: 'Switch control is responsive' };
  }

  private async testEyeTracking(technology: AssistiveTechnology): Promise<{ success: boolean; details: string }> {
    // Mock eye tracking test
    return { success: true, details: 'Eye tracking calibration successful' };
  }

  // Configuration application methods
  private async applyScreenReaderConfig(technology: AssistiveTechnology, config: ScreenReaderConfig): Promise<void> {
    console.log(`Applying screen reader config for ${technology.deviceName}:`, config);
    // Mock configuration application
  }

  private async applyVoiceAmplifierConfig(technology: AssistiveTechnology, config: VoiceAmplifierConfig): Promise<void> {
    console.log(`Applying voice amplifier config for ${technology.deviceName}:`, config);
    // Mock configuration application
  }

  private async applySwitchControlConfig(technology: AssistiveTechnology, config: SwitchControlConfig): Promise<void> {
    console.log(`Applying switch control config for ${technology.deviceName}:`, config);
    // Mock configuration application
  }

  private async applyEyeTrackingConfig(technology: AssistiveTechnology, config: EyeTrackingConfig): Promise<void> {
    console.log(`Applying eye tracking config for ${technology.deviceName}:`, config);
    // Mock configuration application
  }

  // Output formatting methods
  private isRelevantForOutput(technologyType: string, outputType: string): boolean {
    const relevanceMap: Record<string, string[]> = {
      'screen_reader': ['screen_reader', 'simplified_text'],
      'voice_amplifier': ['screen_reader'],
      'switch_control': ['visual_cues', 'simplified_text'],
      'eye_tracking': ['visual_cues', 'simplified_text'],
    };

    return relevanceMap[technologyType]?.includes(outputType) || false;
  }

  private formatForScreenReader(content: string, technology: AssistiveTechnology): string {
    // Add screen reader specific formatting
    let formatted = content;

    // Add ARIA labels and structure
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Add navigation landmarks
    formatted = `<main role="main">${formatted}</main>`;

    // Add reading instructions
    const config = technology.configuration?.screenReader as ScreenReaderConfig;
    if (config?.announceHeadings) {
      formatted = formatted.replace(/<h(\d)>/g, '<h$1 role="heading" aria-level="$1">');
    }

    return formatted;
  }

  private addVisualCues(content: string): string {
    // Add visual cues for better comprehension
    const cueMap: Record<string, string> = {
      'important': '⚠️ IMPORTANT: ',
      'question': '❓ ',
      'answer': '✅ ',
      'next': '➡️ ',
      'previous': '⬅️ ',
      'finish': '🏁 ',
      'start': '🚀 ',
    };

    let enhanced = content;
    for (const [keyword, cue] of Object.entries(cueMap)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      enhanced = enhanced.replace(regex, `${cue}${keyword}`);
    }

    return enhanced;
  }

  private simplifyForCognitive(content: string): string {
    // Simplify content for cognitive accessibility
    let simplified = content;

    // Break long sentences
    simplified = simplified.replace(/([.!?])\s+/g, '$1\n\n');

    // Add bullet points for lists
    simplified = simplified.replace(/(\d+\.\s)/g, '• ');

    // Simplify complex words
    const simplifications: Record<string, string> = {
      'utilize': 'use',
      'demonstrate': 'show',
      'facilitate': 'help',
      'implement': 'do',
      'subsequently': 'then',
      'approximately': 'about',
    };

    for (const [complex, simple] of Object.entries(simplifications)) {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    }

    return simplified;
  }
}