import Foundation
import SwiftUI

/// Turns a stored row into the text the narrator reads and the text the screen shows.
/// Both come from the same characters, so a highlight range from the narrator lands
/// on the right word.
enum LessonBody {
    struct Rendered {
        /// What the narrator reads. Highlight ranges are UTF-16 offsets into this string.
        let plain: String
        /// The same characters, with inline bold and italics kept.
        let display: AttributedString
    }

    static func rendered(from content: String) -> Rendered {
        let cleaned = stripBlockMarkers(content)
        let display: AttributedString
        do {
            // Inline syntax only, with line breaks kept. Block markers are removed first.
            // VERIFY: AttributedString.MarkdownParsingOptions(interpretedSyntax:) on iOS 17.
            let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
            display = try AttributedString(markdown: cleaned, options: options)
        } catch {
            display = AttributedString(cleaned)
        }
        // Read the parsed characters, so the narrator never says the asterisks.
        return Rendered(plain: String(display.characters), display: display)
    }

    /// The display with the spoken word tinted. Only the background changes.
    static func highlighted(_ rendered: Rendered, range: NSRange?) -> AttributedString {
        guard let range = range, let bounds = Range(range, in: rendered.plain) else {
            return rendered.display
        }
        let lower = rendered.plain.distance(from: rendered.plain.startIndex, to: bounds.lowerBound)
        let upper = rendered.plain.distance(from: rendered.plain.startIndex, to: bounds.upperBound)

        var result = rendered.display
        let characters = result.characters
        guard let start = characters.index(characters.startIndex, offsetBy: lower, limitedBy: characters.endIndex),
              let end = characters.index(characters.startIndex, offsetBy: upper, limitedBy: characters.endIndex),
              start < end else {
            return rendered.display
        }
        // VERIFY: backgroundColor as a dynamic member on an AttributedString slice (SwiftUI attribute scope).
        result[start..<end].backgroundColor = Color.phiGold.opacity(0.25)
        return result
    }

    /// The lesson prompt can return "- " bullets and "#" headings. Turn them into plain
    /// lines, so the narrator does not say "dash" or "hash".
    private static func stripBlockMarkers(_ content: String) -> String {
        content
            .components(separatedBy: "\n")
            .map { line -> String in
                var text = line.trimmingCharacters(in: .whitespacesAndNewlines)
                if text.hasPrefix("#") {
                    text = String(text.drop(while: { $0 == "#" })).trimmingCharacters(in: .whitespaces)
                }
                if text.hasPrefix("- ") || text.hasPrefix("* ") {
                    text = "• " + String(text.dropFirst(2))
                }
                return text
            }
            .joined(separator: "\n")
    }
}
