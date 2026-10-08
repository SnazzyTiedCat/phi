import Foundation

/// Streams a tutor reply through the Messages API. `PromptComposer` builds the
/// system prompt, so the Guardrails block is included.
struct AnthropicTutor: TutorChatting {
    private let client: AnthropicClient
    private let persona: TutorPersona

    init(client: AnthropicClient = AnthropicConfiguration.makeClient(), persona: TutorPersona = TutorPersona.generalist) {
        self.client = client
        self.persona = persona
    }

    func reply(history: [AnthropicMessage], lessonContext: String, mode: InteractionMode) -> AsyncThrowingStream<String, Error> {
        let trimmed = lessonContext.trimmingCharacters(in: .whitespacesAndNewlines)
        let context: String? = trimmed.isEmpty ? nil : LessonPrompts.fence(trimmed, tag: "lesson")
        let system = PromptComposer.build(for: persona, mode: mode, context: context)
        return client.stream(system: system, messages: history, model: .sonnet, maxTokens: 1500)
    }
}
