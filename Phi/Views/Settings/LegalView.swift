import SwiftUI

/// A bundled Markdown document, shown as readable text.
///
/// `Text(AttributedString(markdown:))` with full parsing runs paragraphs
/// together and shows the table as raw pipes. So this view splits the file into
/// blocks itself, and hands only the inline syntax (bold, links) to
/// `AttributedString(markdown:)`.
struct LegalView: View {
    let title: String

    /// Parsed once, when the view is created. Nil when the file is not bundled.
    private let blocks: [LegalBlock]?

    init(title: String, resourceName: String) {
        self.title = title
        self.blocks = LegalView.loadBlocks(named: resourceName)
    }

    var body: some View {
        ScrollView {
            Group {
                if let blocks = blocks {
                    VStack(alignment: .leading, spacing: PhiSpacing.md) {
                        ForEach(Array(blocks.enumerated()), id: \.offset) { item in
                            blockView(item.element)
                        }
                    }
                } else {
                    Text("This document could not be loaded. Reinstall Phi and try again.")
                        .phiFont(.body)
                        .foregroundStyle(Color.phiTextSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(PhiSpacing.lg)
            .textSelection(.enabled)
        }
        .background(Color.phiBackground.ignoresSafeArea())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Blocks

    @ViewBuilder
    private func blockView(_ block: LegalBlock) -> some View {
        switch block {
        case .heading(let level, let text):
            styledText(text)
                .phiFont(level == 1 ? .title : .headline)
                .foregroundStyle(Color.phiTextPrimary)
                .accessibilityAddTraits(.isHeader)
        case .bullet(let level, let text):
            HStack(alignment: .firstTextBaseline, spacing: PhiSpacing.sm) {
                Text("•")
                styledText(text)
            }
            .phiFont(.body)
            .foregroundStyle(Color.phiTextPrimary)
            .padding(.leading, CGFloat(level) * PhiSpacing.lg)
        case .paragraph(let text):
            styledText(text)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)
        }
    }

    /// Inline Markdown only. Falls back to the raw text if the parser rejects it.
    private func styledText(_ markdown: String) -> Text {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        guard let parsed = try? AttributedString(markdown: markdown, options: options) else {
            return Text(verbatim: markdown)
        }
        return Text(parsed)
    }

    // MARK: - Loading

    private static func loadBlocks(named resourceName: String) -> [LegalBlock]? {
        // VERIFY: the Legal/ folder may be flattened into the bundle root. The
        // subdirectory lookup covers the case where Xcode keeps the folder.
        let url = Bundle.main.url(forResource: resourceName, withExtension: "md")
            ?? Bundle.main.url(forResource: resourceName, withExtension: "md", subdirectory: "Legal")
        guard let fileURL = url,
              let text = try? String(contentsOf: fileURL, encoding: .utf8)
        else { return nil }
        return parse(text)
    }

    /// Groups lines into blocks. Consecutive plain lines stay in one block, so
    /// the line breaks the author wrote are kept.
    private static func parse(_ markdown: String) -> [LegalBlock] {
        var blocks: [LegalBlock] = []
        var paragraph: [String] = []
        var tableHeader: [String] = []
        var inTable = false

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            blocks.append(.paragraph(text: paragraph.joined(separator: "\n")))
            paragraph.removeAll()
        }

        for rawLine in markdown.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: .whitespaces)
            let indent = rawLine.prefix(while: { $0 == " " }).count / 2

            if line.hasPrefix("|") {
                flushParagraph()
                let cells = line
                    .split(separator: "|", omittingEmptySubsequences: false)
                    .dropFirst()
                    .dropLast()
                    .map { String($0).trimmingCharacters(in: .whitespaces) }
                let isSeparator = cells.allSatisfy { cell in
                    !cell.isEmpty && cell.allSatisfy { $0 == "-" || $0 == ":" }
                }

                if !inTable {
                    inTable = true
                    tableHeader = cells
                } else if !isSeparator {
                    // One block per row: the first cell in bold, the rest as labelled lines.
                    var lines: [String] = []
                    for (index, cell) in cells.enumerated() {
                        if index == 0 {
                            lines.append("**\(cell)**")
                        } else if index < tableHeader.count {
                            lines.append("**\(tableHeader[index]):** \(cell)")
                        }
                    }
                    blocks.append(.paragraph(text: lines.joined(separator: "\n")))
                }
                continue
            }
            inTable = false

            if line.isEmpty {
                flushParagraph()
            } else if line.hasPrefix("#") {
                flushParagraph()
                let level = line.prefix(while: { $0 == "#" }).count
                let text = line.drop(while: { $0 == "#" }).trimmingCharacters(in: .whitespaces)
                blocks.append(.heading(level: level, text: text))
            } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
                flushParagraph()
                blocks.append(.bullet(level: indent, text: String(line.dropFirst(2))))
            } else if line.hasPrefix(">") {
                // Blockquotes are shown as plain paragraphs.
                paragraph.append(line.dropFirst().trimmingCharacters(in: .whitespaces))
            } else {
                paragraph.append(line)
            }
        }
        flushParagraph()
        return blocks
    }
}

/// One visual unit of a legal document.
private enum LegalBlock {
    case heading(level: Int, text: String)
    case bullet(level: Int, text: String)
    case paragraph(text: String)
}

#Preview {
    NavigationStack {
        LegalView(title: "Privacy policy", resourceName: "PRIVACY")
    }
    .preferredColorScheme(.dark)
}
