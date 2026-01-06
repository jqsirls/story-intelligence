package com.storyteller.sdk.models

import android.content.Context
import android.os.Build
import android.os.Parcelable
import kotlinx.parcelize.Parcelize
import kotlinx.serialization.Serializable
import java.util.*

// MARK: - Core Models

@Serializable
@Parcelize
data class ConversationConfig(
    val platform: String,
    val userId: String? = null,
    val sessionId: String? = null,
    val language: String,
    val voiceEnabled: Boolean,
    val smartHomeEnabled: Boolean,
    val parentalControls: ParentalControls,
    val privacySettings: PrivacySettings,
    val customization: Customization? = null
) : Parcelable

@Serializable
@Parcelize
data class ConversationSession(
    val sessionId: String,
    val userId: String,
    val platform: String,
    val startedAt: String,
    val expiresAt: String,
    val state: ConversationState,
    val capabilities: PlatformCapabilities
) : Parcelable

@Serializable
@Parcelize
data class ConversationState(
    var phase: String,
    var context: Map<String, String> = emptyMap(),
    var history: List<ConversationHistoryItem> = emptyList(),
    var currentStory: Story? = null,
    var currentCharacter: Character? = null
) : Parcelable

@Serializable
@Parcelize
data class ConversationHistoryItem(
    val timestamp: String,
    val userMessage: UserMessage,
    val botResponse: BotResponse
) : Parcelable

@Serializable
@Parcelize
data class UserMessage(
    val type: MessageType,
    val content: MessageContent,
    val metadata: MessageMetadata
) : Parcelable

@Serializable
enum class MessageType {
    TEXT, VOICE, IMAGE, FILE
}

@Serializable
sealed class MessageContent : Parcelable {
    @Serializable
    @Parcelize
    data class Text(val text: String) : MessageContent()
    
    @Serializable
    @Parcelize
    data class Voice(val data: ByteArray) : MessageContent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as Voice
            return data.contentEquals(other.data)
        }
        
        override fun hashCode(): Int = data.contentHashCode()
    }
    
    @Serializable
    @Parcelize
    data class Image(val data: ByteArray) : MessageContent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as Image
            return data.contentEquals(other.data)
        }
        
        override fun hashCode(): Int = data.contentHashCode()
    }
    
    @Serializable
    @Parcelize
    data class File(val data: ByteArray) : MessageContent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as File
            return data.contentEquals(other.data)
        }
        
        override fun hashCode(): Int = data.contentHashCode()
    }
}

@Serializable
@Parcelize
data class MessageMetadata(
    val timestamp: Long,
    val platform: String,
    val deviceInfo: DeviceInfo? = null,
    val location: LocationInfo? = null,
    val originalAudio: Boolean? = null,
    val confidence: Float? = null
) : Parcelable

@Serializable
@Parcelize
data class BotResponse(
    val type: ResponseType,
    val content: ResponseContent,
    val suggestions: List<String>,
    val requiresInput: Boolean,
    val conversationState: ConversationState,
    val smartHomeActions: List<SmartHomeAction>,
    val metadata: BotResponseMetadata
) : Parcelable

@Serializable
enum class ResponseType {
    TEXT, VOICE, IMAGE, CARD, ACTION
}

@Serializable
sealed class ResponseContent : Parcelable {
    @Serializable
    @Parcelize
    data class Text(val text: String) : ResponseContent()
    
    @Serializable
    @Parcelize
    data class Voice(val data: ByteArray) : ResponseContent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as Voice
            return data.contentEquals(other.data)
        }
        
        override fun hashCode(): Int = data.contentHashCode()
    }
    
    @Serializable
    @Parcelize
    data class Image(val data: ByteArray) : ResponseContent() {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as Image
            return data.contentEquals(other.data)
        }
        
        override fun hashCode(): Int = data.contentHashCode()
    }
    
    @Serializable
    @Parcelize
    data class Card(val card: CardData) : ResponseContent()
    
    @Serializable
    @Parcelize
    data class Action(val action: ActionData) : ResponseContent()
}

@Serializable
@Parcelize
data class BotResponseMetadata(
    val responseTime: Int,
    val confidence: Float,
    val agentsUsed: List<String>,
    val isOffline: Boolean? = null
) : Parcelable

