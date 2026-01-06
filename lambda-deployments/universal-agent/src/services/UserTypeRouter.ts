/**
 * User Type Router
 * 
 * Routes pipeline flows based on 17 user types for personalized experiences.
 * Each user type has different needs, contexts, and value propositions.
 * 
 * User types: child, parent, guardian, grandparent, aunt_uncle, older_sibling,
 * foster_caregiver, teacher, librarian, afterschool_leader, childcare_provider,
 * nanny, child_life_specialist, therapist, medical_professional, coach_mentor,
 * enthusiast, other
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type UserType =
  | 'child'
  | 'parent'
  | 'guardian'
  | 'grandparent'
  | 'aunt_uncle'
  | 'older_sibling'
  | 'foster_caregiver'
  | 'teacher'
  | 'librarian'
  | 'afterschool_leader'
  | 'childcare_provider'
  | 'nanny'
  | 'child_life_specialist'
  | 'therapist'
  | 'medical_professional'
  | 'coach_mentor'
  | 'enthusiast'
  | 'other';

export interface UserTypeContext {
  userType: UserType;
  isProfessional: boolean;
  isFamily: boolean;
  isEducator: boolean;
  isMedical: boolean;
  needsHIPAA: boolean;
  recommendedFrequency: 'daily' | 'weekly' | 'monthly';
}

export interface PersonalizedContent {
  emailVariant: string;
  contentFocus: string[];
  language: string;
  ctaType: string;
  valueProposition: string;
}

// ============================================================================
// User Type Router Service
// ============================================================================

export class UserTypeRouter {
  // User type categorization
  private static readonly PROFESSIONAL_TYPES: UserType[] = [
    'teacher',
    'librarian',
    'afterschool_leader',
    'childcare_provider',
    'child_life_specialist',
    'therapist',
    'medical_professional',
    'coach_mentor'
  ];
  
  private static readonly FAMILY_TYPES: UserType[] = [
    'parent',
    'guardian',
    'grandparent',
    'aunt_uncle',
    'older_sibling',
    'foster_caregiver'
  ];
  
  private static readonly MEDICAL_TYPES: UserType[] = [
    'child_life_specialist',
    'therapist',
    'medical_professional'
  ];
  
  private static readonly EDUCATOR_TYPES: UserType[] = [
    'teacher',
    'librarian',
    'afterschool_leader'
  ];
  
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}
  
  /**
   * Get user type context
   */
  async getUserTypeContext(userId: string): Promise<UserTypeContext> {
    const { data: user } = await this.supabase
      .from('users')
      .select('user_type')
      .eq('id', userId)
      .single();
    
    const userType = (user?.user_type || 'other') as UserType;
    
    return {
      userType,
      isProfessional: UserTypeRouter.PROFESSIONAL_TYPES.includes(userType),
      isFamily: UserTypeRouter.FAMILY_TYPES.includes(userType),
      isEducator: UserTypeRouter.EDUCATOR_TYPES.includes(userType),
      isMedical: UserTypeRouter.MEDICAL_TYPES.includes(userType),
      needsHIPAA: userType === 'therapist' || userType === 'medical_professional',
      recommendedFrequency: this.getRecommendedFrequency(userType)
    };
  }
  
  /**
   * Route email variant based on user type
   */
  async routeEmailVariant(userId: string, baseEmailType: string): Promise<string> {
    const context = await this.getUserTypeContext(userId);
    
    // User-type-specific variants
    const variantMap: Record<string, Partial<Record<UserType, string>>> = {
      'welcome': {
        'parent': 'welcome-parent',
        'teacher': 'welcome-teacher',
        'therapist': 'welcome-therapist',
        'child': 'welcome-child'
      },
      'story_complete': {
        'child': 'story-complete-child',
        'parent': 'story-complete-parent',
        'teacher': 'story-complete-teacher',
        'therapist': 'story-complete-therapist'
      },
      'weekly_insights': {
        'parent': 'weekly-insights-parent',
        'teacher': 'weekly-insights-teacher',
        'therapist': 'weekly-insights-therapist',
        'child_life_specialist': 'weekly-insights-specialist'
      },
      'daily_digest': {
        'parent': 'daily-digest-parent',
        'teacher': 'daily-digest-teacher'
      }
    };
    
    const variants = variantMap[baseEmailType];
    if (!variants) {
      return baseEmailType;
    }
    
    return variants[context.userType] || baseEmailType;
  }
  
  /**
   * Get personalized content for user type
   */
  async getPersonalizedContent(
    userId: string,
    contentType: string
  ): Promise<PersonalizedContent> {
    const context = await this.getUserTypeContext(userId);
    
    switch (context.userType) {
      case 'parent':
      case 'guardian':
        return {
          emailVariant: `${contentType}-parent`,
          contentFocus: ['emotional_development', 'bedtime_success', 'bonding'],
          language: 'warm',
          ctaType: 'create_story',
          valueProposition: 'Create magical moments with your child'
        };
      
      case 'teacher':
      case 'librarian':
        return {
          emailVariant: `${contentType}-teacher`,
          contentFocus: ['learning_objectives', 'classroom_engagement', 'literacy'],
          language: 'professional',
          ctaType: 'batch_create',
          valueProposition: 'Engage your classroom with personalized stories'
        };
      
      case 'therapist':
      case 'child_life_specialist':
        return {
          emailVariant: `${contentType}-therapist`,
          contentFocus: ['therapeutic_outcomes', 'emotional_regulation', 'clinical_progress'],
          language: 'clinical',
          ctaType: 'pathway_continue',
          valueProposition: 'Support therapeutic goals through storytelling'
        };
      
      case 'grandparent':
      case 'aunt_uncle':
        return {
          emailVariant: `${contentType}-family`,
          contentFocus: ['connection', 'special_moments', 'sharing'],
          language: 'warm',
          ctaType: 'create_gift',
          valueProposition: 'Create special memories from afar'
        };
      
      case 'medical_professional':
        return {
          emailVariant: `${contentType}-medical`,
          contentFocus: ['procedure_prep', 'anxiety_reduction', 'patient_outcomes'],
          language: 'medical',
          ctaType: 'clinical_create',
          valueProposition: 'Improve patient outcomes through narrative therapy'
        };
      
      case 'child':
        return {
          emailVariant: `${contentType}-child`,
          contentFocus: ['fun', 'adventure', 'creativity'],
          language: 'simple',
          ctaType: 'play',
          valueProposition: 'Your stories are ready!'
        };
      
      default:
        return {
          emailVariant: contentType,
          contentFocus: ['stories', 'engagement'],
          language: 'friendly',
          ctaType: 'explore',
          valueProposition: 'Create personalized stories'
        };
    }
  }
  
  /**
   * Get recommended email frequency for user type
   */
  private getRecommendedFrequency(userType: UserType): 'daily' | 'weekly' | 'monthly' {
    // Professionals typically want less frequent but more comprehensive reports
    if (UserTypeRouter.PROFESSIONAL_TYPES.includes(userType)) {
      return 'weekly';
    }
    
    // Family members might want daily updates
    if (UserTypeRouter.FAMILY_TYPES.includes(userType)) {
      return 'daily';
    }
    
    return 'weekly';
  }
  
  /**
   * Get user-type-specific value propositions
   */
  getValueProposition(userType: UserType, feature: string): string {
    const propositions: Partial<Record<UserType, Partial<Record<string, string>>>> = {
      'parent': {
        'story_creation': 'Create magical bedtime moments',
        'emotion_tracking': 'Understand your child\'s emotional world',
        'weekly_insights': 'See your child\'s growth',
        'therapeutic': 'Support your child\'s wellbeing'
      },
      'teacher': {
        'story_creation': 'Engage your classroom with personalized stories',
        'batch_creation': 'Create stories for your entire class',
        'learning_objectives': 'Meet curriculum goals through narrative',
        'weekly_insights': 'Track classroom literacy progress'
      },
      'therapist': {
        'story_creation': 'Support therapeutic goals',
        'pathway_assignment': 'Evidence-based narrative therapy',
        'progress_tracking': 'Measure client outcomes',
        'weekly_insights': 'HIPAA-compliant progress reports'
      },
      'grandparent': {
        'story_creation': 'Create special memories from afar',
        'story_sharing': 'Share your love through stories',
        'family_connection': 'Stay connected with grandchildren'
      },
      'child_life_specialist': {
        'story_creation': 'Prepare patients for procedures',
        'anxiety_reduction': 'Reduce pre-procedure anxiety',
        'patient_outcomes': 'Improve recovery experiences'
      }
    };
    
    return propositions[userType]?.[feature] || 'Create personalized stories';
  }
  
  /**
   * Detect if user should be routed to B2B flow
   */
  async shouldUseB2BFlow(userId: string): Promise<boolean> {
    const context = await this.getUserTypeContext(userId);
    
    // Check if user is in an organization
    const { data: orgMember } = await this.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .single();
    
    // B2B flow if: in org OR professional type
    return !!orgMember || context.isProfessional;
  }
}

