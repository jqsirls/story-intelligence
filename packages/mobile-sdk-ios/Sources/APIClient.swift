import Foundation
import Alamofire

@available(iOS 14.0, *)
internal class APIClient {
    
    private let baseURL: String
    private let apiKey: String
    private let session: Session
    
    init(baseURL: String, apiKey: String) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        
        self.session = Session(configuration: configuration)
    }
    
    func initialize() async throws {
        // Validate API connection
        try await validateConnection()
    }
    
    private func validateConnection() async throws {
        let request = AF.request(
            "\(baseURL)/health",
            method: .get,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingData().response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let statusCode = response.response?.statusCode,
              200...299 ~= statusCode else {
            throw StorytellerError.apiError("Invalid API response")
        }
    }
    
    func startConversation(config: ConversationConfig) async throws -> ConversationSession {
        let request = AF.request(
            "\(baseURL)/api/v1/conversations/start",
            method: .post,
            parameters: config,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable(ConversationSession.self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let session = response.value else {
            throw StorytellerError.apiError("Failed to start conversation")
        }
        
        return session
    }
    
    func sendMessage(sessionId: String, message: UserMessage) async throws -> BotResponse {
        let request = AF.request(
            "\(baseURL)/api/v1/conversations/\(sessionId)/messages",
            method: .post,
            parameters: message,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable(BotResponse.self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let botResponse = response.value else {
            throw StorytellerError.apiError("Failed to send message")
        }
        
        return botResponse
    }
    
    func processVoiceInput(sessionId: String, audioData: AudioInput) async throws -> VoiceResponse {
        let request = AF.request(
            "\(baseURL)/api/v1/conversations/\(sessionId)/voice",
            method: .post,
            parameters: audioData,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable(VoiceResponse.self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let voiceResponse = response.value else {
            throw StorytellerError.apiError("Failed to process voice input")
        }
        
        return voiceResponse
    }
    
    func streamResponse(sessionId: String, message: UserMessage) async throws -> AsyncThrowingStream<ResponseChunk, Error> {
        return AsyncThrowingStream { continuation in
            Task {
                do {
                    let request = AF.request(
                        "\(baseURL)/api/v1/conversations/\(sessionId)/stream",
                        method: .post,
                        parameters: message,
                        encoder: JSONParameterEncoder.default,
                        headers: defaultHeaders()
                    )
                    
                    let stream = request.streamingDecodable(ResponseChunk.self)
                    
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
    
    func getStories(userId: String, libraryId: String?) async throws -> [Story] {
        var url = "\(baseURL)/api/v1/users/\(userId)/stories"
        if let libraryId = libraryId {
            url += "?libraryId=\(libraryId)"
        }
        
        let request = AF.request(
            url,
            method: .get,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable([Story].self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        return response.value ?? []
    }
    
    func createStory(request: StoryCreationRequest) async throws -> Story {
        let request = AF.request(
            "\(baseURL)/api/v1/stories",
            method: .post,
            parameters: request,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable(Story.self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let story = response.value else {
            throw StorytellerError.apiError("Failed to create story")
        }
        
        return story
    }
    
    func connectSmartDevice(config: SmartDeviceConfig) async throws -> DeviceConnection {
        let request = AF.request(
            "\(baseURL)/api/v1/smart-home/connect",
            method: .post,
            parameters: config,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingDecodable(DeviceConnection.self).response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
        
        guard let connection = response.value else {
            throw StorytellerError.apiError("Failed to connect device")
        }
        
        return connection
    }
    
    func endConversation(sessionId: String) async throws {
        let request = AF.request(
            "\(baseURL)/api/v1/conversations/\(sessionId)/end",
            method: .post,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingData().response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
    }
    
    func registerDeviceToken(_ token: String, userId: String) async throws {
        let parameters = [
            "deviceToken": token,
            "platform": "ios",
            "userId": userId
        ]
        
        let request = AF.request(
            "\(baseURL)/api/v1/notifications/register",
            method: .post,
            parameters: parameters,
            encoder: JSONParameterEncoder.default,
            headers: defaultHeaders()
        )
        
        let response = await request.serializingData().response
        
        if let error = response.error {
            throw StorytellerError.networkError(error)
        }
    }
    
    private func defaultHeaders() -> HTTPHeaders {
        return [
            "Authorization": "Bearer \(apiKey)",
            "Content-Type": "application/json",
            "User-Agent": "StorytellerSDK-iOS/1.0.0"
        ]
    }
}

// MARK: - Alamofire Extensions

extension AF {
    static func streamingDecodable<T: Decodable>(_ type: T.Type) -> DataStreamRequest {
        // Implementation for streaming responses
        return AF.streamRequest("").responseStream { stream in
            // Handle streaming data
        }
    }
}

extension DataRequest {
    func streamingDecodable<T: Decodable>(_ type: T.Type) -> AsyncThrowingStream<T, Error> {
        return AsyncThrowingStream { continuation in
            self.responseStream { stream in
                switch stream.event {
                case .stream(let result):
                    switch result {
                    case .success(let data):
                        do {
                            let decoded = try JSONDecoder().decode(T.self, from: data)
                            continuation.yield(decoded)
                        } catch {
                            continuation.finish(throwing: error)
                        }
                    case .failure(let error):
                        continuation.finish(throwing: error)
                    }
                case .complete:
                    continuation.finish()
                }
            }
        }
    }
}