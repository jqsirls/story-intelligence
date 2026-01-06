/**
 * Content Agent Lambda Handler
 * Full production implementation with GPT-5, ElevenLabs, DALL-E, and Supabase
 */

import { RealContentAgent, RealContentAgentConfig } from './RealContentAgent';
import { OpenAI } from 'openai';
import { parseFinalizationJobPayload, runFinalizationJob } from './workers/FinalizationWorker'
import QRCode from 'qrcode'

// Global instance for Lambda warm starts
let contentAgent: RealContentAgent | null = null;

// Helper to get SSM parameter
async function getSsmParam(name: string, decrypt: boolean = false): Promise<string | null> {
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
    const client = new SSMClient({ region: 'us-east-1' }); // Fixed: use us-east-1 for SSM
    const result = await client.send(new GetParameterCommand({
      Name: name,
      WithDecryption: decrypt
    }));
    return result.Parameter?.Value || null;
  } catch (error) {
    console.warn(`Failed to get SSM parameter ${name}:`, error);
    return null;
  }
}

async function getFirstSsmParam(
  names: string[],
  decrypt: boolean
): Promise<string | null> {
  for (const name of names) {
    const value = await getSsmParam(name, decrypt)
    if (value) return value
  }
  return null
}

// Initialize content agent
async function getContentAgent(): Promise<RealContentAgent> {
  if (contentAgent) return contentAgent;

  const functionName = process.env.AWS_LAMBDA_FUNCTION_NAME || ''
  const inferredStage =
    functionName.includes('production') ? 'production' :
    functionName.includes('staging') ? 'staging' :
    (process.env.NODE_ENV === 'production' ? 'production' : 'staging')
  const stage = process.env.STAGE || inferredStage
  const prefix = `/storytailor-${stage}`

  // Get API keys from SSM or environment
  const openaiKey = process.env.OPENAI_API_KEY || await getFirstSsmParam([
    `${prefix}/openai/api-key`,
    `${prefix}/openai-api-key`,
    `${prefix}/openai/api_key`,
  ], true)

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY || await getFirstSsmParam([
    `${prefix}/tts/elevenlabs/api-key`,
    `${prefix}/elevenlabs/api-key`,
    `${prefix}/elevenlabs-api-key`,
  ], true)

  const supabaseUrl = process.env.SUPABASE_URL || await getFirstSsmParam([
    `${prefix}/supabase/url`,
    `${prefix}/supabase-url`,
  ], false)
  // Use service role key to bypass RLS for Lambda functions
  const supabaseKey =
    process.env.SUPABASE_SERVICE_KEY ||
    await getFirstSsmParam([`${prefix}/supabase/service-key`, `${prefix}/supabase-service-key`], true) ||
    process.env.SUPABASE_ANON_KEY ||
    await getFirstSsmParam([`${prefix}/supabase/anon-key`, `${prefix}/supabase-anon-key`], true)

  // Propagate loaded secrets into env for other helpers that read process.env directly
  if (openaiKey) process.env.OPENAI_API_KEY = openaiKey
  if (elevenLabsKey) process.env.ELEVENLABS_API_KEY = elevenLabsKey
  if (supabaseUrl) process.env.SUPABASE_URL = supabaseUrl
  if (supabaseKey) {
    // In Lambda we prefer using service-role style access for persistence
    process.env.SUPABASE_SERVICE_KEY = supabaseKey
    if (!process.env.SUPABASE_ANON_KEY) process.env.SUPABASE_ANON_KEY = supabaseKey
  }

  // Finalization queue configuration (optional unless ASSET_FINALIZATION_ENABLED=true)
  const finalizationQueueUrl =
    process.env.ASSET_FINALIZATION_QUEUE_URL ||
    process.env.FINALIZATION_QUEUE_URL ||
    await getFirstSsmParam(
      [
        `${prefix}/finalization/queue-url`,
        `${prefix}/finalization-queue-url`,
        `${prefix}/assets/finalization-queue-url`,
      ],
      false
    )
  if (finalizationQueueUrl) {
    process.env.ASSET_FINALIZATION_QUEUE_URL = finalizationQueueUrl
  }

  const assetFinalizationEnabled =
    process.env.ASSET_FINALIZATION_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/asset-finalization/enabled`,
        `${prefix}/asset_finalization_enabled`,
        `${prefix}/ASSET_FINALIZATION_ENABLED`,
      ],
      false
    )
  if (assetFinalizationEnabled) {
    process.env.ASSET_FINALIZATION_ENABLED = assetFinalizationEnabled
  }

  const artFinalizationEnabled =
    process.env.ART_FINALIZATION_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/art/finalization-enabled`,
        `${prefix}/art-finalization-enabled`,
        `${prefix}/ART_FINALIZATION_ENABLED`,
      ],
      false
    )
  if (artFinalizationEnabled) {
    process.env.ART_FINALIZATION_ENABLED = artFinalizationEnabled
  }

  const audioAsyncEnabled =
    process.env.AUDIO_ASYNC_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/async-enabled`,
        `${prefix}/audio-async-enabled`,
        `${prefix}/AUDIO_ASYNC_ENABLED`,
      ],
      false
    )
  if (audioAsyncEnabled) {
    process.env.AUDIO_ASYNC_ENABLED = audioAsyncEnabled
  }

  const audioChunkingEnabled =
    process.env.AUDIO_CHUNKING_ENABLED ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/chunking-enabled`,
        `${prefix}/audio-chunking-enabled`,
        `${prefix}/AUDIO_CHUNKING_ENABLED`,
      ],
      false
    )
  if (audioChunkingEnabled) {
    process.env.AUDIO_CHUNKING_ENABLED = audioChunkingEnabled
  }

  const longformNarrationProvider =
    process.env.LONGFORM_NARRATION_PROVIDER ||
    process.env.NARRATION_PROVIDER ||
    await getFirstSsmParam(
      [
        `${prefix}/audio/longform-narration-provider`,
        `${prefix}/audio/longform_narration_provider`,
        `${prefix}/LONGFORM_NARRATION_PROVIDER`,
      ],
      false
    )
  if (longformNarrationProvider) {
    process.env.LONGFORM_NARRATION_PROVIDER = longformNarrationProvider
  }

  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured, stories will not be persisted');
  }

  const config: RealContentAgentConfig = {
    openai: {
      apiKey: openaiKey,
      model: process.env.OPENAI_MODEL_STORY || process.env.OPENAI_MODEL || 'gpt-5.2'
    },
    elevenlabs: {
      apiKey: elevenLabsKey || 'placeholder',
      defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
    },
    supabase: {
      url: supabaseUrl || 'https://placeholder.supabase.co',
      anonKey: supabaseKey || 'placeholder'
    },
    s3: {
      bucketName: process.env.S3_BUCKET || 'storytailor-audio',
      region: 'us-east-1' // Fixed: bucket is in us-east-1, not us-east-2
    }
  };

  contentAgent = new RealContentAgent(config);
  await contentAgent.initialize();
  
  console.log('[Content Agent] Initialized with real GPT-5, ElevenLabs, DALL-E, and Supabase');
  return contentAgent;
}

