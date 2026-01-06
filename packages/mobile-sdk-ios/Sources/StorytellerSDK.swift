import Foundation
import Alamofire
import Starscream
import AVFoundation
import UserNotifications
import Crypto

/// Main SDK class for iOS Storyteller integration
@available(iOS 14.0, *)
public class StorytellerSDK: NSObject {
    
    // MARK: - Properties
    
    private let apiClient: APIClient
    private let voiceProcessor: VoiceProcessor
    private let offlineManager: OfflineManager
    private let notificationManager: NotificationManager
    private let webSocketManager: WebSocketManager
    
    private var currentSession: ConversationSession?
    private var isInitialized = false
    
    // MARK: - Configuration
    
    public struct Configuration {
        let apiBaseURL: String
        let apiKey: String
        let enableVoice: Bool
        let enableOfflineMode: Bool
        let enablePushNotifications: Bool
        let customization: Customization?
        
        public init(
            apiBaseURL: String,
            apiKey: String,
            enableVoice: Bool = true,
            enableOfflineMode: Bool = true,
            enablePushNotifications: Bool = true,
            customization: Customization? = nil
        ) {
            self.apiBaseURL = apiBaseURL
            self.apiKey = apiKey
            self.enableVoice = enableVoice
            self.enableOfflineMode = enableOfflineMode
            self.enablePushNotifications = enablePushNotifications
            self.customization = customization
        }
    }
    
    public struct Customization {
        let theme: Theme
        let branding: Branding
        let features: FeatureFlags
        
        public init(theme: Theme, branding: Branding, features: FeatureFlags) {
            self.theme = theme
            self.branding = branding
            self.features = features
        }
    }
    
    // MARK: - Initialization
    
    public init(configuration: Configuration) {
        self.apiClient = APIClient(baseURL: configuration.apiBaseURL, apiKey: configuration.apiKey)
        self.voiceProcessor = VoiceProcessor(enabled: configuration.enableVoice)
        self.offlineManager = OfflineManager(enabled: configuration.enableOfflineMode)
        self.notificationManager = NotificationManager(enabled: configuration.enablePushNotifications)
        self.webSocketManager = WebSocketManager(baseURL: configuration.apiBaseURL, apiKey: configuration.apiKey)
        
        super.init()
        
        setupDelegates()
    }
    
    private func setupDelegates() {
        voiceProcessor.delegate = self
        offlineManager.delegate = self
        notificationManager.delegate = self
        webSocketManager.delegate = self
    }
    
    // MARK: - Public API
    
    /// Initialize the SDK
    public func initialize() async throws {
        guard !isInitialized else { return }
        
        try await apiClient.initialize()
        try await voiceProcessor.initialize()
        try await offlineManager.initialize()
        try await notificationManager.initialize()
        
        isInitialized = true
    }
    
    /// Start a new conversation session
    public func startConversation(
        userId: String? = nil,
        parentalControls: ParentalControls? = nil
    ) async throws -> ConversationSession {
        guard isInitialized else {
            throw StorytellerError.notInitialized
        }
        
        let config = ConversationConfig(
            platform: "mobile_ios",
            userId: userId,
            sessionId: nil,
            language: Locale.current.languageCode ?? "en",
            voiceEnabled: voiceProcessor.isEnabled,
            smartHomeEnabled: true,
            parentalControls: parentalControls ?? ParentalControls.default,
            privacySettings: PrivacySettings.childSafe
        )
        
        let session = try await apiClient.startConversation(config: config)
        currentSession = session
        
        // Connect WebSocket for real-time updates
        try await webSocketManager.connect(sessionId: session.sessionId)
        
        return session
    }
    
    /// Send a text message
    public func sendMessage(_ text: String) async throws -> BotResponse {
        guard let session = currentSession else {
            throw StorytellerError.noActiveSession
        }
        
        let message = UserMessage(
            type: .text,
            content: .text(text),
            metadata: MessageMetadata(
                timestamp: Date(),
                platform: "mobile_ios",
                deviceInfo: DeviceInfo.current
            )
        )
        
        // Try offline first if available
        if offlineManager.isEnabled && !NetworkMonitor.shared.isConnected {
            return try await offlineManager.processMessage(message, session: session)
        }
        
        return try await apiClient.sendMessage(sessionId: session.sessionId, message: message)
    }
    
    /// Send voice input
    public func sendVoiceMessage(_ audioData: Data) async throws -> VoiceResponse {
        guard let session = currentSession else {
            throw StorytellerError.noActiveSession
        }
        
        guard voiceProcessor.isEnabled else {
            throw StorytellerError.voiceNotEnabled
        }
        
        let audioInput = AudioInput(
            format: "wav",
            data: audioData,
            sampleRate: 44100
        )
        
        return try await apiClient.processVoiceInput(sessionId: session.sessionId, audioData: audioInput)
    }
    
    /// Start voice recording
    public func startVoiceRecording() throws {
        guard voiceProcessor.isEnabled else {
            throw StorytellerError.voiceNotEnabled
        }
        
        try voiceProcessor.startRecording()
    }
    
