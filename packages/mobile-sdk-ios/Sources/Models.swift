import Foundation

// MARK: - Core Models

public struct ConversationConfig: Codable {
    let platform: String
    let userId: String?
    let sessionId: String?
    let language: String
    let voiceEnabled: Bool
    let smartHomeEnabled: Bool
    let parentalControls: ParentalControls
    let privacySettings: PrivacySettings
    let customization: Customization?
    
    public init(
        platform: String,
        userId: String? = nil,
        sessionId: String? = nil,
        language: String,
        voiceEnabled: Bool,
        smartHomeEnabled: Bool,
        parentalControls: ParentalControls,
        privacySettings: PrivacySettings,
        customization: Customization? = nil
    ) {
        self.platform = platform
        self.userId = userId
        self.sessionId = sessionId
        self.language = language
        self.voiceEnabled = voiceEnabled
        self.smartHomeEnabled = smartHomeEnabled
        self.parentalControls = parentalControls
        self.privacySettings = privacySettings
        self.customization = customization
    }
}

public struct ConversationSession: Codable {
    public let sessionId: String
    public let userId: String
    public let platform: String
    public let startedAt: String
    public let expiresAt: String
    public var state: ConversationState
    public let capabilities: PlatformCapabilities
    
    public init(
        sessionId: String,
        userId: String,
        platform: String,
        startedAt: String,
        expiresAt: String,
        state: ConversationState,
        capabilities: PlatformCapabilities
    ) {
        self.sessionId = sessionId
        self.userId = userId
        self.platform = platform
        self.startedAt = startedAt
        self.expiresAt = expiresAt
        self.state = state
        self.capabilities = capabilities
    }
}

public struct ConversationState: Codable {
    public var phase: String
    public var context: [String: String]
    public var history: [ConversationHistoryItem]
    public var currentStory: Story?
    public var currentCharacter: Character?
    
    public init(
        phase: String,
        context: [String: String] = [:],
        history: [ConversationHistoryItem] = [],
        currentStory: Story? = nil,
        currentCharacter: Character? = nil
    ) {
        self.phase = phase
        self.context = context
        self.history = history
        self.currentStory = currentStory
        self.currentCharacter = currentCharacter
    }
}

public struct ConversationHistoryItem: Codable {
    public let timestamp: String
    public let userMessage: UserMessage
    public let botResponse: BotResponse
    
    public init(timestamp: String, userMessage: UserMessage, botResponse: BotResponse) {
        self.timestamp = timestamp
        self.userMessage = userMessage
        self.botResponse = botResponse
    }
}

public struct UserMessage: Codable {
    public let type: MessageType
    public let content: MessageContent
    public let metadata: MessageMetadata
    
    public enum MessageType: String, Codable {
        case text
        case voice
        case image
        case file
    }
    
    public enum MessageContent: Codable {
        case text(String)
        case voice(Data)
        case image(Data)
        case file(Data)
        
        enum CodingKeys: String, CodingKey {
            case type, data
        }
        
        public init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            let type = try container.decode(String.self, forKey: .type)
            
            switch type {
            case "text":
                let text = try container.decode(String.self, forKey: .data)
                self = .text(text)
            case "voice":
                let data = try container.decode(Data.self, forKey: .data)
                self = .voice(data)
            case "image":
                let data = try container.decode(Data.self, forKey: .data)
                self = .image(data)
            case "file":
                let data = try container.decode(Data.self, forKey: .data)
                self = .file(data)
            default:
                throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown content type")
            }
        }
        
        public func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            
            switch self {
            case .text(let text):
                try container.encode("text", forKey: .type)
                try container.encode(text, forKey: .data)
            case .voice(let data):
                try container.encode("voice", forKey: .type)
                try container.encode(data, forKey: .data)
            case .image(let data):
                try container.encode("image", forKey: .type)
                try container.encode(data, forKey: .data)
            case .file(let data):
                try container.encode("file", forKey: .type)
                try container.encode(data, forKey: .data)
            }
        }
    }
    
    public init(type: MessageType, content: MessageContent, metadata: MessageMetadata) {
        self.type = type
        self.content = content
        self.metadata = metadata
    }
}

