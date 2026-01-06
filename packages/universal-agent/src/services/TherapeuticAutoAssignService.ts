/**
 * Therapeutic Auto-Assignment Service
 * 
 * IMPORTANT: This service CANNOT be used until clinical review is complete.
 * See docs/api/THERAPEUTIC_DOCTRINE.md for requirements.
 * 
 * Auto-suggests therapeutic pathways when patterns detected (5+ days).
 * Requires parent opt-in, never auto-enrolls.
 * 
 * STATUS: Implementation ready, awaiting clinical approval.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

export interface TherapeuticPattern {
  userId: string;
  profileId: string;
  patternType: 'anxiety' | 'depression' | 'trauma' | 'emotional_regulation';
  dayCount: number;
  confidence: number;
  detectedAt: Date;
}

export interface TherapeuticPathway {
  id: string;
  name: string;
  approach: string; // 'CBT-based', 'Mindfulness-based', etc.
  duration: string; // '8 weeks'
  description: string;
  targetPattern: string;
}

export class TherapeuticAutoAssignService {
  private readonly CLINICAL_REVIEW_REQUIRED = true;
  private readonly STRUCTURED_PROGRAM_CONTENT_READY = false; // 8-week program not built yet
  
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  /**
   * Suggest coping stories based on what worked for THIS user before.
   * Uses comparative intelligence from user's own story library.
   * 
   * HONEST APPROACH: Don't offer structured programs we haven't built.
   * Instead: Find what worked for them before and suggest creating more.
   */
  async suggestCopingStories(pattern: TherapeuticPattern): Promise<void> {
    // GATE: Clinical review still required for any emotional suggestions
    if (this.CLINICAL_REVIEW_REQUIRED) {
      this.logger.warn('Therapeutic suggestions blocked: Clinical review required', {
        pattern
      });
      throw new Error('CLINICAL_REVIEW_REQUIRED: See docs/api/THERAPEUTIC_DOCTRINE.md');
    }
    
    // Validate confidence threshold (0.9 minimum)
    if (pattern.confidence < 0.9) {
      this.logger.info('Pattern confidence too low', {
        confidence: pattern.confidence,
        required: 0.9
      });
      return;
    }
    
    // Validate pattern duration (5+ days minimum)
    if (pattern.dayCount < 5) {
      this.logger.info('Pattern duration too short', {
        dayCount: pattern.dayCount,
        required: 5
      });
      return;
    }
    
    // Find user's stories that helped with this emotion before (comparative intelligence)
    const helpfulStories = await this.findHelpfulUserStories(pattern.userId, pattern.patternType);
    
    if (helpfulStories.length > 0) {
      // User has stories that helped before - suggest creating similar
      await this.sendComparativeSuggestion(pattern.userId, pattern.profileId, helpfulStories[0], pattern);
    } else {
      // User has no helpful stories yet - suggest creating first one
      await this.sendFirstStorySuggestion(pattern.userId, pattern.profileId, pattern);
    }
    
    // Log suggestion for audit
    await this.logSuggestion(pattern);
  }
  
  /**
   * Find user's stories that helped with this emotion type before
   * Uses comparative intelligence - their own data, not generic suggestions
   */
  private async findHelpfulUserStories(
    userId: string,
    emotionType: string
  ): Promise<any[]> {
    // Find stories where mood improved from this emotion to calmer state
    const { data: effective } = await this.supabase
      .from('story_effectiveness')
      .select(`
        story_id,
        stories(id, title),
        mood_impact,
        effectiveness_score
      `)
      .eq('user_id', userId)
      .gte('effectiveness_score', 70)
      .order('effectiveness_score', { ascending: false })
      .limit(3);
    
    if (!effective) {
      return [];
    }
    
    // Filter for stories that helped with this emotion
    return effective.filter(s => {
      const moodImpact = s.mood_impact;
      if (!moodImpact?.before) return false;
      
      // Map pattern type to mood states
      const concerningMoods = {
        'anxiety': ['worried', 'anxious', 'scared'],
        'depression': ['sad', 'down', 'unhappy'],
        'anger': ['angry', 'frustrated', 'mad']
      };
      
      const relevantMoods = concerningMoods[emotionType] || [];
      return relevantMoods.includes(moodImpact.before) && 
             ['calm', 'happy', 'peaceful'].includes(moodImpact.after);
    });
  }
  
  /**
   * Send comparative suggestion based on user's own successful stories
   * HONEST: "Your story X helped before. Create another?"
   */
  private async sendComparativeSuggestion(
    userId: string,
    profileId: string,
    helpfulStory: any,
    pattern: TherapeuticPattern
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single();
    
    if (!user?.email) {
      return;
    }
    
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single();
    
    const childName = profile?.name || 'your child';
    const storyTitle = helpfulStory.stories?.title || 'one of your stories';
    const moodShift = `${helpfulStory.mood_impact.before} → ${helpfulStory.mood_impact.after}`;
    
    const subject = `Create another calming story?`;
    const body = `
      <p>${childName} felt worried 5 days this week.</p>
      
      <p>Your story "${storyTitle}" helped ${childName} feel calm before (mood: ${moodShift}).</p>
      
      <p>Create another story like that?</p>
      
      <p><a href="https://storytailor.com/stories/create?similar=${helpfulStory.story_id}">Create Story</a></p>
      
      <p><strong>If you're concerned about ${childName}'s wellbeing, contact their healthcare provider.</strong></p>
      
      <p><strong>Crisis Resources:</strong></p>
      <ul>
        <li>988 (National Crisis Hotline)</li>
        <li>Text HOME to 741741</li>
        <li>1-800-448-3000 (Boys Town - child crisis)</li>
      </ul>
      
      <div style="margin-top: 20px; padding: 15px; background: #FFF9E6; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 13px; color: #92400E;">
          <strong>Important:</strong> This is a wellness observation from story interactions, 
          not a medical or psychological diagnosis, assessment, or treatment recommendation.
        </p>
      </div>
    `;
    
    await this.emailService.sendEmail({
      to: user.email,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    });
  }
  
  /**
   * Send first story suggestion if user has no helpful stories yet
   * Honest: Suggests creating, not offering pre-made content
   */
  private async sendFirstStorySuggestion(
    userId: string,
    profileId: string,
    pattern: TherapeuticPattern
  ): Promise<void> {
    const { data: user } = await this.supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single();
    
    if (!user?.email) {
      return;
    }
    
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('name')
      .eq('id', profileId)
      .single();
    
    const childName = profile?.name || 'your child';
    
    const subject = `Check in with ${childName}`;
    const body = `
      <p>${childName} felt worried 5 days this week.</p>
      
      <p>Consider:</p>
      <ul>
        <li>Checking in with ${childName} about their feelings</li>
        <li>Creating a story together about brave characters who manage worries</li>
        <li>Speaking with ${childName}'s healthcare provider if you're concerned</li>
      </ul>
      
      <p><a href="https://storytailor.com/stories/create?theme=coping">Create Story Together</a></p>
      
      <p><strong>Crisis Resources:</strong></p>
      <ul>
        <li>988 (National Crisis Hotline)</li>
        <li>Text HOME to 741741</li>
        <li>1-800-448-3000 (Boys Town - child crisis)</li>
      </ul>
      
      <div style="margin-top: 20px; padding: 15px; background: #FFF9E6; border-left: 4px solid #F59E0B;">
        <p style="margin: 0; font-size: 13px; color: #92400E;">
          <strong>Important:</strong> This is a wellness observation from story interactions, 
          not a medical or psychological diagnosis, assessment, or treatment recommendation. 
          For mental health concerns, consult your child's healthcare provider.
        </p>
      </div>
    `;
    
    await this.emailService.sendEmail({
      to: user.email,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, '')
    });
  }
  
  private async logSuggestion(pattern: TherapeuticPattern): Promise<void> {
    await this.supabase
      .from('pipeline_executions')
      .insert({
        pipeline_type: 'coping_story_suggestion',
        pipeline_name: 'Coping Story Suggestion',
        user_id: pattern.userId,
        triggered_by: 'pattern_detection',
        trigger_data: {
          patternType: pattern.patternType,
          dayCount: pattern.dayCount,
          confidence: pattern.confidence
        },
        confidence_score: pattern.confidence,
        status: 'completed'
      });
  }
}

