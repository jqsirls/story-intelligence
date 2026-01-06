package com.storyteller.sdk

import android.content.Context
import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import com.storyteller.sdk.api.APIClient
import com.storyteller.sdk.audio.VoiceProcessor
import com.storyteller.sdk.offline.OfflineManager
import com.storyteller.sdk.notifications.NotificationManager
import com.storyteller.sdk.websocket.WebSocketManager
import com.storyteller.sdk.models.*

/**
 * Main SDK class for Android Storyteller integration
 */
class StorytellerSDK private constructor(
    private val context: Context,
    private val configuration: Configuration
) : DefaultLifecycleObserver {

    companion object {
        private const val TAG = "StorytellerSDK"
        
        @Volatile
        private var INSTANCE: StorytellerSDK? = null
        
        /**
         * Initialize the SDK with configuration
         */
        fun initialize(context: Context, configuration: Configuration): StorytellerSDK {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: StorytellerSDK(context.applicationContext, configuration).also { 
                    INSTANCE = it
                    ProcessLifecycleOwner.get().lifecycle.addObserver(it)
                }
            }
        }
        
        /**
         * Get the initialized SDK instance
         */
        fun getInstance(): StorytellerSDK {
            return INSTANCE ?: throw IllegalStateException("SDK not initialized. Call initialize() first.")
        }
    }

    // Core components
    private val apiClient = APIClient(configuration.apiBaseURL, configuration.apiKey)
    private val voiceProcessor = VoiceProcessor(context, configuration.enableVoice)
    private val offlineManager = OfflineManager(context, configuration.enableOfflineMode)
    private val notificationManager = NotificationManager(context, configuration.enablePushNotifications)
    private val webSocketManager = WebSocketManager(configuration.apiBaseURL, configuration.apiKey)
    
    // Coroutine scope for SDK operations
    private val sdkScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    
    // Current session
    private var currentSession: ConversationSession? = null
    private var isInitialized = false

    /**
     * Configuration for the SDK
     */
    data class Configuration(
        val apiBaseURL: String,
        val apiKey: String,
        val enableVoice: Boolean = true,
        val enableOfflineMode: Boolean = true,
        val enablePushNotifications: Boolean = true,
        val customization: Customization? = null
    )

    /**
     * Initialize the SDK components
     */
    suspend fun initialize() {
        if (isInitialized) return
        
        try {
            Log.d(TAG, "Initializing StorytellerSDK...")
            
            // Initialize components in parallel
            coroutineScope {
                launch { apiClient.initialize() }
                launch { voiceProcessor.initialize() }
                launch { offlineManager.initialize() }
                launch { notificationManager.initialize() }
            }
            
            isInitialized = true
            Log.d(TAG, "StorytellerSDK initialized successfully")
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize SDK", e)
            throw StorytellerException.InitializationFailed(e)
        }
    }

    /**
     * Start a new conversation session
     */
    suspend fun startConversation(
        userId: String? = null,
        parentalControls: ParentalControls? = null
    ): ConversationSession {
        ensureInitialized()
        
        val config = ConversationConfig(
            platform = "mobile_android",
            userId = userId,
            sessionId = null,
            language = java.util.Locale.getDefault().language,
            voiceEnabled = voiceProcessor.isEnabled,
            smartHomeEnabled = true,
            parentalControls = parentalControls ?: ParentalControls.default(),
            privacySettings = PrivacySettings.childSafe()
        )
        
        val session = apiClient.startConversation(config)
        currentSession = session
        
        // Connect WebSocket for real-time updates
        webSocketManager.connect(session.sessionId)
        
        return session
    }

    /**
     * Send a text message
     */
    suspend fun sendMessage(text: String): BotResponse {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        
        val message = UserMessage(
            type = MessageType.TEXT,
            content = MessageContent.Text(text),
            metadata = MessageMetadata(
                timestamp = System.currentTimeMillis(),
                platform = "mobile_android",
                deviceInfo = DeviceInfo.current(context)
            )
        )
        
        // Try offline first if available and no network
        return if (offlineManager.isEnabled && !NetworkMonitor.isConnected(context)) {
            offlineManager.processMessage(message, session)
        } else {
            apiClient.sendMessage(session.sessionId, message)
        }
    }

    /**
     * Send voice input
     */
    suspend fun sendVoiceMessage(audioData: ByteArray): VoiceResponse {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        
        if (!voiceProcessor.isEnabled) {
            throw StorytellerException.VoiceNotEnabled()
        }
        
        val audioInput = AudioInput(
            format = "wav",
            data = audioData,
            sampleRate = 44100
        )
        
        return apiClient.processVoiceInput(session.sessionId, audioInput)
    }

    /**
     * Start voice recording
     */
    suspend fun startVoiceRecording() {
        if (!voiceProcessor.isEnabled) {
            throw StorytellerException.VoiceNotEnabled()
        }
        
        voiceProcessor.startRecording()
    }

    /**
     * Stop voice recording and process
     */
    suspend fun stopVoiceRecording(): VoiceResponse {
        if (!voiceProcessor.isEnabled) {
            throw StorytellerException.VoiceNotEnabled()
        }
        
        val audioData = voiceProcessor.stopRecording()
        return sendVoiceMessage(audioData)
    }

    /**
     * Stream conversation responses
     */
    fun streamResponse(message: String): Flow<ResponseChunk> = flow {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        
        val userMessage = UserMessage(
            type = MessageType.TEXT,
            content = MessageContent.Text(message),
            metadata = MessageMetadata(
                timestamp = System.currentTimeMillis(),
                platform = "mobile_android",
                deviceInfo = DeviceInfo.current(context)
            )
        )
        
        apiClient.streamResponse(session.sessionId, userMessage).collect { chunk ->
            emit(chunk)
        }
    }

    /**
     * Get user's stories
     */
    suspend fun getStories(libraryId: String? = null): List<Story> {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        return apiClient.getStories(session.userId, libraryId)
    }

    /**
     * Create a new story
     */
    suspend fun createStory(request: StoryCreationRequest): Story {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        
        val story = apiClient.createStory(request)
        
        // Save offline for later sync if needed
        if (offlineManager.isEnabled) {
            offlineManager.saveStory(story)
        }
        
        return story
    }

    /**
     * Connect smart home device
     */
    suspend fun connectSmartDevice(config: SmartDeviceConfig): DeviceConnection {
        val session = currentSession ?: throw StorytellerException.NoActiveSession()
        return apiClient.connectSmartDevice(config)
    }

    /**
     * End current conversation
     */
    suspend fun endConversation() {
        val session = currentSession ?: return
        
        try {
            apiClient.endConversation(session.sessionId)
            webSocketManager.disconnect()
        } finally {
            currentSession = null
        }
    }

    /**
     * Sync offline data when connection is restored
     */
    suspend fun syncOfflineData() {
        if (!offlineManager.isEnabled) return
        offlineManager.syncWithServer(apiClient)
    }

    /**
     * Register for push notifications
     */
    suspend fun registerForPushNotifications() {
        if (!notificationManager.isEnabled) {
            throw StorytellerException.NotificationsNotEnabled()
        }
        
        notificationManager.requestPermission()
        val deviceToken = notificationManager.getDeviceToken()
        
        currentSession?.let { session ->
            apiClient.registerDeviceToken(deviceToken, session.userId)
        }
    }

    /**
     * Set up voice processor callbacks
     */
    fun setVoiceProcessorCallback(callback: VoiceProcessor.Callback) {
        voiceProcessor.setCallback(callback)
    }

    /**
     * Set up offline manager callbacks
     */
    fun setOfflineManagerCallback(callback: OfflineManager.Callback) {
        offlineManager.setCallback(callback)
    }

    /**
     * Set up notification manager callbacks
     */
    fun setNotificationManagerCallback(callback: NotificationManager.Callback) {
        notificationManager.setCallback(callback)
    }

    /**
     * Set up WebSocket manager callbacks
     */
    fun setWebSocketManagerCallback(callback: WebSocketManager.Callback) {
        webSocketManager.setCallback(callback)
    }

    // Lifecycle methods
    override fun onStart(owner: LifecycleOwner) {
        super.onStart(owner)
        Log.d(TAG, "SDK lifecycle: onStart")
    }

    override fun onStop(owner: LifecycleOwner) {
        super.onStop(owner)
        Log.d(TAG, "SDK lifecycle: onStop")
        
        // Pause non-critical operations
        sdkScope.launch {
            try {
                // Don't end conversation, just pause WebSocket
                webSocketManager.pause()
            } catch (e: Exception) {
                Log.w(TAG, "Error pausing SDK operations", e)
            }
        }
    }

    override fun onDestroy(owner: LifecycleOwner) {
        super.onDestroy(owner)
        Log.d(TAG, "SDK lifecycle: onDestroy")
        
        // Clean up resources
        sdkScope.launch {
            try {
                endConversation()
                voiceProcessor.cleanup()
                offlineManager.cleanup()
                notificationManager.cleanup()
                webSocketManager.cleanup()
            } catch (e: Exception) {
                Log.w(TAG, "Error cleaning up SDK", e)
            } finally {
                sdkScope.cancel()
            }
        }
    }

    private fun ensureInitialized() {
        if (!isInitialized) {
            throw StorytellerException.NotInitialized()
        }
    }
}

/**
 * SDK-specific exceptions
 */
sealed class StorytellerException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class NotInitialized : StorytellerException("SDK not initialized. Call initialize() first.")
    class InitializationFailed(cause: Throwable) : StorytellerException("Failed to initialize SDK", cause)
    class NoActiveSession : StorytellerException("No active conversation session. Start a conversation first.")
    class VoiceNotEnabled : StorytellerException("Voice processing is not enabled.")
    class NotificationsNotEnabled : StorytellerException("Push notifications are not enabled.")
    class NetworkError(cause: Throwable) : StorytellerException("Network error: ${cause.message}", cause)
    class APIError(message: String) : StorytellerException("API error: $message")
    class OfflineError(message: String) : StorytellerException("Offline error: $message")
}