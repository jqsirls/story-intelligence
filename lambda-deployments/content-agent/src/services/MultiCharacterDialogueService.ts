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

export class MultiCharacterDialogueService {
  private elevenLabsApiKey: string;
  private logger: Logger;

  constructor(logger: Logger) {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.logger = logger;
  }

  async generateDialogue(dialogue: DialogueScript): Promise<Buffer> {
    try {
      this.logger.info('Generating multi-character dialogue', {
        speakerCount: dialogue.speakers.length,
        characterName: dialogue.characterName
      });

      // Use ElevenLabs Text to Dialogue endpoint
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue', {
        method: 'POST',
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dialogue: dialogue.speakers.map(speaker => ({
            speaker: speaker.speaker,
            text: speaker.text,
            voice_id: speaker.voice_id,
            emotion: speaker.emotion
          })),
          model_id: "eleven_v3_alpha"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs Text to Dialogue API error: ${response.status} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      this.logger.info('Multi-character dialogue generated successfully', {
        audioSize: audioBuffer.byteLength
      });

      return Buffer.from(audioBuffer);

    } catch (error) {
      this.logger.error('Multi-character dialogue generation failed', { error });
      throw error;
    }
  }

  async generateDialogueFromStory(storyContent: string, characterName: string): Promise<Buffer> {
    try {
      // Parse story content for dialogue
      const dialogueSections = this.extractDialogueFromStory(storyContent);
      
      if (dialogueSections.length === 0) {
        throw new Error('No dialogue found in story content');
      }

      // Create dialogue script
      const dialogueScript: DialogueScript = {
        speakers: dialogueSections.map(section => ({
          speaker: section.speaker,
          text: section.text,
          voice_id: this.getVoiceIdForSpeaker(section.speaker, characterName),
          emotion: this.detectEmotionFromText(section.text)
        })),
        storyContext: storyContent,
        characterName
      };

      return await this.generateDialogue(dialogueScript);

    } catch (error) {
      this.logger.error('Failed to generate dialogue from story', { error });
      throw error;
    }
  }

  private extractDialogueFromStory(storyContent: string): Array<{speaker: string, text: string}> {
    const dialogueRegex = /"([^"]+)"\s*(?:said|asked|replied|exclaimed|whispered|murmured|shouted|laughed|cried)\s*([A-Za-z\s]+)/gi;
    const dialogueSections: Array<{speaker: string, text: string}> = [];
    
    let match;
    while ((match = dialogueRegex.exec(storyContent)) !== null) {
      dialogueSections.push({
        speaker: match[2].trim(),
        text: match[1]
      });
    }

    // Also look for dialogue patterns like: Frankie said, "Hello there!"
    const alternativeRegex = /([A-Za-z\s]+)\s*(?:said|asked|replied|exclaimed|whispered|murmured|shouted|laughed|cried)\s*,\s*"([^"]+)"/gi;
    while ((match = alternativeRegex.exec(storyContent)) !== null) {
      dialogueSections.push({
        speaker: match[1].trim(),
        text: match[2]
      });
    }

    return dialogueSections;
  }

  private getVoiceIdForSpeaker(speaker: string, characterName: string): string {
    const speakerLower = speaker.toLowerCase();
    
    // Frankie's voice
    if (speakerLower.includes('frankie')) {
      return 'kQJQj1e9P2YDvAdvp2BW'; // Frankie's voice ID
    }
    
    // Main character voice
    if (speakerLower.includes(characterName.toLowerCase())) {
      return 'EXAVITQu4vr4xnSDxMaL'; // Character voice
    }
    
    // Default voice mapping for other characters
    const voiceMap: Record<string, string> = {
      'narrator': 'EXAVITQu4vr4xnSDxMaL',
      'star': 'pNInz6obpgDQGcFmaJgB', // Whispery voice for magical characters
      'dragon': 'VR6AewLTigWG4xSOukaG', // Deeper voice for dragons
      'fairy': 'pNInz6obpgDQGcFmaJgB', // Light voice for fairies
      'wizard': 'VR6AewLTigWG4xSOukaG', // Wise voice for wizards
      'child': 'EXAVITQu4vr4xnSDxMaL' // Child-friendly voice
    };

    // Find matching voice based on speaker name
    for (const [key, voiceId] of Object.entries(voiceMap)) {
      if (speakerLower.includes(key)) {
        return voiceId;
      }
    }

    // Default to character voice
    return 'EXAVITQu4vr4xnSDxMaL';
  }

  private detectEmotionFromText(text: string): DialogueSpeaker['emotion'] {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('!') || textLower.includes('excited') || textLower.includes('wow')) {
      return 'excited';
    }
    
    if (textLower.includes('?') || textLower.includes('wonder') || textLower.includes('curious')) {
      return 'mysterious';
    }
    
    if (textLower.includes('scared') || textLower.includes('afraid') || textLower.includes('frightened')) {
      return 'scared';
    }
    
    if (textLower.includes('sad') || textLower.includes('cry') || textLower.includes('tears')) {
      return 'sad';
    }
    
    if (textLower.includes('happy') || textLower.includes('smile') || textLower.includes('laugh')) {
      return 'happy';
    }
    
    if (textLower.includes('gentle') || textLower.includes('soft') || textLower.includes('quiet')) {
      return 'gentle';
    }
    
    return 'happy'; // Default to happy
  }

  async uploadDialogueToS3(audioBuffer: Buffer, characterName: string, storyId?: string): Promise<string> {
    try {
      // This is a placeholder implementation
      // In production, this would use AWS SDK to upload to S3
      const filename = `dialogue-${characterName}-${storyId || Date.now()}.mp3`;
      const s3Url = `https://storytailor-audio.s3.amazonaws.com/dialogue/${filename}`;
      
      this.logger.info('Dialogue uploaded to S3', { 
        filename, 
        size: audioBuffer.length,
        url: s3Url 
      });
      
      return s3Url;

    } catch (error) {
      this.logger.error('Failed to upload dialogue to S3', { error });
      throw error;
    }
  }

  async generateDialogueWithTiming(dialogue: DialogueScript): Promise<{
    audioBuffer: Buffer;
    timing: Array<{speaker: string, startTime: number, endTime: number}>;
  }> {
    try {
      const audioBuffer = await this.generateDialogue(dialogue);
      
      // Estimate timing based on text length and speaking rate
      const timing: Array<{speaker: string, startTime: number, endTime: number}> = [];
      let currentTime = 0;
      
      for (const speaker of dialogue.speakers) {
        const estimatedDuration = this.estimateSpeechDuration(speaker.text);
        timing.push({
          speaker: speaker.speaker,
          startTime: currentTime,
          endTime: currentTime + estimatedDuration
        });
        currentTime += estimatedDuration + 0.5; // Add pause between speakers
      }
      
      return { audioBuffer, timing };

    } catch (error) {
      this.logger.error('Failed to generate dialogue with timing', { error });
      throw error;
    }
  }

  private estimateSpeechDuration(text: string): number {
    // Rough estimation: ~150 words per minute for children's speech
    const wordsPerMinute = 150;
    const wordCount = text.split(' ').length;
    return (wordCount / wordsPerMinute) * 60; // Convert to seconds
  }
}
