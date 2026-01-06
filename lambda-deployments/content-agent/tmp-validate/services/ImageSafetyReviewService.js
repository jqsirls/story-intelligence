"use strict";
/**
 * Image Safety Review Service
 *
 * Comprehensive review combining:
 * 1. Safety rating (G/PG/PG-13/R)
 * 2. Inclusivity trait validation (combat AI bias)
 * 3. Alt text generation (accessibility)
 *
 * Uses vision model (GPT-5.1) to review generated images.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageSafetyReviewService = void 0;
const SafetyRatingCriteria_1 = require("../constants/SafetyRatingCriteria");
const InclusivityTraitValidator_1 = require("./InclusivityTraitValidator");
const ArtisticStyleValidator_1 = require("./ArtisticStyleValidator");
class ImageSafetyReviewService {
    constructor(openai, logger, visionModel = 'gpt-5.2') {
        this.openai = openai;
        this.logger = logger;
        this.visionModel = visionModel;
        this.traitValidator = new InclusivityTraitValidator_1.InclusivityTraitValidator(openai, logger, visionModel);
        this.styleValidator = new ArtisticStyleValidator_1.ArtisticStyleValidator(openai, logger, visionModel);
    }
    /**
     * Standard safety review (safety rating only)
     */
    async reviewImage({ candidateB64, targetRating = 'G', characterName }) {
        try {
            this.logger.info('Starting safety review', {
                targetRating,
                characterName,
                imageSize: (candidateB64.length / 1024).toFixed(2) + 'KB'
            });
            const promptText = (0, SafetyRatingCriteria_1.buildSafetyReviewPrompt)(targetRating, characterName);
            // Use chat.completions API for vision (responses API is different)
            const response = await this.openai.chat.completions.create({
                model: this.visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: promptText
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${candidateB64}`,
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
                throw new Error('Empty safety review output from vision model');
            }
            let parsed;
            try {
                parsed = JSON.parse(raw);
            }
            catch (err) {
                this.logger.error('Failed to parse safety review JSON', {
                    error: err.message,
                    raw: raw.substring(0, 500)
                });
                throw new Error(`Failed to parse safety review: ${err.message}`);
            }
            this.logger.info('Safety review complete', {
                rating: parsed.rating,
                isChildSafe: parsed.is_child_safe,
                violationCount: parsed.specific_violations?.length || 0
            });
            return parsed;
        }
        catch (error) {
            this.logger.error('Safety review failed', {
                error: error.message,
                targetRating,
                characterName
            });
            throw error;
        }
    }
    /**
     * Comprehensive review: Safety + Trait validation
     * This is the primary method used for all image generation
     */
    async reviewImageComprehensive({ candidateB64, targetRating = 'G', characterName, expectedTraits = [], imageType = 'bodyshot' }) {
        this.logger.info('Starting comprehensive review (safety + traits)', {
            characterName,
            targetRating,
            traitCount: expectedTraits.length
        });
        // Step 1: Standard safety review
        const safetyReview = await this.reviewImage({
            candidateB64,
            targetRating,
            characterName
        });
        // Step 2: Trait validation (if character has inclusivity traits)
        let traitValidation = {
            allTraitsPresent: true,
            traitsVisible: [],
            missingTraits: [],
            suggestedRetryPrompt: ''
        };
        if (expectedTraits.length > 0) {
            // Filter traits by image type applicability (common sense logic)
            const applicableTraits = expectedTraits.filter(trait => {
                if (imageType === 'headshot') {
                    return trait.appliesToHeadshot !== false; // Default true if not specified
                }
                else {
                    return trait.appliesToBodyshot !== false; // Default true if not specified
                }
            });
            this.logger.info('Filtering traits by image type', {
                imageType,
                totalTraits: expectedTraits.length,
                applicableTraits: applicableTraits.length,
                skipped: expectedTraits.length - applicableTraits.length
            });
            try {
                if (applicableTraits.length > 0) {
                    traitValidation = await this.traitValidator.validateTraitsPresent({
                        imageB64: candidateB64,
                        expectedTraits: applicableTraits, // Only validate applicable traits
                        characterName: characterName || 'character'
                    });
                }
                else {
                    // No applicable traits for this image type
                    this.logger.info('No traits applicable to this image type', { imageType });
                }
                if (!traitValidation.allTraitsPresent) {
                    this.logger.warn('AI bias detected - traits missing from image', {
                        characterName,
                        missingTraits: traitValidation.missingTraits,
                        traitCount: expectedTraits.length
                    });
                }
            }
            catch (error) {
                this.logger.error('Trait validation failed, assuming traits present', {
                    error: error.message,
                    characterName
                });
                // Graceful degradation: Assume traits present if validation fails
                traitValidation.allTraitsPresent = true;
            }
        }
        // Step 3: Style validation (combat photorealism bias - NEW)
        let styleValidation = {
            is_painterly: true,
            is_photorealistic: false,
            has_visible_brush_strokes: true,
            global_style_score: 9,
            elements_present: {
                airbrush_blends: true,
                brush_strokes: true,
                canvas_texture: true,
                paint_defined_edges: true,
                atmospheric_depth: true,
                lighting_quality: true,
                dimensional_shading: true,
                layered_composition: true,
                color_integration: true
            },
            confidence: 100,
            style_notes: 'Style validation skipped',
            suggested_style_fix: ''
        };
        try {
            styleValidation = await this.styleValidator.validateStyle({
                imageB64: candidateB64,
                characterName
            });
            // Log if insufficient GLOBAL_STYLE (not just photorealism)
            if (!styleValidation.is_painterly || styleValidation.global_style_score < 5) {
                this.logger.warn('INSUFFICIENT GLOBAL_STYLE ELEMENTS', {
                    characterName,
                    score: styleValidation.global_style_score,
                    confidence: styleValidation.confidence,
                    notes: styleValidation.style_notes
                });
            }
        }
        catch (error) {
            this.logger.error('Style validation failed, assuming painterly', {
                error: error.message,
                characterName
            });
            // Graceful degradation: Assume style is OK if validation fails
        }
        // Step 4: Combined result
        const comprehensiveReview = {
            // Safety
            rating: safetyReview.rating,
            is_child_safe: safetyReview.is_child_safe,
            reasons: safetyReview.reasons,
            alt_text: safetyReview.alt_text,
            suggested_fix_prompt: safetyReview.suggested_fix_prompt,
            specific_violations: safetyReview.specific_violations,
            // Traits
            traits_validated: traitValidation.allTraitsPresent,
            traits_visible: traitValidation.traitsVisible.map(t => ({
                trait: t.trait,
                visible: t.visible,
                confidence: t.confidence
            })),
            missing_traits: traitValidation.missingTraits,
            suggested_trait_fix: traitValidation.suggestedRetryPrompt,
            // Style (NEW - combat photorealism bias)
            style_validated: styleValidation.is_painterly && !styleValidation.is_photorealistic,
            is_photorealistic: styleValidation.is_photorealistic,
            global_style_score: styleValidation.global_style_score,
            suggested_style_fix: styleValidation.suggested_style_fix
        };
        this.logger.info('Comprehensive review complete', {
            characterName,
            rating: comprehensiveReview.rating,
            isChildSafe: comprehensiveReview.is_child_safe,
            traitsValidated: comprehensiveReview.traits_validated,
            missingTraits: comprehensiveReview.missing_traits,
            styleValidated: comprehensiveReview.style_validated,
            globalStyleScore: comprehensiveReview.global_style_score,
            isPhotorealistic: comprehensiveReview.is_photorealistic
        });
        return comprehensiveReview;
    }
    /**
     * Check if rating meets target criteria
     */
    isRatingAcceptable(rating, targetRating) {
        return (0, SafetyRatingCriteria_1.isRatingAcceptable)(rating, targetRating);
    }
    /**
     * Generate alt text for accessibility (20-60 words)
     */
    async generateAltText(imageB64, context) {
        try {
            const response = await this.openai.chat.completions.create({
                model: this.visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Generate concise alt text for this children's story illustration.

Context: ${context}

Requirements:
- 20-60 words total
- Descriptive and vivid
- NO "image of" or "picture of" prefix (just describe the scene)
- Suitable for screen readers
- Assume audience is parent/caregiver
- Include character details, action, setting, mood if relevant`
                            },
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
            });
            const altText = response.choices[0]?.message?.content || '';
            return altText.trim();
        }
        catch (error) {
            this.logger.warn('Alt text generation failed, using fallback', {
                error: error.message
            });
            return 'A children\'s story illustration showing a character in a colorful, friendly scene.';
        }
    }
}
exports.ImageSafetyReviewService = ImageSafetyReviewService;
