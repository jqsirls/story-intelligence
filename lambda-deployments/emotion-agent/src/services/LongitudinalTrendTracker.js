"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LongitudinalTrendTracker = void 0;
/**
 * Tracks longitudinal emotional trends and developmental patterns
 * Requirements: 7.1, 7.2, 7.3
 */
class LongitudinalTrendTracker {
    constructor(supabase, redis, logger) {
        this.supabase = supabase;
        this.redis = redis;
        this.logger = logger;
    }
    /**
     * Analyze comprehensive emotional trends for a user over time
     */
    async analyzeEmotionalTrends(userId, timeRange) {
        try {
            this.logger.info('Analyzing longitudinal emotional trends', { userId, timeRange });
            // Gather all emotional data points
            const dataPoints = await this.gatherEmotionalDataPoints(userId, timeRange);
            if (dataPoints.length < 10) {
                return this.getMinimalTrendData(userId, timeRange, dataPoints);
            }
            // Perform comprehensive trend analysis
            const trendAnalysis = await this.performTrendAnalysis(dataPoints);
            // Identify developmental milestones
            const developmentalMilestones = await this.identifyDevelopmentalMilestones(userId, dataPoints);
            // Detect risk factors
            const riskFactors = await this.detectRiskFactors(dataPoints);
            // Identify protective factors
            const protectiveFactors = await this.identifyProtectiveFactors(dataPoints);
            return {
                userId,
                timeRange,
                dataPoints,
                trendAnalysis,
                developmentalMilestones,
                riskFactors,
                protectiveFactors
            };
        }
        catch (error) {
            this.logger.error('Error analyzing emotional trends:', error);
            throw error;
        }
    }
    /**
     * Detect intervention triggers based on longitudinal patterns
     */
    async detectLongitudinalInterventionTriggers(userId) {
        try {
            this.logger.info('Detecting longitudinal intervention triggers', { userId });
            const timeRange = {
                start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
                end: new Date().toISOString()
            };
            const trendData = await this.analyzeEmotionalTrends(userId, timeRange);
            const urgentTriggers = [];
            const watchTriggers = [];
            const recommendations = [];
            // Check for urgent triggers
            this.checkForUrgentTriggers(trendData, urgentTriggers);
            // Check for watch triggers
            this.checkForWatchTriggers(trendData, watchTriggers);
            // Generate recommendations
            this.generateLongitudinalRecommendations(trendData, recommendations);
            return {
                urgentTriggers,
                watchTriggers,
                recommendations
            };
        }
        catch (error) {
            this.logger.error('Error detecting longitudinal intervention triggers:', error);
            throw error;
        }
    }
    /**
     * Generate predictive insights based on historical patterns
     */
    async generatePredictiveInsights(userId) {
        try {
            this.logger.info('Generating predictive insights', { userId });
            const timeRange = {
                start: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
                end: new Date().toISOString()
            };
            const trendData = await this.analyzeEmotionalTrends(userId, timeRange);
            const predictions = this.generateEmotionalPredictions(trendData);
            const confidence = this.calculatePredictionConfidence(trendData);
            const timeHorizon = this.determineTimeHorizon(trendData);
            const recommendations = this.generatePredictiveRecommendations(predictions);
            return {
                predictions,
                confidence,
                timeHorizon,
                recommendations
            };
        }
        catch (error) {
            this.logger.error('Error generating predictive insights:', error);
            throw error;
        }
    }
    /**
     * Gather all emotional data points from various sources
     */
    async gatherEmotionalDataPoints(userId, timeRange) {
        const dataPoints = [];
        // Get emotion records
        const { data: emotions, error: emotionError } = await this.supabase
            .from('emotions')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', timeRange.start)
            .lte('created_at', timeRange.end)
            .order('created_at', { ascending: true });
        if (emotionError) {
            throw emotionError;
        }
        if (emotions) {
            emotions.forEach(emotion => {
                dataPoints.push({
                    timestamp: emotion.created_at,
                    mood: emotion.mood,
                    confidence: emotion.confidence,
                    context: emotion.context?.type || 'unknown',
                    source: this.determineDataSource(emotion.context),
                    sessionId: emotion.context?.sessionId,
                    storyId: emotion.context?.storyId
                });
            });
        }
        // Get voice analysis data if available
        const { data: voiceAnalysis, error: voiceError } = await this.supabase
            .from('voice_analysis_results')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', timeRange.start)
            .lte('created_at', timeRange.end)
            .order('created_at', { ascending: true });
        if (!voiceError && voiceAnalysis) {
            voiceAnalysis.forEach(analysis => {
                if (analysis.detected_emotions && analysis.detected_emotions.length > 0) {
                    dataPoints.push({
                        timestamp: analysis.created_at,
                        mood: analysis.detected_emotions[0], // Primary detected emotion
                        confidence: analysis.confidence,
                        context: 'voice_pattern_analysis',
                        source: 'voice_analysis',
                        sessionId: analysis.session_id
                    });
                }
            });
        }
        // Get story choice emotional contexts
        const { data: storyChoices, error: choiceError } = await this.supabase
            .from('story_choices')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', timeRange.start)
            .lte('created_at', timeRange.end)
            .not('emotional_context', 'is', null)
            .order('created_at', { ascending: true });
        if (!choiceError && storyChoices) {
            storyChoices.forEach(choice => {
                dataPoints.push({
                    timestamp: choice.created_at,
                    mood: choice.emotional_context,
                    confidence: 0.6, // Moderate confidence for inferred emotions
                    context: 'story_choice',
                    source: 'choice_pattern',
                    sessionId: choice.session_id,
                    storyId: choice.story_id
                });
            });
        }
        return dataPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    /**
     * Perform comprehensive trend analysis
     */
    async performTrendAnalysis(dataPoints) {
        // Calculate overall trend
        const overallTrend = this.calculateOverallTrend(dataPoints);
        const trendStrength = this.calculateTrendStrength(dataPoints);
        // Identify significant changes
        const significantChanges = this.identifySignificantChanges(dataPoints);
        // Analyze seasonal patterns
        const seasonalPatterns = this.analyzeSeasonalPatterns(dataPoints);
        // Analyze weekly patterns
        const weeklyPatterns = this.analyzeWeeklyPatterns(dataPoints);
        // Calculate correlations
        const correlations = this.calculateEmotionalCorrelations(dataPoints);
        return {
            overallTrend,
            trendStrength,
            significantChanges,
            seasonalPatterns,
            weeklyPatterns,
            correlations
        };
    }
    /**
     * Calculate overall emotional trend
     */
    calculateOverallTrend(dataPoints) {
        if (dataPoints.length < 10)
            return 'stable';
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        // Split into quarters for trend analysis
        const quarterSize = Math.floor(dataPoints.length / 4);
        const firstQuarter = dataPoints.slice(0, quarterSize);
        const lastQuarter = dataPoints.slice(-quarterSize);
        const firstAvg = firstQuarter.reduce((sum, dp) => sum + moodValues[dp.mood], 0) / firstQuarter.length;
        const lastAvg = lastQuarter.reduce((sum, dp) => sum + moodValues[dp.mood], 0) / lastQuarter.length;
        // Calculate volatility
        const allValues = dataPoints.map(dp => moodValues[dp.mood]);
        const mean = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
        const variance = allValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allValues.length;
        const volatility = Math.sqrt(variance);
        if (volatility > 1.5) {
            return 'volatile';
        }
        else if (lastAvg > firstAvg + 0.5) {
            return 'improving';
        }
        else if (lastAvg < firstAvg - 0.5) {
            return 'declining';
        }
        else {
            return 'stable';
        }
    }
    /**
     * Calculate trend strength
     */
    calculateTrendStrength(dataPoints) {
        if (dataPoints.length < 5)
            return 0;
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        const values = dataPoints.map(dp => moodValues[dp.mood]);
        // Calculate linear regression slope
        const n = values.length;
        const sumX = (n * (n - 1)) / 2; // Sum of indices
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
        const sumXX = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return Math.min(1, Math.abs(slope) / 2); // Normalize to 0-1
    }
    /**
     * Identify significant changes in emotional patterns
     */
    identifySignificantChanges(dataPoints) {
        const changes = [];
        if (dataPoints.length < 14)
            return changes; // Need at least 2 weeks of data
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        // Use sliding window to detect changes
        const windowSize = 7; // 7 data points
        for (let i = windowSize; i < dataPoints.length - windowSize; i++) {
            const beforeWindow = dataPoints.slice(i - windowSize, i);
            const afterWindow = dataPoints.slice(i, i + windowSize);
            const beforeAvg = beforeWindow.reduce((sum, dp) => sum + moodValues[dp.mood], 0) / beforeWindow.length;
            const afterAvg = afterWindow.reduce((sum, dp) => sum + moodValues[dp.mood], 0) / afterWindow.length;
            const change = afterAvg - beforeAvg;
            if (Math.abs(change) > 1.0) { // Significant change threshold
                const changeType = change > 0 ? 'improvement' : 'decline';
                const magnitude = Math.abs(change);
                // Calculate duration of change
                let duration = 1;
                for (let j = i + 1; j < dataPoints.length; j++) {
                    const currentValue = moodValues[dataPoints[j].mood];
                    if (change > 0 && currentValue > beforeAvg || change < 0 && currentValue < beforeAvg) {
                        duration++;
                    }
                    else {
                        break;
                    }
                }
                changes.push({
                    timestamp: dataPoints[i].timestamp,
                    changeType,
                    magnitude,
                    duration,
                    possibleCauses: this.inferPossibleCauses(dataPoints[i], changeType),
                    confidence: Math.min(0.9, magnitude / 2)
                });
            }
        }
        return changes;
    }
    /**
     * Analyze seasonal patterns in emotional data
     */
    analyzeSeasonalPatterns(dataPoints) {
        const patterns = [];
        if (dataPoints.length < 90)
            return patterns; // Need at least 3 months
        // Group by month
        const monthlyData = {};
        dataPoints.forEach(dp => {
            const month = new Date(dp.timestamp).getMonth();
            if (!monthlyData[month]) {
                monthlyData[month] = [];
            }
            monthlyData[month].push(dp);
        });
        // Analyze seasonal affective patterns (winter months)
        const winterMonths = [11, 0, 1]; // Dec, Jan, Feb
        const summerMonths = [5, 6, 7]; // Jun, Jul, Aug
        const winterData = winterMonths.flatMap(month => monthlyData[month] || []);
        const summerData = summerMonths.flatMap(month => monthlyData[month] || []);
        if (winterData.length > 5 && summerData.length > 5) {
            const winterMoodAvg = this.calculateAverageMoodValue(winterData);
            const summerMoodAvg = this.calculateAverageMoodValue(summerData);
            if (summerMoodAvg - winterMoodAvg > 0.5) {
                patterns.push({
                    pattern: 'seasonal_affective',
                    strength: Math.min(1, (summerMoodAvg - winterMoodAvg) / 2),
                    description: 'Mood tends to be lower during winter months',
                    predictedImpact: [
                        'May experience mood dips during winter',
                        'Consider light therapy or outdoor activities during darker months',
                        'Plan extra emotional support during seasonal transitions'
                    ]
                });
            }
        }
        return patterns;
    }
    /**
     * Analyze weekly patterns in emotional data
     */
    analyzeWeeklyPatterns(dataPoints) {
        const patterns = [];
        if (dataPoints.length < 21)
            return patterns; // Need at least 3 weeks
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dailyData = {};
        dataPoints.forEach(dp => {
            const dayOfWeek = new Date(dp.timestamp).getDay();
            if (!dailyData[dayOfWeek]) {
                dailyData[dayOfWeek] = [];
            }
            dailyData[dayOfWeek].push(dp);
        });
        Object.entries(dailyData).forEach(([day, data]) => {
            if (data.length < 3)
                return; // Need at least 3 data points per day
            const dayIndex = parseInt(day);
            const averageMoodValue = this.calculateAverageMoodValue(data);
            const averageMood = this.valueToMood(averageMoodValue);
            const moodVariability = this.calculateMoodVariability(data);
            let typicalTrend = 'stable';
            const recommendations = [];
            // Analyze day-specific patterns
            if (dayIndex === 1 && averageMoodValue < 3) { // Monday blues
                typicalTrend = 'monday_blues';
                recommendations.push('Consider extra support on Mondays');
                recommendations.push('Plan engaging activities to start the week positively');
            }
            else if (dayIndex === 5 && averageMoodValue > 3.5) { // Friday excitement
                typicalTrend = 'friday_excitement';
                recommendations.push('Leverage Friday enthusiasm for positive activities');
            }
            else if ([6, 0].includes(dayIndex) && moodVariability > 1) { // Weekend volatility
                typicalTrend = 'weekend_variability';
                recommendations.push('Maintain consistent routines on weekends');
            }
            patterns.push({
                dayOfWeek: dayNames[dayIndex],
                averageMood,
                moodVariability,
                typicalTrend,
                recommendations
            });
        });
        return patterns;
    }
    /**
     * Calculate emotional correlations with various factors
     */
    calculateEmotionalCorrelations(dataPoints) {
        const correlations = [];
        // Story type correlation
        const storyTypeCorrelation = this.calculateStoryTypeCorrelation(dataPoints);
        if (storyTypeCorrelation) {
            correlations.push(storyTypeCorrelation);
        }
        // Time of day correlation
        const timeOfDayCorrelation = this.calculateTimeOfDayCorrelation(dataPoints);
        if (timeOfDayCorrelation) {
            correlations.push(timeOfDayCorrelation);
        }
        return correlations;
    }
    /**
     * Helper methods
     */
    determineDataSource(context) {
        if (!context || !context.type)
            return 'daily_checkin';
        switch (context.type) {
            case 'laughter_detection':
                return 'laughter_detection';
            case 'voice_pattern_analysis':
                return 'voice_analysis';
            case 'story_choice':
                return 'choice_pattern';
            default:
                return 'daily_checkin';
        }
    }
    calculateAverageMoodValue(dataPoints) {
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        return dataPoints.reduce((sum, dp) => sum + moodValues[dp.mood], 0) / dataPoints.length;
    }
    valueToMood(value) {
        if (value <= 1.5)
            return 'sad';
        if (value <= 2.5)
            return 'scared';
        if (value <= 3.5)
            return 'neutral';
        return 'happy';
    }
    calculateMoodVariability(dataPoints) {
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        const values = dataPoints.map(dp => moodValues[dp.mood]);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
    inferPossibleCauses(dataPoint, changeType) {
        const causes = [];
        if (dataPoint.source === 'choice_pattern') {
            causes.push('Story content may have influenced emotional state');
        }
        if (dataPoint.source === 'voice_analysis') {
            causes.push('Voice patterns suggest emotional shift during interaction');
        }
        const dayOfWeek = new Date(dataPoint.timestamp).getDay();
        if (dayOfWeek === 1 && changeType === 'decline') {
            causes.push('Monday transition may have contributed to mood change');
        }
        if (causes.length === 0) {
            causes.push('Natural emotional fluctuation');
        }
        return causes;
    }
    calculateStoryTypeCorrelation(dataPoints) {
        // This would require story type data - simplified implementation
        return {
            factor: 'story_type',
            correlation: 0.3,
            significance: 0.6,
            description: 'Certain story types correlate with improved mood'
        };
    }
    calculateTimeOfDayCorrelation(dataPoints) {
        // Group by hour of day and calculate correlation
        const hourlyMoods = {};
        dataPoints.forEach(dp => {
            const hour = new Date(dp.timestamp).getHours();
            if (!hourlyMoods[hour]) {
                hourlyMoods[hour] = [];
            }
            hourlyMoods[hour].push(this.moodToValue(dp.mood));
        });
        // Simple correlation calculation
        const morningMood = this.calculateAverageForHours(hourlyMoods, [6, 7, 8, 9, 10, 11]);
        const eveningMood = this.calculateAverageForHours(hourlyMoods, [18, 19, 20, 21]);
        if (morningMood && eveningMood) {
            const correlation = (eveningMood - morningMood) / 4; // Normalize
            return {
                factor: 'time_of_day',
                correlation,
                significance: 0.5,
                description: correlation > 0 ? 'Mood tends to improve throughout the day' : 'Mood tends to decline throughout the day'
            };
        }
        return null;
    }
    moodToValue(mood) {
        const moodValues = {
            'sad': 1,
            'scared': 2,
            'angry': 2,
            'neutral': 3,
            'happy': 5
        };
        return moodValues[mood];
    }
    calculateAverageForHours(hourlyMoods, hours) {
        const values = hours.flatMap(hour => hourlyMoods[hour] || []);
        if (values.length === 0)
            return null;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    getMinimalTrendData(userId, timeRange, dataPoints) {
        return {
            userId,
            timeRange,
            dataPoints,
            trendAnalysis: {
                overallTrend: 'stable',
                trendStrength: 0,
                significantChanges: [],
                seasonalPatterns: [],
                weeklyPatterns: [],
                correlations: []
            },
            developmentalMilestones: [],
            riskFactors: [],
            protectiveFactors: []
        };
    }
    // Additional methods would be implemented for:
    // - identifyDevelopmentalMilestones
    // - detectRiskFactors  
    // - identifyProtectiveFactors
    // - checkForUrgentTriggers
    // - checkForWatchTriggers
    // - generateLongitudinalRecommendations
    // - generateEmotionalPredictions
    // - calculatePredictionConfidence
    // - determineTimeHorizon
    // - generatePredictiveRecommendations
    async identifyDevelopmentalMilestones(userId, dataPoints) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    async detectRiskFactors(dataPoints) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    async identifyProtectiveFactors(dataPoints) {
        // Simplified implementation - would be more sophisticated in production
        return [];
    }
    checkForUrgentTriggers(trendData, urgentTriggers) {
        // Implementation for urgent trigger detection
    }
    checkForWatchTriggers(trendData, watchTriggers) {
        // Implementation for watch trigger detection
    }
    generateLongitudinalRecommendations(trendData, recommendations) {
        // Implementation for recommendation generation
    }
    generateEmotionalPredictions(trendData) {
        // Implementation for prediction generation
        return [];
    }
    calculatePredictionConfidence(trendData) {
        // Implementation for confidence calculation
        return 0.5;
    }
    determineTimeHorizon(trendData) {
        // Implementation for time horizon determination
        return 30;
    }
    generatePredictiveRecommendations(predictions) {
        // Implementation for predictive recommendations
        return [];
    }
}
exports.LongitudinalTrendTracker = LongitudinalTrendTracker;
//# sourceMappingURL=LongitudinalTrendTracker.js.map