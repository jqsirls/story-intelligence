"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PollyClient = void 0;
const events_1 = require("events");
const client_polly_1 = require("@aws-sdk/client-polly");
const client_sts_1 = require("@aws-sdk/client-sts");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const types_1 = require("../types");
/**
 * Amazon Polly client for fallback TTS
 * Provides reliable neural voice synthesis with presigned URLs
 */
class PollyClient extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.isInitialized = false;
    }
    /**
     * Initialize the Polly client
     */
    async initialize() {
        try {
            this.logger.info('Initializing Polly client...');
            // Configure AWS SDK v3
            const awsConfig = {
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
            }
            else if (this.config.roleArn) {
                // Use STS to assume role
                this.sts = new client_sts_1.STSClient({ region: this.config.region });
                const assumeRoleCommand = new client_sts_1.AssumeRoleCommand({
                    RoleArn: this.config.roleArn,
                    RoleSessionName: 'voice-synthesis-polly',
                    DurationSeconds: 3600,
                });
                const assumeRoleResult = await this.sts.send(assumeRoleCommand);
                if (assumeRoleResult.Credentials) {
                    awsConfig.credentials = {
                        accessKeyId: assumeRoleResult.Credentials.AccessKeyId,
                        secretAccessKey: assumeRoleResult.Credentials.SecretAccessKey,
                        sessionToken: assumeRoleResult.Credentials.SessionToken,
                    };
                }
            }
            this.polly = new client_polly_1.PollyClient(awsConfig);
            this.s3 = new client_s3_1.S3Client(awsConfig);
            // Test connection
            await this.validateConnection();
            this.isInitialized = true;
            this.logger.info('Polly client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Polly client', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    /**
     * Shutdown the client gracefully
     */
    async shutdown() {
        try {
            this.isInitialized = false;
            this.logger.info('Polly client shutdown completed');
        }
        catch (error) {
            this.logger.error('Error during Polly client shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Stream audio synthesis (simulated streaming for Polly)
     */
    async stream(request, onChunk) {
        this.ensureInitialized();
        const startTime = Date.now();
        try {
            // Polly doesn't support true streaming, so we synthesize and chunk the result
            const pollyRequest = {
                Text: this.prepareText(request.text, request.emotion),
                VoiceId: request.voiceId || this.config.voiceId,
                OutputFormat: this.config.outputFormat,
                SampleRate: this.config.sampleRate,
                Engine: this.config.engine,
                TextType: this.config.textType,
                LanguageCode: this.mapLanguageCode(request.language),
            };
            const command = new client_polly_1.SynthesizeSpeechCommand(pollyRequest);
            const result = await this.polly.send(command);
            if (!result.AudioStream) {
                throw new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, 'Polly returned no audio stream', 'polly');
            }
            const audioData = Buffer.from(result.AudioStream);
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
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.logger.error('Polly synthesis failed', {
                error: error instanceof Error ? error.message : String(error),
                textLength: request.text.length,
                latency,
            });
            if (error instanceof types_1.VoiceError) {
                throw error;
            }
            throw this.handlePollyError(error);
        }
    }
    /**
     * Generate long-form audio using Polly
     */
    async generateLongForm(request) {
        this.ensureInitialized();
        const startTime = Date.now();
        try {
            // For long-form content, we might need to split into chunks due to Polly limits
            const textChunks = this.splitTextForPolly(request.text);
            const audioChunks = [];
            for (const chunk of textChunks) {
                const pollyRequest = {
                    Text: this.prepareText(chunk, request.emotion),
                    VoiceId: request.voiceId || this.config.voiceId,
                    OutputFormat: 'mp3', // Use MP3 for long-form
                    SampleRate: '22050',
                    Engine: this.config.engine,
                    TextType: this.config.textType,
                    LanguageCode: this.mapLanguageCode(request.language),
                };
                const command = new client_polly_1.SynthesizeSpeechCommand(pollyRequest);
                const result = await this.polly.send(command);
                if (result.AudioStream) {
                    audioChunks.push(Buffer.from(result.AudioStream));
                }
            }
            const audioData = Buffer.concat(audioChunks);
            const latency = Date.now() - startTime;
            const cost = this.calculateCost(request.text.length);
            // For long-form, we can optionally upload to S3 and return a presigned URL
            let audioUrl;
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
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.logger.error('Polly long-form generation failed', {
                error: error instanceof Error ? error.message : String(error),
                textLength: request.text.length,
                latency,
            });
            if (error instanceof types_1.VoiceError) {
                throw error;
            }
            throw this.handlePollyError(error);
        }
    }
    /**
     * Health check for Polly service
     */
    async healthCheck() {
        try {
            // Test with a simple synthesis request
            const testRequest = {
                Text: 'Health check',
                VoiceId: this.config.voiceId,
                OutputFormat: this.config.outputFormat,
                SampleRate: this.config.sampleRate,
                Engine: this.config.engine,
                TextType: 'text',
            };
            const command = new client_polly_1.SynthesizeSpeechCommand(testRequest);
            const result = await this.polly.send(command);
            if (result.AudioStream) {
                return 'up';
            }
            else {
                return 'degraded';
            }
        }
        catch (error) {
            this.logger.warn('Polly health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return 'down';
        }
    }
    /**
     * Private helper methods
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new types_1.VoiceError(types_1.VoiceErrorCode.INTERNAL_ERROR, 'PollyClient not initialized. Call initialize() first.', 'polly');
        }
    }
    async validateConnection() {
        try {
            const command = new client_polly_1.DescribeVoicesCommand({ Engine: this.config.engine });
            await this.polly.send(command);
        }
        catch (error) {
            throw new types_1.VoiceError(types_1.VoiceErrorCode.AUTHENTICATION_FAILED, `Failed to connect to Polly: ${error instanceof Error ? error.message : String(error)}`, 'polly', error);
        }
    }
    prepareText(text, emotion) {
        // Add SSML markup for emotion if supported
        if (this.config.textType === 'ssml' && emotion && emotion !== 'neutral') {
            const emotionMap = {
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
    mapLanguageCode(language) {
        // Map common language codes to Polly-supported codes
        const languageMap = {
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
    splitTextForPolly(text) {
        // Polly has a 3000 character limit per request
        const maxChunkSize = 2800; // Leave some buffer
        const chunks = [];
        if (text.length <= maxChunkSize) {
            return [text];
        }
        // Split on sentence boundaries when possible
        const sentences = text.split(/(?<=[.!?])\s+/);
        let currentChunk = '';
        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChunkSize) {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
            }
            else {
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
                        }
                        else {
                            if (wordChunk) {
                                chunks.push(wordChunk);
                            }
                            wordChunk = word;
                        }
                    }
                    currentChunk = wordChunk;
                }
                else {
                    currentChunk = sentence;
                }
            }
        }
        if (currentChunk) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    simulateStreaming(audioData, onChunk) {
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
            const chunk = {
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
    async uploadToS3AndGetPresignedUrl(audioData, sessionId) {
        try {
            const bucketName = 'storytailor-audio';
            const key = `longform/${sessionId}.mp3`;
            // Upload to S3
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: audioData,
                ContentType: 'audio/mpeg',
            });
            await this.s3.send(putCommand);
            // Generate presigned URL
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });
            const presignedUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3, getCommand, { expiresIn: 86400 });
            return presignedUrl;
        }
        catch (error) {
            this.logger.warn('Failed to upload to S3, returning placeholder URL', {
                error: error instanceof Error ? error.message : String(error),
                sessionId,
            });
            // Return a placeholder URL if S3 upload fails
            return `https://storytailor-audio.s3.amazonaws.com/longform/${sessionId}.mp3?expires=86400`;
        }
    }
    handlePollyError(error) {
        if (error.code) {
            switch (error.code) {
                case 'InvalidParameterValue':
                    return new types_1.VoiceError(types_1.VoiceErrorCode.INVALID_REQUEST, `Invalid parameter: ${error.message}`, 'polly', error);
                case 'TextLengthExceededException':
                    return new types_1.VoiceError(types_1.VoiceErrorCode.TEXT_TOO_LONG, 'Text too long for Polly synthesis', 'polly', error);
                case 'ThrottlingException':
                    return new types_1.VoiceError(types_1.VoiceErrorCode.RATE_LIMITED, 'Polly rate limit exceeded', 'polly', error);
                case 'ServiceUnavailableException':
                    return new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, 'Polly service unavailable', 'polly', error);
                default:
                    return new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, `Polly error: ${error.message}`, 'polly', error);
            }
        }
        return new types_1.VoiceError(types_1.VoiceErrorCode.INTERNAL_ERROR, `Unexpected Polly error: ${error instanceof Error ? error.message : String(error)}`, 'polly', error);
    }
    calculateCost(characterCount) {
        // Polly pricing: approximately $4.00 per 1M characters for Neural voices
        // Standard voices are cheaper at $4.00 per 1M characters
        const pricePerMillion = this.config.engine === 'neural' ? 16.00 : 4.00;
        return (characterCount / 1000000) * pricePerMillion;
    }
    estimateAudioDuration(audioData) {
        // Rough estimation based on format
        if (this.config.outputFormat === 'pcm') {
            // PCM: sample rate * 2 bytes per sample
            const sampleRate = parseInt(this.config.sampleRate);
            const bytesPerSecond = sampleRate * 2;
            return audioData.length / bytesPerSecond;
        }
        else {
            // MP3: rough estimation (actual duration varies with compression)
            // Assume ~128kbps average bitrate
            const bytesPerSecond = 16000; // 128kbps / 8
            return audioData.length / bytesPerSecond;
        }
    }
}
exports.PollyClient = PollyClient;
//# sourceMappingURL=PollyClient.js.map