/**
 * Email Notification Templates Service
 * 
 * Provides HTML email templates for various notification types.
 * All templates follow the Storytailor® brand guidelines.
 * 
 * IMPORTANT: Uses presigned S3 URLs for all images (logo, cover art, etc.)
 * just like we do for story and character art. This ensures consistent
 * asset delivery across all channels.
 * 
 * Templates:
 * - Story Complete: Sent when all story assets are ready
 * - Partial Complete: Sent when story is ready but some assets failed
 * - Weekly Digest: Weekly summary of activity, stories, and emotions
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3 configuration for email assets
const ASSETS_BUCKET = process.env.S3_ASSETS_BUCKET || 'storytailor-prod-assets-us-east-1';
const LOGO_KEY = 'email/storytailor-text-logo-black.png';
const LOGO_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days (max for presigned URLs)

// Initialize S3 client (lazy loaded)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return s3Client;
}

/**
 * Generate a presigned URL for the Storytailor logo
 * Treats the logo like any other S3 asset (story art, character images)
 */
export async function getLogoPresignedUrl(): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: LOGO_KEY,
    });
    
    return await getSignedUrl(getS3Client(), command, {
      expiresIn: LOGO_EXPIRY_SECONDS,
    });
  } catch (error) {
    // Fallback to direct S3 URL if presigning fails
    // Note: This requires the bucket to have public access or CloudFront
    console.error('Failed to generate presigned logo URL:', error);
    return `https://${ASSETS_BUCKET}.s3.amazonaws.com/${LOGO_KEY}`;
  }
}

/**
 * Generate a presigned URL for story cover art
 */
export async function getCoverArtPresignedUrl(coverArtKey: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: ASSETS_BUCKET,
      Key: coverArtKey,
    });
    
    return await getSignedUrl(getS3Client(), command, {
      expiresIn: LOGO_EXPIRY_SECONDS,
    });
  } catch (error) {
    console.error('Failed to generate presigned cover art URL:', error);
    // Return empty to skip showing cover art
    return '';
  }
}

export interface EmailTemplateData {
  recipientName: string;
  recipientEmail: string;
}

export interface StoryCompleteData extends EmailTemplateData {
  storyTitle: string;
  storyId: string;
  characterName: string;
  coverArtUrl?: string; // Already a presigned URL or empty
  coverArtKey?: string; // S3 key if we need to generate presigned URL
  audioReady: boolean;
  pdfReady: boolean;
  activitiesCount: number;
  storyUrl: string;
}

export interface PartialCompleteData extends EmailTemplateData {
  storyTitle: string;
  storyId: string;
  assetsReady: string[];
  assetsFailed: string[];
  retryUrl: string;
  storyUrl: string;
}

export interface WeeklyDigestData extends EmailTemplateData {
  weekStart: string;
  weekEnd: string;
  storiesCreated: number;
  storiesRead: number;
  emotionCheckIns: number;
  topEmotions: Array<{ emotion: string; count: number }>;
  recommendedStoryTypes: string[];
  familyHighlights: Array<{ profileName: string; activity: string }>;
  upcomingFeatures?: string[];
  accountUrl: string;
}

/**
 * Base styles for all email templates
 * Clean, minimal design with focus on readability
 */
const baseStyles = `
  <style>
    body, html {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f5f5f5;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid #e5e5e5;
    }
    .logo {
      height: 36px;
      width: auto;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 16px;
    }
    .story-card {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .cover-image {
      width: 100%;
      max-width: 400px;
      border-radius: 8px;
      margin: 0 auto 16px auto;
      display: block;
    }
    .story-title {
      font-size: 22px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 8px 0;
      text-align: center;
    }
    .story-character {
      color: #666666;
      font-size: 15px;
      text-align: center;
      margin-bottom: 16px;
    }
    .asset-list {
      list-style: none;
      padding: 0;
      margin: 16px 0;
    }
    .asset-list li {
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .asset-ready { color: #22c55e; }
    .asset-failed { color: #ef4444; }
    .cta-button {
      display: inline-block;
      background-color: #1a1a1a;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 15px;
      margin-top: 16px;
    }
    .secondary-button {
      display: inline-block;
      background-color: #f0f0f0;
      color: #333333 !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 500;
      font-size: 14px;
      margin-top: 8px;
    }
    .stats-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 24px 0;
    }
    .stat-card {
      flex: 1;
      min-width: 120px;
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .stat-label {
      color: #666666;
      font-size: 13px;
      margin-top: 4px;
    }
    .emotion-bar {
      display: flex;
      align-items: center;
      margin: 8px 0;
    }
    .emotion-name {
      width: 100px;
      font-size: 13px;
      color: #666666;
    }
    .emotion-progress {
      flex: 1;
      height: 6px;
      background: #e5e5e5;
      border-radius: 3px;
      overflow: hidden;
    }
    .emotion-fill {
      height: 100%;
      background: #333333;
      border-radius: 3px;
    }
    .info-box {
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      padding: 16px;
      margin: 16px 0;
      font-size: 14px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e5e5;
      background: #fafafa;
    }
    .footer p {
      color: #999999;
      font-size: 12px;
      margin: 6px 0;
    }
    .footer a {
      color: #666666;
      text-decoration: underline;
    }
    .tagline {
      color: #999999;
      font-size: 11px;
      margin-top: 12px;
    }
    @media (max-width: 480px) {
      .content { padding: 24px 16px; }
      .stat-card { min-width: 100%; }
    }
  </style>
`;

