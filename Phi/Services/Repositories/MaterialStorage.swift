import Foundation
import Supabase

/// Object storage for the private `ios-materials` bucket.
///
/// Path convention. The storage policy in ios_materials_foundation.sql checks
/// that the first segment equals `auth.uid()`:
///   original:  `{user_id}/{material_id}/original.{ext}`
///   extracted: `{user_id}/{material_id}/extracted.txt`
/// Use the lowercase UUID string. Postgres renders `auth.uid()::text` in lowercase,
/// so an uppercase folder would fail the policy.
struct MaterialStorage {
    private static let bucketID = "ios-materials"

    func upload(_ data: Data, to path: String, contentType: String) async throws {
        // VERIFY: upload(_:data:options:) and FileOptions(contentType:) labels.
        _ = try await supabase.storage
            .from(Self.bucketID)
            .upload(path, data: data, options: FileOptions(contentType: contentType))
    }

    func download(path: String) async throws -> Data {
        // VERIFY: download(path:) without transform options.
        try await supabase.storage
            .from(Self.bucketID)
            .download(path: path)
    }

    /// Removes every object under `folder`, including nested folders. Account
    /// deletion calls this first, because the auth user's deletion does not
    /// touch storage, and the storage policy stops matching once it's gone.
    func removeAll(under folder: String) async throws {
        let paths = try await listObjects(under: folder)
        // Remove in batches so one request never carries a huge list.
        var start = 0
        while start < paths.count {
            let end = min(start + 100, paths.count)
            // VERIFY: remove(paths:).
            _ = try await supabase.storage
                .from(Self.bucketID)
                .remove(paths: Array(paths[start..<end]))
            start = end
        }
    }

    /// Full paths of every file under `folder`. Storage lists one level at a
    /// time, and folders come back without an id, so recurse into them.
    private func listObjects(under folder: String) async throws -> [String] {
        let bucket = supabase.storage.from(Self.bucketID)
        let pageSize = 100
        var files: [String] = []
        var offset = 0
        while true {
            // VERIFY: list(path:options:), SearchOptions(limit:offset:), and
            // FileObject.id being nil for folder entries.
            let page = try await bucket.list(
                path: folder,
                options: SearchOptions(limit: pageSize, offset: offset)
            )
            for item in page {
                let child = folder + "/" + item.name
                if item.id == nil {
                    let nested = try await listObjects(under: child)
                    files.append(contentsOf: nested)
                } else {
                    files.append(child)
                }
            }
            if page.count < pageSize { break }
            offset += page.count
        }
        return files
    }
}