    /// Stop voice recording and process
    public func stopVoiceRecording() async throws -> VoiceResponse {
        guard voiceProcessor.isEnabled else {
            throw StorytellerError.voiceNotEnabled
        }
        
        let audioData = try voiceProcessor.stopRecording()
        return try await sendVoiceMessage(audioData)
    }
    
    /// Stream conversation responses
    public func streamResponse(for message: String) -> AsyncThrowingStream<ResponseChunk, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    guard let session = currentSession else {
                        continuation.finish(throwing: StorytellerError.noActiveSession)
                        return
                    }
                    
                    let userMessage = UserMessage(
                        type: .text,
                        content: .text(message),
                        metadata: MessageMetadata(
                            timestamp: Date(),
                            platform: "mobile_ios",
                            deviceInfo: DeviceInfo.current
                        )
                    )
                    
                    let stream = try await apiClient.streamResponse(sessionId: session.sessionId, message: userMessage)
                    
                    for try await chunk in stream {
                        continuation.yield(chunk)
                    }
                    
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
    
    /// Get user's stories
    public func getStories(libraryId: String? = nil) async throws -> [Story] {
        guard let session = currentSession else {
            throw StorytellerError.noActiveSession
        }
        
        return try await apiClient.getStories(userId: session.userId, libraryId: libraryId)
    }
    
    /// Create a new story
    public func createStory(request: StoryCreationRequest) async throws -> Story {
        guard let session = currentSession else {
            throw StorytellerError.noActiveSession
        }
        
        let story = try await apiClient.createStory(request: request)
        
        // Save offline for later sync if needed
        if offlineManager.isEnabled {
            try await offlineManager.saveStory(story)
        }
        
        return story
    }
    
    /// Connect smart home device
    public func connectSmartDevice(config: SmartDeviceConfig) async throws -> DeviceConnection {
        guard let session = currentSession else {
            throw StorytellerError.noActiveSession
        }
        
        return try await apiClient.connectSmartDevice(config: config)
    }
    
    /// End current conversation
    public func endConversation() async throws {
        guard let session = currentSession else { return }
        
        try await apiClient.endConversation(sessionId: session.sessionId)
        try await webSocketManager.disconnect()
        
        currentSession = nil
    }
    
    /// Sync offline data when connection is restored
    public func syncOfflineData() async throws {
        guard offlineManager.isEnabled else { return }
        
        try await offlineManager.syncWithServer(apiClient: apiClient)
    }
    
    /// Register for push notifications
    public func registerForPushNotifications() async throws {
        guard notificationManager.isEnabled else {
            throw StorytellerError.notificationsNotEnabled
        }
        
        try await notificationManager.requestPermission()
        let deviceToken = try await notificationManager.getDeviceToken()
        
        if let session = currentSession {
            try await apiClient.registerDeviceToken(deviceToken, userId: session.userId)
        }
    }
}

// MARK: - Delegate Implementations

@available(iOS 14.0, *)
extension StorytellerSDK: VoiceProcessorDelegate {
    func voiceProcessor(_ processor: VoiceProcessor, didDetectSpeech speech: String, confidence: Float) {
        // Handle real-time speech detection
    }
    
    func voiceProcessor(_ processor: VoiceProcessor, didEncounterError error: Error) {
        // Handle voice processing errors
    }
}

@available(iOS 14.0, *)
extension StorytellerSDK: OfflineManagerDelegate {
    func offlineManager(_ manager: OfflineManager, didSyncStories stories: [Story]) {
        // Handle successful story sync
    }
    
    func offlineManager(_ manager: OfflineManager, didFailToSync error: Error) {
        // Handle sync failures
    }
}

@available(iOS 14.0, *)
extension StorytellerSDK: NotificationManagerDelegate {
    func notificationManager(_ manager: NotificationManager, didReceiveStoryCompletion story: Story) {
        // Handle story completion notifications
    }
    
    func notificationManager(_ manager: NotificationManager, didReceiveReminder reminder: Reminder) {
        // Handle storytelling reminders
    }
}

@available(iOS 14.0, *)
extension StorytellerSDK: WebSocketManagerDelegate {
    func webSocketManager(_ manager: WebSocketManager, didReceiveMessage message: WebSocketMessage) {
        // Handle real-time updates
    }
    
    func webSocketManager(_ manager: WebSocketManager, didDisconnectWithError error: Error?) {
        // Handle WebSocket disconnection
    }
}

// MARK: - Error Types

public enum StorytellerError: Error, LocalizedError {
    case notInitialized
    case noActiveSession
    case voiceNotEnabled
    case notificationsNotEnabled
    case networkError(Error)
    case apiError(String)
    case offlineError(String)
    
    public var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "SDK not initialized. Call initialize() first."
        case .noActiveSession:
            return "No active conversation session. Start a conversation first."
        case .voiceNotEnabled:
            return "Voice processing is not enabled."
        case .notificationsNotEnabled:
            return "Push notifications are not enabled."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .apiError(let message):
            return "API error: \(message)"
        case .offlineError(let message):
            return "Offline error: \(message)"
        }
    }
}