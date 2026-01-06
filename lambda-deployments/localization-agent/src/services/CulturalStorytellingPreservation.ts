import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  StorytellingTradition,
  CulturalContext
} from '../types';

export interface TraditionalNarrativeStructure {
  name: string;
  culturalOrigin: string[];
  structureType: 'linear' | 'circular' | 'spiral' | 'nested' | 'episodic' | 'call_response';
  phases: {
    name: string;
    purpose: string;
    characteristics: string[];
    modernAdaptation: string;
  }[];
  audienceParticipation: {
    type: 'call_response' | 'repetition' | 'prediction' | 'physical_movement' | 'singing';
    description: string;
    modernImplementation: string;
  }[];
  culturalSignificance: string;
  preservationPriority: 'critical' | 'important' | 'valuable';
}

export interface OralTraditionPattern {
  tradition: string;
  culturalContext: string[];
  oralElements: {
    rhythm: string;
    repetition: string[];
    memorabilityFeatures: string[];
    voiceModulation: string[];
  };
  communityRole: {
    storyteller: string;
    audience: string;
    setting: string;
    purpose: string;
  };
  preservationMethods: {
    traditional: string[];
    modern: string[];
    digital: string[];
  };
  adaptationGuidelines: string[];
}

export interface CulturalMythologyIntegration {
  mythology: string;
  culturalOrigin: string[];
  coreMyths: {
    name: string;
    significance: string;
    keyElements: string[];
    moralLessons: string[];
    modernRelevance: string;
  }[];
  respectfulAdaptation: {
    guidelines: string[];
    taboos: string[];
    appropriateContexts: string[];
    collaborationRequirements: string[];
  };
  educationalValue: string[];
  childFriendlyVersions: {
    ageGroup: string;
    adaptations: string[];
    focusPoints: string[];
  }[];
}

export interface IndigenousStorytellingMethod {
  method: string;
  indigenousGroup: string[];
  traditionalPractices: {
    setting: string;
    timing: string;
    participants: string[];
    ritualElements: string[];
  };
  storytellingTechniques: {
    voiceWork: string[];
    bodyLanguage: string[];
    props: string[];
    environmentalElements: string[];
  };
  culturalProtocols: {
    permissions: string[];
    restrictions: string[];
    respectfulPractices: string[];
    collaborationRequirements: string[];
  };
  modernAdaptation: {
    preservedElements: string[];
    adaptedElements: string[];
    technologyIntegration: string[];
    educationalFramework: string[];
  };
}

export interface CommunityStorytellingTradition {
  community: string;
  geographicOrigin: string[];
  traditionName: string;
  communityRole: {
    storytellers: string[];
    audienceParticipation: string[];
    settingImportance: string;
    seasonalAspects: string[];
  };
  preservationEfforts: {
    currentStatus: 'thriving' | 'declining' | 'endangered' | 'revitalization';
    preservationMethods: string[];
    communityInvolvement: string[];
    documentationNeeds: string[];
  };
  modernRelevance: {
    educationalValue: string[];
    culturalContinuity: string[];
    communityBuilding: string[];
    childDevelopment: string[];
  };
  integrationStrategies: {
    schoolPrograms: string[];
    familyActivities: string[];
    communityEvents: string[];
    digitalPreservation: string[];
  };
}

export interface StorytellingTraditionDocumentation {
  tradition: string;
  culturalContext: string[];
  documentation: {
    oralHistory: {
      interviews: string[];
      recordings: string[];
      transcriptions: string[];
    };
    practicalElements: {
      techniques: string[];
      props: string[];
      settings: string[];
      timing: string[];
    };
    culturalContext: {
      significance: string[];
      taboos: string[];
      protocols: string[];
      permissions: string[];
    };
  };
  preservationPlan: {
    immediateActions: string[];
    longTermGoals: string[];
    communityInvolvement: string[];
    educationalIntegration: string[];
  };
  accessibilityConsiderations: {
    ageAppropriate: { [ageGroup: string]: string[] };
    culturalSensitivity: string[];
    modernAdaptations: string[];
  };
}

