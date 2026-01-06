import { PlatformAwareRouter } from '../src/PlatformAwareRouter';
import { RouterConfig } from '../src/config';
import {
    EmbeddingConfig,
    WebhookConfig,
    UniversalPlatformConfig,
    VoicePlatform
} from '@alexa-multi-agent/shared-types';

// Example: Enhanced Voice Platform Support for Universal Deployment

async function demonstrateEnhancedVoicePlatformSupport() {
    // Initialize the platform-aware router
    const config: RouterConfig = {
        openai: {
            apiKey: process.env.OPENAI_API_KEY || 'test-key',
            model: 'gpt-4-1106-preview',
            maxTokens: 1000,
            temperature: 0.3
        },
        database: {
            url: process.env.SUPABASE_URL || 'http://localhost:54321',
            apiKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
        },
        redis: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            keyPrefix: 'storytailor',
            defaultTtl: 3600
        },
        agents: {
            auth: { endpoint: 'http://localhost:3001', timeout: 5000, retries: 3 },
            content: { endpoint: 'http://localhost:3002', timeout: 5000, retries: 3 },
            library: { endpoint: 'http://localhost:3003', timeout: 5000, retries: 3 },
            emotion: { endpoint: 'http://localhost:3004', timeout: 5000, retries: 3 },
            commerce: { endpoint: 'http://localhost:3005', timeout: 5000, retries: 3 },
            insights: { endpoint: 'http://localhost:3006', timeout: 5000, retries: 3 }
        },
        circuitBreaker: {
            failureThreshold: 5,
            resetTimeout: 60000,
            monitoringPeriod: 300000
        },
        fallback: {
            enabled: true,
            defaultResponse: "I'm having trouble right now, but let's try creating a story together!",
            maxRetries: 2
        }
    };

    const router = new PlatformAwareRouter(config);

    console.log('🚀 Enhanced Voice Platform Support Demo');
    console.log('=====================================\n');

    // 1. Generate embedding code for Alexa+ third-party skill
    console.log('1. Generating Alexa+ Third-Party Skill Embedding Code');
    console.log('---------------------------------------------------');

    const alexaEmbeddingConfig: EmbeddingConfig = {
        invocationName: 'Storytailor',
        description: 'Create stories tailored for you with immersive smart home lighting',
        category: 'education_and_reference',
        keywords: ['storytelling', 'children', 'education', 'smart home'],
        privacyPolicyUrl: 'https://storytailor.com/privacy',
        termsOfUseUrl: 'https://storytailor.com/terms',
        supportedLocales: ['en-US', 'en-GB', 'en-CA', 'en-AU'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: [
            {
                name: 'alexa::profile:email:read',
                reason: 'To link your Storytailor account',
                required: true
            },
            {
                name: 'alexa::devices:all:address:country_and_postal_code:read',
                reason: 'To provide localized content',
                required: false
            }
        ],
        smartHomeIntegration: {
            supportedDeviceTypes: ['LIGHT', 'SWITCH'],
            supportedCapabilities: ['Alexa.PowerController', 'Alexa.BrightnessController', 'Alexa.ColorController'],
            requiresAccountLinking: true,
            oauthConfig: {
                authorizationUrl: 'https://api.storytailor.com/oauth/authorize',
                tokenUrl: 'https://api.storytailor.com/oauth/token',
                clientId: 'storytailor-alexa-client',
                scopes: ['smart_home:read', 'smart_home:write'],
                redirectUri: 'https://api.storytailor.com/oauth/callback'
            }
        }
    };

    try {
        const alexaEmbeddingCode = await router.generateEmbeddingCode('alexa_plus', alexaEmbeddingConfig);
        console.log('✅ Alexa+ embedding code generated successfully');
        console.log('📄 Code preview:', alexaEmbeddingCode.substring(0, 200) + '...\n');
    } catch (error) {
        console.error('❌ Failed to generate Alexa+ embedding code:', error);
    }

    // 2. Generate embedding code for Google Assistant Actions
    console.log('2. Generating Google Assistant Actions Embedding Code');
    console.log('--------------------------------------------------');

    const googleEmbeddingConfig: EmbeddingConfig = {
        actionId: 'storytailor-action',
        invocationName: 'Storytailor',
        description: 'Create stories tailored for you with smart home integration',
        category: 'games_and_trivia',
        keywords: ['storytelling', 'children', 'education'],
        privacyPolicyUrl: 'https://storytailor.com/privacy',
        termsOfUseUrl: 'https://storytailor.com/terms',
        supportedLocales: ['en-US', 'en-GB'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: [
            {
                name: 'DEVICE_PRECISE_LOCATION',
                reason: 'To provide localized content',
                required: false
            }
        ],
        smartHomeIntegration: {
            supportedDeviceTypes: ['action.devices.types.LIGHT'],
            supportedCapabilities: ['action.devices.traits.OnOff', 'action.devices.traits.Brightness'],
            requiresAccountLinking: true
        }
    };

    try {
        const googleEmbeddingCode = await router.generateEmbeddingCode('google_assistant', googleEmbeddingConfig);
        console.log('✅ Google Assistant embedding code generated successfully');
        console.log('📄 Code preview:', googleEmbeddingCode.substring(0, 200) + '...\n');
    } catch (error) {
        console.error('❌ Failed to generate Google Assistant embedding code:', error);
    }

    // 3. Generate embedding code for Apple Siri Shortcuts
    console.log('3. Generating Apple Siri Shortcuts Embedding Code');
    console.log('-----------------------------------------------');

    const siriEmbeddingConfig: EmbeddingConfig = {
        shortcutId: 'com.storytailor.shortcuts',
        invocationName: 'Storytailor',
        description: 'Create stories tailored for you with HomeKit integration',
        category: 'education',
        keywords: ['storytelling', 'children', 'homekit'],
        privacyPolicyUrl: 'https://storytailor.com/privacy',
        termsOfUseUrl: 'https://storytailor.com/terms',
        supportedLocales: ['en-US', 'en-GB'],
        targetAudience: 'family',
        contentRating: 'everyone',
        permissions: [
            {
                name: 'HomeKit Access',
                reason: 'To control smart lights during storytelling',
                required: false
            }
        ],
        smartHomeIntegration: {
            supportedDeviceTypes: ['Lightbulb', 'Switch'],
            supportedCapabilities: ['On', 'Brightness', 'Hue', 'Saturation'],
            requiresAccountLinking: false // HomeKit handles this
        }
    };

    try {
        const siriEmbeddingCode = await router.generateEmbeddingCode('apple_siri', siriEmbeddingConfig);
        console.log('✅ Apple Siri embedding code generated successfully');
        console.log('📄 Code preview:', siriEmbeddingCode.substring(0, 200) + '...\n');
    } catch (error) {
        console.error('❌ Failed to generate Apple Siri embedding code:', error);
    }

    // 4. Set up webhooks for platform integrations
    console.log('4. Setting Up Platform Webhooks');
    console.log('------------------------------');

    const webhookConfig: WebhookConfig = {
        url: 'https://api.storytailor.com/webhooks/platform-events',
        events: [
            { type: 'skill_enabled' },
            { type: 'skill_disabled' },
            { type: 'account_linked' },
            { type: 'account_unlinked' },
            { type: 'smart_home_discovery' },
            { type: 'smart_home_control' },
            { type: 'conversation_started' },
            { type: 'conversation_ended' },
            { type: 'error_occurred' }
        ],
        secret: process.env.WEBHOOK_SECRET || 'your-webhook-secret',
        headers: {
            'User-Agent': 'Storytailor-Platform-Integration/1.0'
        },
        retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelayMs: 1000,
            maxDelayMs: 30000
        },
        authentication: {
            type: 'hmac_signature',
            credentials: {
                secret: process.env.WEBHOOK_SECRET || 'your-webhook-secret'
            }
        }
    };

    // Set up webhooks for all supported platforms
    const platforms: VoicePlatform[] = ['alexa_plus', 'google_assistant', 'apple_siri'];

    for (const platform of platforms) {
        try {
            const webhookResult = await router.setupWebhook(platform, webhookConfig);
            console.log(`✅ ${platform} webhook set up successfully`);
            console.log(`   Webhook ID: ${webhookResult.webhookId}`);
            console.log(`   Status: ${webhookResult.status}`);
            console.log(`   Verification Token: ${webhookResult.verificationToken}\n`);
        } catch (error) {
            console.error(`❌ Failed to set up ${platform} webhook:`, error);
        }
    }

    // 5. Register a universal platform adapter for future platforms
    console.log('5. Registering Universal Platform Adapter');
    console.log('---------------------------------------');

    const universalPlatformConfig: UniversalPlatformConfig = {
        platformName: 'custom_voice_assistant',
        version: '1.0',
        capabilities: ['smart_home', 'voice_synthesis', 'webhook_support'],
        requestFormat: 'json',
        responseFormat: 'json',
        authentication: {
            type: 'bearer_token',
            config: {
                tokenHeader: 'Authorization',
                tokenPrefix: 'Bearer '
            }
        },
        endpoints: {
            conversation: 'https://api.custom-assistant.com/conversation',
            smartHome: 'https://api.custom-assistant.com/smart-home',
            webhook: 'https://api.custom-assistant.com/webhooks'
        },
        requestMapping: {
            userId: 'user.id',
            sessionId: 'session.id',
            intent: 'request.intent.name',
            parameters: 'request.intent.parameters',
            deviceId: 'device.id',
            locale: 'request.locale',
            timestamp: 'request.timestamp'
        },
        responseMapping: {
            speech: 'response.outputSpeech.text',
            reprompt: 'response.reprompt.outputSpeech.text',
            shouldEndSession: 'response.shouldEndSession',
            sessionAttributes: 'sessionAttributes',
            cards: 'response.card',
            directives: 'response.directives'
        },
        smartHomeMapping: {
            deviceId: 'device.id',
            deviceType: 'device.type',
            action: 'directive.header.name',
            parameters: 'directive.payload',
            roomId: 'device.context.roomId',
            userId: 'context.user.id'
        }
    };

    try {
        router.registerUniversalPlatform('custom_voice_assistant', universalPlatformConfig);
        console.log('✅ Universal platform adapter registered successfully');
        console.log('   Platform: custom_voice_assistant');
        console.log('   Capabilities:', universalPlatformConfig.capabilities.join(', '));
        console.log('');
    } catch (error) {
        console.error('❌ Failed to register universal platform adapter:', error);
    }

    // 6. Demonstrate smart home synchronization across platforms
    console.log('6. Smart Home Synchronization Across Platforms');
    console.log('--------------------------------------------');

    const userId = 'user_123';
    const smartHomeAction = {
        type: 'set_story_environment',
        storyType: 'bedtime',
        userId: userId,
        roomId: 'bedroom'
    };

    try {
        await router.synchronizeSmartHomeAcrossPlatforms(userId, smartHomeAction);
        console.log('✅ Smart home synchronized across all platforms');
        console.log(`   Action: ${smartHomeAction.type}`);
        console.log(`   Story Type: ${smartHomeAction.storyType}`);
        console.log(`   User: ${userId}`);
        console.log(`   Room: ${smartHomeAction.roomId}\n`);
    } catch (error) {
        console.error('❌ Failed to synchronize smart home across platforms:', error);
    }

    // 7. Handle sample webhook events
    console.log('7. Handling Sample Webhook Events');
    console.log('--------------------------------');

    const sampleWebhookPayloads = [
        {
            platform: 'alexa_plus' as VoicePlatform,
            payload: {
                eventType: 'skill_enabled',
                timestamp: new Date().toISOString(),
                userId: 'alexa_user_123',
                platform: 'alexa_plus' as VoicePlatform,
                data: {
                    skillId: 'amzn1.ask.skill.storytailor',
                    locale: 'en-US'
                }
            },
            headers: {
                'x-signature': 'sha256=sample_signature',
                'content-type': 'application/json'
            } as Record<string, string>
        },
        {
            platform: 'google_assistant' as VoicePlatform,
            payload: {
                eventType: 'account_linked',
                timestamp: new Date().toISOString(),
                userId: 'google_user_456',
                platform: 'google_assistant' as VoicePlatform,
                data: {
                    actionId: 'storytailor-action',
                    accountToken: 'linked_account_token'
                }
            },
            headers: {
                'signature': 'sample_google_signature',
                'content-type': 'application/json'
            } as Record<string, string>
        },
        {
            platform: 'apple_siri' as VoicePlatform,
            payload: {
                eventType: 'smart_home_discovery',
                timestamp: new Date().toISOString(),
                userId: 'siri_user_789',
                platform: 'apple_siri' as VoicePlatform,
                data: {
                    shortcutId: 'com.storytailor.shortcuts',
                    requestId: 'discovery_request_123'
                }
            },
            headers: {
                'x-signature': 'sample_siri_signature',
                'content-type': 'application/json'
            } as Record<string, string>
        }
    ];

    for (const { platform, payload, headers } of sampleWebhookPayloads) {
        try {
            const result = await router.handleWebhook(platform, payload, headers);
            console.log(`✅ ${platform} webhook handled successfully`);
            console.log(`   Event: ${payload.eventType}`);
            console.log(`   User: ${payload.userId}`);
            console.log(`   Result: ${result.status}\n`);
        } catch (error) {
            console.error(`❌ Failed to handle ${platform} webhook:`, error);
        }
    }

    // 8. List all registered webhooks
    console.log('8. Listing All Registered Webhooks');
    console.log('---------------------------------');

    const webhooks = router.listWebhooks();
    console.log(`📋 Total registered webhooks: ${webhooks.length}`);

    webhooks.forEach((webhook, index) => {
        console.log(`   ${index + 1}. Platform: ${webhook.platform}`);
        console.log(`      ID: ${webhook.id}`);
        console.log(`      Status: ${webhook.status}`);
        console.log(`      Created: ${webhook.createdAt}`);
        if (webhook.lastDelivery) {
            console.log(`      Last Delivery: ${webhook.lastDelivery.status} (${webhook.lastDelivery.timestamp})`);
        }
        console.log('');
    });

    console.log('🎉 Enhanced Voice Platform Support Demo Complete!');
    console.log('================================================');
    console.log('');
    console.log('Summary of capabilities demonstrated:');
    console.log('✅ Third-party skill embedding for Alexa+, Google Assistant, and Apple Siri');
    console.log('✅ Webhook system for platform integrations');
    console.log('✅ Universal platform adapter for future voice assistants');
    console.log('✅ Smart home synchronization across all voice platforms');
    console.log('✅ Comprehensive webhook event handling');
    console.log('✅ Platform-agnostic conversation management');
}

