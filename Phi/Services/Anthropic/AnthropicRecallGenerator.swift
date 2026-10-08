import Foundation

/// Recall calls. Flashcards and quizzes use the faster model. Grading uses the
/// stronger one, because a wrong verdict costs the student the most.
///
/// A reply that does not decode throws `AnthropicError.malformedResponse`.
/// Nothing falls back to an empty list.
struct AnthropicRecallGenerator: RecallGenerating {
    private let client: AnthropicClient

    init(client: AnthropicClient = AnthropicConfiguration.makeClient()) {
        self.client = client
    }

    func flashcards(lessonContext: String) async throws -> [Flashcard] {
        let reply = try await complete(
            system: RecallPrompts.flashcards,
            lessonContext: lessonContext,
            model: .haiku,
            maxTokens: 3072
        )
        return try AnthropicRecallGenerator.decodeList(reply)
    }

    func quiz(lessonContext: String) async throws -> [QuizQuestion] {
        let reply = try await complete(
            system: RecallPrompts.quiz(),
            lessonContext: lessonContext,
            model: .haiku,
            maxTokens: 4096
        )
        let questions: [QuizQuestion] = try AnthropicRecallGenerator.decodeList(reply)
        guard questions.allSatisfy(AnthropicRecallGenerator.hasValidShape) else {
            throw AnthropicError.malformedResponse
        }
        return questions
    }

    func grade(question: String, sampleAnswer: String, studentAnswer: String) async throws -> ShortAnswerGrade {
        let message = RecallPrompts.gradingUserMessage(
            question: question,
            sampleAnswer: sampleAnswer,
            studentAnswer: studentAnswer
        )
        let reply = try await client.complete(
            system: RecallPrompts.grading,
            messages: [AnthropicMessage(role: "user", content: message)],
            model: .sonnet,
            maxTokens: 512
        )
        guard let grade: ShortAnswerGrade = Recall.decodeObject(reply) else {
            throw AnthropicError.malformedResponse
        }
        return grade
    }

    // MARK: - Helpers

    private func complete(system: String, lessonContext: String, model: AnthropicModel, maxTokens: Int) async throws -> String {
        let message = "The lesson the student just finished is below.\n\n" + LessonPrompts.fence(lessonContext, tag: "lesson")
        return try await client.complete(
            system: system,
            messages: [AnthropicMessage(role: "user", content: message)],
            model: model,
            maxTokens: maxTokens
        )
    }

    /// `Recall.decodeArray` keeps only the text from the first "[" to the last "]",
    /// so code fences and surrounding prose drop out. An empty array counts as a failure.
    private static func decodeList<T: Decodable>(_ reply: String) throws -> [T] {
        // VERIFY: generic inference through the annotated optional binding.
        guard let items: [T] = Recall.decodeArray(reply), !items.isEmpty else {
            throw AnthropicError.malformedResponse
        }
        return items
    }

    /// The UI reads `options[correct]` and the model answer directly, so a question
    /// with the wrong shape is rejected here instead of being cached.
    private static func hasValidShape(_ question: QuizQuestion) -> Bool {
        switch question.type {
        case .multipleChoice:
            guard let options = question.options, options.count == 4,
                  let correct = question.correct else {
                return false
            }
            return (0..<4).contains(correct)
        case .shortAnswer:
            return !(question.sampleAnswer ?? "").isEmpty
        }
    }
}
