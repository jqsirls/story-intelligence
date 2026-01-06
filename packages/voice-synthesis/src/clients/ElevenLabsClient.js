"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsClient = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const types_1 = require("../types");
/**
 * ElevenLabs client with WebSocket streaming support
 * Handles real-time audio generation with Flash v2.5 model
 */
class ElevenLabsClient extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 1000;
        this.connectionPromise = null;
        this.authHeaderCache = `Bearer ${config.apiKey}`;
    }
    /**
     * Initialize the ElevenLabs client
     */
    async initialize() {
        try {
            this.logger.info('Initializing ElevenLabs client...');
            // Validate API key
            await this.validateApiKey();
            this.logger.info('ElevenLabs client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ElevenLabs client', {
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
            if (this.ws) {
                this.ws.close();
                this.ws = null;
            }
            this.isConnected = false;
            this.logger.info('ElevenLabs client shutdown completed');
        }
        catch (error) {
            this.logger.error('Error during ElevenLabs client shutdown', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    /**
     * Stream audio synthesis with real-time chunks
     */
    async stream(request, onChunk) {
        const startTime = Date.now();
        try {
            // Ensure WebSocket connection
            await this.ensureConnection();
            // Prepare streaming request
            const streamRequest = {
                text: request.text,
                model_id: this.config.model,
                voice_settings: {
                    stability: this.config.stability,
                    similarity_boost: this.config.similarityBoost,
                    style: this.config.style,
                    use_speaker_boost: this.config.useSpeakerBoost,
                },
                generation_config: {
                    chunk_length_schedule: [120, 160, 250, 290], // Optimized for low latency
                },
            };
            // Send request and handle streaming response
            const audioData = await this.streamAudio(streamRequest, onChunk);
            const latency = Date.now() - startTime;
            // Calculate cost (approximate)
            const cost = this.calculateCost(request.text.length);
            return {
                success: true,
                audioData,
                engine: 'elevenlabs',
                latency,
                cost,
                duration: this.estimateAudioDuration(audioData),
                sessionId: request.sessionId || '',
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.logger.error('ElevenLabs streaming failed', {
                error: error instanceof Error ? error.message : String(error),
                textLength: request.text.length,
                latency,
            });
            if (error instanceof types_1.VoiceError) {
                throw error;
            }
            throw new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, `ElevenLabs streaming failed: ${error instanceof Error ? error.message : String(error)}`, 'elevenlabs', error);
        }
    }
    /**
     * Generate long-form audio using Multilingual v2 model
     */
    async generateLongForm(request) {
        const startTime = Date.now();
        try {
            const response = await (0, node_fetch_1.default)(`${this.config.baseUrl}/v1/text-to-speech/${request.voiceId || this.config.voiceId}`, {
                method: 'POST',
                headers: {
                    'Authorization': this.authHeaderCache,
                    'Content-Type': 'application/json',
                    'xi-api-key': this.config.apiKey,
                },
                body: JSON.stringify({
                    text: request.text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: this.config.stability,
                        similarity_boost: this.config.similarityBoost,
                        style: this.config.style,
                        use_speaker_boost: this.config.useSpeakerBoost,
                    },
                    output_format: request.format === 'mp3' ? 'mp3_44100_128' : 'pcm_16000',
                }),
                // timeout: this.config.timeoutMs, // Remove timeout from fetch options
            });
            if (!response.ok) {
                throw await this.handleApiError(response);
            }
            const audioData = Buffer.from(await response.arrayBuffer());
            const latency = Date.now() - startTime;
            const cost = this.calculateCost(request.text.length);
            return {
                success: true,
                audioData,
                engine: 'elevenlabs',
                latency,
                cost,
                duration: this.estimateAudioDuration(audioData),
                sessionId: request.sessionId || '',
            };
        }
        catch (error) {
            const latency = Date.now() - startTime;
            this.logger.error('ElevenLabs long-form generation failed', {
                error: error instanceof Error ? error.message : String(error),
                textLength: request.text.length,
                latency,
            });
            if (error instanceof types_1.VoiceError) {
                throw error;
            }
            throw new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, `ElevenLabs long-form generation failed: ${error instanceof Error ? error.message : String(error)}`, 'elevenlabs', error);
        }
    }
    /**
     * Health check for ElevenLabs service
     */
    async healthCheck() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.config.baseUrl}/v1/user`, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeaderCache,
                    'xi-api-key': this.config.apiKey,
                },
                // timeout: 5000, // Remove timeout from fetch options
            });
            if (response.ok) {
                return 'up';
            }
            else if (response.status >= 500) {
                return 'down';
            }
            else {
                return 'degraded';
            }
        }
        catch (error) {
            this.logger.warn('ElevenLabs health check failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return 'down';
        }
    }
    /**
     * Private helper methods
     */
    async ensureConnection() {
        if (this.isConnected && this.ws?.readyState === ws_1.default.OPEN) {
            return;
        }
        if (this.connectionPromise) {
            return this.connectionPromise;
        }
        this.connectionPromise = this.connect();
        await this.connectionPromise;
        this.connectionPromise = null;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `${this.config.websocketUrl}/v1/text-to-speech/${this.config.voiceId}/stream-input?model_id=${this.config.model}`;
                this.ws = new ws_1.default(wsUrl, {
                    headers: {
                        'Authorization': this.authHeaderCache,
                        'xi-api-key': this.config.apiKey,
                    },
                });
                this.ws.on('open', () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.logger.info('ElevenLabs WebSocket connected');
                    resolve();
                });
                this.ws.on('error', (error) => {
                    this.logger.error('ElevenLabs WebSocket error', { error });
                    this.isConnected = false;
                    this.emit('error', error);
                    if (!this.isConnected) {
                        reject(new types_1.VoiceError(types_1.VoiceErrorCode.NETWORK_ERROR, `WebSocket connection failed: ${error.message}`, 'elevenlabs', error));
                    }
                });
                this.ws.on('close', (code, reason) => {
                    this.logger.warn('ElevenLabs WebSocket closed', { code, reason: reason.toString() });
                    this.isConnected = false;
                    // Attempt reconnection with exponential backoff
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
                        this.reconnectAttempts++;
                        setTimeout(() => {
                            this.logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                            this.connect().catch((error) => {
                                this.logger.error('Reconnection failed', { error });
                            });
                        }, delay);
                    }
                });
            }
            catch (error) {
                reject(new types_1.VoiceError(types_1.VoiceErrorCode.NETWORK_ERROR, `Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`, 'elevenlabs', error));
            }
        });
    }
    async streamAudio(request, onChunk) {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== ws_1.default.OPEN) {
                reject(new types_1.VoiceError(types_1.VoiceErrorCode.NETWORK_ERROR, 'WebSocket not connected', 'elevenlabs'));
                return;
            }
            const audioChunks = [];
            let sequenceNumber = 0;
            let hasStarted = false;
            const timeout = setTimeout(() => {
                reject(new types_1.VoiceError(types_1.VoiceErrorCode.TIMEOUT, 'ElevenLabs streaming timeout', 'elevenlabs'));
            }, this.config.timeoutMs);
            const messageHandler = (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.audio) {
                        hasStarted = true;
                        const audioBuffer = Buffer.from(message.audio, 'base64');
                        audioChunks.push(audioBuffer);
                        const chunk = {
                            data: audioBuffer,
                            isLast: message.isFinal || false,
                            sequenceNumber: sequenceNumber++,
                            timestamp: Date.now(),
                        };
                        onChunk(chunk);
                        if (message.isFinal) {
                            clearTimeout(timeout);
                            this.ws?.off('message', messageHandler);
                            resolve(Buffer.concat(audioChunks));
                        }
                    }
                    else if (message.error) {
                        clearTimeout(timeout);
                        this.ws?.off('message', messageHandler);
                        reject(new types_1.VoiceError(types_1.VoiceErrorCode.ENGINE_UNAVAILABLE, `ElevenLabs error: ${message.error}`, 'elevenlabs', message));
                    }
                }
                catch (error) {
                    if (hasStarted) {
                        // If we've started receiving audio, treat parse errors as non-fatal
                        this.logger.warn('Failed to parse WebSocket message', { error });
                    }
                    else {
                        clearTimeout(timeout);
                        this.ws?.off('message', messageHandler);
                        reject(new types_1.VoiceError(types_1.VoiceErrorCode.INTERNAL_ERROR, `Failed to parse WebSocket response: ${error instanceof Error ? error.message : String(error)}`, 'elevenlabs', error));
                    }
                }
            };
            this.ws.on('message', messageHandler);
            // Send the streaming request
            this.ws.send(JSON.stringify(request));
        });
    }
    async validateApiKey() {
        try {
            const response = await (0, node_fetch_1.default)(`${this.config.baseUrl}/v1/user`, {
                method: 'GET',
                headers: {
                    'Authorization': this.authHeaderCache,
                    'xi-api-key': this.config.apiKey,
                },
                // timeout: 10000, // Remove timeout from fetch options
            });
            if (!response.ok) {
                if (response.status === 401) {
                    throw new types_1.VoiceError(types_1.VoiceErrorCode.AUTHENTICATION_FAILED, 'Invalid ElevenLabs API key', 'elevenlabs');
                }
                throw await this.handleApiError(response);
            }
        }
        catch (error) {
            if (error instanceof types_1.VoiceError) {
                throw error;
            }
            throw new types_1.VoiceError(types_1.VoiceErrorCode.NETWORK_ERROR, `Failed to validate ElevenLabs API key: ${error instanceof Error ? error.message : String(error)}`, 'elevenlabs', error);
        }
    }
    async handleApiError(response) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
            const errorBody = await response.json();
            if (errorBody && typeof errorBody === 'object' && 'detail' in errorBody) {
                errorMessage = errorBody.detail;
            }
        }
        catch {
            // Ignore JSON parse errors
        }
        let errorCode;
        switch (response.status) {
            case 401:
                errorCode = types_1.VoiceErrorCode.AUTHENTICATION_FAILED;
                break;
            case 429:
                errorCode = types_1.VoiceErrorCode.RATE_LIMITED;
                break;
            case 413:
                errorCode = types_1.VoiceErrorCode.TEXT_TOO_LONG;
                break;
            case 422:
                errorCode = types_1.VoiceErrorCode.INVALID_REQUEST;
                break;
            default:
                errorCode = response.status >= 500
                    ? types_1.VoiceErrorCode.ENGINE_UNAVAILABLE
                    : types_1.VoiceErrorCode.INVALID_REQUEST;
        }
        return new types_1.VoiceError(errorCode, errorMessage, 'elevenlabs', {
            status: response.status,
            statusText: response.statusText,
        });
    }
    calculateCost(characterCount) {
        // ElevenLabs pricing: approximately $0.30 per 1K characters
        // This is a rough estimate - actual pricing may vary
        return (characterCount / 1000) * 0.30;
    }
    estimateAudioDuration(audioData) {
        // Rough estimation: 16kHz PCM, 16-bit, mono
        // 2 bytes per sample, 16000 samples per second
        const bytesPerSecond = 16000 * 2;
        return audioData.length / bytesPerSecond;
    }
}
exports.ElevenLabsClient = ElevenLabsClient;
//# sourceMappingURL=ElevenLabsClient.js.map