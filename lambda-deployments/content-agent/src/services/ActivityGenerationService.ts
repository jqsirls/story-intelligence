import { Logger } from 'winston';
import { RedisClientType } from 'redis';
import { GeneratedActivities, ActivityGenerationRequest } from './EducationalActivitiesService';

export class ActivityGenerationService {
  private readonly logger: Logger;
  // Parameters preserved for compatibility; not currently used in generation logic
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;
  private readonly eventBridge: any;
  private readonly redis: RedisClientType;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    eventBridge: any,
    redis: RedisClientType,
    logger: Logger
  ) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.eventBridge = eventBridge;
    this.redis = redis;
    this.logger = logger;
  }

  async generateActivities(request: ActivityGenerationRequest): Promise<GeneratedActivities> {
    // Lightweight, deterministic placeholder generator to keep builds green and enable downstream flows
    const story = request.story;
    const character = request.character;
    const targetAge = request.targetAge || 6;

    const beatsText = (story.content?.beats || []).map((b: any) => b.content).join(' ');
    const baseThemes: string[] = [story.content?.theme].filter(Boolean);

    const activity = (title: string, description: string, duration: string) => ({
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      description,
      type: 'creative_arts' as const,
      ageRange: { min: Math.max(2, targetAge - 1), max: targetAge + 2 },
      duration,
      materials: ['paper', 'crayons', 'safe scissors'],
      instructions: [
        'Talk about the story together',
        `Draw ${character.name} in a scene from the story`,
        'Share your favorite part'
      ],
      learningObjectives: ['story recall', 'fine motor', 'expression'],
      storyConnection: `Inspired by "${story.title}" (${story.content?.type})`,
      adaptations: {
        younger: 'Provide tracing outlines and larger tools',
        older: 'Add labels and short sentences describing the scene',
        specialNeeds: 'Offer extra time and alternative materials as needed'
      },
      safetyNotes: ['Supervise use of scissors'],
      parentTips: ['Ask open-ended questions about the drawing']
    });

    const activities = [
      activity('Story Scene Drawing', 'Illustrate a favorite moment from the story', '15-20 minutes'),
      activity('Character Collage', `Create a collage of ${character.name} using paper shapes`, '20-25 minutes'),
      activity('Act It Out!', 'Pretend to be the character and act a scene', '10-15 minutes'),
      activity('Soundtrack Time', 'Make simple sound effects that match story moments', '10 minutes')
    ];

    this.logger.info('Generated placeholder activities', {
      storyId: story.id,
      characterId: character.id,
      targetAge,
      beatCount: story.content?.beats?.length || 0,
      themes: baseThemes,
      textSample: beatsText.slice(0, 64)
    });

    return {
      activities,
      metadata: {
        storyId: story.id,
        characterId: character.id,
        targetAge,
        generatedAt: new Date().toISOString(),
        storyThemes: baseThemes,
        learningDomains: targetAge <= 5
          ? ['fine motor', 'language development', 'social-emotional']
          : ['literacy', 'creative expression', 'communication']
      }
    };
  }
}


