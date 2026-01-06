"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceDesignService = void 0;
class VoiceDesignService {
    constructor(logger, apiKey) {
        this.baseUrl = 'https://api.elevenlabs.io';
        this.logger = logger;
        // Accept API key from config (preferred) or fall back to environment variable
        this.elevenLabsApiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
        // Don't throw - allow service to be created even without key
        // Methods will check and return gracefully
        if (!this.elevenLabsApiKey) {
            this.logger.warn('ElevenLabs API key not configured, voice design features will be disabled');
        }
    }
    /**
     * Design a new voice using ElevenLabs Voice Design API
     */
    async designVoice(request) {
        // Gracefully handle missing API key
        if (!this.elevenLabsApiKey || this.elevenLabsApiKey === 'placeholder') {
            this.logger.warn('ElevenLabs API key not configured, cannot design voice');
            throw new Error('ElevenLabs API key not configured');
        }
        try {
            this.logger.info('Designing new voice', {
                voice_description: request.voice_description,
                model_id: request.model_id || 'eleven_ttv_v3'
            });
            const response = await fetch(`${this.baseUrl}/v1/text-to-voice/design`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsApiKey
                },
                body: JSON.stringify({
                    voice_description: request.voice_description,
                    model_id: request.model_id || 'eleven_ttv_v3',
                    guidance_scale: request.guidance_scale || 7,
                    quality: request.quality || 0.8,
                    seed: request.seed,
                    output_format: request.output_format || 'mp3_44100_192',
                    auto_generate_text: request.auto_generate_text || true,
                    loudness: request.loudness || 0.5,
                    stream_previews: request.stream_previews || false,
                    reference_audio_base64: request.reference_audio_base64,
                    prompt_strength: request.prompt_strength
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs Voice Design API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            this.logger.info('Voice design successful', {
                previewCount: result.previews.length,
                generatedVoiceIds: result.previews.map(p => p.generated_voice_id)
            });
            return result;
        }
        catch (error) {
            this.logger.error('Voice design failed', { error });
            throw error;
        }
    }
    /**
     * Create a voice from a generated voice ID
     */
    async createVoiceFromDesign(generatedVoiceId, name, description) {
        try {
            this.logger.info('Creating voice from design', { generatedVoiceId, name });
            const response = await fetch(`${this.baseUrl}/v1/text-to-voice`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsApiKey
                },
                body: JSON.stringify({
                    generated_voice_id: generatedVoiceId,
                    name: name,
                    description: description || `Generated voice: ${name}`
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ElevenLabs Voice Creation API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            this.logger.info('Voice created successfully', {
                voiceId: result.voice_id,
                name: name
            });
            return result.voice_id;
        }
        catch (error) {
            this.logger.error('Voice creation failed', { error });
            throw error;
        }
    }
    /**
     * Generate character-specific voice descriptions
     */
    generateCharacterVoiceDescription(character) {
        const { characterName, personality, gender, storyType } = character;
        let description = `A ${personality || 'friendly'} ${characterName.toLowerCase()}`;
        // Add gender context
        if (gender && gender !== 'neutral') {
            description += ` with a ${gender} voice`;
        }
        // Add story type context
        if (storyType) {
            switch (storyType) {
                case 'adventure':
                    description += ', energetic and brave';
                    break;
                case 'bedtime':
                    description += ', calm and soothing';
                    break;
                case 'educational':
                    description += ', clear and engaging';
                    break;
                case 'fantasy':
                    description += ', magical and enchanting';
                    break;
            }
        }
        // Add personality-specific traits
        switch (personality) {
            case 'cheerful':
                description += ', bright and happy';
                break;
            case 'mysterious':
                description += ', intriguing and enigmatic';
                break;
            case 'wise':
                description += ', thoughtful and knowledgeable';
                break;
            case 'playful':
                description += ', fun and mischievous';
                break;
            case 'gentle':
                description += ', soft and caring';
                break;
            case 'brave':
                description += ', strong and determined';
                break;
            case 'magical':
                description += ', enchanting and otherworldly';
                break;
        }
        // Ensure age-appropriate
        if (character.ageAppropriate) {
            description += ', perfect for children';
        }
        return description;
    }
    /**
     * Design multiple character voices for a story
     */
    async designStoryCharacterVoices(characters) {
        const voiceIdMap = new Map();
        try {
            this.logger.info('Designing voices for story characters', {
                characterCount: characters.length,
                characters: characters.map(c => c.characterName)
            });
            for (const character of characters) {
                const voiceDescription = this.generateCharacterVoiceDescription(character);
                // Design the voice
                const designResult = await this.designVoice({
                    voice_description: voiceDescription,
                    model_id: 'eleven_ttv_v3',
                    guidance_scale: 7,
                    quality: 0.8,
                    auto_generate_text: true
                });
                // Use the first preview (best match)
                if (designResult.previews.length > 0) {
                    const generatedVoiceId = designResult.previews[0].generated_voice_id;
                    // Create the actual voice
                    const voiceId = await this.createVoiceFromDesign(generatedVoiceId, `${character.characterName}_${character.personality || 'character'}`, voiceDescription);
                    voiceIdMap.set(character.characterName, voiceId);
                    this.logger.info('Character voice designed', {
                        characterName: character.characterName,
                        voiceId: voiceId,
                        description: voiceDescription
                    });
                }
            }
            return voiceIdMap;
        }
        catch (error) {
            this.logger.error('Story character voice design failed', { error });
            throw error;
        }
    }
}
exports.VoiceDesignService = VoiceDesignService;
