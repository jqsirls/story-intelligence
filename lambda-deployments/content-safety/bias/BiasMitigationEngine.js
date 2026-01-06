"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BiasMitigationEngine = void 0;
class BiasMitigationEngine {
    constructor(openai, logger) {
        this.openai = openai;
        this.logger = logger;
    }
    async initialize() {
        this.logger.info('BiasMitigationEngine initialized');
    }
    async mitigateBias(content, biasDetectionResult, request) {
        this.logger.debug('Starting bias mitigation', {
            contentType: request.contentType,
            overallBiasScore: biasDetectionResult.overallBiasScore,
            detectedBiasCount: biasDetectionResult.detectedBiases.length
        });
        try {
            let mitigatedContent = content;
            const corrections = [];
            const mitigationStrategies = [];
            // Apply mitigation strategies based on detected biases
            for (const bias of biasDetectionResult.detectedBiases) {
                const mitigationResult = await this.applyBiasMitigation(mitigatedContent, bias, request);
                if (mitigationResult.success) {
                    mitigatedContent = mitigationResult.correctedContent;
                    corrections.push(...mitigationResult.corrections);
                    mitigationStrategies.push(mitigationResult.strategy);
                }
            }
            // Apply representation improvements
            const representationResult = await this.improveRepresentation(mitigatedContent, biasDetectionResult.representationAnalysis, request);
            if (representationResult.success) {
                mitigatedContent = representationResult.improvedContent;
                mitigationStrategies.push(...representationResult.strategies);
            }
            // Calculate remaining bias score (simplified estimation)
            const remainingBiasScore = Math.max(0, biasDetectionResult.overallBiasScore - (corrections.length * 0.1));
            const mitigationSuccess = remainingBiasScore < 0.3 && corrections.length > 0;
            this.logger.debug('Bias mitigation completed', {
                originalBiasScore: biasDetectionResult.overallBiasScore,
                remainingBiasScore,
                correctionsApplied: corrections.length,
                mitigationSuccess
            });
            return {
                mitigatedContent,
                mitigationStrategies: [...new Set(mitigationStrategies)],
                remainingBiasScore,
                mitigationSuccess,
                corrections
            };
        }
        catch (error) {
            this.logger.error('Error in bias mitigation', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                mitigatedContent: content,
                mitigationStrategies: [],
                remainingBiasScore: biasDetectionResult.overallBiasScore,
                mitigationSuccess: false,
                corrections: []
            };
        }
    }
    async applyBiasMitigation(content, bias, request) {
        const corrections = [];
        let correctedContent = content;
        let strategy = '';
        switch (bias.type) {
            case 'gender_stereotype':
                const genderResult = await this.mitigateGenderBias(content, bias.examples);
                correctedContent = genderResult.content;
                corrections.push(...genderResult.corrections);
                strategy = 'Gender-neutral language and diverse role representation';
                break;
            case 'racial_stereotype':
                const racialResult = await this.mitigateRacialBias(content, bias.examples);
                correctedContent = racialResult.content;
                corrections.push(...racialResult.corrections);
                strategy = 'Removed racial stereotypes and promoted inclusive representation';
                break;
            case 'age_bias':
                const ageResult = await this.mitigateAgeBias(content, bias.examples);
                correctedContent = ageResult.content;
                corrections.push(...ageResult.corrections);
                strategy = 'Age-inclusive language and diverse age representation';
                break;
            case 'cultural_bias':
                const culturalResult = await this.migrateCulturalBias(content, bias.examples);
                correctedContent = culturalResult.content;
                corrections.push(...culturalResult.corrections);
                strategy = 'Culturally respectful and inclusive content';
                break;
            case 'ableist_language':
                const abilityResult = await this.mitigateAbilityBias(content, bias.examples);
                correctedContent = abilityResult.content;
                corrections.push(...abilityResult.corrections);
                strategy = 'Person-first language and accessibility-conscious content';
                break;
            case 'class_stereotype':
                const classResult = await this.mitigateClassBias(content, bias.examples);
                correctedContent = classResult.content;
                corrections.push(...classResult.corrections);
                strategy = 'Socioeconomically inclusive representation';
                break;
            default:
                // Generic bias mitigation using AI
                const genericResult = await this.mitigateGenericBias(content, {
                    type: bias.type,
                    severity: bias.severity,
                    examples: bias.examples,
                    correction: bias.correction || 'Use inclusive, stereotype-free language'
                });
                correctedContent = genericResult.content;
                corrections.push(...genericResult.corrections);
                strategy = `Addressed ${bias.type} through content revision`;
                break;
        }
        return {
            success: corrections.length > 0,
            correctedContent,
            corrections,
            strategy
        };
    }
    async mitigateGenderBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        // Gender stereotype replacements
        const genderReplacements = [
            {
                pattern: /girls.*emotional|emotional.*girls/gi,
                replacement: 'people can be emotional',
                explanation: 'Removed gender stereotype about emotional expression'
            },
            {
                pattern: /boys.*strong|strong.*boys/gi,
                replacement: 'people can be strong',
                explanation: 'Removed gender stereotype about physical strength'
            },
            {
                pattern: /women.*nurturing|nurturing.*women/gi,
                replacement: 'people can be nurturing',
                explanation: 'Removed gender stereotype about caregiving'
            },
            {
                pattern: /men.*aggressive|aggressive.*men/gi,
                replacement: 'people can show different temperaments',
                explanation: 'Removed gender stereotype about aggression'
            }
        ];
        for (const replacement of genderReplacements) {
            const matches = correctedContent.match(replacement.pattern);
            if (matches) {
                for (const match of matches) {
                    correctedContent = correctedContent.replace(match, replacement.replacement);
                    corrections.push({
                        originalText: match,
                        correctedText: replacement.replacement,
                        biasType: 'gender_stereotype',
                        explanation: replacement.explanation
                    });
                }
            }
        }
        // Gendered profession corrections
        const professionReplacements = [
            { from: 'male nurse', to: 'nurse', explanation: 'Removed unnecessary gender qualifier' },
            { from: 'female doctor', to: 'doctor', explanation: 'Removed unnecessary gender qualifier' },
            { from: 'lady boss', to: 'boss', explanation: 'Used gender-neutral professional title' },
            { from: 'woman driver', to: 'driver', explanation: 'Removed unnecessary gender qualifier' }
        ];
        for (const replacement of professionReplacements) {
            if (correctedContent.toLowerCase().includes(replacement.from.toLowerCase())) {
                const regex = new RegExp(replacement.from, 'gi');
                correctedContent = correctedContent.replace(regex, replacement.to);
                corrections.push({
                    originalText: replacement.from,
                    correctedText: replacement.to,
                    biasType: 'gendered_profession',
                    explanation: replacement.explanation
                });
            }
        }
        return { content: correctedContent, corrections };
    }
    async mitigateRacialBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        // Remove racial stereotypes
        const racialReplacements = [
            {
                pattern: /asian.*math|math.*asian/gi,
                replacement: 'people who are good at math',
                explanation: 'Removed racial stereotype about academic abilities'
            },
            {
                pattern: /black.*athletic|athletic.*black/gi,
                replacement: 'athletic people',
                explanation: 'Removed racial stereotype about physical abilities'
            }
        ];
        for (const replacement of racialReplacements) {
            const matches = correctedContent.match(replacement.pattern);
            if (matches) {
                for (const match of matches) {
                    correctedContent = correctedContent.replace(match, replacement.replacement);
                    corrections.push({
                        originalText: match,
                        correctedText: replacement.replacement,
                        biasType: 'racial_stereotype',
                        explanation: replacement.explanation
                    });
                }
            }
        }
        return { content: correctedContent, corrections };
    }
    async mitigateAgeBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        const ageReplacements = [
            {
                pattern: /old.*slow|slow.*old/gi,
                replacement: 'people who take their time',
                explanation: 'Removed age-based stereotype about speed'
            },
            {
                pattern: /young.*irresponsible|irresponsible.*young/gi,
                replacement: 'people learning responsibility',
                explanation: 'Removed age-based stereotype about responsibility'
            },
            {
                pattern: /elderly.*confused|confused.*elderly/gi,
                replacement: 'people who need clarity',
                explanation: 'Removed age-based stereotype about mental capacity'
            }
        ];
        for (const replacement of ageReplacements) {
            const matches = correctedContent.match(replacement.pattern);
            if (matches) {
                for (const match of matches) {
                    correctedContent = correctedContent.replace(match, replacement.replacement);
                    corrections.push({
                        originalText: match,
                        correctedText: replacement.replacement,
                        biasType: 'age_bias',
                        explanation: replacement.explanation
                    });
                }
            }
        }
        return { content: correctedContent, corrections };
    }
    async migrateCulturalBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        const culturalReplacements = [
            {
                pattern: /western.*civilized|civilized.*western/gi,
                replacement: 'developed societies',
                explanation: 'Removed cultural hierarchy language'
            },
            {
                pattern: /primitive.*culture|culture.*primitive/gi,
                replacement: 'traditional culture',
                explanation: 'Used respectful cultural terminology'
            },
            {
                pattern: /exotic.*foreign|foreign.*exotic/gi,
                replacement: 'different cultural backgrounds',
                explanation: 'Removed othering language'
            }
        ];
        for (const replacement of culturalReplacements) {
            const matches = correctedContent.match(replacement.pattern);
            if (matches) {
                for (const match of matches) {
                    correctedContent = correctedContent.replace(match, replacement.replacement);
                    corrections.push({
                        originalText: match,
                        correctedText: replacement.replacement,
                        biasType: 'cultural_bias',
                        explanation: replacement.explanation
                    });
                }
            }
        }
        return { content: correctedContent, corrections };
    }
    async mitigateAbilityBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        const abilityReplacements = [
            { from: 'crazy', to: 'unusual', explanation: 'Replaced ableist language' },
            { from: 'insane', to: 'incredible', explanation: 'Replaced ableist language' },
            { from: 'lame', to: 'disappointing', explanation: 'Replaced ableist metaphor' },
            { from: 'blind to', to: 'unaware of', explanation: 'Replaced ableist metaphor' },
            { from: 'deaf to', to: 'ignoring', explanation: 'Replaced ableist metaphor' },
            { from: 'wheelchair bound', to: 'uses a wheelchair', explanation: 'Used person-first language' },
            { from: 'suffers from', to: 'has', explanation: 'Used neutral disability language' }
        ];
        for (const replacement of abilityReplacements) {
            const regex = new RegExp(`\\b${replacement.from}\\b`, 'gi');
            if (regex.test(correctedContent)) {
                correctedContent = correctedContent.replace(regex, replacement.to);
                corrections.push({
                    originalText: replacement.from,
                    correctedText: replacement.to,
                    biasType: 'ableist_language',
                    explanation: replacement.explanation
                });
            }
        }
        return { content: correctedContent, corrections };
    }
    async mitigateClassBias(content, examples) {
        const corrections = [];
        let correctedContent = content;
        const classReplacements = [
            {
                pattern: /poor.*lazy|lazy.*poor/gi,
                replacement: 'people facing economic challenges',
                explanation: 'Removed socioeconomic stereotype'
            },
            {
                pattern: /rich.*smart|smart.*rich/gi,
                replacement: 'intelligent people',
                explanation: 'Removed wealth-intelligence association'
            },
            {
                pattern: /homeless.*dangerous|dangerous.*homeless/gi,
                replacement: 'people experiencing homelessness',
                explanation: 'Used respectful language for housing status'
            }
        ];
        for (const replacement of classReplacements) {
            const matches = correctedContent.match(replacement.pattern);
            if (matches) {
                for (const match of matches) {
                    correctedContent = correctedContent.replace(match, replacement.replacement);
                    corrections.push({
                        originalText: match,
                        correctedText: replacement.replacement,
                        biasType: 'class_stereotype',
                        explanation: replacement.explanation
                    });
                }
            }
        }
        return { content: correctedContent, corrections };
    }
    async mitigateGenericBias(content, bias) {
        const corrections = [];
        try {
            // Use OpenAI to help with generic bias mitigation
            const prompt = `Please help mitigate bias in the following content. 

Original content: "${content}"

Detected bias type: ${bias.type}
Bias examples: ${bias.examples.join(', ')}
Suggested correction: ${bias.correction}

Please provide a revised version that addresses the bias while maintaining the original meaning and tone. Focus on:
1. Using inclusive language
2. Avoiding stereotypes
3. Representing diversity respectfully
4. Maintaining readability and engagement

Respond with only the revised content.`;
            const response = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1000
            });
            const revisedContent = response.choices[0].message.content?.trim();
            if (revisedContent && revisedContent !== content) {
                corrections.push({
                    originalText: content,
                    correctedText: revisedContent,
                    biasType: bias.type,
                    explanation: `AI-assisted bias mitigation for ${bias.type}`
                });
                return { content: revisedContent, corrections };
            }
        }
        catch (error) {
            this.logger.warn('Failed to use AI for generic bias mitigation', { error });
        }
        return { content, corrections };
    }
    async improveRepresentation(content, representationAnalysis, request) {
        const strategies = [];
        let improvedContent = content;
        if (!representationAnalysis) {
            return { success: false, improvedContent, strategies };
        }
        // Improve character diversity if low
        if (representationAnalysis.characters.diversity < 0.5) {
            const diversityResult = await this.enhanceCharacterDiversity(content, request);
            if (diversityResult.success) {
                improvedContent = diversityResult.content;
                strategies.push('Enhanced character diversity and representation');
            }
        }
        // Address problematic themes
        if (representationAnalysis.themes.problematic.length > 0) {
            const themeResult = await this.addressProblematicThemes(improvedContent, representationAnalysis.themes.problematic);
            if (themeResult.success) {
                improvedContent = themeResult.content;
                strategies.push('Addressed problematic themes with inclusive alternatives');
            }
        }
        return {
            success: strategies.length > 0,
            improvedContent,
            strategies
        };
    }
    async enhanceCharacterDiversity(content, request) {
        // Simple heuristic-based diversity enhancement
        // In production, this could use more sophisticated NLP
        let enhancedContent = content;
        let hasChanges = false;
        // Add diversity cues where appropriate
        const diversityEnhancements = [
            {
                pattern: /the character|the person|the individual/gi,
                replacements: [
                    'the diverse character',
                    'the character from different backgrounds',
                    'the inclusive character'
                ]
            }
        ];
        for (const enhancement of diversityEnhancements) {
            const matches = enhancedContent.match(enhancement.pattern);
            if (matches && matches.length > 0) {
                // Randomly select a replacement to add variety
                const replacement = enhancement.replacements[Math.floor(Math.random() * enhancement.replacements.length)];
                enhancedContent = enhancedContent.replace(enhancement.pattern, replacement);
                hasChanges = true;
            }
        }
        return { success: hasChanges, content: enhancedContent };
    }
    async addressProblematicThemes(content, problematicThemes) {
        let improvedContent = content;
        let hasChanges = false;
        const themeReplacements = {
            'violence': 'conflict resolution',
            'discrimination': 'acceptance and understanding',
            'exclusion': 'inclusion and belonging',
            'bullying': 'kindness and respect',
            'hatred': 'compassion and empathy'
        };
        for (const theme of problematicThemes) {
            const replacement = themeReplacements[theme.toLowerCase()];
            if (replacement) {
                const regex = new RegExp(`\\b${theme}\\b`, 'gi');
                if (regex.test(improvedContent)) {
                    improvedContent = improvedContent.replace(regex, replacement);
                    hasChanges = true;
                }
            }
        }
        return { success: hasChanges, content: improvedContent };
    }
    async healthCheck() {
        try {
            // Test with simple biased content
            const testContent = 'Boys are always stronger than girls.';
            const testBias = {
                overallBiasScore: 0.8,
                biasCategories: {
                    demographic: 0.1,
                    gender: 0.8,
                    cultural: 0.1,
                    ability: 0.1,
                    socioeconomic: 0.1
                },
                detectedBiases: [{
                        type: 'gender_stereotype',
                        severity: 0.8,
                        examples: ['Boys are always stronger than girls'],
                        correction: 'Use gender-neutral language'
                    }],
                representationAnalysis: {
                    characters: { diversity: 0.3, stereotypes: ['gender stereotype'] },
                    themes: { inclusive: false, problematic: ['gender bias'] }
                }
            };
            const testRequest = {
                content: testContent,
                contentType: 'story',
                userId: 'health-check',
                sessionId: 'health-check',
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'health_check',
                    requestId: 'health_check'
                }
            };
            const result = await this.mitigateBias(testContent, testBias, testRequest);
            return result.corrections.length > 0; // Should have made corrections
        }
        catch (error) {
            this.logger.error('BiasMitigationEngine health check failed', { error });
            return false;
        }
    }
}
exports.BiasMitigationEngine = BiasMitigationEngine;
//# sourceMappingURL=BiasMitigationEngine.js.map