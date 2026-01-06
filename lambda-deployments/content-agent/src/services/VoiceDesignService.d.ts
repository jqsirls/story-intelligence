import { Logger } from 'winston';
export interface VoiceDesignRequest {
    voice_description: string;
    model_id?: string;
    guidance_scale?: number;
    quality?: number;
    seed?: number;
    output_format?: string;
    auto_generate_text?: boolean;
    loudness?: number;
    stream_previews?: boolean;
    reference_audio_base64?: string;
    prompt_strength?: number;
}
export interface VoiceDesignResponse {
    previews: Array<{
        audio_base_64: string;
        generated_voice_id: string;
        media_type: string;
        duration_secs: number;
        language: string;
    }>;
    text: string;
}
export interface VoiceRemixingRequest {
    voice_id: string;
    prompt: string;
    prompt_strength?: 'low' | 'medium' | 'high' | 'max';
    script?: string;
    remixing_session_id?: string;
    remixing_session_iteration_id?: string;
}
export interface VoiceRemixingResponse {
    remixed_voice_id: string;
    audio_preview?: string;
    remixing_session_id: string;
    remixing_session_iteration_id: string;
}
export interface CharacterVoiceProfile {
    characterName: string;
    voiceDescription: string;
    generatedVoiceId?: string;
    remixedVoiceId?: string;
    voiceSettings: {
        stability: number;
        similarity_boost: number;
        use_speaker_boost: boolean;
        style: number;
        speed: number;
    };
    ageAppropriate: boolean;
    gender?: 'male' | 'female' | 'neutral';
    personality?: 'cheerful' | 'mysterious' | 'wise' | 'playful' | 'gentle' | 'brave' | 'magical';
    storyType?: 'adventure' | 'bedtime' | 'educational' | 'fantasy';
}
export declare class VoiceDesignService {
    private logger;
    private elevenLabsApiKey;
    private baseUrl;
    constructor(logger: Logger);
    /**
     * Design a new voice using ElevenLabs Voice Design API
     */
    designVoice(request: VoiceDesignRequest): Promise<VoiceDesignResponse>;
    /**
     * Create a voice from a generated voice ID
     */
    createVoiceFromDesign(generatedVoiceId: string, name: string, description?: string): Promise<string>;
    /**
     * Generate character-specific voice descriptions
     */
    generateCharacterVoiceDescription(character: CharacterVoiceProfile): string;
    /**
     * Design multiple character voices for a story
     */
    designStoryCharacterVoices(characters: CharacterVoiceProfile[]): Promise<Map<string, string>>;
}
//# sourceMappingURL=VoiceDesignService.d.ts.map