import Foundation

/// One streamed tutor reply to the student's latest message.
///
/// This is a chat turn, so the Guardrails block applies. The one-shot JSON
/// calls (lessons, recall) do not use it.
protocol TutorChatting: Sendable {
    /// - Parameters:
    ///   - history: the conversation so far, ending with the student's newest message.
    ///   - lessonContext: the lesson text the student is studying. Empty when there is none.
    ///   - mode: how fast and how deep to teach right now.
    func reply(
        history: [AnthropicMessage],
        lessonContext: String,
        mode: InteractionMode
    ) -> AsyncThrowingStream<String, Error>
}
