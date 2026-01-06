"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeContentGenerator = void 0;
class AlternativeContentGenerator {
    constructor(openai, logger, enabled = true) {
        this.openai = openai;
        this.logger = logger;
        this.enabled = enabled;
    }
    async generateAlternative(request) {
        if (!this.enabled) {
            return {
                content: request.originalContent,
                confidence: 0,
                modifications: [],
                preservedElements: []
            };
        }
        this.logger.debug('Generating alternative content', {
            originalLength: request.originalContent.length,
            flaggedCategories: request.flaggedCategories,
            targetAge: request.targetAudience.age
        });
        try {
            // Create a prompt for generating safe alternative content
            const prompt = this.createAlternativeContentPrompt(request);
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: Math.min(1000, request.originalContent.length * 2)
            });
            const alternativeContent = response.choices[0].message.content?.trim();
            if (!alternativeContent) {
                throw new Error('No alternative content generated');
            }
            // Analyze the generated alternative
            const analysis = this.analyzeAlternativeContent(request.originalContent, alternativeContent, request);
            this.logger.debug('Alternative content generated', {
                originalLength: request.originalContent.length,
                alternativeLength: alternativeContent.length,
                confidence: analysis.confidence,
                modificationsCount: analysis.modifications.length
            });
            return {
                content: alternativeContent,
                confidence: analysis.confidence,
                modifications: analysis.modifications,
                preservedElements: analysis.preservedElements
            };
        }
        catch (error) {
            this.logger.error('Failed to generate alternative content', {
                error: error instanceof Error ? error.message : 'Unknown error',
                flaggedCategories: request.flaggedCategories
            });
            // Fallback to simple rule-based alternative
            return this.generateRuleBasedAlternative(request);
        }
    }
    createAlternativeContentPrompt(request) {
        const ageGuidance = request.targetAudience.age
            ? `The content should be appropriate for a ${request.targetAudience.age}-year-old child.`
            : 'The content should be appropriate for children.';
        const flaggedIssues = request.flaggedCategories.length > 0
            ? `The original content had issues with: ${request.flaggedCategories.join(', ')}.`
            : '';
        return `Please rewrite the following content to make it safe and appropriate while preserving the core message and story elements.

Original content: "${request.originalContent}"

Requirements:
- ${ageGuidance}
- Remove any inappropriate, harmful, or biased content
- ${flaggedIssues}
- Maintain the same content type (${request.contentType})
- Keep the story engaging and meaningful
- Use positive, inclusive language
- Ensure the content promotes good values

Please provide only the rewritten content without any explanations or additional text.`;
    }
    analyzeAlternativeContent(originalContent, alternativeContent, request) {
        const modifications = [];
        const preservedElements = [];
        let confidence = 0.8; // Base confidence
        // Check if content was significantly changed
        const similarity = this.calculateContentSimilarity(originalContent, alternativeContent);
        if (similarity < 0.3) {
            modifications.push('Significant content restructuring');
            confidence -= 0.1;
        }
        else if (similarity > 0.8) {
            modifications.push('Minor content adjustments');
            confidence += 0.1;
        }
        else {
            modifications.push('Moderate content revision');
        }
        // Check length changes
        const lengthRatio = alternativeContent.length / originalContent.length;
        if (lengthRatio < 0.7) {
            modifications.push('Content shortened significantly');
        }
        else if (lengthRatio > 1.3) {
            modifications.push('Content expanded with additional details');
        }
        else {
            preservedElements.push('Similar content length maintained');
        }
        // Check for preserved story elements (simple heuristic)
        const originalWords = new Set(originalContent.toLowerCase().split(/\s+/));
        const alternativeWords = new Set(alternativeContent.toLowerCase().split(/\s+/));
        const commonWords = new Set([...originalWords].filter(word => alternativeWords.has(word)));
        const wordPreservationRatio = commonWords.size / originalWords.size;
        if (wordPreservationRatio > 0.5) {
            preservedElements.push('Core vocabulary and themes maintained');
            confidence += 0.05;
        }
        // Check for specific improvements based on flagged categories
        for (const category of request.flaggedCategories) {
            if (this.checkCategoryImprovement(originalContent, alternativeContent, category)) {
                modifications.push(`Addressed ${category} concerns`);
                confidence += 0.05;
            }
        }
        return {
            confidence: Math.max(0.1, Math.min(1.0, confidence)),
            modifications,
            preservedElements
        };
    }
    calculateContentSimilarity(content1, content2) {
        const words1 = new Set(content1.toLowerCase().split(/\s+/));
        const words2 = new Set(content2.toLowerCase().split(/\s+/));
        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);
        return intersection.size / union.size;
    }
    checkCategoryImprovement(originalContent, alternativeContent, category) {
        const original = originalContent.toLowerCase();
        const alternative = alternativeContent.toLowerCase();
        switch (category) {
            case 'profanity':
                const profanityWords = ['damn', 'hell', 'stupid', 'hate'];
                const originalProfanity = profanityWords.some(word => original.includes(word));
                const alternativeProfanity = profanityWords.some(word => alternative.includes(word));
                return originalProfanity && !alternativeProfanity;
            case 'violence':
                const violenceWords = ['fight', 'hit', 'hurt', 'kill', 'weapon'];
                const originalViolence = violenceWords.some(word => original.includes(word));
                const alternativeViolence = violenceWords.some(word => alternative.includes(word));
                return originalViolence && !alternativeViolence;
            case 'bias':
                // Simple check for stereotype reduction
                const stereotypeWords = ['always', 'never', 'all boys', 'all girls'];
                const originalStereotypes = stereotypeWords.some(phrase => original.includes(phrase));
                const alternativeStereotypes = stereotypeWords.some(phrase => alternative.includes(phrase));
                return originalStereotypes && !alternativeStereotypes;
            default:
                return true; // Assume improvement for unknown categories
        }
    }
    generateRuleBasedAlternative(request) {
        this.logger.info('Generating rule-based alternative content');
        let alternativeContent = request.originalContent;
        const modifications = [];
        // Apply simple rule-based replacements
        const replacements = [
            { from: /\bstupid\b/gi, to: 'silly', category: 'profanity' },
            { from: /\bhate\b/gi, to: 'dislike', category: 'profanity' },
            { from: /\bfight\b/gi, to: 'disagree', category: 'violence' },
            { from: /\bhurt\b/gi, to: 'upset', category: 'violence' },
            { from: /\bkill\b/gi, to: 'stop', category: 'violence' },
            { from: /\bboys are\b/gi, to: 'some people are', category: 'bias' },
            { from: /\bgirls are\b/gi, to: 'some people are', category: 'bias' },
            { from: /\bscary\b/gi, to: 'surprising', category: 'age_inappropriate' },
            { from: /\bfrightening\b/gi, to: 'unexpected', category: 'age_inappropriate' }
        ];
        for (const replacement of replacements) {
            if (request.flaggedCategories.includes(replacement.category)) {
                const beforeLength = alternativeContent.length;
                alternativeContent = alternativeContent.replace(replacement.from, replacement.to);
                if (alternativeContent.length !== beforeLength) {
                    modifications.push(`Replaced inappropriate language (${replacement.category})`);
                }
            }
        }
        // If no changes were made, provide a generic safe alternative
        if (modifications.length === 0) {
            alternativeContent = this.generateGenericSafeContent(request.contentType, request.targetAudience.age);
            modifications.push('Generated safe alternative content');
        }
        return {
            content: alternativeContent,
            confidence: modifications.length > 0 ? 0.6 : 0.3,
            modifications,
            preservedElements: modifications.length === 0 ? [] : ['Basic content structure maintained']
        };
    }
    generateGenericSafeContent(contentType, age) {
        const ageAppropriate = age && age < 8;
        switch (contentType) {
            case 'story':
                return ageAppropriate
                    ? 'Once upon a time, there was a kind character who went on a gentle adventure and made new friends along the way. They learned something wonderful and everyone was happy.'
                    : 'There was once a brave character who faced challenges with courage and kindness. Through friendship and determination, they discovered something amazing and helped others along the way.';
            case 'character':
                return ageAppropriate
                    ? 'A friendly character with a warm smile who loves to help others and make new friends.'
                    : 'A thoughtful character who values friendship, shows kindness to others, and enjoys learning new things.';
            case 'activity':
                return ageAppropriate
                    ? 'A fun and safe activity that helps you learn while playing with friends.'
                    : 'An engaging activity that encourages creativity, learning, and positive social interaction.';
            default:
                return 'Safe, age-appropriate content that promotes positive values and learning.';
        }
    }
    async batchGenerateAlternatives(requests) {
        this.logger.info('Generating batch alternative content', { count: requests.length });
        const results = await Promise.all(requests.map(request => this.generateAlternative(request)));
        this.logger.info('Batch alternative content generation completed', {
            total: results.length,
            successful: results.filter(r => r.confidence > 0.5).length
        });
        return results;
    }
    async healthCheck() {
        if (!this.enabled) {
            return true; // Always healthy if disabled
        }
        try {
            // Test with simple content
            const testRequest = {
                originalContent: 'This is a test story with some bad words.',
                flaggedCategories: ['profanity'],
                targetAudience: { age: 8 },
                contentType: 'story'
            };
            const result = await this.generateAlternative(testRequest);
            return result.content.length > 0;
        }
        catch (error) {
            this.logger.error('AlternativeContentGenerator health check failed', { error });
            return false;
        }
    }
}
exports.AlternativeContentGenerator = AlternativeContentGenerator;
//# sourceMappingURL=AlternativeContentGenerator.js.map