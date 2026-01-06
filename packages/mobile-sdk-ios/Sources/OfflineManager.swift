import Foundation
import CoreData

@available(iOS 14.0, *)
internal protocol OfflineManagerDelegate: AnyObject {
    func offlineManager(_ manager: OfflineManager, didSyncStories stories: [Story])
    func offlineManager(_ manager: OfflineManager, didFailToSync error: Error)
}

@available(iOS 14.0, *)
internal class OfflineManager {
    
    weak var delegate: OfflineManagerDelegate?
    
    let isEnabled: Bool
    private let persistentContainer: NSPersistentContainer
    private let syncQueue = DispatchQueue(label: "com.storyteller.offline.sync", qos: .background)
    
    init(enabled: Bool) {
        self.isEnabled = enabled
        
        // Initialize Core Data stack
        self.persistentContainer = NSPersistentContainer(name: "StorytellerOffline")
        
        if enabled {
            setupCoreDataStack()
        }
    }
    
    func initialize() async throws {
        guard isEnabled else { return }
        
        try await loadPersistentStore()
        
        // Start monitoring network connectivity
        NetworkMonitor.shared.startMonitoring { [weak self] isConnected in
            if isConnected {
                Task {
                    try? await self?.syncPendingData()
                }
            }
        }
    }
    
    private func setupCoreDataStack() {
        // Configure Core Data model programmatically
        let model = NSManagedObjectModel()
        
        // Story entity
        let storyEntity = NSEntityDescription()
        storyEntity.name = "OfflineStory"
        storyEntity.managedObjectClassName = "OfflineStory"
        
        let storyIdAttribute = NSAttributeDescription()
        storyIdAttribute.name = "id"
        storyIdAttribute.attributeType = .stringAttributeType
        storyIdAttribute.isOptional = false
        
        let titleAttribute = NSAttributeDescription()
        titleAttribute.name = "title"
        titleAttribute.attributeType = .stringAttributeType
        titleAttribute.isOptional = false
        
        let contentAttribute = NSAttributeDescription()
        contentAttribute.name = "content"
        contentAttribute.attributeType = .binaryDataAttributeType
        contentAttribute.isOptional = false
        
        let createdAtAttribute = NSAttributeDescription()
        createdAtAttribute.name = "createdAt"
        createdAtAttribute.attributeType = .dateAttributeType
        createdAtAttribute.isOptional = false
        
        let syncStatusAttribute = NSAttributeDescription()
        syncStatusAttribute.name = "syncStatus"
        syncStatusAttribute.attributeType = .stringAttributeType
        syncStatusAttribute.isOptional = false
        
        storyEntity.properties = [storyIdAttribute, titleAttribute, contentAttribute, createdAtAttribute, syncStatusAttribute]
        
        // Conversation entity
        let conversationEntity = NSEntityDescription()
        conversationEntity.name = "OfflineConversation"
        conversationEntity.managedObjectClassName = "OfflineConversation"
        
        let sessionIdAttribute = NSAttributeDescription()
        sessionIdAttribute.name = "sessionId"
        sessionIdAttribute.attributeType = .stringAttributeType
        sessionIdAttribute.isOptional = false
        
        let messagesAttribute = NSAttributeDescription()
        messagesAttribute.name = "messages"
        messagesAttribute.attributeType = .binaryDataAttributeType
        messagesAttribute.isOptional = false
        
        let lastUpdatedAttribute = NSAttributeDescription()
        lastUpdatedAttribute.name = "lastUpdated"
        lastUpdatedAttribute.attributeType = .dateAttributeType
        lastUpdatedAttribute.isOptional = false
        
        conversationEntity.properties = [sessionIdAttribute, messagesAttribute, lastUpdatedAttribute]
        
        model.entities = [storyEntity, conversationEntity]
        persistentContainer.managedObjectModel = model
    }
    
