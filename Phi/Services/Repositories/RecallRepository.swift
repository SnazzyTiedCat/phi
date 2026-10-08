import Foundation
import Supabase

/// Flashcards and quiz questions for a lesson (`ios.flashcards`, `ios.quizzes`).
///
/// Each lesson has one artifact set, and a regenerate replaces it whole. The
/// replace deletes the old set, then inserts the new one. If the insert fails,
/// the lesson is left empty, which reads as a cache miss, not as stale cards.
///
/// Neither table has a `content_hash` yet, so the caller decides when a set is
/// stale. Flashcards also have no position column, so their order is by
/// `created_at`, and rows from one insert share that timestamp.
struct RecallRepository {
    /// The lesson's flashcards. Empty when none have been generated.
    func fetchFlashcards(lessonID: UUID, userID: UUID) async throws -> [Flashcard] {
        let rows: [Flashcard] = try await supabase.schema("ios")
            .from("flashcards")
            .select("front,back")
            .eq("lesson_id", value: lessonID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .order("created_at", ascending: true)
            .execute()
            .value
        return rows
    }

    /// Replaces the lesson's flashcard set. An empty `cards` clears the set.
    func replaceFlashcards(lessonID: UUID, userID: UUID, cards: [Flashcard]) async throws {
        try await clearSet(table: "flashcards", lessonID: lessonID, userID: userID)
        guard !cards.isEmpty else { return }
        let rows = cards.map {
            FlashcardInsert(userID: userID, lessonID: lessonID, front: $0.front, back: $0.back)
        }
        try await supabase.schema("ios")
            .from("flashcards")
            .insert(rows)
            .execute()
    }

    /// The lesson's quiz questions, or `[]` when none have been generated.
    func fetchQuizQuestions(lessonID: UUID, userID: UUID) async throws -> [QuizQuestion] {
        // One quiz row per lesson. `limit(1)` takes the newest in case a race left two.
        // VERIFY: limit(_:) on the transform builder.
        let rows: [QuizRow] = try await supabase.schema("ios")
            .from("quizzes")
            .select("questions")
            .eq("lesson_id", value: lessonID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value
        return rows.first?.questions ?? []
    }

    /// Replaces the lesson's quiz with `questions`, stored as one jsonb array.
    /// An empty list clears the quiz.
    func replaceQuizQuestions(lessonID: UUID, userID: UUID, questions: [QuizQuestion]) async throws {
        try await clearSet(table: "quizzes", lessonID: lessonID, userID: userID)
        guard !questions.isEmpty else { return }
        let row = QuizInsert(userID: userID, lessonID: lessonID, questions: questions)
        try await supabase.schema("ios")
            .from("quizzes")
            .insert(row)
            .execute()
    }

    private func clearSet(table: String, lessonID: UUID, userID: UUID) async throws {
        try await supabase.schema("ios")
            .from(table)
            .delete()
            .eq("lesson_id", value: lessonID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .execute()
    }
}

/// Read shape for `quizzes.questions`.
private struct QuizRow: Decodable {
    let questions: [QuizQuestion]
}

/// Insert payload for one `ios.flashcards` row. No id or created_at.
private struct FlashcardInsert: Encodable, Sendable {
    let userID: UUID
    let lessonID: UUID
    let front: String
    let back: String

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case lessonID = "lesson_id"
        case front
        case back
    }
}

/// Insert payload for one `ios.quizzes` row. No id or created_at.
private struct QuizInsert: Encodable, Sendable {
    let userID: UUID
    let lessonID: UUID
    /// Encoded as the same JSON array the web app stores in `quizzes.questions`.
    let questions: [QuizQuestion]

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case lessonID = "lesson_id"
        case questions
    }
}
