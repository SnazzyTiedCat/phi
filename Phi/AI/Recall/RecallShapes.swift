import CryptoKit
import Foundation

/// AI-3 output shapes — flashcards, quiz questions, short-answer grades.
///
/// These are the wire contract published to Builder 2 for BE-4 persistence
/// (see Docs/BE4-recall-shapes.md). The JSON key names deliberately match the
/// web app's existing `quizzes.questions` jsonb shape ("multiple_choice",
/// "sample_answer", 0-based "correct") so the two clients stay interchangeable
/// — renaming a key here is a cross-platform breaking change, treat these like
/// TutorPersona.id: stable once shipped.

struct Flashcard: Codable, Equatable {
    /// A retrieval cue — a question or "explain/apply" prompt, never a copied
    /// lesson sentence with a blank. Recognition isn't recall.
    let front: String
    /// The answer: concise, in the lesson's own terms.
    let back: String
}

struct QuizQuestion: Codable, Equatable {
    enum Kind: String, Codable {
        case multipleChoice = "multiple_choice"
        case shortAnswer = "short_answer"
    }

    let type: Kind
    let question: String
    /// Why the right answer is right (for MC: and why the tempting distractor
    /// is wrong). UI contract: surfaced only AFTER the attempt — showing it
    /// earlier defeats the retrieval practice this artifact exists for.
    let explanation: String

    /// multiple_choice only: exactly 4 options; `correct` is the 0-based index.
    let options: [String]?
    let correct: Int?

    /// short_answer only: the model answer grading compares meaning against.
    let sampleAnswer: String?

    enum CodingKeys: String, CodingKey {
        case type, question, explanation, options, correct
        case sampleAnswer = "sample_answer"
    }
}

struct ShortAnswerGrade: Codable, Equatable {
    enum Verdict: String, Codable { case correct, partial, incorrect }
    let verdict: Verdict
    /// Tutor-voice, specific: what the student got right, what's missing.
    let feedback: String
}

enum Recall {
    /// Stable cache key so BE-4 can enforce "one generation per lesson per
    /// artifact type": same lesson text + artifact → same key. Trim-only
    /// normalization — any real edit to the lesson is a new key, and
    /// regenerating for an actually-changed lesson is correct, not waste.
    static func cacheKey(lesson: String, artifact: String) -> String {
        let normalized = lesson.trimmingCharacters(in: .whitespacesAndNewlines)
        let digest = SHA256.hash(data: Data("\(artifact)\n\(normalized)".utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }

    /// Decode a JSON array of shapes out of a raw model reply, tolerating a
    /// ``` fence or stray prose around the array. Strict inside the brackets:
    /// one malformed element fails the whole decode (nil), because caching a
    /// silently-shrunk quiz is worse than retrying the generation.
    static func decodeArray<T: Decodable>(_ raw: String) -> [T]? {
        guard let start = raw.firstIndex(of: "["),
              let end = raw.lastIndex(of: "]"), start < end else { return nil }
        return try? JSONDecoder().decode([T].self, from: Data(raw[start...end].utf8))
    }

    /// Same, for a single JSON object (the grading reply).
    static func decodeObject<T: Decodable>(_ raw: String) -> T? {
        guard let start = raw.firstIndex(of: "{"),
              let end = raw.lastIndex(of: "}"), start < end else { return nil }
        return try? JSONDecoder().decode(T.self, from: Data(raw[start...end].utf8))
    }
}
