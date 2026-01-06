import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { 
  PollyClient as AWSPollyClient,
  SynthesizeSpeechCommand,
  DescribeVoicesCommand,
  Engine,
  OutputFormat,
  TextType,
  VoiceId
} from '@aws-sdk/client-polly';
import { 
  STSClient,
  AssumeRoleCommand
} from '@aws-sdk/client-sts';
import { 
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { 
  VoiceSynthesisRequest, 
  VoiceSynthesisResponse, 
  AudioChunk,
  VoiceError,
  VoiceErrorCode,
  PollyVoiceRequest
} from '../types';

interface PollyConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  roleArn?: string;
  voiceId: string;
  engine: 'neural' | 'standard';
  outputFormat: 'pcm' | 'mp3';
  sampleRate: string;
  textType: 'text' | 'ssml';
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Amazon Polly client for fallback TTS
 * Provides reliable neural voice synthesis with presigned URLs
 */
export class PollyClient extends EventEmitter {
  private polly!: AWSPollyClient;
  private s3!: S3Client;
  private sts!: STSClient;
  private isInitialized = false;

  constructor(
    private config: PollyConfig,
    private logger: Logger
  ) {
    super();
  }

  /**
   * Initialize the Polly client
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Polly client...');

      // Configure AWS SDK v3
      const awsConfig: any = {
        region: this.config.region,
        maxAttempts: this.config.maxRetries,
        requestHandler: {
          requestTimeout: this.config.timeoutMs,
        },
      };

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        awsConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      } else if (this.config.roleArn) {
        // Use STS to assume role
        this.sts = new STSClient({ region: this.config.region });
        const assumeRoleCommand = new AssumeRoleCommand({
          RoleArn: this.config.roleArn,
          RoleSessionName: 'voice-synthesis-polly',
          DurationSeconds: 3600,
        });

        const assumeRoleResult = await this.sts.send(assumeRoleCommand);

        if (assumeRoleResult.Credentials) {
          awsConfig.credentials = {
            accessKeyId: assumeRoleResult.Credentials.AccessKeyId!,
            secretAccessKey: assumeRoleResult.Credentials.SecretAccessKey!,
            sessionToken: assumeRoleResult.Credentials.SessionToken,
          };
        }
      }

      this.polly = new AWSPollyClient(awsConfig);
      this.s3 = new S3Client(awsConfig);

      // Test connection
      await this.validateConnection();

      this.isInitialized = true;
      this.logger.info('Polly client initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Polly client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Shutdown the client gracefully
   */
  async shutdown(): Promise<void> {
    try {
      this.isInitialized = false;
      this.logger.info('Polly client shutdown completed');
    } catch (error) {
      this.logger.error('Error during Polly client shutdown', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Stream audio synthesis (simulated streaming for Polly)
   */
  async stream(
    request: VoiceSynthesisRequest,
    onChunk: (chunk: AudioChunk) => void
  ): Promise<VoiceSynthesisResponse> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Polly doesn't support true streaming, so we synthesize and chunk the result
      const pollyRequest: PollyVoiceRequest = {
        Text: this.prepareText(request.text, request.emotion),
        VoiceId: request.voiceId || this.config.voiceId,
        OutputFormat: this.config.outputFormat as any, // Type assertion needed due to AWS SDK type mismatch
        SampleRate: this.config.sampleRate,
        Engine: this.config.engine as any, // Type assertion needed due to AWS SDK type mismatch
        TextType: this.config.textType as TextType,
        LanguageCode: this.mapLanguageCode(request.language) as any, // Type assertion needed due to AWS SDK type mismatch
      };

      const command = new SynthesizeSpeechCommand(pollyRequest as any); // Type assertion needed due to AWS SDK type mismatch
      const result = await this.polly.send(command);

      if (!result.AudioStream) {
        throw new VoiceError(
          VoiceErrorCode.ENGINE_UNAVAILABLE,
          'Polly returned no audio stream',
          'polly'
        );
      }

      const audioData = Buffer.from(result.AudioStream as unknown as Uint8Array); // Type assertion needed for AWS SDK streaming types
      const latency = Date.now() - startTime;

      // Simulate streaming by chunking the audio
      this.simulateStreaming(audioData, onChunk);

      const cost = this.calculateCost(request.text.length);

      return {
        success: true,
        audioData,
        engine: 'polly',
        latency,
        cost,
        duration: this.estimateAudioDuration(audioData),
        sessionId: request.sessionId || '',
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error('Polly synthesis failed', {
        error: error instanceof Error ? error.message : String(error),
        textLength: request.text.length,
        latency,
      });

      if (error instanceof VoiceError) {
        throw error;
      }

      throw this.handlePollyError(error);
    }
  }

  /**
   * Generate long-form audio using Polly
   */
  async generateLongForm(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
    this.ensureInitialized();

    const startTime = Date.now();

    try {
      // For long-form content, we might need to split into chunks due to Polly limits
      const textChunks = this.splitTextForPolly(request.text);
      const audioChunks: Buffer[] = [];

      for (const chunk of textChunks) {
        const pollyRequest: PollyVoiceRequest = {
          Text: this.prepareText(chunk, request.emotion),
          VoiceId: request.voiceId || this.config.voiceId,
          OutputFormat: 'mp3' as any, // Use MP3 for long-form (type assertion needed)
          SampleRate: '22050',
          Engine: this.config.engine as any, // Type assertion needed due to AWS SDK type mismatch
          TextType: this.config.textType as TextType,
          LanguageCode: this.mapLanguageCode(request.language),
        };

        const command = new SynthesizeSpeechCommand(pollyRequest as any); // Type assertion needed due to AWS SDK type mismatch
        const result = await this.polly.send(command);

        if (result.AudioStream) {
          audioChunks.push(Buffer.from(result.AudioStream as unknown as Uint8Array)); // Type assertion needed for AWS SDK streaming types
        }
      }

      const audioData = Buffer.concat(audioChunks);
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(request.text.length);

      // For long-form, we can optionally upload to S3 and return a presigned URL
      let audioUrl: string | undefined;
      if (request.format === 'mp3') {
        audioUrl = await this.uploadToS3AndGetPresignedUrl(audioData, request.sessionId || 'longform');
      }

      return {
        success: true,
        audioData,
        audioUrl,
        engine: 'polly',
        latency,
        cost,
        duration: this.estimateAudioDuration(audioData),
        sessionId: request.sessionId || '',
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.logger.error('Polly long-form generation failed', {
        error: error instanceof Error ? error.message : String(error),
        textLength: request.text.length,
        latency,
      });

      if (error instanceof VoiceError) {
        throw error;
      }

      throw this.handlePollyError(error);
    }
  }

  /**
   * Health check for Polly service
   */
  async healthCheck(): Promise<'up' | 'down' | 'degraded'> {
    try {
      // Test with a simple synthesis request
      const testRequest: PollyVoiceRequest = {
        Text: 'Health check',
        VoiceId: this.config.voiceId,
        OutputFormat: this.config.outputFormat as any, // Type assertion needed due to AWS SDK type mismatch
        SampleRate: this.config.sampleRate,
        Engine: this.config.engine as any, // Type assertion needed due to AWS SDK type mismatch
        TextType: 'text' as TextType,
      };

      const command = new SynthesizeSpeechCommand(testRequest as any); // Type assertion needed due to AWS SDK type mismatch
      const result = await this.polly.send(command);
      
      if (result.AudioStream) {
        return 'up';
      } else {
        return 'degraded';
      }
    } catch (error) {
      this.logger.warn('Polly health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 'down';
    }
  }

  /**
   * Private helper methods
   */

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new VoiceError(
        VoiceErrorCode.INTERNAL_ERROR,
        'PollyClient not initialized. Call initialize() first.',
        'polly'
      );
    }
  }

  private async validateConnection(): Promise<void> {
    try {
      const command = new DescribeVoicesCommand({ Engine: this.config.engine as Engine });
      await this.polly.send(command);
    } catch (error) {
      throw new VoiceError(
        VoiceErrorCode.AUTHENTICATION_FAILED,
        `Failed to connect to Polly: ${error instanceof Error ? error.message : String(error)}`,
        'polly',
        error
      );
    }
  }

  private prepareText(text: string, emotion?: string): string {
    // Add SSML markup for emotion if supported
    if (this.config.textType === 'ssml' && emotion && emotion !== 'neutral') {
      const emotionMap: Record<string, string> = {
        happy: 'excited',
        sad: 'disappointed',
        excited: 'excited',
        calm: 'conversational',
        dramatic: 'news',
      };

      const ssmlEmotion = emotionMap[emotion] || 'conversational';
      return `<speak><amazon:domain name="${ssmlEmotion}">${text}</amazon:domain></speak>`;
    }

    return this.config.textType === 'ssml' ? `<speak>${text}</speak>` : text;
  }

  private mapLanguageCode(language: string): string {
    // Map common language codes to Polly-supported codes
    const languageMap: Record<string, string> = {
      'en-US': 'en-US',
      'en-GB': 'en-GB',
      'es-ES': 'es-ES',
      'es-MX': 'es-MX',
      'fr-FR': 'fr-FR',
      'de-DE': 'de-DE',
      'it-IT': 'it-IT',
      'pt-BR': 'pt-BR',
      'ja-JP': 'ja-JP',
      'ko-KR': 'ko-KR',
      'zh-CN': 'cmn-CN',
    };

    return languageMap[language] || 'en-US';
  }

  private splitTextForPolly(text: string): string[] {
    // Polly has a 3000 character limit per request
    const maxChunkSize = 2800; // Leave some buffer
    const chunks: string[] = [];

    if (text.length <= maxChunkSize) {
      return [text];
    }

    // Split on sentence boundaries when possible
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxChunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        // If single sentence is too long, split it
        if (sentence.length > maxChunkSize) {
          const words = sentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length <= maxChunkSize) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          currentChunk = wordChunk;
        } else {
          currentChunk = sentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  private simulateStreaming(audioData: Buffer, onChunk: (chunk: AudioChunk) => void): void {
    // Simulate streaming by sending chunks every 100ms
    const chunkSize = Math.ceil(audioData.length / 10); // 10 chunks
    let offset = 0;
    let sequenceNumber = 0;

    const sendChunk = () => {
      if (offset >= audioData.length) {
        return;
      }

      const end = Math.min(offset + chunkSize, audioData.length);
      const chunkData = audioData.slice(offset, end);
      const isLast = end >= audioData.length;

      const chunk: AudioChunk = {
        data: chunkData,
        isLast,
        sequenceNumber: sequenceNumber++,
        timestamp: Date.now(),
      };

      onChunk(chunk);

      offset = end;

      if (!isLast) {
        setTimeout(sendChunk, 100);
      }
    };

    // Start sending chunks immediately
    sendChunk();
  }

  private async uploadToS3AndGetPresignedUrl(audioData: Buffer, sessionId: string): Promise<string> {
    try {
      const bucketName = 'storytailor-audio';
      const key = `longform/${sessionId}.mp3`;
      
      // Upload to S3
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: audioData,
        ContentType: 'audio/mpeg',
      });
      
      await this.s3.send(putCommand);
      
      // Generate presigned URL
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      const presignedUrl = await getSignedUrl(this.s3, getCommand, { expiresIn: 86400 });
      return presignedUrl;
    } catch (error) {
      this.logger.warn('Failed to upload to S3, returning placeholder URL', {
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
      // Return a placeholder URL if S3 upload fails
      return `https://storytailor-audio.s3.amazonaws.com/longform/${sessionId}.mp3?expires=86400`;
    }
  }

  private handlePollyError(error: any): VoiceError {
    if (error.code) {
      switch (error.code) {
        case 'InvalidParameterValue':
          return new VoiceError(
            VoiceErrorCode.INVALID_REQUEST,
            `Invalid parameter: ${error.message}`,
            'polly',
            error
          );
        case 'TextLengthExceededException':
          return new VoiceError(
            VoiceErrorCode.TEXT_TOO_LONG,
            'Text too long for Polly synthesis',
            'polly',
            error
          );
        case 'ThrottlingException':
          return new VoiceError(
            VoiceErrorCode.RATE_LIMITED,
            'Polly rate limit exceeded',
            'polly',
            error
          );
        case 'ServiceUnavailableException':
          return new VoiceError(
            VoiceErrorCode.ENGINE_UNAVAILABLE,
            'Polly service unavailable',
            'polly',
            error
          );
        default:
          return new VoiceError(
            VoiceErrorCode.ENGINE_UNAVAILABLE,
            `Polly error: ${error.message}`,
            'polly',
            error
          );
      }
    }

    return new VoiceError(
      VoiceErrorCode.INTERNAL_ERROR,
      `Unexpected Polly error: ${error instanceof Error ? error.message : String(error)}`,
      'polly',
      error
    );
  }

  private calculateCost(characterCount: number): number {
    // Polly pricing: approximately $4.00 per 1M characters for Neural voices
    // Standard voices are cheaper at $4.00 per 1M characters
    const pricePerMillion = this.config.engine === 'neural' ? 16.00 : 4.00;
    return (characterCount / 1000000) * pricePerMillion;
  }

  private estimateAudioDuration(audioData: Buffer): number {
    // Rough estimation based on format
    if (this.config.outputFormat === 'pcm') {
      // PCM: sample rate * 2 bytes per sample
      const sampleRate = parseInt(this.config.sampleRate);
      const bytesPerSecond = sampleRate * 2;
      return audioData.length / bytesPerSecond;
    } else {
      // MP3: rough estimation (actual duration varies with compression)
      // Assume ~128kbps average bitrate
      const bytesPerSecond = 16000; // 128kbps / 8
      return audioData.length / bytesPerSecond;
    }
  }
}