public struct MessageMetadata: Codable {
    public let timestamp: Date
    public let platform: String
    public let deviceInfo: DeviceInfo?
    public let location: LocationInfo?
    public let originalAudio: Bool?
    public let confidence: Float?
    
    public init(
        timestamp: Date,
        platform: String,
        deviceInfo: DeviceInfo? = nil,
        location: LocationInfo? = nil,
        originalAudio: Bool? = nil,
        confidence: Float? = nil
    ) {
        self.timestamp = timestamp
        self.platform = platform
        self.deviceInfo = deviceInfo
        self.location = location
        self.originalAudio = originalAudio
        self.confidence = confidence
    }
}

public struct BotResponse: Codable {
    public let type: ResponseType
    public let content: ResponseContent
    public let suggestions: [String]
    public let requiresInput: Bool
    public let conversationState: ConversationState
    public let smartHomeActions: [SmartHomeAction]
    public let metadata: BotResponseMetadata
    
    public enum ResponseType: String, Codable {
        case text
        case voice
        case image
        case card
        case action
    }
    
    public enum ResponseContent: Codable {
        case text(String)
        case voice(Data)
        case image(Data)
        case card(CardData)
        case action(ActionData)
        
        enum CodingKeys: String, CodingKey {
            case type, data
        }
        
        public init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            let type = try container.decode(String.self, forKey: .type)
            
            switch type {
            case "text":
                let text = try container.decode(String.self, forKey: .data)
                self = .text(text)
            case "voice":
                let data = try container.decode(Data.self, forKey: .data)
                self = .voice(data)
            case "image":
                let data = try container.decode(Data.self, forKey: .data)
                self = .image(data)
            case "card":
                let card = try container.decode(CardData.self, forKey: .data)
                self = .card(card)
            case "action":
                let action = try container.decode(ActionData.self, forKey: .data)
                self = .action(action)
            default:
                throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown response type")
            }
        }
        
        public func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            
            switch self {
            case .text(let text):
                try container.encode("text", forKey: .type)
                try container.encode(text, forKey: .data)
            case .voice(let data):
                try container.encode("voice", forKey: .type)
                try container.encode(data, forKey: .data)
            case .image(let data):
                try container.encode("image", forKey: .type)
                try container.encode(data, forKey: .data)
            case .card(let card):
                try container.encode("card", forKey: .type)
                try container.encode(card, forKey: .data)
            case .action(let action):
                try container.encode("action", forKey: .type)
                try container.encode(action, forKey: .data)
            }
        }
    }
    
    public init(
        type: ResponseType,
        content: ResponseContent,
        suggestions: [String],
        requiresInput: Bool,
        conversationState: ConversationState,
        smartHomeActions: [SmartHomeAction],
        metadata: BotResponseMetadata
    ) {
        self.type = type
        self.content = content
        self.suggestions = suggestions
        self.requiresInput = requiresInput
        self.conversationState = conversationState
        self.smartHomeActions = smartHomeActions
        self.metadata = metadata
    }
}

public struct BotResponseMetadata: Codable {
    public let responseTime: Int
    public let confidence: Float
    public let agentsUsed: [String]
    public let isOffline: Bool?
    
    public init(responseTime: Int, confidence: Float, agentsUsed: [String], isOffline: Bool? = nil) {
        self.responseTime = responseTime
        self.confidence = confidence
        self.agentsUsed = agentsUsed
        self.isOffline = isOffline
    }
}

public struct ResponseChunk: Codable {
    public let type: String
    public let content: String
    public let isComplete: Bool
    public let metadata: ChunkMetadata
    
    public init(type: String, content: String, isComplete: Bool, metadata: ChunkMetadata) {
        self.type = type
        self.content = content
        self.isComplete = isComplete
        self.metadata = metadata
    }
}

