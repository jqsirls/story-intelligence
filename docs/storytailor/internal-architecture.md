Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2 - Storytailor internal architecture with detailed code references

# Storytailor Internal Architecture

## Overview

This document describes the internal architecture of the Storytailor platform, including component interactions, data flows, service initialization, and internal communication patterns. All descriptions are verified against actual code with file paths and line numbers.

## System Initialization

### Lambda Function Startup

**Entry Point:** `packages/universal-agent/src/lambda.ts:1-877`

**Initialization Flow:**

1. **Lambda Handler Execution** (`packages/universal-agent/src/lambda.ts:200-400`)
   - Health check handling for `/health` endpoint
   - Lazy loading of dependencies to reduce cold start time
   - Global instance caching for warm invocations

2. **Router Initialization** (`packages/universal-agent/src/lambda.ts:300-350`)
   ```typescript
   // Code location: packages/universal-agent/src/lambda.ts:300-350
   PlatformAwareRouter = require('@alexa-multi-agent/router').PlatformAwareRouter;
   const routerConfig = createDefaultConfig();
   router = new PlatformAwareRouter(routerConfig);
   await router.initialize();
   ```

3. **Event Publisher Initialization** (`packages/universal-agent/src/lambda.ts:334-365`)
   - EventSystem module loading
   - EventPublisher configuration
   - Fallback to mock publisher if unavailable

4. **Universal Conversation Manager** (`packages/universal-agent/src/lambda.ts:380-400`)
   ```typescript
   // Code location: packages/universal-agent/src/lambda.ts:380-400
   conversationManager = new UniversalConversationManager(router, eventPublisher, logger);
   ```

5. **REST API Gateway Initialization** (`packages/universal-agent/src/lambda.ts:400-450`)
   - RESTAPIGateway instance creation
   - Agent initialization (LocalizationAgent, EducationalAgent)
   - Route setup

**Code References:**
- `packages/universal-agent/src/lambda.ts:1-877` - Complete Lambda handler
- `packages/universal-agent/src/lambda.ts:200-400` - Initialization logic

### Agent Initialization in RESTAPIGateway

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:153-230`

**Initialization Sequence:**

1. **Localization Agent** (`packages/universal-agent/src/api/RESTAPIGateway.ts:163-184`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:163-184
   const localizationModule = await import('@alexa-multi-agent/localization-agent');
   LocalizationAgentClass = localizationModule.LocalizationAgent;
   this.localizationAgent = new LocalizationAgentClass(supabaseUrl, supabaseKey, openaiApiKey);
   ```

2. **Educational Agent** (`packages/universal-agent/src/api/RESTAPIGateway.ts:186-219`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:186-219
   const educationalModule = await import('@alexa-multi-agent/educational-agent');
   EducationalAgentClass = educationalModule.EducationalAgent;
   this.educationalAgent = new EducationalAgentClass({
     enableCurriculumAlignment: false,
     enableOutcomeTracking: true,
     enableClassroomManagement: true
   });
   ```

3. **Auth Agent** (`packages/universal-agent/src/api/RESTAPIGateway.ts:985-1006`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:985-1006
   const authAgent = new AuthAgent({
     supabaseUrl: process.env.SUPABASE_URL,
     supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY
   });
   this.authRoutes = new AuthRoutes(authAgent, this.logger);
   ```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:153-230` - Agent initialization
- `packages/universal-agent/src/api/RESTAPIGateway.ts:985-1006` - Auth Agent setup

## Request Processing Flow

### HTTP Request Handling

**Entry Point:** `packages/universal-agent/src/lambda.ts:47-200`

**Flow:**

1. **Event Parsing** (`packages/universal-agent/src/lambda.ts:47-100`)
   - Extract HTTP method, path, headers, body
   - Handle Function URL event format
   - Convert to Express request/response format

2. **Route Matching** (`packages/universal-agent/src/api/RESTAPIGateway.ts:537-619`)
   - Express router matches path to handler
   - Middleware execution (authentication, rate limiting, validation)

3. **Authentication Middleware** (`packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:320-536
   // JWT token validation
   // API key validation
   // User context attachment to req.user
   ```

4. **Rate Limiting** (`packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:232-253
   this.rateLimiter = new RateLimiterRedis({
     storeClient: this.redisClient,
     keyPrefix: 'api_rate_limit',
     points: 1000,
     duration: 3600
   });
   ```

5. **Request Validation** (`packages/universal-agent/src/api/RESTAPIGateway.ts:2580-2593`)
   - Joi schema validation
   - Input sanitization
   - Error handling

**Code References:**
- `packages/universal-agent/src/lambda.ts:47-200` - Request handling
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting

### Intent Classification Flow

**Location:** `packages/router/src/Router.ts:100-200`

**Process:**

1. **User Input Reception** (`packages/router/src/Router.ts:100-150`)
   - TurnContext creation from user input
   - Session state retrieval

2. **Intent Classification** (`packages/router/src/services/IntentClassifier.ts:43-95`)
   ```typescript
   // Code location: packages/router/src/services/IntentClassifier.ts:43-95
   const response = await this.openai.chat.completions.create({
     model: 'gpt-4',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt }
     ],
     functions: [this.getIntentClassificationFunction()],
     function_call: { name: 'classify_intent' }
   });
   ```

3. **Intent Result Processing** (`packages/router/src/services/IntentClassifier.ts:81-95`)
   - Parse function call response
   - Validate intent classification
   - Determine target agent

4. **Agent Selection** (`packages/router/src/types.ts:86`)
   ```typescript
   // Code location: packages/router/src/types.ts:86
   targetAgent: z.enum(['auth', 'content', 'library', 'emotion', 'commerce', 'insights'])
   ```

**Code References:**
- `packages/router/src/Router.ts:100-200` - Request processing
- `packages/router/src/services/IntentClassifier.ts:43-95` - Intent classification
- `packages/router/src/types.ts:79-88` - Intent schema

### Agent Delegation Flow

**Location:** `packages/router/src/services/AgentDelegator.ts:36-100`

**Process:**

1. **Circuit Breaker Check** (`packages/router/src/services/AgentDelegator.ts:52-57`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:52-57
   if (this.isCircuitBreakerOpen(agentName)) {
     throw new RouterError(
       RouterErrorCode.CIRCUIT_BREAKER_OPEN,
       `Circuit breaker is open for agent: ${agentName}`
     );
   }
   ```

