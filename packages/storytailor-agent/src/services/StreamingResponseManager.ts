import { StreamingResponse, ResponseChunk, AudioStream } from '../types/alexa';
import { createLogger } from '../utils/logger';

export class StreamingResponseManager {
  private logger = createLogger('streaming-response-manager');
  private readonly MAX_CHUNK_SIZE = 1024; // 1KB chunks for optimal streaming
  private readonly TARGET_LATENCY = 800; // 800ms target response time

  /**
   * Creates streaming response for voice latency optimization
   */
  async createStreamingResponse(
    text: string,
    audioData?: ArrayBuffer,
    sessionId?: string
  ): Promise<StreamingResponse> {
    const startTime = Date.now();
    
    try {
      const chunks = await this.createResponseChunks(text, audioData);
      const totalDuration = Date.now() - startTime;

      this.logger.info('Created streaming response', {
        sessionId,
        textLength: text.length,
        chunkCount: chunks.length,
        totalDuration,
        hasAudio: !!audioData
      });

      return {
        chunks,
        totalDuration,
        isComplete: true
      };
    } catch (error) {
      this.logger.error('Failed to create streaming response', {
        sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Creates optimized response chunks for streaming
   */
  private async createResponseChunks(
    text: string,
    audioData?: ArrayBuffer
  ): Promise<ResponseChunk[]> {
    const chunks: ResponseChunk[] = [];
    const sentences = this.splitIntoSentences(text);
    
    // Create text chunks optimized for natural speech breaks
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const isLast = i === sentences.length - 1;
      
      chunks.push({
        id: `chunk-${Date.now()}-${i}`,
        sequence: i,
        content: sentence,
        timestamp: new Date().toISOString(),
        isLast: isLast && !audioData
      });
    }

    // Add audio chunks if provided
    if (audioData) {
      const audioChunks = await this.createAudioChunks(audioData, chunks.length);
      chunks.push(...audioChunks);
    }

    return chunks;
  }

  /**
   * Splits text into natural sentence boundaries for streaming
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving natural flow
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());

    // Ensure no sentence is too long for streaming
    const optimizedSentences: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length <= this.MAX_CHUNK_SIZE) {
        optimizedSentences.push(sentence);
      } else {
        // Split long sentences at natural breaks (commas, conjunctions)
        const subSentences = this.splitLongSentence(sentence);
        optimizedSentences.push(...subSentences);
      }
    }

    return optimizedSentences;
  }

  /**
   * Splits long sentences at natural break points
   */
  private splitLongSentence(sentence: string): string[] {
    const breakPoints = [', ', ' and ', ' but ', ' or ', ' so ', ' because '];
    let parts = [sentence];

    for (const breakPoint of breakPoints) {
      const newParts: string[] = [];
      
      for (const part of parts) {
        if (part.length > this.MAX_CHUNK_SIZE && part.includes(breakPoint)) {
          const splitParts = part.split(breakPoint);
          for (let i = 0; i < splitParts.length; i++) {
            if (i > 0) {
              newParts.push(breakPoint.trim() + ' ' + splitParts[i]);
            } else {
              newParts.push(splitParts[i]);
            }
          }
        } else {
          newParts.push(part);
        }
      }
      
      parts = newParts;
    }

    return parts.filter(part => part.trim().length > 0);
  }

  /**
   * Creates audio chunks from audio data
   */
  private async createAudioChunks(
    audioData: ArrayBuffer,
    startSequence: number
  ): Promise<ResponseChunk[]> {
    const chunks: ResponseChunk[] = [];
    const chunkSize = 8192; // 8KB audio chunks
    const totalChunks = Math.ceil(audioData.byteLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, audioData.byteLength);
      const chunkData = audioData.slice(start, end);
      
      chunks.push({
        id: `audio-chunk-${Date.now()}-${i}`,
        sequence: startSequence + i,
        content: '', // Audio chunks don't have text content
        audioData: chunkData,
        timestamp: new Date().toISOString(),
        isLast: i === totalChunks - 1
      });
    }

    return chunks;
  }

  /**
   * Optimizes response timing for sub-800ms delivery
   */
  async optimizeResponseTiming(
    response: StreamingResponse,
    targetLatency: number = this.TARGET_LATENCY
  ): Promise<StreamingResponse> {
    const startTime = Date.now();
    
    // Calculate optimal chunk delivery timing
    const totalChunks = response.chunks.length;
    const timePerChunk = Math.min(targetLatency / totalChunks, 100); // Max 100ms per chunk

    // Add timing optimization to chunks
    const optimizedChunks = response.chunks.map((chunk, index) => ({
      ...chunk,
      deliveryTime: startTime + (index * timePerChunk)
    }));

    this.logger.debug('Optimized response timing', {
      totalChunks,
      timePerChunk,
      targetLatency,
      estimatedDeliveryTime: totalChunks * timePerChunk
    });

    return {
      ...response,
      chunks: optimizedChunks
    };
  }

  /**
   * Creates audio stream for Alexa streaming
   */
  async createAudioStream(
    audioUrl: string,
    token: string,
    offsetInMilliseconds: number = 0
  ): Promise<AudioStream> {
    return {
      url: audioUrl,
      token,
      offsetInMilliseconds
    };
  }

  /**
   * Handles streaming interruption and resumption
   */
  async handleStreamingInterruption(
    streamingResponse: StreamingResponse,
    interruptionPoint: number
  ): Promise<StreamingResponse> {
    const remainingChunks = streamingResponse.chunks.filter(
      chunk => chunk.sequence >= interruptionPoint
    );

    this.logger.info('Handling streaming interruption', {
      originalChunks: streamingResponse.chunks.length,
      remainingChunks: remainingChunks.length,
      interruptionPoint
    });

    return {
      chunks: remainingChunks,
      totalDuration: streamingResponse.totalDuration,
      isComplete: remainingChunks.length === 0
    };
  }

  /**
   * Validates streaming response quality
   */
  validateStreamingResponse(response: StreamingResponse): boolean {
    // Check if response meets quality criteria
    const hasValidChunks = response.chunks.length > 0;
    const hasProperSequencing = this.validateChunkSequencing(response.chunks);
    const meetsLatencyRequirement = response.totalDuration <= this.TARGET_LATENCY;

    const isValid = hasValidChunks && hasProperSequencing && meetsLatencyRequirement;

    this.logger.debug('Validated streaming response', {
      hasValidChunks,
      hasProperSequencing,
      meetsLatencyRequirement,
      isValid,
      totalDuration: response.totalDuration,
      chunkCount: response.chunks.length
    });

    return isValid;
  }

  /**
   * Validates chunk sequencing
   */
  private validateChunkSequencing(chunks: ResponseChunk[]): boolean {
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].sequence !== i) {
        return false;
      }
    }
    return true;
  }

  /**
   * Creates fallback streaming response for errors
   */
  createFallbackStreamingResponse(errorMessage: string): StreamingResponse {
    const fallbackText = errorMessage || "I'm having trouble right now, but let's keep going with your story.";
    
    return {
      chunks: [{
        id: `fallback-chunk-${Date.now()}`,
        sequence: 0,
        content: fallbackText,
        timestamp: new Date().toISOString(),
        isLast: true
      }],
      totalDuration: 100, // Quick fallback
      isComplete: true
    };
  }
}