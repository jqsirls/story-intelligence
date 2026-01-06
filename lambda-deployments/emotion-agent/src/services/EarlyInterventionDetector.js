"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EarlyInterventionDetector = void 0;
/**
 * Early intervention detection system for proactive emotional support
 * Requirements: 7.3, 7.4
 */
class EarlyInterventionDetector {
    constructor(supabase, redis, logger) {
        this.supabase = supabase;
        this.redis = redis;
        this.logger = logger;
    }
    /**
     * Detect early intervention signals from multiple data sources
     */
    async detectEarlyInterventionSignals(userId) {
        try {
            this.logger.info('Detecting early intervention signals', { userId });
            const signals = [];
            // Analyze emotional decline patterns
            const emotionalDeclineSignal = await this.detectEmotionalDecline(userId);
            if (emotionalDeclineSignal) {
                signals.push(emotionalDeclineSignal);
            }
            // Analyze behavioral changes
            const behavioralChangeSignal = await this.detectBehavioralChanges(userId);
            if (behavioralChangeSignal) {
                signals.push(behavioralChangeSignal);
            }
            // Analyze engagement drops
            const engagementDropSignal = await this.detectEngagementDrop(userId);
            if (engagementDropSignal) {
                signals.push(engagementDropSignal);
            }
            // Analyze stress accumulation
            const stressSignal = await this.detectStressAccumulation(userId);
            if (stressSignal) {
                signals.push(stressSignal);
            }
            // Analyze social withdrawal patterns
            const socialWithdrawalSignal = await this.detectSocialWithdrawal(userId);
            if (socialWithdrawalSignal) {
                signals.push(socialWithdrawalSignal);
            }
            // Sort by severity and confidence
            signals.sort((a, b) => {
                const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
                const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
                if (severityDiff !== 0)
                    return severityDiff;
                return b.confidence - a.confidence;
            });
            return signals;
        }
        catch (error) {
            this.logger.error('Error detecting early intervention signals:', error);
            throw error;
        }
    }
    /**
     * Perform comprehensive risk assessment
     */
    async performRiskAssessment(userId) {
        try {
            this.logger.info('Performing risk assessment', { userId });
            // Get early intervention signals
            const signals = await this.detectEarlyInterventionSignals(userId);
            // Identify risk factors
            const riskFactors = await this.identifyRiskFactors(userId, signals);
            // Identify protective factors
            const protectiveFactors = await this.identifyProtectiveFactors(userId);
            // Calculate overall risk level
            const overallRiskLevel = this.calculateOverallRiskLevel(riskFactors, protectiveFactors, signals);
            // Determine intervention urgency
            const interventionUrgency = this.determineInterventionUrgency(overallRiskLevel, signals);
            // Generate intervention recommendations
            const recommendedInterventions = this.generateInterventionRecommendations(overallRiskLevel, riskFactors, protectiveFactors, signals);
            // Calculate next assessment due date
            const nextAssessmentDue = this.calculateNextAssessmentDate(overallRiskLevel, interventionUrgency);
            return {
                userId,
                overallRiskLevel,
                riskFactors,
                protectiveFactors,
                interventionUrgency,
                recommendedInterventions,
                nextAssessmentDue
            };
        }
        catch (error) {
            this.logger.error('Error performing risk assessment:', error);
            throw error;
        }
    }
    /**
     * Generate predictive insights using machine learning models
     */
    async generatePredictiveInsights(userId) {
        try {
            this.logger.info('Generating predictive insights', { userId });
            // Initialize predictive models
            const models = await this.initializePredictiveModels(userId);
            // Generate predictions from each model
            for (const model of models) {
                model.predictions = await this.generateModelPredictions(userId, model);
            }
            // Combine predictions for overall assessment
            const overallPrediction = this.combineModelPredictions(models);
            // Identify intervention opportunities
            const interventionOpportunities = this.identifyInterventionOpportunities(models, overallPrediction);
            return {
                models,
                overallPrediction,
                interventionOpportunities
            };
        }
        catch (error) {
            this.logger.error('Error generating predictive insights:', error);
            throw error;
        }
    }
    /**
     * Detect emotional decline patterns
     */
    async detectEmotionalDecline(userId) {
        try {
            // Get recent emotional data (last 14 days)
            const { data: emotions, error } = await this.supabase
                .from('emotions')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });
            if (error || !emotions || emotions.length < 5) {
                return null;
            }
            // Calculate mood trend
            const moodValues = {
                happy: 5,
                sad: 1,
                scared: 2,
                angry: 2,
                neutral: 3
            };
            const recentValues = emotions.slice(-7).map(e => moodValues[e.mood]);
            const earlierValues = emotions.slice(0, 7).map(e => moodValues[e.mood]);
            const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
            const earlierAvg = earlierValues.reduce((sum, val) => sum + val, 0) / earlierValues.length;
            const decline = earlierAvg - recentAvg;
            if (decline > 0.5) { // Significant decline threshold
                const indicators = [
                    {
                        type: 'mood_pattern',
                        value: decline,
                        threshold: 0.5,
                        description: `Mood declined by ${decline.toFixed(2)} points over 14 days`,
                        weight: 0.8
                    }
                ];
                // Check for negative mood persistence
                const negativeCount = recentValues.filter(v => v < 3).length;
                if (negativeCount > recentValues.length * 0.6) {
                    indicators.push({
                        type: 'mood_pattern',
                        value: negativeCount / recentValues.length,
                        threshold: 0.6,
                        description: `${Math.round(negativeCount / recentValues.length * 100)}% of recent moods are negative`,
                        weight: 0.7
                    });
                }
                const severity = decline > 1.5 ? 'high' : decline > 1.0 ? 'medium' : 'low';
                const confidence = Math.min(0.9, decline / 2);
                return {
                    signalType: 'emotional_decline',
                    severity,
                    confidence,
                    detectedAt: new Date().toISOString(),
                    indicators,
                    predictedOutcome: 'Continued emotional decline without intervention',
                    timeToIntervention: severity === 'high' ? 24 : severity === 'medium' ? 72 : 168, // hours
                    recommendedActions: [
                        'Initiate therapeutic storytelling sessions',
                        'Increase emotional check-in frequency',
                        'Consider parent/caregiver notification',
                        'Monitor for additional risk factors'
                    ]
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting emotional decline:', error);
            return null;
        }
    }
    /**
     * Detect behavioral changes in story choices and interactions
     */
    async detectBehavioralChanges(userId) {
        try {
            // Get recent choice patterns
            const { data: choices, error } = await this.supabase
                .from('story_choices')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });
            if (error || !choices || choices.length < 10) {
                return null;
            }
            // Split into periods for comparison
            const midpoint = Math.floor(choices.length / 2);
            const earlierChoices = choices.slice(0, midpoint);
            const recentChoices = choices.slice(midpoint);
            // Analyze choice pattern changes
            const earlierPatterns = this.analyzeChoicePatterns(earlierChoices);
            const recentPatterns = this.analyzeChoicePatterns(recentChoices);
            const patternChanges = this.compareChoicePatterns(earlierPatterns, recentPatterns);
            if (patternChanges.significantChange) {
                const indicators = [
                    {
                        type: 'choice_pattern',
                        value: patternChanges.changeScore,
                        threshold: 0.3,
                        description: patternChanges.description,
                        weight: 0.6
                    }
                ];
                // Check response time changes
                const earlierAvgTime = earlierChoices.reduce((sum, c) => sum + c.response_time, 0) / earlierChoices.length;
                const recentAvgTime = recentChoices.reduce((sum, c) => sum + c.response_time, 0) / recentChoices.length;
                const timeChange = (recentAvgTime - earlierAvgTime) / earlierAvgTime;
                if (Math.abs(timeChange) > 0.3) {
                    indicators.push({
                        type: 'response_latency',
                        value: Math.abs(timeChange),
                        threshold: 0.3,
                        description: `Response time ${timeChange > 0 ? 'increased' : 'decreased'} by ${Math.round(Math.abs(timeChange) * 100)}%`,
                        weight: 0.5
                    });
                }
                const severity = patternChanges.changeScore > 0.6 ? 'medium' : 'low';
                const confidence = Math.min(0.8, patternChanges.changeScore);
                return {
                    signalType: 'behavioral_change',
                    severity,
                    confidence,
                    detectedAt: new Date().toISOString(),
                    indicators,
                    predictedOutcome: 'Behavioral patterns may indicate underlying emotional changes',
                    timeToIntervention: 72, // 3 days
                    recommendedActions: [
                        'Monitor choice patterns more closely',
                        'Offer varied story types to assess preferences',
                        'Consider gentle inquiry about changes',
                        'Document pattern evolution'
                    ]
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting behavioral changes:', error);
            return null;
        }
    }
    /**
     * Detect engagement drops from response latency patterns
     */
    async detectEngagementDrop(userId) {
        try {
            // Get recent engagement metrics
            const { data: engagementData, error } = await this.supabase
                .from('engagement_metrics')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });
            if (error || !engagementData || engagementData.length < 3) {
                return null;
            }
            // Analyze engagement trend
            const engagementValues = engagementData.map(e => {
                switch (e.engagement_level) {
                    case 'high': return 3;
                    case 'medium': return 2;
                    case 'low': return 1;
                    default: return 2;
                }
            });
            const recentEngagement = engagementValues.slice(-3);
            const earlierEngagement = engagementValues.slice(0, 3);
            const recentAvg = recentEngagement.reduce((sum, val) => sum + val, 0) / recentEngagement.length;
            const earlierAvg = earlierEngagement.reduce((sum, val) => sum + val, 0) / earlierEngagement.length;
            const engagementDrop = earlierAvg - recentAvg;
            if (engagementDrop > 0.5) {
                const indicators = [
                    {
                        type: 'response_latency',
                        value: engagementDrop,
                        threshold: 0.5,
                        description: `Engagement level dropped by ${engagementDrop.toFixed(2)} points`,
                        weight: 0.7
                    }
                ];
                // Check for fatigue indicators
                const recentFatigueCount = engagementData.slice(-3).reduce((sum, e) => sum + (e.fatigue_indicators?.length || 0), 0);
                if (recentFatigueCount > 2) {
                    indicators.push({
                        type: 'response_latency',
                        value: recentFatigueCount,
                        threshold: 2,
                        description: `${recentFatigueCount} fatigue indicators detected in recent sessions`,
                        weight: 0.6
                    });
                }
                const severity = engagementDrop > 1.0 ? 'medium' : 'low';
                const confidence = Math.min(0.8, engagementDrop / 1.5);
                return {
                    signalType: 'engagement_drop',
                    severity,
                    confidence,
                    detectedAt: new Date().toISOString(),
                    indicators,
                    predictedOutcome: 'Continued disengagement may lead to session abandonment',
                    timeToIntervention: 48, // 2 days
                    recommendedActions: [
                        'Adjust session length and complexity',
                        'Introduce more interactive elements',
                        'Check for external stressors',
                        'Consider break periods'
                    ]
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting engagement drop:', error);
            return null;
        }
    }
    /**
     * Detect stress accumulation from voice analysis and response patterns
     */
    async detectStressAccumulation(userId) {
        try {
            // Get recent voice analysis data
            const { data: voiceData, error } = await this.supabase
                .from('voice_analysis_results')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });
            if (error || !voiceData || voiceData.length < 3) {
                return null;
            }
            // Analyze stress indicators trend
            const stressScores = voiceData.map(v => {
                const stressIndicators = v.stress_indicators || [];
                return stressIndicators.reduce((score, indicator) => {
                    const severityWeight = { 'low': 1, 'medium': 2, 'high': 3 };
                    return score + (severityWeight[indicator.severity] || 0) * indicator.confidence;
                }, 0);
            });
            const recentStress = stressScores.slice(-3);
            const earlierStress = stressScores.slice(0, 3);
            const recentAvg = recentStress.reduce((sum, val) => sum + val, 0) / recentStress.length;
            const earlierAvg = earlierStress.reduce((sum, val) => sum + val, 0) / earlierStress.length;
            const stressIncrease = recentAvg - earlierAvg;
            if (stressIncrease > 1.0) {
                const indicators = [
                    {
                        type: 'voice_analysis',
                        value: stressIncrease,
                        threshold: 1.0,
                        description: `Stress indicators increased by ${stressIncrease.toFixed(2)} points`,
                        weight: 0.8
                    }
                ];
                const severity = stressIncrease > 3.0 ? 'high' : stressIncrease > 2.0 ? 'medium' : 'low';
                const confidence = Math.min(0.9, stressIncrease / 4);
                return {
                    signalType: 'stress_accumulation',
                    severity,
                    confidence,
                    detectedAt: new Date().toISOString(),
                    indicators,
                    predictedOutcome: 'Accumulated stress may impact emotional wellbeing and engagement',
                    timeToIntervention: severity === 'high' ? 12 : 48, // hours
                    recommendedActions: [
                        'Implement calming storytelling techniques',
                        'Reduce session intensity and duration',
                        'Focus on relaxation and comfort themes',
                        'Consider environmental factors'
                    ]
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting stress accumulation:', error);
            return null;
        }
    }
    /**
     * Detect social withdrawal patterns from story choices
     */
    async detectSocialWithdrawal(userId) {
        try {
            // Get recent story choices
            const { data: choices, error } = await this.supabase
                .from('story_choices')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
                .order('created_at', { ascending: true });
            if (error || !choices || choices.length < 8) {
                return null;
            }
            // Analyze social vs. solitary choice patterns
            const socialKeywords = ['friend', 'together', 'share', 'help others', 'team', 'group', 'family'];
            const solitaryKeywords = ['alone', 'by myself', 'hide', 'avoid', 'stay away', 'quiet'];
            const midpoint = Math.floor(choices.length / 2);
            const earlierChoices = choices.slice(0, midpoint);
            const recentChoices = choices.slice(midpoint);
            const earlierSocialScore = this.calculateSocialScore(earlierChoices, socialKeywords, solitaryKeywords);
            const recentSocialScore = this.calculateSocialScore(recentChoices, socialKeywords, solitaryKeywords);
            const socialDecline = earlierSocialScore - recentSocialScore;
            if (socialDecline > 0.3) {
                const indicators = [
                    {
                        type: 'choice_pattern',
                        value: socialDecline,
                        threshold: 0.3,
                        description: `Social engagement in choices decreased by ${Math.round(socialDecline * 100)}%`,
                        weight: 0.7
                    }
                ];
                const severity = socialDecline > 0.6 ? 'medium' : 'low';
                const confidence = Math.min(0.8, socialDecline / 0.8);
                return {
                    signalType: 'social_withdrawal',
                    severity,
                    confidence,
                    detectedAt: new Date().toISOString(),
                    indicators,
                    predictedOutcome: 'Social withdrawal may indicate emotional distress or isolation',
                    timeToIntervention: 96, // 4 days
                    recommendedActions: [
                        'Introduce collaborative story elements',
                        'Focus on friendship and community themes',
                        'Encourage social interaction in stories',
                        'Monitor for signs of isolation'
                    ]
                };
            }
            return null;
        }
        catch (error) {
            this.logger.error('Error detecting social withdrawal:', error);
            return null;
        }
    }
    /**
     * Helper methods for pattern analysis
     */
    analyzeChoicePatterns(choices) {
        const patterns = {
            risk_taking: 0,
            safety_seeking: 0,
            creative: 0,
            social: 0,
            analytical: 0
        };
        const keywords = {
            risk_taking: ['adventure', 'explore', 'dangerous', 'brave'],
            safety_seeking: ['safe', 'careful', 'home', 'help'],
            creative: ['create', 'imagine', 'magic', 'art'],
            social: ['friend', 'together', 'share', 'help others'],
            analytical: ['think', 'solve', 'plan', 'understand']
        };
        choices.forEach(choice => {
            const choiceText = choice.selected_choice.toLowerCase();
            Object.entries(keywords).forEach(([pattern, words]) => {
                const matches = words.filter(word => choiceText.includes(word)).length;
                patterns[pattern] += matches;
            });
        });
        // Normalize by choice count
        Object.keys(patterns).forEach(pattern => {
            patterns[pattern] /= choices.length;
        });
        return patterns;
    }
    compareChoicePatterns(earlier, recent) {
        let totalChange = 0;
        const changes = [];
        Object.keys(earlier).forEach(pattern => {
            const change = Math.abs(recent[pattern] - earlier[pattern]);
            totalChange += change;
            if (change > 0.2) {
                const direction = recent[pattern] > earlier[pattern] ? 'increased' : 'decreased';
                changes.push(`${pattern} ${direction} by ${Math.round(change * 100)}%`);
            }
        });
        const changeScore = totalChange / Object.keys(earlier).length;
        return {
            significantChange: changeScore > 0.3,
            changeScore,
            description: changes.length > 0 ? changes.join(', ') : 'Minor pattern variations detected'
        };
    }
    calculateSocialScore(choices, socialKeywords, solitaryKeywords) {
        let socialCount = 0;
        let solitaryCount = 0;
        choices.forEach(choice => {
            const choiceText = choice.selected_choice.toLowerCase();
            socialKeywords.forEach(keyword => {
                if (choiceText.includes(keyword))
                    socialCount++;
            });
            solitaryKeywords.forEach(keyword => {
                if (choiceText.includes(keyword))
                    solitaryCount++;
            });
        });
        const totalSocialIndicators = socialCount + solitaryCount;
        if (totalSocialIndicators === 0)
            return 0.5; // Neutral if no indicators
        return socialCount / totalSocialIndicators;
    }
    // Additional helper methods would be implemented for:
    // - identifyRiskFactors
    // - identifyProtectiveFactors
    // - calculateOverallRiskLevel
    // - determineInterventionUrgency
    // - generateInterventionRecommendations
    // - calculateNextAssessmentDate
    // - initializePredictiveModels
    // - generateModelPredictions
    // - combineModelPredictions
    // - identifyInterventionOpportunities
    async identifyRiskFactors(userId, signals) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    async identifyProtectiveFactors(userId) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    calculateOverallRiskLevel(riskFactors, protectiveFactors, signals) {
        // Simplified implementation
        const criticalSignals = signals.filter(s => s.severity === 'critical');
        const highSignals = signals.filter(s => s.severity === 'high');
        if (criticalSignals.length > 0)
            return 'critical';
        if (highSignals.length > 1)
            return 'high';
        if (signals.length > 2)
            return 'medium';
        return 'low';
    }
    determineInterventionUrgency(riskLevel, signals) {
        if (riskLevel === 'critical')
            return 'immediate';
        if (riskLevel === 'high')
            return 'schedule';
        if (riskLevel === 'medium')
            return 'monitor';
        return 'none';
    }
    generateInterventionRecommendations(riskLevel, riskFactors, protectiveFactors, signals) {
        // Simplified implementation
        return [];
    }
    calculateNextAssessmentDate(riskLevel, urgency) {
        const daysToAdd = {
            'critical': 1,
            'high': 3,
            'medium': 7,
            'low': 14
        };
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd[riskLevel]);
        return nextDate.toISOString();
    }
    async initializePredictiveModels(userId) {
        // Simplified implementation
        return [];
    }
    async generateModelPredictions(userId, model) {
        // Simplified implementation
        return [];
    }
    combineModelPredictions(models) {
        // Simplified implementation
        return {
            timeHorizon: 7,
            predictedTrajectory: 'stable',
            confidence: 0.7,
            keyFactors: []
        };
    }
    identifyInterventionOpportunities(models, overallPrediction) {
        // Simplified implementation
        return {
            optimal_timing: [],
            high_impact_actions: [],
            preventive_measures: []
        };
    }
}
exports.EarlyInterventionDetector = EarlyInterventionDetector;
//# sourceMappingURL=EarlyInterventionDetector.js.map