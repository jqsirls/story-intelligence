"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HueConversationIntegration = void 0;
const events_1 = require("events");
class HueConversationIntegration extends events_1.EventEmitter {
    constructor(logger) {
        super();
        this.isConnected = false;
        this.logger = logger;
        this.smartHomeAgentUrl = process.env.SMART_HOME_AGENT_URL || 'https://aqxdnlkqwqyqfmfaiwlqjjqp4u0jgxvx.lambda-url.us-east-2.on.aws/';
    }
    /**
     * Initialize Hue connection for conversation
     */
    async initializeHueConnection(userId, roomId) {
        try {
            this.logger.info('Initializing Hue connection for conversation', { userId, roomId });
            // Check if user has Hue connected
            const connectionCheck = await this.checkHueConnection(userId);
            if (!connectionCheck.connected) {
                this.logger.info('User does not have Hue connected', { userId });
                this.isConnected = false;
                return false;
            }
            this.isConnected = true;
            this.logger.info('Hue connection initialized successfully', { userId, roomId });
            // Set initial ambient lighting
            await this.setAmbientLighting(userId, roomId);
            return true;
        }
        catch (error) {
            this.logger.error('Failed to initialize Hue connection', { error, userId });
            this.isConnected = false;
            return false;
        }
    }
    /**
     * Update lighting based on conversation context
     */
    async updateLightingForConversation(context) {
        if (!this.isConnected) {
            this.logger.debug('Hue not connected, skipping lighting update');
            return;
        }
        try {
            this.logger.info('Updating Hue lighting for conversation', {
                userId: context.userId,
                emotion: context.emotion,
                phase: context.conversationPhase
            });
            // Generate lighting profile based on emotion and context
            const lightingProfile = this.generateLightingProfile(context);
            // Apply lighting changes
            await this.applyLightingProfile(context.userId, context.roomId, lightingProfile);
            // Store current profile for transitions
            this.currentProfile = lightingProfile;
            this.emit('lightingUpdated', {
                userId: context.userId,
                profile: lightingProfile,
                context
            });
        }
        catch (error) {
            this.logger.error('Failed to update Hue lighting', { error, context });
        }
    }
    /**
     * Handle emotion-specific lighting changes
     */
    async handleEmotionLighting(userId, emotion, intensity, roomId) {
        const context = {
            userId,
            sessionId: 'emotion',
            emotion,
            emotionIntensity: intensity,
            conversationPhase: 'emotion_response',
            roomId
        };
        await this.updateLightingForConversation(context);
    }
    /**
     * Handle story-specific lighting changes
     */
    async handleStoryLighting(userId, storyType, storyProgress, characterName, roomId) {
        const context = {
            userId,
            sessionId: 'story',
            emotion: 'neutral',
            emotionIntensity: 0.5,
            conversationPhase: 'story_building',
            storyType,
            characterName,
            storyProgress,
            roomId
        };
        await this.updateLightingForConversation(context);
    }
    /**
     * Handle special conversation moments
     */
    async handleSpecialMoment(userId, momentType, roomId) {
        const emotionMap = {
            'giggle': 'joy',
            'silence': 'calm',
            'yawn': 'tired',
            'excitement': 'excitement',
            'fear': 'fear',
            'calm': 'calm'
        };
        const context = {
            userId,
            sessionId: 'special',
            emotion: emotionMap[momentType] || 'neutral',
            emotionIntensity: 0.8,
            conversationPhase: 'special_moment',
            roomId
        };
        await this.updateLightingForConversation(context);
    }
    /**
     * Generate lighting profile based on conversation context
     */
    generateLightingProfile(context) {
        const { emotion, emotionIntensity, conversationPhase, storyType, storyProgress } = context;
        // Base profile
        let profile = {
            brightness: 60,
            color: '#FFFFFF',
            temperature: 4000,
            transitionDuration: 2,
            effect: 'none'
        };
        // Emotion-based adjustments
        switch (emotion) {
            case 'joy':
            case 'excitement':
                profile.brightness = Math.min(90, 60 + (emotionIntensity * 30));
                profile.color = '#FFD700'; // Golden
                profile.temperature = 5000;
                profile.effect = 'pulse';
                break;
            case 'calm':
            case 'peaceful':
                profile.brightness = Math.max(30, 60 - (emotionIntensity * 20));
                profile.color = '#87CEEB'; // Sky blue
                profile.temperature = 3000;
                profile.effect = 'breathe';
                break;
            case 'sadness':
                profile.brightness = Math.max(20, 40 - (emotionIntensity * 10));
                profile.color = '#4169E1'; // Royal blue
                profile.temperature = 2500;
                profile.effect = 'none';
                break;
            case 'fear':
            case 'anxiety':
                profile.brightness = Math.max(40, 60 - (emotionIntensity * 15));
                profile.color = '#FF6347'; // Tomato red
                profile.temperature = 3500;
                profile.effect = 'breathe';
                break;
            case 'curiosity':
                profile.brightness = 70;
                profile.color = '#9370DB'; // Medium purple
                profile.temperature = 4500;
                profile.effect = 'pulse';
                break;
            case 'pride':
                profile.brightness = 80;
                profile.color = '#32CD32'; // Lime green
                profile.temperature = 5000;
                profile.effect = 'pulse';
                break;
            default:
                // Neutral emotion
                profile.brightness = 60;
                profile.color = '#FFFFFF';
                profile.temperature = 4000;
                profile.effect = 'none';
        }
        // Story type adjustments
        if (storyType) {
            switch (storyType) {
                case 'adventure':
                    profile.color = '#FF8C00'; // Dark orange
                    profile.effect = 'pulse';
                    break;
                case 'fantasy':
                    profile.color = '#9370DB'; // Medium purple
                    profile.effect = 'rainbow';
                    break;
                case 'mystery':
                    profile.color = '#4B0082'; // Indigo
                    profile.brightness = Math.max(30, profile.brightness - 20);
                    break;
                case 'bedtime':
                    profile.color = '#87CEEB'; // Sky blue
                    profile.brightness = Math.max(20, profile.brightness - 30);
                    profile.temperature = 2500;
                    profile.effect = 'breathe';
                    break;
            }
        }
        // Conversation phase adjustments
        switch (conversationPhase) {
            case 'greeting':
                profile.brightness = 70;
                profile.effect = 'pulse';
                break;
            case 'story_building':
                profile.brightness = 65;
                break;
            case 'emotion_response':
                profile.transitionDuration = 1; // Faster transitions for emotions
                break;
            case 'special_moment':
                profile.transitionDuration = 0.5; // Very fast for special moments
                break;
        }
        // Story progress adjustments
        if (storyProgress !== undefined) {
            // Dim lights as story progresses (bedtime effect)
            if (storyProgress > 0.8) {
                profile.brightness = Math.max(20, profile.brightness - 20);
                profile.temperature = Math.max(2500, profile.temperature - 500);
            }
        }
        return profile;
    }
    /**
     * Apply lighting profile to Hue lights
     */
    async applyLightingProfile(userId, roomId, profile) {
        try {
            const response = await fetch(this.smartHomeAgentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update_emotion_lighting',
                    data: {
                        userId,
                        roomId,
                        lightingProfile: profile
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`Smart home agent responded with ${response.status}`);
            }
            this.logger.info('Lighting profile applied successfully', {
                userId,
                roomId,
                profile
            });
        }
        catch (error) {
            this.logger.error('Failed to apply lighting profile', { error, userId, roomId, profile });
            throw error;
        }
    }
    /**
     * Set ambient lighting for conversation start
     */
    async setAmbientLighting(userId, roomId) {
        const ambientProfile = {
            brightness: 50,
            color: '#FFFFFF',
            temperature: 4000,
            transitionDuration: 3,
            effect: 'none'
        };
        await this.applyLightingProfile(userId, roomId, ambientProfile);
    }
    /**
     * Check if user has Hue connected
     */
    async checkHueConnection(userId) {
        try {
            const response = await fetch(this.smartHomeAgentUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'check_hue_connection',
                    data: { userId }
                })
            });
            if (!response.ok) {
                return { connected: false };
            }
            const result = await response.json();
            return {
                connected: result.success && result.data?.connected,
                roomId: result.data?.roomId
            };
        }
        catch (error) {
            this.logger.error('Failed to check Hue connection', { error, userId });
            return { connected: false };
        }
    }
    /**
     * Get current connection status
     */
    isHueConnected() {
        return this.isConnected;
    }
    /**
     * Disconnect Hue
     */
    async disconnect() {
        this.isConnected = false;
        this.currentProfile = undefined;
        this.logger.info('Hue conversation integration disconnected');
    }
}
exports.HueConversationIntegration = HueConversationIntegration;
//# sourceMappingURL=HueConversationIntegration.js.map