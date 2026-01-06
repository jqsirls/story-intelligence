import OpenAI from 'openai';
import { Logger } from 'winston';

export interface ContextualSafetyAnalysis {
  isInappropriate: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  categories: string[];
  reasoning: string;
  confidence: number;
  contextualFlags: {
    nudity: { detected: boolean; context: 'human' | 'non-human' | 'none'; allowed: boolean };
    romance: { detected: boolean; intent: 'romantic' | 'innocent' | 'none'; allowed: boolean };
    gore: { detected: boolean; context: 'graphic' | 'action' | 'none'; allowed: boolean };
    silliness: { detected: boolean; context: 'playful' | 'gross-out' | 'none'; allowed: boolean };
  };
}

export class ContextualSafetyAnalyzer {
  private openai: OpenAI;
  private logger: Logger;

  constructor(openai: OpenAI, logger: Logger) {
    this.openai = openai;
    this.logger = logger;
  }

  /**
   * Analyze content contextually for nuanced safety detection
   * Uses AI to understand context, intent, and character types
   */
  async analyzeContextualSafety(
    content: string,
    userAge: number,
    contentType: string
  ): Promise<ContextualSafetyAnalysis> {
    this.logger.debug('Running contextual safety analysis', {
      contentType,
      userAge,
      contentLength: content.length
    });

    try {
      const prompt = `You are a child safety expert analyzing content for age-appropriateness with nuanced understanding.

Analyze the following content for a ${userAge}-year-old child:

Content: "${content}"
Content Type: ${contentType}
Target Age: ${userAge} years

Age Rating Guidelines:
- G (0-4 years): General audience, very restrictive
- PG (4-6 years): Parental guidance, allows playful silliness
- PG-13 (7+ years): Parental guidance for 13 and under, allows action and silliness

Universal Prohibitions (ALL ages):
- NO sexual content or romantic intent
- NO gorey or bloody content
- NO human/human-like nudity with visible genitalia

Contextual Allowances:
- Action sequences are OK (distinguished from graphic violence)
- Playful/comedic silliness is OK when age-appropriate (contextual, not keyword-based)
- Non-human character nudity in comedic contexts is OK (e.g., "silly naked dog")
- Innocent "boyfriend/girlfriend" meaning "friend" is OK (detect romantic intent vs innocent language)

Analyze with nuance:
1. **Nudity**: Distinguish human/human-like nudity with genitalia (BLOCK) vs non-human characters in comedic contexts (ALLOW)
2. **Romance**: Detect romantic intent (BLOCK) vs innocent "boyfriend/girlfriend" when kids mean "friend" (ALLOW)
3. **Gore/Blood**: Distinguish graphic violence (BLOCK) vs action sequences (ALLOW)
4. **Silliness**: Understand playful/comedic silliness contextually (ALLOW if age-appropriate), not keyword-based

Respond with a JSON object:
{
  "isInappropriate": boolean,
  "riskLevel": "low|medium|high",
  "categories": ["category1", "category2"],
  "reasoning": "Brief explanation of your analysis",
  "confidence": number (0-1 scale),
  "contextualFlags": {
    "nudity": {
      "detected": boolean,
      "context": "human|non-human|none",
      "allowed": boolean
    },
    "romance": {
      "detected": boolean,
      "intent": "romantic|innocent|none",
      "allowed": boolean
    },
    "gore": {
      "detected": boolean,
      "context": "graphic|action|none",
      "allowed": boolean
    },
    "silliness": {
      "detected": boolean,
      "context": "playful|gross-out|none",
      "allowed": boolean
    }
  }
}

Consider the child's developmental stage and use nuanced understanding. Err on the side of caution for safety, but allow innocent, age-appropriate content.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a child safety expert analyzing content for age-appropriateness with sensitivity, nuance, and care. You understand context, intent, and distinguish between innocent and inappropriate content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from contextual safety analysis');
      }

      const analysis = JSON.parse(content) as ContextualSafetyAnalysis;

      // Validate and normalize the response
      return this.validateAndNormalizeAnalysis(analysis);

    } catch (error) {
      this.logger.error('Contextual safety analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentType,
        userAge
      });

      // Fail safe - return conservative analysis
      return {
        isInappropriate: true,
        riskLevel: 'high',
        categories: ['analysis_error'],
        reasoning: 'Contextual analysis unavailable - applying conservative safety measures',
        confidence: 0.0,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      };
    }
  }

  /**
   * Validate and normalize the AI analysis response
   */
  private validateAndNormalizeAnalysis(analysis: any): ContextualSafetyAnalysis {
    // Ensure all required fields exist with defaults
    const normalized: ContextualSafetyAnalysis = {
      isInappropriate: Boolean(analysis.isInappropriate),
      riskLevel: this.normalizeRiskLevel(analysis.riskLevel),
      categories: Array.isArray(analysis.categories) ? analysis.categories : [],
      reasoning: String(analysis.reasoning || 'Contextual analysis completed'),
      confidence: Math.max(0, Math.min(1, Number(analysis.confidence) || 0.5)),
      contextualFlags: {
        nudity: this.normalizeNudityFlag(analysis.contextualFlags?.nudity),
        romance: this.normalizeRomanceFlag(analysis.contextualFlags?.romance),
        gore: this.normalizeGoreFlag(analysis.contextualFlags?.gore),
        silliness: this.normalizeSillinessFlag(analysis.contextualFlags?.silliness)
      }
    };

    // If any universal prohibition is detected, mark as inappropriate
    if (normalized.contextualFlags.nudity.detected && !normalized.contextualFlags.nudity.allowed) {
      normalized.isInappropriate = true;
      normalized.categories.push('nudity');
      if (normalized.riskLevel === 'low') normalized.riskLevel = 'medium';
    }

    if (normalized.contextualFlags.romance.detected && !normalized.contextualFlags.romance.allowed) {
      normalized.isInappropriate = true;
      normalized.categories.push('romance');
      if (normalized.riskLevel === 'low') normalized.riskLevel = 'medium';
    }

    if (normalized.contextualFlags.gore.detected && !normalized.contextualFlags.gore.allowed) {
      normalized.isInappropriate = true;
      normalized.categories.push('gore');
      normalized.riskLevel = 'high';
    }

    return normalized;
  }

  private normalizeRiskLevel(riskLevel: any): 'low' | 'medium' | 'high' {
    if (riskLevel === 'low' || riskLevel === 'medium' || riskLevel === 'high') {
      return riskLevel;
    }
    return 'medium';
  }

  private normalizeNudityFlag(flag: any): { detected: boolean; context: 'human' | 'non-human' | 'none'; allowed: boolean } {
    if (!flag) {
      return { detected: false, context: 'none', allowed: false };
    }

    const context = flag.context === 'human' || flag.context === 'non-human' ? flag.context : 'none';
    const detected = Boolean(flag.detected);
    const allowed = context === 'non-human' && detected; // Only allow non-human in comedic contexts

    return { detected, context, allowed };
  }

  private normalizeRomanceFlag(flag: any): { detected: boolean; intent: 'romantic' | 'innocent' | 'none'; allowed: boolean } {
    if (!flag) {
      return { detected: false, intent: 'none', allowed: false };
    }

    const intent = flag.intent === 'romantic' || flag.intent === 'innocent' ? flag.intent : 'none';
    const detected = Boolean(flag.detected);
    const allowed = intent === 'innocent' && detected; // Only allow innocent intent

    return { detected, intent, allowed };
  }

  private normalizeGoreFlag(flag: any): { detected: boolean; context: 'graphic' | 'action' | 'none'; allowed: boolean } {
    if (!flag) {
      return { detected: false, context: 'none', allowed: false };
    }

    const context = flag.context === 'graphic' || flag.context === 'action' ? flag.context : 'none';
    const detected = Boolean(flag.detected);
    const allowed = context === 'action' && detected; // Only allow action sequences, not graphic violence

    return { detected, context, allowed };
  }

  private normalizeSillinessFlag(flag: any): { detected: boolean; context: 'playful' | 'gross-out' | 'none'; allowed: boolean } {
    if (!flag) {
      return { detected: false, context: 'none', allowed: false };
    }

    const context = flag.context === 'playful' || flag.context === 'gross-out' ? flag.context : 'none';
    const detected = Boolean(flag.detected);
    const allowed = context === 'playful' && detected; // Only allow playful silliness, not gross-out

    return { detected, context, allowed };
  }
}
