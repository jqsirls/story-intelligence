import { Database, UserRole } from '@alexa-multi-agent/shared-types';

// Library-specific types
export interface Library {
  id: string;
  owner: string;
  name: string;
  parent_library: string | null;
  created_at: string;
  insights?: LibraryInsights;
  permissions?: LibraryPermission[];
  sub_libraries?: Library[];
}

export interface LibraryPermission {
  id: string;
  library_id: string;
  user_id: string;
  role: UserRole;
  granted_by: string;
  created_at: string;
}

export interface LibraryInsights {
  id: string;
  library_id: string;
  total_stories: number;
  total_characters: number;
  most_active_user: string | null;
  story_completion_rate: number;
  average_story_rating: number | null;
  popular_story_types: string[];
  emotional_patterns: EmotionalPattern[];
  usage_statistics: UsageStatistics;
  created_at: string;
  updated_at: string;
}

export interface EmotionalPattern {
  mood: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  time_period: string;
}

export interface UsageStatistics {
  daily_active_users: number;
  weekly_active_users: number;
  monthly_active_users: number;
  peak_usage_hours: number[];
  average_session_duration: number;
}

export interface LibraryCreateRequest {
  name: string;
  parent_library?: string;
}

export interface LibraryUpdateRequest {
  name?: string;
}

export interface LibrarySearchFilters {
  name?: string;
  owner?: string;
  parent_library?: string;
  has_stories?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface PermissionGrantRequest {
  user_id: string;
  role: UserRole;
}

export interface PermissionUpdateRequest {
  role: UserRole;
}

export interface StoryTransferRequest {
  story_id: string;
  target_library_id: string;
  transfer_message?: string;
}

export interface StoryTransferResponse {
  transfer_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  expires_at: string;
}

export interface CharacterShareRequest {
  character_id: string;
  target_library_id: string;
  share_type: 'copy' | 'reference';
}

export interface EmailService {
  sendStoryTransferRequestEmail(to: string, senderName: string, storyTitle: string, transferUrl: string, discountCode?: string): Promise<void>;
  sendStoryTransferSentEmail(to: string, senderName: string, recipientEmail: string, storyTitle: string): Promise<void>;
  sendStoryTransferAcceptedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
  sendStoryTransferRejectedEmail(to: string, recipientName: string, storyTitle: string): Promise<void>;
}

export interface LibraryAgentConfig {
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl?: string;
  enableInsights: boolean;
  insightsUpdateInterval: number; // minutes
  emailService?: EmailService;
  logger?: any;
}

export interface LibraryOperationContext {
  user_id: string;
  session_id?: string;
  correlation_id?: string;
  ip_address?: string;
  user_agent?: string;
}

// Error types
export class LibraryError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'LibraryError';
  }
}

export class PermissionError extends LibraryError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class COPPAComplianceError extends LibraryError {
  constructor(message: string) {
    super(message, 'COPPA_VIOLATION', 403);
    this.name = 'COPPAComplianceError';
  }
}

export class LibraryNotFoundError extends LibraryError {
  constructor(libraryId: string) {
    super(`Library not found: ${libraryId}`, 'LIBRARY_NOT_FOUND', 404);
    this.name = 'LibraryNotFoundError';
  }
}

export class StoryNotFoundError extends LibraryError {
  constructor(storyId: string) {
    super(`Story not found: ${storyId}`, 'STORY_NOT_FOUND', 404);
    this.name = 'StoryNotFoundError';
  }
}

export class CharacterNotFoundError extends LibraryError {
  constructor(characterId: string) {
    super(`Character not found: ${characterId}`, 'CHARACTER_NOT_FOUND', 404);
    this.name = 'CharacterNotFoundError';
  }
}

// Database types from shared-types
export type DatabaseLibrary = Database['public']['Tables']['libraries']['Row'];
export type DatabaseLibraryInsert = Database['public']['Tables']['libraries']['Insert'];
export type DatabaseLibraryUpdate = Database['public']['Tables']['libraries']['Update'];

export type DatabasePermission = Database['public']['Tables']['library_permissions']['Row'];
export type DatabasePermissionInsert = Database['public']['Tables']['library_permissions']['Insert'];
export type DatabasePermissionUpdate = Database['public']['Tables']['library_permissions']['Update'];

export type DatabaseStory = Database['public']['Tables']['stories']['Row'];
export type DatabaseStoryInsert = Database['public']['Tables']['stories']['Insert'];
export type DatabaseStoryUpdate = Database['public']['Tables']['stories']['Update'];

export type DatabaseCharacter = Database['public']['Tables']['characters']['Row'];
export type DatabaseCharacterInsert = Database['public']['Tables']['characters']['Insert'];
export type DatabaseCharacterUpdate = Database['public']['Tables']['characters']['Update'];