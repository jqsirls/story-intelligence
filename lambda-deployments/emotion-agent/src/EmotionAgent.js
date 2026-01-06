"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmotionAgent = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const redis_1 = require("redis");
const DailyCheckinService_1 = require("./services/DailyCheckinService");
const EmotionDetectionService_1 = require("./services/EmotionDetectionService");
const PatternAnalysisService_1 = require("./services/PatternAnalysisService");
const VoicePatternAnalyzer_1 = require("./services/VoicePatternAnalyzer");
const ResponseLatencyAnalyzer_1 = require("./services/ResponseLatencyAnalyzer");
const StoryChoicePatternAnalyzer_1 = require("./services/StoryChoicePatternAnalyzer");
const LongitudinalTrendTracker_1 = require("./services/LongitudinalTrendTracker");
const EarlyInterventionDetector_1 = require("./services/EarlyInterventionDetector");
const MoodBasedStoryRecommendationEngine_1 = require("./services/MoodBasedStoryRecommendationEngine");
const CrisisEscalationProtocol_1 = require("./services/CrisisEscalationProtocol");
class EmotionAgent {
    constructor(config, logger) {
        this.logger = logger;
        // Initialize Supabase client
        this.supabase = (0, supabase_js_1.createClient)(config.supabaseUrl, config.supabaseKey);
        // Initialize Redis client if URL provided (optional for Lambda)
        if (config.redisUrl && config.redisUrl !== 'redis://localhost:6379') {
            this.redis = (0, redis_1.createClient)({ url: config.redisUrl });
            this.redis.connect().catch(err => {
                this.logger.error('Failed to connect to Redis:', err);
                // Don't crash if Redis fails - it's optional for caching
            });
        }
        else {
            this.logger.info('Redis not configured or using localhost - running without cache');
        }
        // Initialize services
        this.dailyCheckinService = new DailyCheckinService_1.DailyCheckinService(this.supabase, this.redis, this.logger);
        this.emotionDetectionService = new EmotionDetectionService_1.EmotionDetectionService(this.supabase, this.redis, this.logger);
        this.patternAnalysisService = new PatternAnalysisService_1.PatternAnalysisService(this.supabase, this.redis, this.logger);
        this.voicePatternAnalyzer = new VoicePatternAnalyzer_1.VoicePatternAnalyzer(this.logger);
        this.responseLatencyAnalyzer = new ResponseLatencyAnalyzer_1.ResponseLatencyAnalyzer(this.supabase, this.redis, this.logger);
        this.storyChoicePatternAnalyzer = new StoryChoicePatternAnalyzer_1.StoryChoicePatternAnalyzer(this.supabase, this.redis, this.logger);
        this.longitudinalTrendTracker = new LongitudinalTrendTracker_1.LongitudinalTrendTracker(this.supabase, this.redis, this.logger);
        this.earlyInterventionDetector = new EarlyInterventionDetector_1.EarlyInterventionDetector(this.supabase, this.redis, this.logger);
        this.moodBasedRecommendationEngine = new MoodBasedStoryRecommendationEngine_1.MoodBasedStoryRecommendationEngine(this.supabase, this.redis, this.logger);
        this.crisisEscalationProtocol = new CrisisEscalationProtocol_1.CrisisEscalationProtocol(this.supabase, this.redis, this.logger);
    }
    /**
     * Perform daily emotional check-in for a user
     * Requirements: 7.1, 7.2, 4.4
     */
    async performDailyCheckin(request) {
        this.logger.info('Performing daily check-in', {
            userId: request.userId,
            libraryId: request.libraryId
        });
        try {
            return await this.dailyCheckinService.performCheckin(request);
        }
        catch (error) {
            this.logger.error('Failed to perform daily check-in:', error);
            throw error;
        }
    }
    /**
     * Detect laughter from audio data during story sessions
     * Requirements: 7.2
     */
    async detectLaughter(request) {
        this.logger.info('Detecting laughter from audio', {
            userId: request.userId,
            sessionId: request.sessionId
        });
        try {
            return await this.emotionDetectionService.detectLaughter(request);
        }
        catch (error) {
            this.logger.error('Failed to detect laughter:', error);
            throw error;
        }
    }
    /**
     * Update user's emotional state when positive signals are detected
     * Requirements: 7.2, 7.4
     */
    async updateEmotionalState(request) {
        this.logger.info('Updating emotional state', {
            userId: request.userId,
            mood: request.mood,
            confidence: request.confidence
        });
        try {
            return await this.emotionDetectionService.updateEmotionalState(request);
        }
        catch (error) {
            this.logger.error('Failed to update emotional state:', error);
            throw error;
        }
    }
    /**
     * Analyze emotion patterns over time for a user
     * Requirements: 7.3, 7.4
     */
    async analyzeEmotionPatterns(request) {
        this.logger.info('Analyzing emotion patterns', {
            userId: request.userId,
            timeRange: request.timeRange
        });
        try {
            return await this.patternAnalysisService.analyzePatterns(request);
        }
        catch (error) {
            this.logger.error('Failed to analyze emotion patterns:', error);
            throw error;
        }
    }
    /**
     * Generate parental report for child's emotional trends
     * Requirements: 7.3, 7.4
     */
    async generateParentalReport(userId, libraryId, timeRange) {
        this.logger.info('Generating parental report', {
            userId,
            libraryId,
            timeRange
        });
        try {
            return await this.patternAnalysisService.generateParentalReport(userId, libraryId, timeRange);
        }
        catch (error) {
            this.logger.error('Failed to generate parental report:', error);
            throw error;
        }
    }
    /**
     * Analyze sentiment from story interaction transcripts
     * Requirements: 7.3, 7.4
     */
    async analyzeSentiment(transcript) {
        this.logger.info('Analyzing sentiment from transcript');
        try {
            return await this.emotionDetectionService.analyzeSentiment(transcript);
        }
        catch (error) {
            this.logger.error('Failed to analyze sentiment:', error);
            throw error;
        }
    }
    /**
     * Get story recommendation influence based on current emotional state
     * Requirements: 7.4
     */
    async getStoryRecommendationInfluence(userId, libraryId) {
        this.logger.info('Getting story recommendation influence', { userId, libraryId });
        try {
            return await this.patternAnalysisService.getStoryRecommendationInfluence(userId, libraryId);
        }
        catch (error) {
            this.logger.error('Failed to get story recommendation influence:', error);
            throw error;
        }
    }
    /**
     * Get recent emotions for a user (for internal use by other agents)
     */
    async getRecentEmotions(userId, libraryId, limit = 10) {
        this.logger.info('Getting recent emotions', { userId, libraryId, limit });
        try {
            let query = this.supabase
                .from('emotions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (libraryId) {
                query = query.eq('library_id', libraryId);
            }
            const { data, error } = await query;
            if (error) {
                throw error;
            }
            return data || [];
        }
        catch (error) {
            this.logger.error('Failed to get recent emotions:', error);
            throw error;
        }
    }
    /**
     * Check if user has completed daily check-in today
     */
    async hasCompletedDailyCheckin(userId, libraryId) {
        try {
            return await this.dailyCheckinService.hasCompletedToday(userId, libraryId);
        }
        catch (error) {
            this.logger.error('Failed to check daily check-in status:', error);
            throw error;
        }
    }
    /**
     * Clean up expired emotion data (called by scheduled job)
     */
    async cleanupExpiredData() {
        this.logger.info('Cleaning up expired emotion data');
        try {
            const { error } = await this.supabase.rpc('cleanup_expired_data_enhanced');
            if (error) {
                throw error;
            }
            this.logger.info('Successfully cleaned up expired emotion data');
        }
        catch (error) {
            this.logger.error('Failed to cleanup expired data:', error);
            throw error;
        }
    }
    /**
     * Analyze voice patterns for sophisticated emotion detection
     * Requirements: 7.1, 7.2, 7.3
     */
    async analyzeVoicePatterns(audioData) {
        this.logger.info('Analyzing voice patterns for emotion detection');
        try {
            return await this.voicePatternAnalyzer.analyzeVoicePatterns(audioData);
        }
        catch (error) {
            this.logger.error('Failed to analyze voice patterns:', error);
            throw error;
        }
    }
    /**
     * Record response latency for engagement analysis
     * Requirements: 7.1, 7.2
     */
    async recordResponseLatency(data) {
        this.logger.info('Recording response latency', {
            userId: data.userId,
            responseTime: data.responseTime
        });
        try {
            await this.responseLatencyAnalyzer.recordResponseLatency(data);
        }
        catch (error) {
            this.logger.error('Failed to record response latency:', error);
            throw error;
        }
    }
    /**
     * Analyze engagement metrics for a user session
     * Requirements: 7.1, 7.2
     */
    async analyzeEngagementMetrics(userId, sessionId) {
        this.logger.info('Analyzing engagement metrics', { userId, sessionId });
        try {
            return await this.responseLatencyAnalyzer.analyzeEngagementMetrics(userId, sessionId);
        }
        catch (error) {
            this.logger.error('Failed to analyze engagement metrics:', error);
            throw error;
        }
    }
    /**
     * Analyze engagement patterns over time
     * Requirements: 7.1, 7.3
     */
    async analyzeEngagementPatterns(userId, timeRange) {
        this.logger.info('Analyzing engagement patterns', { userId, timeRange });
        try {
            return await this.responseLatencyAnalyzer.analyzeEngagementPatterns(userId, timeRange);
        }
        catch (error) {
            this.logger.error('Failed to analyze engagement patterns:', error);
            throw error;
        }
    }
    /**
     * Record story choice for pattern analysis
     * Requirements: 7.1, 7.2, 7.3
     */
    async recordStoryChoice(choice) {
        this.logger.info('Recording story choice', {
            userId: choice.userId,
            choicePoint: choice.choicePoint
        });
        try {
            await this.storyChoicePatternAnalyzer.recordStoryChoice(choice);
        }
        catch (error) {
            this.logger.error('Failed to record story choice:', error);
            throw error;
        }
    }
    /**
     * Analyze story choice patterns for developmental insights
     * Requirements: 7.1, 7.2, 7.3
     */
    async analyzeChoicePatterns(userId, timeRange) {
        this.logger.info('Analyzing choice patterns', { userId, timeRange });
        try {
            return await this.storyChoicePatternAnalyzer.analyzeChoicePatterns(userId, timeRange);
        }
        catch (error) {
            this.logger.error('Failed to analyze choice patterns:', error);
            throw error;
        }
    }
    /**
     * Analyze emotional correlations with story choices
     * Requirements: 7.1, 7.2, 7.3
     */
    async analyzeEmotionalChoiceCorrelations(userId) {
        this.logger.info('Analyzing emotional choice correlations', { userId });
        try {
            return await this.storyChoicePatternAnalyzer.analyzeEmotionalChoiceCorrelations(userId);
        }
        catch (error) {
            this.logger.error('Failed to analyze emotional choice correlations:', error);
            throw error;
        }
    }
    /**
     * Analyze longitudinal emotional trends
     * Requirements: 7.1, 7.2, 7.3
     */
    async analyzeLongitudinalTrends(userId, timeRange) {
        this.logger.info('Analyzing longitudinal emotional trends', { userId, timeRange });
        try {
            return await this.longitudinalTrendTracker.analyzeEmotionalTrends(userId, timeRange);
        }
        catch (error) {
            this.logger.error('Failed to analyze longitudinal trends:', error);
            throw error;
        }
    }
    /**
     * Detect comprehensive intervention triggers from all analysis sources
     * Requirements: 7.1, 7.2, 7.3
     */
    async detectInterventionTriggers(userId, sessionId) {
        this.logger.info('Detecting comprehensive intervention triggers', { userId, sessionId });
        try {
            const triggers = [];
            let interventionNeeded = false;
            const overallRecommendations = [];
            // Check latency-based triggers if session provided
            if (sessionId) {
                const latencyTrigger = await this.responseLatencyAnalyzer.detectInterventionTriggers(userId, sessionId);
                if (latencyTrigger.interventionNeeded) {
                    interventionNeeded = true;
                    triggers.push({
                        source: 'latency',
                        type: latencyTrigger.triggerType,
                        severity: latencyTrigger.severity,
                        description: `Response latency indicates ${latencyTrigger.triggerType}`,
                        recommendations: latencyTrigger.recommendations
                    });
                }
            }
            // Check choice pattern triggers
            const choiceTrigger = await this.storyChoicePatternAnalyzer.detectChoiceBasedInterventionTriggers(userId);
            if (choiceTrigger.interventionNeeded) {
                interventionNeeded = true;
                triggers.push({
                    source: 'choice_patterns',
                    type: choiceTrigger.triggerType,
                    severity: choiceTrigger.severity,
                    description: choiceTrigger.description,
                    recommendations: choiceTrigger.recommendations
                });
            }
            // Check longitudinal triggers
            const longitudinalTriggers = await this.longitudinalTrendTracker.detectLongitudinalInterventionTriggers(userId);
            if (longitudinalTriggers.urgentTriggers.length > 0) {
                interventionNeeded = true;
                longitudinalTriggers.urgentTriggers.forEach(trigger => {
                    triggers.push({
                        source: 'longitudinal_trends',
                        type: trigger.type,
                        severity: trigger.severity,
                        description: trigger.description,
                        recommendations: trigger.recommendations
                    });
                });
            }
            // Compile overall recommendations
            const allRecommendations = triggers.flatMap(t => t.recommendations);
            overallRecommendations.push(...[...new Set(allRecommendations)]);
            // Add general recommendations if intervention needed
            if (interventionNeeded) {
                overallRecommendations.push('Consider consulting with child development specialist');
                overallRecommendations.push('Monitor emotional patterns more closely');
                overallRecommendations.push('Adjust storytelling approach based on detected needs');
            }
            return {
                interventionNeeded,
                triggers,
                overallRecommendations
            };
        }
        catch (error) {
            this.logger.error('Failed to detect intervention triggers:', error);
            throw error;
        }
    }
    /**
     * Generate comprehensive emotional intelligence report
     * Requirements: 7.1, 7.2, 7.3
     */
    async generateEmotionalIntelligenceReport(userId, timeRange) {
        this.logger.info('Generating comprehensive emotional intelligence report', { userId, timeRange });
        try {
            // Gather all analysis data
            const longitudinalTrends = await this.analyzeLongitudinalTrends(userId, timeRange);
            const choicePatterns = await this.analyzeChoicePatterns(userId, timeRange);
            const recentEmotions = await this.getRecentEmotions(userId, undefined, 50);
            // Calculate summary metrics
            const moodCounts = recentEmotions.reduce((counts, emotion) => {
                counts[emotion.mood] = (counts[emotion.mood] || 0) + 1;
                return counts;
            }, {});
            const dominantMood = Object.entries(moodCounts).reduce((a, b) => moodCounts[a[0]] > moodCounts[b[0]] ? a : b)[0];
            // Get recent engagement data
            const recentSessions = await this.getRecentSessionIds(userId, 10);
            let avgResponseTime = 0;
            let avgAttentionSpan = 0;
            let totalFatigueIndicators = 0;
            if (recentSessions.length > 0) {
                const engagementPromises = recentSessions.map(sessionId => this.analyzeEngagementMetrics(userId, sessionId).catch(() => null));
                const engagementResults = (await Promise.all(engagementPromises)).filter(Boolean);
                if (engagementResults.length > 0) {
                    avgResponseTime = engagementResults.reduce((sum, result) => sum + result.averageResponseTime, 0) / engagementResults.length;
                    avgAttentionSpan = engagementResults.reduce((sum, result) => sum + result.attentionSpan, 0) / engagementResults.length;
                    totalFatigueIndicators = engagementResults.reduce((sum, result) => sum + result.fatigueIndicators.length, 0);
                }
            }
            // Compile developmental insights
            const developmentalInsights = choicePatterns.flatMap(pattern => pattern.developmentalInsights);
            // Generate intervention recommendations
            const interventionTriggers = await this.detectInterventionTriggers(userId);
            return {
                summary: {
                    overallTrend: longitudinalTrends.trendAnalysis.overallTrend,
                    dominantMood,
                    engagementLevel: avgResponseTime < 5000 ? 'high' : avgResponseTime < 8000 ? 'medium' : 'low',
                    developmentalInsights: [...new Set(developmentalInsights)]
                },
                voiceAnalysis: {
                    emotionalMarkers: 0, // Would be calculated from recent voice analysis
                    stressIndicators: 0, // Would be calculated from recent voice analysis
                    confidenceLevel: 0.7 // Would be calculated from recent voice analysis
                },
                choicePatterns,
                engagementMetrics: {
                    averageResponseTime: avgResponseTime,
                    attentionSpan: avgAttentionSpan,
                    fatigueIndicators: totalFatigueIndicators
                },
                longitudinalTrends,
                interventionRecommendations: interventionTriggers.overallRecommendations
            };
        }
        catch (error) {
            this.logger.error('Failed to generate emotional intelligence report:', error);
            throw error;
        }
    }
    /**
     * Get recent session IDs for a user (helper method)
     */
    async getRecentSessionIds(userId, limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('response_latency_data')
                .select('session_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                throw error;
            }
            return [...new Set(data?.map(d => d.session_id) || [])];
        }
        catch (error) {
            this.logger.error('Failed to get recent session IDs:', error);
            return [];
        }
    }
    /**
     * Detect early intervention signals for proactive support
     * Requirements: 7.3, 7.4
     */
    async detectEarlyInterventionSignals(userId) {
        this.logger.info('Detecting early intervention signals', { userId });
        try {
            return await this.earlyInterventionDetector.detectEarlyInterventionSignals(userId);
        }
        catch (error) {
            this.logger.error('Failed to detect early intervention signals:', error);
            throw error;
        }
    }
    /**
     * Perform comprehensive risk assessment
     * Requirements: 7.3, 7.4
     */
    async performRiskAssessment(userId) {
        this.logger.info('Performing risk assessment', { userId });
        try {
            return await this.earlyInterventionDetector.performRiskAssessment(userId);
        }
        catch (error) {
            this.logger.error('Failed to perform risk assessment:', error);
            throw error;
        }
    }
    /**
     * Generate mood-based story recommendations
     * Requirements: 7.3, 7.4
     */
    async generateMoodBasedRecommendations(context) {
        this.logger.info('Generating mood-based story recommendations', {
            currentMood: context.currentMood,
            emotionalGoal: context.emotionalGoal
        });
        try {
            return await this.moodBasedRecommendationEngine.generateMoodBasedRecommendations(context);
        }
        catch (error) {
            this.logger.error('Failed to generate mood-based recommendations:', error);
            throw error;
        }
    }
    /**
     * Create therapeutic story pathway for emotional support
     * Requirements: 7.3, 7.4
     */
    async createTherapeuticPathway(userId, targetEmotions, currentEmotionalState, therapeuticGoals) {
        this.logger.info('Creating therapeutic story pathway', {
            userId,
            targetEmotions,
            currentEmotionalState,
            therapeuticGoals
        });
        try {
            return await this.moodBasedRecommendationEngine.createTherapeuticPathway(userId, targetEmotions, currentEmotionalState, therapeuticGoals);
        }
        catch (error) {
            this.logger.error('Failed to create therapeutic pathway:', error);
            throw error;
        }
    }
    /**
     * Start emotional journey for a user
     * Requirements: 7.3, 7.4
     */
    async startEmotionalJourney(userId, pathway) {
        this.logger.info('Starting emotional journey', { userId, pathwayName: pathway.pathwayName });
        try {
            return await this.moodBasedRecommendationEngine.startEmotionalJourney(userId, pathway);
        }
        catch (error) {
            this.logger.error('Failed to start emotional journey:', error);
            throw error;
        }
    }
    /**
     * Progress emotional journey to next step
     * Requirements: 7.3, 7.4
     */
    async progressEmotionalJourney(userId, emotionalResponse, engagementLevel, sessionFeedback) {
        this.logger.info('Progressing emotional journey', { userId, emotionalResponse, engagementLevel });
        try {
            return await this.moodBasedRecommendationEngine.progressEmotionalJourney(userId, emotionalResponse, engagementLevel, sessionFeedback);
        }
        catch (error) {
            this.logger.error('Failed to progress emotional journey:', error);
            throw error;
        }
    }
    /**
     * Detect crisis indicators and execute response protocol
     * Requirements: 7.3, 7.4
     */
    async detectAndRespondToCrisis(userId, sessionId, analysisData, context) {
        this.logger.info('Detecting and responding to crisis indicators', { userId, sessionId });
        try {
            // Detect crisis indicators
            const indicators = await this.crisisEscalationProtocol.detectCrisisIndicators(userId, sessionId, analysisData);
            if (indicators.length === 0) {
                return {
                    crisisDetected: false,
                    immediateActions: []
                };
            }
            // Execute crisis response if indicators found
            const crisisContext = {
                sessionId,
                userId,
                userAge: context.userAge,
                parentContactInfo: context.parentContactInfo,
                previousIncidents: context.previousIncidents || [],
                currentEmotionalState: analysisData.emotionalState || 'neutral',
                sessionDuration: context.sessionDuration,
                timeOfDay: context.timeOfDay
            };
            const crisisResponse = await this.crisisEscalationProtocol.executeCrisisResponse(indicators, crisisContext);
            // Extract immediate actions
            const immediateActions = crisisResponse.escalationActions
                .filter(action => action.timeframe === 'immediate')
                .map(action => action.description);
            return {
                crisisDetected: true,
                crisisResponse,
                immediateActions
            };
        }
        catch (error) {
            this.logger.error('Failed to detect and respond to crisis:', error);
            throw error;
        }
    }
    /**
     * Create safety plan for user
     * Requirements: 7.3, 7.4
     */
    async createSafetyPlan(userId, crisisIndicators, userAge) {
        this.logger.info('Creating safety plan', { userId, userAge });
        try {
            return await this.crisisEscalationProtocol.createSafetyPlan(userId, crisisIndicators, userAge);
        }
        catch (error) {
            this.logger.error('Failed to create safety plan:', error);
            throw error;
        }
    }
    /**
     * Generate comprehensive predictive emotional support recommendations
     * Requirements: 7.3, 7.4
     */
    async generatePredictiveEmotionalSupport(userId) {
        this.logger.info('Generating comprehensive predictive emotional support', { userId });
        try {
            // Detect early intervention signals
            const earlyInterventionSignals = await this.detectEarlyInterventionSignals(userId);
            // Perform risk assessment
            const riskAssessment = await this.performRiskAssessment(userId);
            // Get current emotional state for recommendations
            const recentEmotions = await this.getRecentEmotions(userId, undefined, 1);
            const currentMood = recentEmotions.length > 0 ? recentEmotions[0].mood : 'neutral';
            // Generate mood-based recommendations
            const recommendationContext = {
                currentMood,
                recentMoodHistory: recentEmotions.slice(0, 10).map(e => ({
                    mood: e.mood,
                    confidence: e.confidence ?? 0.7,
                    timestamp: e.createdAt ?? new Date().toISOString(),
                    context: e.context?.type || 'unknown'
                })),
                emotionalGoal: riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical'
                    ? 'emotional_processing' : 'mood_improvement',
                sessionContext: {
                    timeOfDay: this.getTimeOfDay(),
                    sessionLength: 'medium',
                    energyLevel: 'medium',
                    attentionSpan: 10
                },
                userPreferences: {
                    favoriteStoryTypes: [],
                    preferredCharacterTraits: [],
                    avoidedThemes: [],
                    responseToTones: {},
                    optimalSessionLength: 10
                }
            };
            const storyRecommendations = await this.generateMoodBasedRecommendations(recommendationContext);
            // Create therapeutic pathway if high risk
            let therapeuticPathway;
            if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
                therapeuticPathway = await this.createTherapeuticPathway(userId, ['happy', 'neutral'], currentMood, ['emotional_regulation', 'mood_improvement', 'resilience_building']);
            }
            // Generate predictive insights
            const predictiveInsights = await this.earlyInterventionDetector.generatePredictiveInsights(userId);
            // Create support plan
            const supportPlan = this.createSupportPlan(earlyInterventionSignals, riskAssessment, storyRecommendations);
            return {
                earlyInterventionSignals,
                riskAssessment,
                storyRecommendations,
                therapeuticPathway,
                predictiveInsights,
                supportPlan
            };
        }
        catch (error) {
            this.logger.error('Failed to generate predictive emotional support:', error);
            throw error;
        }
    }
    /**
     * Helper method to create support plan
     */
    createSupportPlan(signals, riskAssessment, recommendations) {
        const immediateActions = [];
        const shortTermGoals = [];
        const longTermObjectives = [];
        const monitoringPlan = [];
        // Immediate actions based on signals
        signals.forEach(signal => {
            if (signal.severity === 'high' || signal.severity === 'critical') {
                immediateActions.push(...signal.recommendedActions);
            }
        });
        // Short-term goals based on risk assessment
        if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
            shortTermGoals.push('Stabilize emotional state');
            shortTermGoals.push('Establish safety measures');
            shortTermGoals.push('Connect with professional support');
        }
        else if (riskAssessment.overallRiskLevel === 'medium') {
            shortTermGoals.push('Improve emotional regulation');
            shortTermGoals.push('Enhance coping strategies');
            shortTermGoals.push('Strengthen support network');
        }
        // Long-term objectives
        longTermObjectives.push('Build emotional resilience');
        longTermObjectives.push('Develop healthy coping mechanisms');
        longTermObjectives.push('Maintain emotional wellbeing');
        longTermObjectives.push('Foster positive relationships');
        // Monitoring plan
        monitoringPlan.push('Daily emotional check-ins');
        monitoringPlan.push('Weekly pattern analysis');
        monitoringPlan.push('Monthly risk assessment');
        monitoringPlan.push('Quarterly therapeutic pathway review');
        return {
            immediateActions: [...new Set(immediateActions)],
            shortTermGoals,
            longTermObjectives,
            monitoringPlan
        };
    }
    /**
     * Helper method to get current time of day
     */
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12)
            return 'morning';
        if (hour >= 12 && hour < 17)
            return 'afternoon';
        if (hour >= 17 && hour < 21)
            return 'evening';
        return 'night';
    }
    /**
     * Close connections and cleanup resources
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}
exports.EmotionAgent = EmotionAgent;
//# sourceMappingURL=EmotionAgent.js.map