/**
 * Email header with Storytailor logo (presigned URL)
 */
const emailHeader = (logoUrl: string) => `
  <div class="header">
    <img src="${logoUrl}" alt="Storytailor" class="logo" />
  </div>
`;

/**
 * Email footer with proper trademark notation
 * - "Storytailor®" first prominent mention
 * - "Story Intelligence™" in tagline
 */
const emailFooter = () => `
  <div class="footer">
    <p>© ${new Date().getFullYear()} Storytailor® Inc. All rights reserved.</p>
    <p>
      <a href="https://storytailor.com/privacy">Privacy</a> · 
      <a href="https://storytailor.com/terms">Terms</a> · 
      <a href="https://storytailor.com/unsubscribe">Unsubscribe</a>
    </p>
    <p class="tagline">Powered by Story Intelligence™</p>
  </div>
`;

/**
 * Generate Story Complete email template
 * 
 * Subject: "✨ [Child's Name]'s Story is Ready: [Story Title]"
 * 
 * This email is sent when all story assets have been successfully generated.
 * Includes the story cover art using a presigned S3 URL.
 */
export async function generateStoryCompleteEmail(data: StoryCompleteData): Promise<string> {
  // Get presigned URLs for logo and cover art
  const logoUrl = await getLogoPresignedUrl();
  let coverArtUrl = data.coverArtUrl || '';
  
  // If we have a cover art S3 key but no URL, generate presigned URL
  if (!coverArtUrl && data.coverArtKey) {
    coverArtUrl = await getCoverArtPresignedUrl(data.coverArtKey);
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Story is Ready | Storytailor</title>
  ${baseStyles}
</head>
<body>
  <div class="email-wrapper">
    ${emailHeader(logoUrl)}
    
    <div class="content">
      <p class="greeting">Hi ${data.recipientName},</p>
      
      <p>${data.characterName}'s personalized story is ready! All the magic has been created just for them.</p>
      
      <div class="story-card">
        ${coverArtUrl ? `<img src="${coverArtUrl}" alt="${data.storyTitle}" class="cover-image" />` : ''}
        <h2 class="story-title">${data.storyTitle}</h2>
        <p class="story-character">Starring ${data.characterName}</p>
        
        <ul class="asset-list">
          <li class="asset-ready">✓ Story text ready to read</li>
          ${data.audioReady ? '<li class="asset-ready">✓ Audio narration ready</li>' : ''}
          ${data.pdfReady ? '<li class="asset-ready">✓ PDF storybook ready</li>' : ''}
          ${data.activitiesCount > 0 ? `<li class="asset-ready">✓ ${data.activitiesCount} activities ready</li>` : ''}
        </ul>
        
        <div style="text-align: center;">
          <a href="${data.storyUrl}" class="cta-button">Read the Story</a>
        </div>
      </div>
      
      <p style="color: #666666; font-size: 14px;">
        Tip: Try the audio read-along feature for bedtime, or print the PDF for screen-free reading.
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate Partial Complete email template
 * 
 * Sent when the story text is ready but some assets (audio, PDF, etc.) failed to generate.
 */
export async function generatePartialCompleteEmail(data: PartialCompleteData): Promise<string> {
  const logoUrl = await getLogoPresignedUrl();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Story is Almost Ready | Storytailor</title>
  ${baseStyles}
</head>
<body>
  <div class="email-wrapper">
    ${emailHeader(logoUrl)}
    
    <div class="content">
      <p class="greeting">Hi ${data.recipientName},</p>
      
      <p>Your story "<strong>${data.storyTitle}</strong>" has been created, but some extras couldn't be generated.</p>
      
      <div class="story-card">
        <h3 style="margin-top: 0;">What's Ready</h3>
        <ul class="asset-list">
          ${data.assetsReady.map(asset => `<li class="asset-ready">✓ ${asset}</li>`).join('')}
        </ul>
        
        <h3>Needs Attention</h3>
        <ul class="asset-list">
          ${data.assetsFailed.map(asset => `<li class="asset-failed">✗ ${asset}</li>`).join('')}
        </ul>
        
        <div class="info-box">
          <strong>Don't worry!</strong> You can retry generating the failed items, or enjoy your story now without them.
        </div>
        
        <div style="text-align: center;">
          <a href="${data.retryUrl}" class="cta-button">Retry Generation</a>
          <br />
          <a href="${data.storyUrl}" class="secondary-button">Read Story Now</a>
        </div>
      </div>
      
      <p style="color: #666666; font-size: 14px;">
        If you continue to experience issues, contact support@storytailor.com
      </p>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate Weekly Digest email template
 * 
 * Weekly summary of family storytelling activity, emotions tracked, and recommendations.
 */
export async function generateWeeklyDigestEmail(data: WeeklyDigestData): Promise<string> {
  const logoUrl = await getLogoPresignedUrl();
  const maxEmotionCount = Math.max(...data.topEmotions.map(e => e.count), 1);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Weekly Story Digest | Storytailor</title>
  ${baseStyles}
</head>
<body>
  <div class="email-wrapper">
    ${emailHeader(logoUrl)}
    
    <div class="content">
      <p class="greeting">Hi ${data.recipientName},</p>
      
      <p>Here's your family's storytelling journey for <strong>${data.weekStart} – ${data.weekEnd}</strong>.</p>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${data.storiesCreated}</div>
          <div class="stat-label">Stories Created</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.storiesRead}</div>
          <div class="stat-label">Stories Read</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.emotionCheckIns}</div>
          <div class="stat-label">Check-ins</div>
        </div>
      </div>
      
      ${data.topEmotions.length > 0 ? `
        <div class="story-card">
          <h3 style="margin-top: 0;">Emotion Insights</h3>
          <p style="color: #666666; font-size: 13px; margin-bottom: 12px;">Top emotions expressed this week:</p>
          ${data.topEmotions.map(emotion => `
            <div class="emotion-bar">
              <span class="emotion-name">${emotion.emotion}</span>
              <div class="emotion-progress">
                <div class="emotion-fill" style="width: ${(emotion.count / maxEmotionCount) * 100}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      ${data.familyHighlights.length > 0 ? `
        <div class="story-card">
          <h3 style="margin-top: 0;">Family Highlights</h3>
          <ul style="padding-left: 20px; margin: 0;">
            ${data.familyHighlights.map(h => `<li><strong>${h.profileName}</strong>: ${h.activity}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${data.recommendedStoryTypes.length > 0 ? `
        <div class="story-card">
          <h3 style="margin-top: 0;">Recommended This Week</h3>
          <p style="margin-bottom: 16px;">Based on this week's emotions:</p>
          <p style="font-weight: 500; margin-bottom: 16px;">
            ${data.recommendedStoryTypes.join(' · ')}
          </p>
          <a href="https://storytailor.com/create" class="cta-button">Create a Story</a>
        </div>
      ` : ''}
      
      ${data.upcomingFeatures && data.upcomingFeatures.length > 0 ? `
        <div class="info-box">
          <strong>Coming Soon:</strong> ${data.upcomingFeatures.join(', ')}
        </div>
      ` : ''}
      
      <div style="text-align: center; margin-top: 24px;">
        <a href="${data.accountUrl}" class="secondary-button">View Full Dashboard</a>
      </div>
    </div>
    
    ${emailFooter()}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for plain text fallback
 * Used when HTML rendering is not supported
 */
export function generatePlainTextEmail(subject: string, body: string): string {
  return `
${subject}
${'='.repeat(subject.length)}

${body}

---
Storytailor® - Powered by Story Intelligence™
https://storytailor.com

To unsubscribe: https://storytailor.com/unsubscribe
  `.trim();
}

/**
 * Email notification types
 */
export type EmailNotificationType = 
  | 'story_complete'
  | 'story_partial'
  | 'weekly_digest'
  | 'emotion_alert'
  | 'subscription_update'
  | 'invite_received'
  | 'transfer_request';

/**
 * Generate email subject line based on type
 * Note: Uses Storytailor (no trademark) in subject lines for brevity
 */
export function getEmailSubject(type: EmailNotificationType, data?: Record<string, any>): string {
  switch (type) {
    case 'story_complete':
      return `✨ ${data?.characterName || 'Your'}'s Story is Ready: ${data?.storyTitle || 'New Story'}`;
    case 'story_partial':
      return `Your story needs attention | Storytailor`;
    case 'weekly_digest':
      return `Your Weekly Story Digest | Storytailor`;
    case 'emotion_alert':
      return `Emotion update for ${data?.profileName || 'your child'} | Storytailor`;
    case 'subscription_update':
      return `Subscription update | Storytailor`;
    case 'invite_received':
      return `You've been invited to a library | Storytailor`;
    case 'transfer_request':
      return `Someone wants to share a story with you | Storytailor`;
    default:
      return `Update from Storytailor`;
  }
}

/**
 * Prepare email with all presigned URLs ready
 * This is the main entry point for sending emails
 */
export async function prepareStoryCompleteEmail(
  recipientName: string,
  recipientEmail: string,
  storyTitle: string,
  storyId: string,
  characterName: string,
  coverArtKey?: string,
  audioReady = true,
  pdfReady = true,
  activitiesCount = 3
): Promise<{ subject: string; html: string; text: string }> {
  const storyUrl = `https://storytailor.com/story/${storyId}`;
  
  const data: StoryCompleteData = {
    recipientName,
    recipientEmail,
    storyTitle,
    storyId,
    characterName,
    coverArtKey,
    audioReady,
    pdfReady,
    activitiesCount,
    storyUrl,
  };

  const subject = getEmailSubject('story_complete', { characterName, storyTitle });
  const html = await generateStoryCompleteEmail(data);
  const text = generatePlainTextEmail(
    subject,
    `Hi ${recipientName},\n\n${characterName}'s personalized story "${storyTitle}" is ready!\n\nRead it here: ${storyUrl}\n\nEnjoy!`
  );

  return { subject, html, text };
}

/**
 * Generate user-type-specific story complete email
 */
export async function generateStoryCompleteEmailByUserType(
  userName: string,
  storyTitle: string,
  coverArtUrl: string,
  playUrl: string,
  userType: string
): Promise<{ subject: string; html: string }> {
  const logoUrl = await getLogoPresignedUrl();
  
  let subject = '';
  let valueMessage = '';
  
  switch (userType) {
    case 'child':
      subject = `Your story is ready! 🎉`;
      valueMessage = `<p style="font-size: 16px; color: #4A5568; margin: 20px 0;">Your adventure is ready to play!</p>`;
      break;
    
    case 'parent':
    case 'guardian':
    case 'grandparent':
      subject = `"${storyTitle}" is ready`;
      valueMessage = `<p style="font-size: 16px; color: #4A5568; margin: 20px 0;">Create magical moments with your child.</p>`;
      break;
    
    case 'teacher':
    case 'librarian':
      subject = `Classroom story ready: "${storyTitle}"`;
      valueMessage = `<p style="font-size: 16px; color: #4A5568; margin: 20px 0;">Engage your students with personalized storytelling.</p>`;
      break;
    
    case 'therapist':
    case 'child_life_specialist':
      subject = `Therapeutic story ready: "${storyTitle}"`;
      valueMessage = `<p style="font-size: 16px; color: #4A5568; margin: 20px 0;">Support your client's therapeutic journey.</p>`;
      break;
    
    default:
      subject = `"${storyTitle}" is ready`;
      valueMessage = `<p style="font-size: 16px; color: #4A5568; margin: 20px 0;">Your personalized story is ready.</p>`;
  }
  
  const body = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <img src="${logoUrl}" alt="Storytailor" style="width: 150px; margin-bottom: 20px;" />
      
      <h1 style="color: #2D3748; font-size: 24px; margin: 0 0 10px 0;">${subject}</h1>
      
      ${valueMessage}
      
      <img src="${coverArtUrl}" alt="${storyTitle}" style="width: 100%; max-width: 400px; border-radius: 12px; margin: 20px 0;" />
      
      <a href="${playUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0;">
        Play Story
      </a>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #718096;">
        <p><strong>Storytailor®</strong> · Story Intelligence™</p>
        <p><a href="https://storytailor.com/preferences" style="color: #4F46E5;">Email Preferences</a></p>
      </div>
    </div>
  `;
  
  return { subject, html: body };
}
