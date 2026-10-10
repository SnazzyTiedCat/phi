import Foundation

/// Flashcards, quizzes, and short-answer grading for a finished lesson.
///
/// `lessonContext` is the lesson text the student just finished. The return
/// types are the shapes in RecallShapes.swift, which the web app shares.
protocol RecallGenerating: Sendable {
    func flashcards(lessonContext: String) async throws -> [Flashcard]
    func quiz(lessonContext: String) async throws -> [QuizQuestion]
    func grade(question: String, sampleAnswer: String, studentAnswer: String) async throws -> ShortAnswerGrade
}
