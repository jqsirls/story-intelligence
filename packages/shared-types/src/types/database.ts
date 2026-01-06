// Supabase database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          email_confirmed: boolean;
          parent_email: string | null;
          age: number | null;
          alexa_person_id: string | null;
          last_login_at: string | null;
          is_coppa_protected: boolean;
          parent_consent_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          email_confirmed?: boolean;
          parent_email?: string | null;
          age?: number | null;
          alexa_person_id?: string | null;
          last_login_at?: string | null;
          is_coppa_protected?: boolean;
          parent_consent_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          email_confirmed?: boolean;
          parent_email?: string | null;
          age?: number | null;
          alexa_person_id?: string | null;
          last_login_at?: string | null;
          is_coppa_protected?: boolean;
          parent_consent_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      libraries: {
        Row: {
          id: string;
          owner: string;
          name: string;
          parent_library: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner: string;
          name: string;
          parent_library?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner?: string;
          name?: string;
          parent_library?: string | null;
          created_at?: string;
        };
      };
      library_permissions: {
        Row: {
          id: string;
          library_id: string;
          user_id: string;
          role: string;
          granted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          library_id: string;
          user_id: string;
          role: string;
          granted_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          library_id?: string;
          user_id?: string;
          role?: string;
          granted_by?: string;
          created_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          library_id: string;
          title: string;
          content: any; // JSONB
          status: string;
          age_rating: number;
          created_at: string;
          finalized_at: string | null;
        };
        Insert: {
          id?: string;
          library_id: string;
          title: string;
          content: any;
          status?: string;
          age_rating: number;
          created_at?: string;
          finalized_at?: string | null;
        };
        Update: {
          id?: string;
          library_id?: string;
          title?: string;
          content?: any;
          status?: string;
          age_rating?: number;
          created_at?: string;
          finalized_at?: string | null;
        };
      };
      characters: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          traits: any; // JSONB
          appearance_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          traits: any;
          appearance_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          name?: string;
          traits?: any;
          appearance_url?: string | null;
          created_at?: string;
        };
      };
      emotions: {
        Row: {
          id: string;
          user_id: string;
          library_id: string | null;
          mood: string;
          confidence: number;
          context: any | null; // JSONB
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          library_id?: string | null;
          mood: string;
          confidence: number;
          context?: any | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          library_id?: string | null;
          mood?: string;
          confidence?: number;
          context?: any | null;
          created_at?: string;
          expires_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_subscription_id: string | null;
          plan_id: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_subscription_id?: string | null;
          plan_id: string;
          status: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stripe_subscription_id?: string | null;
          plan_id?: string;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          created_at?: string;
        };
      };
      media_assets: {
        Row: {
          id: string;
          story_id: string;
          asset_type: string;
          url: string;
          metadata: any | null; // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          asset_type: string;
          url: string;
          metadata?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          asset_type?: string;
          url?: string;
          metadata?: any | null;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          agent_name: string;
          action: string;
          payload: any; // JSONB
          session_id: string | null;
          correlation_id: string | null;
          pii_hash: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          agent_name: string;
          action: string;
          payload: any;
          session_id?: string | null;
          correlation_id?: string | null;
          pii_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          agent_name?: string;
          action?: string;
          payload?: any;
          session_id?: string | null;
          correlation_id?: string | null;
          pii_hash?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      audio_transcripts: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          transcript_text: string;
          audio_duration_seconds: number | null;
          language_code: string;
          confidence_score: number | null;
          metadata: any; // JSONB
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          transcript_text: string;
          audio_duration_seconds?: number | null;
          language_code?: string;
          confidence_score?: number | null;
          metadata?: any;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_id?: string;
          transcript_text?: string;
          audio_duration_seconds?: number | null;
          language_code?: string;
          confidence_score?: number | null;
          metadata?: any;
          created_at?: string;
          expires_at?: string;
        };
      };
      story_interactions: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          interaction_type: string;
          interaction_data: any; // JSONB
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          story_id: string;
          interaction_type: string;
          interaction_data?: any;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          story_id?: string;
          interaction_type?: string;
          interaction_data?: any;
          session_id?: string | null;
          created_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          voice_settings: any; // JSONB
          accessibility_settings: any; // JSONB
          content_preferences: any; // JSONB
          privacy_settings: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          voice_settings?: any;
          accessibility_settings?: any;
          content_preferences?: any;
          privacy_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          voice_settings?: any;
          accessibility_settings?: any;
          content_preferences?: any;
          privacy_settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      data_retention_policies: {
        Row: {
          id: string;
          table_name: string;
          retention_period: string; // PostgreSQL interval as string
          deletion_strategy: string;
          last_cleanup_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          retention_period: string;
          deletion_strategy: string;
          last_cleanup_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          retention_period?: string;
          deletion_strategy?: string;
          last_cleanup_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      alexa_user_mappings: {
        Row: {
          id: string;
          alexa_person_id: string;
          supabase_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          alexa_person_id: string;
          supabase_user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          alexa_person_id?: string;
          supabase_user_id?: string;
          created_at?: string;
        };
      };
      voice_codes: {
        Row: {
          id: string;
          email: string;
          code: string;
          expires_at: string;
          attempts: number;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code: string;
          expires_at: string;
          attempts?: number;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          code?: string;
          expires_at?: string;
          attempts?: number;
          used?: boolean;
          created_at?: string;
        };
      };
      conversation_states: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          state: any; // JSONB
          transcript_ids: string[];
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          state: any;
          transcript_ids?: string[];
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          state?: any;
          transcript_ids?: string[];
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      refresh_tokens: {
        Row: {
          id: string;
          token_hash: string;
          user_id: string;
          expires_at: string;
          revoked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_hash: string;
          user_id: string;
          expires_at: string;
          revoked?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          token_hash?: string;
          user_id?: string;
          expires_at?: string;
          revoked?: boolean;
          created_at?: string;
        };
      };
      auth_rate_limits: {
        Row: {
          id: string;
          identifier: string;
          action: string;
          attempts: number;
          window_start: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          identifier: string;
          action: string;
          attempts?: number;
          window_start?: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          identifier?: string;
          action?: string;
          attempts?: number;
          window_start?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      auth_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          alexa_person_id: string | null;
          device_type: string | null;
          ip_address: string | null;
          user_agent: string | null;
          expires_at: string;
          last_activity: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token: string;
          alexa_person_id?: string | null;
          device_type?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at: string;
          last_activity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          alexa_person_id?: string | null;
          device_type?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          expires_at?: string;
          last_activity?: string;
          created_at?: string;
        };
      };
    };
    Functions: {
      check_library_permission: {
        Args: {
          lib_id: string;
          required_role: string;
        };
        Returns: boolean;
      };
      check_library_permission_with_coppa: {
        Args: {
          lib_id: string;
          required_role: string;
        };
        Returns: boolean;
      };
      log_audit_event: {
        Args: {
          p_agent_name: string;
          p_action: string;
          p_payload: any;
          p_ip_address?: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      log_audit_event_enhanced: {
        Args: {
          p_agent_name: string;
          p_action: string;
          p_payload: any;
          p_session_id?: string;
          p_correlation_id?: string;
          p_ip_address?: string;
          p_user_agent?: string;
        };
        Returns: string;
      };
      check_coppa_compliance: {
        Args: {
          p_user_id: string;
          p_library_id: string;
        };
        Returns: boolean;
      };
      cleanup_expired_data: {
        Args: {};
        Returns: void;
      };
      cleanup_expired_data_enhanced: {
        Args: {};
        Returns: Array<{
          table_name: string;
          records_processed: number;
          action_taken: string;
        }>;
      };
      export_user_data: {
        Args: {
          p_user_id: string;
        };
        Returns: any; // JSONB
      };
      delete_user_data: {
        Args: {
          p_user_id: string;
          p_confirmation_token: string;
        };
        Returns: boolean;
      };
      increment_attempts: {
        Args: {};
        Returns: number;
      };
      cleanup_voice_codes: {
        Args: {};
        Returns: number;
      };
      cleanup_refresh_tokens: {
        Args: {};
        Returns: number;
      };
      revoke_user_tokens: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      get_user_active_tokens: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
      check_rate_limit: {
        Args: {
          p_identifier: string;
          p_action: string;
          p_max_attempts: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
      reset_rate_limit: {
        Args: {
          p_identifier: string;
          p_action: string;
        };
        Returns: boolean;
      };
      cleanup_auth_sessions: {
        Args: {};
        Returns: number;
      };
      revoke_user_sessions: {
        Args: {
          p_user_id: string;
        };
        Returns: number;
      };
    };
  };
}

// Additional types for enhanced database functionality

export type UserRole = 'Owner' | 'Admin' | 'Editor' | 'Viewer';

// Note: StoryStatus is defined in types/story.ts

export type MoodType = 'happy' | 'sad' | 'scared' | 'angry' | 'neutral';

export type AssetType = 'audio' | 'image' | 'pdf' | 'activity';

export type InteractionType = 'created' | 'viewed' | 'edited' | 'shared' | 'completed';

export type DeletionStrategy = 'hard_delete' | 'soft_delete' | 'anonymize';

// COPPA compliance types
export interface COPPAComplianceCheck {
  isProtected: boolean;
  requiresParentConsent: boolean;
  parentConsentVerified: boolean;
  canCreateContent: boolean;
}

// Database-specific voice settings (different from conversation VoiceSettings)
export interface DatabaseVoiceSettings {
  voice: string;
  speed: number;
  emotion: 'excited' | 'calm' | 'mysterious' | 'gentle';
  volume: number;
  clarity: 'high' | 'medium' | 'low';
}

// Database-specific accessibility settings (different from conversation AccessibilitySettings)
export interface DatabaseAccessibilitySettings {
  speechProcessingDelay: number;
  vocabularyLevel: 'simple' | 'standard' | 'advanced';
  attentionSpan: number;
  preferredInteractionStyle: 'brief' | 'detailed' | 'visual';
  assistiveTechnology: string[];
  communicationAdaptations: string[];
}

// Content preferences
export interface ContentPreferences {
  preferredStoryTypes: string[];
  ageAppropriateContent: boolean;
  culturalConsiderations: string[];
  languagePreferences: string[];
}

// Privacy settings
export interface PrivacySettings {
  dataRetentionPreference: 'minimal' | 'standard' | 'extended';
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
  shareWithEducators: boolean;
}

// Note: CharacterTraits and InclusivityTrait are defined in types/character.ts

// Story content structure
// Note: StoryContent, StoryChapter, and StoryChoice are defined in types/story.ts

// Emotion context structure
export interface EmotionContext {
  sessionId: string;
  storyId?: string;
  interactionType: string;
  triggers?: string[];
  notes?: string;
  parentalContext?: boolean;
}

// Audit event payload structure
export interface AuditEventPayload {
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
}

// Data export structure for GDPR compliance
export interface UserDataExport {
  profile: Database['public']['Tables']['users']['Row'];
  preferences?: Database['public']['Tables']['user_preferences']['Row'];
  owned_libraries: Database['public']['Tables']['libraries']['Row'][];
  stories: Database['public']['Tables']['stories']['Row'][];
  emotions: Database['public']['Tables']['emotions']['Row'][];
  subscriptions: Database['public']['Tables']['subscriptions']['Row'][];
  story_interactions: Database['public']['Tables']['story_interactions']['Row'][];
  export_metadata: {
    exported_at: string;
    export_version: string;
    compliance_note: string;
  };
}

// Data retention policy result
export interface DataRetentionResult {
  table_name: string;
  records_processed: number;
  action_taken: DeletionStrategy;
}

// Conversation state structure
export interface ConversationState {
  sessionId: string;
  userId: string;
  currentPhase: 'character' | 'story' | 'editing' | 'finalization';
  storyId?: string;
  characterIds: string[];
  conversationHistory: ConversationTurn[];
  emotionalState: EmotionContext;
  preferences: DatabaseUserPreferences;
  lastActivity: string;
  resumePrompt?: string;
}

export interface ConversationTurn {
  id: string;
  timestamp: string;
  speaker: 'user' | 'agent';
  content: string;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface DatabaseUserPreferences {
  voice: DatabaseVoiceSettings;
  accessibility: DatabaseAccessibilitySettings;
  content: ContentPreferences;
  privacy: PrivacySettings;
}

// Helper types for database operations
export type DatabaseTable = keyof Database['public']['Tables'];
export type DatabaseFunction = keyof Database['public']['Functions'];

// Type guards for database operations
export function isValidUserRole(role: string): role is UserRole {
  return ['Owner', 'Admin', 'Editor', 'Viewer'].includes(role);
}

// Note: StoryStatus validation function moved to types/story.ts

export function isValidMoodType(mood: string): mood is MoodType {
  return ['happy', 'sad', 'scared', 'angry', 'neutral'].includes(mood);
}

export function isValidAssetType(type: string): type is AssetType {
  return ['audio', 'image', 'pdf', 'activity'].includes(type);
}

export function isValidInteractionType(type: string): type is InteractionType {
  return ['created', 'viewed', 'edited', 'shared', 'completed'].includes(type);
}

export function isValidDeletionStrategy(strategy: string): strategy is DeletionStrategy {
  return ['hard_delete', 'soft_delete', 'anonymize'].includes(strategy);
}