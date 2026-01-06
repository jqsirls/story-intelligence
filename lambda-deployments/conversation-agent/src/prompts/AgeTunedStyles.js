"use strict";
/**
 * Age-Tuned Conversation Styles
 *
 * Provides AI with age-specific guidance for language, pacing, and interaction patterns.
 * Based on: agentic-ux scripts sections 2, 10.32, 26.6
 * Version: 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgeTunedStyles = void 0;
class AgeTunedStyles {
    /**
     * Get conversation style guidance for specific age
     */
    static getForAge(age) {
        const group = this.determineAgeGroup(age);
        const style = this.styles[group];
        return `
AGE-TUNED CONVERSATION STYLE (${style.ageRange}):

SESSION PARAMETERS:
- Target length: ${style.sessionLength}
- Story beats: ${style.beatCount}
- Max choices per turn: ${style.maxChoices}
- Sentence complexity: ${style.sentenceComplexity}
- Vocabulary: ${style.vocabularyLevel}
- Pacing: ${style.pacing}

LANGUAGE GUIDELINES:
${style.examples.join('\n')}

SPECIAL CONSIDERATIONS:
${style.specialConsiderations.join('\n')}

EXAMPLE OPENERS:
${this.getOpeners(group).join('\n')}

CHOICE FORMATS:
${this.getChoiceFormats(group).join('\n')}
`;
    }
    static determineAgeGroup(age) {
        if (age <= 4)
            return '3-4';
        if (age <= 6)
            return '5-6';
        if (age <= 9)
            return '7-9';
        return '10+';
    }
    static getOpeners(group) {
        const openers = {
            '3-4': [
                '"Hi. I am Storytailor. What is your name?"',
                '"Pick a hero. A cat, a robot, or you."',
                '"What color is your cape?"'
            ],
            '5-6': [
                '"Welcome back, explorer. Do you want to be you, or a new character today?"',
                '"Name your sidekick. Silly or serious?"',
                '"Pick the world. Rainbow Skies, Pillow Mountains, or Ocean of Bubbles?"'
            ],
            '7-9': [
                '"Choose your role. Detective, captain, inventor. Why that one?"',
                '"What is your hero trying to do today?"',
                '"Tell me about a time you felt brave. Your character can have that power."'
            ],
            '10+': [
                '"What kind of story matches your mood right now?"',
                '"If your character could solve any problem, what would it be?"',
                '"What themes interest you - adventure, mystery, friendship, discovery?"'
            ]
        };
        return openers[group];
    }
    static getChoiceFormats(group) {
        const formats = {
            '3-4': [
                'Two-choice only: "Left or right?"',
                'Yes/No: "Open the door?"',
                'Visual: "Point to the one you like."',
                'Binary: "Cat or dog?"'
            ],
            '5-6': [
                'Two-choice: "Turn left to the syrup river or right to the gumdrop forest?"',
                'Triple: "Knock, hide, or call hello?"',
                'Yes/No with why: "Should we? Why?"',
                'Either/or: "Fast or slow?"'
            ],
            '7-9': [
                'Triple with context: "Knock (safe), hide (sneaky), or call hello (brave)?"',
                'Open-ended: "What do you think happens when we open the door?"',
                'Reasoning: "Which would be bravest and why?"',
                'Team choice: "Let\'s decide together. What makes sense?"'
            ],
            '10+': [
                'Open-ended: "What should your character do and why?"',
                'Multiple paths: "Explore the cave, ask for help, or find another way?"',
                'Consequence-aware: "What might happen if you choose that?"',
                'Value-based: "Which choice feels most true to who your character is?"'
            ]
        };
        return formats[group];
    }
    /**
     * Get complete style configuration object
     */
    static getStyleConfig(age) {
        const group = this.determineAgeGroup(age);
        return this.styles[group];
    }
    /**
     * Validate if session length appropriate for age
     */
    static validateSessionLength(age, durationMinutes) {
        const group = this.determineAgeGroup(age);
        const config = this.styles[group];
        const [minStr, maxStr] = config.sessionLength.split('-');
        const min = parseInt(minStr);
        const max = parseInt(maxStr);
        if (durationMinutes < min) {
            return {
                appropriate: false,
                recommendation: `Session may be too short for age ${age}. Consider ${min}-${max} minutes.`
            };
        }
        if (durationMinutes > max + 3) {
            return {
                appropriate: false,
                recommendation: `Session may be too long for age ${age}. Consider ${min}-${max} minutes to prevent fatigue.`
            };
        }
        return { appropriate: true };
    }
}
exports.AgeTunedStyles = AgeTunedStyles;
AgeTunedStyles.styles = {
    '3-4': {
        ageRange: 'Ages 3-4',
        sessionLength: '5-7 minutes',
        beatCount: '6-8 beats',
        maxChoices: 2,
        sentenceComplexity: 'Very simple, 3-7 words per sentence',
        vocabularyLevel: 'Basic, concrete words only',
        pacing: 'Slow and gentle, frequent pauses',
        examples: [
            '- "Pick a hero. A cat, a robot, or you."',
            '- "What color is your cape?"',
            '- "Big words small. Two choices."',
            '- Use playful sounds: "Boop!", "Yay!", "Hi hi!"',
            '- Frequent affirmations: "Good job!", "I love that!"'
        ],
        specialConsiderations: [
            '- Visual helpers essential: "Point to the picture"',
            '- Repeat key information gently',
            '- Keep one active goal per session',
            '- Short attention span - 60-90 second beats maximum',
            '- Physical engagement: "Clap with me!", "Jump high!"',
            '- Avoid abstract concepts',
            '- Use familiar objects and animals'
        ]
    },
    '5-6': {
        ageRange: 'Ages 5-6',
        sessionLength: '7-10 minutes',
        beatCount: '8-12 beats',
        maxChoices: 3,
        sentenceComplexity: 'Simple, 5-10 words per sentence',
        vocabularyLevel: 'Elementary, some descriptive words',
        pacing: 'Moderate, responsive to engagement',
        examples: [
            '- "Welcome back, explorer. Do you want to be you, or a new character today?"',
            '- "Name your sidekick. Silly or serious?"',
            '- "Three choices. Simple jokes allowed."',
            '- Creative language: "amazing", "fantastic", "wonderful"',
            '- Build confidence: "You\'re the expert on your character"'
        ],
        specialConsiderations: [
            '- Introduce gentle wordplay and rhymes',
            '- Mini-games welcome: memory, rhyming, patterns',
            '- Encourage "what if" thinking',
            '- Can handle brief subplots',
            '- Begin teaching cause-effect in story',
            '- Celebrate creative ideas enthusiastically',
            '- Can discuss simple emotions: happy, sad, scared'
        ]
    },
    '7-9': {
        ageRange: 'Ages 7-9',
        sessionLength: '10-12 minutes',
        beatCount: '10-14 beats',
        maxChoices: 3,
        sentenceComplexity: 'More complex, 8-15 words',
        vocabularyLevel: 'Intermediate, varied vocabulary',
        pacing: 'Dynamic, matches conversation flow',
        examples: [
            '- "Choose your role. Detective, captain, inventor. Why that one?"',
            '- "What is your hero trying to do today?"',
            '- "Add a why or a how to your answer"',
            '- Collaborative problem-solving prompts',
            '- Reflect on emotions: "How does that make you feel?"'
        ],
        specialConsiderations: [
            '- Can handle complex character development',
            '- Welcome deeper "why" and "how" questions',
            '- Discuss themes: bravery, friendship, honesty',
            '- Honor their sophistication while staying playful',
            '- Can manage multiple character motivations',
            '- Understand moral dilemmas in age-appropriate way',
            '- Appreciate nuanced emotions: nervous, proud, determined'
        ]
    },
    '10+': {
        ageRange: 'Ages 10+',
        sessionLength: '12-15 minutes',
        beatCount: '12-16 beats',
        maxChoices: 4,
        sentenceComplexity: 'Sophisticated, 10-18 words',
        vocabularyLevel: 'Advanced, literary language',
        pacing: 'Flexible, collaborative',
        examples: [
            '- "What motivation drives your character in this moment?"',
            '- "How does this choice reflect their core values?"',
            '- Open-ended prompts: "What should happen next and why?"',
            '- Discuss themes and symbolism',
            '- Collaborative storytelling as equals'
        ],
        specialConsiderations: [
            '- Respect their maturity and insights',
            '- Can handle complex themes: identity, belonging, change',
            '- Welcome meta-discussion about story structure',
            '- Appreciate literary techniques',
            '- Can manage parallel plotlines',
            '- Understand character psychology',
            '- Engage with philosophical questions age-appropriately'
        ]
    }
};
//# sourceMappingURL=AgeTunedStyles.js.map