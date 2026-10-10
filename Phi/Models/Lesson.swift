import Foundation

/// One section row of `ios.lessons`, the upsert unit for generated lessons
/// (Docs/supabase/CONTRACT-lesson-cache.md). Same convention as `Material`:
/// camelCase properties, explicit snake_case `CodingKeys`.
///
/// `id` is server-assigned and stable across regenerates, and chat history hangs
/// off it. Upsert payloads must not encode `id`, or the upsert would overwrite it.
/// Write through a separate insert type that leaves out `id` and the timestamps.
struct LessonSection: Identifiable, Hashable, Codable {
    let id: UUID
    let userID: UUID
    let materialID: UUID
    let sectionIndex: Int
    let title: String
    let content: String
    /// `TutorPersona.id` the section was written for. Nil when none was set.
    let tutorPersona: String?
    /// Hash of the material text this section was generated from. Equal to the
    /// material's `content_hash` means a cache hit.
    let contentHash: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case materialID = "material_id"
        case sectionIndex = "section_index"
        case title
        case content
        case tutorPersona = "tutor_persona"
        case contentHash = "content_hash"
    }
}

/// A material's full lesson: its sections in reading order.
struct Lesson: Hashable {
    let materialID: UUID
    let sections: [LessonSection]

    /// Sorts by `sectionIndex`, so callers can rely on reading order.
    init(materialID: UUID, sections: [LessonSection]) {
        self.materialID = materialID
        self.sections = sections.sorted { $0.sectionIndex < $1.sectionIndex }
    }
}

/// The JSON the AI returns for one lesson. Each `sections` entry maps to one
/// `LessonSection` row: `heading` becomes the row's title and `body` its content.
struct LessonDraft: Codable, Equatable {
    let title: String
    let intro: String
    let sections: [Section]
    let takeaways: [String]

    struct Section: Codable, Equatable {
        let heading: String
        let body: String
    }
}
