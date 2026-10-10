import Foundation

/// Generates a lesson with one non-streaming Messages call. If the reply does
/// not parse, it asks once more and shows the model its bad reply.
struct AnthropicLessonGenerator: LessonGenerating {
    private let client: AnthropicClient
    // VERIFY: TutorPersona is Sendable by implicit inference (internal struct, Sendable fields).
    private let persona: TutorPersona

    init(client: AnthropicClient = AnthropicConfiguration.makeClient(), persona: TutorPersona = TutorPersona.generalist) {
        self.client = client
        self.persona = persona
    }

    func generateLesson(title: String, text: String) async throws -> LessonDraft {
        let system = LessonPrompts.system(for: persona)
        let first = AnthropicMessage(role: "user", content: LessonPrompts.userMessage(title: title, text: text))

        let firstReply = try await client.complete(
            system: system,
            messages: [first],
            model: .sonnet,
            maxTokens: 16000
        )
        if let draft = try? LessonParser.parse(firstReply) {
            return draft
        }

        // One retry. If this reply does not parse either, its error is the one shown.
        let retry = [
            first,
            AnthropicMessage(role: "assistant", content: firstReply),
            AnthropicMessage(role: "user", content: "Your reply was not valid JSON for the required shape. Return only the JSON object.")
        ]
        let secondReply = try await client.complete(
            system: system,
            messages: retry,
            model: .sonnet,
            maxTokens: 16000
        )
        return try LessonParser.parse(secondReply)
    }
}