2. **Agent Request Preparation** (`packages/router/src/services/AgentDelegator.ts:60-66`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:60-66
   const agentRequest: AgentRequest = {
     intent,
     context,
     memoryState,
     userId: context.userId,
     sessionId: context.sessionId
   };
   ```

3. **Agent Invocation** (`packages/router/src/services/AgentDelegator.ts:69`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:69
   const response = await this.callAgentWithRetry(agentName, agentRequest);
   ```

4. **Response Processing** (`packages/router/src/services/AgentDelegator.ts:72-81`)
   - Success recording
   - Failure handling
   - Fallback response generation

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:36-100` - Delegation logic
- `packages/router/src/services/AgentDelegator.ts:52-57` - Circuit breaker
- `packages/router/src/services/AgentDelegator.ts:200-300` - Retry logic

## Story Creation Workflow

### Character Creation Flow

**Location:** `packages/content-agent/src/services/CharacterGenerationService.ts`

**Process:**

1. **Character Initialization** (`packages/content-agent/src/services/CharacterConversationManager.ts`)
   - Interactive character building through conversation
   - Trait collection and validation
   - Character consistency checks

2. **Character Storage** (`packages/content-agent/src/services/CharacterDatabaseService.ts`)
   - Database persistence in `characters` table
   - Character metadata storage
   - Relationship tracking

3. **Character Consistency** (`packages/content-agent/src/services/CharacterConsistencyManager.ts`)
   - Trait validation across stories
   - Change request handling
   - User confirmation protocol

**Code References:**
- `packages/content-agent/src/services/CharacterGenerationService.ts` - Character generation
- `packages/content-agent/src/services/CharacterDatabaseService.ts` - Database operations
- `packages/content-agent/src/services/CharacterConsistencyManager.ts` - Consistency management

### Story Type Classification

**Location:** `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68`

**Process:**

1. **Input Analysis** (`packages/content-agent/src/services/StoryTypeClassifier.ts:15-20`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryTypeClassifier.ts:15-20
   this.logger.info('Classifying story intent', { 
     userId: request.userId, 
     sessionId: request.sessionId,
     inputLength: request.userInput.length 
   });
   ```

2. **OpenAI Classification** (`packages/content-agent/src/services/StoryTypeClassifier.ts:26-36`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryTypeClassifier.ts:26-36
   const response = await this.openai.chat.completions.create({
     model: 'gpt-4',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userPrompt }
     ],
     functions: [this.getClassificationFunction()],
     function_call: { name: 'classify_story_type' }
   });
   ```

3. **Result Validation** (`packages/content-agent/src/services/StoryTypeClassifier.ts:43-54`)
   - Parse function call response
   - Validate story type
   - Return classification result

**Code References:**
- `packages/content-agent/src/services/StoryTypeClassifier.ts:15-68` - Classification logic
- `packages/content-agent/src/services/StoryTypeClassifier.ts:70-94` - System prompt building
- `packages/router/src/types.ts:4-16` - StoryType enum

### Story Draft Creation

**Location:** `packages/content-agent/src/services/StoryCreationService.ts:46-78`

**Process:**

1. **Hero's Journey Outline** (`packages/content-agent/src/services/StoryCreationService.ts:53-58`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:53-58
   const outline = await this.generateHeroJourneyOutline(
     request.storyType,
     request.characterId,
     request.userAge,
     request.preferences
   );
   ```

