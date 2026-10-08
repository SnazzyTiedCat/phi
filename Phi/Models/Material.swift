import Foundation

/// A single imported study material (a textbook PDF, in the product's terms).
///
/// Mirrors `ios.materials` (ios_materials_foundation.sql, plus `content_hash`
/// from ios_generated_content_cache.sql). Properties are camelCase and
/// `CodingKeys` spell out the snake_case columns, because rows are decoded
/// as-is with no key conversion. Decode rows with the Supabase client: a default
/// JSONDecoder rejects PostgREST's timestamp strings.
///
/// `createdAt` and `updatedAt` are server-owned. Update payloads should not
/// encode them, or an update would overwrite the stored values.
///
/// `Hashable` is load-bearing, not decorative: it's what lets `Material` be a
/// value in `.navigationDestination(for: Material.self)` on the Dashboard's
/// `NavigationStack`.
struct Material: Identifiable, Hashable, Codable {
    let id: UUID
    let userID: UUID
    let title: String
    /// Storage path of the original file, `{user_id}/{material_id}/original.{ext}`.
    /// The extracted text sits beside it as `extracted.txt`. Nil until a file is uploaded.
    let storagePath: String?
    let fileSizeBytes: Int64?
    /// SHA-256 of the extracted text, lowercase hex. See `ContentHash`.
    let contentHash: String?
    let createdAt: Date
    let updatedAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case title
        case storagePath = "storage_path"
        case fileSizeBytes = "file_size_bytes"
        case contentHash = "content_hash"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

extension Material {
    /// For previews and seed data. The owner and timestamps are placeholders;
    /// the layout doesn't read them. Real rows come from Supabase.
    init(id: UUID, title: String) {
        self.init(
            id: id,
            userID: UUID(),
            title: title,
            storagePath: nil,
            fileSizeBytes: nil,
            contentHash: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
}
