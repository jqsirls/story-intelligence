import Foundation
import UserNotifications

@available(iOS 14.0, *)
internal protocol NotificationManagerDelegate: AnyObject {
    func notificationManager(_ manager: NotificationManager, didReceiveStoryCompletion story: Story)
    func notificationManager(_ manager: NotificationManager, didReceiveReminder reminder: Reminder)
}

@available(iOS 14.0, *)
internal class NotificationManager: NSObject {
    
    weak var delegate: NotificationManagerDelegate?
    
    let isEnabled: Bool
    private let notificationCenter = UNUserNotificationCenter.current()
    
    init(enabled: Bool) {
        self.isEnabled = enabled
        super.init()
        
        if enabled {
            notificationCenter.delegate = self
        }
    }
    
    func initialize() async throws {
        guard isEnabled else { return }
        
        try await requestPermission()
        setupNotificationCategories()
    }
    
    func requestPermission() async throws {
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        
        let granted = try await notificationCenter.requestAuthorization(options: options)
        
        guard granted else {
            throw NotificationError.permissionDenied
        }
    }
    
    func getDeviceToken() async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
                
                // In a real implementation, this would be handled in AppDelegate
                // For now, return a mock token
                continuation.resume(returning: "mock_device_token_\(UUID().uuidString)")
            }
        }
    }
    
    private func setupNotificationCategories() {
        // Story completion category
        let storyCompleteAction = UNNotificationAction(
            identifier: "VIEW_STORY",
            title: "View Story",
            options: [.foreground]
        )
        
        let storyShareAction = UNNotificationAction(
            identifier: "SHARE_STORY",
            title: "Share",
            options: []
        )
        
        let storyCategory = UNNotificationCategory(
            identifier: "STORY_COMPLETION",
            actions: [storyCompleteAction, storyShareAction],
            intentIdentifiers: [],
            options: []
        )
        
        // Reminder category
        let startStoryAction = UNNotificationAction(
            identifier: "START_STORY",
            title: "Create Story",
            options: [.foreground]
        )
        
        let remindLaterAction = UNNotificationAction(
            identifier: "REMIND_LATER",
            title: "Remind Later",
            options: []
        )
        
        let reminderCategory = UNNotificationCategory(
            identifier: "STORY_REMINDER",
            actions: [startStoryAction, remindLaterAction],
            intentIdentifiers: [],
            options: []
        )
        
        notificationCenter.setNotificationCategories([storyCategory, reminderCategory])
    }
    
    func scheduleStoryCompletionNotification(for story: Story) async throws {
        guard isEnabled else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "Your Story is Ready! 📚"
        content.body = "'\(story.title)' has been created with beautiful illustrations and audio!"
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = "STORY_COMPLETION"
        content.userInfo = [
            "type": "story_completion",
            "storyId": story.id,
            "storyTitle": story.title
        ]
        
        // Schedule for immediate delivery
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "story_\(story.id)",
            content: content,
            trigger: trigger
        )
        
        try await notificationCenter.add(request)
    }
    
    func scheduleStorytellingReminder(at date: Date, message: String? = nil) async throws {
        guard isEnabled else { return }
        
        let content = UNMutableNotificationContent()
        content.title = "Time for a Story! ✨"
        content.body = message ?? "Ready to create another magical adventure?"
        content.sound = .default
        content.categoryIdentifier = "STORY_REMINDER"
        content.userInfo = [
            "type": "story_reminder"
        ]
        
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        let request = UNNotificationRequest(
            identifier: "reminder_\(date.timeIntervalSince1970)",
            content: content,
            trigger: trigger
        )
        
        try await notificationCenter.add(request)
    }
    
    func scheduleRecurringReminder(
        weekdays: [Int],
        hour: Int,
        minute: Int,
        message: String? = nil
    ) async throws {
        guard isEnabled else { return }
        
        for weekday in weekdays {
            let content = UNMutableNotificationContent()
            content.title = "Story Time! 📖"
            content.body = message ?? "Let's create something wonderful together!"
            content.sound = .default
            content.categoryIdentifier = "STORY_REMINDER"
            content.userInfo = [
                "type": "recurring_reminder",
                "weekday": weekday
            ]
            
            var components = DateComponents()
            components.weekday = weekday
            components.hour = hour
            components.minute = minute
            
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            let request = UNNotificationRequest(
                identifier: "recurring_\(weekday)_\(hour)_\(minute)",
                content: content,
                trigger: trigger
            )
            
            try await notificationCenter.add(request)
        }
    }
    
    func cancelNotification(identifier: String) async {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
        notificationCenter.removeDeliveredNotifications(withIdentifiers: [identifier])
    }
    
    func cancelAllNotifications() async {
        notificationCenter.removeAllPendingNotificationRequests()
        notificationCenter.removeAllDeliveredNotifications()
    }
    
    func getPendingNotifications() async -> [UNNotificationRequest] {
        return await notificationCenter.pendingNotificationRequests()
    }
    
    func handleRemoteNotification(_ userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else { return }
        
        switch type {
        case "story_completion":
            handleStoryCompletionNotification(userInfo)
        case "story_reminder":
            handleReminderNotification(userInfo)
        default:
            break
        }
    }
    
    private func handleStoryCompletionNotification(_ userInfo: [AnyHashable: Any]) {
        guard let storyId = userInfo["storyId"] as? String,
              let storyTitle = userInfo["storyTitle"] as? String else { return }
        
        let story = Story(
            id: storyId,
            title: storyTitle,
            content: StoryContent(text: "", chapters: []),
            status: .final,
            ageRating: 0,
            createdAt: Date(),
            finalizedAt: Date()
        )
        
        delegate?.notificationManager(self, didReceiveStoryCompletion: story)
    }
    
    private func handleReminderNotification(_ userInfo: [AnyHashable: Any]) {
        let reminder = Reminder(
            id: UUID().uuidString,
            message: "Time to create a story!",
            scheduledAt: Date(),
            type: .storytelling
        )
        
        delegate?.notificationManager(self, didReceiveReminder: reminder)
    }
}

// MARK: - UNUserNotificationCenterDelegate

@available(iOS 14.0, *)
extension NotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        
        switch response.actionIdentifier {
        case "VIEW_STORY":
            handleStoryCompletionNotification(userInfo)
        case "SHARE_STORY":
            // Handle story sharing
            break
        case "START_STORY":
            handleReminderNotification(userInfo)
        case "REMIND_LATER":
            // Schedule another reminder for later
            Task {
                let laterDate = Date().addingTimeInterval(3600) // 1 hour later
                try? await scheduleStorytellingReminder(at: laterDate)
            }
        case UNNotificationDefaultActionIdentifier:
            // Handle tap on notification
            handleRemoteNotification(userInfo)
        default:
            break
        }
        
        completionHandler()
    }
}

// MARK: - Supporting Types

struct Reminder {
    let id: String
    let message: String
    let scheduledAt: Date
    let type: ReminderType
}

enum ReminderType {
    case storytelling
    case bedtime
    case creative
}

// MARK: - Error Types

enum NotificationError: Error, LocalizedError {
    case permissionDenied
    case failedToSchedule
    case invalidConfiguration
    
    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Notification permission denied"
        case .failedToSchedule:
            return "Failed to schedule notification"
        case .invalidConfiguration:
            return "Invalid notification configuration"
        }
    }
}