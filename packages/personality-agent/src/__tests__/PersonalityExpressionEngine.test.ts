import { PersonalityExpressionEngine } from '../expression/PersonalityExpressionEngine';
import {
  PersonalityTraits,
  PersonalityContext,
  EmotionalState,
  AgeGroup
} from '../types';

describe('PersonalityExpressionEngine', () => {
  let engine: PersonalityExpressionEngine;
  let basePersonality: PersonalityTraits;
  let baseContext: PersonalityContext;

  beforeEach(() => {
    engine = new PersonalityExpressionEngine();
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

  describe('buildExpressionLibrary', () => {
    it('should build age-appropriate whimsical greetings for 3-5 year olds', () => {
      const result = engine.buildExpressionLibrary(
        '3-5',
        'happy',
        'greeting'
      );

      expect(result.expressions.length).toBeGreaterThan(0);
      expect(result.whimsicalElements).toContain('playful interjections');
      expect(result.ageAppropriateFeatures).toContain('simple language');
      expect(result.expressions[0].toLowerCase()).toMatch(/hello|hi|yay/);
    });

    it('should build sophisticated greetings for 11+ year olds', () => {
      const result = engine.buildExpressionLibrary(
        '11+',
        'curious',
        'greeting'
      );

      expect(result.expressions.length).toBeGreaterThan(0);
      expect(result.ageAppropriateFeatures).toContain('mature vocabulary');
      expect(result.expressions[0].toLowerCase()).toMatch(/sophisticated|intellectual|insightful/);
    });

    it('should build empathic responses for sad children', () => {
      const result = engine.buildExpressionLibrary(
        '6-8',
        'sad',
        'empathy'
      );

      expect(result.expressions.length).toBeGreaterThan(0);
      expect(result.empathicElements).toContain('emotional support');
      expect(result.expressions[0].toLowerCase()).toMatch(/sad|understand|here/);
    });

    it('should build encouragement expressions', () => {
      const result = engine.buildExpressionLibrary(
        '6-8',
        'frustrated',
        'encouragement'
      );

      expect(result.expressions.length).toBeGreaterThan(0);
      expect(result.empathicElements).toContain('affirmation');
      expect(result.expressions[0].toLowerCase()).toMatch(/proud|wonderful|effort/);
    });

    it('should build celebration expressions', () => {
      const result = engine.buildExpressionLibrary(
        '9-10',
        'excited',
        'celebration'
      );

      expect(result.expressions.length).toBeGreaterThan(0);
      expect(result.whimsicalElements.length).toBeGreaterThan(0);
      expect(result.expressions[0].toLowerCase()).toMatch(/progress|amazing|proud/);
    });
  });

  describe('maintainPersonalityConsistency', () => {
    it('should maintain consistency for new child', () => {
      const result = engine.maintainPersonalityConsistency(
        'child123',
        basePersonality,
        baseContext
      );

      expect(result.consistentPersonality).toEqual(basePersonality);
      expect(result.consistencyScore).toBeGreaterThan(0.7);
      expect(result.deviationAlerts.length).toBe(0);
    });

    it('should enforce consistency rules for existing child', () => {
      const childId = 'child123';
      
      // First interaction to establish baseline
      engine.maintainPersonalityConsistency(childId, basePersonality, baseContext);
      
      // Second interaction with dramatic personality change
      const dramaticPersonality = {
        ...basePersonality,
        whimsy: 0.1, // Dramatic reduction
        playfulness: 0.1
      };

      const result = engine.maintainPersonalityConsistency(
        childId,
        dramaticPersonality,
        baseContext
      );

      expect(result.consistentPersonality.whimsy).toBeGreaterThan(dramaticPersonality.whimsy);
      expect(result.deviationAlerts.length).toBeGreaterThan(0);
      expect(result.adjustmentRecommendations.length).toBeGreaterThan(0);
    });

    it('should allow appropriate emotional adaptations', () => {
      const childId = 'child123';
      
      // Establish baseline
      engine.maintainPersonalityConsistency(childId, basePersonality, baseContext);
      
      // Adapt for sad context
      const sadContext = { ...baseContext, currentEmotionalState: 'sad' as EmotionalState };
      const sadPersonality = {
        ...basePersonality,
        whimsy: 0.4, // Appropriate reduction for sad context
        empathy: 0.9  // Appropriate increase
      };

      const result = engine.maintainPersonalityConsistency(
        childId,
        sadPersonality,
        sadContext
      );

      expect(result.consistencyScore).toBeGreaterThan(0.6);
      expect(result.adjustmentRecommendations).toContain('Whimsy reduction for sad context is appropriate');
    });

    it('should track consistency over multiple interactions', () => {
      const childId = 'child123';
      const interactions = [
        { personality: basePersonality, context: baseContext },
        { personality: { ...basePersonality, warmth: 0.9 }, context: baseContext },
        { personality: { ...basePersonality, empathy: 0.9 }, context: baseContext }
      ];

      let finalResult;
      interactions.forEach(({ personality, context }) => {
        finalResult = engine.maintainPersonalityConsistency(childId, personality, context, []);
      });

      expect(finalResult!.consistencyScore).toBeGreaterThan(0.7);
    });
  });

  describe('buildRelationship', () => {
    it('should build relationship strength over successful interactions', () => {
      const childId = 'child123';
      const interaction = {
        personalityUsed: basePersonality,
        childResponse: "I love this story!",
        effectiveness: 0.9,
        emotionalState: 'happy' as EmotionalState,
        context: baseContext
      };

      const result = engine.buildRelationship(childId, interaction);

      expect(result.relationshipStrength).toBeGreaterThan(0.3);
      expect(result.connectionDepth).toBeGreaterThan(0.4);
      expect(result.relationshipGrowth).toBeGreaterThan(0);
    });

    it('should track preferred personality traits', () => {
      const childId = 'child123';
      const highWhimsyPersonality = { ...basePersonality, whimsy: 0.9, playfulness: 0.9 };
      
      // Multiple successful interactions with high whimsy
      for (let i = 0; i < 3; i++) {
        engine.buildRelationship(childId, {
          personalityUsed: highWhimsyPersonality,
          childResponse: "This is so fun!",
          effectiveness: 0.8,
          emotionalState: 'excited',
          context: baseContext
        });
      }

      const result = engine.buildRelationship(childId, {
        personalityUsed: highWhimsyPersonality,
        childResponse: "I love the silly parts!",
        effectiveness: 0.9,
        emotionalState: 'happy',
        context: baseContext
      });

      expect(result.personalizedElements).toContain('preferred interaction style');
      expect(result.relationshipStrength).toBeGreaterThan(0.5);
    });

    it('should track challenging scenarios', () => {
      const childId = 'child123';
      const interaction = {
        personalityUsed: basePersonality,
        childResponse: "I don't like this...",
        effectiveness: 0.2,
        emotionalState: 'frustrated' as EmotionalState,
        context: baseContext
      };

      const result = engine.buildRelationship(childId, interaction);

      expect(result.relationshipStrength).toBeLessThan(0.5);
      expect(result.connectionDepth).toBeGreaterThan(0.3);
    });

    it('should show relationship growth over time', () => {
      const childId = 'child123';
      
      // First interaction
      const result1 = engine.buildRelationship(childId, {
        personalityUsed: basePersonality,
        childResponse: "Okay...",
        effectiveness: 0.5,
        emotionalState: 'neutral',
        context: baseContext
      });

      // Second, more successful interaction
      const result2 = engine.buildRelationship(childId, {
        personalityUsed: basePersonality,
        childResponse: "That's really cool!",
        effectiveness: 0.8,
        emotionalState: 'excited',
        context: baseContext
      });

      expect(result2.relationshipGrowth).toBeGreaterThan(0);
      expect(result2.relationshipStrength).toBeGreaterThan(result1.relationshipStrength);
    });

    it('should develop deeper connections with longer interactions', () => {
      const childId = 'child123';
      
      // Simulate multiple interactions
      for (let i = 0; i < 12; i++) {
        engine.buildRelationship(childId, {
          personalityUsed: basePersonality,
          childResponse: "I really enjoy our conversations and the stories we create together!",
          effectiveness: 0.7,
          emotionalState: 'happy',
          context: baseContext
        });
      }

      const result = engine.buildRelationship(childId, {
        personalityUsed: basePersonality,
        childResponse: "You're my favorite storytelling friend!",
        effectiveness: 0.9,
        emotionalState: 'happy',
        context: baseContext
      });

      expect(result.connectionDepth).toBeGreaterThan(0.7);
      expect(result.personalizedElements).toContain('deep connection indicators');
    });
  });

  describe('balanceWhimsyWithContext', () => {
    it('should reduce whimsy for sad emotional context', () => {
      const result = engine.balanceWhimsyWithContext(
        0.8,
        'sad',
        null,
        '6-8',
        0.5
      );

      expect(result.balancedWhimsy).toBeLessThan(0.8);
      expect(result.whimsyAdjustments).toContain('reduced whimsy for sad context');
      expect(result.contextualFactors).toContain('emotional sensitivity required');
    });

    it('should increase whimsy for happy emotional context', () => {
      const result = engine.balanceWhimsyWithContext(
        0.5,
        'happy',
        null,
        '3-5',
        0.5
      );

      expect(result.balancedWhimsy).toBeGreaterThan(0.5);
      expect(result.whimsyAdjustments).toContain('increased whimsy for happy context');
      expect(result.contextualFactors).toContain('young age allows high whimsy');
    });

    it('should adjust whimsy for bedtime story context', () => {
      const storyContext = { storyType: 'bedtime' };
      const result = engine.balanceWhimsyWithContext(
        0.7,
        'calm',
        storyContext,
        '6-8',
        0.5
      );

      expect(result.balancedWhimsy).toBeLessThan(0.7);
      expect(result.contextualFactors).toContain('bedtime story requires calm approach');
    });

    it('should allow more whimsy with deeper relationships', () => {
      const result = engine.balanceWhimsyWithContext(
        0.6,
        'happy',
        null,
        '6-8',
        0.9 // Deep relationship
      );

      expect(result.balancedWhimsy).toBeGreaterThan(0.6);
      expect(result.contextualFactors).toContain('deep relationship allows personalized whimsy');
    });

    it('should provide clear balance reasoning', () => {
      const result = engine.balanceWhimsyWithContext(
        0.8,
        'anxious',
        null,
        '6-8',
        0.5
      );

      expect(result.balanceReasoning).toContain('reduced whimsy for anxious context');
      expect(result.balanceReasoning).toContain('emotional sensitivity required');
    });
  });

  describe('integratePersonalityWithStory', () => {
    it('should integrate personality with story context', () => {
      const storyContext = {
        characterName: 'Princess Luna',
        storyType: 'adventure',
        currentScene: 'castle'
      };

      const result = engine.integratePersonalityWithStory(
        "Your character is amazing!",
        storyContext
      );

      expect(result.integratedExpression).toContain('Princess Luna');
      expect(result.storyRelevance).toBeGreaterThan(0.5);
      expect(result.playfulIntegration).toContain('character name integration');
    });

    it('should maintain quality while integrating', () => {
      const storyContext = {
        characterName: 'Dragon',
        storyType: 'fantasy'
      };

      const result = engine.integratePersonalityWithStory(
        "That's a wonderful character concept!",
        storyContext,
        0.8
      );

      expect(result.qualityPreservation).toBeGreaterThanOrEqual(0.8);
      expect(result.storyRelevance).toBeGreaterThan(0.3);
    });

    it('should adjust for quality when integration is poor', () => {
      const storyContext = {
        characterName: 'VeryLongAndComplexCharacterNameThatMightCauseIssues'
      };

      const result = engine.integratePersonalityWithStory(
        "Great!",
        storyContext,
        0.9
      );

      expect(result.qualityPreservation).toBeGreaterThanOrEqual(0.9);
      expect(result.playfulIntegration).toContain('simplified integration');
    });

    it('should handle missing story context gracefully', () => {
      const result = engine.integratePersonalityWithStory(
        "That's wonderful!",
        {},
        0.8
      );

      expect(result.integratedExpression).toBe("That's wonderful!");
      expect(result.storyRelevance).toBeLessThan(0.5);
      expect(result.qualityPreservation).toBeGreaterThan(0.7);
    });
  });

  describe('generatePersonalizedExpression', () => {
    it('should generate personalized greetings for established relationships', () => {
      const childId = 'child123';
      
      // Build relationship first
      for (let i = 0; i < 15; i++) {
        engine.buildRelationship(childId, {
          personalityUsed: basePersonality,
          childResponse: "I love our stories!",
          effectiveness: 0.8,
          emotionalState: 'happy',
          context: baseContext
        });
      }

      const result = engine.generatePersonalizedExpression(
        childId,
        "Hello there!",
        baseContext,
        'greeting'
      );

      expect(result.personalizedExpression).toContain('journey together');
      expect(result.personalizationElements).toContain('relationship context added');
      expect(result.relationshipReferences).toContain('shared journey');
      expect(result.uniquenessScore).toBeGreaterThan(0.6);
    });

    it('should adapt to preferred personality traits', () => {
      const childId = 'child123';
      
      // Build relationship with high whimsy preference
      for (let i = 0; i < 8; i++) {
        engine.buildRelationship(childId, {
          personalityUsed: { ...basePersonality, whimsy: 0.9 },
          childResponse: "I love the silly parts!",
          effectiveness: 0.9,
          emotionalState: 'excited',
          context: baseContext
        });
      }

      const result = engine.generatePersonalizedExpression(
        childId,
        "Hello!",
        baseContext,
        'greeting'
      );

      expect(result.personalizedExpression).toContain('Hello-hello-hello');
      expect(result.uniquenessScore).toBeGreaterThan(0.5);
    });

    it('should provide basic personalization for new relationships', () => {
      const result = engine.generatePersonalizedExpression(
        'newChild',
        "Hello there!",
        baseContext,
        'greeting'
      );

      expect(result.personalizedExpression).toBe("Hello there!");
      expect(result.personalizationElements.length).toBe(0);
      expect(result.uniquenessScore).toBeLessThan(0.7);
    });

    it('should create unique expressions for different interaction types', () => {
      const childId = 'child123';
      
      const greetingResult = engine.generatePersonalizedExpression(
        childId,
        "Hello!",
        baseContext,
        'greeting'
      );

      const encouragementResult = engine.generatePersonalizedExpression(
        childId,
        "Great job!",
        baseContext,
        'encouragement'
      );

      expect(greetingResult.personalizedExpression).not.toBe(encouragementResult.personalizedExpression);
    });
  });

  describe('whimsical elements extraction', () => {
    it('should identify whimsical descriptors', () => {
      const expressions = ["Your giggly, sparkly, magical character is wonderful!"];
      const result = engine.buildExpressionLibrary('6-8', 'happy', 'encouragement');
      
      // Test with our own expressions
      const testResult = engine['extractWhimsicalElements'](expressions);
      expect(testResult).toContain('whimsical descriptors');
    });

    it('should identify playful interjections', () => {
      const expressions = ["Boop! Peek-a-boo! Yay for creativity!"];
      const testResult = engine['extractWhimsicalElements'](expressions);
      expect(testResult).toContain('playful interjections');
    });

    it('should identify whimsical comparisons', () => {
      const expressions = ["You're brighter than a rainbow and more wonderful than sunshine!"];
      const testResult = engine['extractWhimsicalElements'](expressions);
      expect(testResult).toContain('whimsical comparisons');
    });
  });

  describe('empathic elements extraction', () => {
    it('should identify sensory acknowledgment', () => {
      const expressions = ["I can hear your excitement and feel your joy!"];
      const testResult = engine['extractEmpathicElements'](expressions);
      expect(testResult).toContain('sensory acknowledgment');
    });

    it('should identify emotional support', () => {
      const expressions = ["I understand how you feel and I'm here to support you."];
      const testResult = engine['extractEmpathicElements'](expressions);
      expect(testResult).toContain('emotional support');
    });

    it('should identify validation', () => {
      const expressions = ["Your feelings are completely okay and totally normal."];
      const testResult = engine['extractEmpathicElements'](expressions);
      expect(testResult).toContain('validation');
    });

    it('should identify affirmation', () => {
      const expressions = ["I'm so proud of your amazing and wonderful work!"];
      const testResult = engine['extractEmpathicElements'](expressions);
      expect(testResult).toContain('affirmation');
    });
  });

  describe('age-appropriate features', () => {
    it('should identify simple language for 3-5 year olds', () => {
      const expressions = ["Hi! You're good!"];
      const testResult = engine['identifyAgeAppropriateFeatures'](expressions, '3-5');
      expect(testResult).toContain('simple language');
    });

    it('should identify creativity focus for 6-8 year olds', () => {
      const expressions = ["Your creative imagination is fantastic!"];
      const testResult = engine['identifyAgeAppropriateFeatures'](expressions, '6-8');
      expect(testResult).toContain('creativity focus');
    });

    it('should identify intellectual recognition for 9-10 year olds', () => {
      const expressions = ["You're so clever and thoughtful in your approach!"];
      const testResult = engine['identifyAgeAppropriateFeatures'](expressions, '9-10');
      expect(testResult).toContain('intellectual recognition');
    });

    it('should identify mature vocabulary for 11+ year olds', () => {
      const expressions = ["Your sophisticated and insightful perspective is remarkable!"];
      const testResult = engine['identifyAgeAppropriateFeatures'](expressions, '11+');
      expect(testResult).toContain('mature vocabulary');
    });
  });

  describe('consistency tracking', () => {
    it('should maintain core personality traits within acceptable ranges', () => {
      const childId = 'child123';
      
      // Establish baseline
      engine.maintainPersonalityConsistency(childId, basePersonality, baseContext);
      
      // Try to make extreme changes
      const extremePersonality = {
        warmth: 0.1,
        whimsy: 0.1,
        empathy: 0.1,
        youthfulness: 0.1,
        playfulness: 0.1,
        supportiveness: 0.1
      };

      const result = engine.maintainPersonalityConsistency(
        childId,
        extremePersonality,
        baseContext
      );

      // Should be pulled back toward acceptable ranges
      expect(result.consistentPersonality.warmth).toBeGreaterThan(0.5);
      expect(result.consistentPersonality.empathy).toBeGreaterThan(0.5);
      expect(result.consistentPersonality.supportiveness).toBeGreaterThan(0.5);
      expect(result.deviationAlerts.length).toBeGreaterThan(0);
    });

    it('should allow gradual personality evolution', () => {
      const childId = 'child123';
      
      // Start with baseline
      let result = engine.maintainPersonalityConsistency(childId, basePersonality, baseContext);
      
      // Make small, gradual changes
      const gradualPersonality = {
        ...basePersonality,
        whimsy: basePersonality.whimsy + 0.1,
        playfulness: basePersonality.playfulness + 0.1
      };

      result = engine.maintainPersonalityConsistency(childId, gradualPersonality, baseContext);

      expect(result.consistencyScore).toBeGreaterThan(0.7);
      expect(result.deviationAlerts.length).toBeLessThan(3);
    });
  });

  describe('relationship metrics tracking', () => {
    it('should track interaction patterns over time', () => {
      const childId = 'child123';
      const interactions = [
        { effectiveness: 0.8, emotionalState: 'happy' as EmotionalState },
        { effectiveness: 0.9, emotionalState: 'excited' as EmotionalState },
        { effectiveness: 0.7, emotionalState: 'curious' as EmotionalState },
        { effectiveness: 0.3, emotionalState: 'frustrated' as EmotionalState },
        { effectiveness: 0.8, emotionalState: 'happy' as EmotionalState }
      ];

      let finalResult;
      interactions.forEach(({ effectiveness, emotionalState }) => {
        finalResult = engine.buildRelationship(childId, {
          personalityUsed: basePersonality,
          childResponse: "Response",
          effectiveness,
          emotionalState,
          context: baseContext
        });
      });

      expect(finalResult!.relationshipStrength).toBeGreaterThan(0.4);
      expect(finalResult!.personalizedElements.length).toBeGreaterThan(0);
    });

    it('should identify successful interaction patterns', () => {
      const childId = 'child123';
      
      // Multiple successful interactions with similar personality
      const successfulPersonality = { ...basePersonality, whimsy: 0.9, playfulness: 0.9 };
      
      for (let i = 0; i < 5; i++) {
        engine.buildRelationship(childId, {
          personalityUsed: successfulPersonality,
          childResponse: "I love this!",
          effectiveness: 0.8,
          emotionalState: 'excited',
          context: baseContext
        });
      }

      const result = engine.buildRelationship(childId, {
        personalityUsed: successfulPersonality,
        childResponse: "This is the best!",
        effectiveness: 0.9,
        emotionalState: 'happy',
        context: baseContext
      });

      expect(result.personalizedElements).toContain('preferred interaction style');
      expect(result.relationshipStrength).toBeGreaterThan(0.6);
    });
  });
});