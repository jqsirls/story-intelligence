/**
 * Inclusivity Trait Validator
 * 
 * CRITICAL SERVICE for combating AI bias in image generation.
 * 
 * AI image generators (gpt-image-1, gpt-image-1.5) have known bias toward:
 * - "Perfect" Euro-centric features
 * - Able-bodied representations
 * - Smoothing over disabilities and differences
 * 
 * This service uses vision model to VALIDATE that requested inclusivity traits
 * are actually visible in generated images (not smoothed away by AI bias).
 */

import OpenAI from 'openai';
import { InclusivityTrait } from '../constants/ComprehensiveInclusivityDatabase';
import { MODEL_CONFIG } from '../config/models';

export interface TraitValidationResult {
  allTraitsPresent: boolean;
  traitsVisible: Array<{
    trait: string;
    visible: boolean;
    confidence: number;
    notes: string;
  }>;
  missingTraits: string[];
  suggestedRetryPrompt: string;
}

export class InclusivityTraitValidator {
  private openai: OpenAI;
  private logger: any;
  private visionModel: string;

  constructor(openai: OpenAI, logger: any, visionModel: string = MODEL_CONFIG.VISION) {
    this.openai = openai;
    this.logger = logger;
    this.visionModel = visionModel;
  }

  /**
   * Validate that expected inclusivity traits are visible in image
   * CRITICAL for combating AI bias (AI tends to "fix" differences)
   */
  async validateTraitsPresent({
    imageB64,
    expectedTraits,
    characterName
  }: {
    imageB64: string;
    expectedTraits: InclusivityTrait[];
    characterName: string;
  }): Promise<TraitValidationResult> {
    
    // No traits to validate
    if (expectedTraits.length === 0) {
      return {
        allTraitsPresent: true,
        traitsVisible: [],
        missingTraits: [],
        suggestedRetryPrompt: ''
      };
    }

    this.logger.info('Validating inclusivity traits in generated image', {
      characterName,
      traitCount: expectedTraits.length,
      traits: expectedTraits.map(t => t.label)
    });

    const checklistText = expectedTraits
      .map(t => `${t.label}: ${t.visualValidationChecklist.join('; ')}`)
      .join('\n');

    const prompt = `
You are validating accurate inclusivity representation in children's character art.

CHARACTER: ${characterName}

EXPECTED INCLUSIVITY TRAITS:
${checklistText}

CRITICAL VALIDATION TASK:
AI image generators often have bias toward "perfect" able-bodied children with Eurocentric features.
Check if this image ACCURATELY shows the specified traits, or if AI smoothed them over.

For EACH expected trait, determine:
1. Is trait clearly visible in image? (yes/no)
2. How confident are you? (0-100%)
3. Specific observations: What do you see (or not see)?
4. Was trait minimized or "fixed" by AI?

Examples of AI bias to check for:
- Down syndrome requested but child looks typical → FAIL
- Wheelchair user but child is standing → FAIL
- Missing arm but both arms present → FAIL
- Dark skin requested but rendered lighter → FAIL
- Vitiligo patches missing or barely visible → FAIL
- Prosthetic requested but biological limb shown → FAIL

Return STRICT JSON:
{
  "traitsVisible": [
    {
      "trait": "trait_label",
      "visible": true/false,
      "confidence": 0-100,
      "notes": "What you observed - be specific"
    }
  ],
  "allTraitsPresent": true/false,
  "missingTraits": ["trait labels that are not visible or were smoothed over"],
  "suggestedRetryPrompt": "If traits missing, what MANDATORY language to add for retry to force AI compliance"
}
    `.trim();

    try {
      const response = await this.openai.chat.completions.create({
        model: this.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: {
                  url: `data:image/png;base64,${imageB64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      });

      const raw = response.choices[0]?.message?.content;

      if (!raw) {
        throw new Error('Empty trait validation output from vision model');
      }

      const result = JSON.parse(raw);

      this.logger.info('Trait validation complete', {
        characterName,
        allTraitsPresent: result.allTraitsPresent,
        missingTraits: result.missingTraits,
        traitsChecked: expectedTraits.length
      });

      // Log AI bias cases
      if (!result.allTraitsPresent) {
        this.logger.warn('AI BIAS DETECTED - Traits missing from generated image', {
          characterName,
          missingTraits: result.missingTraits,
          traitsVisible: result.traitsVisible.filter((t: any) => !t.visible)
        });
      }

      return result;

    } catch (error: any) {
      this.logger.error('Trait validation failed', {
        error: error.message,
        characterName,
        traitCount: expectedTraits.length
      });
      throw new Error(`Trait validation failed: ${error.message}`);
    }
  }

  /**
   * Build intensified retry prompt when AI bias detected
   * Used for second/third attempts with MORE forceful language
   */
  buildIntensifiedPrompt(
    missingTraits: InclusivityTrait[],
    attempt: number
  ): string {
    const sections: string[] = [
      '\n\nAI BIAS CORRECTION - MANDATORY REQUIREMENTS (ATTEMPT ' + attempt + '):'
    ];

    if (attempt === 2) {
      sections.push('YOU FAILED TO GENERATE THE REQUESTED FEATURES IN PREVIOUS ATTEMPT.');
    } else if (attempt === 3) {
      sections.push('THIS IS FINAL ATTEMPT. PREVIOUS ATTEMPTS FAILED TO SHOW REQUIRED FEATURES.');
      sections.push('REJECT IMAGE IF THESE REQUIREMENTS NOT MET:');
    }

    missingTraits.forEach(trait => {
      sections.push(`\n${trait.label.toUpperCase()} - CRITICAL:`);
      
      trait.mandatoryVisualRequirements.forEach(req => {
        if (attempt >= 2) {
          // Intensify language for retries
          const intensified = req
            .replace('MUST', 'ABSOLUTELY MUST')
            .replace('REJECT', 'IMMEDIATELY REJECT');
          sections.push(`  !!! ${intensified}`);
        } else {
          sections.push(`  - ${req}`);
        }
      });

      // Add negative prompt on attempt 2+
      if (attempt >= 2 && trait.negativePrompt) {
        sections.push(`\n  ${trait.negativePrompt}`);
      }
    });

    if (attempt === 3) {
      sections.push('\n\nTHIS IS NON-NEGOTIABLE. MEDICAL ACCURACY AND DIGNITY BOTH REQUIRED.');
    }

    return sections.join('\n');
  }
}
