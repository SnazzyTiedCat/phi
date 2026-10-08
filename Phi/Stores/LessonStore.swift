import Foundation
import Observation

/// Owns generated lessons. `sections(for:)` returns a material's saved lesson when
/// every row was generated from the material's current text. Otherwise it
/// generates a new lesson, saves it, and returns the saved rows.
///
/// Row layout, fixed in `rows(from:userID:materialID:contentHash:)`: index 0 is the
/// intro, indices 1...n are the draft's sections, and one "Key takeaways" row comes
/// last, only when the draft has takeaways.
@MainActor
@Observable
final class LessonStore {
    private(set) var isGenerating = false
    var errorMessage: String?

    private let repository: LessonRepository
    private let generator: LessonGenerating
    private let materials: MaterialStore

    init(
        repository: LessonRepository = LessonRepository(),
        generator: LessonGenerating = AnthropicLessonGenerator(),
        materials: MaterialStore
    ) {
        self.repository = repository
        self.generator = generator
        self.materials = materials
    }

    /// The material's lesson sections in reading order. Sets `errorMessage` and
    /// rethrows on failure.
    func sections(for material: Material) async throws -> [LessonSection] {
        errorMessage = nil
        do {
            return try await loadOrGenerate(for: material)
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Phi couldn't build this lesson. Try again."
            throw error
        }
    }

    /// The same sections as a `Lesson`, which sorts them by index.
    func lesson(for material: Material) async throws -> Lesson {
        let rows = try await sections(for: material)
        return Lesson(materialID: material.id, sections: rows)
    }

    private func loadOrGenerate(for material: Material) async throws -> [LessonSection] {
        guard let contentHash = material.contentHash else {
            throw LessonStoreError.missingContentHash
        }
        guard let userID = IdentityStore.shared.currentUserID else {
            throw LessonStoreError.notSignedIn
        }

        // Cache hit: rows exist and every one was generated from this exact text.
        let cached = try await repository.fetchSections(materialID: material.id, userID: userID)
        if !cached.isEmpty && cached.allSatisfy({ $0.contentHash == contentHash }) {
            return cached
        }

        isGenerating = true
        defer { isGenerating = false }

        let text = try await materials.extractedText(for: material)
        let draft = try await generator.generateLesson(title: material.title, text: text)
        let rows = Self.rows(from: draft, userID: userID, materialID: material.id, contentHash: contentHash)
        // VERIFY: upsert and `or` filter syntax live in LessonRepository.replaceLesson.
        return try await repository.replaceLesson(
            materialID: material.id,
            userID: userID,
            contentHash: contentHash,
            sections: rows
        )
    }

    /// Maps a draft onto the rows this app writes: intro at 0, sections at 1...n,
    /// then takeaways last when there are any.
    static func rows(
        from draft: LessonDraft,
        userID: UUID,
        materialID: UUID,
        contentHash: String
    ) -> [NewLessonSection] {
        let persona = TutorPersona.generalist.id
        var rows: [NewLessonSection] = [
            NewLessonSection(
                userID: userID,
                materialID: materialID,
                sectionIndex: 0,
                title: draft.title,
                content: draft.intro,
                tutorPersona: persona,
                contentHash: contentHash
            )
        ]
        for (offset, section) in draft.sections.enumerated() {
            rows.append(NewLessonSection(
                userID: userID,
                materialID: materialID,
                sectionIndex: offset + 1,
                title: section.heading,
                content: section.body,
                tutorPersona: persona,
                contentHash: contentHash
            ))
        }
        if !draft.takeaways.isEmpty {
            rows.append(NewLessonSection(
                userID: userID,
                materialID: materialID,
                sectionIndex: draft.sections.count + 1,
                title: "Key takeaways",
                content: draft.takeaways.map { "- " + $0 }.joined(separator: "\n"),
                tutorPersona: persona,
                contentHash: contentHash
            ))
        }
        return rows
    }
}

/// Errors this store throws itself. Each message can be shown as it is.
enum LessonStoreError: LocalizedError {
    case notSignedIn
    case missingContentHash

    var errorDescription: String? {
        switch self {
        case .notSignedIn:
            return "Phi is still connecting. Try again in a moment."
        case .missingContentHash:
            return "Phi can't build a lesson for this material because it has no text fingerprint. Import it again."
        }
    }
}