export const handler = async (event: any): Promise<any> => {
  console.log('[Content Agent] Invoked', { hasBody: !!event.body, rawPath: event.rawPath, hasJobId: !!event.jobId });

  try {
    // Handle SQS-triggered finalization jobs
    if (Array.isArray(event?.Records) && event.Records[0]?.eventSource === 'aws:sqs') {
      return await handleFinalizationQueueEvent(event)
    }

    // Handle async job invocation (from AsyncJobManager)
    // IMPORTANT: Asset Worker also sends a `jobId` field for asset_generation_jobs.
    // Only treat as AsyncJobManager invocation when no explicit action is provided.
    if (event.jobId && !event.action && !event.body) {
      return await handleAsyncJob(event);
    }

    // Handle Function URL (HTTP) vs direct invocation
    let body: any = event;
    if (event.body) {
      // Function URL HTTP request
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    // Support both direct format {action, data} AND Router format {intent, context, memoryState}
    // Map Router intent types to actions (Router sends various intents to content agent)
    const intentToAction: Record<string, string> = {
      'create_story': 'generate_story',
      'continue_story': 'generate_story',
      'edit_story': 'generate_story',
      'finish_story': 'generate_story',      // Finish/complete story
      'greeting': 'generate_story',          // User says hi → Start story
      'help': 'generate_story',              // User asks for help → Offer story
      'goodbye': 'generate_story',           // Goodbye → Wrap up
      'unknown': 'generate_story',           // Fallback → Try story
      'create_character': 'create_character',
      'edit_character': 'edit_character',
      'confirm_character': 'create_character'
    };
    
    const action = body.action || intentToAction[body.intent?.type] || null;
    const data = body.data || body;

    // Health check
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'content',
          success: true,
          data: {
            status: 'healthy',
            service: 'content-agent',
            features: {
              gpt5: !!process.env.OPENAI_API_KEY,
              elevenlabs: !!process.env.ELEVENLABS_API_KEY,
              supabase: !!process.env.SUPABASE_URL
            }
          }
        })
      };
    }

    // Generate story using real AI
    if (action === 'generate_story' || body.intent?.type === 'create_story') {
      // Extract request parameters
      const userId = body.userId || body.memoryState?.userId || 'anonymous';
      const creatorUserId = body.creatorUserId || body.userId || data.userId || userId;  // CRITICAL: Track creator for quota attribution
      
      // Get or initialize content agent (also hydrates env from SSM for production where env vars may be unset)
      const agent = await getContentAgent();

      // Check tier and usage limits
      const { TierQualityService } = await import('./services/TierQualityService');
      const tierService = new TierQualityService(
        process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      
      const tierCheck = await tierService.checkAndGetQuality(userId).catch(() => ({
        allowed: true,
        quality: { gptModel: 'gpt-5', imageCount: 5, audioProvider: 'elevenlabs' as const },
        tierInfo: { tier: 'individual', storyLimit: -1, storiesUsed: 0, canCreate: true, hasCredits: false, credits: 0 }
      }));
      
      if (!tierCheck.allowed) {
        const message = 'message' in tierCheck ? tierCheck.message : 'Story limit reached';
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: message,
            data: {
              tier: tierCheck.tierInfo.tier,
              storiesUsed: tierCheck.tierInfo.storiesUsed,
              storyLimit: tierCheck.tierInfo.storyLimit,
              upgradeOptions: ['individual', 'story_pack_5']
            }
          })
        };
      }
      const sessionId = body.sessionId || body.memoryState?.sessionId || data.sessionId || `session_${Date.now()}`;
      const characterName = data.character?.name || data.characterName || 'our hero';
      const storyType = data.storyType || body.intent?.details?.storyType || 'adventure';
      const userAge = data.userAge || body.memoryState?.context?.age || 7;
      
      // Extract conversation phase and story ID from request (check both body and data)
      const conversationPhase =
        data.conversationPhase ||
        body.conversationPhase ||
        body.context?.conversationPhase ||
        body.memoryState?.conversationPhase ||
        (body.intent?.type === 'finish_story' ? 'finalize' : undefined)
      const storyId = data.storyId || body.storyId || body.context?.storyId || body.memoryState?.currentStoryId;
      const beatNumber = data.beatNumber || body.beatNumber || body.context?.beatNumber;

      console.log('[Content Agent] Generating story with real AI', {
        userId,
        sessionId,
        characterName,
        storyType,
        userAge,
        conversationPhase,
        storyId,
        hasStoryId: !!storyId
      });

      // Override model based on tier
      if (tierCheck.quality.gptModel !== 'gpt-5') {
        process.env.OPENAI_MODEL = tierCheck.quality.gptModel;
      }

      // Extract REST API parameters (if provided)
      const characterId = body.characterId || data.characterId;
      const storyIdea = body.storyIdea || data.storyIdea;
      const themes = body.themes || data.themes || [];
      const moralLesson = body.moralLesson || data.moralLesson;
      const avoidTopics = body.avoidTopics || data.avoidTopics || [];
      const therapeuticGoals = body.therapeuticGoals || data.therapeuticGoals || [];
      const emotionalContext = body.emotionalContext || data.emotionalContext;
      const libraryId = body.libraryId || data.libraryId;
      // Preserve generateAssets as-is (can be boolean or array of asset types)
      const generateAssets = body.generateAssets !== undefined ? body.generateAssets : (data.generateAssets !== undefined ? data.generateAssets : true);
      
      // Extract story type-specific inputs
      const bedtime = body.bedtime || data.bedtime;
      const birthday = body.birthday || data.birthday;
      const educational = body.educational || data.educational;
      const financialLiteracy = body.financialLiteracy || data.financialLiteracy;
      const languageLearning = body.languageLearning || data.languageLearning;
      const medicalBravery = body.medicalBravery || data.medicalBravery;
      const mentalHealth = body.mentalHealth || data.mentalHealth;
      const milestones = body.milestones || data.milestones;
      const sequel = body.sequel || data.sequel;
      const techReadiness = body.techReadiness || data.techReadiness;
      const innerChild = body.innerChild || data.innerChild;
      const childLoss = body.childLoss || data.childLoss;
      const newBirth = body.newBirth || data.newBirth;
      
      // Generate story with phase and ID parameters for multi-turn conversation
      const result = await agent.generateStory({
        userId,
        creatorUserId,  // CRITICAL: Pass creator for quota attribution
        sessionId,
        characterName,
        characterTraits: data.character?.traits || data.characterTraits || body.characterTraits,
        characterId,    // REST API: character ID for reference images
        storyType,
        userAge,
        conversationPhase,  // Pass phase (story_planning, cover_generation, beat_confirmed)
        storyId,           // Pass story ID for retrieval
        beatNumber,        // Pass beat number if generating specific beat
        storyIdea,         // REST API: user's story idea
        themes,            // REST API: story themes
        moralLesson,       // REST API: moral lesson
        avoidTopics,       // REST API: topics to avoid
        therapeuticGoals,   // REST API: therapeutic goals
        emotionalContext,  // REST API: emotional context
        libraryId,         // REST API: target library ID
        // Story type-specific inputs
        bedtime,
        birthday,
        educational,
        financialLiteracy,
        languageLearning,
        medicalBravery,
        mentalHealth,
        milestones,
        sequel,
        techReadiness,
        innerChild,
        childLoss,
        newBirth
      } as any);
      
      // If libraryId provided and story was created, update it
      if (libraryId && result.story?.storyId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          await supabase
            .from('stories')
            .update({ library_id: libraryId })
            .eq('id', result.story.storyId);
        } catch (err) {
          console.warn('[Content Agent] Failed to update story library_id:', err);
        }
      }
      
      // If generateAssets is true or an array, create asset jobs
      const shouldGenerateAssets = generateAssets !== false && (Array.isArray(generateAssets) || generateAssets === true);
      if (shouldGenerateAssets && result.story?.storyId) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          
          // Determine asset types
          let assetTypes: string[];
          
          // Check if generateAssets is an array (specific asset types requested from REST API)
          if (Array.isArray(generateAssets)) {
            // Use the array directly (e.g., ['cover'] for adult therapeutic stories)
            assetTypes = generateAssets;
            console.log('[Content Agent] Using specific asset types from request', { assetTypes });
          } else {
            // Use Lambda's logic for boolean generateAssets
            // Adult therapeutic story types default to cover art only
            const adultTherapeuticTypes = ['inner child', 'inner-child', 'child loss', 'child-loss'];
            const normalizedStoryType = (storyType || '').toLowerCase().trim();
            const isNewBirthTherapeutic = (normalizedStoryType === 'new birth' || normalizedStoryType === 'new-birth') 
              && (newBirth?.mode === 'therapeutic');
            const isAdultTherapeutic = adultTherapeuticTypes.includes(normalizedStoryType) || isNewBirthTherapeutic;
            
            // Check if user explicitly requested full assets (for adult therapeutic types)
            const explicitFullAssets = body.explicitFullAssets || data.explicitFullAssets || false;
            
            if (isAdultTherapeutic && !explicitFullAssets) {
              // Adult therapeutic stories: cover art only (default)
              assetTypes = ['cover'];
              console.log('[Content Agent] Adult therapeutic story detected - generating cover art only', { storyType: normalizedStoryType, mode: newBirth?.mode });
            } else {
              // Children's stories: full assets
              // NEW ORDER (V3): Cover → Scenes → Activities → Audio → PDF
              // Rationale: Visual assets appear first, activities while audio renders, PDF last with all assets
              assetTypes = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'activities', 'audio', 'pdf'];
            }
          }
          
          for (const assetType of assetTypes) {
            await supabase
              .from('asset_generation_jobs')
              .insert({
                story_id: result.story.storyId,
                asset_type: assetType,
                status: 'queued',
                metadata: {}
              });
          }
        } catch (err) {
          console.warn('[Content Agent] Failed to create asset jobs:', err);
        }
      }
      
      // Increment usage after successful generation
      if (result.success) {
        await tierService.incrementUsage(userId).catch(err => {
          console.warn('[Content Agent] Failed to increment usage:', err);
        });
        
        // Check if upgrade suggestion needed
        const upgradeCheck = await tierService.shouldSuggestUpgrade(userId).catch(() => null);
        if (upgradeCheck?.suggest) {
          (result as any).upgradeSuggestion = {
            fromTier: upgradeCheck.fromTier,
            toTier: upgradeCheck.toTier,
            reason: upgradeCheck.reason
          };
        }
      }

      // Build response in AgentResponse format for Router
      const agentResponse = {
        agentName: 'content',
        success: result.success,
        data: {
          message: result.message,
          speechText: result.speechText,
          story: result.story,
          coverImageUrl: result.coverImageUrl,
          beatImages: result.beatImages || [],
          audioUrl: result.audioUrl,
          assetsStatus: result.assetsStatus,
          imageTimestamps: result.imageTimestamps,
          webvttUrl: result.webvttUrl || null,
          animatedCoverUrl: null, // Future: Sora-2-Pro
          conversationPhase: 'story_building',
          shouldEndSession: false
        },
        nextPhase: 'story_building',
        requiresFollowup: false
      };
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentResponse)
      };
    }

    // Generate Sora video animation
    if (action === 'generate_sora_video' || action === 'generate_animation') {
      const agent = await getContentAgent();
      const animationModule: any = await import('./services/AnimationService');
      const AnimationService = animationModule.AnimationService || animationModule.default;
      const TierRestrictionError = animationModule.TierRestrictionError || animationModule.AnimationService?.TierRestrictionError || Error;
      const { TierQualityService } = await import('./services/TierQualityService');
      const logger = { info: console.log, warn: console.warn, error: console.error };
      
      // Extract userId from request
      const userId = data.userId || body.userId || body.memoryState?.userId || 'anonymous';
      
      // Initialize tier service for access control
      const tierService = new TierQualityService(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
      );
      const animationService: any = new AnimationService(logger as any, tierService);
      
      try {
        const animationResult = await animationService.generateAnimatedCover({
          storyText: data.storyText || data.story?.content || '',
          images: data.images || data.imageUrls || [],
          characterTraits: data.character || data.characterTraits,
          duration: data.duration || 10,
          userId: userId
        });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              animatedCoverUrl: animationResult.animatedCoverUrl,
              duration: animationResult.duration,
              format: animationResult.format,
              message: 'Sora animation generated successfully'
            }
          })
        };
      } catch (error) {
        // Handle tier restriction errors with upgrade messaging
        if (error instanceof TierRestrictionError) {
          return {
            statusCode: 403,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: error.message,
              upgradeRequired: true,
              upgradeMessage: error.upgradeMessage,
              tier: error.tier
            })
          };
        }
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Sora generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }

    // Generate sound effects
    if (action === 'generate_sound_effect' || action === 'generate_sound_effects') {
      const { SoundEffectsService } = await import('./services/SoundEffectsService');
      const logger = { info: console.log, warn: console.warn, error: console.error };
      const soundService = new SoundEffectsService(logger as any);
      
      try {
        const effectType = data.effectType || data.type || 'ambient';
        const effectResult = await soundService.generateSoundEffect(
          effectType as any,
          data.duration || 5
        );
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              soundEffectUrl: effectResult,
              effectType: effectType,
              duration: data.duration || 5,
              message: 'Sound effect generated successfully'
            }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Sound effect generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }

    // Character Visual + Voice actions
    if (action === 'complete_character_creation_with_visuals') {
      const { userId, libraryId, traits, conversationHistory, currentPhase } = data || {};
      
      if (!userId || !libraryId || !traits) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: userId, libraryId, traits'
          })
        };
      }

      try {
        const { CharacterGenerationService } = await import('./services/CharacterGenerationService');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
        const characterService = new CharacterGenerationService(openai, logger as any);
        
        const result = await characterService.completeCharacterCreationWithVisuals(
          traits,
          userId,
          libraryId
        );

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: result
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Character creation failed'
          })
        };
      }
    }

    if (action === 'get_user_characters') {
      const { userId, libraryId } = data || {};
      
      if (!userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required field: userId'
          })
        };
      }

      try {
        const { CharacterDatabase } = await import('./database/CharacterDatabase');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        const characterDb = new CharacterDatabase(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
          logger as any
        );
        
        const characters = await characterDb.getCharactersByUser(userId, { libraryId });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: { characters }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Failed to get characters'
          })
        };
      }
    }

    if (action === 'get_character_by_id') {
      const { characterId, userId } = data || {};
      
      if (!characterId || !userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: characterId, userId'
          })
        };
      }

      try {
        const { CharacterDatabase } = await import('./database/CharacterDatabase');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        const characterDb = new CharacterDatabase(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || '',
          logger as any
        );
        
        const character = await characterDb.getCharacterById(characterId);
        
        if (!character) {
          return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Character not found'
            })
          };
        }

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: { character }
          })
        };
      } catch (error) {
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Failed to get character'
          })
        };
      }
    }

    // Generate character art
    if (action === 'generate_character_art') {
      const { characterId, characterName, characterTraits, userId, ethnicity, isMixedRace, inclusivityTraits: bodyInclusivityTraits } = body;
      
      if (!characterId || !characterName || !userId) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: characterId, characterName, userId'
          })
        };
      }
      console.log('[Content Agent] generate_character_art start', { characterId, userId, hasTraits: !!characterTraits });
      
      try {
        const agent = await getContentAgent();
        const { CharacterImageGenerator } = await import('./services/CharacterImageGenerator');
        const { OpenAI } = await import('openai');
        const logger = { info: console.log, warn: console.warn, error: console.error };
        
        // Get OpenAI instance from agent or create new one
        const openaiKey = process.env.OPENAI_API_KEY || '';
        if (!openaiKey) {
          throw new Error('OpenAI API key not configured');
        }
        const openai = new OpenAI({ apiKey: openaiKey });
        
        const imageGenerator = new CharacterImageGenerator(openai, logger as any);
        
        // Extract traits for character generation
        // Prioritize top-level ethnicity over nested characterTraits.ethnicity
        const characterEthnicity = ethnicity || characterTraits?.ethnicity || [];
        
        const traits: any = {
          name: characterName,
          age: characterTraits?.age || 7,
          species: characterTraits?.species || 'human',
          ethnicity: characterEthnicity,
          gender: characterTraits?.gender,
          isMixedRace: isMixedRace || (Array.isArray(characterEthnicity) && characterEthnicity.length > 1),
          ...characterTraits
        };
        
        // Extract inclusivity traits from body or characterTraits
        const rawInclusivityTraits = bodyInclusivityTraits || characterTraits?.inclusivityTraits || [];
        
        // Convert string array to full trait objects
        // CharacterImageGenerator expects full InclusivityTrait objects from ComprehensiveInclusivityDatabase
        // But REST API passes array of strings like ['hearing_aid', 'wheelchair']
        const { INCLUSIVITY_TRAITS_MAP } = await import('./constants/ComprehensiveInclusivityDatabase');
        
        // Trait ID normalization map (REST API uses simplified names)
        const traitIdMap: Record<string, string> = {
          'wheelchair': 'wheelchair_manual',
          'hearing_aid': 'hearing_aids',
          'glasses': 'vision_glasses',
          'prosthetic': 'prosthetic_limb',
          'down_syndrome': 'down_syndrome',
          'vitiligo': 'vitiligo',
          'burn_scars': 'burn_scars',
          'autism': 'autism',
          'adhd': 'adhd',
          'halo': 'halo_cervical_orthosis'
        };
        
        const inclusivityTraits = rawInclusivityTraits
          .map((trait: any) => {
            if (typeof trait === 'string') {
              // Normalize trait ID (REST API uses simplified names)
              const normalizedId = traitIdMap[trait] || trait;
              
              // Look up full trait definition from database
              const traitDef = INCLUSIVITY_TRAITS_MAP[normalizedId];
              if (!traitDef) {
                console.warn(`Unknown inclusivity trait: ${trait} (normalized: ${normalizedId})`);
                console.warn(`Available traits:`, Object.keys(INCLUSIVITY_TRAITS_MAP).slice(0, 10).join(', '), '...');
                return null;
              }
              return traitDef;
            }
            // Already an object - verify it has required properties
            if (trait && trait.id && trait.label) {
              return trait;
            }
            console.warn(`Invalid inclusivity trait object:`, trait);
            return null;
          })
          .filter((t: any) => t !== null); // Remove nulls
        
        // Generate hex colors (simplified - would normally calculate from traits)
        const hexColors = {
          skin: characterTraits?.skinTone || '#F4C2A1',
          hair: characterTraits?.hairColor || '#8B4513',
          eyes: characterTraits?.eyeColor || '#4A90E2'
        };
        
        // Generate headshot and bodyshot
        const headshot = await imageGenerator.generateHeadshot(traits, inclusivityTraits, hexColors);
        const bodyshot = await imageGenerator.generateBodyshot(traits, inclusivityTraits, hexColors);
        
        // Upload images to S3 and get CDN URLs
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const bucketName = getAssetBucketName();
        
        // Helper to upload image and return CDN URL
        async function uploadImageToS3(imageUrl: string, key: string): Promise<string> {
          // If already an S3/CDN URL, return as-is
          if (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('assets.storytailor.dev')) {
            // If it's an S3 URL, convert to CDN
            if (imageUrl.includes('s3.amazonaws.com')) {
              const match = imageUrl.match(/s3[.-]?[a-z0-9-]*\.amazonaws\.com\/(.+)$/i);
              if (match && match[1]) {
                return getCdnUrl(match[1]);
              }
            }
            return imageUrl;
          }
          
          let imageBuffer: Buffer;
          
          // Check if it's a base64 data URI
          if (imageUrl.startsWith('data:image/')) {
            // Extract base64 data from data URI
            const base64Data = imageUrl.split(',')[1];
            if (!base64Data) {
              throw new Error('Invalid base64 data URI');
            }
            imageBuffer = Buffer.from(base64Data, 'base64');
            console.log('[Content Agent] Converted base64 data URI to buffer', { 
              keyPreview: key.substring(0, 50),
              bufferSize: imageBuffer.length 
            });
          } else {
            // Download from temporary URL (OpenAI HTTP URL)
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
              throw new Error(`Failed to download image: ${imageResponse.status}`);
            }
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          }
          
          // Upload to S3
          console.log('[Content Agent] Uploading to S3', { bucket: bucketName, key });
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000'
          }));
          console.log('[Content Agent] S3 upload successful', { key });
          
          // Return CDN URL
          const cdnUrl = getCdnUrl(key);
          console.log('[Content Agent] CDN URL generated', { cdnUrl });
          return cdnUrl;
        }
        
        // Upload headshot
        const headshotKey = `characters/${characterId}/headshot-${Date.now()}.png`;
        const headshotCdnUrl = await uploadImageToS3(headshot.url, headshotKey);
        
        // Upload bodyshot
        const bodyshotKey = `characters/${characterId}/bodyshot-${Date.now()}.png`;
        const bodyshotCdnUrl = await uploadImageToS3(bodyshot.url, bodyshotKey);
        
        // Create image objects with both S3 (for internal use) and CDN (for frontend) URLs
        const { getS3Url } = await import('./utils/cdnUrl');
        const headshotS3Url = getS3Url(headshotKey);
        const bodyshotS3Url = getS3Url(bodyshotKey);
        
        const images = [
          { 
            url: headshotCdnUrl, // CDN URL for frontend
            s3Url: headshotS3Url, // S3 URL for internal reference downloads
            type: 'headshot', 
            prompt: headshot.prompt 
          },
          { 
            url: bodyshotCdnUrl, // CDN URL for frontend
            s3Url: bodyshotS3Url, // S3 URL for internal reference downloads
            type: 'bodyshot', 
            prompt: bodyshot.prompt 
          }
        ];
        
        // V3 ENHANCEMENT: Extract character color palette (3 signature colors)
        // Use headshot for color extraction (more representative of character identity)
        let characterColorPalette: string[] = [];
        try {
          const { ColorExtractionService } = await import('./services/ColorExtractionService');
          const { default: winston } = await import('winston');
          const colorLogger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [new winston.transports.Console({ format: winston.format.simple() })]
          });
          const colorExtractor = new ColorExtractionService(colorLogger);
          
          // Extract colors from headshot S3 URL (use S3 URL for internal access)
          const extractedColors = await colorExtractor.extractDeepContrastingColors(headshotS3Url);
          characterColorPalette = [
            extractedColors.primary,
            extractedColors.secondary,
            extractedColors.tertiary
          ];
          
          console.log('[Content Agent] Extracted character color palette', {
            characterId,
            colorPalette: characterColorPalette
          });
        } catch (colorError) {
          console.warn('[Content Agent] Failed to extract character colors, using fallback', {
            characterId,
            error: colorError instanceof Error ? colorError.message : String(colorError)
          });
          // Fallback: use default palette
          characterColorPalette = ['#1A1A1A', '#8B0000', '#191970'];
        }
        
        // Update character in database with CDN URLs
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        console.log('[Content Agent] Updating character in database', { 
          characterId,
          headshotCdnUrl,
          bodyshotCdnUrl,
          imageCount: images.length
        });
        
        const { data: updateResult, error: updateError } = await supabase
          .from('characters')
          .update({
            reference_images: images,
            appearance_url: headshotCdnUrl,
            color_palette: characterColorPalette // V3 ENHANCEMENT: 3 signature colors for HUE consistency
            // Note: assets_status column doesn't exist in characters table
            // Frontend tracks generation status via presence of reference_images and appearance_url
          })
          .eq('id', characterId)
          .select();
        
        if (updateError) {
          console.error('[Content Agent] Supabase update failed', { 
            error: updateError,
            characterId 
          });
          throw new Error(`Failed to update character: ${updateError.message}`);
        }
        
        console.log('[Content Agent] Character updated successfully in database', { 
          characterId,
          updateResult
        });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            characterId,
            images
          })
        };
      } catch (error) {
        console.error('[Content Agent] Character art generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Character art generation failed'
          })
        };
      }
    }

    // Generate story images (async - called when story art is missing on load)
    if (action === 'generate_story_images') {
      const { storyId, story, characterId, characterName, characterTraits, libraryId } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        // Get story content
        const storyContent = typeof story.content === 'string' 
          ? story.content 
          : (story.content?.text || '');
        const keyBeats = story.content?.metadata?.keyBeats || story.keyBeats || [];
        
        // Helper to update asset status in database
        async function updateAssetStatus(assetType: string, status: 'generating' | 'ready' | 'failed', data?: { url?: string; progress?: number }): Promise<void> {
          try {
            const { data: currentStory } = await supabase
              .from('stories')
              .select('asset_generation_status, cover_art_url, scene_art_urls')
              .eq('id', storyId)
              .single();

            const currentStatus = currentStory?.asset_generation_status || {
              overall: 'generating',
              assets: {}
            };

            currentStatus.assets[assetType] = {
              status,
              ...data,
              ...(status === 'generating' ? { startedAt: new Date().toISOString() } : {}),
              ...(status === 'ready' || status === 'failed' ? { completedAt: new Date().toISOString() } : {})
            };

            // Update specific asset URLs when ready
            const updateData: Record<string, any> = {
              asset_generation_status: currentStatus
            };

            if (assetType === 'cover' && status === 'ready' && data?.url) {
              updateData.cover_art_url = data.url;
            } else if (assetType.startsWith('scene_') && status === 'ready' && data?.url) {
              const sceneIndex = parseInt(assetType.split('_')[1]) - 1;
              const currentUrls = currentStory?.scene_art_urls || [];
              const updatedUrls = [...currentUrls];
              while (updatedUrls.length <= sceneIndex) {
                updatedUrls.push(null);
              }
              updatedUrls[sceneIndex] = data.url;
              // IMPORTANT: Preserve index positions (scene_1..scene_4) for realtime UX.
              // Do NOT filter out nulls, otherwise indexes shift and the frontend can show
              // the wrong scene image for a given beat.
              updateData.scene_art_urls = updatedUrls;
            }

            // Calculate overall status
            const assetStatuses = Object.values(currentStatus.assets);
            if (assetStatuses.every((a: any) => a.status === 'ready')) {
              currentStatus.overall = 'ready';
            } else if (assetStatuses.some((a: any) => a.status === 'failed') && !assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'failed';
            } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
              currentStatus.overall = 'generating';
            }

            await supabase
              .from('stories')
              .update(updateData)
              .eq('id', storyId);

            // One-line, searchable production log for frontend stability investigations
            if (status === 'ready') {
              console.log(`story_asset_ready storyId=${storyId} asset=${assetType}`)
            }
            console.log(`[Content Agent] Updated ${assetType} status: ${status}`, { storyId, assetType });
          } catch (error) {
            console.error(`[Content Agent] Failed to update ${assetType} status`, { storyId, assetType, error });
          }
        }

        // Generate story images using character reference images with progressive status updates
        const images = await agent.generateStoryImages(
          {
            title: story.title || 'Untitled Story',
            keyBeats: keyBeats
          },
          characterName || 'hero',
          characterTraits || {},
          characterId,
          'batch',
          undefined,
          storyId,
          updateAssetStatus
        );
        
        // Upload images to S3 and get CDN URLs
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const bucketName = getAssetBucketName();
        
        // Helper to upload image and return CDN URL
        async function uploadImageToS3(imageUrl: string, key: string): Promise<string> {
          // If already an S3/CDN URL, return as-is
          if (imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('assets.storytailor.dev')) {
            if (imageUrl.includes('s3.amazonaws.com')) {
              const match = imageUrl.match(/s3[.-]?[a-z0-9-]*\.amazonaws\.com\/(.+)$/i);
              if (match && match[1]) {
                return getCdnUrl(match[1]);
              }
            }
            return imageUrl;
          }
          
          // Download from temporary URL (OpenAI)
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
          }
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          
          // Upload to S3
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: imageBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000'
          }));
          
          // Return CDN URL
          return getCdnUrl(key);
        }
        
        // Upload cover image
        const coverKey = `stories/${storyId}/cover-${Date.now()}.png`;
        const coverCdnUrl = await uploadImageToS3(images.coverImageUrl, coverKey);
        
        // Upload beat images
        const beatCdnUrls: string[] = [];
        for (let i = 0; i < images.beatImages.length; i++) {
          const beat = images.beatImages[i];
          const beatKey = `stories/${storyId}/beat-${beat.beatNumber}-${Date.now()}.png`;
          const beatCdnUrl = await uploadImageToS3(beat.imageUrl, beatKey);
          beatCdnUrls.push(beatCdnUrl);
        }
        
        // Update story in database with CDN URLs (individual beat statuses)
        // Note: Individual beat statuses should already be updated via onProgress callback
        // This final update ensures all URLs are set correctly
        const { data: currentStory } = await supabase
          .from('stories')
          .select('asset_generation_status')
          .eq('id', storyId)
          .single();

        const currentStatus = currentStory?.asset_generation_status || {
          overall: 'generating',
          assets: {}
        };

        // Update with CDN URLs (individual beat statuses)
        currentStatus.assets['cover'] = { status: 'ready', progress: 100, url: coverCdnUrl };
        for (let i = 0; i < beatCdnUrls.length; i++) {
          const sceneKey = `scene_${i + 1}`;
          currentStatus.assets[sceneKey] = { status: 'ready', progress: 100, url: beatCdnUrls[i] };
        }

        // Calculate overall status
        const assetStatuses = Object.values(currentStatus.assets);
        if (assetStatuses.every((a: any) => a.status === 'ready')) {
          currentStatus.overall = 'ready';
        } else if (assetStatuses.some((a: any) => a.status === 'generating')) {
          currentStatus.overall = 'generating';
        }

        await supabase
          .from('stories')
          .update({
            cover_art_url: coverCdnUrl,
            scene_art_urls: beatCdnUrls,
            asset_generation_status: currentStatus,
            status: 'ready'
          })
          .eq('id', storyId);

        // One-line, searchable production log for each asset URL that lands on the story row
        console.log(`story_asset_ready storyId=${storyId} asset=cover`)
        for (let i = 0; i < beatCdnUrls.length; i++) {
          console.log(`story_asset_ready storyId=${storyId} asset=scene_${i + 1}`)
        }
        
        // Update asset generation jobs
        await supabase
          .from('asset_generation_jobs')
          .update({ status: 'ready', completed_at: new Date().toISOString() })
          .eq('story_id', storyId)
          .in('asset_type', ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4'])
          .in('status', ['queued', 'generating']);
        
        console.log('[Content Agent] Story images generated and saved', { storyId, coverUrl: coverCdnUrl, beatCount: beatCdnUrls.length });
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            data: {
              storyId,
              coverUrl: coverCdnUrl,
              beatUrls: beatCdnUrls,
              message: 'Story images generated successfully'
            }
          })
        };
      } catch (error) {
        console.error('[Content Agent] Story image generation failed', { storyId, error });
        
        // Update story status to failed
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
          );
          
          // Update with individual beat statuses for failure
          const failedStatus = {
            overall: 'failed',
            assets: {
              cover: { status: 'failed', progress: 0 },
              scene_1: { status: 'failed', progress: 0 },
              scene_2: { status: 'failed', progress: 0 },
              scene_3: { status: 'failed', progress: 0 },
              scene_4: { status: 'failed', progress: 0 }
            }
          };

          await supabase
            .from('stories')
            .update({
              asset_generation_status: failedStatus,
              status: 'failed'
            })
            .eq('id', storyId);
          
          // Update jobs to failed
          await supabase
            .from('asset_generation_jobs')
            .update({ 
              status: 'failed', 
              error_message: error instanceof Error ? error.message : 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('story_id', storyId)
            .in('asset_type', ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4'])
            .in('status', ['queued', 'generating']);
        } catch (updateErr) {
          console.error('[Content Agent] Failed to update story status to failed', { storyId, error: updateErr });
        }
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: `Story image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        };
      }
    }
    
    // Generate asset (audio, cover, scenes, PDF, activities)
    if (action === 'generate_asset') {
      const { storyId, assetType, jobId, story, metadata } = body;
      
      if (!storyId || !assetType || !jobId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, assetType, jobId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        let result: any;
        
        switch (assetType) {
          case 'audio': {
            // Generate audio narration with word-level timestamps
            // Parse story content to extract beats
            const parsedStoryContent = typeof story.content === 'string' 
              ? JSON.parse(story.content) 
              : story.content;
            
            // Ensure story content has beats array
            if (!parsedStoryContent || !parsedStoryContent.beats || !Array.isArray(parsedStoryContent.beats)) {
              throw new Error('Story content must have a beats array');
            }

            // Generate audio with timestamps
            const audioResult = await agent.generateAudioNarrationWithTimestamps({
              beats: parsedStoryContent.beats.map((beat: any, index: number) => ({
                id: beat.id || `beat-${index + 1}`,
                content: beat.content || ''
              }))
            });

            // Re-host audio under assets.storytailor.dev (no public S3 bucket URLs)
            // Download the generated audio (typically an S3 URL) and upload to our assets bucket.
            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const bucketName = getAssetBucketName();

            let hostedAudioUrl = audioResult.audioUrl;
            if (typeof audioResult.audioUrl === 'string' && audioResult.audioUrl.length > 0 && !audioResult.audioUrl.includes('assets.storytailor.dev')) {
              const audioResp = await fetch(audioResult.audioUrl);
              if (!audioResp.ok) {
                throw new Error(`Failed to download audio: ${audioResp.status}`);
              }
              const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
              const audioKey = `stories/${storyId}/audio-${Date.now()}.mp3`;
              await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: audioKey,
                Body: audioBuffer,
                ContentType: 'audio/mpeg',
                CacheControl: 'public, max-age=31536000'
              }));
              hostedAudioUrl = getCdnUrl(audioKey);
            }

            // Update story with CDN audio URL + word timestamps + HTML blocks
            await supabase
              .from('stories')
              .update({
                audio_url: hostedAudioUrl,
                audio_words: audioResult.words,
                audio_blocks: audioResult.blocks
              })
              .eq('id', storyId);

            console.log(`story_asset_ready storyId=${storyId} asset=audio`)

            result = { 
              url: hostedAudioUrl, 
              words: audioResult.words,
              blocks: audioResult.blocks,
              cost: 0.05 
            };
            break;
          }

          case 'qr': {
            // Generate QR code image locally (NO third-party QR service).
            // Upload PNG to our assets bucket so the public URL is assets.storytailor.dev/...
            const publicUrl = `https://storytailor.com/s/${storyId}`;
            const pngBuffer: Buffer = await QRCode.toBuffer(publicUrl, {
              type: 'png',
              margin: 2,
              scale: 8,
              errorCorrectionLevel: 'M'
            });

            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
            const bucketName = getAssetBucketName();
            const qrKey = `stories/${storyId}/qr-${Date.now()}.png`;

            await s3Client.send(new PutObjectCommand({
              Bucket: bucketName,
              Key: qrKey,
              Body: pngBuffer,
              ContentType: 'image/png',
              CacheControl: 'public, max-age=31536000'
            }));

            const qrCodeUrl = getCdnUrl(qrKey);

            await supabase
              .from('stories')
              .update({
                qr_code_url: qrCodeUrl,
                qr_public_url: publicUrl
              })
              .eq('id', storyId);

            console.log(`story_asset_ready storyId=${storyId} asset=qr`)

            result = { url: qrCodeUrl, publicUrl, cost: 0 };
            break;
          }
            
          case 'cover':
            // Generate cover art
            // IMPORTANT: Do NOT rely on non-existent story fields like story.user_id, story.character_name, story.story_type
            // Use schema-truth: creator_user_id, story_type_id, and character relationship/metadata.
            const effectiveUserId = story.creator_user_id || body.creatorUserId || body.userId || 'system';

            // Resolve story type from story_types table (schema-truth)
            let resolvedStoryType = 'adventure';
            if (story.story_type_id) {
              const { data: storyTypeRow } = await supabase
                .from('story_types')
                .select('type_id, type_name')
                .eq('id', story.story_type_id)
                .maybeSingle();
              resolvedStoryType = (storyTypeRow?.type_id || storyTypeRow?.type_name || resolvedStoryType).toString();
            }

            // Resolve character from metadata->primaryCharacterId/character_id OR library fallback
            const storyMetadata = (story.metadata && typeof story.metadata === 'object') ? story.metadata : {};
            const metadataCharacterId =
              (storyMetadata as any).primaryCharacterId ||
              (storyMetadata as any).character_id ||
              (storyMetadata as any).characterId;

            const { data: coverCharacter } = metadataCharacterId
              ? await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('id', metadataCharacterId)
                  .maybeSingle()
              : await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('library_id', story.library_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

            const resolvedCharacterName = coverCharacter?.name || 'our hero';

            const coverResult = await agent.generateStory({
              userId: effectiveUserId,
              sessionId: `asset_${Date.now()}`,
              characterName: resolvedCharacterName,
              characterTraits: coverCharacter?.traits || {},
              storyType: resolvedStoryType,
              userAge: story.age_rating || 7,
              storyId,
              conversationPhase: 'cover_generation'
            });
            if (coverResult.coverImageUrl) {
              console.log('[Content Agent] Updating stories.cover_art_url from cover job', {
                storyId,
                assetType,
                userId: effectiveUserId,
                storyType: resolvedStoryType,
                characterId: coverCharacter?.id || null
              });

              const { data: currentStoryForCover } = await supabase
                .from('stories')
                .select('asset_generation_status')
                .eq('id', storyId)
                .single();

              const existingStatus = (currentStoryForCover as any)?.asset_generation_status || {};
              const existingAssets = existingStatus.assets || {};

              await supabase
                .from('stories')
                .update({
                  cover_art_url: coverResult.coverImageUrl,
                  asset_generation_status: {
                    ...existingStatus,
                    overall: existingStatus.overall || 'generating',
                    assets: {
                      ...existingAssets,
                      cover: { status: 'ready', progress: 100, url: coverResult.coverImageUrl }
                    }
                  }
                })
                .eq('id', storyId);
            }
            result = { url: coverResult.coverImageUrl, cost: 0.04 };
            break;
            
          case 'scene_1':
          case 'scene_2':
          case 'scene_3':
          case 'scene_4':
            const beatNum = parseInt(assetType.split('_')[1]);
            console.log(`scene_job_start storyId=${storyId} jobId=${jobId} asset=${assetType}`);
            // Resolve canonical context (same rules as cover)
            const effectiveUserIdForBeat = story.creator_user_id || body.creatorUserId || body.userId || 'system';
            let resolvedStoryTypeForBeat = 'adventure';
            if (story.story_type_id) {
              const { data: storyTypeRow } = await supabase
                .from('story_types')
                .select('type_id, type_name')
                .eq('id', story.story_type_id)
                .maybeSingle();
              resolvedStoryTypeForBeat = (storyTypeRow?.type_id || storyTypeRow?.type_name || resolvedStoryTypeForBeat).toString();
            }

            const storyMetadataForBeat = (story.metadata && typeof story.metadata === 'object') ? story.metadata : {};
            const metadataCharacterIdForBeat =
              (storyMetadataForBeat as any).primaryCharacterId ||
              (storyMetadataForBeat as any).character_id ||
              (storyMetadataForBeat as any).characterId;

            const { data: beatCharacter } = metadataCharacterIdForBeat
              ? await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('id', metadataCharacterIdForBeat)
                  .maybeSingle()
              : await supabase
                  .from('characters')
                  .select('id, name, traits')
                  .eq('library_id', story.library_id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

            const resolvedBeatCharacterName = beatCharacter?.name || 'our hero';

            // Generate beat image
            const beatResult = await agent.generateStory({
              userId: effectiveUserIdForBeat,
              sessionId: `asset_${Date.now()}`,
              characterName: resolvedBeatCharacterName,
              characterTraits: beatCharacter?.traits || {},
              storyType: resolvedStoryTypeForBeat,
              userAge: story.age_rating || 7,
              storyId,
              beatNumber: beatNum,
              conversationPhase: 'beat_confirmed'
            });

            const beatImagesAny = Array.isArray((beatResult as any).beatImages) ? (beatResult as any).beatImages : [];
            const beatImageObj = beatImagesAny.find((b: any) => b && (b.beatNumber === beatNum || b.beat_number === beatNum));
            const beatUrl: string | null =
              typeof beatImageObj?.imageUrl === 'string' ? beatImageObj.imageUrl :
              typeof beatImagesAny?.[beatNum - 1] === 'string' ? beatImagesAny[beatNum - 1] :
              null;

            if (!beatUrl) {
              console.error(`scene_writeback_failed storyId=${storyId} index=${beatNum - 1} reason=SCENE_URL_EMPTY jobId=${jobId}`);

              await supabase
                .from('asset_generation_jobs')
                .update({
                  status: 'failed',
                  error_message: 'SCENE_URL_EMPTY',
                  completed_at: new Date().toISOString()
                })
                .eq('id', jobId);

              const { data: currentStoryForScene } = await supabase
                .from('stories')
                .select('scene_art_urls, asset_generation_status')
                .eq('id', storyId)
                .single();

              const existingSceneUrls: string[] = Array.isArray((currentStoryForScene as any)?.scene_art_urls)
                ? (currentStoryForScene as any).scene_art_urls
                : [];
              const existingStatus = (currentStoryForScene as any)?.asset_generation_status || {};
              const existingAssets = existingStatus.assets || {};
              const key = `scene_${beatNum}`;

              const updatedAssets = {
                ...existingAssets,
                [key]: { status: 'failed', progress: 0, error: 'SCENE_URL_EMPTY' }
              };
              const assetStatuses = Object.values(updatedAssets);
              let overall = 'generating';
              if (assetStatuses.every((a: any) => a.status === 'ready')) overall = 'ready';
              else if (assetStatuses.some((a: any) => a.status === 'failed') && !assetStatuses.some((a: any) => a.status === 'generating')) {
                overall = 'failed';
              }

              await supabase
                .from('stories')
                .update({
                  scene_art_urls: existingSceneUrls,
                  asset_generation_status: {
                    ...existingStatus,
                    assets: updatedAssets,
                    overall
                  }
                })
                .eq('id', storyId);

              throw new Error('SCENE_URL_EMPTY');
            }

            const { data: currentStoryForScene } = await supabase
              .from('stories')
              .select('scene_art_urls, asset_generation_status')
              .eq('id', storyId)
              .single();

            const existingSceneUrls: string[] = Array.isArray((currentStoryForScene as any)?.scene_art_urls)
              ? (currentStoryForScene as any).scene_art_urls
              : [];

            const nextSceneUrls = [...existingSceneUrls];
            while (nextSceneUrls.length < 4) nextSceneUrls.push('');
            nextSceneUrls[beatNum - 1] = beatUrl;

            const existingStatus = (currentStoryForScene as any)?.asset_generation_status || {};
            const existingAssets = existingStatus.assets || {};
            const key = `scene_${beatNum}`;

            console.log(`scene_writeback storyId=${storyId} index=${beatNum - 1} url=${beatUrl}`);
            await supabase
              .from('stories')
              .update({
                scene_art_urls: nextSceneUrls,
                asset_generation_status: {
                  ...existingStatus,
                  overall: existingStatus.overall || 'generating',
                  assets: {
                    ...existingAssets,
                    [key]: { status: 'ready', progress: 100, url: beatUrl }
                  }
                }
              })
              .eq('id', storyId);

            result = { url: beatUrl, cost: 0.04 };
            break;
            
          case 'activities':
            // Generate activities using ActivityGenerationService
            const { ActivityGenerationService } = await import('./services/ActivityGenerationService');
            // ActivityGenerationService requires Redis but may not use it - create a mock
            const mockRedis = {} as any;
            const activitiesService = new ActivityGenerationService(
              process.env.SUPABASE_URL || '',
              process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
              null, // EventBridge (not needed for direct generation)
              mockRedis, // Mock Redis (service may not actually use it)
              console as any // Logger
            );
            
            // Get character for the story
            const { data: character } = await supabase
              .from('characters')
              .select('*')
              .eq('library_id', story.library_id)
              .limit(1)
              .single();
            
            const activitiesResult = await activitiesService.generateActivities({
              story: {
                id: story.id,
                title: story.title,
                content: story.content
              },
              character: character || { name: 'Character', traits: {} },
              targetAge: story.age_rating || 7
            });
            
            // Save activities to story
            await supabase
              .from('stories')
              .update({ activities: activitiesResult.activities })
              .eq('id', storyId);
            
            result = { activities: activitiesResult.activities, cost: 0.02 };
            break;
            
          case 'pdf':
            // Generate PDF using PDFGenerationService
            const { PDFGenerationService } = await import('./services/PDFGenerationService');
            const pdfService = new PDFGenerationService({
              outputDirectory: '/tmp',
              fonts: { title: 'Helvetica-Bold', body: 'Helvetica', caption: 'Helvetica-Oblique' },
              layout: { pageWidth: 612, pageHeight: 792, margins: { top: 72, bottom: 72, left: 72, right: 72 } },
              colors: { primary: '#4A90E2', secondary: '#F5A623', text: '#333333', background: '#FFFFFF' }
            });
            
            // Get character and art for the story
            const { data: pdfCharacter } = await supabase
              .from('characters')
              .select('*')
              .eq('library_id', story.library_id)
              .limit(1)
              .single();
            
            // Get art URLs from story
            const storyContent = typeof story.content === 'string'
              ? (() => { try { return JSON.parse(story.content) } catch { return { text: story.content } } })()
              : (story.content as any);

            // PDFGenerationService expects `story.content.beats` to be an array.
            // Our schema stores `content.text` + (sometimes) `content.beats`. Ensure it exists.
            const beats = Array.isArray(storyContent?.beats)
              ? storyContent.beats
              : Array.isArray(storyContent?.metadata?.keyBeats)
                ? storyContent.metadata.keyBeats.map((b: any, idx: number) => ({ id: `beat-${idx + 1}`, content: String(b?.description || '') }))
                : [{ id: 'beat-1', content: String(storyContent?.text || storyContent || '') }];

            const normalizedStoryContentForPdf = {
              ...storyContent,
              text: String(storyContent?.text || storyContent || ''),
              beats
            };

            const coverArtUrl = storyContent?.coverImageUrl || story.cover_art_url;
            const sceneArtUrls = storyContent?.beatImages || story.scene_art_urls || [];
            
            // Generate PDF
            const pdfResult = await pdfService.generateStoryPDF({
              story: {
                id: story.id,
                title: story.title,
                content: normalizedStoryContentForPdf
              },
              character: pdfCharacter || { name: 'Character', traits: {} },
              generatedArt: {
                coverArt: {
                  url: coverArtUrl || '',
                  prompt: '',
                  moment: { beatId: '', description: '', visualKineticScore: 0, plotShiftingScore: 0, combinedScore: 0 }
                },
                bodyIllustrations: sceneArtUrls.map((url: string, idx: number) => ({
                  url,
                  prompt: '',
                  illustration: { sequence: idx + 1, beatId: '', description: '', cameraAngle: '', depthDirective: '', prompt: '' }
                })),
                characterArt: {
                  headshot: { url: '', prompt: '' },
                  bodyshot: { url: '', prompt: '' }
                }
              },
              activities: story.activities || undefined,
              includeActivities: !!story.activities
            });
            
            // Upload PDF to S3 if available
            let pdfUrl = null;
            const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
            const s3Bucket = getAssetBucketName();
            const s3Region = process.env.AWS_REGION || 'us-east-1';
            if (pdfResult.filePath) {
              try {
                const fs = await import('fs');
                const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
                const s3Client = new S3Client({ region: s3Region });
                const pdfBuffer = fs.readFileSync(pdfResult.filePath);
                const pdfKey = `pdfs/${storyId}/${pdfResult.fileName}`;
                
                await s3Client.send(new PutObjectCommand({
                  Bucket: s3Bucket,
                  Key: pdfKey,
                  Body: pdfBuffer,
                  ContentType: 'application/pdf'
                }));
                
                // Return CDN URL instead of direct S3 URL
                pdfUrl = getCdnUrl(pdfKey);
              } catch (s3Error) {
                console.warn('Failed to upload PDF to S3, using local path', s3Error);
                pdfUrl = pdfResult.filePath; // Fallback to local path
              }
            }
            
            // Update story with PDF URL
            if (pdfUrl) {
              await supabase
                .from('stories')
                .update({
                  pdf_url: pdfUrl,
                  pdf_pages: pdfResult.pageCount,
                  pdf_file_size: pdfResult.fileSize
                })
                .eq('id', storyId);

              console.log(`story_asset_ready storyId=${storyId} asset=pdf`)
            }
            
            result = { url: pdfUrl, pageCount: pdfResult.pageCount, fileSize: pdfResult.fileSize, cost: 0.01 };
            break;
            
          default:
            throw new Error(`Unknown asset type: ${assetType}`);
        }
        
        // Mark job as complete
        await supabase
          .from('asset_generation_jobs')
          .update({
            status: 'ready',
            completed_at: new Date().toISOString(),
            cost: result.cost || 0
          })
          .eq('id', jobId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: true, result })
        };
        
      } catch (error) {
        console.error('[Content Agent] Asset generation failed:', error);
        
        // Mark job as failed
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        await supabase
          .from('asset_generation_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Asset generation failed'
          })
        };
      }
    }
    
    // Generate activities for story
    if (action === 'generate_activities') {
      const { storyId, story, character, targetAge, preferredTypes, availableMaterials, timeConstraints, specialConsiderations } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { ActivityGenerationService } = await import('./services/ActivityGenerationService');
        const winston = await import('winston');
        
        // Create proper winston logger
        const logger = winston.createLogger({
          level: 'info',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          transports: [
            new winston.transports.Console({
              format: winston.format.simple()
            })
          ]
        });
        
        // ActivityGenerationService accepts null for Redis (it's optional)
        const activitiesService = new ActivityGenerationService(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
          null, // eventBridge (not used)
          null, // redis (optional, not used)
          logger
        );
        
        // Create proper Character object with all required fields
        const characterObj = character ? {
          id: character.id || `temp_${Date.now()}`,
          libraryId: character.libraryId || story.library_id || '',
          name: character.name || 'Character',
          traits: character.traits || {},
          createdAt: character.createdAt || new Date().toISOString(),
          updatedAt: character.updatedAt || new Date().toISOString()
        } : {
          id: `temp_${Date.now()}`,
          libraryId: story.library_id || '',
          name: 'Character',
          traits: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Ensure story content has proper structure (StoryContent with beats array)
        const storyContent = story.content || {};
        const storyObj = {
          id: story.id,
          title: story.title,
          content: storyContent // Pass full content structure (should have beats array)
        };
        
        const activitiesResult = await activitiesService.generateActivities({
          story: storyObj,
          character: characterObj,
          targetAge: targetAge || 7,
          preferredTypes,
          availableMaterials,
          timeConstraints,
          specialConsiderations
        });
        
        // Save activities to story
        await supabase
          .from('stories')
          .update({ activities: activitiesResult.activities })
          .eq('id', storyId);
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            activities: activitiesResult.activities,
            metadata: activitiesResult.metadata
          })
        };
      } catch (error) {
        console.error('[Content Agent] Activities generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Activities generation failed'
          })
        };
      }
    }
    
    // Generate PDF for story
    if (action === 'generate_pdf') {
      const { storyId, story, character, includeActivities, activities, customization } = body;
      
      if (!storyId || !story) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: storyId, story'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { PDFGenerationService } = await import('./services/PDFGenerationService');
        const pdfService = new PDFGenerationService({
          outputDirectory: '/tmp',
          fonts: { title: 'Helvetica-Bold', body: 'Helvetica', caption: 'Helvetica-Oblique' },
          layout: { pageWidth: 612, pageHeight: 792, margins: { top: 72, bottom: 72, left: 72, right: 72 } },
          colors: { primary: '#4A90E2', secondary: '#F5A623', text: '#333333', background: '#FFFFFF' }
        });
        
        // Get story with art URLs
        const { data: fullStory } = await supabase
          .from('stories')
          .select('*')
          .eq('id', storyId)
          .single();
        
        // Extract story content properly - StoryContent has beats array, not text property
        const storyContent = fullStory?.content as any || story.content;
        
        // Ensure story content has beats array (PDFGenerationService expects story.content.beats)
        // If content is a string or doesn't have beats, create a minimal structure
        let storyContentWithBeats: any;
        if (storyContent?.beats && Array.isArray(storyContent.beats)) {
          // Already has proper structure
          storyContentWithBeats = storyContent;
        } else if (typeof storyContent === 'string') {
          // Convert string to beats array structure
          storyContentWithBeats = {
            beats: [{ id: '1', sequence: 1, content: storyContent, emotionalTone: 'neutral' }]
          };
        } else {
          // Try to extract beats or create minimal structure
          storyContentWithBeats = {
            beats: storyContent?.beats || [{ id: '1', sequence: 1, content: JSON.stringify(storyContent), emotionalTone: 'neutral' }]
          };
        }
        
        // Extract art URLs from actual story data (not placeholders)
        const coverArtUrl = fullStory?.cover_art_url || '';
        const sceneArtUrls = Array.isArray(fullStory?.scene_art_urls) ? fullStory.scene_art_urls : [];
        
        // Create proper Character object with all required fields
        const characterObj = character ? {
          id: character.id || `temp_${Date.now()}`,
          libraryId: character.libraryId || story.library_id || '',
          name: character.name || 'Character',
          traits: character.traits || {},
          createdAt: character.createdAt || new Date().toISOString(),
          updatedAt: character.updatedAt || new Date().toISOString()
        } : {
          id: `temp_${Date.now()}`,
          libraryId: story.library_id || '',
          name: 'Character',
          traits: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Create proper GeneratedArt structure from actual story data
        const generatedArt = {
          coverArt: {
            url: coverArtUrl,
            prompt: '', // Not available from story record
            moment: { beatId: '', description: '', visualKineticScore: 0, plotShiftingScore: 0, combinedScore: 0 }
          },
          bodyIllustrations: sceneArtUrls.map((url: string, idx: number) => ({
            url,
            prompt: '', // Not available from story record
            illustration: { sequence: idx + 1, beatId: '', description: '', cameraAngle: '', depthDirective: '', prompt: '' }
          })),
          characterArt: {
            headshot: { url: '', prompt: '' }, // Not available from story record
            bodyshot: { url: '', prompt: '' } // Not available from story record
          }
        };
        
        // PDFGenerationService expects story.content.beats array (line 301 of PDFGenerationService.ts)
        // Pass full Story object with proper StoryContent structure
        const storyObj = {
          id: story.id,
          title: story.title,
          content: storyContentWithBeats // Content structure with beats array
        };
        
        // Normalize activities format - handle both array and GeneratedActivities structure
        let normalizedActivities: any = undefined;
        if (includeActivities) {
          const rawActivities = activities || fullStory?.activities;
          if (Array.isArray(rawActivities)) {
            // If it's already an array, wrap it in GeneratedActivities structure
            normalizedActivities = { activities: rawActivities };
          } else if (rawActivities && typeof rawActivities === 'object' && 'activities' in rawActivities) {
            // Already in GeneratedActivities format
            normalizedActivities = rawActivities;
          } else if (rawActivities) {
            // Try to extract activities array or create empty structure
            normalizedActivities = { activities: Array.isArray(rawActivities.activities) ? rawActivities.activities : [] };
          }
        }
        
        const pdfResult = await pdfService.generateStoryPDF({
          story: storyObj,
          character: characterObj,
          generatedArt,
          activities: normalizedActivities,
          includeActivities: includeActivities !== false,
          customization
        });
        
        // Upload PDF to S3
        // Use production pattern: ASSET_BUCKET or fallback to storytailor-assets-production
        let pdfUrl = null;
        const { getAssetBucketName, getCdnUrl } = await import('./utils/cdnUrl');
        const s3Bucket = getAssetBucketName();
        const s3Region = process.env.AWS_REGION || 'us-east-1';
        if (pdfResult.filePath) {
          try {
            const fs = await import('fs');
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({ region: s3Region });
            const pdfBuffer = fs.readFileSync(pdfResult.filePath);
            const pdfKey = `pdfs/${storyId}/${pdfResult.fileName}`;
            
            await s3Client.send(new PutObjectCommand({
              Bucket: s3Bucket,
              Key: pdfKey,
              Body: pdfBuffer,
              ContentType: 'application/pdf'
            }));
            
            // Return CDN URL instead of direct S3 URL
            pdfUrl = getCdnUrl(pdfKey);
          } catch (s3Error) {
            console.warn('Failed to upload PDF to S3', s3Error);
          }
        }
        
        // Update story with PDF URL
        if (pdfUrl) {
          await supabase
            .from('stories')
            .update({
              pdf_url: pdfUrl,
              pdf_pages: pdfResult.pageCount,
              pdf_file_size: pdfResult.fileSize
            })
            .eq('id', storyId);
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            pdfUrl,
            pageCount: pdfResult.pageCount,
            fileSize: pdfResult.fileSize
          })
        };
      } catch (error) {
        console.error('[Content Agent] PDF generation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'PDF generation failed'
          })
        };
      }
    }
    
    // Continue story (sequel/next chapter)
    if (action === 'continue_story') {
      const { parentStoryId, parentStory, continuationType, userDirection, themes, generateAssets } = body;
      
      if (!parentStoryId || !parentStory) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: parentStoryId, parentStory'
          })
        };
      }
      
      try {
        const agent = await getContentAgent();
        
        // Generate sequel story
        const result = await agent.generateStory({
          userId: parentStory.user_id || 'system',
          sessionId: `sequel_${Date.now()}`,
          characterName: parentStory.character_name || 'our hero',
          characterTraits: parentStory.character_traits || {},
          storyType: continuationType || parentStory.story_type || 'adventure',
          userAge: parentStory.age_rating || 7,
          storyId: parentStoryId, // Link to parent
          // Note: RealContentAgent.generateStory may not support all these params yet
        });
        
        // Create sequel story record
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
        );
        
        const { data: sequelStory, error: sequelError } = await supabase
          .from('stories')
          .insert({
            library_id: parentStory.library_id,
            title: `${parentStory.title} - Part 2`,
            content: result.story?.content || {},
            status: 'draft',
            age_rating: parentStory.age_rating || 0,
            parent_story_id: parentStoryId
          })
          .select()
          .single();
        
        if (sequelError) throw sequelError;
        
        // Create asset jobs if requested
        if (generateAssets && sequelStory) {
          // NEW ORDER (V3): Cover → Scenes → Activities → Audio → PDF
          // Rationale: Visual assets appear first, activities while audio renders, PDF last with all assets
          const assetTypes = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'activities', 'audio', 'pdf'];
          for (const assetType of assetTypes) {
            await supabase
              .from('asset_generation_jobs')
              .insert({
                story_id: sequelStory.id,
                asset_type: assetType,
                status: 'queued',
                metadata: {}
              });
          }
        }
        
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            data: sequelStory
          })
        };
      } catch (error) {
        console.error('[Content Agent] Story continuation failed:', error);
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Story continuation failed'
          })
        };
      }
    }
    
    // Unknown action
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        agentName: 'content',
        success: false,
        error: `Unknown action: ${action || body.intent?.type || 'none'}`
      })
    };

  } catch (error) {
    console.error('[Content Agent] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'content',
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        data: {
          details: error instanceof Error ? error.stack : undefined
        }
      })
    };
  }
};