export class CulturalStorytellingPreservation {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI
  ) {}

  /**
   * Integrate traditional narrative structures into modern stories
   */
  async integrateTraditionalNarrativeStructure(
    modernStory: any,
    traditionalStructure: TraditionalNarrativeStructure,
    targetAudience: { age: number; culturalBackground: string[] }
  ): Promise<{
    restructuredStory: any;
    traditionalElements: string[];
    audienceParticipationPoints: any[];
    culturalEducation: string[];
    preservationAchieved: string[];
  }> {
    const prompt = this.buildNarrativeStructurePrompt(modernStory, traditionalStructure, targetAudience);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in traditional narrative structures and cultural preservation. Help integrate authentic traditional storytelling patterns into modern children's stories while maintaining both the story's appeal and the tradition's integrity.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Recognize and apply oral tradition patterns
   */
  async recognizeOralTraditionPatterns(
    culturalBackground: string[],
    storyContent: any
  ): Promise<OralTraditionPattern[]> {
    const patterns: OralTraditionPattern[] = [];

    for (const culture of culturalBackground) {
      const pattern = await this.getOralTraditionPattern(culture, storyContent);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Integrate cultural mythology and folklore respectfully
   */
  async integrateCulturalMythology(
    mythology: string,
    culturalOrigin: string[],
    modernStoryContext: any,
    collaborationApproval: boolean = false
  ): Promise<CulturalMythologyIntegration> {
    if (!collaborationApproval) {
      throw new Error('Cultural mythology integration requires community collaboration and approval');
    }

    const prompt = this.buildMythologyIntegrationPrompt(mythology, culturalOrigin, modernStoryContext);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in cultural mythology and respectful adaptation. Help integrate mythological elements into modern stories while maintaining deep respect for their cultural significance and requiring appropriate community collaboration.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Support indigenous storytelling methods with cultural protocols
   */
  async supportIndigenousStorytellingMethods(
    indigenousGroup: string[],
    communityApproval: boolean = false,
    culturalLiaison: string | null = null
  ): Promise<IndigenousStorytellingMethod[]> {
    if (!communityApproval || !culturalLiaison) {
      throw new Error('Indigenous storytelling methods require explicit community approval and cultural liaison');
    }

    const methods: IndigenousStorytellingMethod[] = [];

    for (const group of indigenousGroup) {
      const method = await this.getIndigenousMethod(group, culturalLiaison);
      if (method) {
        methods.push(method);
      }
    }

    return methods;
  }

  /**
   * Create cultural celebration story templates with community input
   */
  async createCulturalCelebrationTemplates(
    celebrations: string[],
    culturalCommunityInput: { [celebration: string]: any } = {}
  ): Promise<{
    templates: any[];
    communityValidation: { [celebration: string]: boolean };
    respectfulRepresentation: string[];
    educationalValue: string[];
  }> {
    const prompt = this.buildCelebrationTemplatePrompt(celebrations, culturalCommunityInput);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in cultural celebrations and community-centered storytelling. Create celebration templates that honor cultural authenticity while being accessible to children from all backgrounds.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Document community storytelling traditions
   */
  async documentCommunityStorytellingTraditions(
    community: string,
    geographicOrigin: string[],
    communityParticipation: boolean = false
  ): Promise<CommunityStorytellingTradition> {
    if (!communityParticipation) {
      throw new Error('Community storytelling tradition documentation requires active community participation');
    }

    const prompt = this.buildCommunityDocumentationPrompt(community, geographicOrigin);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in community-based cultural preservation and storytelling documentation. Help document and preserve community storytelling traditions with deep respect for community ownership and participation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Create comprehensive tradition documentation
   */
  async createTraditionDocumentation(
    tradition: string,
    culturalContext: string[],
    communityCollaboration: {
      approved: boolean;
      collaborators: string[];
      permissions: string[];
    }
  ): Promise<StorytellingTraditionDocumentation> {
    if (!communityCollaboration.approved || communityCollaboration.collaborators.length === 0) {
      throw new Error('Tradition documentation requires approved community collaboration');
    }

    const prompt = this.buildTraditionDocumentationPrompt(tradition, culturalContext, communityCollaboration);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in cultural documentation and preservation. Create comprehensive documentation that respects community ownership while preserving valuable storytelling traditions for future generations.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Get traditional narrative structures for specific cultures
   */
  async getTraditionalNarrativeStructures(culturalBackground: string[]): Promise<TraditionalNarrativeStructure[]> {
    const structures: TraditionalNarrativeStructure[] = [];

    for (const culture of culturalBackground) {
      const structure = await this.getNarrativeStructureForCulture(culture);
      if (structure) {
        structures.push(structure);
      }
    }

    return structures;
  }

  /**
   * Validate cultural appropriateness of storytelling adaptations
   */
  async validateCulturalAppropriateness(
    adaptation: any,
    originalTradition: string,
    culturalContext: string[],
    communityReview: boolean = false
  ): Promise<{
    appropriate: boolean;
    concerns: string[];
    recommendations: string[];
    communityApprovalRequired: boolean;
    respectfulAlternatives: string[];
  }> {
    const prompt = this.buildCulturalValidationPrompt(adaptation, originalTradition, culturalContext, communityReview);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in cultural appropriateness and respectful adaptation. Evaluate storytelling adaptations for cultural sensitivity and provide guidance on respectful implementation.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  private async getNarrativeStructureForCulture(culture: string): Promise<TraditionalNarrativeStructure | null> {
    // This would typically query a comprehensive database of narrative structures
    const structures: { [key: string]: TraditionalNarrativeStructure } = {
      'african_oral': {
        name: 'African Call-and-Response Storytelling',
        culturalOrigin: ['Various African cultures'],
        structureType: 'call_response',
        phases: [
          {
            name: 'Opening Call',
            purpose: 'Gather audience attention and establish connection',
            characteristics: ['Rhythmic greeting', 'Audience response required', 'Community acknowledgment'],
            modernAdaptation: 'Interactive opening with children responding to storyteller prompts'
          },
          {
            name: 'Story Introduction',
            purpose: 'Set scene and introduce characters',
            characteristics: ['Repetitive phrases', 'Audience participation', 'Character establishment'],
            modernAdaptation: 'Children help introduce characters through call-and-response'
          },
          {
            name: 'Development with Participation',
            purpose: 'Build story with community involvement',
            characteristics: ['Rhythmic storytelling', 'Predictable responses', 'Physical movement'],
            modernAdaptation: 'Interactive story building with gestures and sounds'
          },
          {
            name: 'Moral Lesson',
            purpose: 'Deliver community wisdom',
            characteristics: ['Clear moral message', 'Community discussion', 'Practical application'],
            modernAdaptation: 'Group discussion about story lessons and real-life applications'
          },
          {
            name: 'Closing Reflection',
            purpose: 'Reinforce learning and community bonds',
            characteristics: ['Audience reflection', 'Community commitment', 'Gratitude expression'],
            modernAdaptation: 'Children share what they learned and how they\'ll apply it'
          }
        ],
        audienceParticipation: [
          {
            type: 'call_response',
            description: 'Audience responds to storyteller\'s calls with traditional phrases',
            modernImplementation: 'Children learn simple response phrases and participate actively'
          },
          {
            type: 'repetition',
            description: 'Key phrases repeated by audience for emphasis and memory',
            modernImplementation: 'Memorable catchphrases that children can repeat and remember'
          },
          {
            type: 'physical_movement',
            description: 'Gestures and movements that accompany the story',
            modernImplementation: 'Age-appropriate movements that help children engage with the story'
          }
        ],
        culturalSignificance: 'Preserves community wisdom and strengthens social bonds through shared storytelling experience',
        preservationPriority: 'critical'
      },
      'native_american_circular': {
        name: 'Native American Circular Storytelling',
        culturalOrigin: ['Various Native American tribes'],
        structureType: 'circular',
        phases: [
          {
            name: 'Sacred Opening',
            purpose: 'Acknowledge the land, ancestors, and spiritual presence',
            characteristics: ['Respectful acknowledgment', 'Spiritual connection', 'Land recognition'],
            modernAdaptation: 'Respectful moment of gratitude for nature and community'
          },
          {
            name: 'Setting the Circle',
            purpose: 'Establish the storytelling space and community',
            characteristics: ['Physical circle formation', 'Equal participation', 'Shared responsibility'],
            modernAdaptation: 'Children sit in circle, each person valued equally'
          },
          {
            name: 'Story Weaving',
            purpose: 'Tell story with circular, interconnected elements',
            characteristics: ['Non-linear narrative', 'Interconnected themes', 'Natural cycles'],
            modernAdaptation: 'Story elements that connect back to earlier parts, showing relationships'
          },
          {
            name: 'Wisdom Sharing',
            purpose: 'Extract and share the deeper meanings',
            characteristics: ['Multiple perspectives', 'Personal reflection', 'Community wisdom'],
            modernAdaptation: 'Children share different viewpoints and personal connections'
          },
          {
            name: 'Closing Circle',
            purpose: 'Complete the circle with gratitude and commitment',
            characteristics: ['Gratitude expression', 'Commitment to learning', 'Circle completion'],
            modernAdaptation: 'Group gratitude and commitment to applying story lessons'
          }
        ],
        audienceParticipation: [
          {
            type: 'prediction',
            description: 'Audience predicts story developments based on natural patterns',
            modernImplementation: 'Children guess what happens next based on story patterns'
          },
          {
            type: 'physical_movement',
            description: 'Movements that honor the four directions and natural elements',
            modernImplementation: 'Respectful movements that connect children to nature'
          }
        ],
        culturalSignificance: 'Teaches interconnectedness of all life and the importance of community wisdom',
        preservationPriority: 'critical'
      },
      'middle_eastern_nested': {
        name: 'Middle Eastern Nested Storytelling',
        culturalOrigin: ['Arabic', 'Persian', 'Turkish'],
        structureType: 'nested',
        phases: [
          {
            name: 'Frame Opening',
            purpose: 'Establish the outer story context',
            characteristics: ['Formal opening', 'Context setting', 'Narrator introduction'],
            modernAdaptation: 'Storyteller introduces the story-within-story concept'
          },
          {
            name: 'First Story Layer',
            purpose: 'Begin the outer narrative',
            characteristics: ['Character introduction', 'Situation setup', 'Hook for inner story'],
            modernAdaptation: 'Main story begins with character who will tell another story'
          },
          {
            name: 'Nested Story',
            purpose: 'Tell the inner story that contains the main lesson',
            characteristics: ['Complete narrative arc', 'Moral lesson', 'Wisdom revelation'],
            modernAdaptation: 'Character tells a story that teaches an important lesson'
          },
          {
            name: 'Return to Frame',
            purpose: 'Apply the inner story\'s lesson to the outer story',
            characteristics: ['Lesson application', 'Character growth', 'Problem resolution'],
            modernAdaptation: 'Show how the inner story helps solve the outer story\'s problem'
          },
          {
            name: 'Wisdom Integration',
            purpose: 'Integrate all lessons into practical wisdom',
            characteristics: ['Multiple lesson layers', 'Practical application', 'Moral reinforcement'],
            modernAdaptation: 'Children discuss how both stories teach valuable lessons'
          }
        ],
        audienceParticipation: [
          {
            type: 'prediction',
            description: 'Audience predicts connections between nested stories',
            modernImplementation: 'Children guess how the inner story will help the outer story'
          }
        ],
        culturalSignificance: 'Teaches complex moral lessons through layered storytelling and wisdom traditions',
        preservationPriority: 'important'
      }
    };

    return structures[culture.toLowerCase().replace(/\s+/g, '_')] || null;
  }

  private async getOralTraditionPattern(culture: string, storyContent: any): Promise<OralTraditionPattern | null> {
    // This would typically query a comprehensive database of oral tradition patterns
    const patterns: { [key: string]: OralTraditionPattern } = {
      'african': {
        tradition: 'African Oral Storytelling',
        culturalContext: ['West African', 'Central African', 'East African'],
        oralElements: {
          rhythm: 'Strong rhythmic patterns that aid memory and engagement',
          repetition: ['Key phrases repeated for emphasis', 'Audience response patterns', 'Character catchphrases'],
          memorabilityFeatures: ['Alliteration', 'Rhyme schemes', 'Rhythmic speech patterns', 'Musical elements'],
          voiceModulation: ['Character voices', 'Emotional inflection', 'Volume changes for emphasis', 'Pace variation']
        },
        communityRole: {
          storyteller: 'Griot or community elder who preserves and shares cultural wisdom',
          audience: 'Active participants who respond, question, and engage with the story',
          setting: 'Community gathering space, often around fire or under trees',
          purpose: 'Preserve history, teach morals, strengthen community bonds, entertain'
        },
        preservationMethods: {
          traditional: ['Master-apprentice teaching', 'Community storytelling events', 'Ritual integration'],
          modern: ['Audio recordings', 'Video documentation', 'Written transcription with performance notes'],
          digital: ['Interactive storytelling apps', 'Virtual reality experiences', 'Online community platforms']
        },
        adaptationGuidelines: [
          'Maintain rhythmic elements in modern formats',
          'Preserve call-and-response patterns',
          'Include community participation opportunities',
          'Respect the role of the storyteller as wisdom keeper',
          'Maintain moral and educational purposes'
        ]
      },
      'indigenous_american': {
        tradition: 'Indigenous American Oral Tradition',
        culturalContext: ['Various Native American tribes', 'First Nations', 'Indigenous communities'],
        oralElements: {
          rhythm: 'Natural rhythms that mirror heartbeat and breathing patterns',
          repetition: ['Sacred number patterns (often 4)', 'Seasonal cycles', 'Life cycle themes'],
          memorabilityFeatures: ['Connection to natural elements', 'Spiritual symbolism', 'Ancestral references'],
          voiceModulation: ['Respectful tone', 'Spiritual reverence', 'Connection to nature sounds']
        },
        communityRole: {
          storyteller: 'Elder or designated keeper of tribal stories and wisdom',
          audience: 'Community members of all ages, with special focus on teaching youth',
          setting: 'Sacred or ceremonial spaces, often in nature or traditional dwellings',
          purpose: 'Preserve tribal history, teach spiritual lessons, maintain connection to ancestors and land'
        },
        preservationMethods: {
          traditional: ['Elder-to-youth transmission', 'Ceremonial storytelling', 'Seasonal story cycles'],
          modern: ['Tribal language preservation programs', 'Cultural education initiatives', 'Community documentation projects'],
          digital: ['Tribal-controlled digital archives', 'Language learning apps', 'Virtual cultural centers']
        },
        adaptationGuidelines: [
          'Require tribal permission and collaboration',
          'Maintain spiritual and cultural context',
          'Respect sacred elements and protocols',
          'Include proper cultural attribution',
          'Support tribal sovereignty and self-determination'
        ]
      }
    };

    return patterns[culture.toLowerCase()] || null;
  }

  private async getIndigenousMethod(group: string, culturalLiaison: string): Promise<IndigenousStorytellingMethod | null> {
    // This would require actual community collaboration and approval
    // For demonstration purposes, showing the structure that would be filled with community input
    return {
      method: `${group} Traditional Storytelling`,
      indigenousGroup: [group],
      traditionalPractices: {
        setting: 'Community-specified traditional setting',
        timing: 'Culturally appropriate times as determined by community',
        participants: ['Community members as specified by cultural protocols'],
        ritualElements: ['Elements shared with community permission only']
      },
      storytellingTechniques: {
        voiceWork: ['Techniques shared with community approval'],
        bodyLanguage: ['Gestures appropriate for cultural context'],
        props: ['Traditional items used with community permission'],
        environmentalElements: ['Natural elements significant to the community']
      },
      culturalProtocols: {
        permissions: ['Explicit community approval required', 'Cultural liaison involvement mandatory'],
        restrictions: ['Sacred elements not for public sharing', 'Ceremonial aspects protected'],
        respectfulPractices: ['Community-defined respectful approaches'],
        collaborationRequirements: ['Ongoing community partnership', 'Benefit sharing with community']
      },
      modernAdaptation: {
        preservedElements: ['Core cultural values and teachings'],
        adaptedElements: ['Format adaptations for modern children'],
        technologyIntegration: ['Community-approved digital elements'],
        educationalFramework: ['Age-appropriate cultural education']
      }
    };
  }

  private buildNarrativeStructurePrompt(
    modernStory: any,
    traditionalStructure: TraditionalNarrativeStructure,
    targetAudience: { age: number; culturalBackground: string[] }
  ): string {
    return `
Integrate traditional narrative structure into modern story:

Modern Story: ${JSON.stringify(modernStory, null, 2)}
Traditional Structure: ${JSON.stringify(traditionalStructure, null, 2)}
Target Audience: Age ${targetAudience.age}, Cultural Background: ${targetAudience.culturalBackground.join(', ')}

Please restructure the modern story to follow the traditional narrative pattern while:
1. Preserving the original story's core message and appeal
2. Maintaining cultural authenticity and respect
3. Creating appropriate audience participation opportunities
4. Ensuring age-appropriate content and engagement
5. Providing cultural education about the storytelling tradition
6. Demonstrating how traditional structures enhance modern stories

Respond with JSON format:
{
  "restructuredStory": "the story adapted to traditional structure",
  "traditionalElements": ["traditional elements successfully integrated"],
  "audienceParticipationPoints": [
    {
      "position": "where in story",
      "type": "type of participation",
      "instruction": "how audience participates",
      "culturalSignificance": "why this participation matters"
    }
  ],
  "culturalEducation": ["what children learn about the tradition"],
  "preservationAchieved": ["how this helps preserve the tradition"]
}
    `;
  }

  private buildMythologyIntegrationPrompt(mythology: string, culturalOrigin: string[], modernStoryContext: any): string {
    return `
Respectfully integrate cultural mythology into modern story:

Mythology: ${mythology}
Cultural Origin: ${culturalOrigin.join(', ')}
Modern Story Context: ${JSON.stringify(modernStoryContext, null, 2)}

IMPORTANT: This integration requires community collaboration and approval.

Please provide guidance on:
1. Respectful ways to reference mythological elements
2. Appropriate contexts for integration
3. Required community collaboration steps
4. Educational value for children
5. Cultural sensitivity considerations
6. Modern adaptations that preserve meaning

Respond with JSON format:
{
  "mythology": "${mythology}",
  "culturalOrigin": ${JSON.stringify(culturalOrigin)},
  "coreMyths": [
    {
      "name": "myth name",
      "significance": "cultural significance",
      "keyElements": ["important elements"],
      "moralLessons": ["lessons taught"],
      "modernRelevance": "relevance to modern children"
    }
  ],
  "respectfulAdaptation": {
    "guidelines": ["how to adapt respectfully"],
    "taboos": ["what to avoid"],
    "appropriateContexts": ["when integration is appropriate"],
    "collaborationRequirements": ["required community involvement"]
  },
  "educationalValue": ["what children learn"],
  "childFriendlyVersions": [
    {
      "ageGroup": "age range",
      "adaptations": ["age-appropriate adaptations"],
      "focusPoints": ["key learning points"]
    }
  ]
}
    `;
  }

  private buildCelebrationTemplatePrompt(celebrations: string[], culturalCommunityInput: any): string {
    return `
Create cultural celebration story templates with community input:

Celebrations: ${celebrations.join(', ')}
Community Input: ${JSON.stringify(culturalCommunityInput, null, 2)}

Please create templates that:
1. Honor cultural authenticity and community input
2. Provide educational value about celebrations
3. Are accessible to children from all backgrounds
4. Include respectful representation guidelines
5. Offer modern adaptations while preserving meaning
6. Require community validation for accuracy

Respond with JSON format:
{
  "templates": [
    {
      "celebration": "celebration name",
      "culturalOrigin": "origin culture",
      "storyElements": ["story elements to include"],
      "educationalPoints": ["what children learn"],
      "respectfulRepresentation": ["how to represent respectfully"],
      "communityInput": "how community input was incorporated"
    }
  ],
  "communityValidation": {
    "celebration_name": true/false
  },
  "respectfulRepresentation": ["overall guidelines for respectful representation"],
  "educationalValue": ["overall educational benefits"]
}
    `;
  }

  private buildCommunityDocumentationPrompt(community: string, geographicOrigin: string[]): string {
    return `
Document community storytelling traditions with community participation:

Community: ${community}
Geographic Origin: ${geographicOrigin.join(', ')}

Please create documentation framework that:
1. Respects community ownership of traditions
2. Requires active community participation
3. Preserves authentic storytelling methods
4. Identifies preservation priorities
5. Creates educational integration strategies
6. Supports community-led preservation efforts

Respond with JSON format:
{
  "community": "${community}",
  "geographicOrigin": ${JSON.stringify(geographicOrigin)},
  "traditionName": "name of the storytelling tradition",
  "communityRole": {
    "storytellers": ["roles of storytellers in community"],
    "audienceParticipation": ["how audience participates"],
    "settingImportance": "importance of setting/location",
    "seasonalAspects": ["seasonal or timing aspects"]
  },
  "preservationEfforts": {
    "currentStatus": "thriving|declining|endangered|revitalization",
    "preservationMethods": ["current preservation efforts"],
    "communityInvolvement": ["how community is involved"],
    "documentationNeeds": ["what documentation is needed"]
  },
  "modernRelevance": {
    "educationalValue": ["educational benefits"],
    "culturalContinuity": ["how it maintains cultural continuity"],
    "communityBuilding": ["community building aspects"],
    "childDevelopment": ["benefits for child development"]
  },
  "integrationStrategies": {
    "schoolPrograms": ["integration into educational programs"],
    "familyActivities": ["family-based activities"],
    "communityEvents": ["community event integration"],
    "digitalPreservation": ["digital preservation methods"]
  }
}
    `;
  }

  private buildTraditionDocumentationPrompt(
    tradition: string,
    culturalContext: string[],
    communityCollaboration: any
  ): string {
    return `
Create comprehensive tradition documentation with community collaboration:

Tradition: ${tradition}
Cultural Context: ${culturalContext.join(', ')}
Community Collaboration: ${JSON.stringify(communityCollaboration, null, 2)}

Please create documentation that:
1. Respects community ownership and permissions
2. Preserves authentic traditional elements
3. Provides comprehensive preservation plan
4. Ensures accessibility for different age groups
5. Maintains cultural sensitivity throughout
6. Supports long-term preservation goals

Respond with JSON format:
{
  "tradition": "${tradition}",
  "culturalContext": ${JSON.stringify(culturalContext)},
  "documentation": {
    "oralHistory": {
      "interviews": ["types of interviews needed"],
      "recordings": ["recording requirements"],
      "transcriptions": ["transcription needs"]
    },
    "practicalElements": {
      "techniques": ["storytelling techniques"],
      "props": ["traditional props used"],
      "settings": ["traditional settings"],
      "timing": ["timing and seasonal aspects"]
    },
    "culturalContext": {
      "significance": ["cultural significance"],
      "taboos": ["cultural taboos to respect"],
      "protocols": ["cultural protocols to follow"],
      "permissions": ["permissions required"]
    }
  },
  "preservationPlan": {
    "immediateActions": ["immediate preservation actions"],
    "longTermGoals": ["long-term preservation goals"],
    "communityInvolvement": ["ongoing community involvement"],
    "educationalIntegration": ["educational integration plans"]
  },
  "accessibilityConsiderations": {
    "ageAppropriate": {
      "3-5": ["adaptations for ages 3-5"],
      "6-8": ["adaptations for ages 6-8"],
      "9-12": ["adaptations for ages 9-12"]
    },
    "culturalSensitivity": ["cultural sensitivity considerations"],
    "modernAdaptations": ["modern adaptation possibilities"]
  }
}
    `;
  }

  private buildCulturalValidationPrompt(
    adaptation: any,
    originalTradition: string,
    culturalContext: string[],
    communityReview: boolean
  ): string {
    return `
Validate cultural appropriateness of storytelling adaptation:

Adaptation: ${JSON.stringify(adaptation, null, 2)}
Original Tradition: ${originalTradition}
Cultural Context: ${culturalContext.join(', ')}
Community Review Available: ${communityReview}

Please evaluate:
1. Cultural appropriateness and sensitivity
2. Authenticity preservation
3. Respectful representation
4. Community approval requirements
5. Potential concerns or issues
6. Recommendations for improvement

Respond with JSON format:
{
  "appropriate": true/false,
  "concerns": ["specific concerns about the adaptation"],
  "recommendations": ["recommendations for improvement"],
  "communityApprovalRequired": true/false,
  "respectfulAlternatives": ["alternative approaches if needed"]
}
    `;
  }
}