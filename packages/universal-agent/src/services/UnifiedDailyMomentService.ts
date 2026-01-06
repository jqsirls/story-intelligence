/**
 * Unified Daily Moment Service
 * 
 * Merges daily digest + check-in into ONE daily touch.
 * User configures: morning OR evening (never both).
 * 
 * Morning moment: Check-in + yesterday's digest
 * Evening moment: Today's digest + optional check-in
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';
import { DailyDigestService } from './DailyDigestService';

export class UnifiedDailyMomentService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private dailyDigestService: DailyDigestService,
    private logger: Logger
  ) {}
  
  async sendMorningMoment(userId: string): Promise<void> {
    const { data: prefs } = await this.supabase
      .from('email_preferences')
      .select('daily_moment')
      .eq('user_id', userId)
      .single();
    
    if (prefs?.daily_moment !== 'morning') {
      return;
    }
    
    // Get yesterday's digest
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const digest = await (this.dailyDigestService as any).generateDigest(userId, yesterday);
    
    // Check if check-in is due
    const needsCheckIn = await this.needsCheckInToday(userId);
    
    // Only send if has content
    if (!digest && !needsCheckIn) {
      return; // Silence
    }
    
    // Send morning moment email
    const { data: user } = await this.supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (user?.email) {
      const subject = needsCheckIn ? 'Good morning - how are you feeling?' : 'Yesterday with Storytailor';
      const body = this.generateMorningBody(digest, needsCheckIn);
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
  
  async sendEveningMoment(userId: string): Promise<void> {
    const { data: prefs } = await this.supabase
      .from('email_preferences')
      .select('daily_moment')
      .eq('user_id', userId)
      .single();
    
    if (prefs?.daily_moment !== 'evening') {
      return;
    }
    
    // Use existing daily digest
    await this.dailyDigestService.sendDailyDigest(userId, new Date());
  }
  
  private async needsCheckInToday(userId: string): Promise<boolean> {
    const { data: checkIn } = await this.supabase
      .from('emotion_check_ins')
      .select('id')
      .eq('profile_id', userId)
      .gte('recorded_at', new Date().toISOString().split('T')[0])
      .limit(1)
      .single();
    
    return !checkIn;
  }
  
  private generateMorningBody(digest: any, needsCheckIn: boolean): string {
    let body = '<p>Good morning!</p>';
    
    if (needsCheckIn) {
      body += '<p>How are you feeling today? [Check-in Link]</p>';
    }
    
    if (digest) {
      body += `<p>Yesterday: ${digest.storiesConsumed} stories, ${digest.totalListenTime} minutes.</p>`;
    }
    
    return body;
  }
}