// Example webhook endpoint handler
export function createWebhookEndpoint() {
    return async (req: any, res: any) => {
        try {
            const platform = req.params.platform as VoicePlatform;
            const payload = req.body;
            const headers = req.headers;

            const config: RouterConfig = {
                openai: {
                    apiKey: process.env.OPENAI_API_KEY || 'test-key',
                    model: 'gpt-4-1106-preview',
                    maxTokens: 1000,
                    temperature: 0.3
                },
                database: {
                    url: process.env.SUPABASE_URL || 'http://localhost:54321',
                    apiKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key'
                },
                redis: {
                    url: process.env.REDIS_URL || 'redis://localhost:6379',
                    keyPrefix: 'storytailor',
                    defaultTtl: 3600
                },
                agents: {
                    auth: { endpoint: 'http://localhost:3001', timeout: 5000, retries: 3 },
                    content: { endpoint: 'http://localhost:3002', timeout: 5000, retries: 3 },
                    library: { endpoint: 'http://localhost:3003', timeout: 5000, retries: 3 },
                    emotion: { endpoint: 'http://localhost:3004', timeout: 5000, retries: 3 },
                    commerce: { endpoint: 'http://localhost:3005', timeout: 5000, retries: 3 },
                    insights: { endpoint: 'http://localhost:3006', timeout: 5000, retries: 3 }
                },
                circuitBreaker: {
                    failureThreshold: 5,
                    resetTimeout: 60000,
                    monitoringPeriod: 300000
                },
                fallback: {
                    enabled: true,
                    defaultResponse: "I'm having trouble right now, but let's try creating a story together!",
                    maxRetries: 2
                }
            };

            const router = new PlatformAwareRouter(config);
            const result = await router.handleWebhook(platform, payload, headers);

            res.status(200).json(result);
        } catch (error) {
            console.error('Webhook endpoint error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : String(error)
            });
        }
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    demonstrateEnhancedVoicePlatformSupport()
        .then(() => {
            console.log('Demo completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Demo failed:', error);
            process.exit(1);
        });
}

export { demonstrateEnhancedVoicePlatformSupport };