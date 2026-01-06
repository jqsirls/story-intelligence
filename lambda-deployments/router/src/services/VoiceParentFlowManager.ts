/**
 * Voice-Only Parent Flow Manager
 * Handles parent insights and upgrade flows entirely through voice (Alexa)
 * Uses SMS for verification to protect child privacy
 */

export interface VoiceParentContext {
  childName: string;
  storiesCreated: number;
  insights: any;
  upgradeOptions: any;
  returnChannel: 'alexa' | 'google';
}

export class VoiceParentFlowManager {
  
  /**
   * Generate child-safe limit message (voice)
   */
  generateLimitReachedMessage(childName: string): {
    ssml: string;
    plainText: string;
    action: 'sms_verification';
  } {
    const messages = [
      `${childName}, you've created something amazing! To make more, let's get a grown-up. I'm sending a message to your parent's phone right now.`,
      `Time for a grown-up! ${childName}, can you ask Mom or Dad to check their phone? I just sent them a message!`,
      `Great job, ${childName}! Your grown-up needs to help us create more. I'm texting them now - ask them to check their phone!`
    ];

    const selected = messages[Math.floor(Math.random() * messages.length)];

    return {
      ssml: `<speak><prosody rate="medium" pitch="medium">${selected}</prosody><break time="1s"/></speak>`,
      plainText: selected,
      action: 'sms_verification'
    };
  }

  /**
   * Generate audio parent insights summary
   */
  generateAudioInsightsSummary(context: VoiceParentContext): {
    ssml: string;
    plainText: string;
    shouldOfferVisual: boolean;
  } {
    const { childName, storiesCreated, insights } = context;

    const summary = `Here's ${childName}'s week: 
Created ${storiesCreated} ${storiesCreated === 1 ? 'story' : 'stories'}. 
Mood: ${insights.dominantMood}. 
${insights.topTheme ? `Loves ${insights.topTheme} themes.` : ''} 
${insights.strengths[0] || 'Shows great creativity'}. 
Want the full visual report? I can text you a link, or continue here with voice options.`;

    const ssml = `<speak>
<prosody rate="95%" pitch="medium">
${summary}
</prosody>
<break time="1s"/>
Say "text me" for the full visual dashboard, 
<break time="500ms"/>
or say "continue" to hear your options here.
</speak>`;

    return {
      ssml,
      plainText: summary,
      shouldOfferVisual: true
    };
  }

  /**
   * Generate voice upgrade options
   */
  generateVoiceUpgradeOptions(context: VoiceParentContext): {
    ssml: string;
    plainText: string;
    options: string[];
  } {
    const message = `To keep the magic going, you can: 
Subscribe for nine dollars and ninety-nine cents per month for unlimited stories, 
or buy a story pack starting at four ninety-nine. 
Which would you like?`;

    const ssml = `<speak>
<prosody rate="90%" pitch="medium">
${message}
</prosody>
<break time="1s"/>
Say "subscribe" <break time="300ms"/> or "story pack".
</speak>`;

    return {
      ssml,
      plainText: message,
      options: ['subscribe', 'story pack', 'more info', 'maybe later']
    };
  }

  /**
   * Handle "subscribe" response
   */
  generateSubscriptionConfirmation(planType: 'family' | 'premium'): {
    ssml: string;
    plainText: string;
    action: 'send_payment_link';
  } {
    const prices = { family: '9.99', premium: '19.99' };
    const price = prices[planType];

    const message = `Perfect! I'm sending a secure payment link to your phone for ${price} per month. 
Once you complete it, ${planType === 'family' ? 'your whole family' : 'you'} can create unlimited stories!`;

    return {
      ssml: `<speak><prosody rate="medium">${message}</prosody></speak>`,
      plainText: message,
      action: 'send_payment_link'
    };
  }

  /**
   * Handle "story pack" response
   */
  generateStoryPackOptions(): {
    ssml: string;
    plainText: string;
    options: string[];
  } {
    const message = `Story packs available: 
Five stories for four ninety-nine, 
Ten stories for eight ninety-nine, 
or Twenty stories for fourteen ninety-nine. 
Which pack would you like?`;

    const ssml = `<speak>
<prosody rate="90%">
${message}
</prosody>
<break time="1s"/>
Say "five", "ten", or "twenty".
</speak>`;

    return {
      ssml,
      plainText: message,
      options: ['five', 'ten', 'twenty']
    };
  }

  /**
   * Generate payment completion message
   */
  generatePaymentCompleteMessage(childName: string): {
    ssmlForParent: string;
    ssmlForChild: string;
  } {
    return {
      ssmlForParent: `<speak>Thank you! Your payment is processing. ${childName} can start creating stories right away!</speak>`,
      ssmlForChild: `<speak><prosody rate="fast" pitch="high">Great news, ${childName}! Your grown-up said yes! What kind of story should we make next?</prosody></speak>`
    };
  }

  /**
   * Generate "text me" response
   */
  generateTextMeResponse(childName: string): {
    ssml: string;
    action: 'send_dashboard_link';
  } {
    const message = `Sending now! Check your phone for ${childName}'s full insights dashboard. 
You can manage everything there, or stay here and I'll walk you through it.`;

    return {
      ssml: `<speak>${message}</speak>`,
      action: 'send_dashboard_link'
    };
  }

  /**
   * Generate "maybe later" response
   */
  generateMaybeLaterResponse(childName: string): {
    ssmlForParent: string;
    ssmlForChild: string;
    action: 'schedule_followup';
  } {
    return {
      ssmlForParent: `<speak>No problem! I'll send you a reminder tomorrow with ${childName}'s updated insights. You can also visit storytailor dot com anytime.</speak>`,
      ssmlForChild: `<speak><prosody rate="medium">Your grown-up said we'll make more stories soon, ${childName}! For now, want to re-read your favorite?</prosody></speak>`,
      action: 'schedule_followup'
    };
  }

  /**
   * Convert insights to voice-friendly format
   */
  convertInsightsToVoice(insights: any): string {
    // Simplify complex insights for audio
    return `${insights.summary.dominantMood} mood, 
loves ${insights.topTheme} stories, 
shows ${insights.topStrength}`;
  }

  /**
   * Generate SSML with proper pacing and emphasis
   */
  generateSSML(text: string, options?: {
    rate?: string;
    pitch?: string;
    volume?: string;
    emphasis?: 'strong' | 'moderate' | 'reduced';
  }): string {
    const rate = options?.rate || 'medium';
    const pitch = options?.pitch || 'medium';
    const volume = options?.volume || 'medium';

    let ssml = `<speak><prosody rate="${rate}" pitch="${pitch}" volume="${volume}">`;
    
    if (options?.emphasis) {
      ssml += `<emphasis level="${options.emphasis}">${text}</emphasis>`;
    } else {
      ssml += text;
    }
    
    ssml += `</prosody></speak>`;
    
    return ssml;
  }
}

