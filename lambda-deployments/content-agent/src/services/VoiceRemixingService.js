"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceRemixingService = void 0;
class VoiceRemixingService {
    constructor(logger) {
        this.baseUrl = 'https://api.elevenlabs.io';
        this.activeSessions = new Map();
        this.logger = logger;
        this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
        if (!this.elevenLabsApiKey) {
            this.logger.error('ElevenLabs API key not configured');
            throw new Error('ElevenLabs API key not configured');
        }
    }
    /**
     * Start a new voice remixing session
     */
    async startRemixingSession(originalVoiceId, initialPrompt) {
        try {
            this.logger.info('Starting voice remixing session', {
                originalVoiceId,
                initialPrompt
            });
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const session = {
                sessionId,
                originalVoiceId,
                iterations: [{
                        iterationId: `iteration_${Date.now()}`,
                        prompt: initialPrompt,
                        promptStrength: 'medium'
                    }]
            };
            this.activeSessions.set(sessionId, session);
            this.logger.info('Voice remixing session started', { sessionId });
            return session;
        }
        catch (error) {
            this.logger.error('Failed to start remixing session', { error });
            throw error;
        }
    }
    /**
     * Remix a voice with a new prompt
     */
    async remixVoice(request) {
        try {
            this.logger.info('Remixing voice', {
                voiceId: request.voice_id,
                prompt: request.prompt,
                promptStrength: request.prompt_strength || 'medium'
            });
            const response = await fetch(`${this.baseUrl}/v1/voice-remixing/remix`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsApiKey
                },
                body: JSON.stringify({
                    voice_id: request.voice_id,
                    prompt: request.prompt,
                    prompt_strength: request.prompt_strength || 'medium',
                    script: request.script,
                    remixing_session_id: request.remixing_session_id,
                    remixing_session_iteration_id: request.remixing_session_iteration_id
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs Voice Remixing API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            this.logger.info('Voice remixing successful', {
                remixedVoiceId: result.remixed_voice_id,
                sessionId: result.remixing_session_id
            });
            return result;
        }
        catch (error) {
            this.logger.error('Voice remixing failed', { error });
            throw error;
        }
    }
    /**
     * Create character-specific remix prompts
     */
    generateCharacterRemixPrompts(characterName, personality, storyType) {
        const prompts = [];
        // Base personality prompts
        switch (personality) {
            case 'cheerful':
                prompts.push({
                    context: 'cheerful character',
                    prompt: 'Make the voice more cheerful and upbeat, with a bright and happy tone',
                    promptStrength: 'medium'
                });
                break;
            case 'mysterious':
                prompts.push({
                    context: 'mysterious character',
                    prompt: 'Make the voice more mysterious and intriguing, with an enigmatic quality',
                    promptStrength: 'medium'
                });
                break;
            case 'wise':
                prompts.push({
                    context: 'wise character',
                    prompt: 'Make the voice more thoughtful and knowledgeable, with a scholarly tone',
                    promptStrength: 'medium'
                });
                break;
            case 'playful':
                prompts.push({
                    context: 'playful character',
                    prompt: 'Make the voice more playful and mischievous, with a fun and energetic quality',
                    promptStrength: 'medium'
                });
                break;
            case 'gentle':
                prompts.push({
                    context: 'gentle character',
                    prompt: 'Make the voice more gentle and caring, with a soft and soothing tone',
                    promptStrength: 'medium'
                });
                break;
            case 'brave':
                prompts.push({
                    context: 'brave character',
                    prompt: 'Make the voice more brave and determined, with a strong and confident quality',
                    promptStrength: 'medium'
                });
                break;
            case 'magical':
                prompts.push({
                    context: 'magical character',
                    prompt: 'Make the voice more magical and enchanting, with an otherworldly quality',
                    promptStrength: 'medium'
                });
                break;
        }
        // Story type specific prompts
        switch (storyType) {
            case 'adventure':
                prompts.push({
                    context: 'adventure story',
                    prompt: 'Make the voice more energetic and adventurous, perfect for exciting stories',
                    promptStrength: 'low'
                });
                break;
            case 'bedtime':
                prompts.push({
                    context: 'bedtime story',
                    prompt: 'Make the voice more calm and soothing, perfect for bedtime stories',
                    promptStrength: 'low'
                });
                break;
            case 'educational':
                prompts.push({
                    context: 'educational content',
                    prompt: 'Make the voice more clear and engaging, perfect for learning',
                    promptStrength: 'low'
                });
                break;
            case 'fantasy':
                prompts.push({
                    context: 'fantasy story',
                    prompt: 'Make the voice more magical and fantastical, perfect for fantasy adventures',
                    promptStrength: 'low'
                });
                break;
        }
        return prompts;
    }
    /**
     * Create multiple remix variations for a character
     */
    async createCharacterRemixVariations(characterName, originalVoiceId, personality, storyType) {
        const remixMap = new Map();
        try {
            this.logger.info('Creating remix variations for character', {
                characterName,
                originalVoiceId,
                personality,
                storyType
            });
            const remixPrompts = this.generateCharacterRemixPrompts(characterName, personality, storyType);
            // Start a remixing session
            const session = await this.startRemixingSession(originalVoiceId, remixPrompts[0].prompt);
            let currentVoiceId = originalVoiceId;
            for (const remixPrompt of remixPrompts) {
                const remixResult = await this.remixVoice({
                    voice_id: currentVoiceId,
                    prompt: remixPrompt.prompt,
                    prompt_strength: remixPrompt.promptStrength,
                    remixing_session_id: session.sessionId
                });
                remixMap.set(remixPrompt.context, remixResult.remixed_voice_id);
                currentVoiceId = remixResult.remixed_voice_id; // Use remixed voice for next iteration
                this.logger.info('Character remix variation created', {
                    characterName,
                    context: remixPrompt.context,
                    remixedVoiceId: remixResult.remixed_voice_id
                });
            }
            return remixMap;
        }
        catch (error) {
            this.logger.error('Character remix variations failed', { error });
            throw error;
        }
    }
    /**
     * Iteratively refine a voice based on feedback
     */
    async iterativeRefinement(voiceId, refinementPrompts, sessionId) {
        try {
            this.logger.info('Starting iterative voice refinement', {
                voiceId,
                refinementCount: refinementPrompts.length
            });
            let currentVoiceId = voiceId;
            let currentSessionId = sessionId;
            for (let i = 0; i < refinementPrompts.length; i++) {
                const prompt = refinementPrompts[i];
                const remixResult = await this.remixVoice({
                    voice_id: currentVoiceId,
                    prompt: prompt,
                    prompt_strength: 'medium',
                    remixing_session_id: currentSessionId
                });
                currentVoiceId = remixResult.remixed_voice_id;
                currentSessionId = remixResult.remixing_session_id;
                this.logger.info('Voice refinement iteration completed', {
                    iteration: i + 1,
                    prompt: prompt,
                    newVoiceId: currentVoiceId
                });
            }
            return currentVoiceId;
        }
        catch (error) {
            this.logger.error('Iterative voice refinement failed', { error });
            throw error;
        }
    }
    /**
     * Get active remixing session
     */
    getActiveSession(sessionId) {
        return this.activeSessions.get(sessionId);
    }
    /**
     * Clean up completed sessions
     */
    cleanupSession(sessionId) {
        this.activeSessions.delete(sessionId);
        this.logger.info('Remixing session cleaned up', { sessionId });
    }
}
exports.VoiceRemixingService = VoiceRemixingService;
//# sourceMappingURL=VoiceRemixingService.js.map