import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const LINKING_ERROR =
  `The package '@storyteller/react-native-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// Native module interface
const StorytellerSDK = NativeModules.StorytellerSDK
  ? NativeModules.StorytellerSDK
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

// Event emitter for native events
const eventEmitter = new NativeEventEmitter(StorytellerSDK);

// Types
export interface Configuration {
  apiBaseURL: string;
  apiKey: string;
  enableVoice?: boolean;
  enableOfflineMode?: boolean;
  enablePushNotifications?: boolean;
  customization?: Customization;
}

export interface Customization {
  theme: Theme;
  branding: Branding;
  features: FeatureFlags;
}

export interface Theme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  darkMode: boolean;
}

export interface Branding {
  logoUrl?: string;
  companyName?: string;
  customColors: Record<string, string>;
}

export interface FeatureFlags {
  voiceEnabled: boolean;
  smartHomeEnabled: boolean;
  offlineMode: boolean;
  pushNotifications: boolean;
}

export interface ConversationSession {
  sessionId: string;
  userId: string;
  platform: string;
  startedAt: string;
  expiresAt: string;
  state: ConversationState;
  capabilities: PlatformCapabilities;
}

export interface ConversationState {
  phase: string;
  context: Record<string, string>;
  history: ConversationHistoryItem[];
  currentStory?: Story;
  currentCharacter?: Character;
}

export interface ConversationHistoryItem {
  timestamp: string;
  userMessage: UserMessage;
  botResponse: BotResponse;
}

export interface UserMessage {
  type: 'text' | 'voice' | 'image' | 'file';
  content: string | ArrayBuffer;
  metadata: MessageMetadata;
}

export interface MessageMetadata {
  timestamp: number;
  platform: string;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
  originalAudio?: boolean;
  confidence?: number;
}

export interface BotResponse {
  type: 'text' | 'voice' | 'image' | 'card' | 'action';
  content: string | ArrayBuffer | CardData | ActionData;
  suggestions: string[];
  requiresInput: boolean;
  conversationState: ConversationState;
  smartHomeActions: SmartHomeAction[];
  metadata: BotResponseMetadata;
}

export interface BotResponseMetadata {
  responseTime: number;
  confidence: number;
  agentsUsed: string[];
  isOffline?: boolean;
}

export interface ResponseChunk {
  type: string;
  content: string;
  isComplete: boolean;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
}

export interface VoiceResponse {
  transcription: string;
  textResponse: string;
  audioResponse?: ArrayBuffer;
  conversationState: ConversationState;
  metadata: VoiceResponseMetadata;
}

export interface VoiceResponseMetadata {
  transcriptionConfidence: number;
  responseTime: number;
}

export interface Story {
  id: string;
  title: string;
  content: StoryContent;
  status: 'draft' | 'final';
  ageRating: number;
  createdAt: number;
  finalizedAt?: number;
}

export interface StoryContent {
  text: string;
  chapters: StoryChapter[];
}

export interface StoryChapter {
  title: string;
  content: string;
  imageUrl?: string;
}

export interface Character {
  id: string;
  name: string;
  traits: CharacterTraits;
  appearanceUrl?: string;
}

export interface CharacterTraits {
  age?: number;
  species: string;
  gender?: string;
  ethnicity?: string;
  appearance: Record<string, string>;
  personality: string[];
  inclusivityTraits: string[];
}

export interface StoryCreationRequest {
  character: Character;
  storyType: string;
  preferences?: StoryPreferences;
}

export interface StoryPreferences {
  length?: string;
  themes: string[];
  avoidTopics: string[];
}

export interface ParentalControls {
  enabled: boolean;
  ageRestrictions: AgeRestrictions;
  contentFiltering: ContentFiltering;
  timeRestrictions?: TimeRestrictions;
}

export interface AgeRestrictions {
  minimumAge: number;
  maximumAge: number;
  requireParentalConsent: boolean;
}

export interface ContentFiltering {
  level: 'strict' | 'safe' | 'moderate';
  customFilters: string[];
}

export interface TimeRestrictions {
  dailyLimit: number; // minutes
  allowedHours: number[]; // hours of day
  bedtimeMode: boolean;
}

export interface PrivacySettings {
  dataRetention: string;
  consentLevel: string;
  analyticsEnabled: boolean;
  locationTracking: boolean;
}

export interface PlatformCapabilities {
  supportsText: boolean;
  supportsVoice: boolean;
  supportsImages: boolean;
  supportsFiles: boolean;
  supportsRealtime: boolean;
  supportsSmartHome: boolean;
  maxResponseTime: number;
  maxContentLength: number;
}

export interface DeviceInfo {
  type: string;
  os: string;
  version: string;
  model?: string;
}

export interface LocationInfo {
  country: string;
  timezone: string;
}

export interface SmartDeviceConfig {
  deviceType: string;
  userId: string;
  roomId: string;
  deviceName?: string;
  capabilities: string[];
}

export interface DeviceConnection {
  deviceId: string;
  status: string;
  connectedAt: number;
}

export interface SmartHomeAction {
  type: string;
  deviceId: string;
  action: ActionParameters;
}

export interface ActionParameters {
  command: string;
  parameters: Record<string, string>;
}

export interface CardData {
  title: string;
  content: string;
  imageUrl?: string;
  actions: CardAction[];
}

export interface CardAction {
  label: string;
  action: string;
  payload?: Record<string, string>;
}

export interface ActionData {
  type: string;
  payload: Record<string, string>;
}

// Event types
export type StorytellerEvent = 
  | { type: 'storyCompleted'; story: Story }
  | { type: 'characterCreated'; character: Character }
  | { type: 'voiceDetected'; speech: string; confidence: number }
  | { type: 'offlineSync'; stories: Story[] }
  | { type: 'smartHomeAction'; action: SmartHomeAction }
  | { type: 'error'; error: string };

// Error types
export class StorytellerError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'StorytellerError';
  }
}

// Main SDK class
export class StorytellerReactNativeSDK {
  private static instance: StorytellerReactNativeSDK | null = null;
  private isInitialized = false;
  private eventListeners: Map<string, ((event: StorytellerEvent) => void)[]> = new Map();

  private constructor(private configuration: Configuration) {
    this.setupEventListeners();
  }

  /**
   * Initialize the SDK
   */
  static async initialize(configuration: Configuration): Promise<StorytellerReactNativeSDK> {
    if (StorytellerReactNativeSDK.instance) {
      return StorytellerReactNativeSDK.instance;
    }

    const sdk = new StorytellerReactNativeSDK(configuration);
    await sdk.init();
    
    StorytellerReactNativeSDK.instance = sdk;
    return sdk;
  }

  /**
   * Get the initialized SDK instance
   */
  static getInstance(): StorytellerReactNativeSDK {
    if (!StorytellerReactNativeSDK.instance) {
      throw new StorytellerError('SDK not initialized. Call initialize() first.');
    }
    return StorytellerReactNativeSDK.instance;
  }

  private async init(): Promise<void> {
    try {
      // Request permissions
      await this.requestPermissions();
      
      // Initialize native SDK
      await StorytellerSDK.initialize(this.configuration);
      
      this.isInitialized = true;
    } catch (error) {
      throw new StorytellerError(`Failed to initialize SDK: ${error}`);
    }
  }

  private async requestPermissions(): Promise<void> {
    if (this.configuration.enableVoice) {
      const microphonePermission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      });

      if (microphonePermission) {
        const result = await request(microphonePermission);
        if (result !== RESULTS.GRANTED) {
          console.warn('Microphone permission not granted. Voice features will be disabled.');
        }
      }
    }

    if (this.configuration.enablePushNotifications) {
      const notificationPermission = Platform.select({
        ios: PERMISSIONS.IOS.NOTIFICATIONS,
        android: PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
      });

      if (notificationPermission) {
        const result = await request(notificationPermission);
        if (result !== RESULTS.GRANTED) {
          console.warn('Notification permission not granted. Push notifications will be disabled.');
        }
      }
    }
  }

  private setupEventListeners(): void {
    eventEmitter.addListener('StorytellerEvent', (event: StorytellerEvent) => {
      const listeners = this.eventListeners.get(event.type) || [];
      listeners.forEach(listener => listener(event));
    });
  }

  /**
   * Add event listener
   */
  addEventListener(eventType: string, listener: (event: StorytellerEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Remove event listener
   */
  removeEventListener(eventType: string, listener: (event: StorytellerEvent) => void): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Start a new conversation session
   */
  async startConversation(
    userId?: string,
    parentalControls?: ParentalControls
  ): Promise<ConversationSession> {
    this.ensureInitialized();
    return await StorytellerSDK.startConversation(userId, parentalControls);
  }

  /**
   * Send a text message
   */
  async sendMessage(text: string): Promise<BotResponse> {
    this.ensureInitialized();
    return await StorytellerSDK.sendMessage(text);
  }

  /**
   * Send voice input
   */
  async sendVoiceMessage(audioData: ArrayBuffer): Promise<VoiceResponse> {
    this.ensureInitialized();
    return await StorytellerSDK.sendVoiceMessage(Array.from(new Uint8Array(audioData)));
  }

  /**
   * Start voice recording
   */
  async startVoiceRecording(): Promise<void> {
    this.ensureInitialized();
    return await StorytellerSDK.startVoiceRecording();
  }

  /**
   * Stop voice recording and process
   */
  async stopVoiceRecording(): Promise<VoiceResponse> {
    this.ensureInitialized();
    return await StorytellerSDK.stopVoiceRecording();
  }

  /**
   * Stream conversation responses
   */
  async *streamResponse(message: string): AsyncIterableIterator<ResponseChunk> {
    this.ensureInitialized();
    
    // Since React Native doesn't support async iterators from native modules directly,
    // we'll use a promise-based approach with callbacks
    const chunks: ResponseChunk[] = [];
    let isComplete = false;
    let error: Error | null = null;

    const streamId = await StorytellerSDK.startStreamResponse(message);
    
    const chunkListener = eventEmitter.addListener('StreamChunk', (data: { streamId: string; chunk: ResponseChunk }) => {
      if (data.streamId === streamId) {
        chunks.push(data.chunk);
        if (data.chunk.isComplete) {
          isComplete = true;
        }
      }
    });

    const errorListener = eventEmitter.addListener('StreamError', (data: { streamId: string; error: string }) => {
      if (data.streamId === streamId) {
        error = new StorytellerError(data.error);
        isComplete = true;
      }
    });

    try {
      let index = 0;
      while (!isComplete) {
        if (error) {
          throw error;
        }
        
        if (index < chunks.length) {
          yield chunks[index];
          index++;
        } else {
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // Yield any remaining chunks
      while (index < chunks.length) {
        yield chunks[index];
        index++;
      }
    } finally {
      chunkListener.remove();
      errorListener.remove();
    }
  }

  /**
   * Get user's stories
   */
  async getStories(libraryId?: string): Promise<Story[]> {
    this.ensureInitialized();
    return await StorytellerSDK.getStories(libraryId);
  }

  /**
   * Create a new story
   */
  async createStory(request: StoryCreationRequest): Promise<Story> {
    this.ensureInitialized();
    return await StorytellerSDK.createStory(request);
  }

  /**
   * Connect smart home device
   */
  async connectSmartDevice(config: SmartDeviceConfig): Promise<DeviceConnection> {
    this.ensureInitialized();
    return await StorytellerSDK.connectSmartDevice(config);
  }

  /**
   * End current conversation
   */
  async endConversation(): Promise<void> {
    this.ensureInitialized();
    return await StorytellerSDK.endConversation();
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<void> {
    this.ensureInitialized();
    return await StorytellerSDK.syncOfflineData();
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications(): Promise<void> {
    this.ensureInitialized();
    return await StorytellerSDK.registerForPushNotifications();
  }

  /**
   * Check if device is online
   */
  async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected === true;
  }

  /**
   * Get cached data
   */
  async getCachedData(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(`storyteller_${key}`);
  }

  /**
   * Set cached data
   */
  async setCachedData(key: string, value: string): Promise<void> {
    return await AsyncStorage.setItem(`storyteller_${key}`, value);
  }

  /**
   * Clear cached data
   */
  async clearCachedData(key?: string): Promise<void> {
    if (key) {
      return await AsyncStorage.removeItem(`storyteller_${key}`);
    } else {
      const keys = await AsyncStorage.getAllKeys();
      const storytellerKeys = keys.filter(k => k.startsWith('storyteller_'));
      return await AsyncStorage.multiRemove(storytellerKeys);
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StorytellerError('SDK not initialized. Call initialize() first.');
    }
  }
}

// Default export
export default StorytellerReactNativeSDK;

// Utility functions
export const createDefaultParentalControls = (): ParentalControls => ({
  enabled: true,
  ageRestrictions: {
    minimumAge: 3,
    maximumAge: 12,
    requireParentalConsent: true,
  },
  contentFiltering: {
    level: 'safe',
    customFilters: [],
  },
});

export const createChildSafePrivacySettings = (): PrivacySettings => ({
  dataRetention: 'minimal',
  consentLevel: 'strict',
  analyticsEnabled: false,
  locationTracking: false,
});

// Hook for React components
export const useStorytellerSDK = () => {
  const sdk = StorytellerReactNativeSDK.getInstance();
  
  return {
    sdk,
    startConversation: sdk.startConversation.bind(sdk),
    sendMessage: sdk.sendMessage.bind(sdk),
    sendVoiceMessage: sdk.sendVoiceMessage.bind(sdk),
    startVoiceRecording: sdk.startVoiceRecording.bind(sdk),
    stopVoiceRecording: sdk.stopVoiceRecording.bind(sdk),
    streamResponse: sdk.streamResponse.bind(sdk),
    getStories: sdk.getStories.bind(sdk),
    createStory: sdk.createStory.bind(sdk),
    connectSmartDevice: sdk.connectSmartDevice.bind(sdk),
    endConversation: sdk.endConversation.bind(sdk),
    syncOfflineData: sdk.syncOfflineData.bind(sdk),
    registerForPushNotifications: sdk.registerForPushNotifications.bind(sdk),
    addEventListener: sdk.addEventListener.bind(sdk),
    removeEventListener: sdk.removeEventListener.bind(sdk),
  };
};