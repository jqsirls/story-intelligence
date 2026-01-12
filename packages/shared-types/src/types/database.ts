export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      a2a_tasks: {
        Row: {
          client_agent_id: string
          completed_at: string | null
          created_at: string
          error: Json | null
          id: string
          method: string
          params: Json
          remote_agent_id: string
          result: Json | null
          session_id: string | null
          state: string
          task_id: string
          updated_at: string
        }
        Insert: {
          client_agent_id: string
          completed_at?: string | null
          created_at?: string
          error?: Json | null
          id?: string
          method: string
          params?: Json
          remote_agent_id: string
          result?: Json | null
          session_id?: string | null
          state: string
          task_id: string
          updated_at?: string
        }
        Update: {
          client_agent_id?: string
          completed_at?: string | null
          created_at?: string
          error?: Json | null
          id?: string
          method?: string
          params?: Json
          remote_agent_id?: string
          result?: Json | null
          session_id?: string | null
          state?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      accessibility_profiles: {
        Row: {
          alternative_input_methods: string[] | null
          attention_span_minutes: number | null
          break_reminder_interval: number | null
          break_reminders: boolean | null
          created_at: string | null
          custom_timeout_duration: number | null
          custom_vocabulary_terms: string[] | null
          engagement_check_frequency: number | null
          extended_response_time: boolean | null
          extended_timeouts: boolean | null
          eye_tracking_support: boolean | null
          high_contrast_mode: boolean | null
          id: string
          is_active: boolean | null
          large_text_mode: boolean | null
          memory_aids_enabled: boolean | null
          motor_difficulty_support: boolean | null
          preferred_interaction_style: string | null
          profile_name: string
          repetition_frequency: number | null
          screen_reader_compatible: boolean | null
          shorter_interaction_cycles: boolean | null
          simplified_language_mode: boolean | null
          speech_processing_delay: number | null
          structured_prompts: boolean | null
          switch_control_support: boolean | null
          updated_at: string | null
          user_id: string
          visual_cues_enabled: boolean | null
          vocabulary_level: string | null
          voice_amplifier_integration: boolean | null
          voice_pace_adjustment: number | null
        }
        Insert: {
          alternative_input_methods?: string[] | null
          attention_span_minutes?: number | null
          break_reminder_interval?: number | null
          break_reminders?: boolean | null
          created_at?: string | null
          custom_timeout_duration?: number | null
          custom_vocabulary_terms?: string[] | null
          engagement_check_frequency?: number | null
          extended_response_time?: boolean | null
          extended_timeouts?: boolean | null
          eye_tracking_support?: boolean | null
          high_contrast_mode?: boolean | null
          id?: string
          is_active?: boolean | null
          large_text_mode?: boolean | null
          memory_aids_enabled?: boolean | null
          motor_difficulty_support?: boolean | null
          preferred_interaction_style?: string | null
          profile_name?: string
          repetition_frequency?: number | null
          screen_reader_compatible?: boolean | null
          shorter_interaction_cycles?: boolean | null
          simplified_language_mode?: boolean | null
          speech_processing_delay?: number | null
          structured_prompts?: boolean | null
          switch_control_support?: boolean | null
          updated_at?: string | null
          user_id: string
          visual_cues_enabled?: boolean | null
          vocabulary_level?: string | null
          voice_amplifier_integration?: boolean | null
          voice_pace_adjustment?: number | null
        }
        Update: {
          alternative_input_methods?: string[] | null
          attention_span_minutes?: number | null
          break_reminder_interval?: number | null
          break_reminders?: boolean | null
          created_at?: string | null
          custom_timeout_duration?: number | null
          custom_vocabulary_terms?: string[] | null
          engagement_check_frequency?: number | null
          extended_response_time?: boolean | null
          extended_timeouts?: boolean | null
          eye_tracking_support?: boolean | null
          high_contrast_mode?: boolean | null
          id?: string
          is_active?: boolean | null
          large_text_mode?: boolean | null
          memory_aids_enabled?: boolean | null
          motor_difficulty_support?: boolean | null
          preferred_interaction_style?: string | null
          profile_name?: string
          repetition_frequency?: number | null
          screen_reader_compatible?: boolean | null
          shorter_interaction_cycles?: boolean | null
          simplified_language_mode?: boolean | null
          speech_processing_delay?: number | null
          structured_prompts?: boolean | null
          switch_control_support?: boolean | null
          updated_at?: string | null
          user_id?: string
          visual_cues_enabled?: boolean | null
          vocabulary_level?: string | null
          voice_amplifier_integration?: boolean | null
          voice_pace_adjustment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accessibility_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_accounts: {
        Row: {
          active_referrals: number | null
          converted_referrals: number | null
          created_at: string | null
          id: string
          paid_earnings: number | null
          payment_account_id: string | null
          payment_method: string | null
          pending_earnings: number | null
          referral_code: string
          status: string | null
          tax_info: Json | null
          total_earnings: number | null
          total_referrals: number | null
          tracking_link: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_referrals?: number | null
          converted_referrals?: number | null
          created_at?: string | null
          id?: string
          paid_earnings?: number | null
          payment_account_id?: string | null
          payment_method?: string | null
          pending_earnings?: number | null
          referral_code: string
          status?: string | null
          tax_info?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          tracking_link: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_referrals?: number | null
          converted_referrals?: number | null
          created_at?: string | null
          id?: string
          paid_earnings?: number | null
          payment_account_id?: string | null
          payment_method?: string | null
          pending_earnings?: number | null
          referral_code?: string
          status?: string | null
          tax_info?: Json | null
          total_earnings?: number | null
          total_referrals?: number | null
          tracking_link?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          commission_earned: number | null
          commission_paid: boolean | null
          conversion_date: string | null
          created_at: string | null
          id: string
          referred_email: string | null
          referred_user_id: string | null
          revenue_generated: number | null
          signup_date: string | null
          status: string | null
        }
        Insert: {
          affiliate_id: string
          commission_earned?: number | null
          commission_paid?: boolean | null
          conversion_date?: string | null
          created_at?: string | null
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          revenue_generated?: number | null
          signup_date?: string | null
          status?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_earned?: number | null
          commission_paid?: boolean | null
          conversion_date?: string | null
          created_at?: string | null
          id?: string
          referred_email?: string | null
          referred_user_id?: string | null
          revenue_generated?: number | null
          signup_date?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      age_verification_audit: {
        Row: {
          country: string
          created_at: string | null
          derived_bucket: string
          encrypted_verification_value: string | null
          encryption_key_id: string | null
          evaluated_at: string | null
          evaluated_threshold: number
          expires_at: string | null
          id: string
          policy_version: string
          user_id: string | null
          verification_attestation: boolean | null
          verification_method: string
        }
        Insert: {
          country: string
          created_at?: string | null
          derived_bucket: string
          encrypted_verification_value?: string | null
          encryption_key_id?: string | null
          evaluated_at?: string | null
          evaluated_threshold: number
          expires_at?: string | null
          id?: string
          policy_version: string
          user_id?: string | null
          verification_attestation?: boolean | null
          verification_method: string
        }
        Update: {
          country?: string
          created_at?: string | null
          derived_bucket?: string
          encrypted_verification_value?: string | null
          encryption_key_id?: string | null
          evaluated_at?: string | null
          evaluated_threshold?: number
          expires_at?: string | null
          id?: string
          policy_version?: string
          user_id?: string | null
          verification_attestation?: boolean | null
          verification_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "age_verification_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          created_at: string | null
          duration: number
          enabled: boolean | null
          id: string
          last_triggered: string | null
          metric: string
          name: string
          operator: string
          severity: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration: number
          enabled?: boolean | null
          id?: string
          last_triggered?: string | null
          metric: string
          name: string
          operator: string
          severity: string
          threshold: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number
          enabled?: boolean | null
          id?: string
          last_triggered?: string | null
          metric?: string
          name?: string
          operator?: string
          severity?: string
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      alexa_user_mappings: {
        Row: {
          alexa_person_id: string
          created_at: string | null
          id: string
          supabase_user_id: string
        }
        Insert: {
          alexa_person_id: string
          created_at?: string | null
          id?: string
          supabase_user_id: string
        }
        Update: {
          alexa_person_id?: string
          created_at?: string | null
          id?: string
          supabase_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alexa_user_mappings_supabase_user_id_fkey"
            columns: ["supabase_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: string[] | null
          rate_limit_requests: number | null
          rate_limit_window: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: string[] | null
          rate_limit_requests?: number | null
          rate_limit_window?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: string[] | null
          rate_limit_requests?: number | null
          rate_limit_window?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_generation_jobs: {
        Row: {
          asset_type: string
          completed_at: string | null
          cost: number | null
          created_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          retry_count: number | null
          started_at: string | null
          status: string
          story_id: string
        }
        Insert: {
          asset_type: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status: string
          story_id: string
        }
        Update: {
          asset_type?: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          retry_count?: number | null
          started_at?: string | null
          status?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_generation_jobs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      assistive_technologies: {
        Row: {
          capabilities: string[] | null
          configuration: Json | null
          created_at: string | null
          device_name: string
          id: string
          integration_status: string | null
          last_used: string | null
          technology_type: string
          user_id: string
        }
        Insert: {
          capabilities?: string[] | null
          configuration?: Json | null
          created_at?: string | null
          device_name: string
          id?: string
          integration_status?: string | null
          last_used?: string | null
          technology_type: string
          user_id: string
        }
        Update: {
          capabilities?: string[] | null
          configuration?: Json | null
          created_at?: string | null
          device_name?: string
          id?: string
          integration_status?: string | null
          last_used?: string | null
          technology_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistive_technologies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcripts: {
        Row: {
          audio_duration_seconds: number | null
          confidence_score: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          language_code: string | null
          metadata: Json | null
          session_id: string
          transcript_text: string
          user_id: string
        }
        Insert: {
          audio_duration_seconds?: number | null
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language_code?: string | null
          metadata?: Json | null
          session_id: string
          transcript_text: string
          user_id: string
        }
        Update: {
          audio_duration_seconds?: number | null
          confidence_score?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          language_code?: string | null
          metadata?: Json | null
          session_id?: string
          transcript_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          agent_name: string
          correlation_id: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          payload: Json
          pii_hash: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          agent_name: string
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          payload: Json
          pii_hash?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          agent_name?: string
          correlation_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          payload?: Json
          pii_hash?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          action: string
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          action: string
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          action?: string
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      auth_sessions: {
        Row: {
          alexa_person_id: string | null
          created_at: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string | null
          platform: string | null
          platform_capabilities: string[] | null
          session_token: string
          smart_home_enabled: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          alexa_person_id?: string | null
          created_at?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          platform?: string | null
          platform_capabilities?: string[] | null
          session_token: string
          smart_home_enabled?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          alexa_person_id?: string | null
          created_at?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string | null
          platform?: string | null
          platform_capabilities?: string[] | null
          session_token?: string
          smart_home_enabled?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auth_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          event_data: Json | null
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string | null
          subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          event_data?: Json | null
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          event_data?: Json | null
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      character_feedback: {
        Row: {
          character_id: string
          created_at: string | null
          id: string
          message: string | null
          rating: number | null
          sentiment: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          character_id: string
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          sentiment: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          character_id?: string
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          sentiment?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_feedback_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_shares: {
        Row: {
          character_id: string
          created_at: string | null
          id: string
          new_character_id: string | null
          share_type: string
          shared_by: string
          source_library_id: string
          target_library_id: string
        }
        Insert: {
          character_id: string
          created_at?: string | null
          id?: string
          new_character_id?: string | null
          share_type: string
          shared_by: string
          source_library_id: string
          target_library_id: string
        }
        Update: {
          character_id?: string
          created_at?: string | null
          id?: string
          new_character_id?: string | null
          share_type?: string
          shared_by?: string
          source_library_id?: string
          target_library_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_shares_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_shares_new_character_id_fkey"
            columns: ["new_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_shares_source_library_id_fkey"
            columns: ["source_library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_shares_target_library_id_fkey"
            columns: ["target_library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          appearance_url: string | null
          art_prompt: string | null
          birth_certificate_url: string | null
          color_palette: Json | null
          created_at: string | null
          creator_user_id: string | null
          id: string
          is_primary: boolean | null
          library_id: string
          name: string
          reference_images: Json | null
          story_id: string | null
          traits: Json
          updated_at: string | null
          usage_milestones: Json | null
        }
        Insert: {
          appearance_url?: string | null
          art_prompt?: string | null
          birth_certificate_url?: string | null
          color_palette?: Json | null
          created_at?: string | null
          creator_user_id?: string | null
          id?: string
          is_primary?: boolean | null
          library_id: string
          name: string
          reference_images?: Json | null
          story_id?: string | null
          traits: Json
          updated_at?: string | null
          usage_milestones?: Json | null
        }
        Update: {
          appearance_url?: string | null
          art_prompt?: string | null
          birth_certificate_url?: string | null
          color_palette?: Json | null
          created_at?: string | null
          creator_user_id?: string | null
          id?: string
          is_primary?: boolean | null
          library_id?: string
          name?: string
          reference_images?: Json | null
          story_id?: string | null
          traits?: Json
          updated_at?: string | null
          usage_milestones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "characters_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "characters_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      choice_patterns: {
        Row: {
          confidence: number
          created_at: string | null
          developmental_insights: string[] | null
          emotional_correlation: Json | null
          examples: string[]
          frequency: number
          id: string
          pattern_type: string
          time_range: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence: number
          created_at?: string | null
          developmental_insights?: string[] | null
          emotional_correlation?: Json | null
          examples: string[]
          frequency: number
          id?: string
          pattern_type: string
          time_range: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          created_at?: string | null
          developmental_insights?: string[] | null
          emotional_correlation?: Json | null
          examples?: string[]
          frequency?: number
          id?: string
          pattern_type?: string
          time_range?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "choice_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      circuit_breaker_state: {
        Row: {
          agent_name: string
          created_at: string | null
          failure_count: number
          failure_threshold: number
          id: string
          last_failure_at: string | null
          next_attempt_at: string | null
          state: string
          success_count: number
          success_threshold: number
          timeout_ms: number
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          created_at?: string | null
          failure_count?: number
          failure_threshold?: number
          id?: string
          last_failure_at?: string | null
          next_attempt_at?: string | null
          state: string
          success_count?: number
          success_threshold?: number
          timeout_ms?: number
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          created_at?: string | null
          failure_count?: number
          failure_threshold?: number
          id?: string
          last_failure_at?: string | null
          next_attempt_at?: string | null
          state?: string
          success_count?: number
          success_threshold?: number
          timeout_ms?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      classroom_enrollments: {
        Row: {
          classroom_id: string
          enrollment_date: string | null
          id: string
          is_active: boolean | null
          student_id: string
        }
        Insert: {
          classroom_id: string
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          student_id: string
        }
        Update: {
          classroom_id?: string
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_enrollments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string | null
          curriculum_framework_id: string | null
          grade_level: string
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          settings: Json | null
          subject: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curriculum_framework_id?: string | null
          grade_level: string
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          settings?: Json | null
          subject: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curriculum_framework_id?: string | null
          grade_level?: string
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          settings?: Json | null
          subject?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_curriculum_framework_id_fkey"
            columns: ["curriculum_framework_id"]
            isOneToOne: false
            referencedRelation: "curriculum_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classrooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_adaptations: {
        Row: {
          adaptation_reason: string
          adaptation_type: string
          adapted_response: string
          effectiveness_score: number | null
          id: string
          original_input: string
          session_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          adaptation_reason: string
          adaptation_type: string
          adapted_response: string
          effectiveness_score?: number | null
          id?: string
          original_input: string
          session_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          adaptation_reason?: string
          adaptation_type?: string
          adapted_response?: string
          effectiveness_score?: number | null
          id?: string
          original_input?: string
          session_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_adaptations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_profiles: {
        Row: {
          attention_span: number | null
          comfort_topics: string[] | null
          created_at: string | null
          id: string
          preferred_interaction_style: string | null
          preferred_pace: string | null
          processing_delay: number | null
          special_needs: Json | null
          trigger_words: string[] | null
          updated_at: string | null
          user_id: string
          vocabulary_level: string | null
        }
        Insert: {
          attention_span?: number | null
          comfort_topics?: string[] | null
          created_at?: string | null
          id?: string
          preferred_interaction_style?: string | null
          preferred_pace?: string | null
          processing_delay?: number | null
          special_needs?: Json | null
          trigger_words?: string[] | null
          updated_at?: string | null
          user_id: string
          vocabulary_level?: string | null
        }
        Update: {
          attention_span?: number | null
          comfort_topics?: string[] | null
          created_at?: string | null
          id?: string
          preferred_interaction_style?: string | null
          preferred_pace?: string | null
          processing_delay?: number | null
          special_needs?: Json | null
          trigger_words?: string[] | null
          updated_at?: string | null
          user_id?: string
          vocabulary_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_metrics: {
        Row: {
          completion_rate: number | null
          created_at: string
          engagement_score: number | null
          first_read_at: string | null
          id: string
          interaction_events: Json | null
          last_read_at: string | null
          metadata: Json | null
          pause_patterns: Json | null
          read_count: number
          replay_count: number
          replay_patterns: Json | null
          story_id: string
          total_duration_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string
          engagement_score?: number | null
          first_read_at?: string | null
          id?: string
          interaction_events?: Json | null
          last_read_at?: string | null
          metadata?: Json | null
          pause_patterns?: Json | null
          read_count?: number
          replay_count?: number
          replay_patterns?: Json | null
          story_id: string
          total_duration_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_rate?: number | null
          created_at?: string
          engagement_score?: number | null
          first_read_at?: string | null
          id?: string
          interaction_events?: Json | null
          last_read_at?: string | null
          metadata?: Json | null
          pause_patterns?: Json | null
          read_count?: number
          replay_count?: number
          replay_patterns?: Json | null
          story_id?: string
          total_duration_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumption_metrics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_filtering_logs: {
        Row: {
          classroom_id: string | null
          created_at: string | null
          filter_level: string
          filtered_at: string | null
          filtered_content_hash: string
          id: string
          modifications: string[]
          original_content_hash: string
        }
        Insert: {
          classroom_id?: string | null
          created_at?: string | null
          filter_level: string
          filtered_at?: string | null
          filtered_content_hash: string
          id?: string
          modifications: string[]
          original_content_hash: string
        }
        Update: {
          classroom_id?: string | null
          created_at?: string | null
          filter_level?: string
          filtered_at?: string | null
          filtered_content_hash?: string
          id?: string
          modifications?: string[]
          original_content_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_filtering_logs_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      content_safety_logs: {
        Row: {
          confidence: number
          created_at: string | null
          educational_opportunity: Json | null
          escalation_required: boolean
          id: string
          inappropriate_categories: string[] | null
          pattern_concern: boolean
          previous_inappropriate_count: number | null
          redirection_response: string
          session_id: string
          severity: string
          timestamp: string
          user_id: string
          user_input: string
        }
        Insert: {
          confidence: number
          created_at?: string | null
          educational_opportunity?: Json | null
          escalation_required?: boolean
          id?: string
          inappropriate_categories?: string[] | null
          pattern_concern?: boolean
          previous_inappropriate_count?: number | null
          redirection_response: string
          session_id: string
          severity: string
          timestamp?: string
          user_id: string
          user_input: string
        }
        Update: {
          confidence?: number
          created_at?: string | null
          educational_opportunity?: Json | null
          escalation_required?: boolean
          id?: string
          inappropriate_categories?: string[] | null
          pattern_concern?: boolean
          previous_inappropriate_count?: number | null
          redirection_response?: string
          session_id?: string
          severity?: string
          timestamp?: string
          user_id?: string
          user_input?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_safety_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_checkpoints: {
        Row: {
          checkpoint_id: string
          conversation_context: Json
          conversation_phase: string
          created_at: string | null
          device_context: Json | null
          expires_at: string | null
          id: string
          session_id: string
          story_state: Json
          user_context: Json
          user_id: string
        }
        Insert: {
          checkpoint_id: string
          conversation_context?: Json
          conversation_phase: string
          created_at?: string | null
          device_context?: Json | null
          expires_at?: string | null
          id?: string
          session_id: string
          story_state?: Json
          user_context?: Json
          user_id: string
        }
        Update: {
          checkpoint_id?: string
          conversation_context?: Json
          conversation_phase?: string
          created_at?: string | null
          device_context?: Json | null
          expires_at?: string | null
          id?: string
          session_id?: string
          story_state?: Json
          user_context?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_checkpoints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_interruptions: {
        Row: {
          checkpoint_id: string | null
          context_snapshot: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          interruption_id: string
          interruption_type: string
          is_recovered: boolean | null
          max_recovery_attempts: number | null
          metadata: Json | null
          recovered_at: string | null
          recovery_attempts: number | null
          resumption_prompt: string
          session_id: string
          user_id: string
        }
        Insert: {
          checkpoint_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          interruption_id: string
          interruption_type: string
          is_recovered?: boolean | null
          max_recovery_attempts?: number | null
          metadata?: Json | null
          recovered_at?: string | null
          recovery_attempts?: number | null
          resumption_prompt: string
          session_id: string
          user_id: string
        }
        Update: {
          checkpoint_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          interruption_id?: string
          interruption_type?: string
          is_recovered?: boolean | null
          max_recovery_attempts?: number | null
          metadata?: Json | null
          recovered_at?: string | null
          recovery_attempts?: number | null
          resumption_prompt?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_interruptions_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "conversation_checkpoints"
            referencedColumns: ["checkpoint_id"]
          },
          {
            foreignKeyName: "conversation_interruptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_sessions: {
        Row: {
          checkpoint_count: number | null
          conversation_context: Json | null
          conversation_phase: string
          created_at: string | null
          device_history: Json | null
          expires_at: string | null
          id: string
          interruption_count: number | null
          last_checkpoint_at: string | null
          last_interruption_at: string | null
          parent_session_id: string | null
          session_id: string
          story_state: Json | null
          updated_at: string | null
          user_context: Json | null
          user_id: string
        }
        Insert: {
          checkpoint_count?: number | null
          conversation_context?: Json | null
          conversation_phase: string
          created_at?: string | null
          device_history?: Json | null
          expires_at?: string | null
          id?: string
          interruption_count?: number | null
          last_checkpoint_at?: string | null
          last_interruption_at?: string | null
          parent_session_id?: string | null
          session_id: string
          story_state?: Json | null
          updated_at?: string | null
          user_context?: Json | null
          user_id: string
        }
        Update: {
          checkpoint_count?: number | null
          conversation_context?: Json | null
          conversation_phase?: string
          created_at?: string | null
          device_history?: Json | null
          expires_at?: string | null
          id?: string
          interruption_count?: number | null
          last_checkpoint_at?: string | null
          last_interruption_at?: string | null
          parent_session_id?: string | null
          session_id?: string
          story_state?: Json | null
          updated_at?: string | null
          user_context?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          session_id: string
          state: Json
          transcript_ids: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          session_id: string
          state: Json
          transcript_ids?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          session_id?: string
          state?: Json
          transcript_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          channel: string
          created_at: string | null
          ended_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          profile_id: string | null
          session_id: string | null
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          profile_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          ended_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          profile_id?: string | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_indicators: {
        Row: {
          confidence: number
          context: Json
          detected_at: string | null
          evidence: string[]
          id: string
          indicator_type: string
          session_id: string
          severity: string
          source: string
          user_id: string
        }
        Insert: {
          confidence: number
          context: Json
          detected_at?: string | null
          evidence: string[]
          id?: string
          indicator_type: string
          session_id: string
          severity: string
          source: string
          user_id: string
        }
        Update: {
          confidence?: number
          context?: Json
          detected_at?: string | null
          evidence?: string[]
          id?: string
          indicator_type?: string
          session_id?: string
          severity?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_intervention_logs: {
        Row: {
          context: string | null
          created_at: string | null
          crisis_type: string
          escalation_level: number
          follow_up_required: boolean
          id: string
          intervention_triggered: boolean
          intervention_type: string
          reporting_completed: boolean
          resolved_at: string | null
          resources_provided: Json | null
          session_id: string
          severity: string
          timestamp: string
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          crisis_type: string
          escalation_level: number
          follow_up_required?: boolean
          id?: string
          intervention_triggered?: boolean
          intervention_type: string
          reporting_completed?: boolean
          resolved_at?: string | null
          resources_provided?: Json | null
          session_id: string
          severity: string
          timestamp?: string
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          crisis_type?: string
          escalation_level?: number
          follow_up_required?: boolean
          id?: string
          intervention_triggered?: boolean
          intervention_type?: string
          reporting_completed?: boolean
          resolved_at?: string | null
          resources_provided?: Json | null
          session_id?: string
          severity?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_intervention_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_responses: {
        Row: {
          crisis_id: string
          detected_at: string | null
          documentation_required: boolean
          escalation_actions: Json
          follow_up_schedule: Json
          id: string
          immediate_response: string
          parent_notification: Json
          professional_referral: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          risk_level: string
          user_id: string
        }
        Insert: {
          crisis_id: string
          detected_at?: string | null
          documentation_required: boolean
          escalation_actions: Json
          follow_up_schedule: Json
          id?: string
          immediate_response: string
          parent_notification: Json
          professional_referral?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level: string
          user_id: string
        }
        Update: {
          crisis_id?: string
          detected_at?: string | null
          documentation_required?: boolean
          escalation_actions?: Json
          follow_up_schedule?: Json
          id?: string
          immediate_response?: string
          parent_notification?: Json
          professional_referral?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          risk_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_character_traits: {
        Row: {
          created_at: string | null
          cultural_variations: Json
          id: string
          trait: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cultural_variations?: Json
          id?: string
          trait: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cultural_variations?: Json
          id?: string
          trait?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cultural_contexts: {
        Row: {
          celebrations_and_holidays: string[] | null
          created_at: string | null
          cultural_background: string[] | null
          family_structure: Json | null
          id: string
          preferred_narrative_styles: string[] | null
          primary_language: string
          religious_considerations: string[] | null
          secondary_languages: string[] | null
          storytelling_traditions: string[] | null
          taboo_topics: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          celebrations_and_holidays?: string[] | null
          created_at?: string | null
          cultural_background?: string[] | null
          family_structure?: Json | null
          id?: string
          preferred_narrative_styles?: string[] | null
          primary_language?: string
          religious_considerations?: string[] | null
          secondary_languages?: string[] | null
          storytelling_traditions?: string[] | null
          taboo_topics?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          celebrations_and_holidays?: string[] | null
          created_at?: string | null
          cultural_background?: string[] | null
          family_structure?: Json | null
          id?: string
          preferred_narrative_styles?: string[] | null
          primary_language?: string
          religious_considerations?: string[] | null
          secondary_languages?: string[] | null
          storytelling_traditions?: string[] | null
          taboo_topics?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cultural_contexts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_sensitivity_filters: {
        Row: {
          appropriate_alternatives: Json | null
          avoidance_patterns: string[] | null
          created_at: string | null
          cultural_context: string
          id: string
          respectful_language: Json | null
          sensitive_topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          appropriate_alternatives?: Json | null
          avoidance_patterns?: string[] | null
          created_at?: string | null
          cultural_context: string
          id?: string
          respectful_language?: Json | null
          sensitive_topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          appropriate_alternatives?: Json | null
          avoidance_patterns?: string[] | null
          created_at?: string | null
          cultural_context?: string
          id?: string
          respectful_language?: Json | null
          sensitive_topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      curriculum_alignment_results: {
        Row: {
          alignment_score: number
          analysis_date: string | null
          content_hash: string
          created_at: string | null
          grade_level: string
          id: string
          matched_objectives: string[]
          readability_score: number
          story_id: string | null
          subject_area: string
          suggested_modifications: string[] | null
          vocabulary_level: string
        }
        Insert: {
          alignment_score: number
          analysis_date?: string | null
          content_hash: string
          created_at?: string | null
          grade_level: string
          id?: string
          matched_objectives: string[]
          readability_score: number
          story_id?: string | null
          subject_area: string
          suggested_modifications?: string[] | null
          vocabulary_level: string
        }
        Update: {
          alignment_score?: number
          analysis_date?: string | null
          content_hash?: string
          created_at?: string | null
          grade_level?: string
          id?: string
          matched_objectives?: string[]
          readability_score?: number
          story_id?: string | null
          subject_area?: string
          suggested_modifications?: string[] | null
          vocabulary_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_alignment_results_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_frameworks: {
        Row: {
          created_at: string | null
          description: string
          grade_range_max: string
          grade_range_min: string
          id: string
          is_active: boolean | null
          name: string
          region: string
          subjects: string[]
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          grade_range_max: string
          grade_range_min: string
          id?: string
          is_active?: boolean | null
          name: string
          region: string
          subjects: string[]
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          grade_range_max?: string
          grade_range_min?: string
          id?: string
          is_active?: boolean | null
          name?: string
          region?: string
          subjects?: string[]
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          created_at: string | null
          deletion_strategy: string
          id: string
          is_active: boolean | null
          last_cleanup_at: string | null
          retention_period: unknown
          table_name: string
        }
        Insert: {
          created_at?: string | null
          deletion_strategy: string
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          retention_period: unknown
          table_name: string
        }
        Update: {
          created_at?: string | null
          deletion_strategy?: string
          id?: string
          is_active?: boolean | null
          last_cleanup_at?: string | null
          retention_period?: unknown
          table_name?: string
        }
        Relationships: []
      }
      deletion_audit_log: {
        Row: {
          deleted_at: string
          deletion_type: string
          entity_id: string | null
          entity_type: string
          log_id: string
          metadata: Json | null
          original_user_id: string | null
        }
        Insert: {
          deleted_at?: string
          deletion_type: string
          entity_id?: string | null
          entity_type: string
          log_id?: string
          metadata?: Json | null
          original_user_id?: string | null
        }
        Update: {
          deleted_at?: string
          deletion_type?: string
          entity_id?: string | null
          entity_type?: string
          log_id?: string
          metadata?: Json | null
          original_user_id?: string | null
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          deletion_type: string
          immediate: boolean | null
          metadata: Json | null
          reason: string | null
          request_id: string
          requested_at: string
          scheduled_deletion_at: string | null
          status: string
          target_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deletion_type: string
          immediate?: boolean | null
          metadata?: Json | null
          reason?: string | null
          request_id?: string
          requested_at?: string
          scheduled_deletion_at?: string | null
          status: string
          target_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deletion_type?: string
          immediate?: boolean | null
          metadata?: Json | null
          reason?: string | null
          request_id?: string
          requested_at?: string
          scheduled_deletion_at?: string | null
          status?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      device_connection_logs: {
        Row: {
          action: string
          created_at: string | null
          device_id: string
          error_message: string | null
          expires_at: string | null
          id: string
          platform: string | null
          session_id: string | null
          success: boolean
        }
        Insert: {
          action: string
          created_at?: string | null
          device_id: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          platform?: string | null
          session_id?: string | null
          success: boolean
        }
        Update: {
          action?: string
          created_at?: string | null
          device_id?: string
          error_message?: string | null
          expires_at?: string | null
          id?: string
          platform?: string | null
          session_id?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "device_connection_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "smart_home_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          device_id: string
          device_type: string
          encrypted_token: string
          encryption_key_id: string
          expires_at: string | null
          id: string
          last_refreshed: string | null
          refresh_attempts: number | null
          refresh_token_encrypted: string | null
          status: string | null
          token_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id: string
          device_type: string
          encrypted_token: string
          encryption_key_id: string
          expires_at?: string | null
          id?: string
          last_refreshed?: string | null
          refresh_attempts?: number | null
          refresh_token_encrypted?: string | null
          status?: string | null
          token_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string
          device_type?: string
          encrypted_token?: string
          encryption_key_id?: string
          expires_at?: string | null
          id?: string
          last_refreshed?: string | null
          refresh_attempts?: number | null
          refresh_token_encrypted?: string | null
          status?: string | null
          token_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "smart_home_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      distress_patterns: {
        Row: {
          behavioral_patterns: Json
          confidence: number
          created_at: string | null
          distress_level: string
          id: string
          immediate_attention_required: boolean
          indicators: Json
          recommended_actions: Json | null
          session_id: string
          timestamp: string
          user_id: string
          voice_patterns: Json | null
        }
        Insert: {
          behavioral_patterns: Json
          confidence: number
          created_at?: string | null
          distress_level: string
          id?: string
          immediate_attention_required?: boolean
          indicators?: Json
          recommended_actions?: Json | null
          session_id: string
          timestamp?: string
          user_id: string
          voice_patterns?: Json | null
        }
        Update: {
          behavioral_patterns?: Json
          confidence?: number
          created_at?: string | null
          distress_level?: string
          id?: string
          immediate_attention_required?: boolean
          indicators?: Json
          recommended_actions?: Json | null
          session_id?: string
          timestamp?: string
          user_id?: string
          voice_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "distress_patterns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      early_intervention_signals: {
        Row: {
          confidence: number
          detected_at: string | null
          id: string
          indicators: Json
          predicted_outcome: string
          recommended_actions: string[]
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          signal_type: string
          time_to_intervention: number
          user_id: string
        }
        Insert: {
          confidence: number
          detected_at?: string | null
          id?: string
          indicators?: Json
          predicted_outcome: string
          recommended_actions: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          signal_type: string
          time_to_intervention: number
          user_id: string
        }
        Update: {
          confidence?: number
          detected_at?: string | null
          id?: string
          indicators?: Json
          predicted_outcome?: string
          recommended_actions?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          signal_type?: string
          time_to_intervention?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "early_intervention_signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      educational_outcomes: {
        Row: {
          achieved_at: string | null
          assessment_score: number
          completion_time: number
          created_at: string | null
          engagement_metrics: Json
          id: string
          learning_objective_id: string
          parent_feedback: string | null
          story_id: string | null
          student_id: string
          teacher_notes: string | null
        }
        Insert: {
          achieved_at?: string | null
          assessment_score: number
          completion_time: number
          created_at?: string | null
          engagement_metrics: Json
          id?: string
          learning_objective_id: string
          parent_feedback?: string | null
          story_id?: string | null
          student_id: string
          teacher_notes?: string | null
        }
        Update: {
          achieved_at?: string | null
          assessment_score?: number
          completion_time?: number
          created_at?: string | null
          engagement_metrics?: Json
          id?: string
          learning_objective_id?: string
          parent_feedback?: string | null
          story_id?: string | null
          student_id?: string
          teacher_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "educational_outcomes_learning_objective_id_fkey"
            columns: ["learning_objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_outcomes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_outcomes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_log: {
        Row: {
          clicked_at: string | null
          created_at: string
          email_type: string
          id: string
          metadata: Json | null
          opened_at: string | null
          provider: string
          provider_message_id: string | null
          sent_at: string
          status: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          email_type: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          email_type?: string
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          sent_at?: string
          status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_engagement_tracking: {
        Row: {
          clicked_at: string | null
          email_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          opened_at: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          email_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          email_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          opened_at?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string
          daily_moment: string
          digest_frequency: string
          insights: boolean
          insights_frequency: string
          marketing: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminders: boolean
          timezone: string
          transactional: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_moment?: string
          digest_frequency?: string
          insights?: boolean
          insights_frequency?: string
          marketing?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminders?: boolean
          timezone?: string
          transactional?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_moment?: string
          digest_frequency?: string
          insights?: boolean
          insights_frequency?: string
          marketing?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminders?: boolean
          timezone?: string
          transactional?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_engagement_metrics: {
        Row: {
          attention_span: number
          average_response_time: number
          created_at: string | null
          engagement_level: string
          fatigue_indicators: Json | null
          id: string
          recommendations: string[] | null
          response_time_variance: number
          session_id: string
          user_id: string
        }
        Insert: {
          attention_span: number
          average_response_time: number
          created_at?: string | null
          engagement_level: string
          fatigue_indicators?: Json | null
          id?: string
          recommendations?: string[] | null
          response_time_variance: number
          session_id: string
          user_id: string
        }
        Update: {
          attention_span?: number
          average_response_time?: number
          created_at?: string | null
          engagement_level?: string
          fatigue_indicators?: Json | null
          id?: string
          recommendations?: string[] | null
          response_time_variance?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_correlations: {
        Row: {
          avoided_choice_types: string[]
          confidence: number
          created_at: string | null
          id: string
          mood: string
          preferred_choice_types: string[]
          response_time_pattern: string
          sample_size: number
          time_range: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avoided_choice_types: string[]
          confidence: number
          created_at?: string | null
          id?: string
          mood: string
          preferred_choice_types: string[]
          response_time_pattern: string
          sample_size: number
          time_range: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avoided_choice_types?: string[]
          confidence?: number
          created_at?: string | null
          id?: string
          mood?: string
          preferred_choice_types?: string[]
          response_time_pattern?: string
          sample_size?: number
          time_range?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotional_correlations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_journeys: {
        Row: {
          adaptations: Json
          completion_date: string | null
          current_step: number | null
          id: string
          journey_id: string
          outcomes: Json
          pathway_id: string
          progress: Json
          start_date: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          adaptations?: Json
          completion_date?: string | null
          current_step?: number | null
          id?: string
          journey_id: string
          outcomes?: Json
          pathway_id: string
          progress?: Json
          start_date?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          adaptations?: Json
          completion_date?: string | null
          current_step?: number | null
          id?: string
          journey_id?: string
          outcomes?: Json
          pathway_id?: string
          progress?: Json
          start_date?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotional_journeys_pathway_id_fkey"
            columns: ["pathway_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_pathways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotional_journeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_trends: {
        Row: {
          correlations: Json | null
          created_at: string | null
          developmental_milestones: Json | null
          id: string
          overall_trend: string
          protective_factors: Json | null
          risk_factors: Json | null
          seasonal_patterns: Json | null
          significant_changes: Json | null
          time_range: Json
          trend_strength: number
          updated_at: string | null
          user_id: string
          weekly_patterns: Json | null
        }
        Insert: {
          correlations?: Json | null
          created_at?: string | null
          developmental_milestones?: Json | null
          id?: string
          overall_trend: string
          protective_factors?: Json | null
          risk_factors?: Json | null
          seasonal_patterns?: Json | null
          significant_changes?: Json | null
          time_range: Json
          trend_strength: number
          updated_at?: string | null
          user_id: string
          weekly_patterns?: Json | null
        }
        Update: {
          correlations?: Json | null
          created_at?: string | null
          developmental_milestones?: Json | null
          id?: string
          overall_trend?: string
          protective_factors?: Json | null
          risk_factors?: Json | null
          seasonal_patterns?: Json | null
          significant_changes?: Json | null
          time_range?: Json
          trend_strength?: number
          updated_at?: string | null
          user_id?: string
          weekly_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "emotional_trends_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      emotions: {
        Row: {
          confidence: number
          context: Json | null
          created_at: string | null
          expires_at: string | null
          id: string
          library_id: string | null
          mood: string
          sub_library_id: string | null
          user_id: string
        }
        Insert: {
          confidence: number
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          library_id?: string | null
          mood: string
          sub_library_id?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          context?: Json | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          library_id?: string | null
          mood?: string
          sub_library_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotions_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotions_sub_library_id_fkey"
            columns: ["sub_library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emotions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_checks: {
        Row: {
          action_taken: string | null
          check_type: string
          engagement_level: number
          id: string
          prompt: string
          response: string | null
          session_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          check_type: string
          engagement_level: number
          id?: string
          prompt: string
          response?: string | null
          session_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          check_type?: string
          engagement_level?: number
          id?: string
          prompt?: string
          response?: string | null
          session_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_checks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_metrics: {
        Row: {
          completion_rate: number
          error_count: number
          id: string
          interaction_count: number
          response_time: number
          session_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          completion_rate: number
          error_count: number
          id?: string
          interaction_count: number
          response_time: number
          session_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          completion_rate?: number
          error_count?: number
          id?: string
          interaction_count?: number
          response_time?: number
          session_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_correlations: {
        Row: {
          caused_by: string | null
          correlation_id: string
          created_at: string | null
          id: string
          parent_event_id: string | null
          related_events: string[] | null
          root_event_id: string
          updated_at: string | null
        }
        Insert: {
          caused_by?: string | null
          correlation_id: string
          created_at?: string | null
          id?: string
          parent_event_id?: string | null
          related_events?: string[] | null
          root_event_id: string
          updated_at?: string | null
        }
        Update: {
          caused_by?: string | null
          correlation_id?: string
          created_at?: string | null
          id?: string
          parent_event_id?: string | null
          related_events?: string[] | null
          root_event_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_metrics: {
        Row: {
          correlation_id: string | null
          error_message: string | null
          event_type: string
          handler_time_ms: number | null
          id: string
          network_time_ms: number | null
          processed_at: string | null
          processing_time_ms: number
          queue_time_ms: number | null
          retry_count: number | null
          session_id: string | null
          source: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          error_message?: string | null
          event_type: string
          handler_time_ms?: number | null
          id?: string
          network_time_ms?: number | null
          processed_at?: string | null
          processing_time_ms: number
          queue_time_ms?: number | null
          retry_count?: number | null
          session_id?: string | null
          source: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          error_message?: string | null
          event_type?: string
          handler_time_ms?: number | null
          id?: string
          network_time_ms?: number | null
          processed_at?: string | null
          processing_time_ms?: number
          queue_time_ms?: number | null
          retry_count?: number | null
          session_id?: string | null
          source?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_replays: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          destination: string
          end_time: string
          error_message: string | null
          event_source_arn: string
          events_replayed: number | null
          id: string
          replay_name: string
          start_time: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          destination: string
          end_time: string
          error_message?: string | null
          event_source_arn: string
          events_replayed?: number | null
          id?: string
          replay_name: string
          start_time: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          destination?: string
          end_time?: string
          error_message?: string | null
          event_source_arn?: string
          events_replayed?: number | null
          id?: string
          replay_name?: string
          start_time?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      event_store: {
        Row: {
          agent_name: string | null
          correlation_id: string | null
          created_at: string | null
          data: Json | null
          data_content_type: string | null
          data_schema: string | null
          event_id: string
          event_time: string
          event_type: string
          id: string
          platform: string | null
          session_id: string | null
          source: string
          spec_version: string
          subject: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_name?: string | null
          correlation_id?: string | null
          created_at?: string | null
          data?: Json | null
          data_content_type?: string | null
          data_schema?: string | null
          event_id: string
          event_time: string
          event_type: string
          id?: string
          platform?: string | null
          session_id?: string | null
          source: string
          spec_version?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_name?: string | null
          correlation_id?: string | null
          created_at?: string | null
          data?: Json | null
          data_content_type?: string | null
          data_schema?: string | null
          event_id?: string
          event_time?: string
          event_type?: string
          id?: string
          platform?: string | null
          session_id?: string | null
          source?: string
          spec_version?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_store_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subscriptions: {
        Row: {
          created_at: string | null
          dead_letter_queue: string | null
          event_types: string[]
          filter_pattern: Json | null
          id: string
          queue_arn: string
          queue_url: string
          retry_policy: Json | null
          rule_name: string
          source_filter: string | null
          status: string | null
          subscription_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dead_letter_queue?: string | null
          event_types: string[]
          filter_pattern?: Json | null
          id?: string
          queue_arn: string
          queue_url: string
          retry_policy?: Json | null
          rule_name: string
          source_filter?: string | null
          status?: string | null
          subscription_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dead_letter_queue?: string | null
          event_types?: string[]
          filter_pattern?: Json | null
          id?: string
          queue_arn?: string
          queue_url?: string
          retry_policy?: Json | null
          rule_name?: string
          source_filter?: string | null
          status?: string | null
          subscription_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_structure_templates: {
        Row: {
          common_terms: Json
          created_at: string | null
          cultural_considerations: string[] | null
          description: string
          id: string
          storytelling_approaches: string[] | null
          structure_type: string
          updated_at: string | null
        }
        Insert: {
          common_terms?: Json
          created_at?: string | null
          cultural_considerations?: string[] | null
          description: string
          id?: string
          storytelling_approaches?: string[] | null
          structure_type: string
          updated_at?: string | null
        }
        Update: {
          common_terms?: Json
          created_at?: string | null
          cultural_considerations?: string[] | null
          description?: string
          id?: string
          storytelling_approaches?: string[] | null
          structure_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gift_card_redemptions: {
        Row: {
          created_at: string | null
          gift_card_id: string
          id: string
          months_added: number
          redeemed_at: string | null
          subscription_extended_to: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          gift_card_id: string
          id?: string
          months_added: number
          redeemed_at?: string | null
          subscription_extended_to: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          gift_card_id?: string
          id?: string
          months_added?: number
          redeemed_at?: string | null
          subscription_extended_to?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          purchased_at: string | null
          purchased_by: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          type: string
          updated_at: string | null
          value_months: number
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          purchased_by?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type: string
          updated_at?: string | null
          value_months: number
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          purchased_at?: string | null
          purchased_by?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: string
          updated_at?: string | null
          value_months?: number
        }
        Relationships: []
      }
      group_storytelling_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          classroom_id: string
          created_at: string | null
          description: string
          facilitator_id: string
          id: string
          learning_objectives: string[]
          max_participants: number | null
          scheduled_start: string
          session_type: string | null
          status: string | null
          story_content: string | null
          story_prompt: string
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          classroom_id: string
          created_at?: string | null
          description: string
          facilitator_id: string
          id?: string
          learning_objectives: string[]
          max_participants?: number | null
          scheduled_start: string
          session_type?: string | null
          status?: string | null
          story_content?: string | null
          story_prompt: string
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          classroom_id?: string
          created_at?: string | null
          description?: string
          facilitator_id?: string
          id?: string
          learning_objectives?: string[]
          max_participants?: number | null
          scheduled_start?: string
          session_type?: string | null
          status?: string | null
          story_content?: string | null
          story_prompt?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_storytelling_sessions_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_storytelling_sessions_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      healing_metrics: {
        Row: {
          agent_name: string
          average_resolution_time_ms: number | null
          created_at: string | null
          date: string
          false_positive_count: number
          id: string
          incidents_detected: number
          incidents_resolved: number
          parent_notifications_sent: number
          story_sessions_protected: number
          system_availability_percent: number | null
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          average_resolution_time_ms?: number | null
          created_at?: string | null
          date: string
          false_positive_count?: number
          id?: string
          incidents_detected?: number
          incidents_resolved?: number
          parent_notifications_sent?: number
          story_sessions_protected?: number
          system_availability_percent?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          average_resolution_time_ms?: number | null
          created_at?: string | null
          date?: string
          false_positive_count?: number
          id?: string
          incidents_detected?: number
          incidents_resolved?: number
          parent_notifications_sent?: number
          story_sessions_protected?: number
          system_availability_percent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hibernated_accounts: {
        Row: {
          data_size_bytes: number | null
          glacier_archive_id: string | null
          hibernated_at: string
          original_tier: string | null
          restoration_requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          data_size_bytes?: number | null
          glacier_archive_id?: string | null
          hibernated_at?: string
          original_tier?: string | null
          restoration_requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          data_size_bytes?: number | null
          glacier_archive_id?: string | null
          hibernated_at?: string
          original_tier?: string | null
          restoration_requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      human_overrides: {
        Row: {
          created_at: string
          human_override: string
          id: string
          metadata: Json | null
          occurred_at: string
          override_type: string
          pipeline_type: string
          reasoning: string | null
          system_action: string
          system_confidence: number
          user_id: string
        }
        Insert: {
          created_at?: string
          human_override: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          override_type: string
          pipeline_type: string
          reasoning?: string | null
          system_action: string
          system_confidence: number
          user_id: string
        }
        Update: {
          created_at?: string
          human_override?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          override_type?: string
          pipeline_type?: string
          reasoning?: string | null
          system_action?: string
          system_confidence?: number
          user_id?: string
        }
        Relationships: []
      }
      incident_knowledge: {
        Row: {
          affected_agents: string[]
          application_count: number
          autonomy_level: number
          created_at: string | null
          error_pattern: Json
          error_signature: string
          healing_action: Json
          id: string
          incident_type: string
          last_applied: string | null
          severity: string
          success_rate: number
          updated_at: string | null
        }
        Insert: {
          affected_agents?: string[]
          application_count?: number
          autonomy_level: number
          created_at?: string | null
          error_pattern: Json
          error_signature: string
          healing_action: Json
          id?: string
          incident_type: string
          last_applied?: string | null
          severity: string
          success_rate?: number
          updated_at?: string | null
        }
        Update: {
          affected_agents?: string[]
          application_count?: number
          autonomy_level?: number
          created_at?: string | null
          error_pattern?: Json
          error_signature?: string
          healing_action?: Json
          id?: string
          incident_type?: string
          last_applied?: string | null
          severity?: string
          success_rate?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      incident_records: {
        Row: {
          active_conversation: boolean
          agent_name: string
          created_at: string | null
          detected_at: string
          error_pattern: Json
          healing_action: Json | null
          id: string
          impacted_users: number
          incident_type: string
          metadata: Json
          resolution_time_ms: number | null
          resolved_at: string | null
          session_id: string | null
          story_id: string | null
          story_sessions_affected: number
          success: boolean
          user_id: string | null
        }
        Insert: {
          active_conversation?: boolean
          agent_name: string
          created_at?: string | null
          detected_at?: string
          error_pattern: Json
          healing_action?: Json | null
          id?: string
          impacted_users?: number
          incident_type: string
          metadata?: Json
          resolution_time_ms?: number | null
          resolved_at?: string | null
          session_id?: string | null
          story_id?: string | null
          story_sessions_affected?: number
          success?: boolean
          user_id?: string | null
        }
        Update: {
          active_conversation?: boolean
          agent_name?: string
          created_at?: string | null
          detected_at?: string
          error_pattern?: Json
          healing_action?: Json | null
          id?: string
          impacted_users?: number
          incident_type?: string
          metadata?: Json
          resolution_time_ms?: number | null
          resolved_at?: string | null
          session_id?: string | null
          story_id?: string | null
          story_sessions_affected?: number
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      intervention_triggers: {
        Row: {
          description: string
          detected_at: string | null
          id: string
          recommendations: string[]
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          source: string
          trigger_type: string
          user_id: string
        }
        Insert: {
          description: string
          detected_at?: string | null
          id?: string
          recommendations: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          source: string
          trigger_type: string
          user_id: string
        }
        Update: {
          description?: string
          detected_at?: string | null
          id?: string
          recommendations?: string[]
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          trigger_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_triggers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          discount_percentage: number | null
          expires_at: string | null
          from_user_id: string
          id: string
          invite_code: string
          invite_url: string | null
          library_id: string | null
          personal_message: string | null
          role: string | null
          status: string | null
          to_email: string
          to_user_id: string | null
          type: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          expires_at?: string | null
          from_user_id: string
          id?: string
          invite_code: string
          invite_url?: string | null
          library_id?: string | null
          personal_message?: string | null
          role?: string | null
          status?: string | null
          to_email: string
          to_user_id?: string | null
          type: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          expires_at?: string | null
          from_user_id?: string
          id?: string
          invite_code?: string
          invite_url?: string | null
          library_id?: string | null
          personal_message?: string | null
          role?: string | null
          status?: string | null
          to_email?: string
          to_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_discounts: {
        Row: {
          code: string
          created_at: string | null
          created_by: string
          discount_percentage: number
          id: string
          type: string
          used_by: string | null
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by: string
          discount_percentage: number
          id?: string
          type: string
          used_by?: string | null
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string
          discount_percentage?: number
          id?: string
          type?: string
          used_by?: string | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_discounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_discounts_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_consent_records: {
        Row: {
          consent_method: string
          consent_scope: Json
          consent_timestamp: string | null
          created_at: string | null
          device_id: string
          id: string
          legal_basis: string
          parent_consent: boolean | null
          platform: string
          user_id: string
          withdrawal_method: string | null
          withdrawal_timestamp: string | null
        }
        Insert: {
          consent_method: string
          consent_scope: Json
          consent_timestamp?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          legal_basis: string
          parent_consent?: boolean | null
          platform: string
          user_id: string
          withdrawal_method?: string | null
          withdrawal_timestamp?: string | null
        }
        Update: {
          consent_method?: string
          consent_scope?: Json
          consent_timestamp?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          legal_basis?: string
          parent_consent?: boolean | null
          platform?: string
          user_id?: string
          withdrawal_method?: string | null
          withdrawal_timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iot_consent_records_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "smart_home_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iot_consent_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_detection_audit: {
        Row: {
          attribution_added: boolean
          attribution_displayed_at: string | null
          confidence_scores: Json | null
          detected_characters: Json | null
          detection_method: string | null
          detection_timestamp: string
          id: string
          metadata: Json | null
          session_id: string | null
          story_id: string | null
          user_id: string | null
        }
        Insert: {
          attribution_added?: boolean
          attribution_displayed_at?: string | null
          confidence_scores?: Json | null
          detected_characters?: Json | null
          detection_method?: string | null
          detection_timestamp?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          story_id?: string | null
          user_id?: string | null
        }
        Update: {
          attribution_added?: boolean
          attribution_displayed_at?: string | null
          confidence_scores?: Json | null
          detected_characters?: Json | null
          detection_method?: string | null
          detection_timestamp?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          story_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ip_detection_audit_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_detection_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ip_disputes: {
        Row: {
          character_name: string
          created_at: string
          dispute_type: string
          franchise: string | null
          id: string
          legal_escalated: boolean
          owner: string | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          story_id: string | null
          updated_at: string
        }
        Insert: {
          character_name: string
          created_at?: string
          dispute_type: string
          franchise?: string | null
          id?: string
          legal_escalated?: boolean
          owner?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          story_id?: string | null
          updated_at?: string
        }
        Update: {
          character_name?: string
          created_at?: string
          dispute_type?: string
          franchise?: string | null
          id?: string
          legal_escalated?: boolean
          owner?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          story_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ip_disputes_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ip_disputes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_analytics: {
        Row: {
          avg_confidence: number | null
          created_at: string | null
          date: string
          escalated_queries: number | null
          id: string
          resolved_queries: number | null
          top_categories: Json | null
          total_queries: number | null
          user_satisfaction_rate: number | null
        }
        Insert: {
          avg_confidence?: number | null
          created_at?: string | null
          date: string
          escalated_queries?: number | null
          id?: string
          resolved_queries?: number | null
          top_categories?: Json | null
          total_queries?: number | null
          user_satisfaction_rate?: number | null
        }
        Update: {
          avg_confidence?: number | null
          created_at?: string | null
          date?: string
          escalated_queries?: number | null
          id?: string
          resolved_queries?: number | null
          top_categories?: Json | null
          total_queries?: number | null
          user_satisfaction_rate?: number | null
        }
        Relationships: []
      }
      knowledge_content: {
        Row: {
          category: string
          confidence_threshold: number | null
          content: string
          content_type: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          popularity_score: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_types: string[] | null
        }
        Insert: {
          category: string
          confidence_threshold?: number | null
          content: string
          content_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          popularity_score?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_types?: string[] | null
        }
        Update: {
          category?: string
          confidence_threshold?: number | null
          content?: string
          content_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          popularity_score?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_types?: string[] | null
        }
        Relationships: []
      }
      knowledge_queries: {
        Row: {
          category: string | null
          confidence_score: number | null
          created_at: string | null
          escalated_to_support: boolean | null
          id: string
          query_text: string
          response_id: string | null
          response_type: string
          session_id: string
          user_id: string | null
          user_satisfied: boolean | null
        }
        Insert: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          escalated_to_support?: boolean | null
          id?: string
          query_text: string
          response_id?: string | null
          response_type: string
          session_id: string
          user_id?: string | null
          user_satisfied?: boolean | null
        }
        Update: {
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          escalated_to_support?: boolean | null
          id?: string
          query_text?: string
          response_id?: string | null
          response_type?: string
          session_id?: string
          user_id?: string | null
          user_satisfied?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_queries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_support_escalations: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          escalation_reason: string
          id: string
          priority: string | null
          query_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          escalation_reason: string
          id?: string
          priority?: string | null
          query_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          escalation_reason?: string
          id?: string
          priority?: string | null
          query_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_support_escalations_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "knowledge_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_support_escalations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      language_profiles: {
        Row: {
          code: string
          created_at: string | null
          dialect_variant: string | null
          formality: string | null
          id: string
          name: string
          native_name: string
          proficiency_level: string | null
          rtl: boolean | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          dialect_variant?: string | null
          formality?: string | null
          id?: string
          name: string
          native_name: string
          proficiency_level?: string | null
          rtl?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          dialect_variant?: string | null
          formality?: string | null
          id?: string
          name?: string
          native_name?: string
          proficiency_level?: string | null
          rtl?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      language_simplifications: {
        Row: {
          id: string
          original_text: string
          readability_score: number
          simplification_count: number
          simplified_text: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          id?: string
          original_text: string
          readability_score: number
          simplification_count: number
          simplified_text: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          id?: string
          original_text?: string
          readability_score?: number
          simplification_count?: number
          simplified_text?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_simplifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_objectives: {
        Row: {
          assessment_criteria: string[]
          created_at: string | null
          description: string
          difficulty: string
          estimated_duration: number
          framework_id: string
          grade_level: string
          id: string
          prerequisites: string[] | null
          skills: string[]
          standards: string[]
          subject_area: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assessment_criteria: string[]
          created_at?: string | null
          description: string
          difficulty: string
          estimated_duration: number
          framework_id: string
          grade_level: string
          id?: string
          prerequisites?: string[] | null
          skills: string[]
          standards: string[]
          subject_area: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assessment_criteria?: string[]
          created_at?: string | null
          description?: string
          difficulty?: string
          estimated_duration?: number
          framework_id?: string
          grade_level?: string
          id?: string
          prerequisites?: string[] | null
          skills?: string[]
          standards?: string[]
          subject_area?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "curriculum_frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      libraries: {
        Row: {
          age_range: string | null
          consent_status: string | null
          created_at: string | null
          evaluated_at: string | null
          id: string
          is_minor: boolean | null
          is_storytailor_id: boolean | null
          name: string
          owner: string
          parent_library: string | null
          policy_version: string | null
          primary_character_id: string | null
        }
        Insert: {
          age_range?: string | null
          consent_status?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          id?: string
          is_minor?: boolean | null
          is_storytailor_id?: boolean | null
          name: string
          owner: string
          parent_library?: string | null
          policy_version?: string | null
          primary_character_id?: string | null
        }
        Update: {
          age_range?: string | null
          consent_status?: string | null
          created_at?: string | null
          evaluated_at?: string | null
          id?: string
          is_minor?: boolean | null
          is_storytailor_id?: boolean | null
          name?: string
          owner?: string
          parent_library?: string | null
          policy_version?: string | null
          primary_character_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "libraries_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libraries_parent_library_fkey"
            columns: ["parent_library"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "libraries_primary_character_id_fkey"
            columns: ["primary_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      library_consent: {
        Row: {
          adult_user_id: string
          consent_method: string
          consent_record_id: string
          consent_scope: Json
          consent_status: string
          created_at: string | null
          expires_at: string | null
          id: string
          library_id: string
          requested_at: string | null
          revoked_at: string | null
          updated_at: string | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          adult_user_id: string
          consent_method: string
          consent_record_id: string
          consent_scope?: Json
          consent_status?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          library_id: string
          requested_at?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          adult_user_id?: string
          consent_method?: string
          consent_record_id?: string
          consent_scope?: Json
          consent_status?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          library_id?: string
          requested_at?: string | null
          revoked_at?: string | null
          updated_at?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_consent_adult_user_id_fkey"
            columns: ["adult_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_consent_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      library_insights: {
        Row: {
          average_story_rating: number | null
          created_at: string | null
          emotional_patterns: Json | null
          id: string
          library_id: string
          most_active_user: string | null
          popular_story_types: string[] | null
          story_completion_rate: number | null
          total_characters: number | null
          total_stories: number | null
          updated_at: string | null
          usage_statistics: Json | null
        }
        Insert: {
          average_story_rating?: number | null
          created_at?: string | null
          emotional_patterns?: Json | null
          id?: string
          library_id: string
          most_active_user?: string | null
          popular_story_types?: string[] | null
          story_completion_rate?: number | null
          total_characters?: number | null
          total_stories?: number | null
          updated_at?: string | null
          usage_statistics?: Json | null
        }
        Update: {
          average_story_rating?: number | null
          created_at?: string | null
          emotional_patterns?: Json | null
          id?: string
          library_id?: string
          most_active_user?: string | null
          popular_story_types?: string[] | null
          story_completion_rate?: number | null
          total_characters?: number | null
          total_stories?: number | null
          updated_at?: string | null
          usage_statistics?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "library_insights_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: true
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_insights_most_active_user_fkey"
            columns: ["most_active_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      library_permissions: {
        Row: {
          created_at: string | null
          granted_by: string
          id: string
          library_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by: string
          id?: string
          library_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string
          id?: string
          library_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_permissions_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      localization_cache: {
        Row: {
          confidence_score: number | null
          content_hash: string
          created_at: string | null
          cultural_adaptations: string[] | null
          cultural_context_hash: string
          expires_at: string | null
          id: string
          language_notes: string[] | null
          localized_content: string
          source_language: string
          target_language: string
        }
        Insert: {
          confidence_score?: number | null
          content_hash: string
          created_at?: string | null
          cultural_adaptations?: string[] | null
          cultural_context_hash: string
          expires_at?: string | null
          id?: string
          language_notes?: string[] | null
          localized_content: string
          source_language: string
          target_language: string
        }
        Update: {
          confidence_score?: number | null
          content_hash?: string
          created_at?: string | null
          cultural_adaptations?: string[] | null
          cultural_context_hash?: string
          expires_at?: string | null
          id?: string
          language_notes?: string[] | null
          localized_content?: string
          source_language?: string
          target_language?: string
        }
        Relationships: []
      }
      mandatory_reporting_records: {
        Row: {
          created_at: string | null
          evidence: string[]
          follow_up_required: boolean
          id: string
          report_number: string | null
          report_type: string
          reported_at: string
          reporting_agency: string
          severity: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          evidence?: string[]
          follow_up_required?: boolean
          id?: string
          report_number?: string | null
          report_type: string
          reported_at?: string
          reporting_agency: string
          severity: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          evidence?: string[]
          follow_up_required?: boolean
          id?: string
          report_number?: string | null
          report_type?: string
          reported_at?: string
          reporting_agency?: string
          severity?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandatory_reporting_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          deleted_at: string | null
          deletion_request_id: string | null
          glacier_archive_id: string | null
          id: string
          metadata: Json | null
          story_id: string
          url: string
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          deleted_at?: string | null
          deletion_request_id?: string | null
          glacier_archive_id?: string | null
          id?: string
          metadata?: Json | null
          story_id: string
          url: string
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          deleted_at?: string | null
          deletion_request_id?: string | null
          glacier_archive_id?: string | null
          id?: string
          metadata?: Json | null
          story_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_deletion_request_id_fkey"
            columns: ["deletion_request_id"]
            isOneToOne: false
            referencedRelation: "deletion_requests"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "media_assets_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      multimodal_inputs: {
        Row: {
          confidence: number
          id: string
          input_data: Json
          input_type: string
          processing_time: number
          session_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          confidence: number
          id?: string
          input_data: Json
          input_type: string
          processing_time: number
          session_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          id?: string
          input_data?: Json
          input_type?: string
          processing_time?: number
          session_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multimodal_inputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_access_tokens: {
        Row: {
          audience: string[] | null
          client_id: string
          created_at: string | null
          expires_at: string
          id: string
          issued_at: string | null
          last_used_at: string | null
          refresh_token_id: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope: string
          token_hash: string
          token_type: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          audience?: string[] | null
          client_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          issued_at?: string | null
          last_used_at?: string | null
          refresh_token_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope: string
          token_hash: string
          token_type?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          audience?: string[] | null
          client_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          issued_at?: string | null
          last_used_at?: string | null
          refresh_token_id?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string
          token_hash?: string
          token_type?: string | null
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_access_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "oauth_access_tokens_refresh_token_id_fkey"
            columns: ["refresh_token_id"]
            isOneToOne: false
            referencedRelation: "oauth_refresh_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_authorization_codes: {
        Row: {
          auth_time: string
          client_id: string
          code: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          nonce: string | null
          redirect_uri: string
          scope: string
          session_id: string | null
          state: string | null
          used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_time?: string
          client_id: string
          code: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          nonce?: string | null
          redirect_uri: string
          scope: string
          session_id?: string | null
          state?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_time?: string
          client_id?: string
          code?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          nonce?: string | null
          redirect_uri?: string
          scope?: string
          session_id?: string | null
          state?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_authorization_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      oauth_clients: {
        Row: {
          access_token_ttl: number | null
          age_gate_enabled: boolean | null
          allowed_code_challenge_methods: string[] | null
          allowed_grant_types: string[]
          allowed_response_types: string[]
          allowed_scopes: string[]
          application_type: string | null
          client_id: string
          client_name: string
          client_secret: string | null
          client_type: string
          contacts: string[] | null
          created_at: string | null
          created_by: string | null
          id: string
          id_token_signed_response_alg: string | null
          id_token_ttl: number | null
          is_active: boolean | null
          jwks_uri: string | null
          logo_uri: string | null
          min_age_requirement: number | null
          policy_uri: string | null
          redirect_uris: string[]
          refresh_token_ttl: number | null
          require_pkce: boolean | null
          requires_parental_consent: boolean | null
          sector_identifier_uri: string | null
          subject_type: string | null
          token_endpoint_auth_method: string | null
          tos_uri: string | null
          updated_at: string | null
          userinfo_signed_response_alg: string | null
        }
        Insert: {
          access_token_ttl?: number | null
          age_gate_enabled?: boolean | null
          allowed_code_challenge_methods?: string[] | null
          allowed_grant_types?: string[]
          allowed_response_types?: string[]
          allowed_scopes?: string[]
          application_type?: string | null
          client_id: string
          client_name: string
          client_secret?: string | null
          client_type: string
          contacts?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          id_token_signed_response_alg?: string | null
          id_token_ttl?: number | null
          is_active?: boolean | null
          jwks_uri?: string | null
          logo_uri?: string | null
          min_age_requirement?: number | null
          policy_uri?: string | null
          redirect_uris: string[]
          refresh_token_ttl?: number | null
          require_pkce?: boolean | null
          requires_parental_consent?: boolean | null
          sector_identifier_uri?: string | null
          subject_type?: string | null
          token_endpoint_auth_method?: string | null
          tos_uri?: string | null
          updated_at?: string | null
          userinfo_signed_response_alg?: string | null
        }
        Update: {
          access_token_ttl?: number | null
          age_gate_enabled?: boolean | null
          allowed_code_challenge_methods?: string[] | null
          allowed_grant_types?: string[]
          allowed_response_types?: string[]
          allowed_scopes?: string[]
          application_type?: string | null
          client_id?: string
          client_name?: string
          client_secret?: string | null
          client_type?: string
          contacts?: string[] | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          id_token_signed_response_alg?: string | null
          id_token_ttl?: number | null
          is_active?: boolean | null
          jwks_uri?: string | null
          logo_uri?: string | null
          min_age_requirement?: number | null
          policy_uri?: string | null
          redirect_uris?: string[]
          refresh_token_ttl?: number | null
          require_pkce?: boolean | null
          requires_parental_consent?: boolean | null
          sector_identifier_uri?: string | null
          subject_type?: string | null
          token_endpoint_auth_method?: string | null
          tos_uri?: string | null
          updated_at?: string | null
          userinfo_signed_response_alg?: string | null
        }
        Relationships: []
      }
      oauth_consent_records: {
        Row: {
          client_id: string
          consent_expires_at: string | null
          consent_given_at: string | null
          consent_revoked_at: string | null
          created_at: string | null
          denied_scopes: string[] | null
          granted_scopes: string[]
          id: string
          parent_consent_ip: unknown
          parent_consent_method: string | null
          parent_consent_timestamp: string | null
          parent_user_id: string | null
          requires_parental_consent: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          consent_expires_at?: string | null
          consent_given_at?: string | null
          consent_revoked_at?: string | null
          created_at?: string | null
          denied_scopes?: string[] | null
          granted_scopes: string[]
          id?: string
          parent_consent_ip?: unknown
          parent_consent_method?: string | null
          parent_consent_timestamp?: string | null
          parent_user_id?: string | null
          requires_parental_consent?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          consent_expires_at?: string | null
          consent_given_at?: string | null
          consent_revoked_at?: string | null
          created_at?: string | null
          denied_scopes?: string[] | null
          granted_scopes?: string[]
          id?: string
          parent_consent_ip?: unknown
          parent_consent_method?: string | null
          parent_consent_timestamp?: string | null
          parent_user_id?: string | null
          requires_parental_consent?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_consent_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      oauth_events: {
        Row: {
          client_id: string | null
          created_at: string | null
          error_code: string | null
          error_description: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oauth_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      oauth_id_token_claims: {
        Row: {
          address_country: string | null
          address_formatted: string | null
          address_locality: string | null
          address_postal_code: string | null
          address_region: string | null
          address_street: string | null
          birthdate: string | null
          character_ids: string[] | null
          content_preferences: Json | null
          created_at: string | null
          email_verified: boolean | null
          family_id: string | null
          gender: string | null
          id: string
          locale: string | null
          phone_number: string | null
          phone_number_verified: boolean | null
          picture_url: string | null
          preferred_username: string | null
          profile_url: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          zoneinfo: string | null
        }
        Insert: {
          address_country?: string | null
          address_formatted?: string | null
          address_locality?: string | null
          address_postal_code?: string | null
          address_region?: string | null
          address_street?: string | null
          birthdate?: string | null
          character_ids?: string[] | null
          content_preferences?: Json | null
          created_at?: string | null
          email_verified?: boolean | null
          family_id?: string | null
          gender?: string | null
          id?: string
          locale?: string | null
          phone_number?: string | null
          phone_number_verified?: boolean | null
          picture_url?: string | null
          preferred_username?: string | null
          profile_url?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          zoneinfo?: string | null
        }
        Update: {
          address_country?: string | null
          address_formatted?: string | null
          address_locality?: string | null
          address_postal_code?: string | null
          address_region?: string | null
          address_street?: string | null
          birthdate?: string | null
          character_ids?: string[] | null
          content_preferences?: Json | null
          created_at?: string | null
          email_verified?: boolean | null
          family_id?: string | null
          gender?: string | null
          id?: string
          locale?: string | null
          phone_number?: string | null
          phone_number_verified?: boolean | null
          picture_url?: string | null
          preferred_username?: string | null
          profile_url?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          zoneinfo?: string | null
        }
        Relationships: []
      }
      oauth_jwks: {
        Row: {
          alg: string
          created_at: string | null
          id: string
          is_active: boolean | null
          kid: string
          kty: string
          private_key_encrypted: string
          public_key: string
          revocation_reason: string | null
          revoked_at: string | null
          rotated_from_kid: string | null
          use: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          alg: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kid: string
          kty: string
          private_key_encrypted: string
          public_key: string
          revocation_reason?: string | null
          revoked_at?: string | null
          rotated_from_kid?: string | null
          use: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          alg?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          kid?: string
          kty?: string
          private_key_encrypted?: string
          public_key?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          rotated_from_kid?: string | null
          use?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      oauth_refresh_tokens: {
        Row: {
          client_id: string
          created_at: string | null
          device_id: string | null
          expires_at: string
          id: string
          ip_address: unknown
          last_used_at: string | null
          previous_token_hash: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          rotation_count: number | null
          scope: string
          session_id: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          device_id?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          last_used_at?: string | null
          previous_token_hash?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          rotation_count?: number | null
          scope: string
          session_id?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          device_id?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_used_at?: string | null
          previous_token_hash?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          rotation_count?: number | null
          scope?: string
          session_id?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_refresh_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      organization_accounts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_id: string
          seat_count: number
          subscription_id: string
          updated_at: string | null
          used_seats: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          seat_count?: number
          subscription_id: string
          updated_at?: string | null
          used_seats?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          seat_count?: number
          subscription_id?: string
          updated_at?: string | null
          used_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_accounts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          max_seats: number
          name: string
          owner_id: string | null
          settings: Json | null
          slug: string
          subscription_tier: string | null
          updated_at: string | null
          used_seats: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_seats?: number
          name: string
          owner_id?: string | null
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          updated_at?: string | null
          used_seats?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          max_seats?: number
          name?: string
          owner_id?: string | null
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          updated_at?: string | null
          used_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          actions_taken: string[]
          created_at: string | null
          delivery_status: string | null
          id: string
          message: string
          notification_type: string
          parent_email: string
          recommended_actions: string[]
          sent_at: string | null
          severity: string
          timestamp: string
          user_id: string
        }
        Insert: {
          actions_taken?: string[]
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          message: string
          notification_type: string
          parent_email: string
          recommended_actions?: string[]
          sent_at?: string | null
          severity: string
          timestamp?: string
          user_id: string
        }
        Update: {
          actions_taken?: string[]
          created_at?: string | null
          delivery_status?: string | null
          id?: string
          message?: string
          notification_type?: string
          parent_email?: string
          recommended_actions?: string[]
          sent_at?: string | null
          severity?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_teacher_communications: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          parent_email: string
          parent_response: string | null
          priority: string | null
          response_date: string | null
          sent_at: string | null
          student_id: string
          subject: string
          teacher_id: string
          type: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          parent_email: string
          parent_response?: string | null
          priority?: string | null
          response_date?: string | null
          sent_at?: string | null
          student_id: string
          subject: string
          teacher_id: string
          type?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          parent_email?: string
          parent_response?: string | null
          priority?: string | null
          response_date?: string | null
          sent_at?: string | null
          student_id?: string
          subject?: string
          teacher_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_teacher_communications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_teacher_communications_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      parental_consents: {
        Row: {
          consent_document_url: string | null
          consent_type: string
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          id: string
          ip_address: unknown
          parent_email: string
          revoked_at: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_document_url?: string | null
          consent_type: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          parent_email: string
          revoked_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_document_url?: string | null
          consent_type?: string
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          id?: string
          ip_address?: unknown
          parent_email?: string
          revoked_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parental_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_contributions: {
        Row: {
          contribution: string
          created_at: string | null
          id: string
          session_id: string
          student_id: string
          timestamp: string | null
          word_count: number
        }
        Insert: {
          contribution: string
          created_at?: string | null
          id?: string
          session_id: string
          student_id: string
          timestamp?: string | null
          word_count: number
        }
        Update: {
          contribution?: string
          created_at?: string | null
          id?: string
          session_id?: string
          student_id?: string
          timestamp?: string | null
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "participant_contributions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_storytelling_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_contributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_transfer_magic_links: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          magic_token: string
          recipient_email: string
          transfer_id: string
          used_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          magic_token: string
          recipient_email: string
          transfer_id: string
          used_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          magic_token?: string
          recipient_email?: string
          transfer_id?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_transfer_magic_links_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "story_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_executions: {
        Row: {
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          pipeline_name: string
          pipeline_type: string
          result: Json | null
          started_at: string | null
          status: string
          trigger_data: Json | null
          triggered_by: string
          updated_at: string
          user_id: string | null
          veto_reason: string | null
          vetoed: boolean
        }
        Insert: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name: string
          pipeline_type: string
          result?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          triggered_by: string
          updated_at?: string
          user_id?: string | null
          veto_reason?: string | null
          vetoed?: boolean
        }
        Update: {
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          pipeline_name?: string
          pipeline_type?: string
          result?: Json | null
          started_at?: string | null
          status?: string
          trigger_data?: Json | null
          triggered_by?: string
          updated_at?: string
          user_id?: string | null
          veto_reason?: string | null
          vetoed?: boolean
        }
        Relationships: []
      }
      platform_embedding_configs: {
        Row: {
          action_id: string | null
          category: string
          content_rating: string | null
          created_at: string | null
          description: string
          embedding_code: string | null
          id: string
          invocation_name: string
          keywords: string[] | null
          permissions: Json | null
          platform: string
          privacy_policy_url: string
          shortcut_id: string | null
          skill_id: string | null
          smart_home_integration: Json | null
          status: string | null
          supported_locales: string[] | null
          target_audience: string | null
          terms_of_use_url: string
          updated_at: string | null
        }
        Insert: {
          action_id?: string | null
          category: string
          content_rating?: string | null
          created_at?: string | null
          description: string
          embedding_code?: string | null
          id?: string
          invocation_name: string
          keywords?: string[] | null
          permissions?: Json | null
          platform: string
          privacy_policy_url: string
          shortcut_id?: string | null
          skill_id?: string | null
          smart_home_integration?: Json | null
          status?: string | null
          supported_locales?: string[] | null
          target_audience?: string | null
          terms_of_use_url: string
          updated_at?: string | null
        }
        Update: {
          action_id?: string | null
          category?: string
          content_rating?: string | null
          created_at?: string | null
          description?: string
          embedding_code?: string | null
          id?: string
          invocation_name?: string
          keywords?: string[] | null
          permissions?: Json | null
          platform?: string
          privacy_policy_url?: string
          shortcut_id?: string | null
          skill_id?: string | null
          smart_home_integration?: Json | null
          status?: string | null
          supported_locales?: string[] | null
          target_audience?: string | null
          terms_of_use_url?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_integration_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          platform: string
          processed_at: string | null
          processing_status: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          platform: string
          processed_at?: string | null
          processing_status?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          platform?: string
          processed_at?: string | null
          processing_status?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_integration_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_device_tokens: {
        Row: {
          created_at: string | null
          device_name: string | null
          device_token: string
          enabled: boolean | null
          id: string
          platform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          device_token: string
          enabled?: boolean | null
          id?: string
          platform: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          device_token?: string
          enabled?: boolean | null
          id?: string
          platform?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_code_analytics: {
        Row: {
          id: string
          ip_hash: string | null
          referrer: string | null
          scanned_at: string | null
          story_id: string
          user_agent: string | null
        }
        Insert: {
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          scanned_at?: string | null
          story_id: string
          user_agent?: string | null
        }
        Update: {
          id?: string
          ip_hash?: string | null
          referrer?: string | null
          scanned_at?: string | null
          story_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_code_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcomes: {
        Row: {
          context: Json
          created_at: string
          decline_reason: string | null
          effectiveness_result: number | null
          followed_at: string | null
          id: string
          issued_at: string
          metadata: Json | null
          outcome: string | null
          outcome_determined_at: string | null
          recommendation: string
          recommendation_type: string
          repeat_safe: boolean | null
          updated_at: string
          user_followed: boolean | null
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          decline_reason?: string | null
          effectiveness_result?: number | null
          followed_at?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          outcome?: string | null
          outcome_determined_at?: string | null
          recommendation: string
          recommendation_type: string
          repeat_safe?: boolean | null
          updated_at?: string
          user_followed?: boolean | null
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          decline_reason?: string | null
          effectiveness_result?: number | null
          followed_at?: string | null
          id?: string
          issued_at?: string
          metadata?: Json | null
          outcome?: string | null
          outcome_determined_at?: string | null
          recommendation?: string
          recommendation_type?: string
          repeat_safe?: boolean | null
          updated_at?: string
          user_followed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      referral_tracking: {
        Row: {
          completed_at: string | null
          created_at: string | null
          discount_code: string | null
          id: string
          lifetime_value: number | null
          referee_id: string | null
          referrer_id: string
          reward_amount: number
          reward_status: string | null
          reward_type: string | null
          reward_value: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          discount_code?: string | null
          id?: string
          lifetime_value?: number | null
          referee_id?: string | null
          referrer_id: string
          reward_amount?: number
          reward_status?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          discount_code?: string | null
          id?: string
          lifetime_value?: number | null
          referee_id?: string | null
          referrer_id?: string
          reward_amount?: number
          reward_status?: string | null
          reward_type?: string | null
          reward_value?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_tracking_discount_code_fkey"
            columns: ["discount_code"]
            isOneToOne: false
            referencedRelation: "invite_discounts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "referral_tracking_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_tracking_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          revoked: boolean | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          revoked?: boolean | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          revoked?: boolean | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      religious_sensitivity_guidelines: {
        Row: {
          appropriate_alternatives: Json | null
          celebrations_to_avoid: string[] | null
          celebrations_to_include: string[] | null
          created_at: string | null
          id: string
          religion: string
          respectful_language: string[] | null
          sensitive_topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          appropriate_alternatives?: Json | null
          celebrations_to_avoid?: string[] | null
          celebrations_to_include?: string[] | null
          created_at?: string | null
          id?: string
          religion: string
          respectful_language?: string[] | null
          sensitive_topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          appropriate_alternatives?: Json | null
          celebrations_to_avoid?: string[] | null
          celebrations_to_include?: string[] | null
          created_at?: string | null
          id?: string
          religion?: string
          respectful_language?: string[] | null
          sensitive_topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      research_agent_challenges: {
        Row: {
          actionable: boolean | null
          agent_response: string | null
          challenged_agent: string
          created_at: string | null
          data_backing: Json
          id: string
          question: string
          synthesis: string
          tenant_id: string
        }
        Insert: {
          actionable?: boolean | null
          agent_response?: string | null
          challenged_agent: string
          created_at?: string | null
          data_backing?: Json
          id?: string
          question: string
          synthesis: string
          tenant_id: string
        }
        Update: {
          actionable?: boolean | null
          agent_response?: string | null
          challenged_agent?: string
          created_at?: string | null
          data_backing?: Json
          id?: string
          question?: string
          synthesis?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_agent_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_briefs: {
        Row: {
          content: string
          created_at: string | null
          critical: Json | null
          delivered_at: string | null
          format: string
          id: string
          kill_list: Json
          opportunities: Json
          reality_check: Json
          self_deception: Json | null
          tenant_id: string
          tensions: Json
          week_of: string
          what_we_shipped: Json
        }
        Insert: {
          content: string
          created_at?: string | null
          critical?: Json | null
          delivered_at?: string | null
          format?: string
          id?: string
          kill_list?: Json
          opportunities?: Json
          reality_check: Json
          self_deception?: Json | null
          tenant_id: string
          tensions?: Json
          week_of: string
          what_we_shipped?: Json
        }
        Update: {
          content?: string
          created_at?: string | null
          critical?: Json | null
          delivered_at?: string | null
          format?: string
          id?: string
          kill_list?: Json
          opportunities?: Json
          reality_check?: Json
          self_deception?: Json | null
          tenant_id?: string
          tensions?: Json
          week_of?: string
          what_we_shipped?: Json
        }
        Relationships: [
          {
            foreignKeyName: "research_briefs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_cache: {
        Row: {
          cache_key: string
          computed_at: string
          expires_at: string
          id: string
          insight: Json
          metric_value: number
          tenant_id: string
        }
        Insert: {
          cache_key: string
          computed_at?: string
          expires_at: string
          id?: string
          insight: Json
          metric_value: number
          tenant_id: string
        }
        Update: {
          cache_key?: string
          computed_at?: string
          expires_at?: string
          id?: string
          insight?: Json
          metric_value?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_cost_tracking: {
        Row: {
          analyses_generated: number
          cost_limit: number
          created_at: string | null
          estimated_cost: number
          events_processed: number
          id: string
          llm_tokens_used: Json
          period: string
          period_end: string
          period_start: string
          status: string
          tenant_id: string
        }
        Insert: {
          analyses_generated?: number
          cost_limit: number
          created_at?: string | null
          estimated_cost?: number
          events_processed?: number
          id?: string
          llm_tokens_used?: Json
          period: string
          period_end: string
          period_start: string
          status?: string
          tenant_id: string
        }
        Update: {
          analyses_generated?: number
          cost_limit?: number
          created_at?: string | null
          estimated_cost?: number
          events_processed?: number
          id?: string
          llm_tokens_used?: Json
          period?: string
          period_end?: string
          period_start?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_cost_tracking_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_insights: {
        Row: {
          created_at: string | null
          evidence: Json
          finding: string
          id: string
          metadata: Json | null
          recommendation: string
          severity: string
          tenant_id: string
          track_type: string
        }
        Insert: {
          created_at?: string | null
          evidence?: Json
          finding: string
          id?: string
          metadata?: Json | null
          recommendation: string
          severity: string
          tenant_id: string
          track_type: string
        }
        Update: {
          created_at?: string | null
          evidence?: Json
          finding?: string
          id?: string
          metadata?: Json | null
          recommendation?: string
          severity?: string
          tenant_id?: string
          track_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_pre_launch_memos: {
        Row: {
          buyer_lens: Json
          concept: string
          confidence: number
          created_at: string | null
          feature_name: string
          id: string
          language_audit: Json
          reality: string
          recommendation: string
          tenant_id: string
          tension_map: Json
          user_lens: Json
          what_will_confuse: Json
          when_would_they_quit: Json
          who_is_this_for: Json
        }
        Insert: {
          buyer_lens: Json
          concept: string
          confidence: number
          created_at?: string | null
          feature_name: string
          id?: string
          language_audit: Json
          reality: string
          recommendation: string
          tenant_id: string
          tension_map?: Json
          user_lens: Json
          what_will_confuse?: Json
          when_would_they_quit?: Json
          who_is_this_for: Json
        }
        Update: {
          buyer_lens?: Json
          concept?: string
          confidence?: number
          created_at?: string | null
          feature_name?: string
          id?: string
          language_audit?: Json
          reality?: string
          recommendation?: string
          tenant_id?: string
          tension_map?: Json
          user_lens?: Json
          what_will_confuse?: Json
          when_would_they_quit?: Json
          who_is_this_for?: Json
        }
        Relationships: [
          {
            foreignKeyName: "research_pre_launch_memos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      research_tenants: {
        Row: {
          config: Json
          cost_limit: number
          created_at: string | null
          id: string
          is_active: boolean | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          config: Json
          cost_limit?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json
          cost_limit?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      research_usage_metrics: {
        Row: {
          cost: number
          created_at: string | null
          duration: number
          id: string
          model: string
          operation: string
          tenant_id: string
          timestamp: string
          tokens_used: number
        }
        Insert: {
          cost: number
          created_at?: string | null
          duration: number
          id?: string
          model: string
          operation: string
          tenant_id: string
          timestamp?: string
          tokens_used: number
        }
        Update: {
          cost?: number
          created_at?: string | null
          duration?: number
          id?: string
          model?: string
          operation?: string
          tenant_id?: string
          timestamp?: string
          tokens_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "research_usage_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      response_adaptations: {
        Row: {
          adaptation_types: string[]
          adapted_response: string
          effectiveness_score: number | null
          id: string
          original_response: string
          target_profile: string
          timestamp: string | null
        }
        Insert: {
          adaptation_types: string[]
          adapted_response: string
          effectiveness_score?: number | null
          id?: string
          original_response: string
          target_profile: string
          timestamp?: string | null
        }
        Update: {
          adaptation_types?: string[]
          adapted_response?: string
          effectiveness_score?: number | null
          id?: string
          original_response?: string
          target_profile?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "response_adaptations_target_profile_fkey"
            columns: ["target_profile"]
            isOneToOne: false
            referencedRelation: "accessibility_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      response_latency_data: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          question: string
          question_type: string
          response_time: number
          session_id: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          question: string
          question_type: string
          response_time: number
          session_id: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          question?: string
          question_type?: string
          response_time?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_latency_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_ledger: {
        Row: {
          amount: number
          applied_at: string | null
          applied_to_invoice: string | null
          created_at: string
          currency: string
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          source: string
          status: string
          stripe_balance_txn_id: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applied_to_invoice?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          source: string
          status?: string
          stripe_balance_txn_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applied_to_invoice?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          status?: string
          stripe_balance_txn_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_assessments: {
        Row: {
          assessment_date: string | null
          assessor: string | null
          id: string
          intervention_urgency: string
          next_assessment_due: string
          notes: string | null
          overall_risk_level: string
          protective_factors: Json
          recommended_interventions: Json
          risk_factors: Json
          user_id: string
        }
        Insert: {
          assessment_date?: string | null
          assessor?: string | null
          id?: string
          intervention_urgency: string
          next_assessment_due: string
          notes?: string | null
          overall_risk_level: string
          protective_factors?: Json
          recommended_interventions?: Json
          risk_factors?: Json
          user_id: string
        }
        Update: {
          assessment_date?: string | null
          assessor?: string | null
          id?: string
          intervention_urgency?: string
          next_assessment_due?: string
          notes?: string | null
          overall_risk_level?: string
          protective_factors?: Json
          recommended_interventions?: Json
          risk_factors?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_incidents: {
        Row: {
          actions_taken: string[]
          context: string
          created_at: string | null
          description: string
          follow_up_required: boolean
          id: string
          incident_type: string
          reporting_completed: boolean
          reporting_required: boolean
          resolved_at: string | null
          session_id: string
          severity: string
          timestamp: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actions_taken?: string[]
          context: string
          created_at?: string | null
          description: string
          follow_up_required?: boolean
          id?: string
          incident_type: string
          reporting_completed?: boolean
          reporting_required?: boolean
          resolved_at?: string | null
          session_id: string
          severity: string
          timestamp?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actions_taken?: string[]
          context?: string
          created_at?: string | null
          description?: string
          follow_up_required?: boolean
          id?: string
          incident_type?: string
          reporting_completed?: boolean
          reporting_required?: boolean
          resolved_at?: string | null
          session_id?: string
          severity?: string
          timestamp?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_incidents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_plans: {
        Row: {
          coping_strategies: string[]
          created_at: string | null
          emergency_contacts: Json
          id: string
          plan_id: string
          professional_contacts: Json
          review_schedule: string
          safe_environment_steps: string[]
          status: string | null
          support_contacts: Json
          trigger_signs: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coping_strategies: string[]
          created_at?: string | null
          emergency_contacts?: Json
          id?: string
          plan_id: string
          professional_contacts?: Json
          review_schedule: string
          safe_environment_steps: string[]
          status?: string | null
          support_contacts?: Json
          trigger_signs: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coping_strategies?: string[]
          created_at?: string | null
          emergency_contacts?: Json
          id?: string
          plan_id?: string
          professional_contacts?: Json
          review_schedule?: string
          safe_environment_steps?: string[]
          status?: string | null
          support_contacts?: Json
          trigger_signs?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: Json | null
          contact_info: Json | null
          created_at: string | null
          district: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          contact_info?: Json | null
          created_at?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      self_healing_config: {
        Row: {
          agent_name: string
          allowed_end_time: string
          allowed_start_time: string
          autonomy_level: number
          created_at: string | null
          enabled: boolean
          id: string
          max_actions_per_hour: number
          parent_notification: boolean
          story_session_protection: boolean
          timezone: string
          updated_at: string | null
        }
        Insert: {
          agent_name: string
          allowed_end_time?: string
          allowed_start_time?: string
          autonomy_level?: number
          created_at?: string | null
          enabled?: boolean
          id?: string
          max_actions_per_hour?: number
          parent_notification?: boolean
          story_session_protection?: boolean
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          agent_name?: string
          allowed_end_time?: string
          allowed_start_time?: string
          autonomy_level?: number
          created_at?: string | null
          enabled?: boolean
          id?: string
          max_actions_per_hour?: number
          parent_notification?: boolean
          story_session_protection?: boolean
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: string
          joined_at: string | null
          session_id: string
          student_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          session_id: string
          student_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_storytelling_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          token_hash: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          token_hash: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          token_hash?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_home_devices: {
        Row: {
          connected_at: string | null
          connection_status: string | null
          consent_given: boolean | null
          consent_scope: Json | null
          created_at: string | null
          data_retention_preference: string | null
          device_id_hash: string
          device_metadata: Json | null
          device_name: string
          device_type: string
          expires_at: string | null
          id: string
          last_token_refresh: string | null
          last_used_at: string | null
          parent_consent: boolean | null
          platform: string | null
          platform_capabilities: string[] | null
          refresh_attempts: number | null
          room_id: string
          room_name: string | null
          token_expires_at: string | null
          token_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          connection_status?: string | null
          consent_given?: boolean | null
          consent_scope?: Json | null
          created_at?: string | null
          data_retention_preference?: string | null
          device_id_hash: string
          device_metadata?: Json | null
          device_name: string
          device_type: string
          expires_at?: string | null
          id?: string
          last_token_refresh?: string | null
          last_used_at?: string | null
          parent_consent?: boolean | null
          platform?: string | null
          platform_capabilities?: string[] | null
          refresh_attempts?: number | null
          room_id: string
          room_name?: string | null
          token_expires_at?: string | null
          token_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          connected_at?: string | null
          connection_status?: string | null
          consent_given?: boolean | null
          consent_scope?: Json | null
          created_at?: string | null
          data_retention_preference?: string | null
          device_id_hash?: string
          device_metadata?: Json | null
          device_name?: string
          device_type?: string
          expires_at?: string | null
          id?: string
          last_token_refresh?: string | null
          last_used_at?: string | null
          parent_consent?: boolean | null
          platform?: string | null
          platform_capabilities?: string[] | null
          refresh_attempts?: number | null
          room_id?: string
          room_name?: string | null
          token_expires_at?: string | null
          token_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_home_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sonos_devices: {
        Row: {
          capabilities: Json | null
          connected_at: string | null
          connection_status: string | null
          consent_given: boolean | null
          consent_scope: Json | null
          created_at: string | null
          data_retention_preference: string | null
          device_id: string
          device_metadata: Json | null
          expires_at: string | null
          household_id: string
          id: string
          last_used_at: string | null
          location: string | null
          name: string
          parent_consent: boolean | null
          role: string | null
          room_id: string
          room_name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capabilities?: Json | null
          connected_at?: string | null
          connection_status?: string | null
          consent_given?: boolean | null
          consent_scope?: Json | null
          created_at?: string | null
          data_retention_preference?: string | null
          device_id: string
          device_metadata?: Json | null
          expires_at?: string | null
          household_id: string
          id?: string
          last_used_at?: string | null
          location?: string | null
          name: string
          parent_consent?: boolean | null
          role?: string | null
          room_id: string
          room_name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capabilities?: Json | null
          connected_at?: string | null
          connection_status?: string | null
          consent_given?: boolean | null
          consent_scope?: Json | null
          created_at?: string | null
          data_retention_preference?: string | null
          device_id?: string
          device_metadata?: Json | null
          expires_at?: string | null
          household_id?: string
          id?: string
          last_used_at?: string | null
          location?: string | null
          name?: string
          parent_consent?: boolean | null
          role?: string | null
          room_id?: string
          room_name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sonos_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sonos_groups: {
        Row: {
          created_at: string | null
          group_id: string
          group_type: string | null
          household_id: string
          id: string
          name: string
          room_id: string
          speaker_ids: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          group_type?: string | null
          household_id: string
          id?: string
          name: string
          room_id: string
          speaker_ids: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          group_type?: string | null
          household_id?: string
          id?: string
          name?: string
          room_id?: string
          speaker_ids?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sonos_groups_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sonos_tokens: {
        Row: {
          access_token_encrypted: string
          created_at: string | null
          encryption_key_id: string
          expires_at: string
          household_id: string
          id: string
          last_refresh: string | null
          refresh_attempts: number | null
          refresh_token_encrypted: string
          token_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string | null
          encryption_key_id: string
          expires_at: string
          household_id: string
          id?: string
          last_refresh?: string | null
          refresh_attempts?: number | null
          refresh_token_encrypted: string
          token_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string | null
          encryption_key_id?: string
          expires_at?: string
          household_id?: string
          id?: string
          last_refresh?: string | null
          refresh_attempts?: number | null
          refresh_token_encrypted?: string
          token_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sonos_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          activities: Json | null
          age_rating: number
          asset_generation_completed_at: string | null
          asset_generation_started_at: string | null
          asset_generation_status: Json | null
          audio_blocks: Json | null
          audio_duration: number | null
          audio_sfx_cues: Json | null
          audio_sfx_url: string | null
          audio_url: string | null
          audio_voice_id: string | null
          audio_words: Json | null
          color_palettes: Json | null
          consumption_insights: Json | null
          content: Json
          cover_art_url: string | null
          created_at: string | null
          creator_user_id: string | null
          effectiveness_score: number | null
          finalized_at: string | null
          hue_extracted_colors: Json | null
          id: string
          library_id: string
          metadata: Json | null
          pdf_file_size: number | null
          pdf_pages: number | null
          pdf_url: string | null
          profile_id: string | null
          qr_code_url: string | null
          qr_public_url: string | null
          qr_scan_count: number | null
          scene_art_urls: string[] | null
          spatial_audio_tracks: Json | null
          status: string | null
          story_type_id: string | null
          title: string
          webvtt_url: string | null
        }
        Insert: {
          activities?: Json | null
          age_rating: number
          asset_generation_completed_at?: string | null
          asset_generation_started_at?: string | null
          asset_generation_status?: Json | null
          audio_blocks?: Json | null
          audio_duration?: number | null
          audio_sfx_cues?: Json | null
          audio_sfx_url?: string | null
          audio_url?: string | null
          audio_voice_id?: string | null
          audio_words?: Json | null
          color_palettes?: Json | null
          consumption_insights?: Json | null
          content: Json
          cover_art_url?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          effectiveness_score?: number | null
          finalized_at?: string | null
          hue_extracted_colors?: Json | null
          id?: string
          library_id: string
          metadata?: Json | null
          pdf_file_size?: number | null
          pdf_pages?: number | null
          pdf_url?: string | null
          profile_id?: string | null
          qr_code_url?: string | null
          qr_public_url?: string | null
          qr_scan_count?: number | null
          scene_art_urls?: string[] | null
          spatial_audio_tracks?: Json | null
          status?: string | null
          story_type_id?: string | null
          title: string
          webvtt_url?: string | null
        }
        Update: {
          activities?: Json | null
          age_rating?: number
          asset_generation_completed_at?: string | null
          asset_generation_started_at?: string | null
          asset_generation_status?: Json | null
          audio_blocks?: Json | null
          audio_duration?: number | null
          audio_sfx_cues?: Json | null
          audio_sfx_url?: string | null
          audio_url?: string | null
          audio_voice_id?: string | null
          audio_words?: Json | null
          color_palettes?: Json | null
          consumption_insights?: Json | null
          content?: Json
          cover_art_url?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          effectiveness_score?: number | null
          finalized_at?: string | null
          hue_extracted_colors?: Json | null
          id?: string
          library_id?: string
          metadata?: Json | null
          pdf_file_size?: number | null
          pdf_pages?: number | null
          pdf_url?: string | null
          profile_id?: string | null
          qr_code_url?: string | null
          qr_public_url?: string | null
          qr_scan_count?: number | null
          scene_art_urls?: string[] | null
          spatial_audio_tracks?: Json | null
          status?: string | null
          story_type_id?: string | null
          title?: string
          webvtt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_story_type_id_fkey"
            columns: ["story_type_id"]
            isOneToOne: false
            referencedRelation: "story_types"
            referencedColumns: ["id"]
          },
        ]
      }
      story_choices: {
        Row: {
          choice_options: string[]
          choice_point: string
          created_at: string | null
          emotional_context: string | null
          id: string
          response_time: number
          selected_choice: string
          session_id: string
          story_id: string | null
          user_id: string
        }
        Insert: {
          choice_options: string[]
          choice_point: string
          created_at?: string | null
          emotional_context?: string | null
          id?: string
          response_time: number
          selected_choice: string
          session_id: string
          story_id?: string | null
          user_id: string
        }
        Update: {
          choice_options?: string[]
          choice_point?: string
          created_at?: string | null
          emotional_context?: string | null
          id?: string
          response_time?: number
          selected_choice?: string
          session_id?: string
          story_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_choices_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_choices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      story_credits_ledger: {
        Row: {
          amount: number
          credit_type: string
          earned_at: string | null
          id: string
          notes: string | null
          source_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          credit_type: string
          earned_at?: string | null
          id?: string
          notes?: string | null
          source_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          credit_type?: string
          earned_at?: string | null
          id?: string
          notes?: string | null
          source_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_effectiveness: {
        Row: {
          calculated_at: string
          comparison_baseline: Json | null
          completion_vs_baseline: number | null
          confidence_score: number | null
          context_tags: string[] | null
          effectiveness_score: number | null
          engagement_vs_baseline: number | null
          id: string
          mood_impact: Json | null
          recommended_for: string[] | null
          story_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calculated_at?: string
          comparison_baseline?: Json | null
          completion_vs_baseline?: number | null
          confidence_score?: number | null
          context_tags?: string[] | null
          effectiveness_score?: number | null
          engagement_vs_baseline?: number | null
          id?: string
          mood_impact?: Json | null
          recommended_for?: string[] | null
          story_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calculated_at?: string
          comparison_baseline?: Json | null
          completion_vs_baseline?: number | null
          confidence_score?: number | null
          context_tags?: string[] | null
          effectiveness_score?: number | null
          engagement_vs_baseline?: number | null
          id?: string
          mood_impact?: Json | null
          recommended_for?: string[] | null
          story_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_effectiveness_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_feedback: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          rating: number | null
          sentiment: string
          story_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          sentiment: string
          story_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          sentiment?: string
          story_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_feedback_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          session_id: string | null
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          session_id?: string | null
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          session_id?: string | null
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_interactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      story_lighting_profiles: {
        Row: {
          age_appropriate: Json
          base_profile: Json
          created_at: string | null
          id: string
          narrative_events: Json | null
          platform_compatibility: string[] | null
          profile_name: string
          story_type: string
          updated_at: string | null
        }
        Insert: {
          age_appropriate: Json
          base_profile: Json
          created_at?: string | null
          id?: string
          narrative_events?: Json | null
          platform_compatibility?: string[] | null
          profile_name: string
          story_type: string
          updated_at?: string | null
        }
        Update: {
          age_appropriate?: Json
          base_profile?: Json
          created_at?: string | null
          id?: string
          narrative_events?: Json | null
          platform_compatibility?: string[] | null
          profile_name?: string
          story_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      story_packs: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          pack_type: string
          purchased_at: string | null
          stories_remaining: number
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pack_type: string
          purchased_at?: string | null
          stories_remaining: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pack_type?: string
          purchased_at?: string | null
          stories_remaining?: number
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      story_recommendations: {
        Row: {
          accepted: boolean | null
          accepted_at: string | null
          adaptations: Json
          confidence: number
          emotional_outcome: string | null
          expected_emotional_impact: string
          feedback: string | null
          id: string
          reasoning: string
          recommended_at: string | null
          story_type: string
          theme: string
          tone: string
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          accepted_at?: string | null
          adaptations?: Json
          confidence: number
          emotional_outcome?: string | null
          expected_emotional_impact: string
          feedback?: string | null
          id?: string
          reasoning: string
          recommended_at?: string | null
          story_type: string
          theme: string
          tone: string
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          accepted_at?: string | null
          adaptations?: Json
          confidence?: number
          emotional_outcome?: string | null
          expected_emotional_impact?: string
          feedback?: string | null
          id?: string
          reasoning?: string
          recommended_at?: string | null
          story_type?: string
          theme?: string
          tone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      story_templates: {
        Row: {
          assessment_questions: Json
          character_guidelines: Json
          created_at: string | null
          description: string
          grade_level: string
          id: string
          is_active: boolean | null
          learning_objectives: string[]
          story_structure: Json
          subject_area: string
          title: string
          updated_at: string | null
          vocabulary: Json
        }
        Insert: {
          assessment_questions: Json
          character_guidelines: Json
          created_at?: string | null
          description: string
          grade_level: string
          id?: string
          is_active?: boolean | null
          learning_objectives: string[]
          story_structure: Json
          subject_area: string
          title: string
          updated_at?: string | null
          vocabulary: Json
        }
        Update: {
          assessment_questions?: Json
          character_guidelines?: Json
          created_at?: string | null
          description?: string
          grade_level?: string
          id?: string
          is_active?: boolean | null
          learning_objectives?: string[]
          story_structure?: Json
          subject_area?: string
          title?: string
          updated_at?: string | null
          vocabulary?: Json
        }
        Relationships: []
      }
      story_transfer_requests: {
        Row: {
          created_at: string | null
          expires_at: string | null
          from_library_id: string
          id: string
          requested_by: string
          responded_at: string | null
          responded_by: string | null
          response_message: string | null
          status: string | null
          story_id: string
          to_library_id: string
          transfer_message: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          from_library_id: string
          id?: string
          requested_by: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string | null
          story_id: string
          to_library_id: string
          transfer_message?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          from_library_id?: string
          id?: string
          requested_by?: string
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string | null
          story_id?: string
          to_library_id?: string
          transfer_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_transfer_requests_from_library_id_fkey"
            columns: ["from_library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfer_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfer_requests_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfer_requests_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfer_requests_to_library_id_fkey"
            columns: ["to_library_id"]
            isOneToOne: false
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      story_transfers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          from_library_id: string
          from_user_id: string
          id: string
          responded_at: string | null
          response_message: string | null
          status: string | null
          story_id: string
          to_library_id: string
          to_user_id: string
          transfer_message: string | null
          transfer_type: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          from_library_id: string
          from_user_id: string
          id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          story_id: string
          to_library_id: string
          to_user_id: string
          transfer_message?: string | null
          transfer_type?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          from_library_id?: string
          from_user_id?: string
          id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          story_id?: string
          to_library_id?: string
          to_user_id?: string
          transfer_message?: string | null
          transfer_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfers_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      story_types: {
        Row: {
          created_at: string | null
          hue_base_bri: number | null
          hue_base_hex: string | null
          hue_breathe_pct: number | null
          hue_breathe_period_ms: number | null
          hue_jolt_ms: number | null
          hue_jolt_pct: number | null
          hue_lead_ms: number | null
          hue_motion: string | null
          hue_pause_style: string | null
          hue_per_bulb_ms: number | null
          hue_rotate_every_ms: number | null
          hue_style: string | null
          hue_tempo_ms: number | null
          hue_tt_in: number | null
          hue_tt_scene: number | null
          id: string
          type_description: string | null
          type_id: string
          type_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          hue_base_bri?: number | null
          hue_base_hex?: string | null
          hue_breathe_pct?: number | null
          hue_breathe_period_ms?: number | null
          hue_jolt_ms?: number | null
          hue_jolt_pct?: number | null
          hue_lead_ms?: number | null
          hue_motion?: string | null
          hue_pause_style?: string | null
          hue_per_bulb_ms?: number | null
          hue_rotate_every_ms?: number | null
          hue_style?: string | null
          hue_tempo_ms?: number | null
          hue_tt_in?: number | null
          hue_tt_scene?: number | null
          id?: string
          type_description?: string | null
          type_id: string
          type_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          hue_base_bri?: number | null
          hue_base_hex?: string | null
          hue_breathe_pct?: number | null
          hue_breathe_period_ms?: number | null
          hue_jolt_ms?: number | null
          hue_jolt_pct?: number | null
          hue_lead_ms?: number | null
          hue_motion?: string | null
          hue_pause_style?: string | null
          hue_per_bulb_ms?: number | null
          hue_rotate_every_ms?: number | null
          hue_style?: string | null
          hue_tempo_ms?: number | null
          hue_tt_in?: number | null
          hue_tt_scene?: number | null
          id?: string
          type_description?: string | null
          type_id?: string
          type_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      storytelling_traditions: {
        Row: {
          adaptation_guidelines: string[] | null
          character_archetypes: string[] | null
          common_themes: string[] | null
          created_at: string | null
          cultural_origin: string[]
          id: string
          moral_framework: string
          name: string
          narrative_structure: string
          updated_at: string | null
        }
        Insert: {
          adaptation_guidelines?: string[] | null
          character_archetypes?: string[] | null
          common_themes?: string[] | null
          created_at?: string | null
          cultural_origin: string[]
          id?: string
          moral_framework: string
          name: string
          narrative_structure: string
          updated_at?: string | null
        }
        Update: {
          adaptation_guidelines?: string[] | null
          character_archetypes?: string[] | null
          common_themes?: string[] | null
          created_at?: string | null
          cultural_origin?: string[]
          id?: string
          moral_framework?: string
          name?: string
          narrative_structure?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_progress: {
        Row: {
          attempts: number | null
          average_score: number | null
          best_score: number | null
          created_at: string | null
          id: string
          last_attempt_date: string | null
          learning_objective_id: string
          mastery_level: string | null
          student_id: string
          total_time_spent: number | null
          trends: Json | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          id?: string
          last_attempt_date?: string | null
          learning_objective_id: string
          mastery_level?: string | null
          student_id: string
          total_time_spent?: number | null
          trends?: Json | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          average_score?: number | null
          best_score?: number | null
          created_at?: string | null
          id?: string
          last_attempt_date?: string | null
          learning_objective_id?: string
          mastery_level?: string | null
          student_id?: string
          total_time_spent?: number | null
          trends?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_learning_objective_id_fkey"
            columns: ["learning_objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          email: string | null
          enrollment_date: string | null
          first_name: string
          grade_level: string
          id: string
          is_active: boolean | null
          last_name: string
          learning_preferences: Json | null
          parent_email: string | null
          special_needs: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name: string
          grade_level: string
          id?: string
          is_active?: boolean | null
          last_name: string
          learning_preferences?: Json | null
          parent_email?: string | null
          special_needs?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          enrollment_date?: string | null
          first_name?: string
          grade_level?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          learning_preferences?: Json | null
          parent_email?: string | null
          special_needs?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_library_avatars: {
        Row: {
          avatar_data: Json
          avatar_type: string
          created_at: string | null
          id: string
          library_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_data: Json
          avatar_type: string
          created_at?: string | null
          id?: string
          library_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_data?: Json
          avatar_type?: string
          created_at?: string | null
          id?: string
          library_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_library_avatars_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: true
            referencedRelation: "libraries"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          actual_value: number
          created_at: string | null
          id: string
          metric: string
          resolution_notes: string | null
          resolved_at: string | null
          rule_id: string
          rule_name: string
          severity: string
          threshold: number
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value: number
          created_at?: string | null
          id?: string
          metric: string
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id: string
          rule_name: string
          severity: string
          threshold: number
          triggered_at: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          actual_value?: number
          created_at?: string | null
          id?: string
          metric?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          rule_id?: string
          rule_name?: string
          severity?: string
          threshold?: number
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metrics: {
        Row: {
          agent_metrics: Json | null
          average_latency: number
          cpu_load_average: number[]
          cpu_usage: number
          created_at: string | null
          error_rate: number
          events_processed: number
          events_published: number
          id: string
          memory_percentage: number
          memory_total: number
          memory_used: number
          queue_depth: number
          timestamp: string
        }
        Insert: {
          agent_metrics?: Json | null
          average_latency?: number
          cpu_load_average: number[]
          cpu_usage: number
          created_at?: string | null
          error_rate?: number
          events_processed?: number
          events_published?: number
          id?: string
          memory_percentage: number
          memory_total: number
          memory_used: number
          queue_depth?: number
          timestamp: string
        }
        Update: {
          agent_metrics?: Json | null
          average_latency?: number
          cpu_load_average?: number[]
          cpu_usage?: number
          created_at?: string | null
          error_rate?: number
          events_processed?: number
          events_published?: number
          id?: string
          memory_percentage?: number
          memory_total?: number
          memory_used?: number
          queue_depth?: number
          timestamp?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          email: string
          first_name: string
          grade_levels: string[]
          id: string
          is_active: boolean | null
          last_name: string
          school_id: string
          subjects: string[]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          email: string
          first_name: string
          grade_levels: string[]
          id?: string
          is_active?: boolean | null
          last_name: string
          school_id: string
          subjects: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          email?: string
          first_name?: string
          grade_levels?: string[]
          id?: string
          is_active?: boolean | null
          last_name?: string
          school_id?: string
          subjects?: string[]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      therapeutic_pathways: {
        Row: {
          adaptation_triggers: Json
          created_at: string | null
          duration: number
          expected_outcomes: string[]
          id: string
          pathway_name: string
          status: string | null
          story_progression: Json
          target_emotions: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adaptation_triggers?: Json
          created_at?: string | null
          duration: number
          expected_outcomes: string[]
          id?: string
          pathway_name: string
          status?: string | null
          story_progression: Json
          target_emotions: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adaptation_triggers?: Json
          created_at?: string | null
          duration?: number
          expected_outcomes?: string[]
          id?: string
          pathway_name?: string
          status?: string | null
          story_progression?: Json
          target_emotions?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapeutic_pathways_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      universal_platform_configs: {
        Row: {
          authentication_config: Json
          capabilities: string[] | null
          created_at: string | null
          endpoints: Json
          id: string
          is_active: boolean | null
          platform_name: string
          request_format: string | null
          request_mapping: Json
          response_format: string | null
          response_mapping: Json
          smart_home_mapping: Json | null
          updated_at: string | null
          version: string
        }
        Insert: {
          authentication_config: Json
          capabilities?: string[] | null
          created_at?: string | null
          endpoints: Json
          id?: string
          is_active?: boolean | null
          platform_name: string
          request_format?: string | null
          request_mapping: Json
          response_format?: string | null
          response_mapping: Json
          smart_home_mapping?: Json | null
          updated_at?: string | null
          version: string
        }
        Update: {
          authentication_config?: Json
          capabilities?: string[] | null
          created_at?: string | null
          endpoints?: Json
          id?: string
          is_active?: boolean | null
          platform_name?: string
          request_format?: string | null
          request_mapping?: Json
          response_format?: string | null
          response_mapping?: Json
          smart_home_mapping?: Json | null
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      user_context_separations: {
        Row: {
          all_user_ids: string[]
          created_at: string | null
          expires_at: string | null
          id: string
          primary_user_id: string
          separation_id: string
          session_id: string
          user_contexts: Json
        }
        Insert: {
          all_user_ids: string[]
          created_at?: string | null
          expires_at?: string | null
          id?: string
          primary_user_id: string
          separation_id: string
          session_id: string
          user_contexts?: Json
        }
        Update: {
          all_user_ids?: string[]
          created_at?: string | null
          expires_at?: string | null
          id?: string
          primary_user_id?: string
          separation_id?: string
          session_id?: string
          user_contexts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_context_separations_primary_user_id_fkey"
            columns: ["primary_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_hue_settings: {
        Row: {
          access_token: string | null
          bridge_ip: string | null
          connected: boolean | null
          created_at: string | null
          id: string
          intensity: string | null
          last_sync_at: string | null
          refresh_token: string | null
          selection_id: string | null
          selection_name: string | null
          selection_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          bridge_ip?: string | null
          connected?: boolean | null
          created_at?: string | null
          id?: string
          intensity?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          selection_id?: string | null
          selection_name?: string | null
          selection_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          bridge_ip?: string | null
          connected?: boolean | null
          created_at?: string | null
          id?: string
          intensity?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          selection_id?: string | null
          selection_name?: string | null
          selection_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_hue_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          accessibility_settings: Json | null
          content_preferences: Json | null
          created_at: string | null
          id: string
          privacy_settings: Json | null
          updated_at: string | null
          user_id: string
          voice_settings: Json | null
        }
        Insert: {
          accessibility_settings?: Json | null
          content_preferences?: Json | null
          created_at?: string | null
          id?: string
          privacy_settings?: Json | null
          updated_at?: string | null
          user_id: string
          voice_settings?: Json | null
        }
        Update: {
          accessibility_settings?: Json | null
          content_preferences?: Json | null
          created_at?: string | null
          id?: string
          privacy_settings?: Json | null
          updated_at?: string | null
          user_id?: string
          voice_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tiers: {
        Row: {
          created_at: string
          hibernation_eligible: boolean | null
          inactivity_warnings_sent: number | null
          last_engagement_at: string | null
          last_login_at: string
          next_warning_at: string | null
          tier: string
          tier_updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hibernation_eligible?: boolean | null
          inactivity_warnings_sent?: number | null
          last_engagement_at?: string | null
          last_login_at?: string
          next_warning_at?: string | null
          tier: string
          tier_updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hibernation_eligible?: boolean | null
          inactivity_warnings_sent?: number | null
          last_engagement_at?: string | null
          last_login_at?: string
          next_warning_at?: string | null
          tier?: string
          tier_updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tiers_user_id_public_users_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          alexa_person_id: string | null
          applicable_framework: string | null
          available_story_credits: number | null
          country: string | null
          created_at: string | null
          email: string
          email_confirmed: boolean | null
          evaluated_at: string | null
          first_name: string | null
          first_paid_at: string | null
          hibernated_at: string | null
          id: string
          is_coppa_protected: boolean | null
          is_minor: boolean | null
          last_login_at: string | null
          last_name: string | null
          lifetime_characters_created: number | null
          lifetime_stories_created: number | null
          locale: string | null
          minor_threshold: number | null
          parent_consent_verified: boolean | null
          policy_version: string | null
          profile_completed: boolean | null
          role: string | null
          smart_home_connected: boolean | null
          subscription_tier: string | null
          test_mode_authorized: boolean
          updated_at: string | null
          user_type: string | null
        }
        Insert: {
          alexa_person_id?: string | null
          applicable_framework?: string | null
          available_story_credits?: number | null
          country?: string | null
          created_at?: string | null
          email: string
          email_confirmed?: boolean | null
          evaluated_at?: string | null
          first_name?: string | null
          first_paid_at?: string | null
          hibernated_at?: string | null
          id?: string
          is_coppa_protected?: boolean | null
          is_minor?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          lifetime_characters_created?: number | null
          lifetime_stories_created?: number | null
          locale?: string | null
          minor_threshold?: number | null
          parent_consent_verified?: boolean | null
          policy_version?: string | null
          profile_completed?: boolean | null
          role?: string | null
          smart_home_connected?: boolean | null
          subscription_tier?: string | null
          test_mode_authorized?: boolean
          updated_at?: string | null
          user_type?: string | null
        }
        Update: {
          alexa_person_id?: string | null
          applicable_framework?: string | null
          available_story_credits?: number | null
          country?: string | null
          created_at?: string | null
          email?: string
          email_confirmed?: boolean | null
          evaluated_at?: string | null
          first_name?: string | null
          first_paid_at?: string | null
          hibernated_at?: string | null
          id?: string
          is_coppa_protected?: boolean | null
          is_minor?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          lifetime_characters_created?: number | null
          lifetime_stories_created?: number | null
          locale?: string | null
          minor_threshold?: number | null
          parent_consent_verified?: boolean | null
          policy_version?: string | null
          profile_completed?: boolean | null
          role?: string | null
          smart_home_connected?: boolean | null
          subscription_tier?: string | null
          test_mode_authorized?: boolean
          updated_at?: string | null
          user_type?: string | null
        }
        Relationships: []
      }
      vocabulary_adaptations: {
        Row: {
          age_group: string
          context: string
          created_at: string | null
          effectiveness: number | null
          id: string
          original_word: string
          simplified_word: string
          usage_count: number | null
          vocabulary_level: string
        }
        Insert: {
          age_group: string
          context: string
          created_at?: string | null
          effectiveness?: number | null
          id?: string
          original_word: string
          simplified_word: string
          usage_count?: number | null
          vocabulary_level: string
        }
        Update: {
          age_group?: string
          context?: string
          created_at?: string | null
          effectiveness?: number | null
          id?: string
          original_word?: string
          simplified_word?: string
          usage_count?: number | null
          vocabulary_level?: string
        }
        Relationships: []
      }
      vocabulary_usage_log: {
        Row: {
          context: string | null
          effectiveness: number | null
          id: string
          original_word: string
          simplified_word: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          effectiveness?: number | null
          id?: string
          original_word: string
          simplified_word: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          effectiveness?: number | null
          id?: string
          original_word?: string
          simplified_word?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vocabulary_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_analysis_results: {
        Row: {
          audio_duration: number
          confidence: number
          created_at: string | null
          detected_emotions: string[]
          emotional_markers: Json | null
          expires_at: string | null
          id: string
          sample_rate: number
          session_id: string
          stress_indicators: Json | null
          user_id: string
          voice_characteristics: Json
        }
        Insert: {
          audio_duration: number
          confidence: number
          created_at?: string | null
          detected_emotions: string[]
          emotional_markers?: Json | null
          expires_at?: string | null
          id?: string
          sample_rate: number
          session_id: string
          stress_indicators?: Json | null
          user_id: string
          voice_characteristics: Json
        }
        Update: {
          audio_duration?: number
          confidence?: number
          created_at?: string | null
          detected_emotions?: string[]
          emotional_markers?: Json | null
          expires_at?: string | null
          id?: string
          sample_rate?: number
          session_id?: string
          stress_indicators?: Json | null
          user_id?: string
          voice_characteristics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "voice_analysis_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_clones: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          parent_consent_id: string
          revocation_reason: string | null
          revoked_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          voice_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          parent_consent_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          voice_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          parent_consent_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_clones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          used?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
        }
        Relationships: []
      }
      voice_cost_tracking: {
        Row: {
          character_count: number
          cost_usd: number
          created_at: string | null
          date: string | null
          engine: string
          id: string
          request_type: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          character_count: number
          cost_usd: number
          created_at?: string | null
          date?: string | null
          engine: string
          id?: string
          request_type: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          character_count?: number
          cost_usd?: number
          created_at?: string | null
          date?: string | null
          engine?: string
          id?: string
          request_type?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_cost_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_pace_adjustments: {
        Row: {
          adjusted_text: string
          id: string
          original_text: string
          pace_multiplier: number
          pause_count: number
          timestamp: string | null
          user_id: string
        }
        Insert: {
          adjusted_text: string
          id?: string
          original_text: string
          pace_multiplier: number
          pause_count: number
          timestamp?: string | null
          user_id: string
        }
        Update: {
          adjusted_text?: string
          id?: string
          original_text?: string
          pace_multiplier?: number
          pause_count?: number
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_pace_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_preferences: {
        Row: {
          created_at: string | null
          emotion: string | null
          enable_voice_cloning: boolean | null
          id: string
          language: string | null
          preferred_engine: string | null
          speed: number | null
          updated_at: string | null
          user_id: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string | null
          emotion?: string | null
          enable_voice_cloning?: boolean | null
          id?: string
          language?: string | null
          preferred_engine?: string | null
          speed?: number | null
          updated_at?: string | null
          user_id: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string | null
          emotion?: string | null
          enable_voice_cloning?: boolean | null
          id?: string
          language?: string | null
          preferred_engine?: string | null
          speed?: number | null
          updated_at?: string | null
          user_id?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_synthesis_metrics: {
        Row: {
          audio_duration_seconds: number | null
          character_count: number
          cost_usd: number | null
          created_at: string | null
          emotion: string | null
          engine: string
          error_code: string | null
          error_message: string | null
          id: string
          language: string
          latency_ms: number
          request_type: string
          session_id: string
          success: boolean
          text_length: number
          user_id: string | null
          voice_id: string | null
        }
        Insert: {
          audio_duration_seconds?: number | null
          character_count: number
          cost_usd?: number | null
          created_at?: string | null
          emotion?: string | null
          engine: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          language: string
          latency_ms: number
          request_type: string
          session_id: string
          success: boolean
          text_length: number
          user_id?: string | null
          voice_id?: string | null
        }
        Update: {
          audio_duration_seconds?: number | null
          character_count?: number
          cost_usd?: number | null
          created_at?: string | null
          emotion?: string | null
          engine?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          language?: string
          latency_ms?: number
          request_type?: string
          session_id?: string
          success?: boolean
          text_length?: number
          user_id?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_synthesis_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string | null
          webhook_id: string
        }
        Insert: {
          attempt?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_code?: number | null
          status?: string | null
          webhook_id: string
        }
        Update: {
          attempt?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_registrations: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          last_delivery_error: string | null
          last_delivery_response_code: number | null
          last_delivery_status: string | null
          last_delivery_timestamp: string | null
          platform: string
          status: string | null
          updated_at: string | null
          verification_token: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          last_delivery_error?: string | null
          last_delivery_response_code?: number | null
          last_delivery_status?: string | null
          last_delivery_timestamp?: string | null
          platform: string
          status?: string | null
          updated_at?: string | null
          verification_token?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          last_delivery_error?: string | null
          last_delivery_response_code?: number | null
          last_delivery_status?: string | null
          last_delivery_timestamp?: string | null
          platform?: string
          status?: string | null
          updated_at?: string | null
          verification_token?: string | null
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          headers: Json | null
          id: string
          is_active: boolean | null
          last_delivery_error: string | null
          last_delivery_response_code: number | null
          last_delivery_status: string | null
          last_delivery_timestamp: string | null
          retry_policy: Json | null
          secret: string
          timeout_ms: number | null
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_delivery_error?: string | null
          last_delivery_response_code?: number | null
          last_delivery_status?: string | null
          last_delivery_timestamp?: string | null
          retry_policy?: Json | null
          secret: string
          timeout_ms?: number | null
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_delivery_error?: string | null
          last_delivery_response_code?: number | null
          last_delivery_status?: string | null
          last_delivery_timestamp?: string | null
          retry_policy?: Json | null
          secret?: string
          timeout_ms?: number | null
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webvtt_files: {
        Row: {
          audio_url: string
          created_at: string | null
          file_size: number | null
          file_url: string
          id: string
          processing_time_ms: number | null
          story_id: string
          sync_accuracy_average_ms: number | null
          sync_accuracy_p50_ms: number | null
          sync_accuracy_p90_ms: number
          sync_accuracy_p99_ms: number | null
          text_content: string
          updated_at: string | null
          user_id: string
          word_count: number
        }
        Insert: {
          audio_url: string
          created_at?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          processing_time_ms?: number | null
          story_id: string
          sync_accuracy_average_ms?: number | null
          sync_accuracy_p50_ms?: number | null
          sync_accuracy_p90_ms: number
          sync_accuracy_p99_ms?: number | null
          text_content: string
          updated_at?: string | null
          user_id: string
          word_count?: number
        }
        Update: {
          audio_url?: string
          created_at?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          processing_time_ms?: number | null
          story_id?: string
          sync_accuracy_average_ms?: number | null
          sync_accuracy_p50_ms?: number | null
          sync_accuracy_p90_ms?: number
          sync_accuracy_p99_ms?: number | null
          text_content?: string
          updated_at?: string | null
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "webvtt_files_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      webvtt_generation_metrics: {
        Row: {
          accuracy_deviation_ms: number | null
          api_version: string | null
          created_at: string | null
          generated_by: string | null
          generation_time_ms: number
          id: string
          phase1_compliant: boolean
          validation_time_ms: number | null
          webvtt_file_id: string
        }
        Insert: {
          accuracy_deviation_ms?: number | null
          api_version?: string | null
          created_at?: string | null
          generated_by?: string | null
          generation_time_ms: number
          id?: string
          phase1_compliant?: boolean
          validation_time_ms?: number | null
          webvtt_file_id: string
        }
        Update: {
          accuracy_deviation_ms?: number | null
          api_version?: string | null
          created_at?: string | null
          generated_by?: string | null
          generation_time_ms?: number
          id?: string
          phase1_compliant?: boolean
          validation_time_ms?: number | null
          webvtt_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webvtt_generation_metrics_webvtt_file_id_fkey"
            columns: ["webvtt_file_id"]
            isOneToOne: false
            referencedRelation: "webvtt_files"
            referencedColumns: ["id"]
          },
        ]
      }
      webvtt_word_timestamps: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          duration_ms: number | null
          end_time_ms: number
          id: string
          start_time_ms: number
          webvtt_file_id: string
          word_index: number
          word_text: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          duration_ms?: number | null
          end_time_ms: number
          id?: string
          start_time_ms: number
          webvtt_file_id: string
          word_index: number
          word_text: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          duration_ms?: number | null
          end_time_ms?: number
          id?: string
          start_time_ms?: number
          webvtt_file_id?: string
          word_index?: number
          word_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "webvtt_word_timestamps_webvtt_file_id_fkey"
            columns: ["webvtt_file_id"]
            isOneToOne: false
            referencedRelation: "webvtt_files"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      event_analytics: {
        Row: {
          event_count: number | null
          event_type: string | null
          hour: string | null
          source: string | null
          unique_correlations: number | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      research_insights_analytics: {
        Row: {
          day: string | null
          insight_count: number | null
          severity: string | null
          tenant_id: string | null
          track_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "research_tenants"
            referencedColumns: ["tenant_id"]
          },
        ]
      }
      voice_synthesis_daily_stats: {
        Row: {
          avg_latency_ms: number | null
          date: string | null
          engine: string | null
          successful_requests: number | null
          total_characters: number | null
          total_cost_usd: number | null
          total_requests: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_transfer_via_magic_link: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
      anonymize_old_distress_patterns: { Args: never; Returns: number }
      calculate_engagement_trends: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          average_engagement: string
          recommendations: string[]
          trend_direction: string
          trend_strength: number
        }[]
      }
      calculate_intervention_priority: {
        Args: { p_user_id: string }
        Returns: {
          priority_level: string
          priority_score: number
          recommended_actions: string[]
        }[]
      }
      calculate_story_effectiveness: {
        Args: { p_story_id: string; p_user_id: string }
        Returns: number
      }
      calculate_user_credits: { Args: { p_user_id: string }; Returns: number }
      check_coppa_compliance: {
        Args: { p_library_id: string; p_user_id: string }
        Returns: boolean
      }
      check_library_permission: {
        Args: { lib_id: string; required_role: string }
        Returns: boolean
      }
      check_library_permission_with_coppa: {
        Args: { lib_id: string; required_role: string }
        Returns: boolean
      }
      check_negative_feedback_alert: {
        Args: never
        Returns: {
          character_id: string
          character_negative_count: number
          negative_count: number
          story_id: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      cleanup_auth_sessions: { Args: never; Returns: number }
      cleanup_expired_age_verification_audit: {
        Args: never
        Returns: undefined
      }
      cleanup_expired_checkpoints: { Args: never; Returns: number }
      cleanup_expired_conversation_sessions: { Args: never; Returns: number }
      cleanup_expired_data: { Args: never; Returns: undefined }
      cleanup_expired_data_enhanced: {
        Args: never
        Returns: {
          action_taken: string
          records_processed: number
          table_name: string
        }[]
      }
      cleanup_expired_device_tokens: { Args: never; Returns: number }
      cleanup_expired_interruptions: { Args: never; Returns: number }
      cleanup_expired_library_consent: { Args: never; Returns: undefined }
      cleanup_expired_localization_cache: { Args: never; Returns: undefined }
      cleanup_expired_oauth_tokens: { Args: never; Returns: undefined }
      cleanup_expired_transfer_requests: { Args: never; Returns: number }
      cleanup_expired_user_separations: { Args: never; Returns: number }
      cleanup_expired_voice_analysis: { Args: never; Returns: undefined }
      cleanup_knowledge_queries: { Args: never; Returns: undefined }
      cleanup_old_a2a_tasks: { Args: never; Returns: number }
      cleanup_old_engagement_data: { Args: never; Returns: undefined }
      cleanup_old_events: { Args: { retention_days?: number }; Returns: number }
      cleanup_old_safety_incidents: { Args: never; Returns: number }
      cleanup_old_webhook_deliveries: { Args: never; Returns: number }
      cleanup_refresh_tokens: { Args: never; Returns: number }
      cleanup_research_cache: { Args: never; Returns: number }
      cleanup_voice_codes: { Args: never; Returns: number }
      cleanup_voice_metrics: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      create_character_in_library: {
        Args: {
          p_art_prompt?: string
          p_library_id: string
          p_name: string
          p_traits: Json
        }
        Returns: string
      }
      create_default_storytailor_id_for_user: {
        Args: { p_user_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_story_transfer_request: {
        Args: {
          p_story_id: string
          p_to_library_id: string
          p_transfer_message?: string
        }
        Returns: string
      }
      create_sub_library_with_avatar: {
        Args: {
          p_avatar_data: Json
          p_avatar_type: string
          p_name: string
          p_parent_library_id: string
        }
        Returns: string
      }
      deduct_story_pack_credit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      delete_character: { Args: { p_character_id: string }; Returns: boolean }
      delete_user_data: {
        Args: { p_confirmation_token: string; p_user_id: string }
        Returns: boolean
      }
      detect_pattern_anomalies: {
        Args: { p_user_id: string }
        Returns: {
          anomaly_type: string
          description: string
          detected_at: string
          severity: string
        }[]
      }
      ensure_public_user_exists: {
        Args: { auth_user_id: string }
        Returns: string
      }
      escalate_knowledge_query: {
        Args: {
          p_escalation_reason: string
          p_priority?: string
          p_query_id: string
        }
        Returns: string
      }
      export_user_data: { Args: { p_user_id: string }; Returns: Json }
      generate_gift_card_code: { Args: never; Returns: string }
      generate_invite_discount: {
        Args: {
          p_created_by: string
          p_discount_percentage: number
          p_type: string
          p_valid_days?: number
        }
        Returns: string
      }
      generate_transfer_magic_token: { Args: never; Returns: string }
      get_active_webhooks_for_platform: {
        Args: { platform_name: string }
        Returns: {
          config: Json
          created_at: string
          id: string
          verification_token: string
        }[]
      }
      get_character_feedback_summary: {
        Args: { p_character_id: string }
        Returns: Json
      }
      get_checkpoint_stats: {
        Args: { time_range_hours?: number; user_id_param?: string }
        Returns: {
          avg_checkpoints_per_session: number
          checkpoints_by_phase: Json
          total_checkpoints: number
        }[]
      }
      get_cultural_context_with_defaults: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_event_statistics: {
        Args: never
        Returns: {
          active_correlations: number
          events_by_source: Json
          events_by_type: Json
          newest_event: string
          oldest_event: string
          total_events: number
        }[]
      }
      get_hierarchical_library_stories: {
        Args: { p_library_id: string }
        Returns: {
          age_rating: number
          content: Json
          created_at: string
          finalized_at: string
          library_id: string
          library_name: string
          status: string
          story_id: string
          title: string
        }[]
      }
      get_interruption_recovery_stats: {
        Args: { time_range_hours?: number; user_id_param?: string }
        Returns: {
          avg_recovery_attempts: number
          most_common_interruption_type: string
          recovered_interruptions: number
          recovery_rate: number
          total_interruptions: number
        }[]
      }
      get_library_characters: {
        Args: { p_library_id: string }
        Returns: {
          appearance_url: string
          art_prompt: string
          created_at: string
          id: string
          name: string
          traits: Json
          updated_at: string
        }[]
      }
      get_pending_webhook_deliveries: {
        Args: { limit_count?: number }
        Returns: {
          attempt: number
          event_id: string
          event_type: string
          id: string
          next_retry_at: string
          payload: Json
          webhook_id: string
        }[]
      }
      get_safety_metrics: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_story_feedback_summary: {
        Args: { p_story_id: string }
        Returns: Json
      }
      get_sub_library_emotional_patterns: {
        Args: { p_days_back?: number; p_sub_library_id: string }
        Returns: {
          avg_confidence: number
          frequency: number
          mood: string
          trend: string
        }[]
      }
      get_system_health: {
        Args: never
        Returns: {
          active_alerts: number
          cpu_usage: number
          error_rate: number
          last_metric_time: string
          memory_percentage: number
          status: string
        }[]
      }
      get_tenant_cost_status: {
        Args: { p_tenant_id: string }
        Returns: {
          cost_limit: number
          current_cost: number
          percentage_used: number
          status: string
        }[]
      }
      get_total_pack_credits: { Args: { p_user_id: string }; Returns: number }
      get_user_active_tokens: { Args: { p_user_id: string }; Returns: number }
      get_user_daily_voice_cost: {
        Args: { p_date?: string; p_user_id: string }
        Returns: number
      }
      get_user_default_storytailor_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      get_voice_performance_metrics: {
        Args: { p_engine?: string; p_time_range_hours?: number }
        Returns: {
          avg_cost_per_request: number
          avg_latency_ms: number
          success_rate: number
          successful_requests: number
          total_cost_usd: number
          total_requests: number
        }[]
      }
      get_webvtt_phase1_stats: {
        Args: never
        Returns: {
          average_p90_accuracy: number
          compliance_rate: number
          phase1_compliant_files: number
          total_files: number
        }[]
      }
      has_valid_voice_cloning_consent: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      increment_attempts: { Args: never; Returns: number }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_agent_name: string
          p_ip_address?: unknown
          p_payload: Json
          p_user_agent?: string
        }
        Returns: string
      }
      log_audit_event_enhanced: {
        Args: {
          p_action: string
          p_agent_name: string
          p_correlation_id?: string
          p_ip_address?: unknown
          p_payload: Json
          p_session_id?: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_deletion_audit: {
        Args: {
          p_action: string
          p_deletion_request_id: string
          p_deletion_type: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: string
      }
      log_knowledge_query: {
        Args: {
          p_category: string
          p_confidence_score: number
          p_query_text: string
          p_response_id?: string
          p_response_type: string
          p_session_id: string
          p_user_id: string
        }
        Returns: string
      }
      log_platform_integration_event: {
        Args: {
          event_type_name: string
          payload_data?: Json
          platform_name: string
          session_id_param?: string
          user_id_param?: string
        }
        Returns: string
      }
      log_smart_home_action: {
        Args: {
          p_action: string
          p_device_id: string
          p_error_message?: string
          p_platform?: string
          p_session_id?: string
          p_success: boolean
          p_user_id: string
        }
        Returns: string
      }
      manage_organization_seats: {
        Args: {
          p_action: string
          p_organization_id: string
          p_user_id?: string
        }
        Returns: boolean
      }
      recommend_therapeutic_pathway: {
        Args: { p_user_id: string }
        Returns: {
          confidence: number
          estimated_duration: number
          pathway_type: string
          target_emotions: string[]
        }[]
      }
      record_event_metrics: {
        Args: {
          p_correlation_id?: string
          p_error_message?: string
          p_event_type: string
          p_handler_time_ms?: number
          p_network_time_ms?: number
          p_processing_time_ms: number
          p_queue_time_ms?: number
          p_retry_count?: number
          p_session_id?: string
          p_source: string
          p_success?: boolean
          p_user_id?: string
        }
        Returns: string
      }
      record_research_usage: {
        Args: {
          p_cost: number
          p_duration: number
          p_model: string
          p_operation: string
          p_tenant_id: string
          p_tokens_used: number
        }
        Returns: string
      }
      redeem_gift_card: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      register_universal_platform: {
        Args: {
          capabilities_param: string[]
          config_data: Json
          platform_name_param: string
          version_param: string
        }
        Returns: string
      }
      reset_rate_limit: {
        Args: { p_action: string; p_identifier: string }
        Returns: boolean
      }
      respond_to_story_transfer: {
        Args: {
          p_response: string
          p_response_message?: string
          p_transfer_id: string
        }
        Returns: boolean
      }
      revoke_all_user_tokens: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      revoke_user_sessions: { Args: { p_user_id: string }; Returns: number }
      revoke_user_tokens: { Args: { p_user_id: string }; Returns: number }
      revoke_voice_clone: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      schedule_webhook_retry: {
        Args: {
          attempt_count: number
          delivery_id: string
          next_retry_at_param: string
        }
        Returns: undefined
      }
      share_character: {
        Args: {
          p_character_id: string
          p_share_type: string
          p_target_library_id: string
        }
        Returns: string
      }
      should_send_email: {
        Args: { p_email_type: string; p_user_id: string }
        Returns: boolean
      }
      track_consumption_event: {
        Args: { p_event_data: Json; p_story_id: string; p_user_id: string }
        Returns: undefined
      }
      update_asset_status: {
        Args: {
          p_asset_type: string
          p_status: string
          p_story_id: string
          p_url?: string
        }
        Returns: undefined
      }
      update_character: {
        Args: {
          p_appearance_url?: string
          p_art_prompt?: string
          p_character_id: string
          p_name?: string
          p_traits?: Json
        }
        Returns: boolean
      }
      update_cultural_context: {
        Args: {
          p_celebrations_and_holidays?: string[]
          p_cultural_background?: string[]
          p_family_structure?: Json
          p_preferred_narrative_styles?: string[]
          p_primary_language?: string
          p_religious_considerations?: string[]
          p_secondary_languages?: string[]
          p_storytelling_traditions?: string[]
          p_taboo_topics?: string[]
          p_user_id: string
        }
        Returns: Json
      }
      update_daily_healing_metrics: { Args: never; Returns: undefined }
      update_knowledge_analytics: {
        Args: { p_date?: string }
        Returns: undefined
      }
      update_replay_status: {
        Args: {
          p_error_message?: string
          p_events_replayed?: number
          p_replay_id: string
          p_status: string
        }
        Returns: undefined
      }
      update_subscription_status: {
        Args: {
          p_current_period_end: string
          p_current_period_start: string
          p_status: string
          p_stripe_subscription_id: string
        }
        Returns: undefined
      }
      update_webhook_delivery: {
        Args: {
          delivery_id: string
          delivery_status: string
          error_message_param?: string
          response_body_param?: string
          response_code_param?: number
        }
        Returns: undefined
      }
      update_webhook_delivery_status: {
        Args: {
          delivery_status: string
          error_message?: string
          response_code?: number
          webhook_id: string
        }
        Returns: undefined
      }
      validate_phase1_webvtt_compliance: {
        Args: { file_id: string }
        Returns: boolean
      }
      validate_smart_home_consent: {
        Args: { p_device_type: string; p_platform: string; p_user_id: string }
        Returns: boolean
      }
      validate_state_transition: {
        Args: {
          p_current_state: string
          p_new_state: string
          p_resource: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

