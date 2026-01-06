"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoodBasedStoryRecommendationEngine = void 0;
/**
 * Mood-based story recommendation engine with therapeutic pathways
 * Requirements: 7.3, 7.4
 */
class MoodBasedStoryRecommendationEngine {
    constructor(supabase, redis, logger) {
        this.supabase = supabase;
        this.redis = redis;
        this.logger = logger;
    }
    /**
     * Generate mood-based story recommendations
     */
    async generateMoodBasedRecommendations(context) {
        try {
            this.logger.info('Generating mood-based story recommendations', {
                currentMood: context.currentMood,
                emotionalGoal: context.emotionalGoal
            });
            const recommendations = [];
            // Generate primary recommendation based on current mood and goal
            const primaryRecommendation = await this.generatePrimaryRecommendation(context);
            recommendations.push(primaryRecommendation);
            // Generate alternative recommendations
            const alternatives = await this.generateAlternativeRecommendations(context);
            recommendations.push(...alternatives);
            // Apply user preferences and adaptations
            const adaptedRecommendations = await this.applyUserAdaptations(recommendations, context);
            // Sort by confidence and expected impact
            adaptedRecommendations.sort((a, b) => b.confidence - a.confidence);
            return adaptedRecommendations.slice(0, 5); // Return top 5 recommendations
        }
        catch (error) {
            this.logger.error('Error generating mood-based recommendations:', error);
            throw error;
        }
    }
    /**
     * Create therapeutic story pathway for emotional support
     */
    async createTherapeuticPathway(userId, targetEmotions, currentEmotionalState, therapeuticGoals) {
        try {
            this.logger.info('Creating therapeutic story pathway', {
                userId,
                targetEmotions,
                currentEmotionalState,
                therapeuticGoals
            });
            // Determine pathway type based on goals and emotions
            const pathwayName = this.determinePathwayName(targetEmotions, therapeuticGoals);
            // Generate story progression steps
            const storyProgression = await this.generateTherapeuticProgression(currentEmotionalState, targetEmotions, therapeuticGoals);
            // Define expected outcomes
            const expectedOutcomes = this.defineExpectedOutcomes(targetEmotions, therapeuticGoals);
            // Calculate estimated duration
            const duration = this.calculatePathwayDuration(storyProgression, therapeuticGoals);
            // Define adaptation triggers
            const adaptationTriggers = this.defineAdaptationTriggers(targetEmotions, therapeuticGoals);
            const pathway = {
                pathwayName,
                targetEmotions,
                storyProgression,
                expectedOutcomes,
                duration,
                adaptationTriggers
            };
            // Store pathway in database
            await this.storeTherapeuticPathway(userId, pathway);
            return pathway;
        }
        catch (error) {
            this.logger.error('Error creating therapeutic pathway:', error);
            throw error;
        }
    }
    /**
     * Start emotional journey for a user
     */
    async startEmotionalJourney(userId, pathway) {
        try {
            this.logger.info('Starting emotional journey', { userId, pathwayName: pathway.pathwayName });
            const journey = {
                journeyId: `journey_${userId}_${Date.now()}`,
                userId,
                startDate: new Date().toISOString(),
                currentStep: 0,
                pathway,
                progress: [],
                adaptations: [],
                outcomes: []
            };
            // Store journey in database
            await this.storeEmotionalJourney(journey);
            // Cache current journey for quick access
            if (this.redis) {
                await this.redis.setEx(`emotional_journey:${userId}`, 86400 * 30, // 30 days
                JSON.stringify(journey));
            }
            return journey;
        }
        catch (error) {
            this.logger.error('Error starting emotional journey:', error);
            throw error;
        }
    }
    /**
     * Progress emotional journey to next step
     */
    async progressEmotionalJourney(userId, emotionalResponse, engagementLevel, sessionFeedback) {
        try {
            this.logger.info('Progressing emotional journey', { userId, emotionalResponse, engagementLevel });
            // Get current journey
            const journey = await this.getCurrentJourney(userId);
            if (!journey) {
                throw new Error('No active emotional journey found');
            }
            // Record progress for current step
            const progress = {
                stepNumber: journey.currentStep,
                completedAt: new Date().toISOString(),
                emotionalResponse,
                engagementLevel,
                keyInsights: this.extractKeyInsights(emotionalResponse, engagementLevel, sessionFeedback),
                nextStepRecommendation: ''
            };
            journey.progress.push(progress);
            // Check if adaptations are needed
            const adaptationsNeeded = await this.checkForAdaptations(journey, progress);
            if (adaptationsNeeded) {
                await this.applyJourneyAdaptations(journey, progress);
            }
            // Move to next step
            journey.currentStep++;
            // Generate next recommendation
            const nextRecommendation = await this.generateNextStepRecommendation(journey);
            progress.nextStepRecommendation = nextRecommendation.reasoning;
            // Update journey in storage
            await this.updateEmotionalJourney(journey);
            return {
                journey,
                nextRecommendation,
                adaptationsNeeded
            };
        }
        catch (error) {
            this.logger.error('Error progressing emotional journey:', error);
            throw error;
        }
    }
    /**
     * Generate primary recommendation based on mood and goal
     */
    async generatePrimaryRecommendation(context) {
        const { currentMood, emotionalGoal, sessionContext, userPreferences } = context;
        // Define mood-based story mappings
        const moodStoryMappings = {
            'sad': {
                'mood_improvement': {
                    storyType: 'Mental Health',
                    theme: 'overcoming_sadness',
                    tone: 'uplifting',
                    expectedImpact: 'Gradual mood elevation through hopeful narrative'
                },
                'emotional_processing': {
                    storyType: 'New Chapter Sequel',
                    theme: 'processing_loss',
                    tone: 'gentle',
                    expectedImpact: 'Safe space to explore and validate sad feelings'
                }
            },
            'scared': {
                'mood_improvement': {
                    storyType: 'Medical Bravery',
                    theme: 'courage_building',
                    tone: 'calming',
                    expectedImpact: 'Building confidence and reducing anxiety'
                },
                'stress_relief': {
                    storyType: 'Bedtime',
                    theme: 'safety_comfort',
                    tone: 'calming',
                    expectedImpact: 'Immediate anxiety reduction and comfort'
                }
            },
            'angry': {
                'emotional_processing': {
                    storyType: 'Mental Health',
                    theme: 'anger_management',
                    tone: 'gentle',
                    expectedImpact: 'Learning healthy ways to express and manage anger'
                },
                'stress_relief': {
                    storyType: 'Bedtime',
                    theme: 'peaceful_resolution',
                    tone: 'calming',
                    expectedImpact: 'Calming angry feelings through peaceful narratives'
                }
            },
            'happy': {
                'mood_maintenance': {
                    storyType: 'Adventure',
                    theme: 'joyful_exploration',
                    tone: 'energetic',
                    expectedImpact: 'Maintaining and amplifying positive emotions'
                },
                'emotional_processing': {
                    storyType: 'Milestones',
                    theme: 'celebrating_growth',
                    tone: 'energetic',
                    expectedImpact: 'Reinforcing positive self-image and achievements'
                }
            },
            'neutral': {
                'mood_improvement': {
                    storyType: 'Educational',
                    theme: 'discovery_wonder',
                    tone: 'energetic',
                    expectedImpact: 'Sparking curiosity and positive engagement'
                },
                'emotional_processing': {
                    storyType: 'Adventure',
                    theme: 'self_discovery',
                    tone: 'neutral',
                    expectedImpact: 'Exploring emotions through character development'
                }
            }
        };
        const moodMappingsForMood = moodStoryMappings[currentMood] || {};
        const defaultMapping = {
            storyType: 'Educational',
            theme: 'discovery_wonder',
            tone: 'energetic',
            expectedImpact: 'Sparking curiosity and positive engagement'
        };
        const mapping = moodMappingsForMood[emotionalGoal] ||
            moodMappingsForMood['mood_improvement'] ||
            moodStoryMappings['neutral']['mood_improvement'] ||
            defaultMapping;
        // Generate adaptations based on session context
        const adaptations = this.generateSessionAdaptations(sessionContext, userPreferences);
        // Calculate confidence based on mood history and preferences
        const confidence = this.calculateRecommendationConfidence(context, mapping);
        return {
            storyType: mapping.storyType,
            theme: mapping.theme,
            tone: mapping.tone,
            reasoning: `Based on current ${currentMood} mood and goal of ${emotionalGoal.replace('_', ' ')}`,
            expectedEmotionalImpact: mapping.expectedImpact,
            confidence,
            adaptations
        };
    }
    /**
     * Generate alternative recommendations
     */
    async generateAlternativeRecommendations(context) {
        const alternatives = [];
        // Generate recommendation for different emotional goal
        const alternativeGoals = ['mood_improvement', 'emotional_processing', 'stress_relief', 'mood_maintenance']
            .filter(goal => goal !== context.emotionalGoal);
        for (const goal of alternativeGoals.slice(0, 2)) {
            const altContext = { ...context, emotionalGoal: goal };
            const altRecommendation = await this.generatePrimaryRecommendation(altContext);
            altRecommendation.confidence *= 0.8; // Lower confidence for alternatives
            alternatives.push(altRecommendation);
        }
        // Generate recommendation based on recent mood trends
        if (context.recentMoodHistory.length > 0) {
            const trendRecommendation = this.generateTrendBasedRecommendation(context);
            if (trendRecommendation) {
                alternatives.push(trendRecommendation);
            }
        }
        return alternatives;
    }
    /**
     * Apply user-specific adaptations to recommendations
     */
    async applyUserAdaptations(recommendations, context) {
        return recommendations.map(rec => {
            const adaptedRec = { ...rec };
            // Adjust based on user preferences
            if (context.userPreferences.favoriteStoryTypes.includes(rec.storyType)) {
                adaptedRec.confidence *= 1.2;
            }
            if (context.userPreferences.avoidedThemes.some(theme => rec.theme.includes(theme))) {
                adaptedRec.confidence *= 0.7;
            }
            // Adjust based on tone preferences
            const toneResponse = context.userPreferences.responseToTones[rec.tone];
            if (toneResponse === 'positive') {
                adaptedRec.confidence *= 1.1;
            }
            else if (toneResponse === 'negative') {
                adaptedRec.confidence *= 0.8;
            }
            // Add session-specific adaptations
            const sessionAdaptations = this.generateSessionAdaptations(context.sessionContext, context.userPreferences);
            adaptedRec.adaptations.push(...sessionAdaptations);
            return adaptedRec;
        });
    }
    /**
     * Generate session-specific adaptations
     */
    generateSessionAdaptations(sessionContext, userPreferences) {
        const adaptations = [];
        // Pacing adaptations
        if (sessionContext.energyLevel === 'low') {
            adaptations.push({
                aspect: 'pacing',
                modification: 'Slower, more gentle pacing with longer pauses',
                reason: 'Low energy level detected'
            });
        }
        else if (sessionContext.energyLevel === 'high') {
            adaptations.push({
                aspect: 'pacing',
                modification: 'More dynamic pacing with engaging action',
                reason: 'High energy level detected'
            });
        }
        // Complexity adaptations
        if (sessionContext.attentionSpan < 5) {
            adaptations.push({
                aspect: 'complexity',
                modification: 'Simplified plot with fewer characters',
                reason: 'Short attention span requires simpler narratives'
            });
        }
        // Time-of-day adaptations
        if (sessionContext.timeOfDay === 'evening' || sessionContext.timeOfDay === 'night') {
            adaptations.push({
                aspect: 'conflict_level',
                modification: 'Lower conflict intensity for calming effect',
                reason: 'Evening/night sessions benefit from calmer content'
            });
        }
        // Session length adaptations
        if (sessionContext.sessionLength === 'short') {
            adaptations.push({
                aspect: 'resolution_style',
                modification: 'Quick, satisfying resolution',
                reason: 'Short session requires efficient story arc'
            });
        }
        return adaptations;
    }
    /**
     * Calculate recommendation confidence
     */
    calculateRecommendationConfidence(context, mapping) {
        let confidence = 0.7; // Base confidence
        // Boost confidence if mood is consistent
        const recentMoods = context.recentMoodHistory.slice(-3);
        const consistentMood = recentMoods.every(entry => entry.mood === context.currentMood);
        if (consistentMood) {
            confidence += 0.1;
        }
        // Boost confidence if user has positive history with story type
        if (context.userPreferences.favoriteStoryTypes.includes(mapping.storyType)) {
            confidence += 0.15;
        }
        // Reduce confidence if user has negative history with tone
        const toneResponse = context.userPreferences.responseToTones[mapping.tone];
        if (toneResponse === 'negative') {
            confidence -= 0.2;
        }
        else if (toneResponse === 'positive') {
            confidence += 0.1;
        }
        return Math.min(0.95, Math.max(0.3, confidence));
    }
    /**
     * Generate trend-based recommendation
     */
    generateTrendBasedRecommendation(context) {
        const recentMoods = context.recentMoodHistory.slice(-5);
        if (recentMoods.length < 3)
            return null;
        // Analyze mood trend
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        const values = recentMoods.map(entry => moodValues[entry.mood]);
        const trend = values[values.length - 1] - values[0];
        if (trend > 1) {
            // Improving trend - maintain momentum
            return {
                storyType: 'Milestones',
                theme: 'celebrating_progress',
                tone: 'energetic',
                reasoning: 'Mood trend shows improvement - reinforcing positive trajectory',
                expectedEmotionalImpact: 'Maintaining and building on recent emotional improvements',
                confidence: 0.75,
                adaptations: []
            };
        }
        else if (trend < -1) {
            // Declining trend - provide support
            return {
                storyType: 'Mental Health',
                theme: 'resilience_building',
                tone: 'uplifting',
                reasoning: 'Mood trend shows decline - providing supportive content',
                expectedEmotionalImpact: 'Halting negative trend and building emotional resilience',
                confidence: 0.8,
                adaptations: []
            };
        }
        return null;
    }
    // Additional helper methods for therapeutic pathways
    determinePathwayName(targetEmotions, therapeuticGoals) {
        if (therapeuticGoals.includes('anxiety_reduction')) {
            return 'Courage and Calm Pathway';
        }
        else if (therapeuticGoals.includes('mood_improvement')) {
            return 'Hope and Healing Pathway';
        }
        else if (therapeuticGoals.includes('emotional_regulation')) {
            return 'Balance and Understanding Pathway';
        }
        else {
            return 'Growth and Discovery Pathway';
        }
    }
    async generateTherapeuticProgression(currentState, targetEmotions, goals) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    defineExpectedOutcomes(targetEmotions, goals) {
        return [
            'Improved emotional regulation',
            'Increased resilience',
            'Better coping strategies',
            'Enhanced self-awareness'
        ];
    }
    calculatePathwayDuration(steps, goals) {
        return Math.max(5, steps.length); // Minimum 5 sessions
    }
    defineAdaptationTriggers(targetEmotions, goals) {
        return [
            {
                condition: 'No improvement after 3 sessions',
                adaptation: 'Adjust story complexity and pacing',
                reasoning: 'May need simpler or more engaging content'
            },
            {
                condition: 'Negative emotional response',
                adaptation: 'Switch to more supportive themes',
                reasoning: 'Current approach may be too challenging'
            }
        ];
    }
    async storeTherapeuticPathway(userId, pathway) {
        // Implementation for storing pathway in database
    }
    async storeEmotionalJourney(journey) {
        // Implementation for storing journey in database
    }
    async getCurrentJourney(userId) {
        // Implementation for retrieving current journey
        return null;
    }
    extractKeyInsights(emotionalResponse, engagementLevel, feedback) {
        const insights = [];
        if (engagementLevel === 'high') {
            insights.push('Strong engagement with therapeutic content');
        }
        if (emotionalResponse === 'happy') {
            insights.push('Positive emotional response to intervention');
        }
        return insights;
    }
    async checkForAdaptations(journey, progress) {
        // Check if adaptations are needed based on progress
        return false;
    }
    async applyJourneyAdaptations(journey, progress) {
        // Apply necessary adaptations to the journey
    }
    async generateNextStepRecommendation(journey) {
        // Generate recommendation for next step in journey
        return {
            storyType: 'Educational',
            theme: 'growth',
            tone: 'neutral',
            reasoning: 'Next step in therapeutic journey',
            expectedEmotionalImpact: 'Continued progress',
            confidence: 0.8,
            adaptations: []
        };
    }
    async updateEmotionalJourney(journey) {
        // Update journey in database and cache
    }
}
exports.MoodBasedStoryRecommendationEngine = MoodBasedStoryRecommendationEngine;
//# sourceMappingURL=MoodBasedStoryRecommendationEngine.js.map