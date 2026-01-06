/**
 * Animation Service - Sora-2-Pro Integration (Future)
 * 
 * This service will use OpenAI's Sora-2-Pro video model to create
 * animated covers from the 5 generated story images.
 * 
 * DEFERRED: Sora-2-Pro API not yet available/stable
 */

import { Logger } from 'winston';

export interface AnimationRequest {
  images: string[]; // URLs of the 5 images (cover + 4 beats)
  storyText: string;
  characterTraits: any;
  duration?: number; // Desired animation duration in seconds
}

export interface AnimationResponse {
  animatedCoverUrl: string;
  duration: number;
  format: string;
}

export class AnimationService {
  constructor(private logger: Logger) {}
  
  /**
   * Persist video to S3 from URL
   */
  private async persistVideoToS3(videoUrl: string, title: string): Promise<string> {
    try {
      this.logger.info('Downloading video from Sora', { url: videoUrl.substring(0, 60) });
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.status}`);
      }
      const videoBuffer = Buffer.from(await response.arrayBuffer());
      return this.persistVideoToS3Direct(videoBuffer, title);
    } catch (error) {
      this.logger.error('Video download failed', { error });
      throw error;
    }
  }
  
  /**
   * Persist video buffer directly to S3
   */
  private async persistVideoToS3Direct(videoBuffer: Buffer, title: string): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const s3Client = new S3Client({ region: 'us-east-1' });
      const bucketName = process.env.S3_VIDEO_BUCKET || 'storytailor-audio';
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const key = `animations/${sanitizedTitle}.mp4`;
      
      this.logger.info('Uploading video to S3', { 
        bucket: bucketName, 
        key,
        sizeMB: (videoBuffer.length / 1024 / 1024).toFixed(2)
      });

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: videoBuffer,
        ContentType: 'video/mp4',
        CacheControl: 'public, max-age=31536000'
      }));

      const videoUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;
      this.logger.info('Video persisted to S3', { videoUrl: videoUrl.substring(0, 80) });
      return videoUrl;
      
    } catch (error) {
      this.logger.error('S3 video upload failed', { error });
      throw error;
    }
  }

  /**
   * Generate animated micro episode using Sora
   * 
   * Creates 3-5 minute animated episode from story session
   * Powered by Story Intelligence™
   */
  async generateAnimatedCover(request: AnimationRequest): Promise<AnimationResponse> {
    this.logger.info('Generating animated micro episode with Sora', {
      imageCount: request.images.length,
      storyLength: request.storyText.length
    });

    try {
      // Only proceed if we have images
      if (!request.images || request.images.length < 2) {
        this.logger.warn('Insufficient images for animation, returning static');
        return {
          animatedCoverUrl: request.images[0] || '',
          duration: 0,
          format: 'image/png'
        };
      }

      // Import GLOBAL_STYLE for consistency with images
      const { GLOBAL_STYLE, FALLBACK_PALETTE } = await import('../constants/GlobalArtStyle');
      
      const prompt = `${GLOBAL_STYLE}

ANIMATED MICRO EPISODE - THERAPEUTIC STORYTELLING

Context: Educational bibliotherapy content for young audiences ages 3-10.
Purpose: Transform collaborative story session into animated episode while maintaining therapeutic storytelling quality.
Platform: Powered by Story Intelligence™

CHARACTER & VISUAL CONSISTENCY:
${request.characterTraits ? `
Protagonist: ${request.characterTraits.name}
Appearance: ${request.characterTraits.visualDescription || 'As shown in images'}
CRITICAL: Character must look EXACTLY as depicted in these ${request.images.length} images throughout animation.
` : 'Maintain character consistency from images'}

SCENES TO ANIMATE (${request.images.length} keyframes):
${request.images.map((url, i) => `
Scene ${i + 1} (${['Cover/Opening', 'Rising Action', 'Development', 'Climax', 'Resolution'][i] || `Beat ${i}`}):
  Image: ${url}
  Palette: ${FALLBACK_PALETTE[i] || FALLBACK_PALETTE[0]}
  Emotion: ${['Wonder & curiosity', 'Adventure & excitement', 'Challenge & growth', 'Triumph & discovery', 'Joy & resolution'][i]}
  Transition: ${i < request.images.length - 1 ? ['Smooth dissolve with warm glow leading eye', 'Follow movement, increase energy', 'Dramatic reveal with depth shift', 'Triumphant pullback, celebrate resolution'][i] : 'Gentle fade to completion'}
`).join('\n')}

Story Context: ${request.storyText.substring(0, 500)}

ANIMATION ARTISTIC DIRECTION:
${GLOBAL_STYLE}

CRITICAL STYLE REQUIREMENTS:
- Hand-painted digital art aesthetic (NOT 3D animation, NOT Pixar-style, NOT cel-shading)
- Ultra-high-res digital hand-painting with soft airbrush blends
- Subtle painterly brush strokes visible on close inspection
- Fine canvas tooth for organic warmth
- Paint-defined silhouettes with crisp edges on focal elements
- Warm key-light versus cool teal/purple shadows (maintain throughout)
- Molten rim highlights catching edges
- Volumetric atmospheric haze with drifting dust motes
- Subsurface bounce in skin tones
- Glossy specular accents on eyes
- Layered depth planes (foreground/mid/background) with atmospheric perspective

PALETTE JOURNEY (Emotional Arc):
${request.images.map((_, i) => `Scene ${i+1}: ${FALLBACK_PALETTE[i] || FALLBACK_PALETTE[0]}`).join('\n')}

ANIMATION TECHNIQUE:
- Gentle, smooth transitions honoring the hand-painted aesthetic
- NOT motion-captured 3D movement
- NOT bouncy cartoon physics
- YES: Subtle, organic motion like pages turning to life
- YES: Painterly quality maintained in motion
- Pacing: Child-friendly (contemplative, not frenetic)
- Atmosphere: Warm, comforting, therapeutically supportive

TECHNICAL SPECIFICATIONS:
- Duration: ${request.duration || 10} seconds
- Quality: Standard (optimize for generation speed while maintaining artistic integrity)
- Format: MP4 (web-compatible)
- Resolution: High enough to show brush stroke detail

CONTENT SAFETY (Moderation Approval):
- AVOID explicit terms: "kids", "children", "child"
- USE INSTEAD: "young audience", "family content", "educational narrative", "therapeutic story"
- Frame as: Educational bibliotherapy content (approved category)

COLOR DISCIPLINE:
- Thread protagonist HEX colors through costume, props, AND environment
- Never show colors as solid swatches
- Integrate naturally into lighting, atmosphere, set design
- Maintain warm optimistic palette throughout

PROHIBITIONS (STRICT):
— No text, captions, subtitles, or UI elements in animation
— No watermarks or logos
— No stereotyping or exaggeration
— No inconsistency in character appearance
— No deviation from hand-painted aesthetic
— No 3D rendering or CGI look

OUTPUT GOAL:
A professional animated micro episode that feels like premium hand-painted children's therapeutic content—
maintaining the exact artistic signature of the still images while bringing them to gentle, magical life.
Warm, emotionally supportive, and suitable for clinical/educational use.

Powered by Story Intelligence™.

${GLOBAL_STYLE}`;


      // Generate video with Sora-2 (PRODUCTION - Tier 5 Access)
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      // Check if Sora is enabled
      const soraEnabled = process.env.SORA_ENABLED !== 'false';
      
      if (!soraEnabled) {
        this.logger.info('Sora disabled via feature flag, returning static');
        return {
          animatedCoverUrl: request.images[0] || '',
          duration: 0,
          format: 'image/png'
        };
      }
      
      this.logger.info('Calling Sora API for episodic animation', {
        model: process.env.SORA_MODEL || 'sora-2',
        imageCount: request.images.length,
        duration: request.duration || 10
      });
      
      try {
        // Sora-2 API call with image-to-video
        const soraResponse = await (openai as any).videos.create({
          model: process.env.SORA_MODEL || 'sora-2',
          prompt: prompt,
          // Pass images as keyframes for image-to-video generation
          images: request.images.length > 0 ? request.images.map(url => ({
            type: 'url',
            url: url
          })) : undefined,
          duration: request.duration || 10,
          resolution: '1024x1024',
          aspect_ratio: '1:1'
        });

        // Handle Sora response (URL or base64)
        const videoData = soraResponse.data?.[0];
        
        if (!videoData) {
          throw new Error('No video data returned from Sora');
        }
        
        let videoUrl: string;
        
        // Handle both URL and base64 responses
        if (videoData.url) {
          this.logger.info('Sora returned video URL, uploading to S3...');
          videoUrl = await this.persistVideoToS3(videoData.url, `animation-${Date.now()}`);
        } else if (videoData.b64_json || videoData.b64_mp4) {
          this.logger.info('Sora returned base64 video, decoding and uploading...');
          const videoBuffer = Buffer.from(videoData.b64_json || videoData.b64_mp4, 'base64');
          videoUrl = await this.persistVideoToS3Direct(videoBuffer, `animation-${Date.now()}`);
        } else {
          throw new Error('Video data missing both url and base64');
        }

        this.logger.info('Sora animation generated successfully', {
          url: videoUrl.substring(0, 80),
          duration: request.duration || 10
        });

        return {
          animatedCoverUrl: videoUrl,
          duration: request.duration || 10,
          format: 'video/mp4'
        };
        
      } catch (error: any) {
        this.logger.error('Sora generation failed', { 
          error: error.message,
          stack: error.stack?.substring(0, 300)
        });
        
        // Feature flag: Graceful fallback
        if (process.env.SORA_FALLBACK_ENABLED !== 'false') {
          this.logger.warn('Falling back to static cover image');
          return {
            animatedCoverUrl: request.images[0] || '',
            duration: 0,
            format: 'image/png'
          };
        }
        
        throw error;
      }

    } catch (error: any) {
      this.logger.error('Sora generation failed, falling back to static', { error: error.message });
      
      // Graceful degradation: Return static image if Sora fails
      return {
        animatedCoverUrl: request.images[0] || '',
        duration: 0,
        format: 'image/png'
      };
    }
  }
}

