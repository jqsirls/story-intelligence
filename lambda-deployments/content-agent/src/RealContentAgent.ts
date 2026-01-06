/**
 * Real Content Agent - Full Production Implementation
 * 
 * Integrates:
 * - OpenAI GPT-5 for story generation
 * - ElevenLabs for TTS
 * - DALL-E for images
 * - Supabase for persistence
 */

import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import * as winston from 'winston';
import * as crypto from 'crypto';
import { getModelForUseCase, getVoiceSettingsForModel } from './config/ElevenLabsModelConfig';
import { MultiCharacterDialogueService } from './services/MultiCharacterDialogueService';
import { CharacterVoiceManager } from './services/CharacterVoiceManager';
import { SoundEffectsService } from './services/SoundEffectsService';
import { MusicCompositionService } from './services/MusicCompositionService';
import { VoiceDesignService } from './services/VoiceDesignService';
import { VoiceRemixingService } from './services/VoiceRemixingService';
import { CharacterVoiceGenerator } from './services/CharacterVoiceGenerator';
import { IPDetectionService, IPDetectionResult } from './services/IPDetectionService';
import { IPAuditService } from './services/IPAuditService';
import { ColorExtractionService } from './services/ColorExtractionService';
import { MODEL_CONFIG } from './config/models';

const DEFAULT_IMAGE_MODEL = 'gpt-image-1';

// ElevenLabs direct integration (bypassing voice-synthesis package to avoid bundling issues)
interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
}

export interface RealContentAgentConfig {
  openai: {
    apiKey: string;
    model?: string;
  };
  elevenlabs: {
    apiKey: string;
    defaultVoiceId?: string;
  };
  supabase: {
    url: string;
    anonKey: string; // Can be service key or anon key - service key bypasses RLS
  };
  s3?: {
    bucketName: string;
    region: string;
  };
  sms?: {
    enabled: boolean;
  };
  frontendUrl?: string;
}

export interface StoryGenerationRequest {
  userId: string;
  creatorUserId?: string;  // CRITICAL: Track creator for quota attribution (defaults to userId if not provided)
  characterName?: string;
  characterTraits?: {
    age?: number;
    species?: string;
    personality?: string[];
    disabilities?: string;
    ethnicity?: string;
    appearance?: string;
    hairColor?: string;
    eyeColor?: string;
  };
  storyType?: string;
  userAge?: number;
  sessionId: string;
  parentPhone?: string;
  childName?: string;
  useVoiceDesign?: boolean; // New field for voice design integration
  characterPersonalities?: Map<string, string>; // New field for character personalities
  storyId?: string; // CRITICAL: For REST API - existing story ID to update instead of creating new
  conversationPhase?: string; // For conversational flows
  beatNumber?: number; // For beat-specific generation
}

export type AssetState = 'pending' | 'ready' | 'failed'

export interface AssetsStatus {
  cover: AssetState
  beats: [AssetState, AssetState, AssetState, AssetState]
  audio: AssetState
}

export interface FinalizationJobPayload {
  storyId: string
  userId: string
  sessionId: string
  storyVersionHash: string
  requiredAssets: {
    cover: boolean
    beats: number
    audio: boolean
  }
}

export interface StoryGenerationResponse {
  success: boolean;
  story: {
    title: string;
    content: string;
    storyId: string;
  };
  coverImageUrl: string;
  beatImages?: Array<{
    beatNumber: number;
    imageUrl: string;
    description: string;
    timestamp: number;
  }>;
  audioUrl: string;
  assetsStatus: AssetsStatus;
  imageTimestamps?: any;
  webvttUrl?: string;
  dialogueAudioUrl?: string;
  soundEffects?: Array<{
    effect: string;
    url: string;
    timestamp: number;
    duration: number;
    volume: number;
  }>;
  backgroundMusic?: string;
  message: string;
  speechText: string;
}

export class RealContentAgent {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private elevenLabsConfig: ElevenLabsConfig | null = null;
  private logger: Logger;
  private isInitialized = false;
  private tempStoryCache: Map<string, any> = new Map(); // In-memory cache for temp stories
  private redis: any = null; // Redis client for persistent caching
  
  // New services for enhanced storytelling
  private multiCharacterDialogueService: MultiCharacterDialogueService;
  private characterVoiceManager: CharacterVoiceManager;
  private soundEffectsService: SoundEffectsService;
  private musicCompositionService: MusicCompositionService;
  private voiceDesignService: VoiceDesignService;
  private voiceRemixingService: VoiceRemixingService;
  private characterVoiceGenerator: CharacterVoiceGenerator;
  private ipDetectionService: IPDetectionService;
  private ipAuditService: IPAuditService | null = null;
  private colorExtractionService: ColorExtractionService;
  private contextualAnalyzer: any = null; // ContextualSafetyAnalyzer - lazy loaded

  constructor(private config: RealContentAgentConfig) {
    // Initialize logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });

    // Initialize Supabase
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );

    // Initialize new services
    // Pass ElevenLabs API key from config to services that need it
    const elevenLabsKey = config.elevenlabs.apiKey && config.elevenlabs.apiKey !== 'placeholder' 
      ? config.elevenlabs.apiKey 
      : undefined;
    
    const loggerAny = this.logger as any;
    const elevenAny = elevenLabsKey as any;
    this.multiCharacterDialogueService = new (MultiCharacterDialogueService as any)(loggerAny, elevenAny);
    this.characterVoiceManager = new (CharacterVoiceManager as any)(loggerAny);
    this.soundEffectsService = new (SoundEffectsService as any)(loggerAny, elevenAny);
    this.musicCompositionService = new (MusicCompositionService as any)(loggerAny, elevenAny);
    this.voiceDesignService = new (VoiceDesignService as any)(loggerAny, elevenAny);
    this.voiceRemixingService = new (VoiceRemixingService as any)(loggerAny, elevenAny);
    this.characterVoiceGenerator = new (CharacterVoiceGenerator as any)(loggerAny, elevenAny);
    
    // Initialize color extraction service (for HUE integration)
    this.colorExtractionService = new ColorExtractionService(this.logger);
    
    // Initialize IP detection service (Redis will be set in initialize() if available)
    this.ipDetectionService = new IPDetectionService();
    
    // Initialize IP audit service if Supabase is configured
    if (this.config.supabase.url && this.config.supabase.anonKey) {
      this.ipAuditService = new IPAuditService(this.config.supabase.url, this.config.supabase.anonKey);
    }

    this.logger.info('RealContentAgent constructed');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up ElevenLabs config if available
      if (this.config.elevenlabs.apiKey && this.config.elevenlabs.apiKey !== 'placeholder') {
        this.elevenLabsConfig = {
          apiKey: this.config.elevenlabs.apiKey,
          voiceId: this.config.elevenlabs.defaultVoiceId || 'EXAVITQu4vr4xnSDxMaL'
        };
        this.logger.info('ElevenLabs configured for audio generation');
      } else {
        this.logger.warn('ElevenLabs API key not configured, audio will use fallback');
      }

      // Initialize Redis for IP detection caching if available
      // Note: Redis initialization would happen here if we have Redis URL
      // For now, IP detection will work without caching
      if (this.redis) {
        // Re-initialize IP detection service with Redis
        this.ipDetectionService = new IPDetectionService({
          redis: this.redis,
          enableCache: true,
          cacheTTL: 86400, // 24 hours
        });
        this.logger.info('IP detection caching enabled with Redis');
      }

