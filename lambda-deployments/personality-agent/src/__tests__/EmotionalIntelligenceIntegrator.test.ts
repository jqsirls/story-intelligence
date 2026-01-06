import { EmotionalIntelligenceIntegrator } from '../intelligence/EmotionalIntelligenceIntegrator';
import {
    PersonalityContext,
    PersonalityTraits,
    EmotionalState,
    AgeGroup,
    InteractionMemory
} from '../types';

describe('EmotionalIntelligenceIntegrator', () => {
    let integrator: EmotionalIntelligenceIntegrator;
    let basePersonality: PersonalityTraits;
    let baseContext: PersonalityContext;

    beforeEach(() => {
        integrator = new EmotionalIntelligenceIntegrator();
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

    describe('detectVoiceEmotion', () => {
        it('should detect happy emotion from positive voice input', () => {
            const result = integrator.detectVoiceEmotion(
                "I'm so excited about this story! It's going to be amazing!",
                undefined,
                'child123'
            );

            expect(result.emotionAnalysis.detectedEmotion).toBe('excited');
            expect(result.emotionAnalysis.confidence).toBeGreaterThan(0.5);
            expect(result.confidenceFactors).toContain('excitement markers');
            expect(result.detectionQuality).toBeGreaterThan(0.5);
        });

        it('should detect sad emotion from negative voice input', () => {
            const result = integrator.detectVoiceEmotion(
                "I feel sad today and I don't want to do anything",
                undefined,
                'child123'
            );

            expect(result.emotionAnalysis.detectedEmotion).toBe('sad');
            expect(result.emotionAnalysis.confidence).toBeGreaterThan(0.3);
            expect(result.detectionQuality).toBeGreaterThan(0.3);
        });

        it('should detect anxiety from hesitant voice input', () => {
            const result = integrator.detectVoiceEmotion(
                "Um, I'm not sure... maybe we could... I guess...",
                undefined,
                'child123'
            );

            expect(['anxious', 'shy']).toContain(result.emotionAnalysis.detectedEmotion);
            expect(result.confidenceFactors).toContain('hesitation patterns');
        });

        it('should improve confidence with historical consistency', () => {
            const childId = 'child123';

            // First detection
            integrator.detectVoiceEmotion("I'm happy!", undefined, childId);
            integrator.detectVoiceEmotion("This is great!", undefined, childId);

            // Third detection should have higher confidence due to consistency
            const result = integrator.detectVoiceEmotion("I love this!", undefined, childId);

            expect(result.historicalComparison.hasHistory).toBe(true);
            expect(result.detectionQuality).toBeGreaterThan(0.5);
        });
    });

    describe('provideEmpathicValidation', () => {
        it('should provide appropriate validation for sad children', () => {
            const result = integrator.provideEmpathicValidation(
                'sad',
                { ...baseContext, currentEmotionalState: 'sad' },
                "I'm feeling really sad today",
                'child123'
            );

            expect(result.validationResponse).toContain('sad');
            expect(result.empathicElements).toContain('feeling reflection');
            expect(result.emotionalConnection).toBeGreaterThan(0.4);
            expect(result.validationEffectiveness).toBeGreaterThan(0.5);
        });

        it('should provide enthusiastic validation for excited children', () => {
            const result = integrator.provideEmpathicValidation(
                'excited',
                { ...baseContext, currentEmotionalState: 'excited' },
                "I'm so excited about our story!",
                'child123'
            );

            expect(result.validationResponse.toLowerCase()).toMatch(/excited|excitement/);
            expect(result.empathicElements.length).toBeGreaterThan(0);
            expect(result.emotionalConnection).toBeGreaterThan(0.5);
        });

        it('should adapt validation language for different age groups', () => {
            const youngContext = { ...baseContext, childAge: 4, ageGroup: '3-5' as AgeGroup };
            const result = integrator.provideEmpathicValidation(
                'happy',
                youngContext,
                "I'm happy!",
                'child123'
            );

            expect(result.validationResponse).toBeDefined();
            expect(result.validationEffectiveness).toBeGreaterThan(0.4);
        });
    });

    describe('adaptToMood', () => {
        it('should increase empathy for sad mood', () => {
            const result = integrator.adaptToMood(
                'sad',
                basePersonality,
                { ...baseContext, currentEmotionalState: 'sad' },
                0.3
            );

            expect(result.adaptedPersonality.empathy).toBeGreaterThan(basePersonality.empathy);
            expect(result.adaptedPersonality.warmth).toBeGreaterThan(basePersonality.warmth);
            expect(result.moodMatchingStrategy).toBe('gentle_comfort');
            expect(result.adaptationReasons).toContain('increased empathy for sad emotion');
        });

        it('should increase playfulness for happy mood', () => {
            const result = integrator.adaptToMood(
                'happy',
                basePersonality,
                { ...baseContext, currentEmotionalState: 'happy' },
                0.8
            );

            expect(result.adaptedPersonality.playfulness).toBeGreaterThan(basePersonality.playfulness);
            expect(result.moodMatchingStrategy).toBe('amplify_joy');
            expect(result.energyAdjustment).toBeGreaterThan(0.8);
        });

        it('should reduce energy for anxious mood', () => {
            const result = integrator.adaptToMood(
                'anxious',
                basePersonality,
                { ...baseContext, currentEmotionalState: 'anxious' },
                0.7
            );

            expect(result.adaptedPersonality.empathy).toBeGreaterThan(basePersonality.empathy);
            expect(result.moodMatchingStrategy).toBe('calm_reassurance');
            expect(result.energyAdjustment).toBeLessThan(0.7);
        });
    });

    describe('createWhimsicalTherapy', () => {
        it('should create comforting whimsical therapy', () => {
            const result = integrator.createWhimsicalTherapy(
                'comfort',
                baseContext,
                0.7
            );

            expect(result.therapeuticResponse).toContain('caring');
            expect(result.whimsicalElements).toContain('comforting imagery');
            expect(result.therapeuticValue).toBeGreaterThan(0.5);
            expect(result.playfulnessBalance).toBeGreaterThan(0.3);
        });

        it('should create encouraging whimsical therapy', () => {
            const result = integrator.createWhimsicalTherapy(
                'encouragement',
                baseContext,
                0.8
            );

            expect(result.therapeuticResponse.toLowerCase()).toMatch(/brave|superhero/);
            expect(result.whimsicalElements).toContain('empowering comparisons');
            expect(result.therapeuticValue).toBeGreaterThan(0.5);
        });

        it('should create joyful whimsical therapy', () => {
            const result = integrator.createWhimsicalTherapy(
                'joy',
                baseContext,
                0.9
            );

            expect(result.therapeuticResponse.toLowerCase()).toMatch(/sparkling|magical|glitter/);
            expect(result.whimsicalElements).toContain('magical metaphors');
            expect(result.therapeuticValue).toBeGreaterThan(0.5);
        });

        it('should balance whimsy with therapeutic needs', () => {
            const comfortResult = integrator.createWhimsicalTherapy('comfort', baseContext, 0.3);
            const joyResult = integrator.createWhimsicalTherapy('joy', baseContext, 0.9);

            expect(comfortResult.playfulnessBalance).toBeLessThan(joyResult.playfulnessBalance);
        });
    });

    describe('determineTherapeuticTiming', () => {
        it('should recommend gentle approach for distressed children', () => {
            const result = integrator.determineTherapeuticTiming({
                currentEmotion: 'sad',
                emotionIntensity: 0.8,
                situationContext: 'greeting',
                childAge: 6
            });

            expect(result.timing.situationType).toBe('distress');
            expect(result.timing.recommendedApproach).toBe('gentle');
            expect(result.timing.intensityLevel).toBeLessThan(0.5);
            expect(result.approachRecommendation).toContain('gentle');
        });

        it('should recommend playful approach for excited children', () => {
            const result = integrator.determineTherapeuticTiming({
                currentEmotion: 'excited',
                emotionIntensity: 0.9,
                situationContext: 'story_building',
                childAge: 7
            });

            expect(result.timing.situationType).toBe('excitement');
            expect(result.timing.recommendedApproach).toBe('playful');
            expect(result.timing.intensityLevel).toBeGreaterThan(0.5);
            expect(result.approachRecommendation).toContain('enthusiasm');
        });

        it('should adjust timing for younger children', () => {
            const youngResult = integrator.determineTherapeuticTiming({
                currentEmotion: 'happy',
                emotionIntensity: 0.8,
                situationContext: 'character_creation',
                childAge: 4
            });

            const olderResult = integrator.determineTherapeuticTiming({
                currentEmotion: 'happy',
                emotionIntensity: 0.8,
                situationContext: 'character_creation',
                childAge: 10
            });

            expect(youngResult.timing.durationRecommendation).toBe('brief');
            expect(olderResult.timing.durationRecommendation).toBe('moderate');
        });
    });

    describe('updatePersonalityMemory', () => {
        it('should learn from effective interactions', () => {
            const interaction = {
                emotion: 'happy' as EmotionalState,
                personalityUsed: basePersonality,
                response: "That's wonderful! I'm so excited for you!",
                childReaction: "Yay! Let's keep going!",
                effectiveness: 0.9,
                context: baseContext
            };

            const result = integrator.updatePersonalityMemory('child123', interaction);

            expect(result.memoryUpdate.effectivePatterns.length).toBe(1);
            expect(result.learningInsights.length).toBeGreaterThan(0);
            expect(result.learningInsights[0]).toContain('High effectiveness');
            expect(result.confidenceImprovement).toBeGreaterThan(0);
        });

        it('should track challenging scenarios', () => {
            const interaction = {
                emotion: 'frustrated' as EmotionalState,
                personalityUsed: basePersonality,
                response: "Let's try something fun!",
                childReaction: "I don't want to...",
                effectiveness: 0.2,
                context: baseContext
            };

            const result = integrator.updatePersonalityMemory('child123', interaction);

            expect(result.memoryUpdate.challengingScenarios.length).toBe(1);
            expect(result.memoryUpdate.challengingScenarios[0].emotion).toBe('frustrated');
        });

        it('should optimize personality traits based on effectiveness', () => {
            // Add multiple interactions to build pattern
            const interactions = [
                {
                    emotion: 'sad' as EmotionalState,
                    personalityUsed: { ...basePersonality, empathy: 0.9 },
                    response: "I understand how you feel",
                    childReaction: "Thank you",
                    effectiveness: 0.8,
                    context: baseContext
                },
                {
                    emotion: 'sad' as EmotionalState,
                    personalityUsed: { ...basePersonality, empathy: 0.9 },
                    response: "I'm here with you",
                    childReaction: "That helps",
                    effectiveness: 0.9,
                    context: baseContext
                }
            ];

            let result;
            interactions.forEach(interaction => {
                result = integrator.updatePersonalityMemory('child123', interaction);
            });

            expect(result!.personalityAdjustments.empathy).toBeGreaterThanOrEqual(basePersonality.empathy);
        });
    });

    describe('generateIntegratedEmotionalResponse', () => {
        it('should integrate all emotional intelligence components', () => {
            const result = integrator.generateIntegratedEmotionalResponse(
                "I'm feeling a bit sad today but I want to make a story",
                { ...baseContext, currentEmotionalState: 'sad' },
                basePersonality,
                'child123'
            );

            expect(result.integratedResponse).toBeDefined();
            expect(result.emotionalAnalysis.detectedEmotion).toBe('sad');
            expect(result.empathicValidation).toContain('sad');
            expect(result.moodAdaptedPersonality.empathy).toBeGreaterThan(basePersonality.empathy);
            expect(result.therapeuticTiming.recommendedApproach).toBe('gentle');
            expect(result.responseConfidence).toBeGreaterThan(0.3);
        });

        it('should handle excited children appropriately', () => {
            const result = integrator.generateIntegratedEmotionalResponse(
                "This is so exciting! I can't wait to create an amazing character!",
                { ...baseContext, currentEmotionalState: 'excited' },
                basePersonality,
                'child123'
            );

            expect(result.emotionalAnalysis.detectedEmotion).toBe('excited');
            expect(result.moodAdaptedPersonality.playfulness).toBeGreaterThan(basePersonality.playfulness);
            expect(result.therapeuticTiming.recommendedApproach).toBe('playful');
            expect(result.responseConfidence).toBeGreaterThan(0.5);
        });

        it('should adapt response for different age groups', () => {
            const youngContext = { ...baseContext, childAge: 4, ageGroup: '3-5' as AgeGroup };
            const result = integrator.generateIntegratedEmotionalResponse(
                "I'm happy!",
                youngContext,
                basePersonality,
                'child123'
            );

            expect(result.integratedResponse).toBeDefined();
            expect(result.responseConfidence).toBeGreaterThan(0.4);
        });

        it('should maintain consistency across multiple interactions', () => {
            const childId = 'child123';

            // First interaction
            const result1 = integrator.generateIntegratedEmotionalResponse(
                "I love stories!",
                baseContext,
                basePersonality,
                childId
            );

            // Second interaction should benefit from memory
            const result2 = integrator.generateIntegratedEmotionalResponse(
                "Tell me more about characters!",
                baseContext,
                basePersonality,
                childId
            );

            expect(result2.responseConfidence).toBeGreaterThanOrEqual(result1.responseConfidence);
        });
    });

    describe('voice pattern analysis', () => {
        it('should analyze word choice indicators correctly', () => {
            const result = integrator.detectVoiceEmotion(
                "I'm so happy and excited! This is amazing and awesome!",
                undefined,
                'child123'
            );

            expect(result.emotionAnalysis.wordChoiceIndicators.positiveWords).toBeGreaterThan(2);
            expect(result.emotionAnalysis.wordChoiceIndicators.excitementWords).toBeGreaterThan(1);
        });

        it('should analyze tone indicators from text', () => {
            const result = integrator.detectVoiceEmotion(
                "WOW! This is AMAZING! I can't believe it!",
                undefined,
                'child123'
            );

            expect(result.emotionAnalysis.toneIndicators.volume).toBe('loud');
            expect(result.emotionAnalysis.toneIndicators.energy).toBe('high');
        });

        it('should detect hesitation patterns', () => {
            const result = integrator.detectVoiceEmotion(
                "Um, I think maybe we could, uh, I guess try something?",
                undefined,
                'child123'
            );

            expect(result.emotionAnalysis.wordChoiceIndicators.hesitationWords).toBeGreaterThan(2);
            expect(['anxious', 'shy']).toContain(result.emotionAnalysis.detectedEmotion);
        });
    });

    describe('therapeutic timing system', () => {
        it('should know when to be gentle vs playful', () => {
            const distressedTiming = integrator.determineTherapeuticTiming({
                currentEmotion: 'anxious',
                emotionIntensity: 0.8,
                situationContext: 'greeting',
                childAge: 6
            });

            const excitedTiming = integrator.determineTherapeuticTiming({
                currentEmotion: 'excited',
                emotionIntensity: 0.8,
                situationContext: 'story_building',
                childAge: 6
            });

            expect(distressedTiming.timing.recommendedApproach).toBe('gentle');
            expect(excitedTiming.timing.recommendedApproach).toBe('playful');
        });

        it('should consider interaction history for timing', () => {
            const history: InteractionMemory[] = [
                {
                    timestamp: new Date(),
                    childResponse: "I'm sad",
                    agentResponse: "I understand",
                    emotionalState: 'sad',
                    effectivenessScore: 0.8,
                    personalityTraitsUsed: basePersonality
                }
            ];

            const result = integrator.determineTherapeuticTiming({
                currentEmotion: 'neutral',
                emotionIntensity: 0.5,
                situationContext: 'character_creation',
                childAge: 7
            }, history);

            expect(result.contextualFactors).toContain('recent emotional vulnerability');
        });
    });

    describe('mood adaptation engine', () => {
        it('should match child energy appropriately', () => {
            const highEnergyResult = integrator.adaptToMood(
                'excited',
                basePersonality,
                baseContext,
                0.9
            );

            const lowEnergyResult = integrator.adaptToMood(
                'sad',
                basePersonality,
                baseContext,
                0.2
            );

            expect(highEnergyResult.energyAdjustment).toBeGreaterThan(lowEnergyResult.energyAdjustment);
        });

        it('should provide appropriate mood matching strategies', () => {
            const strategies = ['happy', 'sad', 'anxious', 'excited'].map(emotion => {
                const result = integrator.adaptToMood(
                    emotion as EmotionalState,
                    basePersonality,
                    baseContext,
                    0.5
                );
                return result.moodMatchingStrategy;
            });

            expect(strategies).toContain('amplify_joy');
            expect(strategies).toContain('gentle_comfort');
            expect(strategies).toContain('calm_reassurance');
            expect(strategies).toContain('match_enthusiasm');
        });
    });

    describe('personality memory system', () => {
        it('should remember what works for each child', () => {
            const childId = 'child123';

            // Add successful interaction
            integrator.updatePersonalityMemory(childId, {
                emotion: 'happy',
                personalityUsed: { ...basePersonality, playfulness: 0.9 },
                response: "That's fantastic!",
                childReaction: "I love it!",
                effectiveness: 0.9,
                context: baseContext
            });

            // Add another successful interaction with similar traits
            const result = integrator.updatePersonalityMemory(childId, {
                emotion: 'excited',
                personalityUsed: { ...basePersonality, playfulness: 0.8 },
                response: "How exciting!",
                childReaction: "Yes!",
                effectiveness: 0.8,
                context: baseContext
            });

            expect(result.memoryUpdate.effectivePatterns.length).toBe(2);
            expect(result.personalityAdjustments.playfulness).toBeGreaterThanOrEqual(basePersonality.playfulness);
        });

        it('should improve confidence over time', () => {
            const childId = 'child123';
            let confidenceImprovement = 0;

            // Add multiple successful interactions
            for (let i = 0; i < 3; i++) {
                const result = integrator.updatePersonalityMemory(childId, {
                    emotion: 'happy',
                    personalityUsed: basePersonality,
                    response: "Great job!",
                    childReaction: "Thank you!",
                    effectiveness: 0.8,
                    context: baseContext
                });
                confidenceImprovement += result.confidenceImprovement;
            }

            expect(confidenceImprovement).toBeGreaterThan(0);
        });
    });
});