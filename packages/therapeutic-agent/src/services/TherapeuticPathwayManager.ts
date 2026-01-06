import { 
  TherapeuticPathway, 
  TherapeuticCondition, 
  EvidenceSource, 
  TherapeuticStoryElement,
  ProgressMarker,
  ParentGuidanceProtocol,
  ConsentLevel,
  ADHDAdaptation,
  AutismAdaptation,
  TraumaInformedApproach
} from '../types';

export class TherapeuticPathwayManager {
  private pathways: Map<string, TherapeuticPathway> = new Map();

  constructor() {
    this.initializeEvidenceBasedPathways();
  }

  private initializeEvidenceBasedPathways(): void {
    // Anxiety pathway based on CBT principles
    this.pathways.set('anxiety-cbt', {
      id: 'anxiety-cbt',
      name: 'Cognitive Behavioral Therapy for Childhood Anxiety',
      targetCondition: 'anxiety',
      ageRange: { min: 4, max: 12 },
      evidenceBase: [
        {
          type: 'meta_analysis',
          title: 'Cognitive-behavioral therapy for anxiety disorders in children and adolescents',
          authors: ['James, A.C.', 'James, G.', 'Cowdrey, F.A.', 'Soler, A.', 'Choke, A.'],
          year: 2015,
          doi: '10.1002/14651858.CD004690.pub4',
          summary: 'CBT shows significant effectiveness in treating childhood anxiety disorders',
          relevanceScore: 0.95
        },
        {
          type: 'clinical_guideline',
          title: 'NICE Guidelines: Social anxiety disorder in children and young people',
          authors: ['NICE'],
          year: 2022,
          summary: 'Evidence-based recommendations for treating social anxiety in children',
          relevanceScore: 0.90
        }
      ],
      storyElements: [
        {
          type: 'character_trait',
          name: 'brave_but_worried_protagonist',
          description: 'A character who feels worried but learns to be brave',
          therapeuticPurpose: 'Normalize anxiety while promoting courage and coping',
          ageAdaptations: {
            '4-6': 'Simple animal character with basic worries',
            '7-9': 'Child character with school-related anxieties',
            '10-12': 'Adolescent character with social anxieties'
          },
          culturalConsiderations: ['Family support systems', 'Cultural expressions of worry'],
          contraindications: ['Severe trauma history without proper assessment']
        },
        {
          type: 'coping_strategy',
          name: 'deep_breathing_technique',
          description: 'Teaching breathing exercises through story narrative',
          therapeuticPurpose: 'Provide concrete anxiety management tool',
          ageAdaptations: {
            '4-6': 'Balloon breathing with animal sounds',
            '7-9': 'Counting breaths with story character',
            '10-12': 'Box breathing technique integrated into plot'
          },
          culturalConsiderations: ['Meditation traditions', 'Religious breathing practices']
        },
        {
          type: 'plot_device',
          name: 'gradual_exposure',
          description: 'Character gradually faces fears in manageable steps',
          therapeuticPurpose: 'Model systematic desensitization approach',
          ageAdaptations: {
            '4-6': 'Small steps with immediate rewards',
            '7-9': 'Clear progression with celebration of achievements',
            '10-12': 'Complex challenges with peer support'
          },
          culturalConsiderations: ['Cultural attitudes toward fear and courage']
        }
      ],
      progressMarkers: [
        {
          id: 'anxiety-reduction',
          name: 'Anxiety Level Reduction',
          description: 'Measurable decrease in reported anxiety levels',
          measurableOutcome: 'Self-reported anxiety score decreases by 25%',
          timeframe: 'after 4 sessions',
          assessmentMethod: 'child_self_report',
          targetValue: 25,
          criticalThreshold: 0 // No improvement after 4 sessions
        },
        {
          id: 'coping-skill-usage',
          name: 'Coping Skills Application',
          description: 'Child demonstrates use of learned coping strategies',
          measurableOutcome: 'Uses breathing technique when anxious',
          timeframe: 'within 2 weeks',
          assessmentMethod: 'parent_report',
          targetValue: 'weekly usage',
          criticalThreshold: 'no usage after 3 weeks'
        }
      ],
      parentGuidance: {
        preStoryBriefing: 'This story will help your child learn about managing worried feelings. Your child may relate to the character\'s experiences.',
        postStoryDiscussion: [
          'Ask: "How did the character feel when they were worried?"',
          'Practice: "Let\'s try the breathing technique together"',
          'Validate: "It\'s normal to feel worried sometimes"',
          'Encourage: "You can be brave even when you feel worried"'
        ],
        warningSignsToWatch: [
          'Increased avoidance behaviors',
          'Physical symptoms (headaches, stomachaches)',
          'Sleep disturbances',
          'Regression in previously mastered skills'
        ],
        followUpActivities: [
          'Practice breathing exercises daily',
          'Create a "worry box" for concerns',
          'Gradual exposure to feared situations',
          'Praise brave behaviors, even small ones'
        ],
        whenToSeekProfessionalHelp: [
          'Anxiety interferes with daily activities',
          'Child expresses hopelessness',
          'Physical symptoms persist',
          'Family functioning is significantly impacted'
        ],
        resourceLinks: [
          {
            title: 'Anxiety and Depression Association of America - Children',
            url: 'https://adaa.org/living-with-anxiety/children',
            type: 'article',
            ageAppropriate: false
          }
        ]
      },
      requiredConsent: 'enhanced'
    });

    // Grief pathway based on attachment theory and developmental considerations
    this.pathways.set('grief-attachment', {
      id: 'grief-attachment',
      name: 'Attachment-Based Grief Support for Children',
      targetCondition: 'grief',
      ageRange: { min: 3, max: 12 },
      evidenceBase: [
        {
          type: 'research_study',
          title: 'Attachment-based family therapy for depressed adolescents',
          authors: ['Diamond, G.S.', 'Reis, B.F.', 'Diamond, G.M.'],
          year: 2003,
          summary: 'Attachment-based approaches show effectiveness in treating grief and depression',
          relevanceScore: 0.88
        }
      ],
      storyElements: [
        {
          type: 'character_trait',
          name: 'loving_memory_keeper',
          description: 'Character who keeps memories of loved ones alive',
          therapeuticPurpose: 'Normalize grief while maintaining connection to deceased',
          ageAdaptations: {
            '3-5': 'Simple animal who misses friend but remembers happy times',
            '6-8': 'Child who creates memory book of special person',
            '9-12': 'Character who finds ways to honor deceased through actions'
          },
          culturalConsiderations: ['Cultural mourning practices', 'Religious beliefs about death', 'Family traditions']
        },
        {
          type: 'metaphor',
          name: 'love_continues',
          description: 'Love persists even when someone is no longer physically present',
          therapeuticPurpose: 'Provide comfort and continuity of relationship',
          ageAdaptations: {
            '3-5': 'Love lives in heart like warm sunshine',
            '6-8': 'Love is like stars - always there even when we can\'t see them',
            '9-12': 'Love creates lasting impact through memories and values'
          },
          culturalConsiderations: ['Spiritual beliefs', 'Cultural metaphors for death']
        }
      ],
      progressMarkers: [
        {
          id: 'emotional-expression',
          name: 'Healthy Emotional Expression',
          description: 'Child expresses grief emotions appropriately',
          measurableOutcome: 'Talks about feelings related to loss',
          timeframe: 'after 3 sessions',
          assessmentMethod: 'behavioral_observation',
          targetValue: 'regular expression',
          criticalThreshold: 'complete emotional shutdown'
        }
      ],
      parentGuidance: {
        preStoryBriefing: 'This story addresses loss and grief in an age-appropriate way. Your child may have questions or strong emotions.',
        postStoryDiscussion: [
          'Validate all emotions: "All feelings about loss are okay"',
          'Share memories: "Tell me about a happy memory with [person]"',
          'Maintain connection: "How can we keep [person] in our hearts?"'
        ],
        warningSignsToWatch: [
          'Persistent denial of death',
          'Extreme behavioral changes',
          'Self-blame or guilt',
          'Persistent sleep or appetite changes'
        ],
        followUpActivities: [
          'Create memory scrapbook together',
          'Visit meaningful places when appropriate',
          'Maintain family traditions',
          'Allow for ongoing conversations about the deceased'
        ],
        whenToSeekProfessionalHelp: [
          'Complicated grief lasting more than 6 months',
          'Suicidal thoughts or expressions',
          'Severe depression symptoms',
          'Inability to function in daily activities'
        ],
        resourceLinks: [
          {
            title: 'National Alliance for Grieving Children',
            url: 'https://childrengrieve.org',
            type: 'professional_directory',
            ageAppropriate: false
          }
        ]
      },
      requiredConsent: 'enhanced'
    });

    // Social skills pathway based on social learning theory
    this.pathways.set('social-skills-learning', {
      id: 'social-skills-learning',
      name: 'Social Learning Theory-Based Social Skills Development',
      targetCondition: 'social_skills',
      ageRange: { min: 4, max: 12 },
      evidenceBase: [
        {
          type: 'research_study',
          title: 'Social skills training for children and adolescents with autism spectrum disorders',
          authors: ['Reichow, B.', 'Steiner, A.M.', 'Volkmar, F.'],
          year: 2013,
          summary: 'Social skills training shows moderate effectiveness across populations',
          relevanceScore: 0.82
        }
      ],
      storyElements: [
        {
          type: 'plot_device',
          name: 'friendship_building',
          description: 'Character learns to make and maintain friendships',
          therapeuticPurpose: 'Model appropriate social interactions and relationship skills',
          ageAdaptations: {
            '4-6': 'Simple sharing and turn-taking scenarios',
            '7-9': 'Complex peer interactions and conflict resolution',
            '10-12': 'Navigating social hierarchies and group dynamics'
          },
          culturalConsiderations: ['Cultural norms for social interaction', 'Family social values']
        }
      ],
      progressMarkers: [
        {
          id: 'peer-interaction',
          name: 'Positive Peer Interactions',
          description: 'Increased positive social interactions with peers',
          measurableOutcome: 'Initiates social interaction at least once per day',
          timeframe: 'within 3 weeks',
          assessmentMethod: 'parent_report',
          targetValue: 'daily interaction',
          criticalThreshold: 'no peer interaction after 4 weeks'
        }
      ],
      parentGuidance: {
        preStoryBriefing: 'This story focuses on building friendship skills and social confidence.',
        postStoryDiscussion: [
          'Role-play: Practice the social skills from the story',
          'Identify: "What made the character a good friend?"',
          'Plan: "How can you be a good friend tomorrow?"'
        ],
        warningSignsToWatch: [
          'Increased social withdrawal',
          'Aggressive responses to social situations',
          'Persistent rejection by peers',
          'Extreme social anxiety'
        ],
        followUpActivities: [
          'Arrange structured playdates',
          'Practice social skills through games',
          'Model positive social interactions',
          'Celebrate social successes'
        ],
        whenToSeekProfessionalHelp: [
          'Persistent social isolation',
          'Aggressive behavior toward peers',
          'Signs of bullying (as victim or perpetrator)',
          'Significant impact on school functioning'
        ],
        resourceLinks: []
      },
      requiredConsent: 'standard'
    });

    // Self-esteem pathway based on positive psychology
    this.pathways.set('self-esteem-positive', {
      id: 'self-esteem-positive',
      name: 'Positive Psychology-Based Self-Esteem Building',
      targetCondition: 'self_esteem',
      ageRange: { min: 5, max: 12 },
      evidenceBase: [
        {
          type: 'research_study',
          title: 'Positive psychology interventions for children and adolescents',
          authors: ['Seligman, M.E.P.', 'Ernst, R.M.', 'Gillham, J.'],
          year: 2009,
          summary: 'Positive psychology interventions effectively build resilience and self-esteem',
          relevanceScore: 0.87
        }
      ],
      storyElements: [
        {
          type: 'character_trait',
          name: 'growth_mindset_hero',
          description: 'Character who learns from mistakes and celebrates effort',
          therapeuticPurpose: 'Promote growth mindset and resilience',
          ageAdaptations: {
            '5-7': 'Character who tries again after falling down',
            '8-10': 'Character who learns new skills through practice',
            '11-12': 'Character who overcomes challenges through persistence'
          },
          culturalConsiderations: ['Cultural values around achievement', 'Family expectations']
        }
      ],
      progressMarkers: [
        {
          id: 'self-confidence',
          name: 'Increased Self-Confidence',
          description: 'Child demonstrates increased confidence in abilities',
          measurableOutcome: 'Attempts new activities without excessive fear',
          timeframe: 'after 5 sessions',
          assessmentMethod: 'behavioral_observation',
          targetValue: 'weekly new attempts',
          criticalThreshold: 'increased avoidance of challenges'
        }
      ],
      parentGuidance: {
        preStoryBriefing: 'This story helps build your child\'s confidence and self-worth.',
        postStoryDiscussion: [
          'Praise effort: "I noticed how hard you tried"',
          'Identify strengths: "What are you good at?"',
          'Encourage growth: "What would you like to learn next?"'
        ],
        warningSignsToWatch: [
          'Persistent negative self-talk',
          'Avoidance of all challenges',
          'Extreme perfectionism',
          'Comparison with others leading to distress'
        ],
        followUpActivities: [
          'Create a strengths journal',
          'Set achievable goals together',
          'Celebrate small victories',
          'Practice positive self-talk'
        ],
        whenToSeekProfessionalHelp: [
          'Persistent feelings of worthlessness',
          'Self-harm behaviors',
          'Severe perfectionism interfering with functioning',
          'Depression symptoms'
        ],
        resourceLinks: []
      },
      requiredConsent: 'standard'
    });
  }