@Serializable
@Parcelize
data class ResponseChunk(
    val type: String,
    val content: String,
    val isComplete: Boolean,
    val metadata: ChunkMetadata
) : Parcelable

@Serializable
@Parcelize
data class ChunkMetadata(
    val chunkIndex: Int,
    val totalChunks: Int
) : Parcelable

@Serializable
@Parcelize
data class VoiceResponse(
    val transcription: String,
    val textResponse: String,
    val audioResponse: ByteArray?,
    val conversationState: ConversationState,
    val metadata: VoiceResponseMetadata
) : Parcelable {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as VoiceResponse
        if (transcription != other.transcription) return false
        if (textResponse != other.textResponse) return false
        if (audioResponse != null) {
            if (other.audioResponse == null) return false
            if (!audioResponse.contentEquals(other.audioResponse)) return false
        } else if (other.audioResponse != null) return false
        if (conversationState != other.conversationState) return false
        if (metadata != other.metadata) return false
        return true
    }
    
    override fun hashCode(): Int {
        var result = transcription.hashCode()
        result = 31 * result + textResponse.hashCode()
        result = 31 * result + (audioResponse?.contentHashCode() ?: 0)
        result = 31 * result + conversationState.hashCode()
        result = 31 * result + metadata.hashCode()
        return result
    }
}

@Serializable
@Parcelize
data class VoiceResponseMetadata(
    val transcriptionConfidence: Float,
    val responseTime: Int
) : Parcelable

// MARK: - Story Models

@Serializable
@Parcelize
data class Story(
    val id: String,
    val title: String,
    val content: StoryContent,
    val status: StoryStatus,
    val ageRating: Int,
    val createdAt: Long,
    val finalizedAt: Long? = null
) : Parcelable

@Serializable
enum class StoryStatus {
    DRAFT, FINAL
}

@Serializable
@Parcelize
data class StoryContent(
    val text: String,
    val chapters: List<StoryChapter>
) : Parcelable

@Serializable
@Parcelize
data class StoryChapter(
    val title: String,
    val content: String,
    val imageUrl: String? = null
) : Parcelable

@Serializable
@Parcelize
data class Character(
    val id: String,
    val name: String,
    val traits: CharacterTraits,
    val appearanceUrl: String? = null
) : Parcelable

@Serializable
@Parcelize
data class CharacterTraits(
    val age: Int? = null,
    val species: String,
    val gender: String? = null,
    val ethnicity: String? = null,
    val appearance: Map<String, String> = emptyMap(),
    val personality: List<String> = emptyList(),
    val inclusivityTraits: List<String> = emptyList()
) : Parcelable

@Serializable
@Parcelize
data class StoryCreationRequest(
    val character: Character,
    val storyType: String,
    val preferences: StoryPreferences? = null
) : Parcelable

@Serializable
@Parcelize
data class StoryPreferences(
    val length: String? = null,
    val themes: List<String> = emptyList(),
    val avoidTopics: List<String> = emptyList()
) : Parcelable

// MARK: - Configuration Models

@Serializable
@Parcelize
data class ParentalControls(
    val enabled: Boolean,
    val ageRestrictions: AgeRestrictions,
    val contentFiltering: ContentFiltering,
    val timeRestrictions: TimeRestrictions? = null
) : Parcelable {
    companion object {
        fun default() = ParentalControls(
            enabled = true,
            ageRestrictions = AgeRestrictions.default(),
            contentFiltering = ContentFiltering.safe(),
            timeRestrictions = null
        )
    }
}

@Serializable
@Parcelize
data class AgeRestrictions(
    val minimumAge: Int,
    val maximumAge: Int,
    val requireParentalConsent: Boolean
) : Parcelable {
    companion object {
        fun default() = AgeRestrictions(
            minimumAge = 3,
            maximumAge = 12,
            requireParentalConsent = true
        )
    }
}

@Serializable
@Parcelize
data class ContentFiltering(
    val level: FilterLevel,
    val customFilters: List<String> = emptyList()
) : Parcelable {
    
    @Serializable
    enum class FilterLevel {
        STRICT, SAFE, MODERATE
    }
    
    companion object {
        fun safe() = ContentFiltering(level = FilterLevel.SAFE)
    }
}

