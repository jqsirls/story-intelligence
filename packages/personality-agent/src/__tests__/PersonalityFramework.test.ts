import { PersonalityFramework } from '../PersonalityFramework';
import {
  PersonalityRequest,
  PersonalityContext,
  EmotionalState,
  AgeGroup
} from '../types';

describe('PersonalityFramework', () => {
  let personalityFramework: PersonalityFramework;

  beforeEach(() => {
    personalityFramework = new PersonalityFramework();
  });

  describe('generatePersonalityResponse', () => {
    it('should generate appropriate response for happy 5-year-old', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 5,
          ageGroup: '3-5' as AgeGroup,
          currentEmotionalState: 'happy' as EmotionalState,
          conversationPhase: 'character_creation',
          sessionHistory: []
        },
        userInput: "I want to make a story about a dragon!",
        conversationGoal: "help create character",
        storyContext: {
          characterName: "Dragon",
          storyType: "adventure"
        }
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.response).toBeDefined();
      expect(response.personalityTraitsUsed.warmth).toBeGreaterThan(0.8);
      expect(response.personalityTraitsUsed.whimsy).toBeGreaterThan(0.5);
      expect(response.emotionalTone).toBe('happy');
      expect(response.confidenceScore).toBeGreaterThan(0.5);
    });

    it('should adapt response for sad child', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 7,
          ageGroup: '6-8' as AgeGroup,
          currentEmotionalState: 'sad' as EmotionalState,
          conversationPhase: 'greeting',
          sessionHistory: []
        },
        userInput: "I don't feel good today",
        conversationGoal: "provide comfort"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.response).toBeDefined();
      expect(response.personalityTraitsUsed.empathy).toBeGreaterThan(0.8);
      expect(response.personalityTraitsUsed.warmth).toBeGreaterThan(0.8);
      expect(response.empathicElements.length).toBeGreaterThan(0);
      expect(response.response.toLowerCase()).toMatch(/understand|care|here|feel/);
    });

    it('should include age-appropriate whimsical elements', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 4,
          ageGroup: '3-5' as AgeGroup,
          currentEmotionalState: 'excited' as EmotionalState,
          conversationPhase: 'story_building',
          sessionHistory: []
        },
        userInput: "The unicorn is flying!",
        conversationGoal: "continue story"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.whimsicalElements.length).toBeGreaterThan(0);
      expect(response.ageAppropriateAdaptations.length).toBeGreaterThan(0);
      expect(response.personalityTraitsUsed.playfulness).toBeGreaterThan(0.5);
    });

    it('should balance energy with emotional sensitivity', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 8,
          ageGroup: '6-8' as AgeGroup,
          currentEmotionalState: 'anxious' as EmotionalState,
          conversationPhase: 'character_creation',
          sessionHistory: []
        },
        userInput: "I'm not sure what to do",
        conversationGoal: "provide guidance"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.personalityTraitsUsed.youthfulness).toBeLessThan(0.8);
      expect(response.personalityTraitsUsed.empathy).toBeGreaterThan(0.8);
      expect(response.personalityTraitsUsed.supportiveness).toBeGreaterThan(0.8);
    });
  });

  describe('validateAndRespondToEmotion', () => {
    it('should validate child emotions appropriately', () => {
      const context: PersonalityContext = {
        childAge: 6,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'frustrated' as EmotionalState,
        conversationPhase: 'story_building',
        sessionHistory: []
      };

      const result = personalityFramework.validateAndRespondToEmotion(
        'frustrated',
        context,
        "This is too hard!"
      );

      expect(result.validation).toBeDefined();
      expect(result.emotionalResponse).toBeDefined();
      expect(result.supportLevel).toBeGreaterThan(0.5);
      expect(result.validation.toLowerCase()).toMatch(/understand|frustrated|feel/);
    });

    it('should provide appropriate support for shy children', () => {
      const context: PersonalityContext = {
        childAge: 5,
        ageGroup: '3-5' as AgeGroup,
        currentEmotionalState: 'shy' as EmotionalState,
        conversationPhase: 'greeting',
        sessionHistory: []
      };

      const result = personalityFramework.validateAndRespondToEmotion(
        'shy',
        context,
        "I don't know..."
      );

      expect(result.validation).toBeDefined();
      expect(result.supportLevel).toBeGreaterThan(0.4);
      expect(result.validation.toLowerCase()).toMatch(/shy|time|okay|safe/);
    });
  });

  describe('createWhimsicalLanguage', () => {
    it('should create age-appropriate whimsical language', () => {
      const context: PersonalityContext = {
        childAge: 4,
        ageGroup: '3-5' as AgeGroup,
        currentEmotionalState: 'happy' as EmotionalState,
        conversationPhase: 'character_creation',
        sessionHistory: []
      };

      const result = personalityFramework.createWhimsicalLanguage(
        "That's a great character!",
        context
      );

      expect(result.whimsicalMessage).toBeDefined();
      expect(result.whimsicalMessage).not.toBe("That's a great character!");
      expect(result.giggleFactor).toBeGreaterThan(0);
      expect(result.storyFocus).toBeGreaterThan(0.5);
    });

    it('should maintain story focus when story context provided', () => {
      const context: PersonalityContext = {
        childAge: 7,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'excited' as EmotionalState,
        conversationPhase: 'story_building',
        sessionHistory: []
      };

      const storyContext = {
        characterName: "Princess Luna",
        storyType: "adventure",
        currentScene: "castle"
      };

      const result = personalityFramework.createWhimsicalLanguage(
        "The princess is brave!",
        context,
        storyContext
      );

      expect(result.storyFocus).toBeGreaterThan(0.7);
      expect(result.whimsicalMessage.toLowerCase()).toMatch(/princess|luna|brave/);
    });
  });

  describe('provideEmpathicSupport', () => {
    it('should provide comfort for sad children', () => {
      const context: PersonalityContext = {
        childAge: 6,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'sad' as EmotionalState,
        conversationPhase: 'greeting',
        sessionHistory: []
      };

      const result = personalityFramework.provideEmpathicSupport(
        'sad',
        context,
        'comfort'
      );

      expect(result.empathicMessage).toBeDefined();
      expect(result.nurturingElements.length).toBeGreaterThan(0);
      expect(result.emotionalConnection).toBeGreaterThan(0.4);
      expect(result.empathicMessage.toLowerCase()).toMatch(/sad|understand|here|comfort/);
    });

    it('should provide encouragement appropriately', () => {
      const context: PersonalityContext = {
        childAge: 8,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'frustrated' as EmotionalState,
        conversationPhase: 'character_creation',
        sessionHistory: []
      };

      const result = personalityFramework.provideEmpathicSupport(
        'frustrated',
        context,
        'encouragement'
      );

      expect(result.empathicMessage).toBeDefined();
      expect(result.nurturingElements.length).toBeGreaterThan(0);
      expect(result.empathicMessage.toLowerCase()).toMatch(/proud|effort|try|wonderful/);
    });

    it('should celebrate achievements with appropriate enthusiasm', () => {
      const context: PersonalityContext = {
        childAge: 5,
        ageGroup: '3-5' as AgeGroup,
        currentEmotionalState: 'excited' as EmotionalState,
        conversationPhase: 'story_building',
        sessionHistory: []
      };

      const result = personalityFramework.provideEmpathicSupport(
        'excited',
        context,
        'celebration'
      );

      expect(result.empathicMessage).toBeDefined();
      expect(result.emotionalConnection).toBeGreaterThan(0.5);
      expect(result.empathicMessage.toLowerCase()).toMatch(/wonderful|amazing|proud|special/);
    });
  });

  describe('generateYouthfulEnergy', () => {
    it('should generate appropriate energy for happy children', () => {
      const context: PersonalityContext = {
        childAge: 7,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'happy' as EmotionalState,
        conversationPhase: 'story_building',
        sessionHistory: []
      };

      const result = personalityFramework.generateYouthfulEnergy(
        context,
        "creating a magical story",
        0.8
      );

      expect(result.energeticMessage).toBeDefined();
      expect(result.energyLevel).toBeGreaterThan(0.5);
      expect(result.appropriateness).toBeGreaterThan(0.6);
    });

    it('should reduce energy for anxious children', () => {
      const context: PersonalityContext = {
        childAge: 6,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'anxious' as EmotionalState,
        conversationPhase: 'greeting',
        sessionHistory: []
      };

      const result = personalityFramework.generateYouthfulEnergy(
        context,
        "starting our story",
        0.8
      );

      expect(result.energyLevel).toBeLessThan(0.6);
      expect(result.appropriateness).toBeGreaterThan(0.7);
    });
  });

  describe('createWarmNurturingResponse', () => {
    it('should create welcoming responses', () => {
      const context: PersonalityContext = {
        childAge: 5,
        ageGroup: '3-5' as AgeGroup,
        currentEmotionalState: 'neutral' as EmotionalState,
        conversationPhase: 'greeting',
        sessionHistory: []
      };

      const result = personalityFramework.createWarmNurturingResponse(
        context,
        'welcoming'
      );

      expect(result.warmMessage).toBeDefined();
      expect(result.nurturingLevel).toBeGreaterThan(0.5);
      expect(result.emotionalSafety).toBeGreaterThan(0.5);
      expect(result.warmMessage.toLowerCase()).toMatch(/welcome|safe|care|here/);
    });

    it('should create comforting responses for distressed children', () => {
      const context: PersonalityContext = {
        childAge: 8,
        ageGroup: '6-8' as AgeGroup,
        currentEmotionalState: 'sad' as EmotionalState,
        conversationPhase: 'greeting',
        sessionHistory: []
      };

      const result = personalityFramework.createWarmNurturingResponse(
        context,
        'comforting'
      );

      expect(result.warmMessage).toBeDefined();
      expect(result.nurturingLevel).toBeGreaterThan(0.7);
      expect(result.emotionalSafety).toBeGreaterThan(0.7);
    });

    it('should create celebrating responses for achievements', () => {
      const context: PersonalityContext = {
        childAge: 9,
        ageGroup: '9-10' as AgeGroup,
        currentEmotionalState: 'excited' as EmotionalState,
        conversationPhase: 'story_building',
        sessionHistory: []
      };

      const result = personalityFramework.createWarmNurturingResponse(
        context,
        'celebrating'
      );

      expect(result.warmMessage).toBeDefined();
      expect(result.nurturingLevel).toBeGreaterThan(0.6);
      expect(result.warmMessage.toLowerCase()).toMatch(/proud|wonderful|amazing|celebrate/);
    });
  });

  describe('age-appropriate adaptations', () => {
    it('should adapt language for 3-5 year olds', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 4,
          ageGroup: '3-5' as AgeGroup,
          currentEmotionalState: 'happy' as EmotionalState,
          conversationPhase: 'character_creation',
          sessionHistory: []
        },
        userInput: "I like puppies!",
        conversationGoal: "engage with interest"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.ageAppropriateAdaptations.length).toBeGreaterThan(0);
      // Should use simple vocabulary
      expect(response.response.toLowerCase()).toMatch(/good|nice|fun|happy|big|little/);
    });

    it('should adapt language for 11+ year olds', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 12,
          ageGroup: '11+' as AgeGroup,
          currentEmotionalState: 'curious' as EmotionalState,
          conversationPhase: 'story_building',
          sessionHistory: []
        },
        userInput: "I want to create a complex character with deep motivations",
        conversationGoal: "support creative development"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.ageAppropriateAdaptations.length).toBeGreaterThan(0);
      // Should use more sophisticated vocabulary
      expect(response.response.toLowerCase()).toMatch(/genuinely|remarkable|sophisticated|creative/);
    });
  });

  describe('emotional intelligence integration', () => {
    it('should recognize and validate multiple emotions', async () => {
      const request: PersonalityRequest = {
        context: {
          childAge: 7,
          ageGroup: '6-8' as AgeGroup,
          currentEmotionalState: 'frustrated' as EmotionalState,
          conversationPhase: 'character_creation',
          sessionHistory: []
        },
        userInput: "I can't think of a good character and it's making me upset",
        conversationGoal: "provide support and guidance"
      };

      const response = await personalityFramework.generatePersonalityResponse(request);

      expect(response.empathicElements.length).toBeGreaterThan(0);
      expect(response.personalityTraitsUsed.empathy).toBeGreaterThan(0.8);
      expect(response.response.toLowerCase()).toMatch(/understand|frustrated|help|together/);
    });

    it('should maintain warmth across different emotional states', async () => {
      const emotions: EmotionalState[] = ['happy', 'sad', 'excited', 'anxious', 'curious'];
      
      for (const emotion of emotions) {
        const request: PersonalityRequest = {
          context: {
            childAge: 6,
            ageGroup: '6-8' as AgeGroup,
            currentEmotionalState: emotion,
            conversationPhase: 'greeting',
            sessionHistory: []
          },
          userInput: `I'm feeling ${emotion}`,
          conversationGoal: "respond appropriately"
        };

        const response = await personalityFramework.generatePersonalityResponse(request);

        expect(response.personalityTraitsUsed.warmth).toBeGreaterThan(0.7);
        expect(response.response.toLowerCase()).toMatch(/care|here|with|understand/);
      }
    });
  });
});