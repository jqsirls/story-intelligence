package com.storyteller.sdk.api

import android.util.Log
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import com.storyteller.sdk.models.*
import com.storyteller.sdk.StorytellerException
import java.util.concurrent.TimeUnit

/**
 * API client for communicating with the Storyteller backend
 */
internal class APIClient(
    private val baseURL: String,
    private val apiKey: String
) {
    companion object {
        private const val TAG = "APIClient"
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $apiKey")
                .addHeader("Content-Type", "application/json")
                .addHeader("User-Agent", "StorytellerSDK-Android/1.0.0")
                .build()
            chain.proceed(request)
        }
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        })
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(baseURL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    private val apiService = retrofit.create(StorytellerAPIService::class.java)

    suspend fun initialize() {
        try {
            // Validate API connection
            val response = apiService.healthCheck()
            if (!response.isSuccessful) {
                throw StorytellerException.APIError("Health check failed: ${response.code()}")
            }
            Log.d(TAG, "API client initialized successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize API client", e)
            throw StorytellerException.NetworkError(e)
        }
    }

    suspend fun startConversation(config: ConversationConfig): ConversationSession {
        try {
            val response = apiService.startConversation(config)
            if (response.isSuccessful) {
                return response.body() ?: throw StorytellerException.APIError("Empty response body")
            } else {
                throw StorytellerException.APIError("Failed to start conversation: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting conversation", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun sendMessage(sessionId: String, message: UserMessage): BotResponse {
        try {
            val response = apiService.sendMessage(sessionId, message)
            if (response.isSuccessful) {
                return response.body() ?: throw StorytellerException.APIError("Empty response body")
            } else {
                throw StorytellerException.APIError("Failed to send message: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun processVoiceInput(sessionId: String, audioData: AudioInput): VoiceResponse {
        try {
            val response = apiService.processVoiceInput(sessionId, audioData)
            if (response.isSuccessful) {
                return response.body() ?: throw StorytellerException.APIError("Empty response body")
            } else {
                throw StorytellerException.APIError("Failed to process voice input: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing voice input", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    fun streamResponse(sessionId: String, message: UserMessage): Flow<ResponseChunk> = flow {
        try {
            // For now, simulate streaming by breaking response into chunks
            // In a real implementation, this would use Server-Sent Events or WebSocket
            val response = sendMessage(sessionId, message)
            
            when (val content = response.content) {
                is ResponseContent.Text -> {
                    val words = content.text.split(" ")
                    words.forEachIndexed { index, word ->
                        val chunk = ResponseChunk(
                            type = "text_chunk",
                            content = words.take(index + 1).joinToString(" "),
                            isComplete = index == words.size - 1,
                            metadata = ChunkMetadata(
                                chunkIndex = index,
                                totalChunks = words.size
                            )
                        )
                        emit(chunk)
                        
                        // Small delay to simulate streaming
                        kotlinx.coroutines.delay(50)
                    }
                }
                else -> {
                    // For non-text responses, emit as single chunk
                    emit(ResponseChunk(
                        type = "complete",
                        content = response.content.toString(),
                        isComplete = true,
                        metadata = ChunkMetadata(0, 1)
                    ))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error streaming response", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun getStories(userId: String, libraryId: String?): List<Story> {
        try {
            val response = apiService.getStories(userId, libraryId)
            if (response.isSuccessful) {
                return response.body() ?: emptyList()
            } else {
                throw StorytellerException.APIError("Failed to get stories: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting stories", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun createStory(request: StoryCreationRequest): Story {
        try {
            val response = apiService.createStory(request)
            if (response.isSuccessful) {
                return response.body() ?: throw StorytellerException.APIError("Empty response body")
            } else {
                throw StorytellerException.APIError("Failed to create story: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error creating story", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun connectSmartDevice(config: SmartDeviceConfig): DeviceConnection {
        try {
            val response = apiService.connectSmartDevice(config)
            if (response.isSuccessful) {
                return response.body() ?: throw StorytellerException.APIError("Empty response body")
            } else {
                throw StorytellerException.APIError("Failed to connect device: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error connecting smart device", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun endConversation(sessionId: String) {
        try {
            val response = apiService.endConversation(sessionId)
            if (!response.isSuccessful) {
                throw StorytellerException.APIError("Failed to end conversation: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error ending conversation", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }

    suspend fun registerDeviceToken(token: String, userId: String) {
        try {
            val request = DeviceTokenRequest(
                deviceToken = token,
                platform = "android",
                userId = userId
            )
            val response = apiService.registerDeviceToken(request)
            if (!response.isSuccessful) {
                throw StorytellerException.APIError("Failed to register device token: ${response.code()}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering device token", e)
            throw if (e is StorytellerException) e else StorytellerException.NetworkError(e)
        }
    }
}

/**
 * Retrofit API service interface
 */
private interface StorytellerAPIService {
    
    @GET("health")
    suspend fun healthCheck(): retrofit2.Response<Unit>
    
    @POST("api/v1/conversations/start")
    suspend fun startConversation(@Body config: ConversationConfig): retrofit2.Response<ConversationSession>
    
    @POST("api/v1/conversations/{sessionId}/messages")
    suspend fun sendMessage(
        @Path("sessionId") sessionId: String,
        @Body message: UserMessage
    ): retrofit2.Response<BotResponse>
    
    @POST("api/v1/conversations/{sessionId}/voice")
    suspend fun processVoiceInput(
        @Path("sessionId") sessionId: String,
        @Body audioData: AudioInput
    ): retrofit2.Response<VoiceResponse>
    
    @GET("api/v1/users/{userId}/stories")
    suspend fun getStories(
        @Path("userId") userId: String,
        @Query("libraryId") libraryId: String?
    ): retrofit2.Response<List<Story>>
    
    @POST("api/v1/stories")
    suspend fun createStory(@Body request: StoryCreationRequest): retrofit2.Response<Story>
    
    @POST("api/v1/smart-home/connect")
    suspend fun connectSmartDevice(@Body config: SmartDeviceConfig): retrofit2.Response<DeviceConnection>
    
    @POST("api/v1/conversations/{sessionId}/end")
    suspend fun endConversation(@Path("sessionId") sessionId: String): retrofit2.Response<Unit>
    
    @POST("api/v1/notifications/register")
    suspend fun registerDeviceToken(@Body request: DeviceTokenRequest): retrofit2.Response<Unit>
}

/**
 * Request model for device token registration
 */
private data class DeviceTokenRequest(
    val deviceToken: String,
    val platform: String,
    val userId: String
)