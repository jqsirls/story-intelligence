"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgeAppropriatenessFilter = void 0;
class AgeAppropriatenessFilter {
    constructor(logger) {
        this.name = 'age_appropriateness';
        this.priority = 80;
        this.enabled = true;
        this.logger = logger;
    }
    async filter(request) {
        this.logger.debug('Running age appropriateness filter', {
            contentType: request.contentType,
            userAge: request.userAge
        });
        const warnings = [];
        const modifications = [];
        let riskLevel = 'low';
        if (!request.userAge) {
            // If no age provided, assume general audience and apply moderate restrictions
            return {
                allowed: true,
                riskLevel: 'low',
                warnings: ['No age provided, applying general audience guidelines'],
                modifications: []
            };
        }
        const content = request.content.toLowerCase();
        const age = request.userAge;
        // Age-specific content checks
        if (age < 5) {
            const issues = this.checkToddlerContent(content);
            warnings.push(...issues.warnings);
            if (issues.inappropriate) {
                riskLevel = 'high';
            }
        }
        else if (age < 8) {
            const issues = this.checkEarlyChildhoodContent(content);
            warnings.push(...issues.warnings);
            if (issues.inappropriate) {
                riskLevel = 'medium';
            }
        }
        else if (age < 13) {
            const issues = this.checkMiddleChildhoodContent(content);
            warnings.push(...issues.warnings);
            if (issues.inappropriate) {
                riskLevel = 'medium';
            }
        }
        else if (age < 18) {
            const issues = this.checkTeenContent(content);
            warnings.push(...issues.warnings);
            if (issues.inappropriate) {
                riskLevel = 'low';
            }
        }
        // Check vocabulary complexity
        const vocabularyIssues = this.checkVocabularyComplexity(content, age);
        warnings.push(...vocabularyIssues.warnings);
        if (vocabularyIssues.tooComplex) {
            riskLevel = riskLevel === 'high' ? 'high' : 'medium';
            modifications.push('Simplify vocabulary for age group');
        }
        // Check sentence complexity
        const sentenceIssues = this.checkSentenceComplexity(content, age);
        warnings.push(...sentenceIssues.warnings);
        if (sentenceIssues.tooComplex) {
            modifications.push('Use shorter, simpler sentences');
        }
        // Check emotional complexity
        const emotionalIssues = this.checkEmotionalComplexity(content, age);
        warnings.push(...emotionalIssues.warnings);
        if (emotionalIssues.inappropriate) {
            riskLevel = 'high';
        }
        this.logger.debug('Age appropriateness check completed', {
            age,
            riskLevel,
            warningCount: warnings.length,
            modificationCount: modifications.length
        });
        return {
            allowed: riskLevel !== 'high',
            riskLevel,
            warnings: [...new Set(warnings)],
            modifications: [...new Set(modifications)]
        };
    }
    checkToddlerContent(content) {
        const warnings = [];
        let inappropriate = false;
        // Very restrictive for toddlers (under 5)
        const prohibitedWords = [
            'scary', 'frightening', 'monster', 'ghost', 'dark', 'alone',
            'lost', 'hurt', 'pain', 'sad', 'cry', 'angry', 'mad',
            'death', 'die', 'kill', 'blood', 'violence', 'fight'
        ];
        const foundProhibited = prohibitedWords.filter(word => content.includes(word));
        if (foundProhibited.length > 0) {
            inappropriate = true;
            warnings.push(`Content contains words inappropriate for toddlers: ${foundProhibited.join(', ')}`);
        }
        // Check for complex concepts
        const complexConcepts = [
            'divorce', 'separation', 'hospital', 'medicine', 'doctor',
            'school', 'work', 'money', 'politics', 'religion'
        ];
        const foundComplex = complexConcepts.filter(concept => content.includes(concept));
        if (foundComplex.length > 0) {
            warnings.push(`Content contains concepts too complex for toddlers: ${foundComplex.join(', ')}`);
        }
        return { inappropriate, warnings };
    }
    checkEarlyChildhoodContent(content) {
        const warnings = [];
        let inappropriate = false;
        // Restrictive for early childhood (5-7)
        const concerningWords = [
            'death', 'die', 'kill', 'murder', 'violence', 'blood',
            'weapon', 'gun', 'knife', 'fight', 'war', 'battle'
        ];
        const foundConcerning = concerningWords.filter(word => content.includes(word));
        if (foundConcerning.length > 0) {
            inappropriate = true;
            warnings.push(`Content contains violent themes inappropriate for early childhood: ${foundConcerning.join(', ')}`);
        }
        // Emotional themes that may be too intense
        const intenseEmotions = [
            'depression', 'anxiety', 'panic', 'terror', 'rage',
            'hatred', 'despair', 'hopeless', 'devastated'
        ];
        const foundIntense = intenseEmotions.filter(emotion => content.includes(emotion));
        if (foundIntense.length > 0) {
            warnings.push(`Content contains emotionally intense themes: ${foundIntense.join(', ')}`);
        }
        return { inappropriate, warnings };
    }
    checkMiddleChildhoodContent(content) {
        const warnings = [];
        let inappropriate = false;
        // Moderate restrictions for middle childhood (8-12)
        const inappropriateThemes = [
            'sexual', 'romantic', 'dating', 'kissing', 'love',
            'alcohol', 'drugs', 'smoking', 'gambling',
            'suicide', 'self-harm', 'abuse', 'neglect'
        ];
        const foundInappropriate = inappropriateThemes.filter(theme => content.includes(theme));
        if (foundInappropriate.length > 0) {
            inappropriate = true;
            warnings.push(`Content contains themes inappropriate for middle childhood: ${foundInappropriate.join(', ')}`);
        }
        // Complex social issues
        const complexIssues = [
            'politics', 'government', 'election', 'voting',
            'economy', 'recession', 'unemployment', 'poverty',
            'discrimination', 'racism', 'sexism'
        ];
        const foundComplex = complexIssues.filter(issue => content.includes(issue));
        if (foundComplex.length > 0) {
            warnings.push(`Content contains complex social issues: ${foundComplex.join(', ')}`);
        }
        return { inappropriate, warnings };
    }
    checkTeenContent(content) {
        const warnings = [];
        let inappropriate = false;
        // Light restrictions for teens (13-17)
        const adultThemes = [
            'explicit', 'graphic', 'mature', 'adult',
            'pornography', 'sexual content', 'nudity'
        ];
        const foundAdult = adultThemes.filter(theme => content.includes(theme));
        if (foundAdult.length > 0) {
            inappropriate = true;
            warnings.push(`Content contains adult themes: ${foundAdult.join(', ')}`);
        }
        return { inappropriate, warnings };
    }
    checkVocabularyComplexity(content, age) {
        const warnings = [];
        let tooComplex = false;
        const words = content.split(/\s+/);
        const complexWords = words.filter(word => {
            // Remove punctuation
            const cleanWord = word.replace(/[^\w]/g, '');
            return cleanWord.length > this.getMaxWordLength(age) ||
                this.isComplexWord(cleanWord, age);
        });
        const complexityRatio = complexWords.length / words.length;
        const maxComplexityRatio = this.getMaxComplexityRatio(age);
        if (complexityRatio > maxComplexityRatio) {
            tooComplex = true;
            warnings.push(`Vocabulary too complex for age ${age} (${Math.round(complexityRatio * 100)}% complex words)`);
        }
        return { tooComplex, warnings };
    }
    checkSentenceComplexity(content, age) {
        const warnings = [];
        let tooComplex = false;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgWordsPerSentence = sentences.reduce((acc, sentence) => acc + sentence.trim().split(/\s+/).length, 0) / sentences.length;
        const maxWordsPerSentence = this.getMaxWordsPerSentence(age);
        if (avgWordsPerSentence > maxWordsPerSentence) {
            tooComplex = true;
            warnings.push(`Sentences too long for age ${age} (avg ${Math.round(avgWordsPerSentence)} words)`);
        }
        return { tooComplex, warnings };
    }
    checkEmotionalComplexity(content, age) {
        const warnings = [];
        let inappropriate = false;
        const emotionallyComplexThemes = [
            'existential', 'mortality', 'meaning of life', 'purpose',
            'identity crisis', 'self-doubt', 'philosophical',
            'metaphysical', 'spiritual crisis', 'faith'
        ];
        const foundComplex = emotionallyComplexThemes.filter(theme => content.includes(theme));
        if (foundComplex.length > 0 && age < 12) {
            inappropriate = true;
            warnings.push(`Emotionally complex themes inappropriate for age ${age}: ${foundComplex.join(', ')}`);
        }
        return { inappropriate, warnings };
    }
    getMaxWordLength(age) {
        if (age < 5)
            return 6;
        if (age < 8)
            return 8;
        if (age < 13)
            return 10;
        return 12;
    }
    getMaxComplexityRatio(age) {
        if (age < 5)
            return 0.05;
        if (age < 8)
            return 0.1;
        if (age < 13)
            return 0.15;
        return 0.2;
    }
    getMaxWordsPerSentence(age) {
        if (age < 5)
            return 8;
        if (age < 8)
            return 12;
        if (age < 13)
            return 15;
        return 20;
    }
    isComplexWord(word, age) {
        // Check for complex suffixes
        const complexSuffixes = [
            'tion', 'sion', 'ment', 'ness', 'ity', 'ous', 'ious',
            'ful', 'less', 'able', 'ible', 'ive', 'ary', 'ery'
        ];
        const hasComplexSuffix = complexSuffixes.some(suffix => word.endsWith(suffix));
        // Age-specific complexity rules
        if (age < 5) {
            return word.length > 6 || hasComplexSuffix;
        }
        else if (age < 8) {
            return word.length > 8 || hasComplexSuffix;
        }
        else if (age < 13) {
            return word.length > 10 || hasComplexSuffix;
        }
        return word.length > 12;
    }
}
exports.AgeAppropriatenessFilter = AgeAppropriatenessFilter;
//# sourceMappingURL=AgeAppropriatenessFilter.js.map