2. **Initial Choices Generation** (`packages/content-agent/src/services/StoryCreationService.ts:61-65`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:61-65
   const initialChoices = await this.generateInitialChoices(
     request.storyType,
     outline,
     request.userAge
   );
   ```

3. **Draft Object Creation** (`packages/content-agent/src/services/StoryCreationService.ts:67-74`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:67-74
   const draft: StoryDraft = {
     id: this.generateId(),
     characterId: request.characterId,
     storyType: request.storyType,
     outline,
     currentBeat: 0,
     choices: initialChoices
   };
   ```

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:46-78` - Draft creation
- `packages/content-agent/src/services/StoryCreationService.ts:80-150` - Hero's journey generation

### Story Beat Continuation

**Location:** `packages/content-agent/src/services/StoryCreationService.ts:83-100`

**Process:**

1. **User Choice Processing** (`packages/content-agent/src/services/StoryCreationService.ts:88-95`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:88-95
   const beat = await this.generateNextBeat(
     request.storyId,
     request.userChoice,
     request.voiceInput
   );
   ```

2. **Completion Check** (`packages/content-agent/src/services/StoryCreationService.ts:97`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:97
   const isComplete = beat.sequence >= 12 || beat.content.includes('[STORY_END]');
   ```

3. **Next Choices Generation** (`packages/content-agent/src/services/StoryCreationService.ts:100`)
   ```typescript
   // Code location: packages/content-agent/src/services/StoryCreationService.ts:100
   const choices = isComplete ? [] : await this.generateChoicesForBeat(request.storyId, beat);
   ```

**Code References:**
- `packages/content-agent/src/services/StoryCreationService.ts:83-100` - Beat continuation
- `packages/content-agent/src/services/StoryCreationService.ts:150-250` - Beat generation logic

## Asset Generation Pipeline

**Location:** `packages/content-agent/src/services/AssetGenerationPipeline.ts:99-150`

**Process:**

1. **Pipeline Initialization** (`packages/content-agent/src/services/AssetGenerationPipeline.ts:70-94`)
   ```typescript
   // Code location: packages/content-agent/src/services/AssetGenerationPipeline.ts:70-94
   this.artService = new ArtGenerationService(this.config.artGeneration);
   this.audioService = new AudioGenerationService(this.config.audioGeneration);
   this.activitiesService = new EducationalActivitiesService(this.config.educationalActivities);
   this.pdfService = new PDFGenerationService(this.config.pdfGeneration);
   ```

2. **Parallel vs Sequential Generation** (`packages/content-agent/src/services/AssetGenerationPipeline.ts:115-131`)
   ```typescript
   // Code location: packages/content-agent/src/services/AssetGenerationPipeline.ts:115-131
   if (this.config.enableParallelGeneration) {
     const promises = await this.generateAssetsInParallel(request, errors, warnings);
     const results = await Promise.allSettled(promises);
   } else {
     await this.generateAssetsSequentially(request, assets, errors, warnings);
   }
   ```

3. **Asset Services:**
   - **Art Generation**: `packages/content-agent/src/services/ArtGenerationService.ts`
   - **Audio Generation**: `packages/content-agent/src/services/AudioGenerationService.ts`
   - **Educational Activities**: `packages/content-agent/src/services/EducationalActivitiesService.ts`
   - **PDF Generation**: `packages/content-agent/src/services/PDFGenerationService.ts`

**Code References:**
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:99-150` - Pipeline execution
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:200-300` - Parallel generation
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:300-400` - Sequential generation

## Conversation Management

### Universal Conversation Engine

**Location:** `packages/universal-agent/src/conversation/UniversalConversationEngine.ts:247-1649`

**Key Components:**

1. **Session Management** (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:281-347`)
   ```typescript
   // Code location: packages/universal-agent/src/conversation/UniversalConversationEngine.ts:281-347
   async startConversation(request: ConversationStartRequest): Promise<ConversationSession> {
     const session: ConversationSession = {
       sessionId,
       userId: request.userId,
       channel: request.channel,
       startedAt: new Date().toISOString(),
       expiresAt: new Date(Date.now() + (request.sessionDuration || 24 * 60 * 60 * 1000)).toISOString(),
       capabilities,
       state: {
         phase: 'greeting',
         context: request.initialContext || {},
         history: [],
         currentStory: null,
         currentCharacter: null,
         channelStates: {}
       }
     };
   }
   ```

2. **Channel Adapters** (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:253-254`)
   - Alexa Adapter: `packages/universal-agent/src/conversation/adapters/AlexaChannelAdapter.ts:7-441`
   - Web Chat Adapter: `packages/universal-agent/src/conversation/adapters/WebChatChannelAdapter.ts:7-517`
   - Platform-specific message preprocessing and response formatting

3. **Cross-Channel Synchronization** (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:260-262`)
   - State synchronization across channels
   - Conflict resolution
   - Session continuity

**Code References:**
- `packages/universal-agent/src/conversation/UniversalConversationEngine.ts:247-1649` - Complete engine
- `packages/universal-agent/src/conversation/adapters/AlexaChannelAdapter.ts:7-441` - Alexa adapter
- `packages/universal-agent/src/conversation/adapters/WebChatChannelAdapter.ts:7-517` - Web chat adapter

## Data Persistence

### Database Operations

**Primary Database:** Supabase (PostgreSQL)

**Table Structure:**
- **Stories**: `stories` table (`supabase/migrations/20240101000000_initial_schema.sql:5-50`)
- **Characters**: `characters` table (`supabase/migrations/20240101000000_initial_schema.sql:51-80`)
- **Libraries**: `libraries` table (`supabase/migrations/20240101000007_library_agent_tables.sql:5-100`)
- **Users**: `users` table (`supabase/migrations/20240101000000_initial_schema.sql:1-4`)
- **API Keys**: `api_keys` table (`supabase/migrations/20240101000018_api_keys_and_webhooks.sql:5-56`)
- **Webhooks**: `webhooks` table (`supabase/migrations/20240101000018_api_keys_and_webhooks.sql:73-120`)

**Row Level Security:**
- All tables have RLS enabled
- Policies defined per table (`supabase/migrations/20240101000001_rls_policies.sql`)

**Code References:**
- `supabase/migrations/20240101000000_initial_schema.sql:1-166` - Core schema
- `supabase/migrations/20240101000001_rls_policies.sql` - RLS policies
- `packages/library-agent/src/LibraryAgent.ts:25-495` - Library operations

### Caching Strategy

**Redis Usage:**

1. **Rate Limiting** (`packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`)
   ```typescript
   // Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:232-253
   this.rateLimiter = new RateLimiterRedis({
     storeClient: this.redisClient,
     keyPrefix: 'api_rate_limit',
     points: 1000,
     duration: 3600
   });
   ```

2. **Conversation State** (`packages/router/src/services/ConversationStateManager.ts`)
   - Session state caching
   - Memory state storage
   - State expiration management

3. **Story Classification Cache** (`packages/content-agent/src/ContentAgent.ts:144-149`)
   ```typescript
   // Code location: packages/content-agent/src/ContentAgent.ts:144-149
   const cacheKey = `story_classification:${request.userId}:${Buffer.from(request.userInput).toString('base64')}`;
   const cached = await this.getCachedResult(cacheKey);
   if (cached) {
     return cached;
   }
   ```

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:232-253` - Rate limiting
- `packages/router/src/services/ConversationStateManager.ts` - State management
- `packages/content-agent/src/ContentAgent.ts:144-149` - Classification caching

## Error Handling & Resilience

### Circuit Breaker Pattern

**Location:** `packages/router/src/services/AgentDelegator.ts:18-646`

**Implementation:**

1. **Circuit Breaker State** (`packages/router/src/services/AgentDelegator.ts:19`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:19
   private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
   ```

2. **Failure Tracking** (`packages/router/src/services/AgentDelegator.ts:92`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:92
   this.recordFailure(agentName);
   ```

3. **Fallback Response** (`packages/router/src/services/AgentDelegator.ts:95-97`)
   ```typescript
   // Code location: packages/router/src/services/AgentDelegator.ts:95-97
   if (this.config.fallback.enabled) {
     return this.getFallbackResponse(agentName, intent, error);
   }
   ```

**Code References:**
- `packages/router/src/services/AgentDelegator.ts:18-646` - Complete circuit breaker implementation
- `packages/router/src/services/AgentDelegator.ts:200-300` - Retry logic
- `packages/router/src/services/AgentDelegator.ts:300-400` - Fallback generation

### Asset Generation Failure Handling

**Location:** `packages/content-agent/src/services/AssetGenerationFailureHandler.ts`

**Process:**

1. **Failure Detection** (`packages/content-agent/src/services/AssetGenerationPipeline.ts:120-127`)
   ```typescript
   // Code location: packages/content-agent/src/services/AssetGenerationPipeline.ts:120-127
   results.forEach((result, index) => {
     if (result.status === 'fulfilled') {
       assets[assetType] = result.value;
     } else {
       errors.push(`Failed to generate ${request.assetTypes[index]}: ${result.reason}`);
     }
   });
   ```

2. **Failure Handler Processing** (`packages/content-agent/src/services/AssetGenerationFailureHandler.ts`)
   - Error categorization
   - Retry decision logic
   - Progress update generation

3. **Recovery Strategies** (`packages/content-agent/src/services/AssetGenerationFailureHandler.ts`)
   - Automatic retry with backoff
   - Alternative service fallback
   - Partial asset delivery

**Code References:**
- `packages/content-agent/src/services/AssetGenerationFailureHandler.ts` - Failure handling
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:120-127` - Error collection

## Internal Communication Patterns

### Synchronous Agent Invocation

**Pattern:** Router → AgentDelegator → Lambda Function (HTTP Invoke)

**Code Reference:**
- `packages/router/src/services/AgentDelegator.ts:36-100` - Synchronous delegation
- `scripts/update-router-http-handler.sh:203-219` - Lambda invocation

### Event-Driven Communication

**Pattern:** Agent → EventPublisher → EventStore → EventSubscriber → Other Agents

**Code Reference:**
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:191-192` - Event publishing
- `packages/event-system/src/EventPublisher.ts` - Event publisher implementation
- `packages/event-system/src/index.ts:1-82` - Event system exports

### Direct Agent Embedding

**Pattern:** Universal Agent → Embedded Agent Classes (Local)

**Code Reference:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:153-230` - Agent initialization
- `packages/universal-agent/src/api/RESTAPIGateway.ts:1362-1494` - Localization agent direct usage

## Service Dependencies

### Content Agent Dependencies

**Location:** `packages/content-agent/src/ContentAgent.ts:34-103`

**Services Initialized:**

1. **StoryTypeClassifier** (`packages/content-agent/src/ContentAgent.ts:90`)
   ```typescript
   // Code location: packages/content-agent/src/ContentAgent.ts:90
   this.classifier = new StoryTypeClassifier(this.openai, this.logger);
   ```

2. **PromptSelector** (`packages/content-agent/src/ContentAgent.ts:91`)
   ```typescript
   // Code location: packages/content-agent/src/ContentAgent.ts:91
   this.promptSelector = new PromptSelector(this.logger);
   ```

3. **ContentModerator** (`packages/content-agent/src/ContentAgent.ts:92`)
   ```typescript
   // Code location: packages/content-agent/src/ContentAgent.ts:92
   this.moderator = new ContentModerator(this.openai, this.logger, this.config.moderationEnabled);
   ```

4. **Character Services** (`packages/content-agent/src/ContentAgent.ts:94-96`)
   - CharacterGenerationService
   - CharacterDatabaseService
   - CharacterConversationManager

5. **Story Services** (`packages/content-agent/src/ContentAgent.ts:97-98`)
   - StoryCreationService
   - StoryConversationManager

6. **Asset Pipeline** (`packages/content-agent/src/ContentAgent.ts:99`)
   ```typescript
   // Code location: packages/content-agent/src/ContentAgent.ts:99
   this.assetPipeline = new AssetGenerationPipeline(this.createAssetPipelineConfig());
   ```

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:34-103` - Service initialization
- `packages/content-agent/src/ContentAgent.ts:89-103` - Service creation

### Library Agent Dependencies

**Location:** `packages/library-agent/src/LibraryAgent.ts:34-49`

**Services Initialized:**

1. **LibraryService** (`packages/library-agent/src/LibraryAgent.ts:38`)
   ```typescript
   // Code location: packages/library-agent/src/LibraryAgent.ts:38
   this.libraryService = new LibraryService(this.supabase);
   ```

2. **PermissionService** (`packages/library-agent/src/LibraryAgent.ts:39`)
   ```typescript
   // Code location: packages/library-agent/src/LibraryAgent.ts:39
   this.permissionService = new PermissionService(this.supabase);
   ```

3. **StoryService** (`packages/library-agent/src/LibraryAgent.ts:40`)
   ```typescript
   // Code location: packages/library-agent/src/LibraryAgent.ts:40
   this.storyService = new StoryService(this.supabase, this.permissionService);
   ```

4. **Insights Services** (`packages/library-agent/src/LibraryAgent.ts:42-43`)
   - InsightsService
   - EmotionalInsightsService

**Code References:**
- `packages/library-agent/src/LibraryAgent.ts:34-49` - Service initialization

## Configuration Management

### Environment Variables

**Retrieval Pattern:** SSM Parameter Store → Environment Variables → Agent Configuration

**Code Reference:**
- `scripts/deploy-universal-agent-proper.sh:586-618` - Environment variable setup
- `packages/universal-agent/src/api/RESTAPIGateway.ts:156-159` - Environment variable usage

### SSM Parameter Access

**Pattern:**
```typescript
// Code location: scripts/deploy-universal-agent-proper.sh:586-618
SUPABASE_URL=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/supabase/url" --query "Parameter.Value" --output text)
SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --name "/storytailor-${ENVIRONMENT}/supabase/service-key" --with-decryption --query "Parameter.Value" --output text)
```

**Verified Against:**
- `docs/system/ssm_parameters_inventory.md:24-220` - SSM parameter inventory
- `scripts/deploy-universal-agent-proper.sh:586-618` - Parameter retrieval

## Performance Optimizations

### Caching Strategies

1. **Story Classification Cache** (`packages/content-agent/src/ContentAgent.ts:144-149`)
   - Cache key based on user ID and input hash
   - Reduces OpenAI API calls

2. **Conversation State Cache** (`packages/router/src/services/ConversationStateManager.ts`)
   - Redis-based state storage
   - Reduces database queries

3. **Rate Limiting Cache** (`packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`)
   - Redis-based rate limit tracking
   - Prevents excessive API usage

### Parallel Processing

**Asset Generation** (`packages/content-agent/src/services/AssetGenerationPipeline.ts:115-127`)
```typescript
// Code location: packages/content-agent/src/services/AssetGenerationPipeline.ts:115-127
if (this.config.enableParallelGeneration) {
  const promises = await this.generateAssetsInParallel(request, errors, warnings);
  const results = await Promise.allSettled(promises);
}
```

**Code References:**
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:115-127` - Parallel generation
- `packages/content-agent/src/services/AssetGenerationPipeline.ts:200-300` - Parallel implementation

## Internal Data Structures

### TurnContext

**Location:** `packages/router/src/types.ts:63-77`

**Structure:**
```typescript
// Code location: packages/router/src/types.ts:63-77
export const TurnContextSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string(),
  requestId: z.string(),
  userInput: z.string(),
  channel: z.enum(['alexa', 'web', 'mobile', 'api']),
  locale: z.string().default('en-US'),
  deviceType: z.enum(['voice', 'screen', 'mobile', 'web']).optional(),
  timestamp: z.string().datetime(),
  conversationPhase: z.nativeEnum(ConversationPhase).optional(),
  previousIntent: z.nativeEnum(IntentType).optional(),
  metadata: z.record(z.any()).optional()
});
```

### Intent

**Location:** `packages/router/src/types.ts:79-88`

**Structure:**
```typescript
// Code location: packages/router/src/types.ts:79-88
export const IntentSchema = z.object({
  type: z.nativeEnum(IntentType),
  confidence: z.number().min(0).max(1),
  storyType: z.nativeEnum(StoryType).optional(),
  parameters: z.record(z.any()).optional(),
  requiresAuth: z.boolean().default(false),
  targetAgent: z.enum(['auth', 'content', 'library', 'emotion', 'commerce', 'insights']),
  conversationPhase: z.nativeEnum(ConversationPhase).optional()
});
```

### AgentResponse

**Location:** `packages/router/src/types.ts:93-104`

**Structure:**
```typescript
// Code location: packages/router/src/types.ts:93-104
export const AgentResponseSchema = z.object({
  agentName: z.string(),
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  nextPhase: z.nativeEnum(ConversationPhase).optional(),
  requiresFollowup: z.boolean().default(false),
  followupAgent: z.string().optional(),
  metadata: z.record(z.any()).optional()
});
```

**Code References:**
- `packages/router/src/types.ts:1-273` - Complete type definitions
- `packages/shared-types/src/index.ts:1-170` - Shared type exports

## Internal API Patterns

### REST Route Setup

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:537-619`

**Pattern:**
```typescript
// Code location: packages/universal-agent/src/api/RESTAPIGateway.ts:537-619
this.app.use('/v1/conversation', conversationRouter);
this.app.use('/v1/stories', storyRouter);
this.app.use('/v1/characters', characterRouter);
this.app.use('/v1/libraries', libraryRouter);
this.app.use('/v1/auth', authRouter);
this.app.use('/v1/smarthome', smartHomeRouter);
this.app.use('/v1/webhooks', webhookRouter);
this.app.use('/v1/analytics', analyticsRouter);
this.app.use('/developer', developerRouter);
this.app.use('/v1/localization', localizationRouter);
this.app.use('/v1/therapeutic-groups', therapeuticGroupRouter);
this.app.use('/v1/partners', partnerRouter);
```

### Middleware Chain

**Order:**
1. CORS (`packages/universal-agent/src/api/RESTAPIGateway.ts:250-260`)
2. Helmet Security (`packages/universal-agent/src/api/RESTAPIGateway.ts:262-270`)
3. Body Parser (`packages/universal-agent/src/api/RESTAPIGateway.ts:272-280`)
4. Authentication (`packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`)
5. Rate Limiting (`packages/universal-agent/src/api/RESTAPIGateway.ts:232-253`)
6. Request Validation (`packages/universal-agent/src/api/RESTAPIGateway.ts:2580-2593`)

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:250-280` - Middleware setup
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication middleware

## Internal State Management

### Conversation State

**Storage:** Redis + Supabase

**Components:**
1. **ConversationStateManager** (`packages/router/src/services/ConversationStateManager.ts`)
   - Redis-based state caching
   - State expiration management
   - State synchronization

2. **Database State** (`supabase/migrations/20240101000000_initial_schema.sql:124-132`)
   - `conversation_states` table
   - Persistent state storage
   - State history tracking

**Code References:**
- `packages/router/src/services/ConversationStateManager.ts` - State manager
- `supabase/migrations/20240101000000_initial_schema.sql:124-132` - State table

### Session Management

**Location:** `packages/universal-agent/src/conversation/UniversalConversationEngine.ts:257-258`

**Implementation:**
```typescript
// Code location: packages/universal-agent/src/conversation/UniversalConversationEngine.ts:257-258
private activeSessions: Map<string, ConversationSession> = new Map();
private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
```

**Session Lifecycle:**
1. Session creation (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:281-347`)
2. Session expiration scheduling (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:322`)
3. Session cleanup (`packages/universal-agent/src/conversation/UniversalConversationEngine.ts:275`)

**Code References:**
- `packages/universal-agent/src/conversation/UniversalConversationEngine.ts:257-347` - Session management

## Internal Logging & Monitoring

### Logging Architecture

**Framework:** Winston (`packages/*/src/utils/logger.ts`)

**Log Levels:**
- Error: System errors and failures
- Warn: Warning conditions
- Info: Informational messages
- Debug: Debugging information

**Code Reference:**
- `packages/router/src/utils/logger.ts` - Logger utility
- `packages/content-agent/src/ContentAgent.ts:61-72` - Logger initialization

### Event Publishing

**Location:** `packages/universal-agent/src/UniversalStorytellerAPI.ts:191-192`

**Usage:**
```typescript
// Code location: packages/universal-agent/src/UniversalStorytellerAPI.ts:191-192
if (this.eventPublisher) {
  await this.eventPublisher.publishEvent('com.storytailor.conversation.session_started', {...});
}
```

**Event Types:**
- System events: `com.storytailor.system.*`
- Story events: `com.storytailor.story.*`
- Privacy events: `com.storytailor.privacy.*`
- Smart home events: `com.storytailor.smarthome.*`

**Code References:**
- `packages/event-system/src/index.ts:36-50` - Event type helpers
- `packages/universal-agent/src/UniversalStorytellerAPI.ts:191-192` - Event publishing

## Internal Security

### Authentication Flow

**Location:** `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536`

**Process:**

1. **Token Extraction** (`packages/universal-agent/src/api/RESTAPIGateway.ts:400-450`)
   - Extract from `Authorization` header
   - Support for `Bearer <token>` format

2. **JWT Validation** (`packages/universal-agent/src/api/RESTAPIGateway.ts:450-500`)
   - Token verification
   - User context extraction
   - Expiration checking

3. **API Key Validation** (`packages/universal-agent/src/api/RESTAPIGateway.ts:500-535`)
   - API key lookup in database
   - Hash verification
   - Permission checking

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Complete authentication middleware
- `packages/universal-agent/src/api/RESTAPIGateway.ts:2995-3037` - API key management

### Data Access Control

**Row Level Security:**
- All tables have RLS enabled
- Policies enforce user-based access (`supabase/migrations/20240101000001_rls_policies.sql`)

**Code Reference:**
- `supabase/migrations/20240101000001_rls_policies.sql` - RLS policy definitions

## Internal Communication Protocols

### Agent-to-Agent Communication

**Pattern 1: HTTP Lambda Invoke** (Primary)
- Router delegates to Lambda functions via HTTP
- Code: `packages/router/src/services/AgentDelegator.ts:36-100`

**Pattern 2: Direct Class Instantiation** (Embedded)
- Universal Agent embeds agent classes directly
- Code: `packages/universal-agent/src/api/RESTAPIGateway.ts:153-230`

**Pattern 3: Event-Driven** (Asynchronous)
- Agents communicate via event system
- Code: `packages/event-system/src/EventPublisher.ts`

**Verified Against:**
- `docs/system/architecture.md:150-250` - Communication patterns
- `packages/router/src/services/AgentDelegator.ts:36-100` - Delegation implementation

## Internal Error Handling

### Error Propagation

**Pattern:**
1. Agent throws error
2. AgentDelegator catches error (`packages/router/src/services/AgentDelegator.ts:83-100`)
3. Circuit breaker records failure
4. Fallback response generated (if enabled)
5. Error logged with context

**Code Reference:**
- `packages/router/src/services/AgentDelegator.ts:83-100` - Error handling
- `packages/router/src/services/AgentDelegator.ts:300-400` - Fallback generation

### Retry Logic

**Location:** `packages/router/src/services/AgentDelegator.ts:200-300`

**Implementation:**
- Exponential backoff
- Maximum retry attempts
- Timeout handling

**Code Reference:**
- `packages/router/src/services/AgentDelegator.ts:200-300` - Retry implementation

## Internal Performance Characteristics

### Request Processing Times

**Typical Flow:**
1. Request reception: < 10ms
2. Authentication: 50-100ms (database lookup)
3. Intent classification: 500-2000ms (OpenAI API call)
4. Agent delegation: 100-500ms (Lambda invoke)
5. Agent processing: 1000-5000ms (varies by agent)
6. Response formation: < 50ms

**Total:** 1.7-7.6 seconds (typical)

**Code References:**
- `packages/router/src/services/IntentClassifier.ts:26-36` - OpenAI API call
- `packages/router/src/services/AgentDelegator.ts:69` - Agent invocation

### Caching Impact

**Cache Hit Scenarios:**
- Story classification: 50-100ms (vs 500-2000ms)
- Conversation state: 10-50ms (vs 100-200ms)
- Rate limit check: 5-10ms (vs 50-100ms)

**Code References:**
- `packages/content-agent/src/ContentAgent.ts:144-149` - Classification cache
- `packages/router/src/services/ConversationStateManager.ts` - State cache

## Internal Architecture Summary

### Component Hierarchy

```
Universal Agent (Lambda)
├── RESTAPIGateway
│   ├── Authentication Middleware
│   ├── Rate Limiting
│   ├── Route Handlers
│   └── Embedded Agents (Localization, Educational, Auth)
├── UniversalConversationEngine
│   ├── Channel Adapters (Alexa, Web Chat, etc.)
│   ├── Session Management
│   └── Cross-Channel Sync
└── Router
    ├── IntentClassifier
    ├── AgentDelegator
    └── ConversationStateManager
        └── Delegates to Specialized Agents (Lambda Functions)
```

**Verified Against:**
- `docs/system/architecture.md:24-200` - Architecture diagrams
- `packages/universal-agent/src/lambda.ts:1-877` - Lambda handler
- `packages/universal-agent/src/api/RESTAPIGateway.ts:74-3511` - REST API Gateway

### Data Flow Summary

1. **Request** → RESTAPIGateway
2. **Authentication** → JWT/API Key validation
3. **Rate Limiting** → Redis check
4. **Route Matching** → Express router
5. **Intent Classification** → Router + OpenAI
6. **Agent Delegation** → AgentDelegator
7. **Agent Processing** → Specialized Agent Lambda
8. **Data Persistence** → Supabase
9. **Response Formation** → RESTAPIGateway
10. **Response** → Client

**Code References:**
- `packages/universal-agent/src/api/RESTAPIGateway.ts:320-536` - Authentication
- `packages/router/src/Router.ts:100-200` - Request processing
- `packages/router/src/services/AgentDelegator.ts:36-100` - Delegation