    private func loadPersistentStore() async throws {
        return try await withCheckedThrowingContinuation { continuation in
            persistentContainer.loadPersistentStores { _, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
    
    func processMessage(_ message: UserMessage, session: ConversationSession) async throws -> BotResponse {
        guard isEnabled else {
            throw OfflineError.offlineNotEnabled
        }
        
        // Save message locally
        try await saveMessageLocally(message, sessionId: session.sessionId)
        
        // Generate offline response using local AI or cached responses
        let response = try await generateOfflineResponse(for: message, session: session)
        
        // Mark for sync when online
        try await markForSync(sessionId: session.sessionId)
        
        return response
    }
    
    private func saveMessageLocally(_ message: UserMessage, sessionId: String) async throws {
        let context = persistentContainer.newBackgroundContext()
        
        try await context.perform {
            // Find or create conversation
            let request: NSFetchRequest<OfflineConversation> = OfflineConversation.fetchRequest()
            request.predicate = NSPredicate(format: "sessionId == %@", sessionId)
            
            let conversation: OfflineConversation
            if let existing = try context.fetch(request).first {
                conversation = existing
            } else {
                conversation = OfflineConversation(context: context)
                conversation.sessionId = sessionId
                conversation.messages = Data()
            }
            
            // Add message to conversation
            var messages = try self.decodeMessages(from: conversation.messages ?? Data())
            messages.append(message)
            conversation.messages = try self.encodeMessages(messages)
            conversation.lastUpdated = Date()
            
            try context.save()
        }
    }
    
    private func generateOfflineResponse(for message: UserMessage, session: ConversationSession) async throws -> BotResponse {
        // Simple offline response generation
        // In a real implementation, this could use local AI models or cached responses
        
        let responseText: String
        
        switch message.content {
        case .text(let text):
            if text.lowercased().contains("story") {
                responseText = "I'd love to help you create a story! Since we're offline right now, I'll save your request and we can continue when we're back online."
            } else if text.lowercased().contains("character") {
                responseText = "Let's create an amazing character! I'll remember everything you tell me and we can bring them to life when we reconnect."
            } else {
                responseText = "I hear you! I'm saving everything we talk about so we can continue our conversation when we're back online."
            }
        default:
            responseText = "I've saved your message and we'll continue when we're back online!"
        }
        
        return BotResponse(
            type: .text,
            content: .text(responseText),
            suggestions: ["Tell me more", "Create character", "Start story"],
            requiresInput: true,
            conversationState: session.state,
            smartHomeActions: [],
            metadata: BotResponseMetadata(
                responseTime: 100, // Fast offline response
                confidence: 0.8,
                agentsUsed: ["offline_agent"],
                isOffline: true
            )
        )
    }
    
    func saveStory(_ story: Story) async throws {
        guard isEnabled else { return }
        
        let context = persistentContainer.newBackgroundContext()
        
        try await context.perform {
            let offlineStory = OfflineStory(context: context)
            offlineStory.id = story.id
            offlineStory.title = story.title
            offlineStory.content = try JSONEncoder().encode(story)
            offlineStory.createdAt = Date()
            offlineStory.syncStatus = "pending"
            
            try context.save()
        }
    }
    
    func syncWithServer(apiClient: APIClient) async throws {
        guard isEnabled else { return }
        
        try await syncPendingStories(apiClient: apiClient)
        try await syncPendingConversations(apiClient: apiClient)
    }
    
    private func syncPendingStories(apiClient: APIClient) async throws {
        let context = persistentContainer.newBackgroundContext()
        
        let stories = try await context.perform {
            let request: NSFetchRequest<OfflineStory> = OfflineStory.fetchRequest()
            request.predicate = NSPredicate(format: "syncStatus == %@", "pending")
            return try context.fetch(request)
        }
        
        var syncedStories: [Story] = []
        
        for offlineStory in stories {
            do {
                let story = try JSONDecoder().decode(Story.self, from: offlineStory.content!)
                
                // Sync with server (implementation depends on API)
                // let syncedStory = try await apiClient.syncStory(story)
                
                // Mark as synced
                try await context.perform {
                    offlineStory.syncStatus = "synced"
                    try context.save()
                }
                
                syncedStories.append(story)
            } catch {
                // Mark as failed
                try await context.perform {
                    offlineStory.syncStatus = "failed"
                    try context.save()
                }
            }
        }
        
        if !syncedStories.isEmpty {
            delegate?.offlineManager(self, didSyncStories: syncedStories)
        }
    }
    
    private func syncPendingConversations(apiClient: APIClient) async throws {
        let context = persistentContainer.newBackgroundContext()
        
        let conversations = try await context.perform {
            let request: NSFetchRequest<OfflineConversation> = OfflineConversation.fetchRequest()
            return try context.fetch(request)
        }
        
        for conversation in conversations {
            do {
                let messages = try decodeMessages(from: conversation.messages!)
                
                // Sync messages with server
                for message in messages {
                    // try await apiClient.syncMessage(sessionId: conversation.sessionId!, message: message)
                }
                
                // Remove synced conversation
                try await context.perform {
                    context.delete(conversation)
                    try context.save()
                }
            } catch {
                delegate?.offlineManager(self, didFailToSync: error)
            }
        }
    }
    
    private func syncPendingData() async throws {
        // This would be called when network connectivity is restored
        // Implementation would sync all pending data
    }
    
    private func markForSync(sessionId: String) async throws {
        // Mark conversation for sync when online
        let context = persistentContainer.newBackgroundContext()
        
        try await context.perform {
            let request: NSFetchRequest<OfflineConversation> = OfflineConversation.fetchRequest()
            request.predicate = NSPredicate(format: "sessionId == %@", sessionId)
            
            if let conversation = try context.fetch(request).first {
                conversation.lastUpdated = Date()
                try context.save()
            }
        }
    }
    
    private func encodeMessages(_ messages: [UserMessage]) throws -> Data {
        return try JSONEncoder().encode(messages)
    }
    
    private func decodeMessages(from data: Data) throws -> [UserMessage] {
        return try JSONDecoder().decode([UserMessage].self, from: data)
    }
}

// MARK: - Core Data Models

@objc(OfflineStory)
class OfflineStory: NSManagedObject {
    @NSManaged var id: String
    @NSManaged var title: String
    @NSManaged var content: Data?
    @NSManaged var createdAt: Date
    @NSManaged var syncStatus: String
}

extension OfflineStory {
    @nonobjc class func fetchRequest() -> NSFetchRequest<OfflineStory> {
        return NSFetchRequest<OfflineStory>(entityName: "OfflineStory")
    }
}

@objc(OfflineConversation)
class OfflineConversation: NSManagedObject {
    @NSManaged var sessionId: String?
    @NSManaged var messages: Data?
    @NSManaged var lastUpdated: Date
}

extension OfflineConversation {
    @nonobjc class func fetchRequest() -> NSFetchRequest<OfflineConversation> {
        return NSFetchRequest<OfflineConversation>(entityName: "OfflineConversation")
    }
}

// MARK: - Network Monitor

class NetworkMonitor {
    static let shared = NetworkMonitor()
    
    private var isMonitoring = false
    private var connectivityCallback: ((Bool) -> Void)?
    
    var isConnected: Bool {
        // Simple connectivity check - in real implementation would use Network framework
        return true
    }
    
    func startMonitoring(callback: @escaping (Bool) -> Void) {
        guard !isMonitoring else { return }
        
        self.connectivityCallback = callback
        isMonitoring = true
        
        // Start monitoring network changes
        // Implementation would use Network framework
    }
    
    func stopMonitoring() {
        isMonitoring = false
        connectivityCallback = nil
    }
}

// MARK: - Error Types

enum OfflineError: Error, LocalizedError {
    case offlineNotEnabled
    case failedToSaveLocally
    case failedToSync
    case corruptedData
    
    var errorDescription: String? {
        switch self {
        case .offlineNotEnabled:
            return "Offline mode is not enabled"
        case .failedToSaveLocally:
            return "Failed to save data locally"
        case .failedToSync:
            return "Failed to sync with server"
        case .corruptedData:
            return "Local data is corrupted"
        }
    }
}