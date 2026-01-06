"use strict";
/**
 * Text Conversation Handler
 *
 * Provides same conversation quality as voice mode for text-based interactions.
 * Uses identical AI prompts but adapted for text input/output.
 *
 * For users who opt out of voice or prefer text chat.
 * Version: 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextConversationHandler = void 0;
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("../prompts");
/**
 * Handles text-based conversations with same quality as voice
 *
 * Key differences from voice mode:
 * - No voice emotion detection (uses text sentiment analysis instead)
 * - No audio output (returns text responses)
 * - Same conversational patterns and quality
 * - Same age-tuning and accessibility features
 */
class TextConversationHandler {
    constructor(config) {
        this.logger = config.logger;
        this.model = config.model || 'gpt-4o'; // Fast, multimodal model for text conversations
        this.openai = new openai_1.default({
            apiKey: config.openaiApiKey
        });
    }
    /**
     * Send a message in text mode and get Frankie's response
     */
    async sendMessage(userMessage, context) {
        try {
            this.logger.info('Processing text conversation message', {
                userId: context.userId,
                sessionId: context.sessionId,
                messageLength: userMessage.length,
                phase: context.conversationPhase
            });
            // Build system prompt with same guidance as ElevenLabs
            const systemPrompt = this.buildSystemPrompt(context);
            // Analyze emotion from text (since we don't have voice)
            const emotionAnalysis = this.analyzeTextEmotion(userMessage);
            // Build conversation messages
            const messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                // Include conversation history
                ...context.conversationHistory.map(turn => ({
                    role: turn.role,
                    content: turn.content
                })),
                // Current user message with emotion context
                {
                    role: 'user',
                    content: emotionAnalysis.detectedEmotion
                        ? `[Child seems ${emotionAnalysis.detectedEmotion}] ${userMessage}`
                        : userMessage
                }
            ];
            // Get AI response using same prompts as voice mode
            const completion = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.8, // Creative but consistent
                max_tokens: 500, // Keep responses concise
                presence_penalty: 0.3, // Encourage variety
                frequency_penalty: 0.3 // Avoid repetition
            });
            const aiResponse = completion.choices[0].message.content || 'I\'m here with you!';
            // Check if response requires parent notification (Tier 2 or 3 emotions)
            const notificationCheck = this.checkParentNotification(userMessage, emotionAnalysis, aiResponse);
            return {
                message: aiResponse,
                emotion: emotionAnalysis.detectedEmotion,
                conversationPhase: context.conversationPhase,
                requiresParentNotification: notificationCheck.required,
                notificationTier: notificationCheck.tier
            };
        }
        catch (error) {
            this.logger.error('Text conversation error', {
                error: error instanceof Error ? error.message : String(error),
                userId: context.userId
            });
            throw error;
        }
    }
    /**
     * Build comprehensive system prompt combining all guidance modules
     */
    buildSystemPrompt(context) {
        const frankiePrompt = prompts_1.FrankieSystemPrompt.build({
            userAge: context.userAge,
            mode: 'text',
            userName: context.userName,
            isReturningUser: context.isReturningUser,
            conversationPhase: context.conversationPhase
        });
        const emotionGuidance = prompts_1.EmotionResponseGuidance.getGuidance();
        const ageStyle = prompts_1.AgeTunedStyles.getForAge(context.userAge);
        const bibliotherapy = prompts_1.BibliotherapyPatterns.getGuidance();
        const accessibility = prompts_1.AccessibilityGuidance.getGuidance();
        return `${frankiePrompt}

${emotionGuidance}

${ageStyle}

${bibliotherapy}

${accessibility}

TEXT MODE SPECIFIC ADAPTATIONS:

Since this is text-based conversation (not voice):
- You cannot hear voice tone, pace, or volume
- Analyze text for emotional cues: word choice, punctuation, capitalization
- No voice emotion detection available - infer from text content
- Typing patterns might indicate: ALL CAPS = excitement, ellipsis = hesitation, short responses = tired/shy
- Same conversational quality as voice, adapted for text
- Emojis are acceptable to convey warmth (use sparingly, age-appropriately)
- For ages 7+, can use italics for emphasis: *really* special

Remember: Text mode should feel just as warm, empathetic, and magical as voice mode.
The child opted for text, but they deserve the same Story Intelligence™ powered experience.
`;
    }
    /**
     * Analyze emotion from text content (since no voice available)
     */
    analyzeTextEmotion(message) {
        const lower = message.toLowerCase();
        const cues = [];
        let detectedEmotion;
        let intensity = 'low';
        // Joy/Excitement indicators
        if (/!{2,}|haha|lol|yay|woohoo|awesome|amazing/i.test(message)) {
            detectedEmotion = 'excited';
            intensity = 'medium';
            cues.push('exclamation marks', 'positive exclamations');
        }
        else if (/:\)|happy|fun|love|great/i.test(message)) {
            detectedEmotion = 'happy';
            intensity = 'low';
            cues.push('positive words');
        }
        // Sadness indicators
        if (/sad|cry|miss|alone|:\(/i.test(message)) {
            detectedEmotion = 'sad';
            intensity = lower.includes('very') || lower.includes('really') ? 'high' : 'medium';
            cues.push('sadness keywords');
        }
        // Fear/Anxiety indicators
        if (/scared|afraid|worry|nervous|anxious/i.test(message)) {
            detectedEmotion = 'scared';
            intensity = message.includes('really') || message.includes('very') ? 'high' : 'medium';
            cues.push('fear keywords');
        }
        // Anger/Frustration
        if (/angry|mad|hate|annoyed|upset/i.test(message) || /[A-Z]{4,}/.test(message)) {
            detectedEmotion = 'angry';
            intensity = /[A-Z]{4,}/.test(message) ? 'high' : 'medium';
            cues.push('anger keywords', 'caps lock usage');
        }
        // Quiet/Shy indicators
        if (message.length < 10 && !message.includes('!')) {
            detectedEmotion = 'shy';
            intensity = 'low';
            cues.push('brief response');
        }
        // Overwhelm indicators
        if (message.includes('...') || message.split(' ').length < 3) {
            cues.push('hesitation', 'minimal response');
        }
        return {
            detectedEmotion,
            intensity,
            cues
        };
    }
    /**
     * Check if message requires parent notification
     */
    checkParentNotification(userMessage, emotionAnalysis, aiResponse) {
        const lower = userMessage.toLowerCase();
        // Tier 3: Concerning content (crisis keywords)
        const tier3Keywords = [
            'hurt me', 'hurt myself', 'hurt someone', 'kill', 'die', 'abuse',
            'hit me', 'touched me', 'secret', 'don\'t tell'
        ];
        for (const keyword of tier3Keywords) {
            if (lower.includes(keyword)) {
                return {
                    required: true,
                    tier: 3,
                    reason: `Concerning keyword detected: ${keyword}`
                };
            }
        }
        // Tier 2: Big feelings (repeated or intense)
        if (emotionAnalysis.detectedEmotion && emotionAnalysis.intensity === 'high') {
            const tier2Emotions = ['sad', 'scared', 'angry', 'worried'];
            if (tier2Emotions.includes(emotionAnalysis.detectedEmotion)) {
                return {
                    required: true,
                    tier: 2,
                    reason: `Strong ${emotionAnalysis.detectedEmotion} emotion detected`
                };
            }
        }
        // Tier 1: Everyday feelings (log but don't alert)
        return {
            required: false
        };
    }
    /**
     * Initialize conversation with greeting
     */
    async startConversation(context) {
        const greeting = context.isReturningUser
            ? `Welcome back, ${context.userName || 'Captain Jellybean'}! Your clouds missed you. Ready for another adventure?`
            : `Hi there! I'm Frankie, and I create stories with amazing kids like you! What should I call you?`;
        return {
            message: greeting,
            conversationPhase: 'greeting'
        };
    }
}
exports.TextConversationHandler = TextConversationHandler;
//# sourceMappingURL=TextConversationHandler.js.map