async function handleFinalizationQueueEvent(event: any): Promise<any> {
  const records: any[] = Array.isArray(event.Records) ? event.Records : []
  const agent = await getContentAgent()

  const failures: Array<{ itemIdentifier: string }> = []

  for (const record of records) {
    const messageId = record.messageId || record.messageID || 'unknown'
    try {
      const correlationId =
        record.messageAttributes?.correlationId?.stringValue ||
        record.messageAttributes?.correlationId?.StringValue
      const rawBody = typeof record.body === 'string' ? record.body : JSON.stringify(record.body)
      const payload = parseFinalizationJobPayload(rawBody)
      console.log('[Finalization Worker] Start', { messageId, correlationId, storyId: payload.storyId })
      await runFinalizationJob(agent, payload)
    } catch (error) {
      console.error('[Finalization Worker] Failed record', { messageId, error })
      failures.push({ itemIdentifier: messageId })
    }
  }

  return { batchItemFailures: failures }
}


/**
 * Handle async job execution (triggered by AsyncJobManager)
 */
async function handleAsyncJob(event: any): Promise<any> {
  const { jobId, message, platform, userId, sessionId } = event;
  
  console.log('[Async Job] Processing', { jobId });

  try {
    const agent = await getContentAgent();
    const result = await agent.generateStory({
      userId: userId || 'anonymous',
      sessionId: sessionId || `session_${Date.now()}`,
      characterName: event.character?.name,
      characterTraits: event.character?.traits,
      storyType: event.storyType || 'adventure',
      userAge: event.userAge || 7
    });

    await updateJobStatus(jobId, 'completed', result);
    console.log('[Async Job] Completed', { jobId });
    return { statusCode: 200, body: JSON.stringify({ success: true, jobId }) };
  } catch (error) {
    console.error('[Async Job] Failed', { jobId, error });
    await updateJobStatus(jobId, 'failed', null, error instanceof Error ? error.message : String(error));
    return { statusCode: 500, body: JSON.stringify({ success: false, jobId }) };
  }
}

async function updateJobStatus(jobId: string, status: string, result?: any, error?: string): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('async_jobs').update({
      status,
      result_data: result,
      error_message: error,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('job_id', jobId);
  } catch (err) {
    console.error('[Async Job] Update failed', { jobId, error: err });
  }
}
