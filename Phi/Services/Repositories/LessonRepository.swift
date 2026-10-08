import Foundation
import Supabase

/// One `ios.lessons` row to write, built from a generated `LessonDraft`. One per
/// section. There is no `id`: the upsert key is (user_id, material_id,
/// section_index), and an `id` here would overwrite the stable one.
struct NewLessonSection: Encodable, Sendable {
    let userID: UUID
    let materialID: UUID
    /// Position in reading order.
    let sectionIndex: Int
    let title: String
    let content: String
    /// `TutorPersona.id`, or nil.
    let tutorPersona: String?
    /// `ContentHash.sha256Hex` of the material text this section came from.
    let contentHash: String

    enum CodingKeys: String, CodingKey {
        case userID = "user_id"
        case materialID = "material_id"
        case sectionIndex = "section_index"
        case title
        case content
        case tutorPersona = "tutor_persona"
        case contentHash = "content_hash"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(userID, forKey: .userID)
        try container.encode(materialID, forKey: .materialID)
        try container.encode(sectionIndex, forKey: .sectionIndex)
        try container.encode(title, forKey: .title)
        try container.encode(content, forKey: .content)
        // Written even when nil, so an upsert clears a persona that was removed.
        try container.encode(tutorPersona, forKey: .tutorPersona)
        try container.encode(contentHash, forKey: .contentHash)
    }
}

enum LessonRepositoryError: Error {
    /// An empty lesson would make the stale-row delete wipe the material's rows.
    case noSections
    /// Every section must carry the call's user, material and content hash.
    case mismatchedSections
    /// The hash goes into a filter string, so only SHA-256 lowercase hex is accepted.
    case invalidContentHash
}

/// Reads and writes `ios.lessons`. Each method scopes its query to the owner's
/// `userID`. RLS enforces the same rule on the server.
struct LessonRepository {
    /// The sections of one material, in reading order.
    func fetchSections(materialID: UUID, userID: UUID) async throws -> [LessonSection] {
        let rows: [LessonSection] = try await supabase.schema("ios")
            .from("lessons")
            .select()
            .eq("material_id", value: materialID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .order("section_index", ascending: true)
            .execute()
            .value
        return rows
    }

    /// Writes a regenerated lesson and drops the rows it replaced. Returns the
    /// written rows with their stable ids, so the caller can key chat on them.
    ///
    /// Upsert first. Upserted rows keep their ids, so chat on a regenerated
    /// section survives. Then delete what this lesson did not write: rows with an
    /// old hash, rows with a NULL hash (`<> h` never matches NULL, so `is.null`
    /// is listed too), and rows outside the new index range.
    func replaceLesson(
        materialID: UUID,
        userID: UUID,
        contentHash: String,
        sections: [NewLessonSection]
    ) async throws -> [LessonSection] {
        guard !sections.isEmpty else { throw LessonRepositoryError.noSections }
        guard isSHA256Hex(contentHash) else { throw LessonRepositoryError.invalidContentHash }
        let consistent = sections.allSatisfy {
            $0.userID == userID && $0.materialID == materialID && $0.contentHash == contentHash
        }
        guard consistent else { throw LessonRepositoryError.mismatchedSections }

        // (a) Upsert on the stable key, writing the hash. `.select()` returns the
        // rows with their ids, which the caller needs for chat.
        // VERIFY: upsert(_:onConflict:) takes the comma-separated key string.
        let written: [LessonSection] = try await supabase.schema("ios")
            .from("lessons")
            .upsert(sections, onConflict: "user_id,material_id,section_index")
            .select()
            .execute()
            .value

        // (b) Delete leftovers. The index bounds come from the rows just written,
        // so this works whatever the index base is.
        let lowest = sections.map(\.sectionIndex).min() ?? 0
        let highest = sections.map(\.sectionIndex).max() ?? 0
        // VERIFY: or(_:) filter string syntax.
        try await supabase.schema("ios")
            .from("lessons")
            .delete()
            .eq("material_id", value: materialID.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .or("content_hash.is.null,content_hash.neq.\(contentHash),section_index.lt.\(lowest),section_index.gt.\(highest)")
            .execute()

        return written.sorted { $0.sectionIndex < $1.sectionIndex }
    }

    private func isSHA256Hex(_ text: String) -> Bool {
        text.count == 64 && text.allSatisfy { "0123456789abcdef".contains($0) }
    }
}
