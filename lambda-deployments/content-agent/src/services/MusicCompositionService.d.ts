import { Logger } from 'winston';
export declare class MusicCompositionService {
    private elevenLabsApiKey;
    private logger;
    constructor(logger: Logger);
    generateStoryMusic(storyType: string, mood: string, duration_ms: number): Promise<string>;
    private getGlobalStyles;
    private getMoodSections;
    private getMusicalLines;
    private uploadToS3;
    generateAmbientTrack(storyType: string, duration_ms?: number): Promise<string>;
    generateTransitionMusic(fromMood: string, toMood: string, duration_ms?: number): Promise<string>;
}
//# sourceMappingURL=MusicCompositionService.d.ts.map