@Serializable
@Parcelize
data class TimeRestrictions(
    val dailyLimit: Int, // minutes
    val allowedHours: List<Int>, // hours of day
    val bedtimeMode: Boolean
) : Parcelable

@Serializable
@Parcelize
data class PrivacySettings(
    val dataRetention: String,
    val consentLevel: String,
    val analyticsEnabled: Boolean,
    val locationTracking: Boolean
) : Parcelable {
    companion object {
        fun childSafe() = PrivacySettings(
            dataRetention = "minimal",
            consentLevel = "strict",
            analyticsEnabled = false,
            locationTracking = false
        )
    }
}

@Serializable
@Parcelize
data class Customization(
    val theme: Theme,
    val branding: Branding,
    val features: FeatureFlags
) : Parcelable

@Serializable
@Parcelize
data class Theme(
    val primaryColor: String,
    val secondaryColor: String,
    val fontFamily: String,
    val darkMode: Boolean
) : Parcelable

@Serializable
@Parcelize
data class Branding(
    val logoUrl: String? = null,
    val companyName: String? = null,
    val customColors: Map<String, String> = emptyMap()
) : Parcelable

@Serializable
@Parcelize
data class FeatureFlags(
    val voiceEnabled: Boolean,
    val smartHomeEnabled: Boolean,
    val offlineMode: Boolean,
    val pushNotifications: Boolean
) : Parcelable

// MARK: - Platform Models

@Serializable
@Parcelize
data class PlatformCapabilities(
    val supportsText: Boolean,
    val supportsVoice: Boolean,
    val supportsImages: Boolean,
    val supportsFiles: Boolean,
    val supportsRealtime: Boolean,
    val supportsSmartHome: Boolean,
    val maxResponseTime: Int,
    val maxContentLength: Int
) : Parcelable

@Serializable
@Parcelize
data class DeviceInfo(
    val type: String,
    val os: String,
    val version: String,
    val model: String? = null
) : Parcelable {
    companion object {
        fun current(context: Context) = DeviceInfo(
            type = "mobile",
            os = "Android",
            version = Build.VERSION.RELEASE,
            model = Build.MODEL
        )
    }
}

@Serializable
@Parcelize
data class LocationInfo(
    val country: String,
    val timezone: String
) : Parcelable

// MARK: - Smart Home Models

@Serializable
@Parcelize
data class SmartDeviceConfig(
    val deviceType: String,
    val userId: String,
    val roomId: String,
    val deviceName: String? = null,
    val capabilities: List<String> = emptyList()
) : Parcelable

@Serializable
@Parcelize
data class DeviceConnection(
    val deviceId: String,
    val status: String,
    val connectedAt: Long
) : Parcelable

@Serializable
@Parcelize
data class SmartHomeAction(
    val type: String,
    val deviceId: String,
    val action: ActionParameters
) : Parcelable

@Serializable
@Parcelize
data class ActionParameters(
    val command: String,
    val parameters: Map<String, String> = emptyMap()
) : Parcelable

// MARK: - UI Models

@Serializable
@Parcelize
data class CardData(
    val title: String,
    val content: String,
    val imageUrl: String? = null,
    val actions: List<CardAction> = emptyList()
) : Parcelable

@Serializable
@Parcelize
data class CardAction(
    val label: String,
    val action: String,
    val payload: Map<String, String>? = null
) : Parcelable

@Serializable
@Parcelize
data class ActionData(
    val type: String,
    val payload: Map<String, String>
) : Parcelable

// MARK: - Audio Models

@Serializable
@Parcelize
data class AudioInput(
    val format: String,
    val data: ByteArray,
    val sampleRate: Int
) : Parcelable {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as AudioInput
        if (format != other.format) return false
        if (!data.contentEquals(other.data)) return false
        if (sampleRate != other.sampleRate) return false
        return true
    }
    
    override fun hashCode(): Int {
        var result = format.hashCode()
        result = 31 * result + data.contentHashCode()
        result = 31 * result + sampleRate
        return result
    }
}