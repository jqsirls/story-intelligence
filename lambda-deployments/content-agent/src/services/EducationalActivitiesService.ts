import { Story, StoryContent, Character } from '@alexa-multi-agent/shared-types';
import OpenAI from 'openai';

export interface EducationalActivitiesConfig {
  openaiApiKey: string;
  maxActivities: number;
  ageRanges: {
    [key: string]: { min: number; max: number; developmentalStage: string };
  };
}

export interface EducationalActivity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  ageRange: { min: number; max: number };
  duration: string; // "10-15 minutes", "30 minutes", etc.
  materials: string[];
  instructions: string[];
  learningObjectives: string[];
  storyConnection: string;
  adaptations: {
    younger: string;
    older: string;
    specialNeeds: string;
  };
  safetyNotes?: string[];
  parentTips: string[];
}

export type ActivityType = 
  | 'creative_arts' 
  | 'physical_movement' 
  | 'dramatic_play' 
  | 'science_exploration' 
  | 'literacy_extension' 
  | 'math_concepts' 
  | 'social_emotional' 
  | 'sensory_play' 
  | 'music_rhythm' 
  | 'cooking_baking' 
  | 'nature_outdoor' 
  | 'building_construction';

export interface ActivityGenerationRequest {
  story: Story;
  character: Character;
  targetAge: number;
  preferredTypes?: ActivityType[];
  availableMaterials?: string[];
  timeConstraints?: string; // "quick", "medium", "extended"
  specialConsiderations?: string[]; // accessibility, space limitations, etc.
}

export interface GeneratedActivities {
  activities: EducationalActivity[];
  metadata: {
    storyId: string;
    characterId: string;
    targetAge: number;
    generatedAt: string;
    storyThemes: string[];
    learningDomains: string[];
  };
}

export class EducationalActivitiesService {
  private openai: OpenAI;
  private config: EducationalActivitiesConfig;

