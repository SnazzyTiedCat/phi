import Foundation
import Observation

/// One lesson's pause-mid-lesson chat. Each message is saved before it is shown,
/// so `messages` matches the saved history in order, and the tutor only sees
/// messages that were saved.
@MainActor
@Observable
final class TutorChatStore {
    private(set) var messages: [ChatMessage] = []
    /// The reply as it streams in. Empty when no reply is in progress.
    private(set) var streamingText = ""
    private(set) var isReplying = false
    var errorMessage: String?

    private let section: LessonSection
    private let userID: UUID
    private let tutor: TutorChatting
    private let repository: ChatRepository

    init(
        section: LessonSection,
        userID: UUID,
        tutor: TutorChatting = AnthropicTutor(),
        repository: ChatRepository = ChatRepository()
    ) {
        self.section = section
        self.userID = userID
        self.tutor = tutor
        self.repository = repository
    }

    /// Loads the lesson's saved chat, oldest first.
    func load() async {
        errorMessage = nil
        do {
            messages = try await repository.fetchMessages(lessonID: section.id, userID: userID)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't load this chat. Try again.")
        }
    }

    /// Saves the student's message, streams the tutor's reply, then saves the reply.
    /// Blank text is ignored. So is a send made while a reply is in progress, since
    /// two overlapping sends would scramble the saved order.
    func send(_ text: String, mode: InteractionMode = .lessonTeaching) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isReplying else { return }

        isReplying = true
        defer { isReplying = false }
        errorMessage = nil

        // 1. Save the student's message. The history sent below is built only from saved rows.
        do {
            let saved = try await repository.append(NewChatMessage(
                userID: userID,
                lessonID: section.id,
                role: .user,
                content: trimmed
            ))
            messages.append(saved)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't send your message. Try again.")
            return
        }

        // 2. Stream the reply. A stream that fails or is cancelled is dropped, not saved.
        let history = messages.map { AnthropicMessage(role: $0.role.rawValue, content: $0.content) }
        let stream = tutor.reply(history: history, lessonContext: section.content, mode: mode)
        streamingText = ""
        do {
            for try await chunk in stream {
                streamingText += chunk
            }
        } catch is CancellationError {
            streamingText = ""
            return
        } catch {
            streamingText = ""
            errorMessage = Self.message(for: error, fallback: "Phi couldn't get a reply from the tutor. Try again.")
            return
        }

        // 3. Save the full reply. An empty reply is not saved.
        let reply = streamingText
        streamingText = ""
        guard !reply.isEmpty else {
            errorMessage = AnthropicError.emptyResponse.errorDescription
            return
        }
        do {
            let saved = try await repository.append(NewChatMessage(
                userID: userID,
                lessonID: section.id,
                role: .assistant,
                content: reply
            ))
            messages.append(saved)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't save the tutor's reply. Send your message again.")
        }
    }

    private static func message(for error: Error, fallback: String) -> String {
        (error as? LocalizedError)?.errorDescription ?? fallback
    }
}
