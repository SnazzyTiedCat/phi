import Foundation

/// One row of `ios.chat_messages`: a message in a lesson's pause-mid-lesson chat.
/// Keyed off `lessonID`, so the history survives a lesson regenerate.
struct ChatMessage: Identifiable, Hashable, Codable {
    /// Raw values match the table's check constraint: role in ('user', 'assistant').
    enum Role: String, Codable {
        case user = "user"
        case assistant = "assistant"
    }

    let id: UUID
    let lessonID: UUID
    let userID: UUID
    let role: Role
    let content: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case lessonID = "lesson_id"
        case userID = "user_id"
        case role
        case content
        case createdAt = "created_at"
    }
}
