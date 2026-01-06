/**
 * Voice Interface Component
 * Handles voice recording and processing
 */

export interface VoiceInterfaceConfig {
  onTranscript: (transcript: string) => void;
  onError: (error: Error) => void;
}

export class VoiceInterface {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private config: VoiceInterfaceConfig;

  constructor(config: VoiceInterfaceConfig) {
    this.config = config;
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
    } catch (error) {
      this.config.onError(error as Error);
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }
}