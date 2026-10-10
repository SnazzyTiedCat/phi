import Foundation
import Supabase

/// Insert payload for `ios.materials`. Built by the caller and never read back.
///
/// `id` is client-generated on purpose: the storage path embeds it, so the file
/// goes up under `{user_id}/{id}/` before the row exists. This is always a fresh
/// insert, never an upsert, so the client id can't overwrite an existing row.
struct NewMaterial: Encodable, Sendable {
    let id: UUID
    let userID: UUID
    let title: String
    /// `{user_id}/{id}/original.{ext}`. See `MaterialStorage`.
    let storagePath: String
    let fileSizeBytes: Int64?
    /// `ContentHash.sha256Hex` of the extracted text.
    let contentHash: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userID = "user_id"
        case title
        case storagePath = "storage_path"
        case fileSizeBytes = "file_size_bytes"
        case contentHash = "content_hash"
    }
}

/// Reads and writes `ios.materials`. Each method scopes its query to the
/// owner's `userID`. RLS enforces the same rule on the server.
struct MaterialRepository {
    /// The owner's materials, newest first.
    func fetchAll(userID: UUID) async throws -> [Material] {
        let rows: [Material] = try await supabase.schema("ios")
            .from("materials")
            .select()
            .eq("user_id", value: userID.uuidString.lowercased())
            .order("created_at", ascending: false)
            .execute()
            .value
        return rows
    }

    /// Inserts one material and returns the stored row.
    func insert(_ new: NewMaterial) async throws -> Material {
        let row: Material = try await supabase.schema("ios")
            .from("materials")
            .insert(new)
            .select()
            .single()
            .execute()
            .value
        return row
    }

    /// Deletes the row only. Files under `{user_id}/{id}/` stay in storage until
    /// `MaterialStorage.removeAll(under:)` clears them.
    func delete(id: UUID, userID: UUID) async throws {
        try await supabase.schema("ios")
            .from("materials")
            .delete()
            .eq("id", value: id.uuidString.lowercased())
            .eq("user_id", value: userID.uuidString.lowercased())
            .execute()
    }
}
