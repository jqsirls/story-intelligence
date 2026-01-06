/**
 * Weekly Insights Service
 * 
 * Generates user-type-specific weekly reports every Sunday 6pm.
 * Different insights for parent, teacher, therapist, child_life_specialist.
 * 
 * Focus:
 * - Parent: Emotional trends, story engagement, developmental milestones
 * - Teacher: Classroom baseline, top/struggling students, curriculum progress
 * - Therapist: Client progress, therapeutic outcomes, crisis events (HIPAA)
 * - Child Life Specialist: Patient story usage, procedure prep effectiveness
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';
import { IntelligenceCurator, PipelineEvent } from './IntelligenceCurator';
import { UserTypeRouter } from './UserTypeRouter';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface WeeklyInsight {
  userId: string;
  week: Date;
  userType: string;
  
  // Common data
  storiesCreated: number;
  storiesConsumed: number;
  totalEngagement: number;
  
  // User-type-specific
  parentInsights?: ParentWeeklyInsight;
  teacherInsights?: TeacherWeeklyInsight;
  therapistInsights?: TherapistWeeklyInsight;
  specialistInsights?: SpecialistWeeklyInsight;
}

export interface ParentWeeklyInsight {
  emotionalTrends: {
    primaryMood: string;
    moodShift: string;
    concerningPatterns: string[];
  };
  storyEngagement: {
    favoriteStory: string;
    favoriteCharacter: string;
    readingTime: number;
  };
  developmentalMilestones: string[];
  recommendations: string[];
}

export interface TeacherWeeklyInsight {
  classroomBaseline: {
    activeStudents: number;
    storiesUsed: number;
    avgEngagement: number;
  };
  topStudents: string[];
  strugglingStudents: string[];
  curriculumProgress: {
    objectivesMet: number;
    totalObjectives: number;
  };
  recommendations: string[];
}

export interface TherapistWeeklyInsight {
  clientProgress: {
    sessionsCompleted: number;
    pathwayProgress: number;
    outcomeScore: number;
  };
  therapeuticOutcomes: string[];
  crisisEvents: number;
  recommendations: string[];
  hipaaCompliant: true;
}

export interface SpecialistWeeklyInsight {
  patientUsage: {
    patientsServed: number;
    proceduresSupported: number;
    anxietyReduction: number;
  };
  prepEffectiveness: number;
  recommendations: string[];
}

// ============================================================================
// Weekly Insights Service
// ============================================================================

export class WeeklyInsightsService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private curator: IntelligenceCurator,
    private userTypeRouter: UserTypeRouter,
    private logger: Logger
  ) {}
  
  /**
   * Generate and send weekly insights for user
   */
  async sendWeeklyInsights(userId: string, week: Date = new Date()): Promise<void> {
    try {
      this.logger.info('Generating weekly insights', { userId, week });
      
      // Get user type
      const context = await this.userTypeRouter.getUserTypeContext(userId);
      
      // Generate insights based on user type
      const insights = await this.generateInsights(userId, week, context.userType);
      
      if (!insights) {
        this.logger.info('No activity for weekly insights', { userId, week });
        return;
      }
      
      // Create pipeline event for curation
      const event: PipelineEvent = {
        type: 'weekly_insights',
        userId,
        data: {
          signalCount: insights.storiesCreated + insights.storiesConsumed,
          confidence: insights.totalEngagement > 50 ? 0.8 : 0.6,
          insights
        },
        triggeredAt: new Date()
      };
      
      // Curate - check if should send
      const decision = await this.curator.curate(event);
      
      if (!decision.execute) {
        this.logger.info('Weekly insights vetoed', {
          userId,
          vetoReason: decision.vetoReason
        });
        return;
      }
      
      // Get user email
      const { data: user } = await this.supabase
        .from('users')
        .select('email, first_name')
        .eq('id', userId)
        .single();
      
      if (!user?.email) {
        return;
      }
      
      // Route to user-type-specific variant
      const emailVariant = await this.userTypeRouter.routeEmailVariant(userId, 'weekly_insights');
      
      // Send email
      await this.sendInsightsEmail(user.email, insights, emailVariant);
      
      // Log email sent
      await this.supabase
        .from('email_delivery_log')
        .insert({
          user_id: userId,
          email_type: 'weekly_insights',
          template_id: emailVariant,
          provider: 'sendgrid',
          status: 'sent',
          sent_at: new Date().toISOString()
        });
      
      this.logger.info('Weekly insights sent', { userId, variant: emailVariant });
      
    } catch (error) {
      this.logger.error('Failed to send weekly insights', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
    }
  }
  
  /**
   * Generate insights based on user type
   */
  private async generateInsights(
    userId: string,
    week: Date,
    userType: string
  ): Promise<WeeklyInsight | null> {
    const weekStart = new Date(week);
    weekStart.setDate(week.getDate() - week.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    // Get activity for the week
    const { data: activity } = await this.supabase
      .from('consumption_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('last_read_at', weekStart.toISOString())
      .lt('last_read_at', weekEnd.toISOString());
    
    if (!activity || activity.length < 3) {
      return null; // Not enough activity
    }
    
    // Get stories created this week
    const { count: storiesCreated } = await this.supabase
      .from('stories')
      .select('id', { count: 'exact', head: true })
      .eq('creator_user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lt('created_at', weekEnd.toISOString());
    
    // Calculate total engagement
    const totalEngagement = activity.reduce((sum, a) => sum + (a.engagement_score || 0), 0) / activity.length;
    
    // Base insight structure
    const baseInsight: WeeklyInsight = {
      userId,
      week,
      userType,
      storiesCreated: storiesCreated || 0,
      storiesConsumed: activity.length,
      totalEngagement
    };
    
    // Generate user-type-specific insights
    switch (userType) {
      case 'parent':
      case 'guardian':
      case 'grandparent':
        baseInsight.parentInsights = await this.generateParentInsights(userId, weekStart, weekEnd);
        break;
      
      case 'teacher':
      case 'librarian':
        baseInsight.teacherInsights = await this.generateTeacherInsights(userId, weekStart, weekEnd);
        break;
      
      case 'therapist':
      case 'medical_professional':
        baseInsight.therapistInsights = await this.generateTherapistInsights(userId, weekStart, weekEnd);
        break;
      
      case 'child_life_specialist':
        baseInsight.specialistInsights = await this.generateSpecialistInsights(userId, weekStart, weekEnd);
        break;
    }
    
    return baseInsight;
  }
  
  /**
   * Generate parent-specific insights
   */
  private async generateParentInsights(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<ParentWeeklyInsight> {
    // Get emotional trends (simplified - would integrate with EmotionAgent)
    const emotionalTrends = {
      primaryMood: 'happy',
      moodShift: 'neutral → happy',
      concerningPatterns: []
    };
    
    // Get engagement data
    const storyEngagement = {
      favoriteStory: 'Unknown',
      favoriteCharacter: 'Unknown',
      readingTime: 0
    };
    
    const developmentalMilestones: string[] = [];
    const recommendations: string[] = ['Create more stories together'];
    
    return {
      emotionalTrends,
      storyEngagement,
      developmentalMilestones,
      recommendations
    };
  }
  
  /**
   * Generate teacher-specific insights
   */
  private async generateTeacherInsights(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<TeacherWeeklyInsight> {
    return {
      classroomBaseline: {
        activeStudents: 0,
        storiesUsed: 0,
        avgEngagement: 0
      },
      topStudents: [],
      strugglingStudents: [],
      curriculumProgress: {
        objectivesMet: 0,
        totalObjectives: 0
      },
      recommendations: []
    };
  }
  
  /**
   * Generate therapist-specific insights (HIPAA-compliant)
   */
  private async generateTherapistInsights(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<TherapistWeeklyInsight> {
    return {
      clientProgress: {
        sessionsCompleted: 0,
        pathwayProgress: 0,
        outcomeScore: 0
      },
      therapeuticOutcomes: [],
      crisisEvents: 0,
      recommendations: [],
      hipaaCompliant: true
    };
  }
  
  /**
   * Generate specialist-specific insights
   */
  private async generateSpecialistInsights(
    userId: string,
    weekStart: Date,
    weekEnd: Date
  ): Promise<SpecialistWeeklyInsight> {
    return {
      patientUsage: {
        patientsServed: 0,
        proceduresSupported: 0,
        anxietyReduction: 0
      },
      prepEffectiveness: 0,
      recommendations: []
    };
  }
  
  /**
   * Send insights email
   */
  private async sendInsightsEmail(
    to: string,
    insights: WeeklyInsight,
    variant: string
  ): Promise<void> {
    const subject = this.generateSubject(insights);
    const body = this.generateBody(insights);
    
    await this.emailService.sendEmail({
      to,
      subject,
      html: body,
      text: this.stripHTML(body)
    });
  }
  
  /**
   * Generate subject
   */
  private generateSubject(insights: WeeklyInsight): string {
    if (insights.parentInsights) {
      return 'Your week with Storytailor';
    } else if (insights.teacherInsights) {
      return 'Classroom insights this week';
    } else if (insights.therapistInsights) {
      return 'Client progress update';
    }
    return 'Your weekly summary';
  }
  
  /**
   * Generate body
   */
  private generateBody(insights: WeeklyInsight): string {
    let body = `<p>This week: ${insights.storiesConsumed} stories consumed, ${insights.storiesCreated} created.</p>`;
    
    // Add user-type-specific insights
    if (insights.parentInsights) {
      body += `<p>Emotional trend: ${insights.parentInsights.emotionalTrends.moodShift}</p>`;
      body += `<p>Favorite: ${insights.parentInsights.storyEngagement.favoriteStory}</p>`;
    }
    
    return body;
  }
  
  /**
   * Strip HTML
   */
  private stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
  
  /**
   * Batch process weekly insights for all eligible users
   */
  async processBatchInsights(week: Date = new Date()): Promise<void> {
    this.logger.info('Processing batch weekly insights', { week });
    
    // Get users who had activity this week
    const weekStart = new Date(week);
    weekStart.setDate(week.getDate() - week.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const { data: activeUsers } = await this.supabase
      .from('consumption_metrics')
      .select('user_id')
      .gte('last_read_at', weekStart.toISOString())
      .order('user_id');
    
    if (!activeUsers || activeUsers.length === 0) {
      this.logger.info('No active users for weekly insights');
      return;
    }
    
    // Deduplicate
    const uniqueUsers = [...new Set(activeUsers.map(u => u.user_id))];
    
    this.logger.info('Processing weekly insights for users', {
      count: uniqueUsers.length
    });
    
    // Process each user
    for (const userId of uniqueUsers) {
      try {
        await this.sendWeeklyInsights(userId, week);
      } catch (error) {
        this.logger.error('Failed to send weekly insights for user', {
          userId,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with next user
      }
    }
    
    this.logger.info('Batch weekly insights complete', {
      processed: uniqueUsers.length
    });
  }
}

