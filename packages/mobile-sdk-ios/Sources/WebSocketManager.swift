import Foundation
import Starscream

@available(iOS 14.0, *)
internal protocol WebSocketManagerDelegate: AnyObject {
    func webSocketManager(_ manager: WebSocketManager, didReceiveMessage message: WebSocketMessage)
    func webSocketManager(_ manager: WebSocketManager, didDisconnectWithError error: Error?)
}

@available(iOS 14.0, *)
internal class WebSocketManager: NSObject {
    
    weak var delegate: WebSocketManagerDelegate?
    
    private let baseURL: String
    private let apiKey: String
    private var socket: WebSocket?
    private var isConnected = false
    private var reconnectAttempts = 0
    private let maxReconnectAttempts = 5
    private var reconnectTimer: Timer?
    
    init(baseURL: String, apiKey: String) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        super.init()
    }
    
    func connect(sessionId: String) async throws {
        guard !isConnected else { return }
        
        let wsURL = baseURL.replacingOccurrences(of: "https://", with: "wss://")
            .replacingOccurrences(of: "http://", with: "ws://")
        
        guard let url = URL(string: "\(wsURL)/ws/conversations/\(sessionId)") else {
            throw WebSocketError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("StorytellerSDK-iOS/1.0.0", forHTTPHeaderField: "User-Agent")
        
        socket = WebSocket(request: request)
        socket?.delegate = self
        socket?.connect()
        
        // Wait for connection with timeout
        try await waitForConnection(timeout: 10.0)
    }
    
    private func waitForConnection(timeout: TimeInterval) async throws {
        let startTime = Date()
        
        while !isConnected && Date().timeIntervalSince(startTime) < timeout {
            try await Task.sleep(nanoseconds: 100_000_000) // 0.1 seconds
        }
        
        if !isConnected {
            throw WebSocketError.connectionTimeout
        }
    }
    
    func disconnect() async throws {
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        
        socket?.disconnect()
        socket = nil
        isConnected = false
        reconnectAttempts = 0
    }
    
    func sendMessage(_ message: WebSocketMessage) throws {
        guard isConnected, let socket = socket else {
            throw WebSocketError.notConnected
        }
        
        let data = try JSONEncoder().encode(message)
        socket.write(data: data)
    }
    
    private func attemptReconnect() {
        guard reconnectAttempts < maxReconnectAttempts else {
            delegate?.webSocketManager(self, didDisconnectWithError: WebSocketError.maxReconnectAttemptsReached)
            return
        }
        
        reconnectAttempts += 1
        let delay = min(pow(2.0, Double(reconnectAttempts)), 30.0) // Exponential backoff, max 30 seconds
        
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.socket?.connect()
        }
    }
}

// MARK: - WebSocketDelegate

@available(iOS 14.0, *)
extension WebSocketManager: WebSocketDelegate {
    func didReceive(event: WebSocketEvent, client: WebSocket) {
        switch event {
        case .connected(let headers):
            isConnected = true
            reconnectAttempts = 0
            print("WebSocket connected with headers: \(headers)")
            
        case .disconnected(let reason, let code):
            isConnected = false
            print("WebSocket disconnected: \(reason) with code: \(code)")
            
            // Attempt reconnection unless it was intentional
            if code != CloseCode.normal.rawValue {
                attemptReconnect()
            }
            
        case .text(let string):
            handleTextMessage(string)
            
        case .binary(let data):
            handleBinaryMessage(data)
            
        case .error(let error):
            isConnected = false
            delegate?.webSocketManager(self, didDisconnectWithError: error)
            attemptReconnect()
            
        case .ping(_):
            break
            
        case .pong(_):
            break
            
        case .viabilityChanged(let isViable):
            if !isViable && isConnected {
                attemptReconnect()
            }
            
        case .reconnectSuggested(let shouldReconnect):
            if shouldReconnect {
                attemptReconnect()
            }
            
        case .cancelled:
            isConnected = false
        }
    }
    
    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        handleBinaryMessage(data)
    }
    
    private func handleBinaryMessage(_ data: Data) {
        do {
            let message = try JSONDecoder().decode(WebSocketMessage.self, from: data)
            delegate?.webSocketManager(self, didReceiveMessage: message)
        } catch {
            print("Failed to decode WebSocket message: \(error)")
        }
    }
}

// MARK: - WebSocket Message Types

struct WebSocketMessage: Codable {
    let type: MessageType
    let payload: MessagePayload
    let timestamp: Date
    let sessionId: String?
    
    enum MessageType: String, Codable {
        case storyUpdate = "story_update"
        case characterUpdate = "character_update"
        case assetGenerated = "asset_generated"
        case conversationState = "conversation_state"
        case smartHomeAction = "smart_home_action"
        case error = "error"
        case ping = "ping"
        case pong = "pong"
    }
    
    enum MessagePayload: Codable {
        case storyUpdate(StoryUpdatePayload)
        case characterUpdate(CharacterUpdatePayload)
        case assetGenerated(AssetGeneratedPayload)
        case conversationState(ConversationStatePayload)
        case smartHomeAction(SmartHomeActionPayload)
        case error(ErrorPayload)
        case ping(PingPayload)
        case pong(PongPayload)
        
        enum CodingKeys: String, CodingKey {
            case type
        }
        
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            let type = try container.decode(String.self, forKey: .type)
            
