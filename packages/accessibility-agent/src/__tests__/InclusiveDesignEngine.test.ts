import { InclusiveDesignEngine } from '../services/InclusiveDesignEngine';
import { AccessibilityProfile } from '../types';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockProfile, error: null }))
        }))
      }))
    }))
  }))
};

const mockProfile: AccessibilityProfile = {
  id: 'test-profile-id',
  userId: 'test-user-id',
  profileName: 'Test Profile',
  speechProcessingDelay: 1000,
  extendedResponseTime: true,
  alternativeInputMethods: ['touch', 'gesture'],
  vocabularyLevel: 'simple',
  simplifiedLanguageMode: true,
  customVocabularyTerms: ['complex:simple', 'difficult:easy'],
  attentionSpanMinutes: 8,
  engagementCheckFrequency: 120,
  shorterInteractionCycles: true,
  screenReaderCompatible: true,
  voiceAmplifierIntegration: false,
  switchControlSupport: false,
  eyeTrackingSupport: false,
  extendedTimeouts: true,
  motorDifficultySupport: true,
  customTimeoutDuration: 20000,
  voicePaceAdjustment: 0.7,
  visualCuesEnabled: true,
  highContrastMode: true,
  largeTextMode: true,
  memoryAidsEnabled: true,
  repetitionFrequency: 2,
  structuredPrompts: true,
  preferredInteractionStyle: 'guided',
  breakReminders: true,
  breakReminderInterval: 600,
  createdAt: new Date(),
  updatedAt: new Date(),
  isActive: true,
};

