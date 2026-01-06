import { AgePersonalityAdapter } from '../adapters/AgePersonalityAdapter';
import {
  PersonalityTraits,
  PersonalityContext,
  AgeGroup,
  EmotionalState
} from '../types';

describe('AgePersonalityAdapter', () => {
  let adapter: AgePersonalityAdapter;
  let basePersonality: PersonalityTraits;
  let baseContext: PersonalityContext;

  beforeEach(() => {
    adapter = new AgePersonalityAdapter();
    basePersonality = {
      warmth: 0.8,
      whimsy: 0.7,
      empathy: 0.8,
      youthfulness: 0.7,
      playfulness: 0.6,
      supportiveness: 0.8
    };
    baseContext = {
      childAge: 6,
      ageGroup: '6-8' as AgeGroup,
      currentEmotionalState: 'happy' as EmotionalState,
      conversationPhase: 'character_creation',
      sessionHistory: []
    };
  });

  describe('adaptForAges3to5', () => {
    it('should adapt personality for 3-5 year olds with increased playfulness and whimsy', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 4,
        ageGroup: '3-5'
      };

      const result = adapter.adaptForAges3to5(
        basePersonality,
        context,
        "That's a wonderful character!"
      );

      expect(result.adaptedPersonality.playfulness).toBeGreaterThan(basePersonality.playfulness);
      expect(result.adaptedPersonality.whimsy).toBeGreaterThan(basePersonality.whimsy);
      expect(result.adaptedPersonality.youthfulness).toBeGreaterThan(basePersonality.youthfulness);
      expect(result.developmentalAlignment).toBeGreaterThan(0.5);
    });

    it('should simplify vocabulary and shorten sentences for 3-5 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 4,
        ageGroup: '3-5'
      };

      const result = adapter.adaptForAges3to5(
        basePersonality,
        context,
        "That's an absolutely wonderful and fantastic character you've created!"
      );

      expect(result.adaptedMessage).not.toContain('absolutely');
      expect(result.adaptedMessage).not.toContain('fantastic');
      expect(result.adaptationFeatures).toContain('simple vocabulary');
      expect(result.adaptationFeatures).toContain('short sentences');
    });

    it('should add simple whimsical elements for 3-5 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 4,
        ageGroup: '3-5'
      };

      const result = adapter.adaptForAges3to5(
        basePersonality,
        context,
        "Good job!"
      );

      expect(result.adaptationFeatures).toContain('simple whimsical elements');
      expect(result.adaptedMessage).toMatch(/super|really really|so so|yay/);
    });

    it('should add enthusiastic encouragement for 3-5 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 4,
        ageGroup: '3-5'
      };

      const result = adapter.adaptForAges3to5(
        basePersonality,
        context,
        "You did well"
      );

      expect(result.adaptationFeatures).toContain('enthusiastic encouragement');
      expect(result.adaptedMessage).toContain('!');
    });
  });

  describe('adaptForAges6to8', () => {
    it('should adapt personality for 6-8 year olds with balanced traits', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 7,
        ageGroup: '6-8'
      };

      const result = adapter.adaptForAges6to8(
        basePersonality,
        context,
        "That's a creative character!"
      );

      expect(result.adaptedPersonality.playfulness).toBeGreaterThan(basePersonality.playfulness);
      expect(result.adaptedPersonality.whimsy).toBeGreaterThanOrEqual(basePersonality.whimsy);
      expect(result.developmentalAlignment).toBeGreaterThan(0.5);
    });

    it('should add playful wordplay for 6-8 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 7,
        ageGroup: '6-8'
      };

      const result = adapter.adaptForAges6to8(
        basePersonality,
        context,
        "That's fun!"
      );

      expect(result.adaptationFeatures).toContain('playful wordplay');
      expect(result.adaptedMessage).toContain('fun-tastic');
    });

    it('should enhance vocabulary appropriately for 6-8 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 7,
        ageGroup: '6-8'
      };

      const result = adapter.adaptForAges6to8(
        basePersonality,
        context,
        "That's good work!"
      );

      expect(result.adaptationFeatures).toContain('intermediate vocabulary');
      expect(result.adaptedMessage).toContain('awesome');
    });

    it('should add confidence building elements for 6-8 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 7,
        ageGroup: '6-8'
      };

      const result = adapter.adaptForAges6to8(
        basePersonality,
        context,
        "Nice character!"
      );

      expect(result.adaptationFeatures).toContain('confidence building');
      expect(result.adaptedMessage).toMatch(/you're doing great/i);
    });
  });

  describe('adaptForAges9to10', () => {
    it('should adapt personality for 9-10 year olds with increased respect', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 9,
        ageGroup: '9-10'
      };

      const result = adapter.adaptForAges9to10(
        basePersonality,
        context,
        "That's an interesting character concept!"
      );

      expect(result.adaptedPersonality.empathy).toBeGreaterThanOrEqual(basePersonality.empathy);
      expect(result.adaptedPersonality.supportiveness).toBeGreaterThanOrEqual(basePersonality.supportiveness);
      expect(result.developmentalAlignment).toBeGreaterThan(0.5);
    });

    it('should add clever whimsy for 9-10 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 9,
        ageGroup: '9-10'
      };

      const result = adapter.adaptForAges9to10(
        basePersonality,
        context,
        "That's amazing!"
      );

      expect(result.adaptationFeatures).toContain('clever whimsical elements');
      expect(result.adaptedMessage).toContain('amazingly-blazingly');
    });

    it('should add creative absurdity for 9-10 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 9,
        ageGroup: '9-10'
      };

      const result = adapter.adaptForAges9to10(
        basePersonality,
        context,
        "That's wonderful!"
      );

      expect(result.adaptationFeatures).toContain('creative absurdity');
      expect(result.adaptedMessage).toContain('dancing elephant');
    });

    it('should show increased respect for 9-10 year olds', () => {
      const context: PersonalityContext = {
        ...baseContext,
        childAge: 9,
        ageGroup: '9-10'
      };

      const result = adapter.adaptForAges9to10(
        basePersonality,
        context,
        "Your idea is creative!"
      );

      expect(result.adaptationFeatures).toContain('increased respect');
      expect(result.adaptedMessage).toMatch(/appreciate/i);
    });
  });

  describe('dynamicallyDetectAndAdapt', () => {
    it('should detect age group from simple vocabulary and adapt accordingly', () => {
      const result = adapter.dynamicallyDetectAndAdapt(
        "I like puppies and they are fun!",
        4,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        basePersonality,
        "That's great!"
      );

      expect(result.detectedAgeGroup).toBe('3-5');
      expect(result.confidenceScore).toBeGreaterThan(0.5);
      expect(result.detectionReasons).toContain('simple vocabulary and concepts');
    });

    it('should detect age group from complex vocabulary and adapt accordingly', () => {
      const result = adapter.dynamicallyDetectAndAdapt(
        "I want to create a sophisticated character with complex motivations and psychological depth.",
        12,
        { ...baseContext, childAge: 12, ageGroup: '11+' },
        basePersonality,
        "That's an interesting concept!"
      );

      expect(result.detectedAgeGroup).toBe('11+');
      expect(result.confidenceScore).toBeGreaterThan(0.5);
      expect(result.detectionReasons).toContain('advanced communication patterns');
    });

    it('should increase confidence when detected age aligns with declared age', () => {
      const result = adapter.dynamicallyDetectAndAdapt(
        "That's awesome and I want to make it super cool!",
        7,
        { ...baseContext, childAge: 7, ageGroup: '6-8' },
        basePersonality,
        "Great idea!"
      );

      expect(result.detectedAgeGroup).toBe('6-8');
      expect(result.confidenceScore).toBeGreaterThan(0.7);
      expect(result.detectionReasons).toContain('aligns with declared age');
    });
  });

  describe('maintainPersonalityConsistency', () => {
    it('should maintain core traits while allowing age-appropriate variation', () => {
      const ageAdaptations = [
        { ...basePersonality, whimsy: 0.9, playfulness: 0.9 }, // 3-5 adaptation
        { ...basePersonality, whimsy: 0.8, playfulness: 0.8 }, // 6-8 adaptation
        { ...basePersonality, whimsy: 0.6, playfulness: 0.6 }  // 9-10 adaptation
      ];

      const result = adapter.maintainPersonalityConsistency(
        basePersonality,
        ageAdaptations,
        baseContext
      );

      expect(result.consistentTraits.warmth).toBeGreaterThanOrEqual(0.7);
      expect(result.consistentTraits.empathy).toBeGreaterThanOrEqual(0.7);
      expect(result.consistentTraits.supportiveness).toBeGreaterThanOrEqual(0.7);
      expect(result.consistencyScore).toBeGreaterThan(0.5);
      expect(result.coreTraitPreservation.length).toBeGreaterThan(0);
    });

    it('should ensure minimum levels for core traits', () => {
      const extremeAdaptations = [
        { warmth: 0.1, whimsy: 0.1, empathy: 0.1, youthfulness: 0.1, playfulness: 0.1, supportiveness: 0.1 }
      ];

      const result = adapter.maintainPersonalityConsistency(
        basePersonality,
        extremeAdaptations,
        baseContext
      );

      expect(result.consistentTraits.warmth).toBeGreaterThanOrEqual(0.7);
      expect(result.consistentTraits.empathy).toBeGreaterThanOrEqual(0.7);
      expect(result.consistentTraits.supportiveness).toBeGreaterThanOrEqual(0.7);
      expect(result.consistentTraits.whimsy).toBeGreaterThanOrEqual(0.3);
    });
  });

  describe('adaptCommunicationComplexity', () => {
    it('should adapt communication complexity for 3-5 year olds', () => {
      const result = adapter.adaptCommunicationComplexity(
        "That's an absolutely wonderful and sophisticated character you've created!",
        '3-5',
        { ...baseContext, childAge: 4, ageGroup: '3-5' }
      );

      expect(result.complexityLevel).toBe('basic');
      expect(result.vocabularyAdjustments.length).toBeGreaterThan(0);
      expect(result.adaptedMessage).not.toContain('absolutely');
      expect(result.adaptedMessage).not.toContain('sophisticated');
    });

    it('should maintain appropriate complexity for 6-8 year olds', () => {
      const result = adapter.adaptCommunicationComplexity(
        "That's a good character with interesting traits!",
        '6-8',
        { ...baseContext, childAge: 7, ageGroup: '6-8' }
      );

      expect(result.complexityLevel).toBe('moderate');
      expect(result.adaptedMessage).toContain('awesome');
    });

    it('should enhance vocabulary for 9-10 year olds', () => {
      const result = adapter.adaptCommunicationComplexity(
        "That's a good character concept!",
        '9-10',
        { ...baseContext, childAge: 9, ageGroup: '9-10' }
      );

      expect(result.complexityLevel).toBe('moderate');
      expect(result.adaptedMessage).toContain('remarkable');
    });
  });

  describe('age-specific feature detection', () => {
    it('should identify simple vocabulary features for 3-5 year olds', () => {
      const result = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        "That's really good and fun!"
      );

      expect(result.adaptationFeatures).toContain('simple vocabulary');
      expect(result.adaptationFeatures).toContain('enthusiastic encouragement');
    });

    it('should identify intermediate features for 6-8 year olds', () => {
      const result = adapter.adaptForAges6to8(
        basePersonality,
        { ...baseContext, childAge: 7, ageGroup: '6-8' },
        "That's awesome work!"
      );

      expect(result.adaptationFeatures).toContain('intermediate vocabulary');
      expect(result.adaptationFeatures).toContain('confidence building');
    });

    it('should identify sophisticated features for 9-10 year olds', () => {
      const result = adapter.adaptForAges9to10(
        basePersonality,
        { ...baseContext, childAge: 9, ageGroup: '9-10' },
        "That's remarkably creative!"
      );

      expect(result.adaptationFeatures).toContain('sophisticated vocabulary');
      expect(result.adaptationFeatures).toContain('increased respect');
    });
  });

  describe('developmental alignment calculation', () => {
    it('should calculate high alignment for age-appropriate content', () => {
      const result = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        "Good job! That's fun!"
      );

      expect(result.developmentalAlignment).toBeGreaterThan(0.7);
    });

    it('should calculate lower alignment for age-inappropriate content', () => {
      const result = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        "That demonstrates sophisticated psychological complexity in your character development methodology."
      );

      expect(result.developmentalAlignment).toBeLessThan(0.6);
    });
  });

  describe('personality trait adjustments', () => {
    it('should increase playfulness and whimsy for younger children', () => {
      const result3to5 = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        "Great work!"
      );

      const result9to10 = adapter.adaptForAges9to10(
        basePersonality,
        { ...baseContext, childAge: 9, ageGroup: '9-10' },
        "Great work!"
      );

      expect(result3to5.adaptedPersonality.playfulness).toBeGreaterThan(
        result9to10.adaptedPersonality.playfulness
      );
      expect(result3to5.adaptedPersonality.whimsy).toBeGreaterThan(
        result9to10.adaptedPersonality.whimsy
      );
    });

    it('should maintain high warmth and empathy across all ages', () => {
      const ages: AgeGroup[] = ['3-5', '6-8', '9-10'];
      
      ages.forEach(ageGroup => {
        const context = { ...baseContext, ageGroup };
        let result;
        
        switch (ageGroup) {
          case '3-5':
            result = adapter.adaptForAges3to5(basePersonality, context, "Good job!");
            break;
          case '6-8':
            result = adapter.adaptForAges6to8(basePersonality, context, "Good job!");
            break;
          case '9-10':
            result = adapter.adaptForAges9to10(basePersonality, context, "Good job!");
            break;
        }

        expect(result.adaptedPersonality.warmth).toBeGreaterThanOrEqual(0.7);
        expect(result.adaptedPersonality.empathy).toBeGreaterThanOrEqual(0.7);
      });
    });
  });

  describe('communication pattern adaptation', () => {
    it('should create shorter responses for younger children', () => {
      const longMessage = "That's an absolutely wonderful and fantastic character you've created with such incredible detail and amazing creativity that shows your brilliant imagination!";

      const result3to5 = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        longMessage
      );

      const result9to10 = adapter.adaptForAges9to10(
        basePersonality,
        { ...baseContext, childAge: 9, ageGroup: '9-10' },
        longMessage
      );

      expect(result3to5.adaptedMessage.length).toBeLessThan(result9to10.adaptedMessage.length);
    });

    it('should use more enthusiastic punctuation for younger children', () => {
      const result3to5 = adapter.adaptForAges3to5(
        basePersonality,
        { ...baseContext, childAge: 4, ageGroup: '3-5' },
        "That's good"
      );

      expect(result3to5.adaptedMessage).toContain('!');
    });
  });
});