            switch type {
            case "story_update":
                let payload = try StoryUpdatePayload(from: decoder)
                self = .storyUpdate(payload)
            case "character_update":
                let payload = try CharacterUpdatePayload(from: decoder)
                self = .characterUpdate(payload)
            case "asset_generated":
                let payload = try AssetGeneratedPayload(from: decoder)
                self = .assetGenerated(payload)
            case "conversation_state":
                let payload = try ConversationStatePayload(from: decoder)
                self = .conversationState(payload)
            case "smart_home_action":
                let payload = try SmartHomeActionPayload(from: decoder)
                self = .smartHomeAction(payload)
            case "error":
                let payload = try ErrorPayload(from: decoder)
                self = .error(payload)
            case "ping":
                let payload = try PingPayload(from: decoder)
                self = .ping(payload)
            case "pong":
                let payload = try PongPayload(from: decoder)
                self = .pong(payload)
            default:
                throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown message type: \(type)")
            }
        }
        
        func encode(to encoder: Encoder) throws {
            switch self {
            case .storyUpdate(let payload):
                try payload.encode(to: encoder)
            case .characterUpdate(let payload):
                try payload.encode(to: encoder)
            case .assetGenerated(let payload):
                try payload.encode(to: encoder)
            case .conversationState(let payload):
                try payload.encode(to: encoder)
            case .smartHomeAction(let payload):
                try payload.encode(to: encoder)
            case .error(let payload):
                try payload.encode(to: encoder)
            case .ping(let payload):
                try payload.encode(to: encoder)
            case .pong(let payload):
                try payload.encode(to: encoder)
            }
        }
    }
}

// MARK: - Payload Types

struct StoryUpdatePayload: Codable {
    let storyId: String
    let updates: [String: Any]
    let version: Int
    
    enum CodingKeys: String, CodingKey {
        case type = "story_update"
        case storyId, updates, version
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        storyId = try container.decode(String.self, forKey: .storyId)
        version = try container.decode(Int.self, forKey: .version)
        
        // Handle Any type for updates
        let updatesContainer = try container.nestedContainer(keyedBy: DynamicCodingKeys.self, forKey: .updates)
        var updatesDict: [String: Any] = [:]
        
        for key in updatesContainer.allKeys {
            if let stringValue = try? updatesContainer.decode(String.self, forKey: key) {
                updatesDict[key.stringValue] = stringValue
            } else if let intValue = try? updatesContainer.decode(Int.self, forKey: key) {
                updatesDict[key.stringValue] = intValue
            } else if let boolValue = try? updatesContainer.decode(Bool.self, forKey: key) {
                updatesDict[key.stringValue] = boolValue
            }
        }
        
        updates = updatesDict
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode("story_update", forKey: .type)
        try container.encode(storyId, forKey: .storyId)
        try container.encode(version, forKey: .version)
        
        // Encode updates - simplified for this example
        var updatesContainer = container.nestedContainer(keyedBy: DynamicCodingKeys.self, forKey: .updates)
        for (key, value) in updates {
            let codingKey = DynamicCodingKeys(stringValue: key)!
            if let stringValue = value as? String {
                try updatesContainer.encode(stringValue, forKey: codingKey)
            } else if let intValue = value as? Int {
                try updatesContainer.encode(intValue, forKey: codingKey)
            } else if let boolValue = value as? Bool {
                try updatesContainer.encode(boolValue, forKey: codingKey)
            }
        }
    }
}

struct CharacterUpdatePayload: Codable {
    let characterId: String
    let updates: [String: String]
    
    enum CodingKeys: String, CodingKey {
        case type = "character_update"
        case characterId, updates
    }
}

struct AssetGeneratedPayload: Codable {
    let assetType: String
    let assetUrl: String
    let storyId: String
    
    enum CodingKeys: String, CodingKey {
        case type = "asset_generated"
        case assetType, assetUrl, storyId
    }
}

struct ConversationStatePayload: Codable {
    let phase: String
    let context: [String: String]
    
    enum CodingKeys: String, CodingKey {
        case type = "conversation_state"
        case phase, context
    }
}

struct SmartHomeActionPayload: Codable {
    let deviceId: String
    let action: String
    let parameters: [String: String]
    
    enum CodingKeys: String, CodingKey {
        case type = "smart_home_action"
        case deviceId, action, parameters
    }
}

struct ErrorPayload: Codable {
    let code: String
    let message: String
    let details: String?
    
    enum CodingKeys: String, CodingKey {
        case type = "error"
        case code, message, details
    }
}

struct PingPayload: Codable {
    let timestamp: Date
    
    enum CodingKeys: String, CodingKey {
        case type = "ping"
        case timestamp
    }
}

struct PongPayload: Codable {
    let timestamp: Date
    
    enum CodingKeys: String, CodingKey {
        case type = "pong"
        case timestamp
    }
}

// MARK: - Dynamic Coding Keys

struct DynamicCodingKeys: CodingKey {
    var stringValue: String
    var intValue: Int?
    
    init?(stringValue: String) {
        self.stringValue = stringValue
    }
    
    init?(intValue: Int) {
        self.intValue = intValue
        self.stringValue = "\(intValue)"
    }
}

// MARK: - Error Types

enum WebSocketError: Error, LocalizedError {
    case invalidURL
    case connectionTimeout
    case notConnected
    case maxReconnectAttemptsReached
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid WebSocket URL"
        case .connectionTimeout:
            return "WebSocket connection timeout"
        case .notConnected:
            return "WebSocket not connected"
        case .maxReconnectAttemptsReached:
            return "Maximum reconnection attempts reached"
        }
    }
}