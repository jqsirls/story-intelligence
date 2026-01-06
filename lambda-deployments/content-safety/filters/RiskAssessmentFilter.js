"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessmentFilter = void 0;
class RiskAssessmentFilter {
    constructor(openai, logger) {
        this.name = 'risk_assessment';
        this.priority = 90;
        this.enabled = true;
        this.openai = openai;
        this.logger = logger;
    }
    async filter(request) {
        this.logger.debug('Running risk assessment filter', {
            contentType: request.contentType,
            userAge: request.userAge
        });
        const warnings = [];
        const modifications = [];
        let riskLevel = 'low';
        try {
            // Assess content complexity and potential risks
            const riskFactors = await this.assessRiskFactors(request);
            // Calculate overall risk score
            const riskScore = this.calculateRiskScore(riskFactors, request);
            if (riskScore >= 0.8) {
                riskLevel = 'high';
                warnings.push('High risk content detected');
            }
            else if (riskScore >= 0.5) {
                riskLevel = 'medium';
                warnings.push('Medium risk content detected');
            }
            // Specific risk assessments
            if (riskFactors.emotionalIntensity > 0.7) {
                warnings.push('Content may be emotionally intense');
                if (request.userAge && request.userAge < 10) {
                    riskLevel = 'high';
                    warnings.push('Emotionally intense content inappropriate for young children');
                }
            }
            if (riskFactors.complexityLevel > 0.8) {
                warnings.push('Content complexity may be too high for target audience');
                if (request.userAge && request.userAge < 8) {
                    riskLevel = 'medium';
                }
            }
            if (riskFactors.potentialTrauma > 0.6) {
                warnings.push('Content may contain potentially traumatic themes');
                riskLevel = 'high';
            }
            if (riskFactors.culturalSensitivity > 0.7) {
                warnings.push('Content may require cultural sensitivity review');
                riskLevel = riskLevel === 'high' ? 'high' : 'medium';
            }
            // Context-specific assessments
            if (request.contentType === 'story' && Array.isArray(request.context?.previousContent)) {
                const continuityRisk = await this.assessContinuityRisk(request.content, request.context.previousContent.join(' '));
                if (continuityRisk > 0.6) {
                    warnings.push('Story continuation may introduce inconsistent or risky elements');
                    riskLevel = riskLevel === 'high' ? 'high' : 'medium';
                }
            }
            this.logger.debug('Risk assessment completed', {
                riskScore,
                riskLevel,
                riskFactors,
                warningCount: warnings.length
            });
            return {
                allowed: riskLevel !== 'high',
                riskLevel,
                warnings,
                modifications
            };
        }
        catch (error) {
            this.logger.error('Error in risk assessment filter', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                allowed: false,
                riskLevel: 'high',
                warnings: ['Risk assessment failed'],
                modifications: []
            };
        }
    }
    async assessRiskFactors(request) {
        const content = request.content.toLowerCase();
        // Emotional intensity assessment
        const emotionalWords = [
            'death', 'die', 'kill', 'murder', 'suicide', 'depression', 'anxiety',
            'trauma', 'abuse', 'violence', 'fear', 'terror', 'panic', 'rage',
            'hatred', 'despair', 'hopeless', 'devastated', 'destroyed'
        ];
        const emotionalIntensity = this.calculateWordPresence(content, emotionalWords);
        // Complexity level assessment
        const complexWords = [
            'existential', 'philosophical', 'metaphysical', 'psychological',
            'sociological', 'political', 'economic', 'theological', 'ethical'
        ];
        const sentences = content.split(/[.!?]+/);
        const avgWordsPerSentence = sentences.reduce((acc, sentence) => acc + sentence.trim().split(/\s+/).length, 0) / sentences.length;
        const complexityLevel = Math.min(1, (this.calculateWordPresence(content, complexWords) +
            Math.min(1, avgWordsPerSentence / 20)) / 2);
        // Potential trauma assessment
        const traumaWords = [
            'abuse', 'neglect', 'abandonment', 'betrayal', 'loss', 'grief',
            'divorce', 'separation', 'illness', 'hospital', 'surgery', 'pain',
            'bullying', 'rejection', 'failure', 'disappointment'
        ];
        const potentialTrauma = this.calculateWordPresence(content, traumaWords);
        // Cultural sensitivity assessment
        const culturalWords = [
            'religion', 'religious', 'god', 'allah', 'buddha', 'jesus',
            'christian', 'muslim', 'jewish', 'hindu', 'buddhist',
            'race', 'racial', 'ethnicity', 'culture', 'tradition',
            'stereotype', 'prejudice', 'discrimination'
        ];
        const culturalSensitivity = this.calculateWordPresence(content, culturalWords);
        // Age appropriateness assessment
        const ageInappropriateWords = [
            'adult', 'mature', 'sexual', 'romantic', 'dating', 'marriage',
            'pregnancy', 'birth', 'alcohol', 'drugs', 'smoking', 'gambling',
            'money', 'debt', 'job', 'work', 'career', 'politics'
        ];
        const ageAppropriateness = request.userAge ?
            Math.max(0, 1 - this.calculateWordPresence(content, ageInappropriateWords)) : 1;
        return {
            emotionalIntensity,
            complexityLevel,
            potentialTrauma,
            culturalSensitivity,
            ageAppropriateness
        };
    }
    calculateWordPresence(content, words) {
        const contentWords = content.split(/\s+/);
        const matchCount = words.reduce((count, word) => count + (content.includes(word) ? 1 : 0), 0);
        return Math.min(1, matchCount / Math.max(1, words.length * 0.1));
    }
    calculateRiskScore(riskFactors, request) {
        let score = 0;
        // Weight factors based on content type and user age
        const weights = {
            emotionalIntensity: request.userAge && request.userAge < 10 ? 0.4 : 0.2,
            complexityLevel: request.userAge && request.userAge < 8 ? 0.3 : 0.1,
            potentialTrauma: 0.3,
            culturalSensitivity: 0.1,
            ageAppropriateness: request.userAge ? 0.2 : 0.05
        };
        Object.entries(riskFactors).forEach(([factor, value]) => {
            if (weights[factor]) {
                score += value * weights[factor];
            }
        });
        return Math.min(1, score);
    }
    async assessContinuityRisk(currentContent, previousContent) {
        // Simple heuristic for story continuity risk
        // In a real implementation, this could use more sophisticated NLP
        const currentTone = this.analyzeTone(currentContent);
        const previousTone = this.analyzeTone(previousContent);
        const toneDifference = Math.abs(currentTone - previousTone);
        // High tone difference indicates potential continuity issues
        return Math.min(1, toneDifference);
    }
    analyzeTone(content) {
        // Simple tone analysis: positive words vs negative words
        const positiveWords = [
            'happy', 'joy', 'love', 'wonderful', 'amazing', 'great',
            'fantastic', 'beautiful', 'peaceful', 'calm', 'safe'
        ];
        const negativeWords = [
            'sad', 'angry', 'hate', 'terrible', 'awful', 'horrible',
            'scary', 'frightening', 'dangerous', 'violent', 'dark'
        ];
        const lowerContent = content.toLowerCase();
        const positiveCount = positiveWords.reduce((count, word) => count + (lowerContent.includes(word) ? 1 : 0), 0);
        const negativeCount = negativeWords.reduce((count, word) => count + (lowerContent.includes(word) ? 1 : 0), 0);
        // Return value between -1 (very negative) and 1 (very positive)
        const totalWords = positiveCount + negativeCount;
        if (totalWords === 0)
            return 0;
        return (positiveCount - negativeCount) / totalWords;
    }
}
exports.RiskAssessmentFilter = RiskAssessmentFilter;
//# sourceMappingURL=RiskAssessmentFilter.js.map