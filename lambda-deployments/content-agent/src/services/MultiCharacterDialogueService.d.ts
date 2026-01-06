import { Logger } from 'winston';
export interface DialogueSpeaker {
    speaker: string;
    text: string;
    voice_id: string;
    emotion?: 'happy' | 'sad' | 'excited' | 'scared' | 'mysterious' | 'gentle';
}
export interface DialogueScript {
    speakers: DialogueSpeaker[];
    storyContext?: string;
    characterName?: string;
}
export declare class MultiCharacterDialogueService {
    private elevenLabsApiKey;
    private logger;
    constructor(logger: Logger);
    generateDialogue(dialogue: DialogueScript): Promise<Buffer>;
    generateDialogueFromStory(storyContent: string, characterName: string): Promise<Buffer>;
    private extractDialogueFromStory;
    private getVoiceIdForSpeaker;
    private detectEmotionFromText;
    uploadDialogueToS3(audioBuffer: Buffer, characterName: string, storyId?: string): Promise<string>;
    generateDialogueWithTiming(dialogue: DialogueScript): Promise<{
        audioBuffer: Buffer;
        timing: Array<{
            speaker: string;
            startTime: number;
            endTime: number;
        }>;
    }>;
    private estimateSpeechDuration;
}
//# sourceMappingURL=MultiCharacterDialogueService.d.ts.map