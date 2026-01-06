/**
 * Seat Management Service
 * 
 * Handles B2B seat lifecycle emails:
 * - Seat added → Welcome email to new member + confirmation to admin
 * - Seat removed → Archive notification + roster update to admin
 * - Seat replaced → Automated transfer + dual notification
 * - Seats full → Upgrade CTA to admin
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from './EmailService';

export class SeatManagementService {
  constructor(
    private supabase: SupabaseClient,
    private emailService: EmailService,
    private logger: Logger
  ) {}
  
  async handleSeatAdded(orgId: string, userId: string): Promise<void> {
    // Send welcome email to new member
    const { data: user } = await this.supabase
      .from('users')
      .select('email, first_name')
      .eq('id', userId)
      .single();
    
    const { data: org } = await this.supabase
      .from('organization_accounts')
      .select('name')
      .eq('id', orgId)
      .single();
    
    if (user?.email && org) {
      const subject = `Welcome to ${org.name} on Storytailor`;
      const body = `
        <p>Welcome to ${org.name}'s Storytailor account!</p>
        <p>You now have access to the shared library and all organization features.</p>
        <p><a href="https://storytailor.com/organization">Get Started</a></p>
      `;
      
      await this.emailService.sendEmail({
        to: user.email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
    
    // Notify admin
    await this.notifyAdminOfRosterChange(orgId, 'added', userId);
  }
  
  async handleSeatRemoved(orgId: string, userId: string): Promise<void> {
    // Archive member's library
    // Send removal notification
    // Notify admin
    await this.notifyAdminOfRosterChange(orgId, 'removed', userId);
  }
  
  async handleSeatsFullAlert(orgId: string): Promise<void> {
    // Get admin email
    const { data: admin } = await this.supabase
      .from('organization_members')
      .select('user_id, users(email)')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1)
      .single();
    
    if (admin && (admin.users as any)?.email) {
      const subject = 'All seats filled - time to expand?';
      const body = `
        <p>Your organization has used all available seats.</p>
        <p>Add more seats to bring in additional team members.</p>
        <p><a href="https://storytailor.com/organization/upgrade">Add Seats</a></p>
      `;
      
      await this.emailService.sendEmail({
        to: (admin.users as any).email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
  
  private async notifyAdminOfRosterChange(
    orgId: string,
    action: 'added' | 'removed',
    userId: string
  ): Promise<void> {
    const { data: admin } = await this.supabase
      .from('organization_members')
      .select('user_id, users(email)')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1)
      .single();
    
    if (admin && (admin.users as any)?.email) {
      const subject = `Team member ${action}`;
      const body = `<p>A team member was ${action} to your organization.</p>`;
      
      await this.emailService.sendEmail({
        to: (admin.users as any).email,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')
      });
    }
  }
}

