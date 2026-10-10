import CryptoKit
import Foundation

/// SHA-256 of a material's extracted text, as lowercase hex.
///
/// The client writes this to `ios.materials.content_hash` and to each lesson
/// row's `content_hash`. A cache hit is decided by comparing the two strings,
/// both in the client and in the SQL delete that clears stale rows. Every writer
/// must hash the same bytes: the exact string `MaterialExtraction.extractText`
/// returns, as UTF-8, lowercase hex. One different byte (a stray space, uppercase
/// hex) turns every cache hit into a miss.
enum ContentHash {
    static func sha256Hex(of text: String) -> String {
        let digest = SHA256.hash(data: Data(text.utf8))
        return digest.map { String(format: "%02x", UInt32($0)) }.joined()
    }
}
