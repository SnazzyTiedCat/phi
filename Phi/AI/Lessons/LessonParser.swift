import Foundation

/// Reads a lesson reply from the model and checks it before anything is shown or saved.
enum LessonParser {

    static func parse(_ reply: String) throws -> LessonDraft {
        let unfenced = reply
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")

        // The model sometimes adds prose around the object. Keep only the outer braces.
        guard let start = unfenced.firstIndex(of: "{"),
              let end = unfenced.lastIndex(of: "}"),
              start < end else {
            throw LessonParseError.invalid("The reply did not contain a lesson.")
        }

        let draft: LessonDraft
        do {
            draft = try JSONDecoder().decode(LessonDraft.self, from: Data(unfenced[start...end].utf8))
        } catch {
            throw LessonParseError.invalid("The lesson did not match the expected format.")
        }

        guard !isBlank(draft.title) else {
            throw LessonParseError.invalid("The lesson has no title.")
        }
        guard !isBlank(draft.intro) else {
            throw LessonParseError.invalid("The lesson has no introduction.")
        }
        guard !draft.sections.isEmpty else {
            throw LessonParseError.invalid("The lesson has no sections.")
        }
        for section in draft.sections where isBlank(section.heading) || isBlank(section.body) {
            throw LessonParseError.invalid("A section is missing its heading or its text.")
        }

        return LessonDraft(
            title: draft.title,
            intro: draft.intro,
            sections: draft.sections,
            takeaways: draft.takeaways.filter { !isBlank($0) }
        )
    }

    private static func isBlank(_ text: String) -> Bool {
        text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

/// Why a lesson reply was rejected. The message is safe to show the student.
enum LessonParseError: LocalizedError {
    case invalid(String)

    var errorDescription: String? {
        switch self {
        case .invalid(let reason):
            return "Phi could not build this lesson. \(reason) Try generating it again."
        }
    }
}
