/**
 * Conversational Character Creation
 * Natural, engaging dialogue that subtly gathers comprehensive character details
 */

import OpenAI from 'openai';

export interface ConversationTurn {
  question: string;
  userResponse?: string;
  extractedData?: any;
  phase: 'name' | 'connection' | 'species' | 'appearance' | 'special' | 'personality' | 'confirm';
}

export interface CharacterCreationSession {
  userId: string;
  sessionId: string;
  turns: ConversationTurn[];
  gatheredTraits: Partial<CharacterTraits>;
  currentPhase: string;
  complete: boolean;
}

export interface CharacterTraits {
  name: string;
  lastName?: string;
  age: number;
  species: string;
  gender?: string;
  ethnicity: string[];
  language: string;
  skinColor?: string;
  skinHex?: string;
  hairColor?: string;
  hairHex?: string;
  hairTexture?: string;
  eyeColor?: string;
  eyeHex?: string;
  inclusivityTraits: string[];
  appearanceDescription?: string;
  personality: string[];
  quirks: string[];
  specialAbilities: string[];
}

export class ConversationalCharacterCreator {
  private openai: OpenAI;
  
  constructor(openaiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiKey });
  }
  
  /**
   * Start character creation conversation
   */
  async startConversation(userId: string, userProfile?: any): Promise<{
    question: string;
    sessionId: string;
  }> {
    const sessionId = `char_session_${Date.now()}`;
    
    // Warm, inviting opening
    const question = "Let's create a character together! This is going to be so fun! What's their name?";
    
    return { question, sessionId };
  }
  
  /**
   * Process user response and generate next question
   */
  async processResponse(
    sessionId: string,
    userResponse: string,
    currentPhase: string,
    gatheredTraits: Partial<CharacterTraits>,
    userProfile?: any
  ): Promise<{
    question: string;
    extractedData: any;
    nextPhase: string;
    complete: boolean;
  }> {
    
    // Use GPT-5 to extract information and generate natural next question
    const systemPrompt = `You are a warm, engaging character creation assistant for children ages 3-10.

Your goal: Gather character details through natural conversation that feels like storytelling, not an interview.

CRITICAL RULES:
1. Ask ONE question at a time
2. Keep responses SHORT (1-2 sentences max)
3. Celebrate every detail the child shares
4. NEVER use clinical/medical language
5. Make disabilities magical ("wheelchair" = "magical racing chair")
6. Infer inclusivity traits from context (child says "uses wheels" = wheelchair user)
7. Be culturally sensitive when gathering ethnicity
8. If child seems stuck, offer fun examples

Current phase: ${currentPhase}
Gathered so far: ${JSON.stringify(gatheredTraits, null, 2)}
User profile hints: ${JSON.stringify(userProfile, null, 2)}`;

    const userPrompt = `The child just said: "${userResponse}"

Based on this response and the current phase (${currentPhase}), extract any character details and generate the next natural question.

Phase progression:
1. name → Ask if character is like them or different
2. connection → Ask about species (human or magical)
3. species → Ask about appearance (hair, eyes, special features)
4. appearance → Ask about what makes them special/unique
5. special → Ask about personality
6. personality → Confirm and finish

Return JSON:
{
  "extractedData": {
    // Any traits you detected from their response
  },
  "nextQuestion": "Your warm, short question here",
  "nextPhase": "connection|species|appearance|special|personality|confirm",
  "complete": false
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });
    
    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      question: result.nextQuestion,
      extractedData: result.extractedData,
      nextPhase: result.nextPhase,
      complete: result.complete || false
    };
  }
  
  /**
   * Auto-fill missing details with cultural sensitivity
   */
  async autoFillMissingDetails(partialTraits: Partial<CharacterTraits>): Promise<CharacterTraits> {
    const systemPrompt = `You are an expert at creating culturally-sensitive, inclusive character profiles.

Fill in missing character details while:
- Being respectful of cultural norms
- Defaulting to appropriate diversity
- Never stereotyping
- Using age-appropriate language

Provide specific hex codes for skin, hair, and eyes based on ethnicity.`;

    const userPrompt = `Complete this character profile with missing details:

${JSON.stringify(partialTraits, null, 2)}

Rules:
1. If ethnicity provided, infer appropriate skin/hair/eye colors with HEX codes
2. If inclusivity traits mentioned, describe how they're represented visually
3. If appearance vague, create detailed description
4. Add 2-3 personality traits if missing
5. Add 1-2 quirks that feel natural
6. Keep everything age-appropriate for age ${partialTraits.age}

Return complete JSON character profile with all fields filled.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    });
    
    const completed = JSON.parse(response.choices[0]?.message?.content || '{}');
    
    return {
      ...partialTraits,
      ...completed
    } as CharacterTraits;
  }
  
  /**
   * Detect inclusivity traits from conversational hints
   */
  detectInclusivityFromConversation(userResponse: string): string[] {
    const detectedTraits: string[] = [];
    const lower = userResponse.toLowerCase();
    
    // Wheelchair detection
    if (lower.match(/wheelchair|wheels|rolls|racing chair/)) {
      detectedTraits.push('wheelchair_user');
    }
    
    // Vitiligo detection
    if (lower.match(/patches|two.?tone|cool patterns|different colored/)) {
      detectedTraits.push('vitiligo');
    }
    
    // Autism hints
    if (lower.match(/headphones|routines|patterns|special interests/)) {
      detectedTraits.push('autism');
    }
    
    // ADHD hints  
    if (lower.match(/lots of energy|can't sit still|fidget/)) {
      detectedTraits.push('adhd');
    }
    
    // Prosthetic hints
    if (lower.match(/robot arm|special leg|one arm|blade/)) {
      if (lower.match(/arm/)) detectedTraits.push('prosthetic_arm');
      if (lower.match(/leg|blade/)) detectedTraits.push('prosthetic_leg');
    }
    
    // Service animal
    if (lower.match(/service dog|guide dog|helper dog/)) {
      detectedTraits.push('service_animal');
    }
    
    // Glasses/hearing
    if (lower.match(/glasses|can't see well/)) {
      detectedTraits.push('glasses');
    }
    if (lower.match(/hearing aids|can't hear/)) {
      detectedTraits.push('hearing_aids');
    }
    
    return detectedTraits;
  }
  
  /**
   * Make inclusivity traits magical (for conversation)
   */
  makeMagical(trait: string, customization?: string): string {
    const magical: Record<string, string> = {
      wheelchair_user: customization || 'magical racing chair with rainbow wheels',
      prosthetic_leg: customization || 'super-speed running blade',
      prosthetic_arm: customization || 'amazing robot arm with special powers',
      hearing_aids: customization || 'super-hearing devices',
      glasses: customization || 'magic seeing glasses',
      vitiligo: customization || 'beautiful star-pattern skin',
      service_animal: customization || 'best friend helper dog',
      autism: customization || 'sees amazing patterns others miss',
      adhd: customization || 'lightning-fast ideas and super energy'
    };
    
    return magical[trait] || trait;
  }
}