public struct ChunkMetadata: Codable {
    public let chunkIndex: Int
    public let totalChunks: Int
    
    public init(chunkIndex: Int, totalChunks: Int) {
        self.chunkIndex = chunkIndex
        self.totalChunks = totalChunks
    }
}

public struct VoiceResponse: Codable {
    public let transcription: String
    public let textResponse: String
    public let audioResponse: Data?
    public let conversationState: ConversationState
    public let metadata: VoiceResponseMetadata
    
    public init(
        transcription: String,
        textResponse: String,
        audioResponse: Data?,
        conversationState: ConversationState,
        metadata: VoiceResponseMetadata
    ) {
        self.transcription = transcription
        self.textResponse = textResponse
        self.audioResponse = audioResponse
        self.conversationState = conversationState
        self.metadata = metadata
    }
}

public struct VoiceResponseMetadata: Codable {
    public let transcriptionConfidence: Float
    public let responseTime: Int
    
    public init(transcriptionConfidence: Float, responseTime: Int) {
        self.transcriptionConfidence = transcriptionConfidence
        self.responseTime = responseTime
    }
}

// MARK: - Story Models

public struct Story: Codable {
    public let id: String
    public let title: String
    public let content: StoryContent
    public let status: StoryStatus
    public let ageRating: Int
    public let createdAt: Date
    public let finalizedAt: Date?
    
    public enum StoryStatus: String, Codable {
        case draft
        case final
    }
    
    public init(
        id: String,
        title: String,
        content: StoryContent,
        status: StoryStatus,
        ageRating: Int,
        createdAt: Date,
        finalizedAt: Date? = nil
    ) {
        self.id = id
        self.title = title
        self.content = content
        self.status = status
        self.ageRating = ageRating
        self.createdAt = createdAt
        self.finalizedAt = finalizedAt
    }
}

public struct StoryContent: Codable {
    public let text: String
    public let chapters: [StoryChapter]
    
    public init(text: String, chapters: [StoryChapter]) {
        self.text = text
        self.chapters = chapters
    }
}

public struct StoryChapter: Codable {
    public let title: String
    public let content: String
    public let imageUrl: String?
    
    public init(title: String, content: String, imageUrl: String? = nil) {
        self.title = title
        self.content = content
        self.imageUrl = imageUrl
    }
}

public struct Character: Codable {
    public let id: String
    public let name: String
    public let traits: CharacterTraits
    public let appearanceUrl: String?
    
    public init(id: String, name: String, traits: CharacterTraits, appearanceUrl: String? = nil) {
        self.id = id
        self.name = name
        self.traits = traits
        self.appearanceUrl = appearanceUrl
    }
}

public struct CharacterTraits: Codable {
    public let age: Int?
    public let species: String
    public let gender: String?
    public let ethnicity: String?
    public let appearance: [String: String]
    public let personality: [String]
    public let inclusivityTraits: [String]
    
    public init(
        age: Int? = nil,
        species: String,
        gender: String? = nil,
        ethnicity: String? = nil,
        appearance: [String: String] = [:],
        personality: [String] = [],
        inclusivityTraits: [String] = []
    ) {
        self.age = age
        self.species = species
        self.gender = gender
        self.ethnicity = ethnicity
        self.appearance = appearance
        self.personality = personality
        self.inclusivityTraits = inclusivityTraits
    }
}

public struct StoryCreationRequest: Codable {
    public let character: Character
    public let storyType: String
    public let preferences: StoryPreferences?
    
    public init(character: Character, storyType: String, preferences: StoryPreferences? = nil) {
        self.character = character
        self.storyType = storyType
        self.preferences = preferences
    }
}

public struct StoryPreferences: Codable {
    public let length: String?
    public let themes: [String]
    public let avoidTopics: [String]
    
    public init(length: String? = nil, themes: [String] = [], avoidTopics: [String] = []) {
        self.length = length
        self.themes = themes
        self.avoidTopics = avoidTopics
    }
}

// MARK: - Configuration Models