      this.isInitialized = true;
      this.logger.info('RealContentAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RealContentAgent', { error });
      throw error;
    }
  }

  /**
   * Convert a full story text into a deterministic 4-beat array for downstream asset jobs.
   *
   * Why this exists:
   * - `generate_asset` (audio + PDF) expects `story.content.beats[]`.
   * - Our story generator currently stores `story.content.text` (full text) + `keyBeats` (summaries).
   * - We must persist something stable so audio/PDF don't fail with "beats array missing".
   *
   * This segmentation is simple but deterministic:
   * - Split on paragraph breaks
   * - Distribute paragraphs across 4 beats in order
   */
  private buildBeatsArrayFromStoryText(storyText: string): Array<{ id: string; content: string }> {
    const text = typeof storyText === 'string' ? storyText.trim() : ''
    if (!text) {
      return [
        { id: 'beat-1', content: '' },
        { id: 'beat-2', content: '' },
        { id: 'beat-3', content: '' },
        { id: 'beat-4', content: '' },
      ]
    }

    const paragraphs = text
      .split(/\n\s*\n/g)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    // If we don't have paragraphs, treat the whole thing as beat 1.
    if (paragraphs.length === 0) {
      return [
        { id: 'beat-1', content: text },
        { id: 'beat-2', content: '' },
        { id: 'beat-3', content: '' },
        { id: 'beat-4', content: '' },
      ]
    }

    const buckets: string[][] = [[], [], [], []]
    // Distribute sequential paragraphs across 4 beats (keeps order, deterministic).
    for (let i = 0; i < paragraphs.length; i++) {
      const bucketIdx = Math.min(3, Math.floor((i * 4) / Math.max(1, paragraphs.length)))
      buckets[bucketIdx].push(paragraphs[i])
    }

    // Ensure no beat is empty by borrowing from neighbors if needed.
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].length === 0) {
        // borrow from the next non-empty bucket, else from previous
        const nextIdx = buckets.findIndex((b, idx) => idx > i && b.length > 0)
        if (nextIdx !== -1) {
          buckets[i].push(buckets[nextIdx].shift() as string)
        } else {
          const prevIdx = [...buckets].reverse().findIndex((b, revIdx) => (3 - revIdx) < i && b.length > 0)
          if (prevIdx !== -1) {
            const realPrevIdx = 3 - prevIdx
            buckets[i].push(buckets[realPrevIdx].pop() as string)
          }
        }
      }
    }

    return [
      { id: 'beat-1', content: buckets[0].join('\n\n') },
      { id: 'beat-2', content: buckets[1].join('\n\n') },
      { id: 'beat-3', content: buckets[2].join('\n\n') },
      { id: 'beat-4', content: buckets[3].join('\n\n') },
    ]
  }

  /**
   * Generate story based on conversation phase (progressive generation)
   */
  async generateStory(request: StoryGenerationRequest & { conversationPhase?: string; storyId?: string; beatNumber?: number }): Promise<StoryGenerationResponse> {
    await this.initialize();

    const phase = request.conversationPhase || 'story_planning';
    
    this.logger.info('Generating story content', {
      userId: request.userId,
      phase,
      requestedPhase: request.conversationPhase,
      hasStoryId: !!request.storyId,
      storyId: request.storyId,
      characterName: request.characterName
    });

    try {
      // PHASE 1: Story Planning - Generate story text ONLY (no long-form assets)
      if (phase === 'story_planning' || phase === 'greeting') {
        const story = await this.generateStoryContent(request);
        // IMPORTANT (schema bridge): downstream audio + PDF jobs require `story.content.beats`.
        // Our story generator produces a single `story.content` string + 4 keyBeats.
        // We persist a deterministic 4-beat segmentation to avoid asset-job failures.
        const beats = this.buildBeatsArrayFromStoryText(story.content);
        const assetsStatus: AssetsStatus = {
          cover: 'pending',
          beats: ['pending', 'pending', 'pending', 'pending'],
          audio: 'pending',
        }

        const storyVersionHash = this.computeStoryVersionHash({
          title: story.title,
          content: story.content,
          keyBeats: story.keyBeats,
          characterName: request.characterName || '',
          characterTraits: request.characterTraits || {},
          storyType: request.storyType || '',
          userAge: request.userAge || 7,
        })
        const assetHashes = this.computeAssetHashes({
          title: story.title,
          content: story.content,
          keyBeats: story.keyBeats,
          characterName: request.characterName || '',
          storyType: request.storyType || '',
        })

        // Detect IP in story content
        const characterNames = this.extractCharacterNames(story.content);
        const ipAttributions = await this.ipDetectionService.detectIP(story.content, characterNames);
        
        // Log detection to audit trail
        if (this.ipAuditService && ipAttributions.length > 0) {
          try {
            // We'll log after story is saved (need storyId)
            // For now, we'll log it after saveStoryToDatabase
          } catch (error) {
            this.logger.error('Failed to log IP detection to audit trail', { error });
          }
        }
        
        // Format IP attributions for storage
        const ipAttributionsFormatted = ipAttributions.map(attr => ({
          character: attr.character,
          franchise: attr.franchise,
          owner: attr.owner,
          confidence: attr.confidence,
          detectedAt: new Date().toISOString(),
          attributionText: attr.attributionText,
          personalUseMessage: attr.personalUseMessage,
          ownershipDisclaimer: attr.ownershipDisclaimer,
        }));

        // Save story structure (no images yet). If storyId is provided, update existing record.
        // If persistence is unavailable, keep an in-memory temp story.
        let storyId: string
        try {
          // If storyId is provided (REST API flow), update existing record instead of creating new one
          if (request.storyId && request.storyId.startsWith('temp_') === false) {
            // Update existing story record
            const { error: updateError } = await this.supabase
              .from('stories')
              .update({
                title: story.title,
                content: {
                  text: story.content,
                  beats,
                  metadata: {
                    characterName: request.characterName,
                    characterTraits: request.characterTraits || {},
                    storyType: request.storyType,
                    userAge: request.userAge,
                    keyBeats: story.keyBeats,
                    phase: 'awaiting_cover_confirmation',
                    assetsStatus,
                    storyVersionHash,
                    assetHashes,
                    ipAttributions: ipAttributionsFormatted.length > 0 ? ipAttributionsFormatted : undefined
                  },
                  coverImageUrl: '',
                  audioUrl: '',
                  beatImages: []
                },
                status: 'generating', // Keep as generating until all assets ready
                asset_generation_status: {
                  overall: 'generating',
                  assets: {
                    content: { status: 'ready', progress: 100 },
                    cover: { status: 'generating', progress: 0 },
                    beats: { status: 'generating', progress: 0 },
                    audio: { status: 'pending', progress: 0 }
                  }
                }
              })
              .eq('id', request.storyId);
            
            if (updateError) {
              this.logger.error('Failed to update story record', { storyId: request.storyId, error: updateError });
              throw updateError;
            }
            
            storyId = request.storyId;
            this.logger.info('Updated existing story record', { storyId });
          } else {
            // Create new story record (fallback for conversational flows)
            const savedStory = await this.saveStoryToDatabase({
              userId: request.userId,
              creatorUserId: request.creatorUserId || request.userId,  // CRITICAL: Track creator for quota attribution
              sessionId: request.sessionId,
              title: story.title,
              content: story.content,
              coverImageUrl: '',
              audioUrl: '',
              metadata: {
                characterName: request.characterName,
                characterTraits: request.characterTraits || {},
                storyType: request.storyType,
                userAge: request.userAge,
                keyBeats: story.keyBeats,
                phase: 'awaiting_cover_confirmation',
                assetsStatus,
                storyVersionHash,
                assetHashes,
                ipAttributions: ipAttributionsFormatted.length > 0 ? ipAttributionsFormatted : undefined
              },
              status: 'draft',
              finalizedAt: null,
            })
            storyId = savedStory.id;
          }
        } catch (error) {
          storyId = `temp_${crypto.randomUUID()}`
          this.tempStoryCache.set(storyId, {
            storyId,
            title: story.title,
            content: story.content,
            beats,
            audioUrl: '',
            coverImageUrl: '',
            beatImages: [],
            keyBeats: story.keyBeats,
            characterName: request.characterName || '',
            assetsStatus,
          })
          setTimeout(() => this.tempStoryCache.delete(storyId), 3600000)
          this.logger.warn('Story persistence unavailable; using temp story cache', { storyId, error })
        }

        // Log IP detection to audit trail after story is saved
        if (this.ipAuditService && ipAttributions.length > 0) {
          try {
            await this.ipAuditService.logDetection({
              storyId,
              detectionMethod: 'automatic',
              detectedCharacters: ipAttributions,
              userId: request.userId,
              sessionId: request.sessionId,
            });
          } catch (error) {
            this.logger.error('Failed to log IP detection to audit trail', { error });
          }
        }

        this.logger.info('Story text generated (assets pending)', { storyId });

        // For REST API: Generate images immediately if generateAssets is true
        let coverImageUrl = '';
        let beatImages: Array<{ beatNumber: number; imageUrl: string; description: string; timestamp: number }> = [];
        let finalAssetsStatus = assetsStatus;

        // Check if we should generate assets immediately (REST API mode)
        // REST API calls use sessionId starting with 'rest_' (from RESTAPIGateway.ts)
        // Conversational flows use conversationPhase progression (story_planning -> cover_generation -> beat_confirmation)
        const requestWithAssets = request as any;
        const isRestApiCall = request.sessionId?.startsWith('rest_');
        const isConversationalFlow = request.conversationPhase && 
                                     request.conversationPhase !== 'story_planning' && 
                                     request.conversationPhase !== 'greeting';

        // Only generate images immediately for REST API calls, not conversational flows
        const shouldGenerateAssets = isRestApiCall && 
                                     requestWithAssets.generateAssets !== false && 
                                     !isConversationalFlow;
        
        if (shouldGenerateAssets) {
          try {
            this.logger.info('Generating story images immediately (REST API mode)', { storyId });
            
            // Get character for image generation
            const characterName = request.characterName || 'hero';
            const characterTraits = request.characterTraits || {};
            const characterId = requestWithAssets.characterId;

            // Generate all images (cover + beats)
            const images = await this.generateStoryImages(
              { title: story.title, keyBeats: story.keyBeats },
              characterName,
              characterTraits,
              characterId,
              'batch'
            );

            coverImageUrl = images.coverImageUrl;
            beatImages = images.beatImages;

            // Update story in database with image URLs
            // Ensure beats array has exactly 4 elements for type safety
            const beatStatuses: ['pending' | 'ready', 'pending' | 'ready', 'pending' | 'ready', 'pending' | 'ready'] = [
              beatImages.length > 0 ? 'ready' : 'pending',
              beatImages.length > 1 ? 'ready' : 'pending',
              beatImages.length > 2 ? 'ready' : 'pending',
              beatImages.length > 3 ? 'ready' : 'pending'
            ];

            await this.supabase
              .from('stories')
              .update({
                cover_art_url: coverImageUrl,
                scene_art_urls: beatImages.map(img => img.imageUrl),
                // NOTE: `stories.assets_status` does NOT exist in production schema.
                // Use schema-truth: `stories.asset_generation_status` (jsonb) + `cover_art_url` + `scene_art_urls`.
                asset_generation_status: {
                  overall: 'generating',
                  assets: {
                    content: { status: 'ready', progress: 100 },
                    cover: { status: coverImageUrl ? 'ready' : 'pending', progress: coverImageUrl ? 100 : 0, url: coverImageUrl || null },
                    scene_1: { status: beatImages[0]?.imageUrl ? 'ready' : 'pending', progress: beatImages[0]?.imageUrl ? 100 : 0, url: beatImages[0]?.imageUrl || null },
                    scene_2: { status: beatImages[1]?.imageUrl ? 'ready' : 'pending', progress: beatImages[1]?.imageUrl ? 100 : 0, url: beatImages[1]?.imageUrl || null },
                    scene_3: { status: beatImages[2]?.imageUrl ? 'ready' : 'pending', progress: beatImages[2]?.imageUrl ? 100 : 0, url: beatImages[2]?.imageUrl || null },
                    scene_4: { status: beatImages[3]?.imageUrl ? 'ready' : 'pending', progress: beatImages[3]?.imageUrl ? 100 : 0, url: beatImages[3]?.imageUrl || null },
                    activities: { status: 'pending', progress: 0 },
                    audio: { status: 'pending', progress: 0 },
                    pdf: { status: 'pending', progress: 0 }
                  }
                }
              })
              .eq('id', storyId);

            finalAssetsStatus = {
              cover: 'ready',
              beats: beatStatuses,
              audio: 'pending'
            };

            this.logger.info('Story images generated successfully', { 
              storyId, 
              coverUrl: coverImageUrl.substring(0, 60),
              beatCount: beatImages.length
            });
          } catch (imageError) {
            this.logger.error('Failed to generate story images', { 
              error: imageError instanceof Error ? imageError.message : String(imageError),
              storyId
            });
            // Continue with empty images - don't fail story creation
          }
        }

        return {
          success: true,
          story: {
            title: story.title,
            content: story.content,
            storyId
          },
          coverImageUrl,
          beatImages,
          audioUrl: '',
          assetsStatus: finalAssetsStatus,
          message: coverImageUrl 
            ? `I've created your story: "${story.title}" with illustrations!`
            : `I've created your story: "${story.title}"! Would you like me to create the cover illustration?`,
          speechText: this.formatStoryResponseWithAttribution(
            coverImageUrl
              ? `Here's your story: ${story.title}! ${story.summary}`
              : `Here's your story: ${story.title}! ${story.summary} Would you like me to create the illustrations?`,
            ipAttributions
          )
        };
      }

      // PHASE 2: Cover Generation - Child confirmed, create cover
      if (phase === 'cover_generation') {
        const story = await this.getStoredStory(request.storyId!);
        const coverImageUrl = await this.generateCoverOnly(
          story.title,
          request.characterName || 'hero',
          request.characterTraits || {}
        );

        // Update story with cover
        await this.updateStoryCover(request.storyId!, coverImageUrl);
        const updatedStory = await this.getStoredStory(request.storyId!)

        return {
          success: true,
          story: updatedStory,
          coverImageUrl,
          beatImages: [],
          audioUrl: updatedStory.audioUrl,
          assetsStatus: {
            cover: 'ready',
            beats: ['pending', 'pending', 'pending', 'pending'],
            audio: updatedStory.audioUrl ? 'ready' : 'pending',
          },
          message: 'Cover illustration created! Ready to begin the story?',
          speechText: 'Your cover is ready! Shall we start the adventure?'
        };
      }

      // PHASE 3: Beat Image Generation - Specific beat confirmed
      if (phase === 'beat_confirmed' && request.beatNumber) {
        const story = await this.getStoredStory(request.storyId!);
        const beatImageUrl = await this.generateBeatImageOnly(
          request.storyId!,
          request.beatNumber,
          story,
          request.characterTraits || {}
        );
        await this.updateStoryBeatImage(request.storyId!, request.beatNumber, beatImageUrl, story)
        const updatedStory = await this.getStoredStory(request.storyId!)

        return {
          success: true,
          story: updatedStory,
          coverImageUrl: updatedStory.coverImageUrl,
          beatImages: updatedStory.beatImages,
          audioUrl: updatedStory.audioUrl,
          assetsStatus: {
            cover: updatedStory.coverImageUrl ? 'ready' : 'pending',
            beats: [
              updatedStory.beatImages?.some((b: any) => b.beatNumber === 1) ? 'ready' : 'pending',
              updatedStory.beatImages?.some((b: any) => b.beatNumber === 2) ? 'ready' : 'pending',
              updatedStory.beatImages?.some((b: any) => b.beatNumber === 3) ? 'ready' : 'pending',
              updatedStory.beatImages?.some((b: any) => b.beatNumber === 4) ? 'ready' : 'pending',
            ],
            audio: updatedStory.audioUrl ? 'ready' : 'pending',
          },
          message: `Beat ${request.beatNumber} illustration ready!`,
          speechText: `Here's the illustration for this part of the story!`
        };
      }

      // PHASE 4: Finalize - mark story final + enqueue async asset finalization
      if (phase === 'finalize') {
        if (!request.storyId) {
          throw new Error('Missing storyId for finalization')
        }

        const { data: storyRow, error } = await this.supabase
          .from('stories')
          .select('id, title, content, status')
          .eq('id', request.storyId)
          .single()

        if (error || !storyRow) {
          throw new Error(`Story not found for finalization: ${request.storyId}`)
        }

        const contentObj = storyRow.content || {}
        const metadata = contentObj.metadata || {}
        const storyText = typeof contentObj.text === 'string' ? contentObj.text : ''
        const beatImagesAll = Array.isArray(contentObj.beatImages) ? contentObj.beatImages : []
        const coverImageUrlExisting = typeof contentObj.coverImageUrl === 'string' ? contentObj.coverImageUrl : ''
        const audioUrlExisting = typeof contentObj.audioUrl === 'string' ? contentObj.audioUrl : ''

        // Always recompute storyVersionHash and assetHashes from current story content so edits invalidate assets correctly.
        const recomputedStoryVersionHash = this.computeStoryVersionHash({
          title: storyRow.title || 'Untitled',
          content: storyText,
          keyBeats: metadata.keyBeats || [],
          characterName: metadata.characterName || request.characterName || '',
          characterTraits: metadata.characterTraits || {},
          storyType: metadata.storyType || request.storyType || '',
          userAge: metadata.userAge || request.userAge || 7,
        })

        const recomputedAssetHashes = this.computeAssetHashes({
          title: storyRow.title || 'Untitled',
          content: storyText,
          keyBeats: metadata.keyBeats || [],
          characterName: metadata.characterName || request.characterName || '',
          storyType: metadata.storyType || request.storyType || '',
        })

        // Use previous hashes (if any) to determine which existing assets can be kept.
        const priorAssetHashes = metadata.assetHashes && typeof metadata.assetHashes === 'object' ? metadata.assetHashes : null
        const priorCoverHash = typeof priorAssetHashes?.coverHash === 'string' ? priorAssetHashes.coverHash : null
        const priorAudioHash = typeof priorAssetHashes?.audioHash === 'string' ? priorAssetHashes.audioHash : null
        const priorBeatHashes =
          Array.isArray(priorAssetHashes?.beatHashes) && priorAssetHashes.beatHashes.length === 4
            ? priorAssetHashes.beatHashes
            : null

        const keepCover = !!coverImageUrlExisting && priorCoverHash === recomputedAssetHashes.coverHash
        const keepAudio = !!audioUrlExisting && priorAudioHash === recomputedAssetHashes.audioHash

        const nextBeatImages = beatImagesAll.filter((b: any) => {
          const bn = b?.beatNumber
          if (typeof bn !== 'number' || bn < 1 || bn > 4) return false
          if (!b?.imageUrl) return false
          if (!priorBeatHashes) return false
          return priorBeatHashes[bn - 1] === recomputedAssetHashes.beatHashes[bn - 1]
        })

        const coverImageUrl = keepCover ? coverImageUrlExisting : ''
        const audioUrl = keepAudio ? audioUrlExisting : ''
        const beatImages = nextBeatImages

        const artEnabled = process.env.ART_FINALIZATION_ENABLED !== 'false'
        const audioAsyncEnabled = process.env.AUDIO_ASYNC_ENABLED !== 'false'

        const assetsStatus: AssetsStatus = {
          cover: artEnabled ? (coverImageUrl ? 'ready' : 'pending') : 'ready',
          beats: artEnabled ? ([
            beatImages.some((b: any) => b?.beatNumber === 1 && b?.imageUrl) ? 'ready' : 'pending',
            beatImages.some((b: any) => b?.beatNumber === 2 && b?.imageUrl) ? 'ready' : 'pending',
            beatImages.some((b: any) => b?.beatNumber === 3 && b?.imageUrl) ? 'ready' : 'pending',
            beatImages.some((b: any) => b?.beatNumber === 4 && b?.imageUrl) ? 'ready' : 'pending',
          ]) : (['ready', 'ready', 'ready', 'ready'] as AssetsStatus['beats']),
          audio: audioAsyncEnabled ? (audioUrl ? 'ready' : 'pending') : 'ready',
        }

        const missingCover = artEnabled && assetsStatus.cover !== 'ready'
        const missingBeats = artEnabled && assetsStatus.beats.some(s => s !== 'ready')
        const missingAudio = audioAsyncEnabled && assetsStatus.audio !== 'ready'
        const needsEnqueue = missingCover || missingBeats || missingAudio

        const updatedContent = {
          ...contentObj,
          coverImageUrl,
          audioUrl,
          beatImages,
          metadata: {
            ...metadata,
            assetsStatus,
            storyVersionHash: recomputedStoryVersionHash,
            assetHashes: recomputedAssetHashes,
            phase: 'finalized',
          },
        }

        const finalizedAt = new Date().toISOString()
        const { error: updateError } = await this.supabase
          .from('stories')
          .update({ status: 'final', finalized_at: finalizedAt, content: updatedContent })
          .eq('id', request.storyId)

        if (updateError) {
          throw new Error(`Failed to mark story final: ${updateError.message}`)
        }

        if (needsEnqueue && process.env.ASSET_FINALIZATION_ENABLED === 'true') {
          const payload: FinalizationJobPayload = {
            storyId: request.storyId,
            userId: request.userId,
            sessionId: request.sessionId,
            storyVersionHash: recomputedStoryVersionHash,
            requiredAssets: {
              cover: artEnabled,
              beats: artEnabled ? 4 : 0,
              audio: audioAsyncEnabled,
            },
          }
          await this.enqueueFinalizationJob(payload)
        }

        return {
          success: true,
          story: {
            title: storyRow.title || 'Untitled',
            content: storyText,
            storyId: request.storyId,
          },
          coverImageUrl,
          beatImages,
          audioUrl,
          assetsStatus,
          message: 'All set! I’m saving your story now. I’ll finish the pictures and narration in the background.',
          speechText: 'All set! I’m saving your story now. I’ll finish the pictures and narration in the background.',
        }
      }

      // FALLBACK: Generate everything (legacy support)
      return await this.generateFullStory(request);

    } catch (error) {
      this.logger.error('Story generation failed', { error, request });
      throw error;
    }
  }

  /**
   * Generate only the cover image (called after story confirmation)
   * Uses sophisticated GLOBAL_STYLE for hand-painted digital art quality
   */
  private async generateCoverOnly(
    title: string,
    characterName: string,
    characterTraits: any
  ): Promise<string> {
    return this.generateImageWithRetry('cover', title, characterName, characterTraits);
  }

  /**
   * Unified image generation with comprehensive error handling and retry logic
   */
  private async generateImageWithRetry(
    type: 'cover' | 'beat',
    title: string,
    characterName: string,
    characterTraits: any,
    beatNumber?: number,
    story?: any,
    attempt: number = 1
  ): Promise<string> {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000; // 60 seconds (to accommodate 20-24s generation time + network)
    
    try {
    const { GLOBAL_STYLE, FALLBACK_PALETTE } = await import('./constants/GlobalArtStyle');
    const characterContext = await this.buildCharacterConsistencyContext(characterName, characterTraits);
    
      let prompt: string;
      
      if (type === 'cover') {
        prompt = `${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - COVER ART:
Title: "${title}"
Moment: Most visually kinetic, plot-shifting moment - protagonist mid-action at peak emotion
Action: ${characterName} in opening scene, establishing their world and the adventure beginning
Camera: Establishing shot, slight low angle (heroic introduction)
Depth: Layered foreground/mid/background planes with atmospheric falloff

PALETTE: ${FALLBACK_PALETTE[0]}
- Thread protagonist colors through environment (not just costume)
- Warm key-light versus cool teal/purple shadows
- Luminous golden rim highlights
- Volumetric haze with drifting dust motes

EMOTIONAL TONE: Wonder, curiosity, readiness for adventure
AGE APPROPRIATE: Suitable for young audiences ages 3-10
THERAPEUTIC QUALITY: Warm, encouraging, celebrating the character's uniqueness

CRITICAL VISUAL CONTINUITY:
- This establishes ${characterName}'s appearance for all subsequent images
- Exact character details must be clearly visible and memorable
- Professional therapeutic storytelling aesthetic
- Hand-painted digital art (NOT 3D, NOT Pixar style, NOT cel-shaded)

OUTPUT: Professional cover illustration celebrating diversity and emotional growth.`;
      } else {
        // Beat image prompt
        const beat = story.keyBeats?.[beatNumber! - 1];
        if (!beat) {
          throw new Error(`Beat ${beatNumber} not found in story`);
        }
        
        const previousImages = story.beatImages || [];
        prompt = `Continue the visual story for "${story.title}" - Beat ${beatNumber} of 4.

${characterContext}

Previous images: ${previousImages.length > 0 ? 'Cover and beats 1-' + previousImages.length : 'Cover only'}

THIS SCENE: ${beat.visualDescription || beat.description}
Emotional tone: ${beat.emotionalTone}
Character state: ${beat.characterState}

CRITICAL VISUAL CONTINUITY:
- ${story.characterName} must look EXACTLY the same as in previous images
- Same color palette, art direction
- Maintain all physical traits (wheelchair, skin tone, hair, clothing)
- Child-friendly warmth and professional quality

Visual moment: ${beat.description}`;
      }

      this.logger.info(`Generating ${type} image with ${DEFAULT_IMAGE_MODEL}`, { 
        attempt, 
        promptLength: prompt.length,
        beatNumber: beatNumber || 'N/A'
      });
      
      // Create the API call with timeout
      const imageGenerationPromise = this.openai.images.generate({
        model: DEFAULT_IMAGE_MODEL,
        prompt,
        size: '1024x1024',
        quality: 'high'  // gpt-image-1/gpt-image-1.5 supports: low, medium, high, auto
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${type} image timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
      });

      const response = await Promise.race([imageGenerationPromise, timeoutPromise]);

      // gpt-image-1 returns URL format
      const imageData = response.data?.[0];
      if (!imageData) {
        this.logger.error('OpenAI returned no image data', { 
          hasData: !!response.data, 
          dataLength: response.data?.length 
        });
        throw new Error('No image data in OpenAI response');
      }
      
      let imageBuffer: Buffer;
      
      // Handle URL format (gpt-image-1 primary response)
      if (imageData.url) {
        this.logger.info('Image returned as URL, downloading...', { url: imageData.url.substring(0, 60) });
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image from URL: ${imageResponse.status}`);
        }
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      } else if (imageData.b64_json) {
        // Base64 format (fallback) - decode directly
        this.logger.info('Image returned as base64, decoding...', { 
          sizeBytes: imageData.b64_json.length 
        });
        imageBuffer = Buffer.from(imageData.b64_json, 'base64');
      } else {
        this.logger.error('Image data has no URL or base64', { 
          keys: Object.keys(imageData),
          imageData: JSON.stringify(imageData).substring(0, 200)
        });
        throw new Error('Image data missing both url and b64_json fields');
      }

      this.logger.info('Image data ready for S3 upload', { 
        sizeKB: (imageBuffer.length / 1024).toFixed(2),
        sizeMB: (imageBuffer.length / 1024 / 1024).toFixed(2)
      });
      
      const s3Url = await this.persistImageToS3Direct(imageBuffer, `${type}-${Date.now()}`);
      this.logger.info(`${type} image persisted to S3 successfully`, { 
        s3Url: s3Url.substring(0, 60),
        attempt
      });
      
      return s3Url;
      
    } catch (error: any) {
      this.logger.error(`${type} image generation failed`, { 
        attempt,
        error: error.message,
        errorType: error.constructor?.name,
        status: error.status,
        code: error.code
      });
      
      // Classify error and determine retry strategy
      const errorStatus = error.status || error.response?.status;
      const errorMessage = error.message?.toLowerCase() || '';
      
      // Don't retry authentication errors
      if (
        errorStatus === 401 ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('incorrect api key')
      ) {
        this.logger.error('OpenAI authentication failed - check API key');
        return '';
      }
      
      // Don't retry invalid request errors (wrong parameters)
      if (errorStatus === 400 || errorMessage.includes('invalid')) {
        this.logger.error('Invalid OpenAI request - check parameters', {
          error: error.message
        });
        return '';
      }
      
      // Rate limit - wait and retry
      if (errorStatus === 429 || errorMessage.includes('rate limit')) {
        if (attempt < MAX_RETRIES) {
          const delay = 60000; // Wait 60 seconds for rate limits
          this.logger.warn(`Rate limited by OpenAI, waiting ${delay}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateImageWithRetry(type, title, characterName, characterTraits, beatNumber, story, attempt + 1);
        }
      }
      
      // Timeout or server error - retry with exponential backoff
      if (errorMessage.includes('timeout') || errorStatus >= 500) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
          this.logger.warn(`${type} image ${errorMessage.includes('timeout') ? 'timed out' : 'server error'}, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateImageWithRetry(type, title, characterName, characterTraits, beatNumber, story, attempt + 1);
        }
      }
      
      // Final fallback - graceful degradation
      this.logger.error(`${type} image generation failed after ${attempt} attempts - returning empty`, {
        finalError: error.message
      });
      return '';
    }
  }

  /**
   * Generate single beat image (called when beat is confirmed)
   */
  private async generateBeatImageOnly(
    storyId: string,
    beatNumber: number,
    story: any,
    characterTraits: any
  ): Promise<string> {
    return this.generateImageWithRetry('beat', story.title, story.characterName, characterTraits, beatNumber, story);
  }

  /**
   * LEGACY: Old beat image generation - keeping for reference but now using unified retry logic
   */
  private async generateBeatImageOnlyLegacy(
    storyId: string,
    beatNumber: number,
    story: any,
    characterTraits: any
  ): Promise<string> {
    const beat = story.keyBeats?.[beatNumber - 1];
    if (!beat) {
      throw new Error(`Beat ${beatNumber} not found in story`);
    }

    const characterContext = this.buildCharacterConsistencyContext(story.characterName, characterTraits);
    const previousImages = story.beatImages || [];

    const beatPrompt = `Continue the visual story for "${story.title}" - Beat ${beatNumber} of 4.

${characterContext}

Previous images: ${previousImages.length > 0 ? 'Cover and beats 1-' + previousImages.length : 'Cover only'}

THIS SCENE: ${beat.visualDescription || beat.description}
Emotional tone: ${beat.emotionalTone}
Character state: ${beat.characterState}

CRITICAL VISUAL CONTINUITY:
- ${story.characterName} must look EXACTLY the same as in previous images
- Same color palette, art direction
- Maintain all physical traits (wheelchair, skin tone, hair, clothing)
- Child-friendly warmth and professional quality

Visual moment: ${beat.description}`;

    this.logger.info(`Generating beat ${beatNumber} with ${DEFAULT_IMAGE_MODEL}`);
    
    // Add timeout handling for beat image generation
    const beatImagePromise = this.openai.images.generate({
      model: DEFAULT_IMAGE_MODEL,
      prompt: beatPrompt,
      size: '1024x1024',
      quality: 'high'  // gpt-image-1/gpt-image-1.5 supports: low, medium, high, auto
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Beat ${beatNumber} image generation timeout after 30 seconds`)), 30000);
    });

    const response = await Promise.race([beatImagePromise, timeoutPromise]);

    // Handle URL response from gpt-image-1 (same as cover)
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error(`No image data for beat ${beatNumber}`);
    }
    
    let imageBuffer: Buffer;
    if (imageData.url) {
      const imageResponse = await fetch(imageData.url);
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else if (imageData.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, 'base64');
    } else {
      throw new Error('Image data missing both url and b64_json');
    }

    const beatUrl = await this.persistImageToS3Direct(imageBuffer, `beat-${beatNumber}-${Date.now()}`);
    this.logger.info(`Beat ${beatNumber} generated`, { beatUrl: beatUrl.substring(0, 60) });
    return beatUrl;
  }

  /**
   * Legacy: Generate complete story with all 5 images at once
   */
  private async generateFullStory(request: StoryGenerationRequest): Promise<StoryGenerationResponse> {
    const story = await this.generateStoryContent(request);
    const images = await this.generateStoryImages(story, request.characterName || 'hero', request.characterTraits || {});
    const audioUrl = await this.generateAudioNarration(story.content);
    const imageTimestamps = this.generateImageTimestamps(story.content, images.beatImages);
    const assetsStatus: AssetsStatus = {
      cover: images.coverImageUrl ? 'ready' : 'failed',
      beats: [
        images.beatImages?.some(b => b.beatNumber === 1 && b.imageUrl) ? 'ready' : 'failed',
        images.beatImages?.some(b => b.beatNumber === 2 && b.imageUrl) ? 'ready' : 'failed',
        images.beatImages?.some(b => b.beatNumber === 3 && b.imageUrl) ? 'ready' : 'failed',
        images.beatImages?.some(b => b.beatNumber === 4 && b.imageUrl) ? 'ready' : 'failed',
      ],
      audio: audioUrl ? 'ready' : 'failed',
    }
    const storyVersionHash = this.computeStoryVersionHash({
      title: story.title,
      content: story.content,
      keyBeats: story.keyBeats,
      characterName: request.characterName || '',
      characterTraits: request.characterTraits || {},
      storyType: request.storyType || '',
      userAge: request.userAge || 7,
    })
    const assetHashes = this.computeAssetHashes({
      title: story.title,
      content: story.content,
      keyBeats: story.keyBeats,
      characterName: request.characterName || '',
      storyType: request.storyType || '',
    })

    // Detect IP in story content
    const characterNames = this.extractCharacterNames(story.content);
    const ipAttributions = await this.ipDetectionService.detectIP(story.content, characterNames);
    
    // Format IP attributions for storage
    const ipAttributionsFormatted = ipAttributions.map(attr => ({
      character: attr.character,
      franchise: attr.franchise,
      owner: attr.owner,
      confidence: attr.confidence,
      detectedAt: new Date().toISOString(),
      attributionText: attr.attributionText,
      personalUseMessage: attr.personalUseMessage,
      ownershipDisclaimer: attr.ownershipDisclaimer,
    }));

    // If storyId is provided (REST API flow), update existing record instead of creating new one
    let savedStory: { id: string };
    if (request.storyId && request.storyId.startsWith('temp_') === false) {
      // Update existing story record
      const { data: updatedStory, error: updateError } = await this.supabase
        .from('stories')
        .update({
          title: story.title,
          content: {
            text: story.content,
            metadata: {
              characterName: request.characterName,
              storyType: request.storyType,
              userAge: request.userAge,
              beatImages: images.beatImages,
              imageTimestamps,
              assetsStatus,
              storyVersionHash,
              assetHashes,
              ipAttributions: ipAttributionsFormatted.length > 0 ? ipAttributionsFormatted : undefined
            },
            coverImageUrl: images.coverImageUrl,
            audioUrl,
            beatImages: images.beatImages
          },
          status: 'ready', // Mark as ready when all assets complete
          cover_art_url: images.coverImageUrl,
          scene_art_urls: images.beatImages.map((img: any) => img.imageUrl),
          audio_url: audioUrl,
          asset_generation_status: {
            overall: 'ready',
            assets: {
              content: { status: 'ready', progress: 100 },
              cover: { status: 'ready', progress: 100 },
              beats: { status: 'ready', progress: 100 },
              audio: audioUrl ? { status: 'ready', progress: 100 } : { status: 'pending', progress: 0 }
            }
          },
          asset_generation_completed_at: new Date().toISOString()
        })
        .eq('id', request.storyId)
        .select()
        .single();
      
      if (updateError) {
        this.logger.error('Failed to update story record with assets', { storyId: request.storyId, error: updateError });
        throw updateError;
      }
      
      savedStory = { id: updatedStory.id };
      this.logger.info('Updated existing story record with assets', { storyId: request.storyId });
    } else {
      // Create new story record (fallback for conversational flows)
      savedStory = await this.saveStoryToDatabase({
        userId: request.userId,
        creatorUserId: request.creatorUserId || request.userId,  // CRITICAL: Track creator for quota attribution
        sessionId: request.sessionId,
        title: story.title,
        content: story.content,
        coverImageUrl: images.coverImageUrl,
        audioUrl,
        metadata: {
          characterName: request.characterName,
          storyType: request.storyType,
          userAge: request.userAge,
          beatImages: images.beatImages,
          imageTimestamps,
          assetsStatus,
          storyVersionHash,
          assetHashes,
          ipAttributions: ipAttributionsFormatted.length > 0 ? ipAttributionsFormatted : undefined
        },
        status: 'final',
        finalizedAt: new Date().toISOString(),
      });
    }

    // Log IP detection to audit trail after story is saved
    if (this.ipAuditService && ipAttributions.length > 0) {
      try {
        await this.ipAuditService.logDetection({
          storyId: savedStory.id,
          detectionMethod: 'automatic',
          detectedCharacters: ipAttributions,
          userId: request.userId,
          sessionId: request.sessionId,
        });
      } catch (error) {
        this.logger.error('Failed to log IP detection to audit trail', { error });
      }
    }

    // Send parent notification if configured
    if (request.parentPhone && this.config.sms?.enabled) {
      try {
        const sessionMetrics = await this.getSessionMetrics(request.userId, request.sessionId);
        await this.sendParentStoryNotification(request.parentPhone, request.childName || 'Your child', {
          title: story.title,
          duration: sessionMetrics.duration,
          gigglesDetected: sessionMetrics.gigglesDetected,
          dominantMood: sessionMetrics.dominantMood,
          creativityLevel: sessionMetrics.creativityLevel,
          storyLink: `${this.config.frontendUrl || 'https://storytailor.ai'}/story/${savedStory.id}`
        });
      } catch (smsError) {
        this.logger.warn('Parent SMS notification failed', { error: smsError });
        // Don't fail story creation if SMS fails
      }
    }

    return {
      success: true,
      story: { title: story.title, content: story.content, storyId: savedStory.id },
      coverImageUrl: images.coverImageUrl,
      beatImages: images.beatImages,
      audioUrl,
      assetsStatus,
      imageTimestamps,
      message: 'Story created with 5 illustrations!',
      speechText: this.formatStoryResponseWithAttribution(
        `Here's your story: ${story.title}! ${story.summary}`,
        ipAttributions
      )
    };
  }

  /**
   * Get session metrics for parent notification
   */
  private async getSessionMetrics(userId: string, sessionId: string): Promise<{
    duration: number;
    gigglesDetected: number;
    dominantMood: string;
    creativityLevel: 'high' | 'medium' | 'low';
  }> {
    try {
      // Get emotion data from database
      const { data: emotions } = await this.supabase
        .from('emotions')
        .select('mood, confidence, context')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      // Calculate metrics
      const gigglesDetected = emotions?.filter(e => 
        e.context?.userInput?.toLowerCase().includes('haha') || 
        e.context?.userInput?.toLowerCase().includes('giggle') ||
        e.mood === 'happy'
      ).length || 0;

      const moodCounts = emotions?.reduce((acc, e) => {
        acc[e.mood] = (acc[e.mood] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const dominantMood = Object.entries(moodCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'happy';

      // Estimate creativity based on story complexity and choices made
      const creativityLevel = gigglesDetected > 3 ? 'high' : gigglesDetected > 1 ? 'medium' : 'low';

      // Estimate duration (would be better to track actual session time)
      const duration = Math.max(5, Math.min(30, gigglesDetected * 2 + 5));

      return {
        duration,
        gigglesDetected,
        dominantMood,
        creativityLevel
      };
    } catch (error) {
      this.logger.warn('Failed to get session metrics', { error });
      return {
        duration: 10,
        gigglesDetected: 2,
        dominantMood: 'happy',
        creativityLevel: 'medium'
      };
    }
  }

  /**
   * Send parent story notification
   */
  private async sendParentStoryNotification(
    parentPhone: string,
    childName: string,
    storyData: any
  ): Promise<void> {
    // This would integrate with SMS service
    // For now, just log the notification
    this.logger.info('Parent story notification', {
      parentPhone,
      childName,
      storyData
    });
  }

  /**
   * Helper: Get stored story from database or temp cache
   */
  private async getStoredStory(storyId: string): Promise<any> {
    try {
      // First try Redis cache (persists across Lambda invocations) - only if Redis is available
      if (this.redis) {
        const redisKey = `story:${storyId}`;
        try {
          const cachedStory = await this.redis.get(redisKey);
          if (cachedStory) {
            this.logger.info('Story retrieved from Redis cache', { storyId });
            return JSON.parse(cachedStory);
          }
        } catch (redisError) {
          this.logger.warn('Redis cache lookup failed, continuing to temp cache', { storyId, error: redisError });
        }
      }

      // Try temp cache (for same Lambda invocation)
      if (this.tempStoryCache.has(storyId)) {
        this.logger.info('Retrieved story from temp cache', { storyId });
        return this.tempStoryCache.get(storyId);
      }
      
      // Try to fetch from database
      const { data: story, error } = await this.supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .single();

      if (error) {
        this.logger.error('Failed to fetch story from database', { storyId, error });
        throw new Error(`Story not found: ${storyId}`);
      }

      // Parse content JSON if needed
      const content = typeof story.content === 'string' 
        ? story.content 
        : (story.content?.text || story.content?.content || JSON.stringify(story.content));

      const storyData = {
        storyId: story.id,
        title: story.title || 'Untitled',
        content,
        audioUrl: story.content?.audioUrl || '',
        coverImageUrl: story.content?.coverImageUrl || '',
        beatImages: story.content?.beatImages || [],
        keyBeats: story.content?.metadata?.keyBeats || [],
        characterName: story.content?.metadata?.characterName || ''
      };

      // Cache in Redis for future invocations - only if Redis is available
      if (this.redis) {
        try {
          const redisKey = `story:${storyId}`;
          await this.redis.setex(redisKey, 3600, JSON.stringify(storyData)); // 1 hour TTL
        } catch (redisError) {
          this.logger.warn('Failed to cache story in Redis', { storyId, error: redisError });
        }
      }
      
      return storyData;
    } catch (error: any) {
      this.logger.error('getStoredStory failed', { storyId, error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Update story with cover image (database or temp cache)
   */
  private async updateStoryCover(storyId: string, coverImageUrl: string): Promise<void> {
    try {
      // If story is in temp cache, update it there
      if (this.tempStoryCache.has(storyId)) {
        const tempStory = this.tempStoryCache.get(storyId);
        tempStory.coverImageUrl = coverImageUrl;
        this.tempStoryCache.set(storyId, tempStory);
        this.logger.info('Cover updated in temp cache', { storyId });
        return;
      }
      
      // Update in database
      const { data: currentStory } = await this.supabase
        .from('stories')
        .select('content')
        .eq('id', storyId)
        .single();

      const currentContent = currentStory?.content || {};
      const updatedContent = {
        ...currentContent,
        coverImageUrl
      };

      const { error } = await this.supabase
        .from('stories')
        .update({ content: updatedContent })
        .eq('id', storyId);

      if (error) {
        this.logger.error('Failed to update cover in database', { storyId, error });
      } else {
        this.logger.info('Cover updated in database', { storyId, coverImageUrl: coverImageUrl.substring(0, 50) });
      }
    } catch (error: any) {
      this.logger.error('updateStoryCover failed', { storyId, error: error.message });
    }
  }

  /**
   * Helper: Update story with a beat image (database or temp cache)
   */
  private async updateStoryBeatImage(storyId: string, beatNumber: number, imageUrl: string, story: any): Promise<void> {
    try {
      const beat = story.keyBeats?.[beatNumber - 1]
      const description = beat?.visualDescription || beat?.description || `Beat ${beatNumber}`
      const nextBeat = { beatNumber, imageUrl, description, timestamp: 0 }

      // If story is in temp cache, update it there
      if (this.tempStoryCache.has(storyId)) {
        const tempStory = this.tempStoryCache.get(storyId)
        const currentBeatImages = Array.isArray(tempStory.beatImages) ? tempStory.beatImages : []
        const updatedBeatImages = [...currentBeatImages]
        const idx = updatedBeatImages.findIndex((b: any) => b?.beatNumber === beatNumber)
        if (idx >= 0) updatedBeatImages[idx] = nextBeat
        else updatedBeatImages.push(nextBeat)
        updatedBeatImages.sort((a: any, b: any) => a.beatNumber - b.beatNumber)
        tempStory.beatImages = updatedBeatImages
        this.tempStoryCache.set(storyId, tempStory)
        this.logger.info('Beat image updated in temp cache', { storyId, beatNumber })
        return
      }

      // Update in database
      const { data: currentStory, error: readError } = await this.supabase
        .from('stories')
        .select('content')
        .eq('id', storyId)
        .single()

      if (readError) {
        this.logger.error('Failed to read story before beat update', { storyId, beatNumber, error: readError })
        return
      }

      const currentContent = currentStory?.content || {}
      const currentBeatImages = Array.isArray(currentContent.beatImages) ? currentContent.beatImages : []
      const updatedBeatImages = [...currentBeatImages]
      const idx = updatedBeatImages.findIndex((b: any) => b?.beatNumber === beatNumber)
      if (idx >= 0) updatedBeatImages[idx] = nextBeat
      else updatedBeatImages.push(nextBeat)
      updatedBeatImages.sort((a: any, b: any) => a.beatNumber - b.beatNumber)

      const updatedContent = {
        ...currentContent,
        beatImages: updatedBeatImages,
      }

      const { error: updateError } = await this.supabase
        .from('stories')
        .update({ content: updatedContent })
        .eq('id', storyId)

      if (updateError) {
        this.logger.error('Failed to update beat image in database', { storyId, beatNumber, error: updateError })
      } else {
        this.logger.info('Beat image updated in database', { storyId, beatNumber, imageUrl: imageUrl.substring(0, 60) })
      }
    } catch (error: any) {
      this.logger.error('updateStoryBeatImage failed', { storyId, beatNumber, error: error.message })
    }
  }

  /**
   * Generate story content using OpenAI GPT-4 with 4 key visual beats
   */
  private async generateStoryContent(request: StoryGenerationRequest): Promise<{
    title: string;
    content: string;
    summary: string;
    keyBeats: Array<{
      beatNumber: number;
      description: string;
      visualDescription: string;
      characterState: string;
      emotionalTone: string;
    }>;
  }> {
    const characterName = request.characterName || 'our hero';
    const age = request.userAge || 7;
    const storyType = request.storyType || 'adventure';
    const traits = request.characterTraits || {};
    
    // Extract inclusivity traits if present
    const inclusivityTraits = (traits as any).inclusivityTraits || [];
    const inclusivityDescription = inclusivityTraits.length > 0
      ? inclusivityTraits.map((t: any) => t.name || t.description || t).join(', ')
      : '';

    const systemPrompt = `You are an award-winning children's story writer specializing in therapeutic bibliotherapy for children ages 3-10. 

Your stories:
- Follow the hero's journey structure
- Use age-appropriate language (age ${age})
- Incorporate social-emotional learning themes
- Are engaging, empowering, and hopeful
- Include vivid sensory details
- Feature diverse, inclusive characters
- Promote resilience and emotional intelligence

Write in a warm, encouraging tone that makes children feel seen, understood, and capable.`;

    // Age-based word count adaptation
    const ageParameters = {
      3: { wordCount: 75, sentenceLength: 5, vocabulary: 'toddler' },
      4: { wordCount: 125, sentenceLength: 6, vocabulary: 'preschool' },
      5: { wordCount: 175, sentenceLength: 8, vocabulary: 'kindergarten' },
      6: { wordCount: 225, sentenceLength: 9, vocabulary: 'early-elementary' },
      7: { wordCount: 300, sentenceLength: 10, vocabulary: 'elementary' },
      8: { wordCount: 375, sentenceLength: 11, vocabulary: 'mid-elementary' },
      9: { wordCount: 450, sentenceLength: 12, vocabulary: 'upper-elementary' },
      10: { wordCount: 550, sentenceLength: 14, vocabulary: 'preteen' }
    };
    
    const ageGroup = age <= 3 ? 3 : age >= 10 ? 10 : age;
    const params = ageParameters[ageGroup as keyof typeof ageParameters];

    // Build story type-specific prompt additions
    let storyTypePrompt = '';
    const requestAny = request as any;
    
    // Birthday story
    if (requestAny.birthday) {
      storyTypePrompt += `\n\nBIRTHDAY STORY DETAILS:
- This story is a gift FROM: ${requestAny.birthday.from}
- TO: ${requestAny.birthday.to}
- Who is turning ${requestAny.birthday.ageTurning} years old
- Personal message: "${requestAny.birthday.birthdayMessage}"

Make this story feel like a personal birthday gift that celebrates ${requestAny.birthday.to}'s special day.`;
    }
    
    // Bedtime story
    if (requestAny.bedtime) {
      storyTypePrompt += `\n\nBEDTIME STORY DETAILS:${requestAny.bedtime.bedtimeSoothingElement ? `\n- Soothing element: ${requestAny.bedtime.bedtimeSoothingElement}` : ''}${requestAny.bedtime.bedtimeRoutine ? `\n- Bedtime routine: ${requestAny.bedtime.bedtimeRoutine}` : ''}

Create a calming, soothing story perfect for winding down before sleep.`;
    }
    
    // Educational story
    if (requestAny.educational) {
      storyTypePrompt += `\n\nEDUCATIONAL STORY DETAILS:
- Subject: ${requestAny.educational.educationalSubject}${requestAny.educational.gradeLevel ? `\n- Grade level: ${requestAny.educational.gradeLevel}` : ''}${requestAny.educational.learningObjective ? `\n- Learning objective: ${requestAny.educational.learningObjective}` : ''}${requestAny.educational.region ? `\n- Region: ${requestAny.educational.region}` : ''}

Create an engaging educational story that teaches ${requestAny.educational.educationalSubject} concepts in an age-appropriate way.`;
    }
    
    // Medical Bravery story
    if (requestAny.medicalBravery) {
      storyTypePrompt += `\n\nMEDICAL BRAVERY STORY DETAILS:
- Medical challenge: ${requestAny.medicalBravery.medicalChallenge}${requestAny.medicalBravery.copingStrategy ? `\n- Coping strategy to emphasize: ${requestAny.medicalBravery.copingStrategy}` : ''}${requestAny.medicalBravery.procedureDate ? `\n- Procedure date: ${requestAny.medicalBravery.procedureDate}` : ''}${requestAny.medicalBravery.whatToExpect ? `\n- What to expect: ${requestAny.medicalBravery.whatToExpect}` : ''}

Create a supportive story that builds courage for this specific medical situation.`;
    }
    
    // Mental Health story
    if (requestAny.mentalHealth) {
      storyTypePrompt += `\n\nMENTAL HEALTH STORY DETAILS:
- Emotion explored: ${requestAny.mentalHealth.emotionExplored}${requestAny.mentalHealth.copingMechanism ? `\n- Coping mechanism: ${requestAny.mentalHealth.copingMechanism}` : ''}${requestAny.mentalHealth.challengeType ? `\n- Challenge type: ${requestAny.mentalHealth.challengeType}` : ''}

Create a story that gently explores ${requestAny.mentalHealth.emotionExplored} and provides healthy coping strategies.`;
    }
    
    // Language Learning story
    if (requestAny.languageLearning) {
      storyTypePrompt += `\n\nLANGUAGE LEARNING STORY DETAILS:
- Target language: ${requestAny.languageLearning.targetLanguage}
- Proficiency level: ${requestAny.languageLearning.proficiencyLevel}${requestAny.languageLearning.vocabularyWords?.length ? `\n- Vocabulary words to include: ${requestAny.languageLearning.vocabularyWords.join(', ')}` : ''}

Create a story that naturally incorporates ${requestAny.languageLearning.targetLanguage} vocabulary appropriate for ${requestAny.languageLearning.proficiencyLevel} learners.`;
    }
    
    // Financial Literacy story
    if (requestAny.financialLiteracy) {
      storyTypePrompt += `\n\nFINANCIAL LITERACY STORY DETAILS:
- Financial concept: ${requestAny.financialLiteracy.financialConcept}

Create a story that teaches age-appropriate concepts about ${requestAny.financialLiteracy.financialConcept}.`;
    }
    
    // Tech Readiness story
    if (requestAny.techReadiness) {
      storyTypePrompt += `\n\nTECH READINESS STORY DETAILS:
- Tech concept: ${requestAny.techReadiness.techConcept}

Create a story that teaches responsible and safe technology use related to ${requestAny.techReadiness.techConcept}.`;
    }
    
    // Milestones story
    if (requestAny.milestones) {
      storyTypePrompt += `\n\nMILESTONE STORY DETAILS:
- Milestone type: ${requestAny.milestones.milestoneType}

Create a story that celebrates and supports the child through this important milestone.`;
    }
    
    // Sequel/Continue story
    if (requestAny.sequel) {
      storyTypePrompt += `\n\nSEQUEL STORY DETAILS:
- Parent story ID: ${requestAny.sequel.parentStoryId}${requestAny.sequel.continuationType ? `\n- Continuation type: ${requestAny.sequel.continuationType}` : ''}

Create a ${requestAny.sequel.continuationType || 'sequel'} that continues the story from the parent story, maintaining character consistency and story continuity.`;
    }
    
    // Inner Child story (adult therapeutic)
    if (requestAny.innerChild) {
      storyTypePrompt = `Create a therapeutic inner child healing story.

STORY CONTEXT:
- Your name: ${requestAny.innerChild.yourName}
- Childhood name: ${requestAny.innerChild.childhoodName}
- Your age now: ${requestAny.innerChild.yourAgeNow}
- Age to reconnect with: ${requestAny.innerChild.ageToReconnectWith}
- Emotional focus area: ${requestAny.innerChild.emotionalFocusArea}
- Relationship context: ${requestAny.innerChild.relationshipContext}
- Word count: ${requestAny.innerChild.wordCount}${requestAny.innerChild.protectivePattern ? `\n- Protective pattern: ${requestAny.innerChild.protectivePattern}` : ''}${requestAny.innerChild.memoryToAddress ? `\n- Memory to address: ${requestAny.innerChild.memoryToAddress}` : ''}

Create a ${requestAny.innerChild.wordCount.replace('-', ' to ')} word therapeutic narrative that:
- Gently explores inner child healing and reconnection
- Provides safe emotional processing with grounding techniques
- Validates complex emotions and experiences
- Creates symbols of healing and integration
- Integrates professional therapeutic principles naturally

This story is for an adult audience engaging in inner child work.`;
    }
    
    // Child Loss story (adult therapeutic)
    if (requestAny.childLoss) {
      storyTypePrompt = `Create a therapeutic grief processing story.

STORY CONTEXT:
- Type of loss: ${requestAny.childLoss.typeOfLoss}
- Created by: ${requestAny.childLoss.yourName} (${requestAny.childLoss.yourRelationship})
- Child's name: ${requestAny.childLoss.childName}
- Child's age: ${requestAny.childLoss.childAge}
- Child's gender: ${requestAny.childLoss.childGender}
- Ethnicity: ${requestAny.childLoss.ethnicity.join(', ')}${requestAny.childLoss.ethnicity.length > 1 ? ' (mixed race - represent equally)' : ''}${requestAny.childLoss.inclusivityTraits?.length ? `\n- Inclusivity traits: ${requestAny.childLoss.inclusivityTraits.join(', ')}` : ''}${requestAny.childLoss.personalityTraits?.length ? `\n- Personality: ${requestAny.childLoss.personalityTraits.join(', ')}` : ''}${requestAny.childLoss.appearance ? `\n- Appearance: ${requestAny.childLoss.appearance}` : ''}${requestAny.childLoss.hopesOrDreams ? `\n- Hopes/dreams held: ${requestAny.childLoss.hopesOrDreams}` : ''}${requestAny.childLoss.memoriesToHighlight ? `\n- Memories to honor: ${requestAny.childLoss.memoriesToHighlight}` : ''}
- Emotional focus: ${requestAny.childLoss.emotionalFocusArea}
- Word count: ${requestAny.childLoss.wordCount}

Create a ${requestAny.childLoss.wordCount.replace('-', ' to ')} word therapeutic narrative that:
- Gently explores loss and remembrance
- Honors ${requestAny.childLoss.childName}'s unique personality and impact
- Provides safe emotional processing with grounding techniques
- Validates complex emotions and experiences
- Creates symbols of enduring love and memory
- Integrates professional therapeutic principles naturally

This story is for an adult audience processing grief.`;
    }
    
    // New Birth story
    if (requestAny.newBirth) {
      if (requestAny.newBirth.mode === 'therapeutic') {
        storyTypePrompt = `Create a therapeutic story about new birth and transformation.

STORY CONTEXT:
- Mode: Therapeutic
- Gift giver: ${requestAny.newBirth.giftGiverName}${requestAny.newBirth.babyName ? `\n- Baby name: ${requestAny.newBirth.babyName}` : ''}${requestAny.newBirth.dueDate ? `\n- Due date: ${requestAny.newBirth.dueDate}` : ''}${requestAny.newBirth.partnerName ? `\n- Partner name: ${requestAny.newBirth.partnerName}` : ''}${requestAny.newBirth.emotionalFocus ? `\n- Emotional focus: ${requestAny.newBirth.emotionalFocus}` : ''}${requestAny.newBirth.birthOrder ? `\n- Birth order: ${requestAny.newBirth.birthOrder}` : ''}${requestAny.newBirth.hopesAndDreams ? `\n- Hopes and dreams: ${requestAny.newBirth.hopesAndDreams}` : ''}
- Word count: ${requestAny.newBirth.wordCount}

Create a ${requestAny.newBirth.wordCount.replace('-', ' to ')} word therapeutic narrative that:
- Gently explores the emotional journey of new birth
- Provides safe emotional processing with grounding techniques
- Validates complex emotions and experiences
- Creates symbols of hope and transformation
- Integrates professional therapeutic principles naturally

This story is for an adult audience processing the experience of new birth.`;
      } else {
        storyTypePrompt += `\n\nNEW BIRTH CELEBRATION STORY DETAILS:
- Mode: Celebration
- Gift giver: ${requestAny.newBirth.giftGiverName}${requestAny.newBirth.babyName ? `\n- Baby name: ${requestAny.newBirth.babyName}` : ''}${requestAny.newBirth.dueDate ? `\n- Due date: ${requestAny.newBirth.dueDate}` : ''}${requestAny.newBirth.parentNames ? `\n- Parent names: ${requestAny.newBirth.parentNames}` : ''}${requestAny.newBirth.species ? `\n- Species: ${requestAny.newBirth.species} (imaginative)` : ''}${requestAny.newBirth.celebrationTheme ? `\n- Celebration theme: ${requestAny.newBirth.celebrationTheme}` : ''}${requestAny.newBirth.hopesAndDreams ? `\n- Hopes and dreams: ${requestAny.newBirth.hopesAndDreams}` : ''}
- Word count: ${requestAny.newBirth.wordCount}

Create a joyful, celebratory story perfect for a baby shower gift or new birth celebration.`;
      }
    }

    // Determine word count - adult stories use input word count, children's stories use age-based
    const isAdultTherapeutic = !!(requestAny.innerChild || requestAny.childLoss || (requestAny.newBirth && requestAny.newBirth.mode === 'therapeutic'));
    let wordCountText = '';
    let vocabularyText = '';
    
    if (isAdultTherapeutic) {
      // Adult stories: word count from input (already in storyTypePrompt)
      wordCountText = ''; // Word count already specified in storyTypePrompt for adult stories
      vocabularyText = 'Use mature, therapeutic language appropriate for adult readers.';
    } else {
      // Children's stories: age-based word count
      wordCountText = `\n\nThe story should be approximately ${params.wordCount} words, appropriate for read-aloud narration.
Use ${params.vocabulary} vocabulary level with sentences averaging ${params.sentenceLength} words.`;
      vocabularyText = '';
    }

    const userPrompt = `Write a ${storyType} story${isAdultTherapeutic ? ' for an adult audience' : ` for a ${age}-year-old child`} featuring ${characterName}. 

Character details:
- Age: ${traits.age || age}
- Species: ${traits.species || 'human'}
- Personality: ${traits.personality || 'brave and kind'}${inclusivityDescription ? `\n- Physical characteristics: ${inclusivityDescription}` : ''}${(traits as any).ethnicity?.length ? `\n- Ethnicity: ${Array.isArray((traits as any).ethnicity) ? (traits as any).ethnicity.join(' and ') : (traits as any).ethnicity}` : ''}${(traits as any).appearance?.clothing ? `\n- Clothing/Style: ${(traits as any).appearance.clothing}` : ''}${(traits as any).appearance?.hair_style ? `\n- Hair: ${(traits as any).appearance.hair_color}, ${(traits as any).appearance.hair_style}` : ''}${(traits as any).appearance?.eye_color ? `\n- Eyes: ${(traits as any).appearance.eye_color}` : ''}${(traits as any).appearance?.skin_tone ? `\n- Skin tone: ${(traits as any).appearance.skin_tone}` : ''}${(traits as any).appearance?.distinguishing_features ? `\n- Notable features: ${(traits as any).appearance.distinguishing_features}` : ''}${storyTypePrompt}${wordCountText}${vocabularyText}

IMPORTANT: ${characterName} should be portrayed naturally and authentically with all their physical characteristics integrated seamlessly into the narrative. Their unique traits are part of who they are - show them living their life fully.

Include:
- A clear beginning, middle, and end
- Moments of challenge that the character overcomes
- Positive role modeling
- A satisfying resolution

IMPORTANT: Identify 4 KEY VISUAL MOMENTS for illustrations:
1. Opening scene (establishes character and setting)
2. First challenge (25% through story)
3. Climax/turning point (60% through story)
4. Resolution/victory (ending scene)

Format your response as JSON:
{
  "title": "Story Title",
  "content": "Full story text...",
  "summary": "One sentence summary for voice introduction",
  "keyBeats": [
    {
      "beatNumber": 1,
      "description": "Brief description of this moment in the story",
      "visualDescription": "Detailed visual description for illustration (setting, character pose, mood, colors)",
      "characterState": "Character's physical and emotional state at this moment",
      "emotionalTone": "happy/brave/thoughtful/triumphant"
    }
    // ... 3 more beats
  ]
}`;

    const response = await this.openai.chat.completions.create({
      model: this.config.openai.model || 'gpt-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      // Note: gpt-5 only supports temperature: 1 (default), so omit this parameter
      // temperature: 0.8,  // Not supported by gpt-5
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No story content generated');
    }

    const parsed = JSON.parse(content);
    return {
      title: parsed.title || 'A Brave Adventure',
      content: parsed.content || '',
      summary: parsed.summary || 'A wonderful story about courage and friendship.',
      keyBeats: parsed.keyBeats || []
    };
  }

  /**
   * Generate image with reference images using images.edit() API
   * Includes comprehensive safety review and trait validation
   * This is the core method that enables Buildship-level quality
   * 
   * Following plan Phase 8 exactly as specified
   */
  /**
   * Get user-friendly progress message for image generation
   * Confident, positive messaging that doesn't expose technical retries
   */
  private getProgressMessage(imageType: string, attempt: number, maxAttempts: number): {
    progress: number;
    message: string;
  } {
    const progress = Math.round((attempt / (maxAttempts + 1)) * 100);
    
    // User-facing messages: Confident and positive
    if (progress < 25) {
      return { progress, message: `Creating ${imageType} illustration...` };
    } else if (progress < 50) {
      return { progress, message: "Adding details..." };
    } else if (progress < 75) {
      return { progress, message: "Refining artwork..." };
    } else {
      return { progress, message: "Almost ready..." };
    }
  }

  private async generateImageWithReferences({
    prompt,
    referenceUrls,
    targetRating = 'G',
    characterName,
    expectedTraits = [],
    maxRetries = 2,
    size = '1024x1024',
    quality = 'high',
    storyId,
    imageType = 'image'
  }: {
    prompt: string;
    referenceUrls: string[];
    targetRating?: 'G' | 'PG';
    characterName?: string;
    expectedTraits?: any[];
    maxRetries?: number;
    size?: string;
    quality?: string;
    storyId?: string;
    imageType?: string;
  }): Promise<{
    imageUrl: string;
    altText?: string;
    review?: any;
    traitsValidated: boolean;
    attemptsUsed: number;
  }> {
    // Lazy-load services
    const { ImageReferenceService } = await import('./services/ImageReferenceService');
    const { ImageSafetyReviewService } = await import('./services/ImageSafetyReviewService');
    
    const refService = new ImageReferenceService(this.openai, this.logger);
    const safetyService = new ImageSafetyReviewService(this.openai, this.logger, MODEL_CONFIG.VISION);

    // Download reference images as OpenAI File objects
    let referenceFiles: any[] = [];
    if (referenceUrls && referenceUrls.length > 0) {
      try {
        referenceFiles = await refService.downloadMultipleAsOpenAIFiles(referenceUrls);
        this.logger.info('Downloaded reference images for story generation', {
          requestedCount: referenceUrls.length,
          successCount: referenceFiles.length
        });
      } catch (err: any) {
        this.logger.warn('Failed to download reference images, falling back to generate()', {
          error: err.message
        });
      }
    }

    let currentPrompt = prompt;
    let acceptedImageUrl: string | null = null;
    let finalAltText: string | null = null;
    let finalReview: any = null;
    let traitsValidated = true;

    // Retry loop with comprehensive validation
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.logger.info(`Image generation attempt ${attempt + 1}/${maxRetries + 1}`, {
        hasReferences: referenceFiles.length > 0,
        promptLength: currentPrompt.length,
        isRetry: attempt > 0,
        hasTraits: expectedTraits.length > 0
      });

      try {
        // Log final prompt (sanitized + wrapped) before sending to OpenAI (toggle via LOG_IMAGE_PROMPTS)
        // Disabled by default. Enable temporarily for debugging only.
        if (process.env.LOG_IMAGE_PROMPTS === 'true') {
          const globalStyleCount = (currentPrompt.match(/GLOBAL STYLE \(fixed\)/g) || []).length;
          const hasPoseDirectives = currentPrompt.includes('Pose and framing directives (mandatory):');
          const logPayload = {
            hasGlobalStyleOnce: globalStyleCount === 1,
            globalStyleCount,
            hasPoseDirectives,
            promptHead: currentPrompt.slice(0, 300),
            promptTail: currentPrompt.slice(-300)
          };
          if (typeof this.logger.debug === 'function') {
            this.logger.debug('Image prompt final (pre-OpenAI)', logPayload);
          } else {
            this.logger.info('Image prompt final (pre-OpenAI)', logPayload);
          }
        }

        // Log API call parameters (toggle via LOG_IMAGE_PROMPTS)
        if (process.env.LOG_IMAGE_PROMPTS === 'true') {
          const apiLogPayload = {
            size,
            quality,
            model: DEFAULT_IMAGE_MODEL,
            hasReferences: referenceFiles.length > 0
          };
          if (typeof this.logger.debug === 'function') {
            this.logger.debug('OpenAI image API params', apiLogPayload);
          } else {
            this.logger.info('OpenAI image API params', apiLogPayload);
          }
        }

        // Generate image (with or without references)
        let response;
        if (referenceFiles.length > 0) {
          // Use images.edit() with references (BUILDSHIP APPROACH - per plan)
          response = await this.openai.images.edit({
            model: DEFAULT_IMAGE_MODEL,
            prompt: currentPrompt,
            image: referenceFiles.length === 1 ? referenceFiles[0] : referenceFiles,
            size: size as any,
            quality: quality as any
          });
        } else {
          // Fallback to images.generate()
          this.logger.warn('No references available, using generate() instead of edit()');
          response = await this.openai.images.generate({
            model: DEFAULT_IMAGE_MODEL,
            prompt: currentPrompt,
            size: size as any,
            quality: quality as any
          });
        }

        if (!response.data?.length) {
          throw new Error('No image data received from OpenAI');
        }

        // Get image as base64 for validation
        const imageData = response.data[0];
        let imageB64: string;
        let imageBuffer: Buffer;
        
        if (imageData.url) {
          const imgResponse = await fetch(imageData.url);
          imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
          imageB64 = imageBuffer.toString('base64');
        } else if (imageData.b64_json) {
          imageB64 = imageData.b64_json;
          imageBuffer = Buffer.from(imageB64, 'base64');
        } else {
          throw new Error('No image data available');
        }

        // Comprehensive review: Safety + Traits (per plan Phase 8)
        const review = await safetyService.reviewImageComprehensive({
          candidateB64: imageB64,
          targetRating,
          characterName,
          expectedTraits
        });

        const ratingAcceptable = safetyService.isRatingAcceptable(
          review.rating,
          targetRating
        );

        // Check safety AND traits ONLY (trust Buildship-style prompts for style)
        const passesReview = review.is_child_safe &&
                             ratingAcceptable &&
                             (expectedTraits.length === 0 || review.traits_validated);

        // Log style score for monitoring (but don't block)
        if (review.global_style_score !== undefined) {
          this.logger.info('Image style score (logged only, not blocking)', {
            styleScore: review.global_style_score,
            isPhotorealistic: review.is_photorealistic,
            note: 'Trusting Buildship-style prompts for quality'
          });
        }

        if (passesReview) {
          // Image passed! Upload to S3
          const s3Url = await this.persistImageToS3Direct(imageBuffer, `image-${Date.now()}`);
          acceptedImageUrl = s3Url;
          finalAltText = review.alt_text;
          finalReview = review;
          traitsValidated = review.traits_validated;
          
          this.logger.info('Image passed critical validation (safety + traits)', {
            attempt: attempt + 1,
            rating: review.rating,
            traitsValidated: review.traits_validated,
            styleScore: review.global_style_score,
            styleLogged: true,
            altText: review.alt_text?.substring(0, 100)
          });
          
          break; // Success!
        }

        // Image failed - prepare for retry
        const failureReasons: string[] = [];
        if (!review.is_child_safe || !ratingAcceptable) {
          failureReasons.push(`Safety: Rating ${review.rating}`);
        }
        if (expectedTraits.length > 0 && !review.traits_validated) {
          failureReasons.push(`AI Bias: Missing traits ${review.missing_traits.join(', ')}`);
        }
        // Style logged only (not blocking)
        if (review.global_style_score !== undefined && review.global_style_score < 5) {
          this.logger.info('Style score below target but not blocking retry', {
            score: review.global_style_score,
            note: 'Trusting Buildship prompts for style quality'
          });
        }

        this.logger.warn('Image failed critical validation', {
          attempt: attempt + 1,
          reasons: failureReasons,
          willRetry: attempt < maxRetries
        });

        if (attempt < maxRetries) {
          // Build retry prompt combining all three fixes
          let retryPrompt = prompt;
          
          if (review.suggested_fix_prompt) {
            retryPrompt += `\n\nSafety adjustments:\n${review.suggested_fix_prompt}`;
          }
          
          if (review.suggested_trait_fix) {
            retryPrompt += `\n\nTrait visibility adjustments (AI BIAS CORRECTION - ATTEMPT ${attempt + 2}):\n${review.suggested_trait_fix}`;
          }

          // Style fix: Log but don't include in retry (trusting Buildship prompts)
          if (review.suggested_style_fix) {
            this.logger.info('Style fix suggested but not applying (trusting prompts)', {
              suggestedFix: review.suggested_style_fix,
              note: 'Style improvements come from better base prompts, not retry corrections'
            });
          }

          currentPrompt = retryPrompt;
          finalReview = review;
        } else {
          // Final attempt failed - accept with flag or reject (per plan)
          if (!review.is_child_safe) {
            // Safety failure - must reject
            throw new Error(
              `Image failed safety review after ${maxRetries + 1} attempts. ` +
              `Final rating: ${review.rating}`
            );
          } else {
            // Only trait validation failed - accept with flag (per plan decision tree)
            this.logger.error('AI bias persistent - accepting with traitsValidated: false', {
              characterName,
              missingTraits: review.missing_traits,
              attempts: maxRetries + 1
            });
            
            const s3Url = await this.persistImageToS3Direct(imageBuffer, `image-${Date.now()}`);
            acceptedImageUrl = s3Url;
            finalAltText = review.alt_text;
            finalReview = review;
            traitsValidated = false;
            break;
          }
        }

      } catch (error: any) {
        if (error.message.includes('Image failed safety review')) {
          throw error; // Re-throw safety failures
        }
        
        this.logger.error('Image generation attempt failed', {
          attempt: attempt + 1,
          error: error.message
        });
        
        if (attempt === maxRetries) {
          throw new Error(`Image generation failed after ${maxRetries + 1} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff - per plan)
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (!acceptedImageUrl) {
      throw new Error('Failed to generate an acceptable image');
    }

    return {
      imageUrl: acceptedImageUrl,
      altText: finalAltText || undefined,
      review: finalReview,
      traitsValidated,
      attemptsUsed: maxRetries + 1
    };
  }

  /**
   * Generate 5 visually consistent images with character continuity
   * NOW supports: Reference images, trait validation, progressive async mode
   * 
   * Following plan Phase 9 exactly as specified
   * 
   * PUBLIC: Made public to allow async story art generation from lambda handler
   */
  /**
   * V2 PARITY: Analyze Scene for Visual Dynamism
   * 
   * Source: `v2 OLD Prompt Templates/Images/V2 Image Flow` lines 188-201
   * 
   * Uses GPT-4o to analyze story beats for "visually kinetic, plot-shifting moments"
   * and generate cinematic descriptions with decisive action, camera angles, depth,
   * lighting, and atmosphere.
   * 
   * V2 System Prompt: SECTION_SYS
   * - Returns ONE paragraph ≤120 words
   * - Shows decisive action & emotion
   * - Specifies cinematic camera angle/lens or depth-of-field
   * - Layers foreground/mid/background
   * - Notes atmosphere
   * - Does NOT mention medium, palette, UI, or watermarks
   * 
   * V2 Parameters:
   * - model: "gpt-4o"
   * - temperature: 0.85 (high creativity for visual interpretation)
   * - max_tokens: 320
   * 
   * @param beatText - Story beat text to analyze
   * @param label - Beat label (e.g., "sectionA", "sectionB")
   * @param isCover - Whether this is the cover image (uses COVER_DIRECTIVE if true)
   * @param fullStory - Full story text (for cover analysis only)
   * @returns Cinematic scene description ≤120 words
   * 
   * @note Disability Representation Rules (December 29, 2025)
   *       - Mobility aids always integrated (never separated from character)
   *       - Magical/flight scenes: wheelchair AND character fly together
   *       - See: DISABILITY_REPRESENTATION_FIX_COMPLETE.md
   */
  private async analyzeSceneForVisualDynamism(
    beatText: string,
    label: string,
    isCover: boolean = false,
    fullStory?: string
  ): Promise<string> {
    const SECTION_SYS = `
You are a film story artist describing keyframes.
Return ONE paragraph ≤120 words that shows decisive action & emotion,
specifies cinematic camera angle/lens or depth-of-field, layers foreground/mid/background,
and notes atmosphere. Do NOT mention medium, palette, UI, or watermarks.

CRITICAL: Disability Representation Rules:
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)
- Never show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`.trim();

    const COVER_DIRECTIVE = `
Identify the single most visually kinetic, plot-shifting moment in the story.
Depict the protagonist mid-action at peak emotion (wonder, fear, triumph, etc.).
Return ONE paragraph ≤120 words describing action, camera angle, depth, lighting, and atmosphere.
Do NOT mention medium, palette, brush style, text, UI, or watermarks.

CRITICAL: Disability Representation Rules:
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: "character AND wheelchair fly together" (wheels glowing, both airborne)
- Never show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`.trim();

    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_CONFIG.TEXT,
        messages: [
          {
            role: 'system',
            content: isCover ? COVER_DIRECTIVE : SECTION_SYS
          },
          {
            role: 'user',
            content: isCover 
              ? (fullStory?.slice(0, 1200) || beatText)  // V2: Cover uses first 1200 chars
              : `Book section ${label}:\n${beatText}`
          }
        ],
        temperature: 0.85,  // V2 PARITY: High creativity for visual interpretation
        max_completion_tokens: 320  // FIX: Use max_completion_tokens for gpt-5.x models
      });

      const sceneDescription = response.choices[0].message.content?.trim() || '';
      
      this.logger.info('Scene analysis complete', {
        label,
        isCover,
        inputLength: beatText.length,
        outputLength: sceneDescription.length,
        tokensUsed: response.usage?.total_tokens || 0
      });

      return sceneDescription;
    } catch (error) {
      this.logger.warn('Scene analysis failed, using fallback', { label, error });
      // Fallback: Use original beat text
      return beatText.slice(0, 200);
    }
  }

  /**
   * V2 PARITY: Generate Story Palette Journey
   * 
   * Source: `v2 OLD Prompt Templates/Images/V2 Image Flow` lines 143-171
   * 
   * Uses GPT-4o to analyze full story emotional arc and generate a custom 5-step
   * palette journey that mirrors the narrative progression from beginning to resolution.
   * 
   * V2 System Prompt:
   * - Returns JSON ONLY: { "motif": "<short theme>", "paletteJourney": ["<cover>", "<p1>", "<p2>", "<p3>", "<p4>"] }
   * - Palette arc should mirror emotional arc
   * 
   * V2 Parameters:
   * - model: "gpt-4o"
   * - temperature: 0.5 (balanced creativity for thematic analysis)
   * - max_tokens: 180
   * 
   * Returns custom palette that evolves with story's emotional journey instead of
   * using static FALLBACK_PALETTE.
   * 
   * @param fullStory - Complete story text (up to 6000 chars analyzed)
   * @returns Object with motif (short theme) and 5-step palette journey
   */
  private async generateStoryPaletteJourney(
    fullStory: string
  ): Promise<{ motif: string; paletteJourney: string[] }> {
    const { FALLBACK_PALETTE } = await import('./constants/GlobalArtStyle');
    
    try {
      const response = await this.openai.chat.completions.create({
        model: MODEL_CONFIG.TEXT,
        messages: [
          {
            role: 'system',
            content: `You are a picture-book art director.
Return JSON ONLY:
{ "motif":"<short theme>", "paletteJourney":[ "<cover>", "<p1>", "<p2>", "<p3>", "<p4>" ] }
Palette arc should mirror emotional arc.`
          },
          {
            role: 'user',
            content: fullStory.slice(0, 6000)  // V2 PARITY: Analyze first 6000 chars
          }
        ],
        temperature: 0.5,  // V2 PARITY: Balanced for thematic analysis
        max_completion_tokens: 180,  // FIX: Use max_completion_tokens for gpt-5.x models
        response_format: { type: 'json_object' }
      });

      const rawContent = response.choices[0].message.content?.trim() || '{}';
      const parsed = JSON.parse(rawContent);

      let motif = parsed.motif?.trim() || 'wonder';
      let paletteJourney = FALLBACK_PALETTE;

      if (Array.isArray(parsed.paletteJourney) && parsed.paletteJourney.length >= 5) {
        paletteJourney = parsed.paletteJourney.slice(0, 5).map(String);
      }

      this.logger.info('Story palette journey generated', {
        motif,
        paletteLength: paletteJourney.length,
        tokensUsed: response.usage?.total_tokens || 0
      });

      return { motif, paletteJourney };
    } catch (error) {
      this.logger.warn('Palette generation failed, using fallback', { error });
      return { motif: 'wonder', paletteJourney: FALLBACK_PALETTE };
    }
  }

  /**
   * V2 PARITY: Build Motif Instruction
   * 
   * Source: `v2 OLD Prompt Templates/Images/V2 Image Flow` line 207
   * 
   * Simple helper to format motif instruction for image prompts.
   * Motif is a subtle recurring visual element that reinforces the story's theme.
   * 
   * @param motif - Story motif (e.g., "wonder", "bravery", "discovery")
   * @returns Formatted instruction for weaving motif into scene
   */
  private buildMotifInstruction(motif: string): string {
    return `Subtle motif: weave a small symbol of "${motif}" into the scene.`;
  }

  async generateStoryImages(
    story: { title: string; keyBeats: any[] },
    characterName: string,
    characterTraits: any,
    characterId?: string,
    mode: 'batch' | 'progressive' = 'batch',
    existingImages?: Array<{ beatNumber: number; imageUrl: string }>,
    storyId?: string,
    onProgress?: (assetType: string, status: 'generating' | 'ready' | 'failed', data?: { url?: string; progress?: number }) => Promise<void>
  ): Promise<{
    coverImageUrl: string;
    beatImages: Array<{ 
      beatNumber: number; 
      imageUrl: string; 
      description: string; 
      altText?: string;
      timestamp: number;
      traitsValidated?: boolean;
    }>;
  }> {
    try {
      // 1. FETCH CHARACTER REFERENCE IMAGES + INCLUSIVITY TRAITS (per plan Phase 9)
      let characterReferences: string[] = [];
      let characterInclusivityTraits: any[] = [];
      
      if (characterId) {
        try {
          const { CharacterDatabase } = await import('./database/CharacterDatabase');
          const charDb = new CharacterDatabase(
            this.config.supabase.url,
            this.config.supabase.anonKey,
            this.logger
          );
          
          const savedChar = await charDb.getCharacterById(characterId);
          
          if (savedChar) {
            // Get validated reference images
            const savedCharAny: any = savedChar as any;
            const referenceImages = savedCharAny.reference_images || savedCharAny.referenceImages;
            
            if (referenceImages) {
              characterReferences = referenceImages
                .filter((ref: any) => ref.traitsValidated !== false)
                .map((ref: any) => ref.url)
                .filter(Boolean);
            } else if (savedCharAny.headshotUrl || savedCharAny.bodyshotUrl || savedCharAny.headshot_url || savedCharAny.bodyshot_url) {
              // Fallback to legacy fields
              if (savedCharAny.headshotUrl) characterReferences.push(savedCharAny.headshotUrl);
              if (savedCharAny.headshot_url) characterReferences.push(savedCharAny.headshot_url);
              if (savedCharAny.bodyshotUrl) characterReferences.push(savedCharAny.bodyshotUrl);
              if (savedCharAny.bodyshot_url) characterReferences.push(savedCharAny.bodyshot_url);
            }
            
            // Get inclusivity traits for validation
            if (savedChar.traits?.inclusivityTraits) {
              const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
              characterInclusivityTraits = savedChar.traits.inclusivityTraits
                .map((t: any) => INCLUSIVITY_TRAITS_MAP[t.type || t])
                .filter(Boolean);
            }
            
            this.logger.info('Loaded character data for story images', {
              characterId,
              referenceCount: characterReferences.length,
              inclusivityTraitCount: characterInclusivityTraits.length
            });
          }
        } catch (err) {
          this.logger.warn('Could not load character data, using fallback', { error: err });
        }
      }
      
      // Build character consistency context for ALL images
      const characterContext = await this.buildCharacterConsistencyContext(characterName, characterTraits);

      // Import GLOBAL_STYLE for sophisticated artistic quality
      const { GLOBAL_STYLE, FALLBACK_PALETTE } = await import('./constants/GlobalArtStyle');

      // V2 PARITY STEP 1: Generate story-specific palette journey and motif
      // Source: V2 Image Flow lines 143-171
      // This replaces the static FALLBACK_PALETTE with a custom 5-step arc that mirrors the story's emotional progression
      const fullStoryText = story.keyBeats.map((b: any) => b.description || '').join('\n\n');
      const { motif, paletteJourney } = await this.generateStoryPaletteJourney(fullStoryText);
      
      this.logger.info('Story palette journey generated', { 
        motif, 
        paletteSteps: paletteJourney.length,
        usingCustomPalette: paletteJourney[0] !== FALLBACK_PALETTE[0]
      });

      // Helper to enforce pose & framing directives at generation time
      const withPoseAndFramingDirectives = (scenePrompt: string) => `
${scenePrompt}

Pose and framing directives (mandatory):
• The character must be in a distinctly different pose than in any reference image.
• Change arm and leg positions clearly so the body language is obviously new.
• Use a different camera angle or framing (for example, wide shot, low angle, side view, top-down, or over-the-shoulder).
• Avoid re-using the same straight-on, centered pose or composition seen in reference images.
• If the pose feels too similar to any reference, choose a more dynamic, story-specific alternative that matches this scene.
`.trim();

      // V2 PARITY STEP 2: Analyze cover for visually kinetic moment
      // Source: V2 Image Flow lines 173-187 (COVER_DIRECTIVE)
      // Uses GPT-4o to identify the most visually dynamic, plot-shifting moment for the cover
      const coverSceneAnalysis = await this.analyzeSceneForVisualDynamism(
        fullStoryText,
        'cover',
        true,  // isCover = true
        fullStoryText
      );

      this.logger.info('Cover scene analysis complete', {
        inputLength: fullStoryText.length,
        analysisLength: coverSceneAnalysis.length
      });

      // 1. Generate cover image (establishes visual baseline)
      // V2 PARITY: Now uses GPT-4o analyzed scene + custom palette + motif
      let coverPrompt = [
        `PROTAGONIST DNA: ${characterContext}`,

        `SCENE:\n${coverSceneAnalysis}`,

        `${this.buildMotifInstruction(motif)}`,

        `Palette note: ${paletteJourney[0] || FALLBACK_PALETTE[0]}`,

        `DISABILITY REPRESENTATION (CRITICAL):
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: character AND wheelchair fly together (wheels glowing, both airborne)
- NEVER show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`,

        GLOBAL_STYLE
      ].join("\n\n");

      // Run contextual safety check on art prompt
      coverPrompt = await this.checkAndSanitizeArtPrompt(coverPrompt, characterTraits?.age || 7);

      this.logger.info(`Generating cover with GLOBAL_STYLE, references, and validation`);
      
      // Check if cover already exists (progressive mode support - per plan)
      let coverUrl: string;
      let coverTraitsValidated = true;
      const existingCover = existingImages?.find((img: any) => img.beatNumber === 0);
      
      if (existingCover) {
        coverUrl = existingCover.imageUrl;
        this.logger.info('Using existing cover image', { coverUrl: coverUrl.substring(0, 60) });
      } else {
        // Generate NEW cover with references and validation (per plan Phase 9)
        const coverSize = '1024x1024';
        if (coverSize !== '1024x1024') {
          throw new Error('Cover size must be 1024x1024');
        }

        const coverResult = await this.generateImageWithReferences({
          prompt: withPoseAndFramingDirectives(coverPrompt),
          referenceUrls: characterReferences,
          targetRating: 'G',
          characterName,
          expectedTraits: characterInclusivityTraits,
          maxRetries: 2,
          size: coverSize
        });

        coverUrl = coverResult.imageUrl;
        coverTraitsValidated = coverResult.traitsValidated;
        
        // Update cover status in database for progressive loading
        if (storyId && onProgress) {
          await onProgress('cover', 'ready', { url: coverUrl, progress: 100 });
        } else if (storyId) {
          // Fallback: Update database directly if onProgress not provided
          try {
            const { data: currentStory } = await this.supabase
              .from('stories')
              .select('asset_generation_status, cover_art_url')
              .eq('id', storyId)
              .single();

            const currentStatus = currentStory?.asset_generation_status || {
              overall: 'generating',
              assets: {}
            };

            currentStatus.assets['cover'] = {
              status: 'ready',
              url: coverUrl,
              progress: 100,
              completedAt: new Date().toISOString()
            };

            // Update overall status
            const assetStatuses = Object.values(currentStatus.assets);
            if (assetStatuses.every((a: any) => a.status === 'ready')) {
              currentStatus.overall = 'ready';
            } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'generating';
            }

            await this.supabase
              .from('stories')
              .update({
                asset_generation_status: currentStatus,
                cover_art_url: coverUrl
              })
              .eq('id', storyId);

            this.logger.info('Updated cover status in database', { storyId, url: coverUrl.substring(0, 60) });
          } catch (updateError) {
            this.logger.error('Failed to update cover status in database', { storyId, error: updateError });
          }
        }
        
        this.logger.info('Cover generated with references and validation', {
          coverUrl: coverUrl.substring(0, 60),
          hadReferences: characterReferences.length > 0,
          traitsValidated: coverResult.traitsValidated,
          rating: coverResult.review?.rating,
          attemptsUsed: coverResult.attemptsUsed
        });
      }

      // 2. Generate 4 beat images with progressive reference chain (per plan Phase 9)
      const beatImages: Array<{ 
        beatNumber: number; 
        imageUrl: string; 
        description: string; 
        altText?: string;
        timestamp: number;
        traitsValidated?: boolean;
      }> = [];
      
      // Track color extraction promises for parallel execution
      const beatColorPromises: Array<Promise<{ primary: string; secondary: string; tertiary: string }>> = [];
      
      // Build progressive reference chain (per plan)
      // CRITICAL: Use S3 URLs for progressive chain (cover is not yet accessible via CDN during inline generation)
      // Cover was just generated and saved to S3 - extract S3 key and construct S3 URL
      // ImageReferenceService now handles S3 URLs using AWS SDK (not HTTP)
      let coverS3Url: string;
      if (coverUrl.includes('assets.storytailor.dev')) {
        // Extract S3 key from CDN URL and construct S3 URL
        const cdnPath = coverUrl.replace('https://assets.storytailor.dev/', '');
        const { getAssetBucketName } = await import('./utils/cdnUrl');
        const bucketName = getAssetBucketName();
        coverS3Url = `https://${bucketName}.s3.amazonaws.com/${cdnPath}`;
      } else if (coverUrl.includes('s3.amazonaws.com')) {
        coverS3Url = coverUrl;
      } else {
        // Fallback: assume it's already an S3 URL or use as-is
        coverS3Url = coverUrl;
      }
      
      // V3 ENHANCEMENT: Extract cover colors (parallel with beat generation)
      // This happens in background while beats generate, colors saved at end
      const coverColorPromise = this.colorExtractionService.extractDeepContrastingColors(coverS3Url);
      
      // V2 PARITY FIX: Reference chain isolation
      // Source: V2 Image Flow lines 585-595
      // CRITICAL: Beats should ONLY see the cover image as reference, NOT previous beats
      // This maintains style consistency while forcing distinct pose variation
      // OLD (WRONG): progressiveReferences = [coverS3Url, beat1, beat2, beat3]
      // NEW (CORRECT): coverOnlyReferences = [coverS3Url] for ALL beats
      const coverOnlyReferences = [coverS3Url];  // V2 PARITY: Beats reference ONLY cover
      const previousPoses: string[] = ['Cover: opening scene'];

      // Determine which beats to generate based on mode (per plan)
      const beatsToGenerate = mode === 'progressive' 
        ? story.keyBeats.filter((beat: any) => !existingImages?.some((img: any) => img.beatNumber === beat.beatNumber))
        : story.keyBeats.slice(0, 4);

      for (let i = 0; i < beatsToGenerate.length; i++) {
        const beat = beatsToGenerate[i];
        const beatIndex = story.keyBeats.indexOf(beat);
        const paletteIndex = beatIndex + 1; // 1-4 (cover is 0)
        
        // V2 PARITY: Analyze beat scene for visual dynamism
        // Source: V2 Image Flow lines 188-201 (SECTION_SYS)
        // Uses GPT-4o to extract visually kinetic moments with cinematic camera work
        const beatSceneAnalysis = await this.analyzeSceneForVisualDynamism(
          beat.description || beat.visualDescription || '',
          `beat_${beatIndex + 1}`,
          false  // isCover = false
        );

        this.logger.info(`Beat ${beatIndex + 1} scene analysis complete`, {
          beatNumber: beat.beatNumber,
          analysisLength: beatSceneAnalysis.length
        });

        const beatPrompt = [
          `PROTAGONIST DNA: ${characterContext}`,

          `SCENE:\n${beatSceneAnalysis}`,

          `${this.buildMotifInstruction(motif)}`,

          `Palette note: ${paletteJourney[paletteIndex] || FALLBACK_PALETTE[paletteIndex] || FALLBACK_PALETTE[1]}`,

          `DISABILITY REPRESENTATION (CRITICAL):
- Mobility aids (wheelchairs, canes, walkers) are PART of the character, not obstacles
- In magical/flight scenes: character AND wheelchair fly together (wheels glowing, both airborne)
- NEVER show character separated from their mobility aid as "freedom"
- Wheelchair modifications for fantasy: glowing wheels, magical propulsion, transforming features
- Adventure happens WITH the aid, not despite it
- Prosthetics stay attached during action - they are part of the body
- Hearing aids, glasses, medical devices remain visible and integrated`,

          GLOBAL_STYLE
        ].join("\n\n");

        // Run contextual safety check
        const sanitizedBeatPrompt = await this.checkAndSanitizeArtPrompt(beatPrompt, characterTraits?.age || 7);

        this.logger.info(`Generating beat ${beatIndex + 1} with COVER-ONLY reference (V2 PARITY)`);
        
        // V2 PARITY FIX: Use ONLY cover as reference
        // Source: V2 Image Flow lines 585-595
        // OLD (WRONG): Used last 3 images including previous beats
        // NEW (CORRECT): Use ONLY cover image to maintain style but force pose variation
        // This prevents repetitive poses while maintaining visual consistency
        const beatReferences = coverOnlyReferences;  // V2 PARITY: Only the cover image

        const beatSize = '1024x1536';
        if (beatSize !== '1024x1536') {
          throw new Error('Beat size must be 1024x1536');
        }

        const beatResult = await this.generateImageWithReferences({
          prompt: withPoseAndFramingDirectives(sanitizedBeatPrompt),
          referenceUrls: beatReferences,  // V2 PARITY: Cover only, not progressive chain
          targetRating: 'G',
          characterName,
          expectedTraits: characterInclusivityTraits,
          maxRetries: 1, // Fewer retries for speed in stories (per plan)
          size: beatSize
        });
        
        beatImages.push({
          beatNumber: beat.beatNumber,
          imageUrl: beatResult.imageUrl,
          description: beat.visualDescription || beat.description,
          altText: beatResult.altText,
          timestamp: 0,
          traitsValidated: beatResult.traitsValidated
        });

        // V2 PARITY: Track pose descriptions for logging (not for references)
        // OLD (WRONG): Added beat images to reference chain
        // NEW (CORRECT): Only track for logging, beats always use cover-only references
        previousPoses.push(`Beat ${beatIndex + 1}: ${(beat.description || '').substring(0, 50)}`);

        // V3 ENHANCEMENT: Extract colors from beat image (parallel with next beat generation)
        // Convert CDN URL to S3 URL for color extraction
        let beatS3Url: string;
        if (beatResult.imageUrl.includes('assets.storytailor.dev')) {
          const cdnPath = beatResult.imageUrl.replace('https://assets.storytailor.dev/', '');
          const { getAssetBucketName } = await import('./utils/cdnUrl');
          const bucketName = getAssetBucketName();
          beatS3Url = `https://${bucketName}.s3.amazonaws.com/${cdnPath}`;
        } else if (beatResult.imageUrl.includes('s3.amazonaws.com')) {
          beatS3Url = beatResult.imageUrl;
        } else {
          beatS3Url = beatResult.imageUrl;
        }
        beatColorPromises.push(this.colorExtractionService.extractDeepContrastingColors(beatS3Url));

        // Update individual beat status in database for progressive loading
        const sceneKey = `scene_${beatIndex + 1}`;
        if (storyId && onProgress) {
          await onProgress(sceneKey, 'ready', { url: beatResult.imageUrl, progress: 100 });
        } else if (storyId) {
          // Fallback: Update database directly if onProgress not provided
          try {
            const { data: currentStory } = await this.supabase
              .from('stories')
              .select('asset_generation_status, scene_art_urls')
              .eq('id', storyId)
              .single();

            const currentStatus = currentStory?.asset_generation_status || {
              overall: 'generating',
              assets: {}
            };

            const currentUrls = currentStory?.scene_art_urls || [];
            const updatedUrls = [...currentUrls];
            // Ensure array has enough elements
            while (updatedUrls.length <= beatIndex) {
              updatedUrls.push(null);
            }
            updatedUrls[beatIndex] = beatResult.imageUrl;

            currentStatus.assets[sceneKey] = {
              status: 'ready',
              url: beatResult.imageUrl,
              progress: 100,
              completedAt: new Date().toISOString()
            };

            // Update overall status
            const assetStatuses = Object.values(currentStatus.assets);
            if (assetStatuses.every((a: any) => a.status === 'ready')) {
              currentStatus.overall = 'ready';
            } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'generating';
            }

            await this.supabase
              .from('stories')
              .update({
                asset_generation_status: currentStatus,
                // IMPORTANT: Preserve index positions (scene_1..scene_4) for realtime UX.
                // Do NOT filter out nulls, otherwise indexes shift and the frontend can show
                // the wrong scene image for a given beat.
                scene_art_urls: updatedUrls
              })
              .eq('id', storyId);

            this.logger.info(`Updated ${sceneKey} status in database`, { storyId, sceneKey, url: beatResult.imageUrl.substring(0, 60) });
          } catch (updateError) {
            this.logger.error(`Failed to update ${sceneKey} status in database`, { storyId, error: updateError });
          }
        }

        this.logger.info(`Beat ${beatIndex + 1} image generated with COVER-ONLY reference (V2 PARITY)`, {
          beatUrl: beatResult.imageUrl.substring(0, 60),
          referenceCount: beatReferences.length,  // V2 PARITY: Should be 1 (cover only)
          coverOnlyStrategy: true,  // V2 PARITY: Forces pose variation
          traitsValidated: beatResult.traitsValidated,
          attemptsUsed: beatResult.attemptsUsed
        });
      }

      // V3 ENHANCEMENT: Finalize color extraction (await all parallel extractions)
      // Extract colors from all 5 images (cover + 4 beats) and save to database
      if (storyId) {
        try {
          this.logger.info('Finalizing color extraction for all story images', { storyId });
          
          // Await all color extraction promises
          const [coverColors, ...beatColors] = await Promise.all([
            coverColorPromise,
            ...beatColorPromises
          ]);

          // Build V2-compatible 15-color palette structure
          const hueExtractedColors: Record<string, string> = {
            coverHex1: coverColors.primary,
            coverHex2: coverColors.secondary,
            coverHex3: coverColors.tertiary
          };

          const sceneKeys = ['sceneA', 'sceneB', 'sceneC', 'sceneD'] as const;
          for (let i = 0; i < Math.min(4, beatColors.length); i++) {
            const colors = beatColors[i];
            const sceneKey = sceneKeys[i];
            hueExtractedColors[`${sceneKey}Hex1`] = colors.primary;
            hueExtractedColors[`${sceneKey}Hex2`] = colors.secondary;
            hueExtractedColors[`${sceneKey}Hex3`] = colors.tertiary;
          }

          // Save to database
          await this.supabase
            .from('stories')
            .update({ hue_extracted_colors: hueExtractedColors })
            .eq('id', storyId);

          this.logger.info('Saved extracted colors to database', { 
            storyId,
            colorCount: Object.keys(hueExtractedColors).length
          });
        } catch (colorError) {
          this.logger.error('Failed to extract/save colors', { storyId, error: colorError });
          // Don't fail the whole operation if color extraction fails
        }
      }

      // Merge with existing images if progressive mode (per plan)
      if (mode === 'progressive' && existingImages) {
        const allImages = [...existingImages.map((img: any) => ({
          ...img,
          altText: img.altText,
          traitsValidated: img.traitsValidated
        })), ...beatImages];
        return {
          coverImageUrl: coverUrl,
          beatImages: allImages.sort((a, b) => a.beatNumber - b.beatNumber)
        };
      }

      return {
        coverImageUrl: coverUrl,
        beatImages
      };

    } catch (error) {
      this.logger.error('Multi-image generation failed', { error });
      // Fallback to single cover image
      return {
        coverImageUrl: 'https://via.placeholder.com/1024x1024?text=Story+Cover',
        beatImages: []
      };
    }
  }

  /**
   * Build character consistency context for visual continuity
   */
  private async buildCharacterConsistencyContext(characterName: string, characterTraits: any): Promise<string> {
    const age = characterTraits.age || 7;
    const species = characterTraits.species || 'human';
    const ethnicity = characterTraits.ethnicity || 'diverse, warm skin tone';
    const appearance = characterTraits.appearance || 'friendly, warm, approachable';
    const hairColor = characterTraits.hairColor || 'brown';
    const eyeColor = characterTraits.eyeColor || 'bright and expressive';

    // NEW: Include specific inclusivity trait details for story/beat persistence
    let inclusivitySection = '';
    if (characterTraits.inclusivityTraits && characterTraits.inclusivityTraits.length > 0) {
      try {
        const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
        
        inclusivitySection = '\n\nINCLUSIVITY TRAITS (CRITICAL - Visible in ALL images including action scenes):\n';
        
        characterTraits.inclusivityTraits.forEach((trait: any) => {
          const traitDef = INCLUSIVITY_TRAITS_MAP[trait.type || trait];
          if (traitDef) {
            inclusivitySection += `- ${traitDef.label}: ${traitDef.visualDescription}\n`;
            
            // Add key visual requirements for this trait
            if (traitDef.mandatoryVisualRequirements && traitDef.mandatoryVisualRequirements.length > 0) {
              const keyReqs = traitDef.mandatoryVisualRequirements.slice(0, 2); // Top 2 most critical
              inclusivitySection += `  Requirements: ${keyReqs.join('; ')}\n`;
            }
            
            // Add critical safety negatives for device traits
            if (traitDef.criticalSafetyNegatives && traitDef.criticalSafetyNegatives.length > 0) {
              inclusivitySection += `  !!! ${traitDef.criticalSafetyNegatives[0]}\n`;
            }
          }
        });
        
        inclusivitySection += '\nThese traits MUST remain visible even during dynamic action/emotion scenes.';
        inclusivitySection += '\nDo NOT lose traits when focusing on story action.';
      } catch (err) {
        this.logger.warn('Could not load inclusivity trait definitions', { error: err });
      }
    }

    return `CHARACTER DETAILS (EXACT consistency across ALL images):
Name: ${characterName}
Age: ${age} years old
Species: ${species}
Ethnicity: ${ethnicity}
Hair: ${hairColor}
Eyes: ${eyeColor}
Physical traits: ${appearance}${inclusivitySection}

CRITICAL: ${characterName} looks EXACTLY the same in cover + all 4 beats.
Visual consistency is paramount for therapeutic storytelling.`;
  }

  /**
   * Generate audio narration using ElevenLabs direct API with comprehensive error handling
   */
  private async generateAudioNarration(text: string, attempt: number = 1): Promise<string> {
    const narrationModelId = getModelForUseCase('story_narration')
    const MAX_RETRIES = narrationModelId === 'eleven_v3' ? 2 : 3
    const TIMEOUT_MS = narrationModelId === 'eleven_v3' ? 120000 : 30000 // v3 can be slower for long-form narration
    
    if (!this.elevenLabsConfig) {
      this.logger.warn('ElevenLabs not configured - no audio will be generated');
      return '';
    }

    try {
      this.logger.info('Generating audio with ElevenLabs', { 
        attempt,
        textLength: text.length,
        voiceId: this.elevenLabsConfig.voiceId
      });

      const narrationVoiceSettings = getVoiceSettingsForModel(narrationModelId)
      this.logger.info('ElevenLabs TTS request config', {
        attempt,
        modelId: narrationModelId,
        voiceSettings: narrationVoiceSettings,
      })
      
      // Call ElevenLabs API with timeout
      const controller = new AbortController()
      let timeoutId: NodeJS.Timeout | undefined
      const audioPromise = fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsConfig.voiceId}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsConfig.apiKey
          },
          body: JSON.stringify({
            text,
            // Use centralized model configuration for easy upgrades
            model_id: narrationModelId,
            voice_settings: narrationVoiceSettings
          })
        }
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort()
          reject(new Error(`Audio generation timeout after ${TIMEOUT_MS}ms`))
        }, TIMEOUT_MS);
      });

      const response = await Promise.race([audioPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ElevenLabs ${response.status}: ${errorBody}`);
      }

      // Get audio data
      const audioBuffer = await response.arrayBuffer();
      
      // Upload to S3
      const audioUrl = await this.uploadAudioToS3(Buffer.from(audioBuffer));
      
      this.logger.info('Audio generated successfully', { 
        audioUrl: audioUrl.substring(0, 60),
        sizeKB: (audioBuffer.byteLength / 1024).toFixed(2),
        attempt
      });
      
      return audioUrl;

    } catch (error: any) {
      this.logger.error('Audio generation failed', { 
        attempt,
        error: error.message,
        status: error.status
      });
      
      // Classify error and determine retry strategy
      const errorStatus = error.status || error.response?.status;
      const errorMessage = error.message?.toLowerCase() || '';
      
      // Don't retry authentication errors
      if (
        errorStatus === 401 ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('xi-api-key')
      ) {
        this.logger.error('ElevenLabs authentication failed - check API key');
        return '';
      }
      
      // Don't retry quota exceeded errors
      if (errorStatus === 402 || errorMessage.includes('quota')) {
        this.logger.error('ElevenLabs quota exceeded - check billing');
        return '';
      }
      
      // Rate limit - wait and retry
      if (errorStatus === 429 || errorMessage.includes('rate limit')) {
        if (attempt < MAX_RETRIES) {
          const delay = 30000; // Wait 30 seconds for rate limits
          this.logger.warn(`Rate limited by ElevenLabs, waiting ${delay}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateAudioNarration(text, attempt + 1);
        }
      }
      
      // Timeout or server error - retry with exponential backoff
      if (errorMessage.includes('timeout') || errorStatus >= 500) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
          this.logger.warn(`Audio ${errorMessage.includes('timeout') ? 'timed out' : 'server error'}, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateAudioNarration(text, attempt + 1);
        }
      }
      
      // Final fallback - graceful degradation (no audio)
      this.logger.error(`Audio generation failed after ${attempt} attempts - returning empty`, {
        finalError: error.message
      });
      return '';
    }
  }

  /**
   * Generate audio narration with word-level timestamps using ElevenLabs /with-timestamps endpoint
   * Returns audio URL, word timestamps, and 4 HTML blocks (a, b, c, d) for frontend highlighting
   */
  public async generateAudioNarrationWithTimestamps(
    storyContent: { beats: Array<{ id: string; content: string }> },
    attempt: number = 1
  ): Promise<{
    audioUrl: string;
    words: Array<{ txt: string; start: number; end: number }>;
    blocks: { a: string; b: string; c: string; d: string };
  }> {
    const narrationModelId = getModelForUseCase('story_narration');
    const MAX_RETRIES = narrationModelId === 'eleven_v3' ? 2 : 3;
    const TIMEOUT_MS = narrationModelId === 'eleven_v3' ? 180000 : 120000; // Longer timeout for with-timestamps
    
    if (!this.elevenLabsConfig) {
      this.logger.warn('ElevenLabs not configured - no audio will be generated');
      throw new Error('ElevenLabs not configured');
    }

    try {
      // Convert story beats to full narration text
      const fullText = storyContent.beats
        .map((beat, index) => {
          if (index > 0) return ` ... ${beat.content}`;
          return beat.content;
        })
        .join('');

      this.logger.info('Generating audio with timestamps', {
        attempt,
        textLength: fullText.length,
        voiceId: this.elevenLabsConfig.voiceId,
        beatCount: storyContent.beats.length
      });

      const narrationVoiceSettings = getVoiceSettingsForModel(narrationModelId);
      
      // Call ElevenLabs /with-timestamps endpoint
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;
      const audioPromise = fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsConfig.voiceId}/with-timestamps?output_format=mp3_44100_128`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsConfig.apiKey
          },
          body: JSON.stringify({
            text: fullText,
            model_id: narrationModelId,
            voice_settings: narrationVoiceSettings
          })
        }
      );

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error(`Audio generation timeout after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
      });

      const response = await Promise.race([audioPromise, timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ElevenLabs ${response.status}: ${errorBody}`);
      }

      // Parse response with alignment data
      const data = await response.json() as {
        audio_base64: string;
        alignment: {
          characters: string[];
          character_start_times_seconds: number[];
          character_end_times_seconds: number[];
        };
      };

      if (!data.audio_base64 || !data.alignment) {
        throw new Error('Missing audio_base64 or alignment in ElevenLabs response');
      }

      // Validate alignment arrays
      const chars = data.alignment.characters || [];
      const starts = data.alignment.character_start_times_seconds || [];
      const ends = data.alignment.character_end_times_seconds || [];

      if (chars.length !== starts.length || chars.length !== ends.length) {
        throw new Error('Alignment arrays have mismatched lengths');
      }

      // Convert base64 audio to buffer and upload to S3
      const audioBuffer = Buffer.from(data.audio_base64, 'base64');
      const audioUrl = await this.uploadAudioToS3(audioBuffer);

      // Parse character-level timestamps into word-level timestamps
      const words: Array<{ txt: string; start: number; end: number }> = [];
      let currentWord = '';
      let wordStart = 0;
      let lastNonSpaceIndex = -1;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const start = starts[i];
        const end = ends[i];

        if (char === ' ') {
          // End of word - use last non-space character's end time
          if (currentWord && lastNonSpaceIndex >= 0) {
            words.push({
              txt: currentWord,
              start: wordStart,
              end: ends[lastNonSpaceIndex]
            });
            currentWord = '';
            lastNonSpaceIndex = -1;
          }
        } else {
          // Start of new word
          if (!currentWord) {
            wordStart = start;
          }
          currentWord += char;
          lastNonSpaceIndex = i;
        }
      }

      // Handle last word
      if (currentWord && lastNonSpaceIndex >= 0) {
        words.push({
          txt: currentWord,
          start: wordStart,
          end: ends[lastNonSpaceIndex]
        });
      }

      // Split words into 4 HTML blocks (a, b, c, d) based on story beats
      // Reconstruct the full text from characters to map words to beats accurately
      const reconstructedText = chars.join('');
      
      // Calculate beat boundaries in the reconstructed text
      // Beats are separated by " ... " (5 characters: space, 3 dots, space)
      const beatKeys = ['a', 'b', 'c', 'd'] as const;
      const blocks: { a: string; b: string; c: string; d: string } = {
        a: '',
        b: '',
        c: '',
        d: ''
      };

      // Reconstruct words from characters to match with beat text
      const reconstructedWords: string[] = [];
      let reconstructedWord = '';
      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === ' ') {
          if (reconstructedWord) {
            reconstructedWords.push(reconstructedWord);
            reconstructedWord = '';
          }
        } else {
          reconstructedWord += chars[i];
        }
      }
      if (reconstructedWord) {
        reconstructedWords.push(reconstructedWord);
      }

      // Map words to beats by finding which beat's text contains each word
      // We'll match words to beats by checking if the word appears in the beat's text
      let wordIndex = 0;
      for (let beatIndex = 0; beatIndex < storyContent.beats.length && beatIndex < beatKeys.length; beatIndex++) {
        const beat = storyContent.beats[beatIndex];
        const beatText = beat.content.toLowerCase();
        const beatWords: string[] = beatText.split(/\s+/).filter(w => w.length > 0);
        
        // Find words that belong to this beat
        // Match words sequentially to the beat's words
        let beatWordIndex = 0;
        while (wordIndex < words.length && beatWordIndex < beatWords.length) {
          const word = words[wordIndex];
          const wordLower = word.txt.toLowerCase().replace(/[.,!?;:]/g, '');
          const beatWord = beatWords[beatWordIndex].replace(/[.,!?;:]/g, '');
          
          // Check if this word matches the current beat word (allowing for punctuation differences)
          if (wordLower === beatWord || wordLower.startsWith(beatWord) || beatWord.startsWith(wordLower)) {
            const blockKey = beatKeys[beatIndex];
            const wordSpan = `<span data-start="${word.start.toFixed(3)}" data-end="${word.end.toFixed(3)}">${word.txt}</span> `;
            blocks[blockKey] += wordSpan;
            wordIndex++;
            beatWordIndex++;
          } else {
            // Word doesn't match - might be a separator or punctuation, skip it
            wordIndex++;
          }
        }
      }

      // Handle any remaining words (fallback - assign to last block)
      while (wordIndex < words.length) {
        const word = words[wordIndex];
        const lastBlockKey = beatKeys[Math.min(storyContent.beats.length - 1, beatKeys.length - 1)];
        const wordSpan = `<span data-start="${word.start.toFixed(3)}" data-end="${word.end.toFixed(3)}">${word.txt}</span> `;
        blocks[lastBlockKey] += wordSpan;
        wordIndex++;
      }

      this.logger.info('Audio with timestamps generated successfully', {
        audioUrl: audioUrl.substring(0, 60),
        wordCount: words.length,
        sizeKB: (audioBuffer.length / 1024).toFixed(2),
        attempt
      });

      return {
        audioUrl,
        words,
        blocks
      };

    } catch (error: any) {
      this.logger.error('Audio generation with timestamps failed', {
        attempt,
        error: error.message,
        status: error.status
      });

      // Classify error and determine retry strategy
      const errorStatus = error.status || error.response?.status;
      const errorMessage = error.message?.toLowerCase() || '';

      // Don't retry authentication errors
      if (
        errorStatus === 401 ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('xi-api-key')
      ) {
        this.logger.error('ElevenLabs authentication failed - check API key');
        throw new Error('ElevenLabs authentication failed');
      }

      // Don't retry quota exceeded errors
      if (errorStatus === 402 || errorMessage.includes('quota')) {
        this.logger.error('ElevenLabs quota exceeded - check billing');
        throw new Error('ElevenLabs quota exceeded');
      }

      // Rate limit - wait and retry
      if (errorStatus === 429 || errorMessage.includes('rate limit')) {
        if (attempt < MAX_RETRIES) {
          const delay = 30000; // Wait 30 seconds for rate limits
          this.logger.warn(`Rate limited by ElevenLabs, waiting ${delay}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateAudioNarrationWithTimestamps(storyContent, attempt + 1);
        }
      }

      // Timeout or server error - retry with exponential backoff
      if (errorMessage.includes('timeout') || errorStatus >= 500) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
          this.logger.warn(`Audio ${errorMessage.includes('timeout') ? 'timed out' : 'server error'}, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.generateAudioNarrationWithTimestamps(storyContent, attempt + 1);
        }
      }

      // Final fallback - throw error
      this.logger.error(`Audio generation with timestamps failed after ${attempt} attempts`, {
        finalError: error.message
      });
      throw error;
    }
  }

  /**
   * Generate WebVTT-compatible timestamps for beat images
   */
  private generateImageTimestamps(
    storyContent: string,
    beatImages: Array<{ beatNumber: number; imageUrl: string; description: string }>
  ): any {
    // Calculate approximate story duration based on character count
    // Average reading speed: ~150 words/minute for children's stories
    // Average: 5 characters per word
    const estimatedDurationSeconds = Math.ceil((storyContent.length / 5) / 150 * 60);
    
    // Distribute beat images evenly across the story duration
    const timestamps: Array<{
      beatNumber: number;
      imageUrl: string;
      description: string;
      startTimeMs: number;
      endTimeMs: number;
    }> = [];
    const totalBeats = beatImages.length;
    
    beatImages.forEach((beat, index) => {
      const percentageThrough = (index + 1) / (totalBeats + 1); // +1 to avoid ending at 100%
      const timestampMs = Math.floor(percentageThrough * estimatedDurationSeconds * 1000);
      
      timestamps.push({
        beatNumber: beat.beatNumber,
        imageUrl: beat.imageUrl,
        description: beat.description,
        startTimeMs: timestampMs,
        endTimeMs: index < totalBeats - 1 
          ? Math.floor(((index + 2) / (totalBeats + 1)) * estimatedDurationSeconds * 1000)
          : estimatedDurationSeconds * 1000
      });
    });

    return {
      estimatedDurationSeconds,
      beatTimestamps: timestamps
    };
  }

  /**
   * Persist image buffer directly to S3 (for URL images from gpt-image-1)
   * Returns CDN URL (assets.storytailor.dev) instead of direct S3 URL
   */
  private async persistImageToS3Direct(imageBuffer: Buffer, title: string): Promise<string> {
    return this.persistImageToS3DirectWithCdn(imageBuffer, title);
  }

  /**
   * Internal method to upload image and return CDN URL
   */
  private async persistImageToS3DirectWithCdn(imageBuffer: Buffer, title: string): Promise<string> {
    try {
      // Upload to S3
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
      
      // Get S3 configuration from environment variables
      const bucketName = getAssetBucketName();
      const region = process.env.AWS_REGION || 'us-east-1';
      
      const s3Client = new S3Client({ region });
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const key = `images/${sanitizedTitle}-${Date.now()}.png`;
      
      this.logger.info('Uploading image to S3', { bucket: bucketName, key, sizeKB: (imageBuffer.length / 1024).toFixed(2) });

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000' // 1 year
      }));

      // Return CDN URL instead of direct S3 URL
      const cdnUrl = getCdnUrl(key);
      this.logger.info('Image persisted to S3 successfully', { 
        s3Key: key,
        cdnUrl: cdnUrl.substring(0, 80),
        bucket: bucketName
      });
      return cdnUrl;

    } catch (error) {
      this.logger.error('S3 upload failed', { 
        error: error instanceof Error ? error.message : String(error),
        title
      });
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download image from URL and persist to S3 (for URL-based responses)
   * Returns CDN URL (assets.storytailor.dev) instead of direct S3 URL
   */
  private async persistImageToS3(imageUrl: string, title: string): Promise<string> {
    try {
      // Download image from OpenAI
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      // Upload to S3
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
      const s3Client = new S3Client({ region: this.config.s3?.region || 'us-east-1' });
      const bucketName = getAssetBucketName();
      const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const key = `covers/${sanitizedTitle}-${Date.now()}.png`;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/png',
        CacheControl: 'public, max-age=31536000' // 1 year
      }));

      // Return CDN URL instead of direct S3 URL
      const cdnUrl = getCdnUrl(key);
      this.logger.info('Image persisted to S3', { 
        s3Key: key,
        cdnUrl: cdnUrl.substring(0, 80),
        bucket: bucketName
      });
      return cdnUrl;

    } catch (error) {
      this.logger.error('Image persistence failed, returning temporary URL', { error });
      // Return original URL as fallback
      return imageUrl;
    }
  }

  /**
   * Upload audio buffer to S3
   */
  private containsDialogue(content: string): boolean {
    return /"[^"]+"\s*(?:said|asked|replied|exclaimed|whispered|murmured|shouted|laughed|cried)/i.test(content);
  }

  private async uploadAudioToS3(audioBuffer: Buffer): Promise<string> {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({ region: this.config.s3?.region || 'us-east-1' });
      const bucketName = this.config.s3?.bucketName || 'storytailor-audio';
      const key = `stories/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: audioBuffer,
        ContentType: 'audio/mpeg'
      }));

      // Return persistent object URL (bucket must allow read or be served via CloudFront)
      return `https://${bucketName}.s3.amazonaws.com/${key}`;

    } catch (error) {
      this.logger.error('S3 upload failed', { error });
      throw error
    }
  }

  /**
   * Get or create default library for user with proper UUID
   */
  private async getOrCreateDefaultLibrary(userId: string): Promise<string> {
    try {
      // Validate if userId is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = uuidRegex.test(userId);
      
      if (!isValidUUID) {
        throw new Error('Invalid userId: must be a UUID to persist stories')
      }
      
      // Try to get existing library for this user
      const { data: existingLib } = await this.supabase
        .from('libraries')
        .select('id')
        .eq('owner', userId)
        .limit(1)
        .maybeSingle();
      
      if (existingLib?.id) {
        this.logger.info('Using existing library', { libraryId: existingLib.id, userId });
        return existingLib.id;
      }
      
      // No existing library - create one
      this.logger.info('Creating new library for user', { userId });
      
      const { data: newLib, error: insertError } = await this.supabase
        .from('libraries')
        .insert({
          owner: userId,
          name: 'My Stories',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (insertError || !newLib?.id) {
        throw new Error(`Failed to create library: ${insertError?.message || 'unknown error'}`)
      }
      
      this.logger.info('Created new library', { libraryId: newLib.id, userId });
      return newLib.id;
      
    } catch (error) {
      this.logger.error('Library lookup/create failed', { error, userId });
      throw error
    }
  }

  /**
   * Save story to Supabase database (matching actual schema)
   */
  private async saveStoryToDatabase(data: {
    userId: string;
    creatorUserId?: string;  // CRITICAL: Track creator for quota attribution
    sessionId: string;
    title: string;
    content: string;
    coverImageUrl: string;
    audioUrl: string;
    metadata: any;
    status: 'draft' | 'final';
    finalizedAt: string | null;
  }): Promise<{ id: string }> {
    try {
      // First, we need a library_id with proper UUID format
      const libraryId = data.metadata.libraryId || await this.getOrCreateDefaultLibrary(data.userId);
      
      // Insert story (schema: id, library_id, title, content, status, age_rating, created_at, finalized_at)
      const { data: savedStory, error: storyError } = await this.supabase
        .from('stories')
        .insert({
          library_id: libraryId,
          creator_user_id: data.creatorUserId || data.userId,  // CRITICAL: Track creator for quota attribution
          title: data.title,
          content: {
            text: data.content,
            metadata: data.metadata,
            coverImageUrl: data.coverImageUrl,
            audioUrl: data.audioUrl,
            beatImages: [],
          },
          status: data.status,
          age_rating: data.metadata.userAge || 7,
          created_at: new Date().toISOString(),
          finalized_at: data.finalizedAt
        })
        .select()
        .single();

      if (storyError) {
        this.logger.error('Story save failed with Supabase error', {
          error: storyError,
          message: storyError.message,
          code: storyError.code,
          details: storyError.details,
          hint: storyError.hint,
          libraryId,
          userId: data.userId,
          creatorUserId: data.creatorUserId || data.userId,
          title: data.title
        });
        throw new Error(`Story save failed: ${storyError.message} (code: ${storyError.code})`)
      }

      const storyId = savedStory.id;

      this.logger.info('Story and assets saved to Supabase', { storyId });
      return { id: storyId };

    } catch (error: any) {
      this.logger.error('Failed to save story to database', {
        error: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        libraryId: data.metadata?.libraryId,
        userId: data.userId,
        creatorUserId: data.creatorUserId || data.userId
      });
      throw error
    }
  }

  private computeStoryVersionHash(input: {
    title: string
    content: string
    keyBeats: Array<{
      beatNumber: number
      description: string
      visualDescription: string
      characterState: string
      emotionalTone: string
    }>
    characterName: string
    characterTraits: Record<string, unknown>
    storyType: string
    userAge: number
  }): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex')
  }

  private computeAssetHashes(input: {
    title: string
    content: string
    keyBeats: Array<{
      beatNumber: number
      description: string
      visualDescription: string
      characterState: string
      emotionalTone: string
    }>
    characterName: string
    storyType: string
  }): { coverHash: string; beatHashes: [string, string, string, string]; audioHash: string } {
    const beatText = (idx: number): string =>
      String(input.keyBeats?.[idx]?.visualDescription || input.keyBeats?.[idx]?.description || '')

    // Cover should remain stable unless title/character/storyType/opening visual changes materially.
    const coverHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          title: input.title,
          storyType: input.storyType,
          characterName: input.characterName,
          openingVisual: beatText(0),
        })
      )
      .digest('hex')

    // Beat hashes are per-beat so edits only regenerate impacted beats.
    const beatHashes = ([0, 1, 2, 3] as const).map((idx) =>
      crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            title: input.title,
            characterName: input.characterName,
            beatNumber: idx + 1,
            visual: beatText(idx),
          })
        )
        .digest('hex')
    ) as unknown as [string, string, string, string]

    // Audio depends on story text (plus title/character for stability against minor formatting diffs).
    const audioHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ title: input.title, characterName: input.characterName, content: input.content }))
      .digest('hex')

    return { coverHash, beatHashes, audioHash }
  }

  private async enqueueFinalizationJob(payload: FinalizationJobPayload): Promise<void> {
    const enabled = process.env.ASSET_FINALIZATION_ENABLED === 'true'
    if (!enabled) return

    const queueUrl = process.env.ASSET_FINALIZATION_QUEUE_URL || process.env.FINALIZATION_QUEUE_URL
    if (!queueUrl) {
      throw new Error('ASSET_FINALIZATION_QUEUE_URL not configured')
    }

    const { SQSClient, SendMessageCommand } = await import('@aws-sdk/client-sqs')
    const sqs = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' })
    const correlationId = `${payload.storyId}:${payload.storyVersionHash.slice(0, 12)}`

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(payload),
        MessageAttributes: {
          correlationId: { DataType: 'String', StringValue: correlationId },
          storyId: { DataType: 'String', StringValue: payload.storyId },
          storyVersionHash: { DataType: 'String', StringValue: payload.storyVersionHash },
        },
      })
    )
  }

  async processFinalizationJob(payload: FinalizationJobPayload): Promise<void> {
    // Fetch current story content to ensure job isn't stale
    const { data: storyRow, error } = await this.supabase
      .from('stories')
      .select('content')
      .eq('id', payload.storyId)
      .single()

    if (error || !storyRow) {
      throw new Error(`Story not found for finalization job: ${payload.storyId}`)
    }

    const contentObj = storyRow.content || {}
    const metadata = contentObj.metadata || {}
    const currentStoryVersionHash = typeof metadata.storyVersionHash === 'string' ? metadata.storyVersionHash : ''
    if (currentStoryVersionHash && currentStoryVersionHash !== payload.storyVersionHash) {
      this.logger.warn('Skipping stale finalization job (story version changed)', {
        storyId: payload.storyId,
        jobStoryVersionHash: payload.storyVersionHash,
        currentStoryVersionHash,
      })
      return
    }

    const requiredCover = payload.requiredAssets.cover
    const requiredBeats = payload.requiredAssets.beats
    const requiredAudio = payload.requiredAssets.audio

    // Ensure we have enough key beats for required beat images.
    if (requiredBeats > 0) {
    const storyText = typeof contentObj.text === 'string' ? contentObj.text : ''
    const existingKeyBeats = Array.isArray(metadata.keyBeats) ? metadata.keyBeats : []
      if (existingKeyBeats.length < requiredBeats) {
      const generatedKeyBeats = await this.generateKeyBeatsFromStoryText(storyText)
      await this.updateStoryMetadata(payload.storyId, { keyBeats: generatedKeyBeats })
      }
    }

    // Always reload latest story snapshot between steps to improve continuity
    let story = await this.getStoredStory(payload.storyId)
    const characterName = story.characterName || 'our hero'
    const characterTraits = metadata.characterTraits || {}

    // Cover
    if (requiredCover && !story.coverImageUrl) {
      const coverImageUrl = await this.generateCoverOnly(story.title, characterName, characterTraits)
      if (!coverImageUrl) throw new Error('Cover generation failed (empty URL)')
      await this.updateStoryCover(payload.storyId, coverImageUrl)
      story = await this.getStoredStory(payload.storyId)
    }

    // Beats 1..requiredBeats
    if (requiredBeats > 0) {
      for (let beatNumber = 1; beatNumber <= requiredBeats; beatNumber++) {
        const hasBeat =
          Array.isArray(story.beatImages) &&
          story.beatImages.some((b: any) => b?.beatNumber === beatNumber && b?.imageUrl)
      if (!hasBeat) {
        const beatImageUrl = await this.generateBeatImageOnly(payload.storyId, beatNumber, story, characterTraits)
        if (!beatImageUrl) throw new Error(`Beat ${beatNumber} generation failed (empty URL)`)
        await this.updateStoryBeatImage(payload.storyId, beatNumber, beatImageUrl, story)
        story = await this.getStoredStory(payload.storyId)
        }
      }
    }

    // Audio (ElevenLabs with Polly fallback; optional chunking)
    if (requiredAudio && !story.audioUrl) {
      const audio = await this.generateLongFormAudioWithFallback(story.content)
      if (audio.audioUrl) {
        await this.updateStoryAudioUrl(payload.storyId, audio.audioUrl)
        const metadataPatch: Record<string, unknown> = { audioProvider: audio.provider }
        if (audio.segments && audio.segments.length > 0) {
          metadataPatch.audioSegments = audio.segments
        }
        await this.updateStoryMetadata(payload.storyId, metadataPatch)
        story = await this.getStoredStory(payload.storyId)
      } else {
        await this.markAudioFailed(payload.storyId, audio.error || 'unknown audio generation failure')
      }
    }

    await this.updateAssetsStatusMetadata(payload.storyId)
    this.logger.info('Finalization job completed', { storyId: payload.storyId })
  }

  private async generateKeyBeatsFromStoryText(storyText: string): Promise<Array<{
    beatNumber: number
    description: string
    visualDescription: string
    characterState: string
    emotionalTone: string
  }>> {
    if (!storyText.trim()) {
      throw new Error('Cannot generate key beats: story text is empty')
    }

    const system = `You extract 4 key visual beats from a children's story.
Return STRICT JSON only. Exactly 4 beats, beatNumber 1..4.
Each beat must be a vivid, image-ready moment with a detailed visualDescription.`

    const user = `Story text:\n${storyText}\n\nReturn JSON like:\n{\n  \"keyBeats\": [\n    {\"beatNumber\":1,\"description\":\"...\",\"visualDescription\":\"...\",\"characterState\":\"...\",\"emotionalTone\":\"...\"},\n    {\"beatNumber\":2,\"description\":\"...\",\"visualDescription\":\"...\",\"characterState\":\"...\",\"emotionalTone\":\"...\"},\n    {\"beatNumber\":3,\"description\":\"...\",\"visualDescription\":\"...\",\"characterState\":\"...\",\"emotionalTone\":\"...\"},\n    {\"beatNumber\":4,\"description\":\"...\",\"visualDescription\":\"...\",\"characterState\":\"...\",\"emotionalTone\":\"...\"}\n  ]\n}`

    const response = await this.openai.chat.completions.create({
      model: this.config.openai.model || 'gpt-5',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No key beat content generated')

    const parsed = JSON.parse(content)
    const keyBeats = parsed?.keyBeats
    if (!Array.isArray(keyBeats) || keyBeats.length !== 4) {
      throw new Error('Key beats response invalid: expected 4 beats')
    }

    const normalized = keyBeats.map((b: any, idx: number) => ({
      beatNumber: Number(b?.beatNumber ?? idx + 1),
      description: String(b?.description ?? ''),
      visualDescription: String(b?.visualDescription ?? b?.description ?? ''),
      characterState: String(b?.characterState ?? ''),
      emotionalTone: String(b?.emotionalTone ?? ''),
    }))

    for (let i = 0; i < 4; i++) {
      const b = normalized[i]
      if (b.beatNumber !== i + 1) b.beatNumber = i + 1
      if (!b.description || !b.visualDescription) {
        throw new Error(`Key beats response invalid: missing fields for beat ${i + 1}`)
      }
    }

    return normalized
  }

  private async generateLongFormAudioWithFallback(text: string): Promise<{
    audioUrl: string
    provider: 'elevenlabs' | 'polly' | 'native_tts'
    segments?: Array<{ index: number; url: string; provider: 'elevenlabs' | 'polly' }>
    error?: string
  }> {
    const forcedProvider = (process.env.LONGFORM_NARRATION_PROVIDER || '').toLowerCase()
    const chunkingEnabled = process.env.AUDIO_CHUNKING_ENABLED === 'true'
    if (chunkingEnabled) {
      return await this.generateChunkedAudioWithFallback(text, forcedProvider)
    }

    // 1) ElevenLabs (single-shot) unless provider is forced away
    if (!forcedProvider || forcedProvider === 'elevenlabs') {
      try {
        const audioUrl = await this.generateAudioNarration(text)
        if (audioUrl) return { audioUrl, provider: 'elevenlabs' }
      } catch (error: any) {
        this.logger.warn('ElevenLabs narration failed; will attempt Polly fallback', { error: error?.message || String(error) })
      }
    }

    // 2) Polly (single-shot)
    if (!forcedProvider || forcedProvider === 'polly' || forcedProvider === 'elevenlabs') {
      try {
        const audioBuffer = await this.synthesizePollyMp3(text)
        const audioUrl = await this.uploadAudioToS3(audioBuffer)
        return { audioUrl, provider: 'polly' }
      } catch (error: any) {
        this.logger.error('Polly narration fallback failed', { error: error?.message || String(error) })
        return { audioUrl: '', provider: 'native_tts', error: error?.message || String(error) }
      }
    }

    return { audioUrl: '', provider: 'native_tts', error: `Unsupported LONGFORM_NARRATION_PROVIDER: ${forcedProvider}` }
  }

  private chunkText(text: string, targetChars: number, hardMaxChars: number): string[] {
    const normalized = text.replace(/\r\n/g, '\n').trim()
    if (!normalized) return []

    const paragraphs = normalized
      .split(/\n\s*\n/g)
      .map(p => p.trim())
      .filter(Boolean)

    const chunks: string[] = []
    let current = ''

    const pushCurrent = () => {
      const trimmed = current.trim()
      if (trimmed) chunks.push(trimmed)
      current = ''
    }

    const pushWithHardLimit = (block: string) => {
      const t = block.trim()
      if (!t) return
      if (t.length <= hardMaxChars) {
        chunks.push(t)
        return
      }
      for (let i = 0; i < t.length; i += hardMaxChars) {
        chunks.push(t.slice(i, i + hardMaxChars))
      }
    }

    for (const p of paragraphs) {
      const candidate = current ? `${current}\n\n${p}` : p
      if (candidate.length <= targetChars) {
        current = candidate
        continue
      }

      // Candidate too large; flush current and handle this paragraph
      pushCurrent()
      if (p.length <= hardMaxChars) {
        current = p
      } else {
        pushWithHardLimit(p)
      }
    }
    pushCurrent()

    return chunks
  }

  private async generateChunkedAudioWithFallback(text: string, forcedProvider: string): Promise<{
    audioUrl: string
    provider: 'elevenlabs' | 'polly' | 'native_tts'
    segments?: Array<{ index: number; url: string; provider: 'elevenlabs' | 'polly' }>
    error?: string
  }> {
    // Keep chunks within Polly-safe bounds; ElevenLabs can handle larger but this keeps behavior consistent.
    const chunks = this.chunkText(text, 2200, 2600)
    if (chunks.length === 0) return { audioUrl: '', provider: 'native_tts', error: 'No text to synthesize' }

    const segments: Array<{ index: number; url: string; provider: 'elevenlabs' | 'polly' }> = []

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]

      // Prefer ElevenLabs per chunk unless forced to Polly
      if (!forcedProvider || forcedProvider === 'elevenlabs') {
      try {
        const url = await this.generateAudioNarration(chunkText)
        if (url) {
          segments.push({ index: i, url, provider: 'elevenlabs' })
          continue
        }
      } catch (error: any) {
        this.logger.warn('ElevenLabs chunk narration failed; falling back to Polly', { index: i, error: error?.message || String(error) })
        }
      }

      // Polly fallback per chunk
      if (!forcedProvider || forcedProvider === 'polly' || forcedProvider === 'elevenlabs') {
      try {
        const buffer = await this.synthesizePollyMp3(chunkText)
        const url = await this.uploadAudioToS3(buffer)
        segments.push({ index: i, url, provider: 'polly' })
          continue
      } catch (error: any) {
        return {
          audioUrl: '',
          provider: 'native_tts',
          segments,
          error: `Failed to synthesize chunk ${i}: ${error?.message || String(error)}`,
        }
        }
      }

      return {
        audioUrl: '',
        provider: 'native_tts',
        segments,
        error: `Unsupported LONGFORM_NARRATION_PROVIDER for chunking: ${forcedProvider}`,
      }
    }

    return {
      audioUrl: segments[0]?.url || '',
      provider: segments[0]?.provider || 'native_tts',
      segments,
    }
  }

  private async synthesizePollyMp3(text: string): Promise<Buffer> {
    const { PollyClient, SynthesizeSpeechCommand } = await import('@aws-sdk/client-polly')
    const polly = new PollyClient({ region: process.env.AWS_REGION || this.config.s3?.region || 'us-east-1' })

    const result = await polly.send(
      new SynthesizeSpeechCommand({
        OutputFormat: 'mp3',
        Text: text,
        TextType: 'text',
        VoiceId: 'Joanna',
        Engine: 'neural',
      })
    )

    const audioStream: any = (result as any).AudioStream
    if (!audioStream) throw new Error('Polly returned no AudioStream')

    const chunks: Buffer[] = []
    for await (const chunk of audioStream as any) {
      if (Buffer.isBuffer(chunk)) chunks.push(chunk)
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk))
      else chunks.push(Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  private async updateStoryMetadata(storyId: string, patch: Record<string, unknown>): Promise<void> {
    const { data: currentStory, error: readError } = await this.supabase
      .from('stories')
      .select('content')
      .eq('id', storyId)
      .single()

    if (readError || !currentStory) {
      this.logger.error('Failed to read story for metadata patch', { storyId, error: readError })
      return
    }

    const contentObj = currentStory.content || {}
    const metadata = contentObj.metadata || {}
    const updatedContent = {
      ...contentObj,
      metadata: {
        ...metadata,
        ...patch,
      },
    }

    const { error: updateError } = await this.supabase
      .from('stories')
      .update({ content: updatedContent })
      .eq('id', storyId)

    if (updateError) {
      this.logger.error('Failed to patch story metadata', { storyId, error: updateError })
    }
  }

  private async markAudioFailed(storyId: string, reason: string): Promise<void> {
    const { data: currentStory, error: readError } = await this.supabase
      .from('stories')
      .select('content')
      .eq('id', storyId)
      .single()

    if (readError || !currentStory) {
      this.logger.error('Failed to read story for audio failure mark', { storyId, error: readError })
      return
    }

    const contentObj = currentStory.content || {}
    const metadata = contentObj.metadata || {}
    const existingAssetsStatus = metadata.assetsStatus || {}
    const nextAssetsStatus = {
      ...existingAssetsStatus,
      audio: 'failed',
    }
    const updatedContent = {
      ...contentObj,
      metadata: {
        ...metadata,
        assetsStatus: nextAssetsStatus,
        audioProvider: 'native_tts',
        audioFailureReason: reason,
        audioFailedAt: new Date().toISOString(),
      },
    }

    const { error: updateError } = await this.supabase
      .from('stories')
      .update({ content: updatedContent })
      .eq('id', storyId)

    if (updateError) {
      this.logger.error('Failed to mark audio as failed', { storyId, error: updateError })
    }
  }

  private async updateStoryAudioUrl(storyId: string, audioUrl: string): Promise<void> {
    try {
      if (this.tempStoryCache.has(storyId)) {
        const tempStory = this.tempStoryCache.get(storyId)
        tempStory.audioUrl = audioUrl
        this.tempStoryCache.set(storyId, tempStory)
        return
      }

      const { data: currentStory, error: readError } = await this.supabase
        .from('stories')
        .select('content')
        .eq('id', storyId)
        .single()

      if (readError) {
        this.logger.error('Failed to read story before audio update', { storyId, error: readError })
        return
      }

      const currentContent = currentStory?.content || {}
      const updatedContent = {
        ...currentContent,
        audioUrl,
      }

      const { error: updateError } = await this.supabase
        .from('stories')
        .update({ content: updatedContent })
        .eq('id', storyId)

      if (updateError) {
        this.logger.error('Failed to update audio in database', { storyId, error: updateError })
      }
    } catch (error: any) {
      this.logger.error('updateStoryAudioUrl failed', { storyId, error: error.message })
    }
  }

  private async updateAssetsStatusMetadata(storyId: string): Promise<AssetsStatus | null> {
    const { data: currentStory, error: readError } = await this.supabase
      .from('stories')
      .select('content')
      .eq('id', storyId)
      .single()

    if (readError || !currentStory) {
      this.logger.error('Failed to read story for assetsStatus update', { storyId, error: readError })
      return null
    }

    const contentObj = currentStory.content || {}
    const metadata = contentObj.metadata || {}
    const existingAssetsStatus = metadata.assetsStatus || {}
    const beatImages = Array.isArray(contentObj.beatImages) ? contentObj.beatImages : []
    const coverImageUrl = typeof contentObj.coverImageUrl === 'string' ? contentObj.coverImageUrl : ''
    const audioUrl = typeof contentObj.audioUrl === 'string' ? contentObj.audioUrl : ''

    const assetsStatus: AssetsStatus = {
      cover: existingAssetsStatus.cover === 'failed' ? 'failed' : (coverImageUrl ? 'ready' : 'pending'),
      beats: [
        existingAssetsStatus.beats?.[0] === 'failed' ? 'failed' : (beatImages.some((b: any) => b?.beatNumber === 1 && b?.imageUrl) ? 'ready' : 'pending'),
        existingAssetsStatus.beats?.[1] === 'failed' ? 'failed' : (beatImages.some((b: any) => b?.beatNumber === 2 && b?.imageUrl) ? 'ready' : 'pending'),
        existingAssetsStatus.beats?.[2] === 'failed' ? 'failed' : (beatImages.some((b: any) => b?.beatNumber === 3 && b?.imageUrl) ? 'ready' : 'pending'),
        existingAssetsStatus.beats?.[3] === 'failed' ? 'failed' : (beatImages.some((b: any) => b?.beatNumber === 4 && b?.imageUrl) ? 'ready' : 'pending'),
      ],
      audio: existingAssetsStatus.audio === 'failed' ? 'failed' : (audioUrl ? 'ready' : 'pending'),
    }

    const updatedContent = {
      ...contentObj,
      metadata: {
        ...metadata,
        assetsStatus,
      },
    }

    const { error: updateError } = await this.supabase
      .from('stories')
      .update({ content: updatedContent })
      .eq('id', storyId)

    if (updateError) {
      this.logger.error('Failed to update assetsStatus metadata in database', { storyId, error: updateError })
      return null
    }

    return assetsStatus
  }

  /**
   * Generate character voices for a story using ElevenLabs Voice Design
   */
  async generateStoryCharacterVoices(
    storyId: string,
    storyType: string,
    characterNames: string[],
    characterPersonalities?: Map<string, string>
  ): Promise<any> {
    try {
      this.logger.info('Generating character voices for story', {
        storyId,
        storyType,
        characterCount: characterNames.length
      });

      // Generate voices using CharacterVoiceManager
      const storyVoiceProfile = await this.characterVoiceManager.generateStoryVoices(
        storyId,
        storyType as 'adventure' | 'bedtime' | 'educational' | 'fantasy',
        characterNames,
        characterPersonalities
      );

      this.logger.info('Character voices generated successfully', {
        storyId,
        characterCount: storyVoiceProfile.characters.length,
        narratorVoiceId: storyVoiceProfile.narratorVoiceId
      });

      return storyVoiceProfile;

    } catch (error) {
      this.logger.error('Character voice generation failed', { error });
      throw error;
    }
  }

  /**
   * Create a quick character voice for testing
   */
  async createQuickCharacterVoice(
    characterName: string,
    personality: string,
    storyType: string
  ): Promise<string> {
    try {
      this.logger.info('Creating quick character voice', {
        characterName,
        personality,
        storyType
      });

      const voiceId = await this.characterVoiceManager.createQuickCharacterVoice(
        characterName,
        personality,
        storyType
      );

      this.logger.info('Quick character voice created', {
        characterName,
        voiceId
      });

      return voiceId;

    } catch (error) {
      this.logger.error('Quick character voice creation failed', { error });
      throw error;
    }
  }

  /**
   * Refine an existing character voice
   */
  async refineCharacterVoice(
    characterName: string,
    voiceId: string,
    refinementPrompts: string[]
  ): Promise<string> {
    try {
      this.logger.info('Refining character voice', {
        characterName,
        voiceId,
        refinementCount: refinementPrompts.length
      });

      const refinedVoiceId = await this.characterVoiceManager.refineCharacterVoice(
        characterName,
        voiceId,
        refinementPrompts
      );

      this.logger.info('Character voice refined successfully', {
        characterName,
        originalVoiceId: voiceId,
        refinedVoiceId: refinedVoiceId
      });

      return refinedVoiceId;

    } catch (error) {
      this.logger.error('Character voice refinement failed', { error });
      throw error;
    }
  }

  /**
   * Get voice statistics
   */
  getVoiceStatistics(): any {
    return this.characterVoiceManager.getVoiceStatistics();
  }

  /**
   * Format story response with IP attribution (quiet aside style)
   */
  private formatStoryResponseWithAttribution(
    baseMessage: string,
    ipAttributions: IPDetectionResult[]
  ): string {
    if (ipAttributions.length === 0) {
      return baseMessage;
    }

    // Format attribution as quiet aside
    const attributionMessages = ipAttributions.map(attr =>
      this.ipDetectionService.formatAttributionMessage(attr)
    );
    const attributionText = attributionMessages.join(' ');

    // Append attribution naturally to the message
    return `${baseMessage} ${attributionText}`;
  }

  /**
   * Extract character names from story content
   */
  private extractCharacterNames(storyContent: string): string[] {
    // Simple character extraction - look for capitalized words that appear multiple times
    const words = storyContent.split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      // Remove punctuation and check if it's a potential character name
      const cleanWord = word.replace(/[.,!?;:"']/g, '');
      if (cleanWord.length > 2 && /^[A-Z]/.test(cleanWord)) {
        wordCount.set(cleanWord, (wordCount.get(cleanWord) || 0) + 1);
      }
    });

    // Return words that appear more than once (likely character names)
    return Array.from(wordCount.entries())
      .filter(([word, count]) => count > 1)
      .map(([word]) => word)
      .slice(0, 5); // Limit to 5 characters
  }

  /**
   * Check and sanitize art prompt using contextual safety analysis
   * Special handling for image prompts: detect human nudity vs non-human comedic contexts
   */
  private async checkAndSanitizeArtPrompt(artPrompt: string, userAge: number): Promise<string> {
    try {
      // Lazy load ContextualSafetyAnalyzer to avoid bundling issues
      if (!this.contextualAnalyzer) {
        // Use require() so TypeScript doesn't require the optional dependency at build time.
        // At runtime, if the module isn't bundled, this throws and we fall back safely below.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ContextualSafetyAnalyzer } = require('../../content-safety/src/filters/ContextualSafetyAnalyzer') as {
          ContextualSafetyAnalyzer: new (openai: OpenAI, logger: Logger) => {
            analyzeContextualSafety: (
              prompt: string,
              age: number,
              contentType: string
            ) => Promise<{
              contextualFlags: { nudity: { detected: boolean; allowed: boolean; context?: string } }
              isInappropriate: boolean
              riskLevel: 'low' | 'medium' | 'high'
              categories: string[]
              reasoning: string
            }>
          }
        }
        this.contextualAnalyzer = new ContextualSafetyAnalyzer(this.openai, this.logger)
      }

      const safetyAnalysis = await this.contextualAnalyzer.analyzeContextualSafety(
        artPrompt,
        userAge,
        'character'
      );

      let sanitizedPrompt = artPrompt;

      // Check for prohibited nudity in art prompts
      if (safetyAnalysis.contextualFlags.nudity.detected) {
        if (!safetyAnalysis.contextualFlags.nudity.allowed) {
          // Human/human-like nudity detected - ensure character is clothed
          this.logger.warn('Art prompt contains inappropriate nudity, ensuring character is clothed', {
            context: safetyAnalysis.contextualFlags.nudity.context
          });
          
          // Add clothing requirement if not already present
          if (!sanitizedPrompt.toLowerCase().includes('wearing') && 
              !sanitizedPrompt.toLowerCase().includes('clothing') && 
              !sanitizedPrompt.toLowerCase().includes('clothes') &&
              !sanitizedPrompt.toLowerCase().includes('dressed')) {
            sanitizedPrompt += ' - Character must be wearing appropriate clothing, no nudity';
          }
        }
        // Non-human nudity in comedic contexts is allowed - no modification needed
      }

      // Check for other inappropriate content
      if (safetyAnalysis.isInappropriate && safetyAnalysis.riskLevel === 'high') {
        this.logger.warn('Art prompt flagged as inappropriate, applying safety modifications', {
          categories: safetyAnalysis.categories,
          reasoning: safetyAnalysis.reasoning
        });
        
        // Add safety modifiers to ensure age-appropriate content
        if (!sanitizedPrompt.toLowerCase().includes('age-appropriate')) {
          sanitizedPrompt += ' - Age-appropriate, child-friendly content only';
        }
      }

      return sanitizedPrompt;
    } catch (error) {
      this.logger.warn('Contextual safety analysis failed for art prompt, applying conservative defaults', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Fail safe: add safety modifiers
      if (!artPrompt.toLowerCase().includes('age-appropriate')) {
        return artPrompt + ' - Age-appropriate, child-friendly content only';
      }
      
      return artPrompt;
    }
  }
}