  constructor(config: EducationalActivitiesConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Generate 4 educational activities based on story content
   */
  async generateActivities(request: ActivityGenerationRequest): Promise<GeneratedActivities> {
    try {
      const storyThemes = this.extractStoryThemes(request.story);
      const learningDomains = this.identifyLearningDomains(request.story, request.targetAge);
      const developmentalStage = this.getDevelopmentalStage(request.targetAge);
      
      // Generate diverse activity types
      const activityTypes = this.selectActivityTypes(
        request.preferredTypes,
        request.story.content.type,
        request.targetAge
      );
      
      const activities: EducationalActivity[] = [];
      
      for (let i = 0; i < Math.min(4, activityTypes.length); i++) {
        const activity = await this.generateSingleActivity({
          story: request.story,
          character: request.character,
          activityType: activityTypes[i],
          targetAge: request.targetAge,
          developmentalStage,
          storyThemes,
          learningDomains,
          availableMaterials: request.availableMaterials,
          timeConstraints: request.timeConstraints,
          specialConsiderations: request.specialConsiderations
        });
        
        activities.push(activity);
      }
      
      return {
        activities,
        metadata: {
          storyId: request.story.id,
          characterId: request.character.id,
          targetAge: request.targetAge,
          generatedAt: new Date().toISOString(),
          storyThemes,
          learningDomains
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to generate educational activities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Regenerate activities when story content changes
   */
  async regenerateActivities(
    originalActivities: GeneratedActivities,
    updatedStory: Story,
    changedElements?: string[]
  ): Promise<GeneratedActivities> {
    try {
      // If major story elements changed, regenerate all activities
      if (this.requiresFullRegeneration(changedElements)) {
        const character: Character = {
          id: originalActivities.metadata.characterId,
          libraryId: '',
          name: '',
          traits: { name: '', species: 'human', appearance: {} },
          createdAt: '',
          updatedAt: ''
        };
        
        return this.generateActivities({
          story: updatedStory,
          character,
          targetAge: originalActivities.metadata.targetAge
        });
      }
      
      // Otherwise, update activities to reflect story changes
      const updatedActivities = await Promise.all(
        originalActivities.activities.map(activity => 
          this.updateActivityForStoryChanges(activity, updatedStory, changedElements)
        )
      );
      
      return {
        activities: updatedActivities,
        metadata: {
          ...originalActivities.metadata,
          generatedAt: new Date().toISOString(),
          storyThemes: this.extractStoryThemes(updatedStory)
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to regenerate activities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get activity suggestions based on story type and age
   */
  getActivitySuggestions(storyType: string, age: number): {
    recommended: ActivityType[];
    alternatives: ActivityType[];
    considerations: string[];
  } {
    const ageGroup = this.getAgeGroup(age);
    
    const storyTypeActivities: Record<string, ActivityType[]> = {
      'Adventure': ['physical_movement', 'dramatic_play', 'creative_arts', 'building_construction'],
      'Bedtime': ['sensory_play', 'music_rhythm', 'creative_arts', 'social_emotional'],
      'Birthday': ['creative_arts', 'cooking_baking', 'music_rhythm', 'dramatic_play'],
      'Educational': ['science_exploration', 'literacy_extension', 'math_concepts', 'nature_outdoor'],
      'Financial Literacy': ['math_concepts', 'dramatic_play', 'building_construction', 'social_emotional'],
      'Language Learning': ['literacy_extension', 'music_rhythm', 'dramatic_play', 'creative_arts'],
      'Medical Bravery': ['dramatic_play', 'social_emotional', 'creative_arts', 'sensory_play'],
      'Mental Health': ['social_emotional', 'sensory_play', 'creative_arts', 'physical_movement'],
      'Milestones': ['creative_arts', 'social_emotional', 'physical_movement', 'dramatic_play'],
      'Tech Readiness': ['building_construction', 'science_exploration', 'creative_arts', 'math_concepts']
    };
    
    const recommended = storyTypeActivities[storyType] || ['creative_arts', 'dramatic_play', 'social_emotional', 'physical_movement'];
    
    const alternatives = this.getAlternativeActivities(recommended, ageGroup);
    
    const considerations = this.getAgeConsiderations(ageGroup);
    
    return {
      recommended,
      alternatives,
      considerations
    };
  }

  // Private helper methods

  private async generateSingleActivity(params: {
    story: Story;
    character: Character;
    activityType: ActivityType;
    targetAge: number;
    developmentalStage: string;
    storyThemes: string[];
    learningDomains: string[];
    availableMaterials?: string[];
    timeConstraints?: string;
    specialConsiderations?: string[];
  }): Promise<EducationalActivity> {
    
    const prompt = this.buildActivityPrompt(params);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert early childhood educator and child development specialist. 
                   Generate age-appropriate educational activities that extend story experiences 
                   and promote adult-child interaction. Focus on hands-on, engaging activities 
                   that reinforce story themes while supporting developmental goals.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const activityContent = response.choices[0].message.content || '';
    
    return this.parseActivityResponse(activityContent, params);
  }

  private buildActivityPrompt(params: {
    story: Story;
    character: Character;
    activityType: ActivityType;
    targetAge: number;
    developmentalStage: string;
    storyThemes: string[];
    learningDomains: string[];
    availableMaterials?: string[];
    timeConstraints?: string;
    specialConsiderations?: string[];
  }): string {
    
    const storyBeats = params.story.content.beats.map(beat => beat.content).join(' ');
    const characterDescription = this.getCharacterDescription(params.character);
    
    return `
Create a ${params.activityType} activity for a ${params.targetAge}-year-old child based on this story:

STORY: "${params.story.title}"
CHARACTER: ${characterDescription}
STORY CONTENT: ${storyBeats}
THEMES: ${params.storyThemes.join(', ')}
DEVELOPMENTAL STAGE: ${params.developmentalStage}
LEARNING DOMAINS: ${params.learningDomains.join(', ')}

${params.availableMaterials ? `AVAILABLE MATERIALS: ${params.availableMaterials.join(', ')}` : ''}
${params.timeConstraints ? `TIME CONSTRAINTS: ${params.timeConstraints}` : ''}
${params.specialConsiderations ? `SPECIAL CONSIDERATIONS: ${params.specialConsiderations.join(', ')}` : ''}

Generate an activity that:
1. Connects directly to the story and character
2. Is developmentally appropriate for age ${params.targetAge}
3. Promotes adult-child interaction and bonding
4. Uses common household materials when possible
5. Includes clear learning objectives
6. Provides adaptations for different needs
7. Includes safety considerations if needed
8. Offers parent tips for engagement

Format your response as a structured activity plan with clear sections for title, description, materials, instructions, learning objectives, story connection, adaptations, and parent tips.
    `;
  }

  private parseActivityResponse(content: string, params: {
    activityType: ActivityType;
    targetAge: number;
  }): EducationalActivity {
    // This is a simplified parser - in production, use structured output or more sophisticated parsing
    const lines = content.split('\n').filter(line => line.trim());
    
    const activity: EducationalActivity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: this.extractSection(lines, 'title') || `${params.activityType} Activity`,
      description: this.extractSection(lines, 'description') || 'Educational activity based on the story',
      type: params.activityType,
      ageRange: this.getAgeRange(params.targetAge),
      duration: this.extractSection(lines, 'duration') || '15-20 minutes',
      materials: this.extractList(lines, 'materials'),
      instructions: this.extractList(lines, 'instructions'),
      learningObjectives: this.extractList(lines, 'learning objectives'),
      storyConnection: this.extractSection(lines, 'story connection') || 'Connects to story themes',
      adaptations: {
        younger: this.extractSection(lines, 'younger adaptation') || 'Simplify instructions and provide more support',
        older: this.extractSection(lines, 'older adaptation') || 'Add complexity and independence',
        specialNeeds: this.extractSection(lines, 'special needs') || 'Provide additional support and modifications as needed'
      },
      safetyNotes: this.extractList(lines, 'safety'),
      parentTips: this.extractList(lines, 'parent tips')
    };
    
    return activity;
  }

  private extractStoryThemes(story: Story): string[] {
    const themes: string[] = [story.content.theme];
    
    // Extract themes from story type
    const typeThemes: Record<string, string[]> = {
      'Adventure': ['courage', 'exploration', 'problem-solving'],
      'Bedtime': ['comfort', 'peace', 'security'],
      'Birthday': ['celebration', 'growth', 'joy'],
      'Educational': ['learning', 'discovery', 'knowledge'],
      'Financial Literacy': ['responsibility', 'planning', 'decision-making'],
      'Language Learning': ['communication', 'culture', 'expression'],
      'Medical Bravery': ['courage', 'healing', 'support'],
      'Mental Health': ['emotions', 'self-care', 'resilience'],
      'Milestones': ['achievement', 'growth', 'pride'],
      'Tech Readiness': ['innovation', 'adaptation', 'future-thinking']
    };
    
    const additionalThemes = typeThemes[story.content.type] || [];
    return [...themes, ...additionalThemes];
  }

  private identifyLearningDomains(story: Story, age: number): string[] {
    const domains: string[] = [];
    
    // Age-based developmental domains
    if (age <= 5) {
      domains.push('fine motor', 'gross motor', 'language development', 'social-emotional');
    } else if (age <= 8) {
      domains.push('literacy', 'numeracy', 'scientific thinking', 'creative expression');
    } else {
      domains.push('critical thinking', 'collaboration', 'communication', 'creativity');
    }
    
    // Story-type specific domains
    const storyDomains: Record<string, string[]> = {
      'Educational': ['cognitive development', 'academic skills'],
      'Physical': ['gross motor', 'health and wellness'],
      'Creative': ['artistic expression', 'imagination'],
      'Social': ['social skills', 'emotional intelligence']
    };
    
    return domains;
  }

  private getDevelopmentalStage(age: number): string {
    if (age <= 2) return 'toddler';
    if (age <= 5) return 'preschool';
    if (age <= 8) return 'early elementary';
    if (age <= 12) return 'middle childhood';
    return 'adolescent';
  }

  private selectActivityTypes(
    preferred?: ActivityType[],
    storyType?: string,
    age?: number
  ): ActivityType[] {
    if (preferred && preferred.length >= 4) {
      return preferred.slice(0, 4);
    }
    
    const suggestions = this.getActivitySuggestions(storyType || 'Adventure', age || 6);
    const selected = [...(preferred || [])];
    
    // Fill remaining slots with recommended activities
    for (const type of suggestions.recommended) {
      if (!selected.includes(type) && selected.length < 4) {
        selected.push(type);
      }
    }
    
    // Fill with alternatives if needed
    for (const type of suggestions.alternatives) {
      if (!selected.includes(type) && selected.length < 4) {
        selected.push(type);
      }
    }
    
    return selected;
  }

  private getAgeGroup(age: number): string {
    if (age <= 3) return 'toddler';
    if (age <= 5) return 'preschool';
    if (age <= 8) return 'early_elementary';
    return 'middle_childhood';
  }

  private getAgeRange(targetAge: number): { min: number; max: number } {
    return {
      min: Math.max(2, targetAge - 1),
      max: targetAge + 2
    };
  }

  private getAlternativeActivities(recommended: ActivityType[], ageGroup: string): ActivityType[] {
    const allTypes: ActivityType[] = [
      'creative_arts', 'physical_movement', 'dramatic_play', 'science_exploration',
      'literacy_extension', 'math_concepts', 'social_emotional', 'sensory_play',
      'music_rhythm', 'cooking_baking', 'nature_outdoor', 'building_construction'
    ];
    
    return allTypes.filter(type => !recommended.includes(type));
  }

  private getAgeConsiderations(ageGroup: string): string[] {
    const considerations: Record<string, string[]> = {
      'toddler': ['Short attention span', 'Need for supervision', 'Sensory exploration important'],
      'preschool': ['Developing fine motor skills', 'Love of pretend play', 'Learning through repetition'],
      'early_elementary': ['Reading skills developing', 'Increased independence', 'Peer interaction important'],
      'middle_childhood': ['Complex thinking emerging', 'Group activities preferred', 'Skill mastery focus']
    };
    
    return considerations[ageGroup] || [];
  }

  private getCharacterDescription(character: Character): string {
    const traits = character.traits;
    let description = `${traits.name}, a ${traits.species}`;
    
    if (traits.age) description += ` who is ${traits.age} years old`;
    if (traits.appearance.eyeColor) description += ` with ${traits.appearance.eyeColor} eyes`;
    if (traits.personality?.length) description += ` who is ${traits.personality.join(', ')}`;
    
    return description;
  }

  private requiresFullRegeneration(changedElements?: string[]): boolean {
    if (!changedElements) return true;
    
    const majorElements = ['theme', 'setting', 'character', 'story_type', 'age_rating'];
    return changedElements.some(element => majorElements.includes(element));
  }

  private async updateActivityForStoryChanges(
    activity: EducationalActivity,
    updatedStory: Story,
    changedElements?: string[]
  ): Promise<EducationalActivity> {
    // For minor changes, update the story connection
    const newThemes = this.extractStoryThemes(updatedStory);
    const updatedConnection = `Activity connects to the updated story themes: ${newThemes.join(', ')}`;
    
    return {
      ...activity,
      storyConnection: updatedConnection,
      learningObjectives: [
        ...activity.learningObjectives,
        `Explore themes from "${updatedStory.title}"`
      ]
    };
  }

  // Simplified text parsing helpers
  private extractSection(lines: string[], sectionName: string): string | null {
    const sectionLine = lines.find(line => 
      line.toLowerCase().includes(sectionName.toLowerCase())
    );
    
    if (!sectionLine) return null;
    
    const colonIndex = sectionLine.indexOf(':');
    if (colonIndex === -1) return null;
    
    return sectionLine.substring(colonIndex + 1).trim();
  }

  private extractList(lines: string[], sectionName: string): string[] {
    const startIndex = lines.findIndex(line => 
      line.toLowerCase().includes(sectionName.toLowerCase())
    );
    
    if (startIndex === -1) return [];
    
    const items: string[] = [];
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes(':')) break;
      
      if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
        items.push(line.replace(/^[-•\d.]\s*/, ''));
      }
    }
    
    return items;
  }
}