public struct ParentalControls: Codable {
    public let enabled: Bool
    public let ageRestrictions: AgeRestrictions
    public let contentFiltering: ContentFiltering
    public let timeRestrictions: TimeRestrictions?
    
    public static let `default` = ParentalControls(
        enabled: true,
        ageRestrictions: AgeRestrictions.default,
        contentFiltering: ContentFiltering.safe,
        timeRestrictions: nil
    )
    
    public init(
        enabled: Bool,
        ageRestrictions: AgeRestrictions,
        contentFiltering: ContentFiltering,
        timeRestrictions: TimeRestrictions? = nil
    ) {
        self.enabled = enabled
        self.ageRestrictions = ageRestrictions
        self.contentFiltering = contentFiltering
        self.timeRestrictions = timeRestrictions
    }
}

public struct AgeRestrictions: Codable {
    public let minimumAge: Int
    public let maximumAge: Int
    public let requireParentalConsent: Bool
    
    public static let `default` = AgeRestrictions(minimumAge: 3, maximumAge: 12, requireParentalConsent: true)
    
    public init(minimumAge: Int, maximumAge: Int, requireParentalConsent: Bool) {
        self.minimumAge = minimumAge
        self.maximumAge = maximumAge
        self.requireParentalConsent = requireParentalConsent
    }
}

public struct ContentFiltering: Codable {
    public let level: FilterLevel
    public let customFilters: [String]
    
    public enum FilterLevel: String, Codable {
        case strict
        case safe
        case moderate
    }
    
    public static let safe = ContentFiltering(level: .safe, customFilters: [])
    
    public init(level: FilterLevel, customFilters: [String] = []) {
        self.level = level
        self.customFilters = customFilters
    }
}

public struct TimeRestrictions: Codable {
    public let dailyLimit: Int // minutes
    public let allowedHours: [Int] // hours of day
    public let bedtimeMode: Bool
    
    public init(dailyLimit: Int, allowedHours: [Int], bedtimeMode: Bool) {
        self.dailyLimit = dailyLimit
        self.allowedHours = allowedHours
        self.bedtimeMode = bedtimeMode
    }
}

public struct PrivacySettings: Codable {
    public let dataRetention: String
    public let consentLevel: String
    public let analyticsEnabled: Bool
    public let locationTracking: Bool
    
    public static let childSafe = PrivacySettings(
        dataRetention: "minimal",
        consentLevel: "strict",
        analyticsEnabled: false,
        locationTracking: false
    )
    
    public init(dataRetention: String, consentLevel: String, analyticsEnabled: Bool, locationTracking: Bool) {
        self.dataRetention = dataRetention
        self.consentLevel = consentLevel
        self.analyticsEnabled = analyticsEnabled
        self.locationTracking = locationTracking
    }
}

public struct Theme: Codable {
    public let primaryColor: String
    public let secondaryColor: String
    public let fontFamily: String
    public let darkMode: Bool
    
    public init(primaryColor: String, secondaryColor: String, fontFamily: String, darkMode: Bool) {
        self.primaryColor = primaryColor
        self.secondaryColor = secondaryColor
        self.fontFamily = fontFamily
        self.darkMode = darkMode
    }
}

public struct Branding: Codable {
    public let logoUrl: String?
    public let companyName: String?
    public let customColors: [String: String]
    
    public init(logoUrl: String? = nil, companyName: String? = nil, customColors: [String: String] = [:]) {
        self.logoUrl = logoUrl
        self.companyName = companyName
        self.customColors = customColors
    }
}

public struct FeatureFlags: Codable {
    public let voiceEnabled: Bool
    public let smartHomeEnabled: Bool
    public let offlineMode: Bool
    public let pushNotifications: Bool
    
    public init(voiceEnabled: Bool, smartHomeEnabled: Bool, offlineMode: Bool, pushNotifications: Bool) {
        self.voiceEnabled = voiceEnabled
        self.smartHomeEnabled = smartHomeEnabled
        self.offlineMode = offlineMode
        self.pushNotifications = pushNotifications
    }
}

