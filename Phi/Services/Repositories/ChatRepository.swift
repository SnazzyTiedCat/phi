import Foundation
import Supabase

/// Insert payload for one `ios.chat_messages` row. No id or created_at: the
/// server sets both.
struct NewChatMessage: Encodable, Sendable {
    let userID: UUID
    let lessonID: UUID
    let role: ChatMessage.Role
    let content: String

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case lessonID = "lesson_id"
        case role
        case content
    }
}

/// Reads and writes `ios.chat_messages`. Each method scopes its query to the
/// owner's `userID`. RLS enforces the same rule on the server.
struct ChatRepository {
    /// The lesson's chat history, oldest first.
    func fetchMessages(lessonID: UUID, userID: UUID) async throws -> [ChatMessage] {
        let rows: [ChatMessage] = try await supabase.schema("ios")
            .from("chat_messages")
            .select()
            .eq("lesson_id", value: lessonID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .order("created_at", ascending: true)
            .execute()
            .value
        return rows
    }

    /// Appends one message and returns the stored row.
    func append(_ new: NewChatMessage) async throws -> ChatMessage {
        let row: ChatMessage = try await supabase.schema("ios")
            .from("chat_messages")
            .insert(new)
            .select()
            .single()
            .execute()
            .value
        return row
    }
}