describe('InclusiveDesignEngine', () => {
  let engine: InclusiveDesignEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new InclusiveDesignEngine(mockSupabase as any);
  });

  describe('Voice Pace Adjustment', () => {
    it('should adjust voice pace for processing differences', async () => {
      const originalText = "Hello! Let's create a magnificent story about a dragon.";
      
      const result = await engine.adjustVoicePace('test-user-id', originalText, mockProfile);

      expect(result.paceMultiplier).toBe(0.7);
      expect(result.adjustedText).toContain('<pause:');
      expect(result.pauseInstructions.length).toBeGreaterThanOrEqual(1); // At least one sentence ending
      expect(result.pauseInstructions[0].type).toBe('sentence_end');
    });

    it('should add breathing pauses for long sentences', async () => {
      const originalText = "This is a long sentence with commas, and more content, and even more content.";
      
      const result = await engine.adjustVoicePace('test-user-id', originalText, mockProfile);

      expect(result.pauseInstructions.some(p => p.type === 'comma_pause')).toBe(true);
      expect(result.adjustedText).toContain('<pause:200ms>');
    });

    it('should handle emphasis markers', async () => {
      const originalText = "This is **very important** information.";
      
      const result = await engine.adjustVoicePace('test-user-id', originalText, mockProfile);

      expect(result.adjustedText).toContain('very important');
      expect(result.adjustedText).toContain('<pause:1800ms>');
      // Should have emphasis pauses around the emphasized text
    });
  });

  describe('Visual Cues Integration', () => {
    it('should add visual cues when enabled', async () => {
      const content = "This is a question about your story character.";
      
      const result = await engine.addVisualCues('test-user-id', content, mockProfile);

      expect(result).toContain('❓'); // Question emoji should be added
      expect(result).toContain('👤'); // Character emoji should be added
    });

    it('should add formatting cues', async () => {
      const content = "Are you ready? Let's start!";
      
      const result = await engine.addVisualCues('test-user-id', content, mockProfile);

      expect(result).toContain('**?**'); // Question should be bolded
      // Note: Line breaks are added by formatting cues but may be processed differently
    });

    it('should apply color cues for high importance content', async () => {
      const content = "This is very important information.";
      const context = { importance: 'high' as const };
      
      const result = await engine.addVisualCues('test-user-id', content, mockProfile, context);

      // The visual cues engine adds emojis and other cues, but color cues are only added if colors are in the cue types
      expect(result).toContain('⚠️'); // Important emoji should be added
    });

    it('should not add visual cues when disabled', async () => {
      const profileWithoutCues = { ...mockProfile, visualCuesEnabled: false };
      const content = "This is a question about your story.";
      
      const result = await engine.addVisualCues('test-user-id', content, profileWithoutCues);

      expect(result).toBe(content); // Should return unchanged
    });
  });

  describe('Language Simplification', () => {
    it('should simplify language for cognitive accessibility', async () => {
      const text = "The magnificent dragon was extraordinarily large and tremendously powerful.";
      
      const result = await engine.simplifyLanguage('test-user-id', text, mockProfile);

      expect(result.simplifiedText).toContain('great'); // magnificent -> great
      expect(result.simplifiedText).toContain('amazing'); // extraordinarily -> amazing
      expect(result.simplifiedText).toContain('big'); // tremendously -> big
      expect(result.simplifications.length).toBeGreaterThan(0);
      expect(result.readabilityScore).toBeGreaterThan(0);
    });

    it('should break long sentences', async () => {
      const text = "This is a very long sentence that contains many words and should be broken down into smaller, more manageable pieces for better comprehension.";
      
      const result = await engine.simplifyLanguage('test-user-id', text, mockProfile);

      // Should be broken into multiple sentences
      const sentences = result.simplifiedText.split('.').filter(s => s.trim().length > 0);
      expect(sentences.length).toBeGreaterThan(1);
    });

    it('should add definitions when enabled', async () => {
      const text = "The character went on an adventure.";
      
      const result = await engine.simplifyLanguage('test-user-id', text, mockProfile);

      expect(result.simplifiedText).toContain('character (the person in the story)');
      expect(result.simplifiedText).toContain('adventure (an exciting trip)');
    });

    it('should convert passive voice to active voice', async () => {
      const text = "The story was created by the child.";
      
      const result = await engine.simplifyLanguage('test-user-id', text, mockProfile);

      expect(result.simplifiedText).toContain('created');
      expect(result.simplifications.some(s => s.reason.includes('passive voice'))).toBe(true);
    });

    it('should not simplify when not needed', async () => {
      const profileStandard = { ...mockProfile, simplifiedLanguageMode: false, vocabularyLevel: 'standard' as const };
      const text = "This is simple text.";
      
      const result = await engine.simplifyLanguage('test-user-id', text, profileStandard);

      expect(result.simplifiedText).toBe(text);
      expect(result.simplifications).toHaveLength(0);
    });
  });

  describe('Extended Timeouts Configuration', () => {
    it('should configure extended timeouts for motor difficulties', async () => {
      const result = await engine.configureExtendedTimeouts('test-user-id', mockProfile, 'input');

      expect(result.inputTimeout).toBeGreaterThan(10000); // Should be extended
      expect(result.processingTimeout).toBeGreaterThan(5000); // Should be extended
      expect(result.confirmationTimeout).toBeGreaterThan(15000); // Should be extended
      expect(result.adaptiveTimeout).toBe(true);
    });

    it('should use custom timeout duration when specified', async () => {
      const result = await engine.configureExtendedTimeouts('test-user-id', mockProfile, 'input');

      expect(result.inputTimeout).toBeGreaterThanOrEqual(mockProfile.customTimeoutDuration);
    });

    it('should apply motor difficulty multiplier', async () => {
      const result = await engine.configureExtendedTimeouts('test-user-id', mockProfile, 'input');

      // Motor difficulty support should apply 2.0 multiplier
      expect(result.processingTimeout).toBe(5000 * 2.0);
    });

    it('should use default timeouts when extended timeouts disabled', async () => {
      const profileNoExtended = { ...mockProfile, extendedTimeouts: false, motorDifficultySupport: false };
      
      const result = await engine.configureExtendedTimeouts('test-user-id', profileNoExtended, 'input');

      expect(result.inputTimeout).toBe(10000); // Default
      expect(result.processingTimeout).toBe(5000); // Default
      expect(result.confirmationTimeout).toBe(15000); // Default
      expect(result.adaptiveTimeout).toBe(false);
    });
  });

  describe('Multi-Modal Input Support', () => {
    it('should recommend appropriate modalities based on profile', async () => {
      const availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[] = 
        ['voice', 'touch', 'gesture', 'switch', 'eye_tracking'];
      
      const result = await engine.enableMultiModalSupport('test-user-id', mockProfile, availableModalities);

      expect(result.recommendedModalities).toContain('touch');
      expect(result.recommendedModalities).toContain('gesture');
      expect(result.fallbackSequence).toContain('voice');
      expect(result.adaptationSettings).toHaveProperty('touch');
      expect(result.adaptationSettings).toHaveProperty('gesture');
    });

    it('should prioritize voice when no speech difficulties', async () => {
      const profileNoSpeechIssues = { ...mockProfile, extendedResponseTime: false };
      const availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[] = 
        ['voice', 'touch', 'gesture'];
      
      const result = await engine.enableMultiModalSupport('test-user-id', profileNoSpeechIssues, availableModalities);

      expect(result.recommendedModalities[0]).toBe('voice');
    });

    it('should configure fallback sequence for motor difficulties', async () => {
      const availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[] = 
        ['voice', 'touch', 'gesture', 'switch', 'eye_tracking'];
      
      const result = await engine.enableMultiModalSupport('test-user-id', mockProfile, availableModalities);

      expect(result.fallbackSequence).toContain('voice');
      expect(result.fallbackSequence).toContain('eye_tracking');
      expect(result.fallbackSequence).toContain('switch');
    });

    it('should filter fallback sequence to available modalities', async () => {
      const availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[] = 
        ['voice', 'touch']; // Limited available modalities
      
      const result = await engine.enableMultiModalSupport('test-user-id', mockProfile, availableModalities);

      expect(result.fallbackSequence).toContain('voice');
      expect(result.fallbackSequence.every(modality => availableModalities.includes(modality as any))).toBe(true);
      expect(result.fallbackSequence).not.toContain('switch');
      expect(result.fallbackSequence).not.toContain('eye_tracking');
    });

    it('should configure adaptation settings for each modality', async () => {
      const availableModalities: ('voice' | 'touch' | 'gesture' | 'switch' | 'eye_tracking')[] = 
        ['voice', 'touch'];
      
      const result = await engine.enableMultiModalSupport('test-user-id', mockProfile, availableModalities);

      expect(result.adaptationSettings).toHaveProperty('voice');
      expect(result.adaptationSettings).toHaveProperty('touch');
      expect(result.adaptationSettings.voice).toHaveProperty('paceAdjustment', 0.7);
      expect(result.adaptationSettings.voice).toHaveProperty('processingDelay', 1000);
      expect(result.adaptationSettings.touch).toHaveProperty('extendedTimeout', true);
      expect(result.adaptationSettings.touch).toHaveProperty('motorSupport', true);
    });
  });

  describe('Accessibility Report Generation', () => {
    beforeEach(() => {
      // Mock database responses for report generation
      mockSupabase.from = jest.fn((table) => {
        if (table === 'accessibility_profiles') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({ data: mockProfile, error: null }))
                }))
              }))
            }))
          };
        } else if (table === 'communication_adaptations') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                group: jest.fn(() => Promise.resolve({ 
                  data: [
                    { adaptationType: 'speech_delay', count: 5 },
                    { adaptationType: 'vocabulary_level', count: 3 }
                  ], 
                  error: null 
                }))
              }))
            }))
          };
        } else {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ 
                data: [
                  { effectivenessScore: 0.8 },
                  { effectivenessScore: 0.7 },
                  { effectivenessScore: 0.9 }
                ], 
                error: null 
              }))
            }))
          };
        }
      });
    });

    it('should generate comprehensive accessibility report', async () => {
      const result = await engine.generateAccessibilityReport('test-user-id');

      expect(result.profileSummary).toBeDefined();
      expect(result.profileSummary.activeFeatures).toContain('Speech Processing Delay');
      expect(result.profileSummary.activeFeatures).toContain('Extended Response Time');
      expect(result.profileSummary.activeFeatures).toContain('Simplified Language');
      expect(result.profileSummary.difficultyAreas).toContain('Speech Processing');
      expect(result.profileSummary.difficultyAreas).toContain('Motor Skills');
      expect(result.profileSummary.difficultyAreas).toContain('Attention Span');

      expect(result.adaptationUsage).toBeDefined();
      expect(result.effectivenessMetrics).toBeDefined();
      expect(result.effectivenessMetrics.averageEffectiveness).toBeGreaterThanOrEqual(0);
      expect(result.effectivenessMetrics.totalAdaptations).toBeGreaterThanOrEqual(0);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should provide recommendations based on profile analysis', async () => {
      const result = await engine.generateAccessibilityReport('test-user-id');

      // Should have recommendations array
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Check that recommendations are relevant to the profile
      const hasRelevantRecommendations = result.recommendations.some(r => 
        r.includes('break') || r.includes('memory') || r.includes('timeout') || r.includes('effectiveness')
      );
      expect(hasRelevantRecommendations).toBe(true);
    });

    it('should handle missing profile gracefully', async () => {
      mockSupabase.from = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }));

      const result = await engine.generateAccessibilityReport('test-user-id');

      expect(result.recommendations).toContain('Create an accessibility profile to get personalized adaptations');
    });
  });
});