// MARK: - Platform Models

public struct PlatformCapabilities: Codable {
    public let supportsText: Bool
    public let supportsVoice: Bool
    public let supportsImages: Bool
    public let supportsFiles: Bool
    public let supportsRealtime: Bool
    public let supportsSmartHome: Bool
    public let maxResponseTime: Int
    public let maxContentLength: Int
    
    public init(
        supportsText: Bool,
        supportsVoice: Bool,
        supportsImages: Bool,
        supportsFiles: Bool,
        supportsRealtime: Bool,
        supportsSmartHome: Bool,
        maxResponseTime: Int,
        maxContentLength: Int
    ) {
        self.supportsText = supportsText
        self.supportsVoice = supportsVoice
        self.supportsImages = supportsImages
        self.supportsFiles = supportsFiles
        self.supportsRealtime = supportsRealtime
        self.supportsSmartHome = supportsSmartHome
        self.maxResponseTime = maxResponseTime
        self.maxContentLength = maxContentLength
    }
}

public struct DeviceInfo: Codable {
    public let type: String
    public let os: String
    public let version: String
    public let model: String?
    
    public static var current: DeviceInfo {
        return DeviceInfo(
            type: "mobile",
            os: "iOS",
            version: UIDevice.current.systemVersion,
            model: UIDevice.current.model
        )
    }
    
    public init(type: String, os: String, version: String, model: String? = nil) {
        self.type = type
        self.os = os
        self.version = version
        self.model = model
    }
}

public struct LocationInfo: Codable {
    public let country: String
    public let timezone: String
    
    public init(country: String, timezone: String) {
        self.country = country
        self.timezone = timezone
    }
}

// MARK: - Smart Home Models

public struct SmartDeviceConfig: Codable {
    public let deviceType: String
    public let userId: String
    public let roomId: String
    public let deviceName: String?
    public let capabilities: [String]
    
    public init(deviceType: String, userId: String, roomId: String, deviceName: String? = nil, capabilities: [String] = []) {
        self.deviceType = deviceType
        self.userId = userId
        self.roomId = roomId
        self.deviceName = deviceName
        self.capabilities = capabilities
    }
}

public struct DeviceConnection: Codable {
    public let deviceId: String
    public let status: String
    public let connectedAt: Date
    
    public init(deviceId: String, status: String, connectedAt: Date) {
        self.deviceId = deviceId
        self.status = status
        self.connectedAt = connectedAt
    }
}

public struct SmartHomeAction: Codable {
    public let type: String
    public let deviceId: String
    public let action: ActionParameters
    
    public init(type: String, deviceId: String, action: ActionParameters) {
        self.type = type
        self.deviceId = deviceId
        self.action = action
    }
}

public struct ActionParameters: Codable {
    public let command: String
    public let parameters: [String: String]
    
    public init(command: String, parameters: [String: String] = [:]) {
        self.command = command
        self.parameters = parameters
    }
}

// MARK: - UI Models

public struct CardData: Codable {
    public let title: String
    public let content: String
    public let imageUrl: String?
    public let actions: [CardAction]
    
    public init(title: String, content: String, imageUrl: String? = nil, actions: [CardAction] = []) {
        self.title = title
        self.content = content
        self.imageUrl = imageUrl
        self.actions = actions
    }
}

public struct CardAction: Codable {
    public let label: String
    public let action: String
    public let payload: [String: String]?
    
    public init(label: String, action: String, payload: [String: String]? = nil) {
        self.label = label
        self.action = action
        self.payload = payload
    }
}

public struct ActionData: Codable {
    public let type: String
    public let payload: [String: String]
    
    public init(type: String, payload: [String: String]) {
        self.type = type
        self.payload = payload
    }
}

// MARK: - Audio Models

public struct AudioInput: Codable {
    public let format: String
    public let data: Data
    public let sampleRate: Int
    
    public init(format: String, data: Data, sampleRate: Int) {
        self.format = format
        self.data = data
        self.sampleRate = sampleRate
    }
}