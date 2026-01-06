"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalStorytellingEngine = void 0;
class GlobalStorytellingEngine {
    constructor(supabase, openai) {
        this.supabase = supabase;
        this.openai = openai;
    }
    /**
     * Get traditional storytelling patterns for integration
     */
    async getTraditionalStoryPatterns(culturalBackground) {
        const patterns = [];
        for (const culture of culturalBackground) {
            const pattern = await this.getTraditionalPatternForCulture(culture);
            if (pattern) {
                patterns.push(pattern);
            }
        }
        return patterns;
    }
    /**
     * Create holiday-specific story mode
     */
    async createHolidayStoryMode(holiday, culturalContext, userAge) {
        try {
            const holidayPrompt = this.buildHolidayStoryPrompt(holiday, culturalContext, userAge);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in global holiday traditions and culturally sensitive storytelling. Create engaging holiday story modes that celebrate diversity while being educational and fun for children.'
                    },
                    {
                        role: 'user',
                        content: holidayPrompt
                    }
                ],
                temperature: 0.4
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        }
        catch (error) {
            console.error('Holiday story mode creation error:', error);
            throw new Error('Failed to create holiday story mode');
        }
    }
    /**
     * Generate cross-cultural character interaction scenarios
     */
    async generateCrossCulturalScenario(cultures, interactionType, storyContext) {
        try {
            const scenarioPrompt = this.buildCrossCulturalScenarioPrompt(cultures, interactionType, storyContext);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in cross-cultural education and inclusive storytelling. Create scenarios that promote understanding, respect, and celebration of cultural diversity among children.'
                    },
                    {
                        role: 'user',
                        content: scenarioPrompt
                    }
                ],
                temperature: 0.4
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        }
        catch (error) {
            console.error('Cross-cultural scenario generation error:', error);
            throw new Error('Failed to generate cross-cultural scenario');
        }
    }
    /**
     * Get cultural celebration story templates
     */
    async getCulturalCelebrationTemplates(celebrations) {
        const templates = [];
        for (const celebration of celebrations) {
            const template = await this.getCelebrationTemplate(celebration);
            if (template) {
                templates.push(template);
            }
        }
        return templates;
    }
    /**
     * Integrate storytelling tradition preservation
     */
    async preserveStorytellingTradition(tradition, culturalContext, modernStoryContext) {
        try {
            const preservationPrompt = this.buildTraditionPreservationPrompt(tradition, culturalContext, modernStoryContext);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in cultural preservation and storytelling traditions. Help preserve and adapt traditional storytelling methods for modern children while maintaining their cultural authenticity and educational value.'
                    },
                    {
                        role: 'user',
                        content: preservationPrompt
                    }
                ],
                temperature: 0.3
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        }
        catch (error) {
            console.error('Tradition preservation error:', error);
            throw new Error('Failed to preserve storytelling tradition');
        }
    }
    /**
     * Adapt story for traditional storytelling pattern
     */
    async adaptStoryForTradition(story, tradition, culturalContext) {
        try {
            const adaptationPrompt = this.buildStoryAdaptationPrompt(story, tradition, culturalContext);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in adapting modern stories to traditional storytelling patterns while preserving both the original story\'s essence and the cultural tradition\'s authenticity.'
                    },
                    {
                        role: 'user',
                        content: adaptationPrompt
                    }
                ],
                temperature: 0.3
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        }
        catch (error) {
            console.error('Story adaptation error:', error);
            throw new Error('Failed to adapt story for tradition');
        }
    }
    /**
     * Generate culturally diverse character ensemble
     */
    async generateCulturallyDiverseEnsemble(cultures, storyType, ageGroup) {
        try {
            const ensemblePrompt = this.buildCulturalEnsemblePrompt(cultures, storyType, ageGroup);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert in creating diverse character ensembles that celebrate cultural differences while promoting unity and understanding among children.'
                    },
                    {
                        role: 'user',
                        content: ensemblePrompt
                    }
                ],
                temperature: 0.4
            });
            return JSON.parse(completion.choices[0].message.content || '{}');
        }
        catch (error) {
            console.error('Cultural ensemble generation error:', error);
            throw new Error('Failed to generate culturally diverse ensemble');
        }
    }
    async getTraditionalPatternForCulture(culture) {
        // This would typically query a comprehensive database
        const patterns = {
            'african_oral': {
                name: 'African Oral Tradition',
                culturalOrigin: ['Various African cultures'],
                structure: {
                    opening: 'Call and response greeting with audience',
                    development: 'Rhythmic storytelling with audience participation',
                    climax: 'Moral lesson through character actions',
                    resolution: 'Community wisdom application',
                    closing: 'Audience reflection and discussion'
                },
                commonElements: ['animal characters', 'trickster figures', 'community wisdom', 'nature connection'],
                moralFramework: 'Community responsibility and ancestral wisdom',
                adaptationGuidelines: ['Include audience participation', 'Use rhythmic language', 'Emphasize community values']
            },
            'native_american': {
                name: 'Native American Storytelling',
                culturalOrigin: ['Various Native American tribes'],
                structure: {
                    opening: 'Sacred acknowledgment of the land and ancestors',
                    development: 'Circular narrative with spiritual elements',
                    climax: 'Connection between human and natural world',
                    resolution: 'Balance and harmony restored',
                    closing: 'Gratitude and reflection'
                },
                commonElements: ['animal spirits', 'nature teachers', 'sacred elements', 'circular time'],
                moralFramework: 'Respect for all living beings and natural balance',
                adaptationGuidelines: ['Honor spiritual elements', 'Respect nature', 'Use circular narrative structure']
            },
            'middle_eastern': {
                name: 'Middle Eastern Storytelling',
                culturalOrigin: ['Arabic', 'Persian', 'Turkish'],
                structure: {
                    opening: 'Invocation of divine blessing',
                    development: 'Nested stories within stories',
                    climax: 'Wisdom revealed through trials',
                    resolution: 'Divine justice and mercy',
                    closing: 'Moral lesson and blessing'
                },
                commonElements: ['wise rulers', 'clever merchants', 'divine intervention', 'hospitality'],
                moralFramework: 'Divine guidance and moral righteousness',
                adaptationGuidelines: ['Use nested narrative structure', 'Emphasize wisdom and hospitality', 'Include moral lessons']
            },
            'east_asian': {
                name: 'East Asian Storytelling',
                culturalOrigin: ['Chinese', 'Japanese', 'Korean'],
                structure: {
                    opening: 'Respectful introduction of characters and setting',
                    development: 'Gradual revelation of character relationships',
                    climax: 'Harmony disrupted and must be restored',
                    resolution: 'Balance achieved through wisdom and cooperation',
                    closing: 'Reflection on lessons learned'
                },
                commonElements: ['wise elders', 'family honor', 'natural harmony', 'collective good'],
                moralFramework: 'Social harmony and respect for tradition',
                adaptationGuidelines: ['Emphasize respect for elders', 'Focus on community harmony', 'Include traditional wisdom']
            }
        };
        return patterns[culture.toLowerCase().replace(/\s+/g, '_')] || null;
    }
    async getCelebrationTemplate(celebration) {
        // This would typically query a comprehensive database
        const templates = {
            'diwali': {
                celebration: 'Diwali',
                culturalOrigin: 'Hindu/Indian',
                significance: 'Festival of lights celebrating the victory of light over darkness',
                traditionalElements: ['oil lamps', 'rangoli patterns', 'fireworks', 'sweets', 'family gatherings'],
                storyIntegrationPoints: ['light conquering darkness', 'family unity', 'good triumphing over evil', 'sharing and generosity'],
                ageAppropriateExplanations: {
                    '3-5': 'A special time when families light beautiful lamps and share sweets to celebrate happiness',
                    '6-8': 'A festival where people light lamps to remember that good things are stronger than bad things',
                    '9-12': 'A celebration of light over darkness, both literally and symbolically, emphasizing hope and renewal'
                },
                respectfulRepresentation: ['Accurate religious context', 'Avoid commercialization', 'Include family traditions'],
                modernAdaptations: ['LED lights alongside traditional lamps', 'Virtual celebrations with distant family', 'Eco-friendly celebrations']
            },
            'lunar_new_year': {
                celebration: 'Lunar New Year',
                culturalOrigin: 'Chinese/East Asian',
                significance: 'New beginning, family reunion, and prosperity wishes',
                traditionalElements: ['red decorations', 'dragon dances', 'family feasts', 'gift giving', 'fireworks'],
                storyIntegrationPoints: ['new beginnings', 'family importance', 'cultural traditions', 'community celebration'],
                ageAppropriateExplanations: {
                    '3-5': 'A special new year celebration with dragons, red colors, and family parties',
                    '6-8': 'A time when families come together to celebrate a new year with special traditions and foods',
                    '9-12': 'A cultural new year celebration emphasizing family bonds, traditions, and hopes for prosperity'
                },
                respectfulRepresentation: ['Accurate cultural context', 'Include family values', 'Respect traditional meanings'],
                modernAdaptations: ['Virtual family gatherings', 'Fusion celebrations', 'Environmental consciousness']
            },
            'day_of_the_dead': {
                celebration: 'Día de los Muertos',
                culturalOrigin: 'Mexican/Latin American',
                significance: 'Honoring and remembering deceased family members with love and celebration',
                traditionalElements: ['ofrendas (altars)', 'marigold flowers', 'sugar skulls', 'family photos', 'favorite foods of deceased'],
                storyIntegrationPoints: ['family memory', 'love transcending death', 'cultural heritage', 'celebration of life'],
                ageAppropriateExplanations: {
                    '3-5': 'A special day when families remember people they love who are no longer with them',
                    '6-8': 'A celebration where families honor their ancestors with beautiful decorations and their favorite foods',
                    '9-12': 'A cultural tradition of celebrating the lives of deceased family members with joy rather than sadness'
                },
                respectfulRepresentation: ['Not Halloween', 'Focus on love and memory', 'Include family traditions'],
                modernAdaptations: ['Digital photo displays', 'Virtual family gatherings', 'Contemporary art forms']
            }
        };
        return templates[celebration.toLowerCase().replace(/\s+/g, '_')] || null;
    }
    buildHolidayStoryPrompt(holiday, culturalContext, userAge) {
        return `
Create a holiday-specific story mode for: ${holiday}
Cultural Context: ${culturalContext.join(', ')}
User Age: ${userAge}

Requirements:
1. Respectful and accurate representation of the holiday
2. Age-appropriate content and explanations
3. Educational value about the cultural significance
4. Engaging story elements that incorporate holiday traditions
5. Inclusive approach that welcomes children from all backgrounds
6. Modern adaptations while preserving traditional elements

Please respond with a JSON object containing:
{
  "holiday": "${holiday}",
  "culturalContext": ${JSON.stringify(culturalContext)},
  "storyThemes": ["themes that align with the holiday"],
  "characterTypes": ["character archetypes appropriate for this holiday"],
  "settingElements": ["setting elements that reflect the holiday"],
  "traditionalElements": ["traditional holiday elements to include"],
  "modernAdaptations": ["modern ways to celebrate while preserving meaning"],
  "ageAppropriateActivities": ["activities suitable for age ${userAge}"]
}
    `;
    }
    buildCrossCulturalScenarioPrompt(cultures, interactionType, storyContext) {
        return `
Create a cross-cultural interaction scenario:

Cultures: ${cultures.join(', ')}
Interaction Type: ${interactionType}
Story Context: ${JSON.stringify(storyContext, null, 2)}

Requirements:
1. Promote mutual respect and understanding
2. Avoid stereotypes while celebrating authentic cultural elements
3. Create learning opportunities for children
4. Show positive interactions and conflict resolution
5. Include age-appropriate cultural education
6. Demonstrate universal human values

Please respond with a JSON object containing:
{
  "scenario": "description of the cross-cultural scenario",
  "cultures": ${JSON.stringify(cultures)},
  "interactionType": "${interactionType}",
  "learningObjectives": ["what children will learn from this scenario"],
  "respectfulApproaches": ["how to approach cultural differences respectfully"],
  "potentialChallenges": ["challenges that might arise and how to address them"],
  "resolutionStrategies": ["positive ways to resolve cultural misunderstandings"]
}
    `;
    }
    buildTraditionPreservationPrompt(tradition, culturalContext, modernStoryContext) {
        return `
Help preserve and adapt this storytelling tradition for modern children:

Tradition: ${tradition}
Cultural Context: ${culturalContext}
Modern Story Context: ${JSON.stringify(modernStoryContext, null, 2)}

Requirements:
1. Preserve the authentic essence of the tradition
2. Make it accessible and engaging for modern children
3. Maintain cultural respect and accuracy
4. Integrate educational value
5. Adapt format for contemporary storytelling methods
6. Ensure age-appropriate content

Please respond with a JSON object containing:
{
  "tradition": "${tradition}",
  "culturalContext": "${culturalContext}",
  "originalElements": ["authentic elements of the tradition to preserve"],
  "preservationMethods": ["how to maintain authenticity"],
  "modernAdaptations": ["contemporary adaptations that preserve meaning"],
  "educationalValue": ["what children learn from this tradition"],
  "respectfulIntegration": ["how to integrate respectfully into modern stories"]
}
    `;
    }
    buildStoryAdaptationPrompt(story, tradition, culturalContext) {
        return `
Adapt this story to follow traditional storytelling patterns:

Original Story: ${JSON.stringify(story, null, 2)}
Traditional Pattern: ${JSON.stringify(tradition, null, 2)}
Cultural Context: ${JSON.stringify(culturalContext, null, 2)}

Requirements:
1. Preserve the original story's core message and characters
2. Integrate traditional storytelling structure and elements
3. Maintain cultural authenticity and respect
4. Ensure age-appropriate content
5. Create seamless blend of modern and traditional elements
6. Enhance educational and cultural value

Please respond with a JSON object containing:
{
  "adaptedStory": "the story adapted to follow traditional patterns",
  "traditionalElements": ["traditional elements integrated into the story"],
  "culturalEnhancements": ["cultural enhancements added"],
  "preservedOriginalElements": ["original story elements that were preserved"]
}
    `;
    }
    buildCulturalEnsemblePrompt(cultures, storyType, ageGroup) {
        return `
Create a culturally diverse character ensemble:

Cultures: ${cultures.join(', ')}
Story Type: ${storyType}
Age Group: ${ageGroup}

Requirements:
1. Create authentic characters from each culture
2. Avoid stereotypes while celebrating cultural uniqueness
3. Show positive interactions and mutual respect
4. Include learning opportunities about different cultures
5. Demonstrate universal human values and friendships
6. Age-appropriate character development and interactions

Please respond with a JSON object containing:
{
  "characters": [
    {
      "name": "culturally appropriate name",
      "culturalBackground": "specific cultural background",
      "role": "role in the story",
      "traits": ["personality traits"],
      "culturalElements": ["authentic cultural elements"],
      "interactionStyle": "how they interact with others"
    }
  ],
  "groupDynamics": ["how the characters work together"],
  "culturalLearningOpportunities": ["what children learn about different cultures"],
  "respectfulInteractions": ["examples of respectful cross-cultural interactions"]
}
    `;
    }
}
exports.GlobalStorytellingEngine = GlobalStorytellingEngine;
//# sourceMappingURL=GlobalStorytellingEngine.js.map