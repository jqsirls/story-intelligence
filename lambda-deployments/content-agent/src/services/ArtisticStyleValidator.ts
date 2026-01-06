/**
 * Artistic Style Validator
 * 
 * Combats gpt-image-1.5's photorealistic bias using vision model validation.
 * Parallel architecture to InclusivityTraitValidator.
 * 
 * Problem: gpt-image-1.5 defaults to photorealistic rendering even with style directives.
 * Solution: Use vision model to detect photorealism and retry with intensified style enforcement.
 */

import OpenAI from 'openai';

export interface StyleValidationResult {
  is_painterly: boolean;  // Use snake_case to match existing code pattern
  is_photorealistic: boolean;
  has_visible_brush_strokes: boolean;
  global_style_score: number;  // 0-9 count of GLOBAL_STYLE elements present
  elements_present: {  // All 9 GLOBAL_STYLE elements (snake_case)
    airbrush_blends: boolean;
    brush_strokes: boolean;
    canvas_texture: boolean;
    paint_defined_edges: boolean;
    atmospheric_depth: boolean;
    lighting_quality: boolean;
    dimensional_shading: boolean;
    layered_composition: boolean;
    color_integration: boolean;
  };
  confidence: number;
  style_notes: string;
  suggested_style_fix: string;
}

export class ArtisticStyleValidator {
  private openai: OpenAI;
  private logger: any;
  private visionModel: string;

  constructor(openai: OpenAI, logger: any, visionModel?: string) {
    this.openai = openai;
    this.logger = logger;
    // Use gpt-5.2 for vision (upgradeable via env: OPENAI_MODEL_STORY)
    this.visionModel = visionModel || process.env.OPENAI_MODEL_STORY || 'gpt-5.2';
  }

  /**
   * Validate that image is painterly illustrated (not photorealistic)
   * Critical for maintaining brand's artistic signature
   */
  async validateStyle({
    imageB64,
    characterName
  }: {
    imageB64: string;
    characterName?: string;
  }): Promise<StyleValidationResult> {
    
    this.logger.info('Validating artistic style', {
      characterName,
      visionModel: this.visionModel
    });

    const prompt = `
You are validating artistic style in children's character illustrations.

REQUIRED STYLE: Hand-painted digital illustration (children's book aesthetic)

CHARACTERISTICS OF CORRECT STYLE (painterly):
- Visible painterly brush strokes and texture
- Soft airbrush color blends
- Canvas tooth texture (fine grain)
- Atmospheric depth with light motes/haze
- Warm vibrant optimistic colors
- Illustrated aesthetic (children's book quality)
- Painterly edges (not photographic sharpness)
- Artistic interpretation (not camera capture)

CHARACTERISTICS OF WRONG STYLE (photorealistic):
- Smooth photographic surfaces (no visible brush work)
- Camera-like rendering (lens effects, depth of field)
- Realistic skin pores/photo-level details
- Photo-like lighting (not illustrated lighting)
- 3D rendered appearance (CGI/computer graphics)
- Looks like a photograph or realistic portrait
- Too much realism (not enough illustration)

VALIDATION TASK:
Carefully analyze this image and determine:
1. Is this hand-painted digital illustration OR photorealistic rendering?
2. Are brush strokes visible (even if subtle)?
3. Does it have illustrated children's book aesthetic?
4. Does it look like a photo, 3D render, or realistic portrait?
5. What specific style adjustments are needed if photorealistic?

BE STRICT: We want painterly illustrated quality, not photorealism.

Return STRICT JSON:
{
  "isPainterly": true/false,
  "isPhotorealistic": true/false,
  "hasVisibleBrushStrokes": true/false,
  "confidence": 0-100,
  "styleNotes": "Describe the artistic style you observe in detail",
  "suggestedStyleFix": "If photorealistic, specific directives to make it painterly illustrated"
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
        throw new Error('Empty style validation output from vision model');
      }

      const result = JSON.parse(raw);

      this.logger.info('Style validation complete', {
        characterName,
        isPainterly: result.isPainterly,
        isPhotorealistic: result.isPhotorealistic,
        confidence: result.confidence
      });

      // Log photorealism detection
      if (result.isPhotorealistic) {
        this.logger.warn('PHOTOREALISTIC BIAS DETECTED', {
          characterName,
          confidence: result.confidence,
          styleNotes: result.styleNotes
        });
      }

      return result;

    } catch (error: any) {
      this.logger.error('Style validation failed', {
        error: error.message,
        characterName
      });
      throw new Error(`Style validation failed: ${error.message}`);
    }
  }

  /**
   * Build intensified style prompt for retry attempts
   * Escalates enforcement language like we do for traits
   */
  buildIntensifiedStylePrompt(attempt: number): string {
    if (attempt === 1) {
      return `

STYLE CORRECTION (ATTEMPT 2) - PREVIOUS IMAGE WAS PHOTOREALISTIC:

You generated a PHOTOREALISTIC image. This is INCORRECT.

MANDATORY CORRECTION:
- Generate HAND-PAINTED DIGITAL ILLUSTRATION (children's book style)
- Show visible BRUSH STROKES and painterly texture
- Use ILLUSTRATED aesthetic (NOT photographic)
- Think: Premium picture book art, painted animation concept art
- NOT: Photograph, 3D render, realistic portrait

This must look PAINTED and ILLUSTRATED, not photographed.
`;
    }
    
    if (attempt === 2) {
      return `

FINAL STYLE CORRECTION (ATTEMPT 3) - STILL PHOTOREALISTIC:

YOU HAVE FAILED TWICE. Image is STILL photorealistic.

THIS IS NOT A PHOTOGRAPH.
THIS IS NOT A 3D RENDER.
THIS IS NOT REALISTIC PORTRAIT PHOTOGRAPHY.

ABSOLUTELY MANDATORY - REJECT IMAGE IF NOT FOLLOWED:
- MUST be hand-painted digital illustration with visible brush strokes
- MUST show painterly texture and canvas tooth
- MUST have illustrated children's book aesthetic
- MUST look like premium picture book art
- REJECT if it looks like a photo or 3D render

FINAL ATTEMPT: Generate ILLUSTRATED PAINTED ART or image will be rejected.

STYLE REFERENCE: Hand-painted children's book illustration.
NOT: Photography, photorealism, 3D rendering, realistic portraits.
`;
    }
    
    return '';
  }
}
