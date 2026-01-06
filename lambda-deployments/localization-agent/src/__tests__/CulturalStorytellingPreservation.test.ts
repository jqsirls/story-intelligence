import { CulturalStorytellingPreservation } from '../services/CulturalStorytellingPreservation';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('openai');

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  upsert: jest.fn().mockReturnThis()
};

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);
(OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);

describe('CulturalStorytellingPreservation', () => {
  let preservation: CulturalStorytellingPreservation;

  beforeEach(() => {
    jest.clearAllMocks();
    preservation = new CulturalStorytellingPreservation(mockSupabase as any, mockOpenAI as any);
  });

  describe('integrateTraditionalNarrativeStructure', () => {
    it('should integrate traditional narrative structure into modern stories', async () => {
      const mockResponse = {
        restructuredStory: 'Once upon a time, in a land where stories come alive...',
        traditionalElements: ['Call-and-response opening', 'Rhythmic storytelling', 'Community wisdom'],
        audienceParticipationPoints: [
          {
            position: 'Opening',
            type: 'call_response',
            instruction: 'Children respond with "We are listening!"',
            culturalSignificance: 'Establishes community connection in African tradition'
          }
        ],
        culturalEducation: ['Learn about African storytelling traditions', 'Understand community participation'],
        preservationAchieved: ['Maintains oral tradition structure', 'Teaches cultural values']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const modernStory = { title: 'The Magic Forest', content: 'A modern adventure story' };
      const traditionalStructure = {
        name: 'African Call-and-Response',
        culturalOrigin: ['West African'],
        structureType: 'call_response' as const,
        phases: [],
        audienceParticipation: [],
        culturalSignificance: 'Community storytelling',
        preservationPriority: 'critical' as const
      };
      const targetAudience = { age: 7, culturalBackground: ['African', 'American'] };

      const result = await preservation.integrateTraditionalNarrativeStructure(
        modernStory,
        traditionalStructure,
        targetAudience
      );

      expect(result.restructuredStory).toContain('Once upon a time');
      expect(result.traditionalElements).toContain('Call-and-response opening');
      expect(result.audienceParticipationPoints).toHaveLength(1);
      expect(result.culturalEducation).toContain('Learn about African storytelling traditions');
    });
  });

  describe('recognizeOralTraditionPatterns', () => {
    it('should recognize oral tradition patterns for given cultures', async () => {
      const result = await preservation.recognizeOralTraditionPatterns(
        ['african', 'indigenous_american'],
        { title: 'Test Story', content: 'Story content' }
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      
      const africanPattern = result.find(p => p.tradition === 'African Oral Storytelling');
      expect(africanPattern).toBeDefined();
      expect(africanPattern?.oralElements.rhythm).toContain('rhythmic patterns');
      expect(africanPattern?.communityRole.storyteller).toContain('Griot');
    });

    it('should include preservation methods for each pattern', async () => {
      const result = await preservation.recognizeOralTraditionPatterns(['african'], {});
      
      const pattern = result[0];
      expect(pattern?.preservationMethods.traditional).toContain('Master-apprentice teaching');
      expect(pattern?.preservationMethods.modern).toContain('Audio recordings');
      expect(pattern?.preservationMethods.digital).toContain('Interactive storytelling apps');
    });
  });

  describe('integrateCulturalMythology', () => {
    it('should integrate cultural mythology with community approval', async () => {
      const mockResponse = {
        mythology: 'Anansi Stories',
        culturalOrigin: ['West African'],
        coreMyths: [
          {
            name: 'Anansi and the Wisdom Pot',
            significance: 'Teaches that wisdom should be shared',
            keyElements: ['Spider trickster', 'Wisdom pot', 'Community sharing'],
            moralLessons: ['Sharing knowledge benefits everyone'],
            modernRelevance: 'Importance of education and sharing knowledge'
          }
        ],
        respectfulAdaptation: {
          guidelines: ['Maintain core moral lessons', 'Respect cultural context'],
          taboos: ['Do not trivialize sacred elements'],
          appropriateContexts: ['Educational storytelling', 'Cultural celebration'],
          collaborationRequirements: ['Community elder approval', 'Cultural consultant involvement']
        },
        educationalValue: ['Cultural awareness', 'Moral development'],
        childFriendlyVersions: [
          {
            ageGroup: '6-8',
            adaptations: ['Simplified language', 'Visual aids'],
            focusPoints: ['Sharing is caring', 'Learning from others']
          }
        ]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await preservation.integrateCulturalMythology(
        'Anansi Stories',
        ['West African'],
        { storyType: 'educational', theme: 'wisdom' },
        true // community approval
      );

      expect(result.mythology).toBe('Anansi Stories');
      expect(result.coreMyths).toHaveLength(1);
      expect(result.respectfulAdaptation.guidelines).toContain('Maintain core moral lessons');
      expect(result.childFriendlyVersions).toHaveLength(1);
    });

    it('should require community collaboration approval', async () => {
      await expect(preservation.integrateCulturalMythology(
        'Sacred Stories',
        ['Indigenous'],
        {},
        false // no approval
      )).rejects.toThrow('Cultural mythology integration requires community collaboration and approval');
    });
  });

  describe('supportIndigenousStorytellingMethods', () => {
    it('should support indigenous methods with proper approvals', async () => {
      const result = await preservation.supportIndigenousStorytellingMethods(
        ['Lakota'],
        true, // community approval
        'Cultural Liaison Name'
      );

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      
      const method = result[0];
      expect(method.method).toBe('Lakota Traditional Storytelling');
      expect(method.culturalProtocols.permissions).toContain('Explicit community approval required');
      expect(method.culturalProtocols.collaborationRequirements).toContain('Ongoing community partnership');
    });

    it('should require community approval and cultural liaison', async () => {
      await expect(preservation.supportIndigenousStorytellingMethods(
        ['Tribe'],
        false, // no approval
        null // no liaison
      )).rejects.toThrow('Indigenous storytelling methods require explicit community approval and cultural liaison');
    });
  });

  describe('createCulturalCelebrationTemplates', () => {
    it('should create celebration templates with community input', async () => {
      const mockResponse = {
        templates: [
          {
            celebration: 'Diwali',
            culturalOrigin: 'Hindu/Indian',
            storyElements: ['Lights', 'Family gathering', 'Good over evil'],
            educationalPoints: ['Festival significance', 'Cultural values'],
            respectfulRepresentation: ['Accurate religious context', 'Family traditions'],
            communityInput: 'Incorporated elder feedback on traditional elements'
          }
        ],
        communityValidation: {
          'Diwali': true
        },
        respectfulRepresentation: ['Accurate cultural context', 'Avoid stereotypes'],
        educationalValue: ['Cultural awareness', 'Religious understanding']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await preservation.createCulturalCelebrationTemplates(
        ['Diwali'],
        { 'Diwali': { communityFeedback: 'Elder approval received' } }
      );

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].celebration).toBe('Diwali');
      expect(result.communityValidation.Diwali).toBe(true);
      expect(result.respectfulRepresentation).toContain('Accurate cultural context');
    });
  });

  describe('documentCommunityStorytellingTraditions', () => {
    it('should document community traditions with participation', async () => {
      const mockResponse = {
        community: 'Appalachian',
        geographicOrigin: ['Appalachian Mountains'],
        traditionName: 'Mountain Storytelling',
        communityRole: {
          storytellers: ['Community elders', 'Local historians'],
          audienceParticipation: ['Active listening', 'Question asking'],
          settingImportance: 'Front porch or community gathering spaces',
          seasonalAspects: ['Winter evening stories', 'Harvest time tales']
        },
        preservationEfforts: {
          currentStatus: 'declining',
          preservationMethods: ['Oral history projects', 'Community festivals'],
          communityInvolvement: ['Elder interviews', 'Youth education programs'],
          documentationNeeds: ['Audio recordings', 'Written transcriptions']
        },
        modernRelevance: {
          educationalValue: ['Local history', 'Cultural identity'],
          culturalContinuity: ['Maintains community bonds'],
          communityBuilding: ['Brings generations together'],
          childDevelopment: ['Listening skills', 'Cultural pride']
        },
        integrationStrategies: {
          schoolPrograms: ['Local history curriculum'],
          familyActivities: ['Family story nights'],
          communityEvents: ['Annual storytelling festival'],
          digitalPreservation: ['Online story archive']
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const result = await preservation.documentCommunityStorytellingTraditions(
        'Appalachian',
        ['Appalachian Mountains'],
        true // community participation
      );

      expect(result.community).toBe('Appalachian');
      expect(result.traditionName).toBe('Mountain Storytelling');
      expect(result.preservationEfforts.currentStatus).toBe('declining');
      expect(result.integrationStrategies.schoolPrograms).toContain('Local history curriculum');
    });

    it('should require community participation', async () => {
      await expect(preservation.documentCommunityStorytellingTraditions(
        'Community',
        ['Region'],
        false // no participation
      )).rejects.toThrow('Community storytelling tradition documentation requires active community participation');
    });
  });

  describe('createTraditionDocumentation', () => {
    it('should create comprehensive tradition documentation', async () => {
      const mockResponse = {
        tradition: 'Celtic Storytelling',
        culturalContext: ['Irish', 'Scottish'],
        documentation: {
          oralHistory: {
            interviews: ['Elder storyteller interviews'],
            recordings: ['Traditional story recordings'],
            transcriptions: ['Story text with performance notes']
          },
          practicalElements: {
            techniques: ['Voice modulation', 'Gesture use'],
            props: ['Traditional instruments', 'Story stones'],
            settings: ['Fireside gatherings', 'Community halls'],
            timing: ['Evening storytelling', 'Seasonal celebrations']
          },
          culturalContext: {
            significance: ['Cultural identity preservation'],
            taboos: ['Sacred story restrictions'],
            protocols: ['Respectful listening practices'],
            permissions: ['Community elder approval']
          }
        },
        preservationPlan: {
          immediateActions: ['Record elder storytellers'],
          longTermGoals: ['Establish storytelling school'],
          communityInvolvement: ['Youth apprenticeship program'],
          educationalIntegration: ['School curriculum inclusion']
        },
        accessibilityConsiderations: {
          ageAppropriate: {
            '3-5': ['Simple stories with repetition'],
            '6-8': ['Adventure stories with moral lessons'],
            '9-12': ['Complex narratives with historical context']
          },
          culturalSensitivity: ['Respect for sacred elements'],
          modernAdaptations: ['Digital storytelling formats']
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const communityCollaboration = {
        approved: true,
        collaborators: ['Elder Mary O\'Brien', 'Cultural Center Director'],
        permissions: ['Full documentation rights', 'Educational use approved']
      };

      const result = await preservation.createTraditionDocumentation(
        'Celtic Storytelling',
        ['Irish', 'Scottish'],
        communityCollaboration
      );

      expect(result.tradition).toBe('Celtic Storytelling');
      expect(result.documentation.oralHistory.interviews).toContain('Elder storyteller interviews');
      expect(result.preservationPlan.immediateActions).toContain('Record elder storytellers');
      expect(result.accessibilityConsiderations.ageAppropriate['6-8']).toContain('Adventure stories with moral lessons');
    });

    it('should require approved community collaboration', async () => {
      const invalidCollaboration = {
        approved: false,
        collaborators: [],
        permissions: []
      };

      await expect(preservation.createTraditionDocumentation(
        'Tradition',
        ['Culture'],
        invalidCollaboration
      )).rejects.toThrow('Tradition documentation requires approved community collaboration');
    });
  });

  describe('getTraditionalNarrativeStructures', () => {
    it('should return traditional narrative structures for cultures', async () => {
      const result = await preservation.getTraditionalNarrativeStructures(['african_oral', 'native_american_circular']);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2);
      
      const africanStructure = result.find(s => s.name === 'African Call-and-Response Storytelling');
      expect(africanStructure).toBeDefined();
      expect(africanStructure?.structureType).toBe('call_response');
      expect(africanStructure?.preservationPriority).toBe('critical');
      
      const nativeStructure = result.find(s => s.name === 'Native American Circular Storytelling');
      expect(nativeStructure).toBeDefined();
      expect(nativeStructure?.structureType).toBe('circular');
    });

    it('should include audience participation details', async () => {
      const result = await preservation.getTraditionalNarrativeStructures(['african_oral']);
      
      const structure = result[0];
      expect(structure.audienceParticipation).toBeInstanceOf(Array);
      expect(structure.audienceParticipation.length).toBeGreaterThan(0);
      expect(structure.audienceParticipation[0].type).toBe('call_response');
    });
  });

  describe('validateCulturalAppropriateness', () => {
    it('should validate cultural appropriateness of adaptations', async () => {
      const mockResponse = {
        appropriate: true,
        concerns: [],
        recommendations: ['Continue respectful approach', 'Maintain cultural context'],
        communityApprovalRequired: false,
        respectfulAlternatives: []
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const adaptation = {
        story: 'Adapted traditional tale',
        changes: ['Modern setting', 'Contemporary language']
      };

      const result = await preservation.validateCulturalAppropriateness(
        adaptation,
        'Traditional Folk Tale',
        ['European'],
        true
      );

      expect(result.appropriate).toBe(true);
      expect(result.recommendations).toContain('Continue respectful approach');
      expect(result.communityApprovalRequired).toBe(false);
    });

    it('should identify inappropriate adaptations', async () => {
      const mockResponse = {
        appropriate: false,
        concerns: ['Sacred elements trivialized', 'Cultural context lost'],
        recommendations: ['Consult community elders', 'Restore cultural context'],
        communityApprovalRequired: true,
        respectfulAlternatives: ['Focus on universal themes', 'Create inspired-by rather than direct adaptation']
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      });

      const inappropriateAdaptation = {
        story: 'Sacred story used for entertainment',
        changes: ['Removed spiritual elements', 'Added commercial elements']
      };

      const result = await preservation.validateCulturalAppropriateness(
        inappropriateAdaptation,
        'Sacred Traditional Story',
        ['Indigenous'],
        false
      );

      expect(result.appropriate).toBe(false);
      expect(result.concerns).toContain('Sacred elements trivialized');
      expect(result.communityApprovalRequired).toBe(true);
      expect(result.respectfulAlternatives).toContain('Focus on universal themes');
    });
  });

  describe('error handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(preservation.integrateTraditionalNarrativeStructure(
        {},
        {
          name: 'Test',
          culturalOrigin: [],
          structureType: 'linear',
          phases: [],
          audienceParticipation: [],
          culturalSignificance: '',
          preservationPriority: 'important'
        },
        { age: 6, culturalBackground: [] }
      )).rejects.toThrow('API Error');
    });

    it('should handle invalid JSON responses', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      });

      await expect(preservation.createCulturalCelebrationTemplates(['test'], {}))
        .rejects.toThrow();
    });
  });
});