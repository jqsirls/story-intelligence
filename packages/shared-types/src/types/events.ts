// Event types for EventBridge/Supabase Realtime
export type EventType = 
  | 'story.created'
  | 'story.finalized'
  | 'character.created'
  | 'character.updated'
  | 'emotion.recorded'
  | 'subscription.created'
  | 'subscription.updated'
  | 'user.created'
  | 'library.created'
  | 'assets.generation.requested'
  | 'assets.generation.completed';

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: string;
  source: string;
  correlationId: string;
  userId?: string;
}

export interface StoryEvent extends BaseEvent {
  type: 'story.created' | 'story.finalized';
  data: {
    storyId: string;
    libraryId: string;
    title: string;
    status: string;
  };
}

export interface CharacterEvent extends BaseEvent {
  type: 'character.created' | 'character.updated';
  data: {
    characterId: string;
    storyId: string;
    name: string;
    changes?: Record<string, any>;
  };
}

export interface EmotionEvent extends BaseEvent {
  type: 'emotion.recorded';
  data: {
    emotionId: string;
    mood: string;
    confidence: number;
    libraryId?: string;
  };
}

export interface AssetGenerationEvent extends BaseEvent {
  type: 'assets.generation.requested' | 'assets.generation.completed';
  data: {
    storyId: string;
    assetTypes: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    urls?: Record<string, string>;
  };
}

export type Event = StoryEvent | CharacterEvent | EmotionEvent | AssetGenerationEvent;