import Foundation
import PDFKit

/// Turns a picked file into plain text, ready for `ContentHash` and lesson
/// generation.
///
/// The caller must hold security-scoped access to `url`
/// (`startAccessingSecurityScopedResource` before, `stop...` after). This
/// function does not manage that scope itself. Files from the document picker
/// need it, and it covers both the text read and PDF loading.
enum MaterialExtraction {
    static func extractText(from url: URL) throws -> String {
        let raw: String
        switch url.pathExtension.lowercased() {
        case "txt", "md":
            raw = try readPlainText(from: url)
        case "pdf":
            raw = try readPDFText(from: url)
        default:
            throw MaterialExtractionError.unsupportedType(url.pathExtension)
        }

        let normalized = normalize(raw)
        guard !normalized.isEmpty else {
            throw MaterialExtractionError.noSelectableText
        }
        return normalized
    }

    private static func readPlainText(from url: URL) throws -> String {
        do {
            return try String(contentsOf: url, encoding: .utf8)
        } catch {
            throw MaterialExtractionError.unreadableFile
        }
    }

    /// Pages are joined with a blank line so page boundaries survive into the text.
    private static func readPDFText(from url: URL) throws -> String {
        guard let document = PDFDocument(url: url) else {
            throw MaterialExtractionError.unreadablePDF
        }
        // A locked PDF reports zero pages, which would read as "no text" and hide the real cause.
        if document.isLocked {
            throw MaterialExtractionError.passwordProtectedPDF
        }
        var pages: [String] = []
        for index in 0..<document.pageCount {
            pages.append(document.page(at: index)?.string ?? "")
        }
        return pages.joined(separator: "\n\n")
    }

    /// Unifies CRLF, trims the ends, and caps blank-line runs at one blank line.
    /// CRLF goes first, because `\r\n\r\n\r\n` would slip past the `\n{3,}` rule.
    private static func normalize(_ text: String) -> String {
        let unified = text.replacingOccurrences(of: "\r\n", with: "\n")
        let trimmed = unified.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.replacingOccurrences(of: "\n{3,}", with: "\n\n", options: .regularExpression)
    }
}

enum MaterialExtractionError: LocalizedError {
    case unsupportedType(String)
    case unreadableFile
    case unreadablePDF
    case passwordProtectedPDF
    case noSelectableText

    var errorDescription: String? {
        switch self {
        case .unsupportedType(let ext):
            let label = ext.isEmpty ? "This file" : "A .\(ext) file"
            return "\(label) can't be imported yet. Choose a PDF, .txt, or .md file."
        case .unreadableFile:
            return "Phi couldn't read this file. Check that it's a plain-text file saved as UTF-8, then try again."
        case .unreadablePDF:
            return "This PDF couldn't be opened. It may be damaged."
        case .passwordProtectedPDF:
            return "This PDF is password-protected. Remove the password in another app, then import it again."
        case .noSelectableText:
            return "This file has no selectable text, so Phi can't read it. Scanned PDFs (images of pages) aren't supported yet."
        }
    }
}
