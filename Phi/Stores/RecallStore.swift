import Foundation
import Observation

/// Flashcards, quizzes, and short-answer grading for a finished lesson.
///
/// Flashcards and quizzes are cached per lesson. An empty cache triggers one
/// generation, which is saved before it is returned. Grades are never cached.
@MainActor
@Observable
final class RecallStore {
    private(set) var isWorking = false
    var errorMessage: String?

    private let recall: RecallGenerating
    private let repository: RecallRepository
    /// Not read yet. Generation works from the section text the caller passes in.
    private let materials: MaterialStore

    init(
        recall: RecallGenerating = AnthropicRecallGenerator(),
        repository: RecallRepository = RecallRepository(),
        materials: MaterialStore
    ) {
        self.recall = recall
        self.repository = repository
        self.materials = materials
    }

    /// The lesson's flashcards. Generates and saves a set when none exist yet.
    func flashcards(for section: LessonSection, userID: UUID) async throws -> [Flashcard] {
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }
        do {
            let cached = try await repository.fetchFlashcards(lessonID: section.id, userID: userID)
            if !cached.isEmpty { return cached }

            let cards = try await recall.flashcards(lessonContext: section.content)
            try await repository.replaceFlashcards(lessonID: section.id, userID: userID, cards: cards)
            return cards
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't make flashcards for this lesson. Try again.")
            throw error
        }
    }

    /// The lesson's quiz. Generates and saves one when none exist yet.
    func quizQuestions(for section: LessonSection, userID: UUID) async throws -> [QuizQuestion] {
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }
        do {
            let cached = try await repository.fetchQuizQuestions(lessonID: section.id, userID: userID)
            if !cached.isEmpty { return cached }

            let questions = try await recall.quiz(lessonContext: section.content)
            try await repository.replaceQuizQuestions(lessonID: section.id, userID: userID, questions: questions)
            return questions
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't make a quiz for this lesson. Try again.")
            throw error
        }
    }

    /// Grades one short answer. Not cached, because each attempt is graded on its own.
    func grade(question: String, sampleAnswer: String, studentAnswer: String) async throws -> ShortAnswerGrade {
        errorMessage = nil
        isWorking = true
        defer { isWorking = false }
        do {
            return try await recall.grade(question: question, sampleAnswer: sampleAnswer, studentAnswer: studentAnswer)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't grade this answer. Try again.")
            throw error
        }
    }

    private static func message(for error: Error, fallback: String) -> String {
        (error as? LocalizedError)?.errorDescription ?? fallback
    }
}