  getPathway(pathwayId: string): TherapeuticPathway | undefined {
    return this.pathways.get(pathwayId);
  }

  getPathwaysForCondition(condition: TherapeuticCondition): TherapeuticPathway[] {
    return Array.from(this.pathways.values()).filter(
      pathway => pathway.targetCondition === condition
    );
  }

  getPathwaysForAge(age: number): TherapeuticPathway[] {
    return Array.from(this.pathways.values()).filter(
      pathway => age >= pathway.ageRange.min && age <= pathway.ageRange.max
    );
  }

  getAllPathways(): TherapeuticPathway[] {
    return Array.from(this.pathways.values());
  }

  addCustomPathway(pathway: TherapeuticPathway): void {
    this.pathways.set(pathway.id, pathway);
  }

  getTraumaInformedAdaptations(): TraumaInformedApproach {
    return {
      safetyFirst: true,
      trustworthiness: true,
      peerSupport: true,
      collaboration: true,
      empowerment: true,
      culturalHumility: true,
      genderResponsive: true
    };
  }

  getADHDAdaptations(age: number): ADHDAdaptation {
    return {
      shortenedSessions: age < 8,
      frequentBreaks: true,
      visualCues: true,
      movementIntegration: age < 10,
      clearStructure: true,
      immediateRewards: true,
      sensoryConsiderations: [
        'Reduce overwhelming stimuli',
        'Provide fidget options',
        'Consider lighting and sound',
        'Allow movement breaks'
      ]
    };
  }

