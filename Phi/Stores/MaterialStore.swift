import Foundation
import Observation

/// Owns the person's imported materials: the list, import, delete, and reading a
/// material's extracted text back. This is the one place that combines
/// `MaterialRepository`, `MaterialStorage`, and `IdentityStore`.
///
/// Each material lives in one storage folder, `{user_id}/{material_id}/`, holding
/// `original.{ext}` and `extracted.txt`. `MaterialStorage` documents the policy
/// that needs the lowercase user id as the first path segment.
@MainActor
@Observable
final class MaterialStore {
    private(set) var materials: [Material] = []
    private(set) var isLoading = false
    var errorMessage: String?

    private let repository: MaterialRepository
    private let storage: MaterialStorage

    init(repository: MaterialRepository = MaterialRepository(), storage: MaterialStorage = MaterialStorage()) {
        self.repository = repository
        self.storage = storage
    }

    /// Loads the person's materials, newest first. Needs a resolved identity.
    func load() async {
        errorMessage = nil
        guard let userID = IdentityStore.shared.currentUserID else {
            errorMessage = MaterialStoreError.notSignedIn.errorDescription
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            materials = try await repository.fetchAll(userID: userID)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't load your materials. Check your connection and try again.")
        }
    }

    /// Imports a PDF, .txt, or .md file and puts it at the top of `materials`.
    /// Sets `errorMessage` and rethrows, so the caller can react as well.
    func importFile(at url: URL) async throws -> Material {
        errorMessage = nil
        do {
            let row = try await performImport(at: url)
            materials.insert(row, at: 0)
            return row
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't import this file. Try again.")
            throw error
        }
    }

    /// Deletes the row, then the material's folder. The row goes first. A failure
    /// after it leaves files nobody can see, never a row that points at missing
    /// files. Once the row is gone the material leaves `materials`, even if its
    /// files could not be cleared.
    func delete(_ material: Material) async {
        errorMessage = nil
        do {
            try await repository.delete(id: material.id, userID: material.userID)
        } catch {
            errorMessage = Self.message(for: error, fallback: "Phi couldn't delete this material. Try again.")
            return
        }
        materials.removeAll { $0.id == material.id }

        do {
            // VERIFY: removeAll(under:) lists the folder through Supabase. See MaterialStorage.
            try await storage.removeAll(under: Self.folder(userID: material.userID, materialID: material.id))
        } catch {
            errorMessage = "Phi removed this material, but its stored files couldn't be cleared."
        }
    }

    /// The material's extracted text. Throws instead of setting `errorMessage`,
    /// because the lesson path reads this and reports failures in its own store.
    func extractedText(for material: Material) async throws -> String {
        let path = Self.folder(userID: material.userID, materialID: material.id) + "/extracted.txt"
        // VERIFY: download(path:) without transform options. See MaterialStorage.
        let data = try await storage.download(path: path)
        guard let text = String(data: data, encoding: .utf8) else {
            throw MaterialStoreError.unreadableText
        }
        return text
    }

    // MARK: - Import

    private func performImport(at url: URL) async throws -> Material {
        guard let userID = IdentityStore.shared.currentUserID else {
            throw MaterialStoreError.notSignedIn
        }

        // Security-scoped access covers the read and the extraction, so it stays open until this returns.
        let didStart = url.startAccessingSecurityScopedResource()
        defer {
            if didStart { url.stopAccessingSecurityScopedResource() }
        }

        // A long PDF takes real time to read and hash, so that work runs off the main actor.
        let staged = try await Task.detached(priority: .userInitiated) { () throws -> Staged in
            let text = try MaterialExtraction.extractText(from: url)
            let original = try Data(contentsOf: url)
            return Staged(text: text, original: original, hash: ContentHash.sha256Hex(of: text))
        }.value

        let materialID = UUID()
        let ext = url.pathExtension.lowercased()
        let folder = Self.folder(userID: userID, materialID: materialID)
        let originalPath = "\(folder)/original.\(ext)"
        let textPath = "\(folder)/extracted.txt"

        do {
            try await storage.upload(staged.original, to: originalPath, contentType: Self.contentType(forExtension: ext))
            try await storage.upload(Data(staged.text.utf8), to: textPath, contentType: "text/plain")
            return try await repository.insert(NewMaterial(
                id: materialID,
                userID: userID,
                title: Self.title(for: url),
                storagePath: originalPath,
                fileSizeBytes: Int64(staged.original.count),
                contentHash: staged.hash
            ))
        } catch {
            // Any failure after the first upload clears the folder, so no orphaned files remain.
            // VERIFY: removeAll(under:) lists the folder through Supabase. See MaterialStorage.
            _ = try? await storage.removeAll(under: folder)
            throw error
        }
    }

    // MARK: - Helpers

    private static func folder(userID: UUID, materialID: UUID) -> String {
        "\(userID.uuidString.lowercased())/\(materialID.uuidString.lowercased())"
    }

    /// The file name without its extension.
    private static func title(for url: URL) -> String {
        let name = url.deletingPathExtension().lastPathComponent
        return name.isEmpty ? "Untitled material" : name
    }

    private static func contentType(forExtension ext: String) -> String {
        switch ext {
        case "pdf": return "application/pdf"
        case "md": return "text/markdown"
        default: return "text/plain"
        }
    }

    private static func message(for error: Error, fallback: String) -> String {
        (error as? LocalizedError)?.errorDescription ?? fallback
    }

    /// The text and bytes read from a picked file, produced off the main actor.
    private struct Staged: Sendable {
        let text: String
        let original: Data
        let hash: String
    }
}

/// Errors this store throws itself. Each message can be shown as it is.
enum MaterialStoreError: LocalizedError {
    case notSignedIn
    case unreadableText

    var errorDescription: String? {
        switch self {
        case .notSignedIn:
            return "Phi is still connecting. Try again in a moment."
        case .unreadableText:
            return "Phi couldn't read this material's text. Import it again."
        }
    }
}