  getAutismAdaptations(specialInterests: string[] = []): AutismAdaptation {
    return {
      predictableRoutines: true,
      sensoryAccommodations: [
        'Adjust volume levels',
        'Provide visual schedules',
        'Consider texture preferences',
        'Allow sensory breaks'
      ],
      visualSupports: true,
      socialStoryFormat: true,
      specialInterests,
      communicationStyle: 'concrete',
      transitionSupport: true
    };
  }

  validatePathwayForChild(
    pathwayId: string, 
    age: number, 
    conditions: string[] = [],
    contraindications: string[] = []
  ): { valid: boolean; reasons: string[] } {
    const pathway = this.getPathway(pathwayId);
    if (!pathway) {
      return { valid: false, reasons: ['Pathway not found'] };
    }

    const reasons: string[] = [];

    // Check age appropriateness
    if (age < pathway.ageRange.min || age > pathway.ageRange.max) {
      reasons.push(`Age ${age} is outside recommended range ${pathway.ageRange.min}-${pathway.ageRange.max}`);
    }

    // Check contraindications
    if (pathway.contraindications) {
      const conflicts = pathway.contraindications.filter(contra => 
        contraindications.some(child => child.toLowerCase().includes(contra.toLowerCase()))
      );
      if (conflicts.length > 0) {
        reasons.push(`Contraindications present: ${conflicts.join(', ')}`);
      }
    }

    return {
      valid: reasons.length === 0,
      reasons
    };
  }
}