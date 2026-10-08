import SwiftUI

/// The two faces the app can render its semantic type in. Space Mono is the
/// brand default; SF Pro is the system fallback at matching sizes and weights.
///
/// `rawValue` doubles as the Settings picker label AND the persisted
/// `@AppStorage` value — `@AppStorage` accepts a `RawRepresentable` whose
/// `RawValue` is `String`, so no separate mapping is needed.
enum PhiFont: String, CaseIterable, Identifiable {
    case spaceMono = "Space Mono"
    case sfPro = "SF Pro"

    var id: String { rawValue }

    /// The single UserDefaults key every font-aware view reads/writes. Declared
    /// once here so a typo can't silently fork it into two keys (same reasoning
    /// as `OnboardingStore` centralizing its flag string).
    static let storageKey = "phi.fontChoice"
}

/// Phi's semantic type roles. Size and weight are fixed per role; only the
/// *face* swaps with the user's `PhiFont` choice, so a type-scale change
/// touches this enum only.
///
/// Each role scales with Dynamic Type through a system text style. Space Mono
/// passes that style as `relativeTo:`, and SF Pro uses it directly, so both
/// faces grow on the same curve.
enum PhiTextStyle {
    case display, title, headline, body, lesson, caption, label

    /// Alias of `.title`. Kept so existing call sites compile.
    static let h1: PhiTextStyle = .title

    /// Point size at the default text size.
    var size: CGFloat {
        switch self {
        case .display: return 34
        case .title: return 22
        case .headline: return 17
        case .body: return 15
        case .lesson: return 17
        case .caption: return 12
        case .label: return 11
        }
    }

    var weight: Font.Weight {
        switch self {
        case .display, .title, .headline, .label: return .bold
        case .body, .lesson, .caption: return .regular
        }
    }

    /// The system style this role scales with. Each one's default size matches `size`.
    var textStyle: Font.TextStyle {
        switch self {
        case .display: return .largeTitle
        case .title: return .title2
        case .headline: return .headline
        case .body: return .subheadline
        case .lesson: return .body
        case .caption: return .caption
        case .label: return .caption2
        }
    }

    /// Labels are uppercase. Applied by `phiFont(_:)`.
    var isUppercase: Bool {
        self == .label
    }

    /// Letter spacing in points. Text-only, so apply with `Text.phiTracking(_:)`.
    var tracking: CGFloat {
        self == .label ? 1.2 : 0
    }

    /// Space between lines. Applied by `phiLesson()`.
    var lineSpacing: CGFloat {
        self == .lesson ? 6 : 0
    }
}

extension Font {
    /// Space Mono at an explicit size and weight. The PostScript names
    /// (`SpaceMono-Regular` / `SpaceMono-Bold`) are verified against the
    /// bundled .ttf `name` tables. `.custom` silently falls back to the system
    /// font if the name is wrong or the file isn't registered via UIAppFonts.
    /// `relativeTo:` makes the size grow with Dynamic Type.
    static func spaceMono(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        Font.custom(weight == .bold ? "SpaceMono-Bold" : "SpaceMono-Regular", size: size, relativeTo: style)
    }

    /// Resolves a semantic role against a face choice. Both faces scale with
    /// the role's text style, so switching faces does not reflow layout at the
    /// default size or at any other Dynamic Type size.
    static func phi(_ style: PhiTextStyle, face: PhiFont) -> Font {
        switch face {
        case .spaceMono:
            return spaceMono(style.size, weight: style.weight, relativeTo: style.textStyle)
        case .sfPro:
            // VERIFY: Font.weight(_:) on a system text-style font.
            return Font.system(style.textStyle).weight(style.weight)
        }
    }
}

/// Applies a semantic Phi text role whose face tracks the persisted choice
/// *live*. The `@AppStorage` here is the whole trick: a plain `static let`
/// font is an inert value with nothing to invalidate, so it can't react to a
/// Settings toggle. Reading the key inside a `ViewModifier` means every call
/// site subscribes to it and re-renders the instant it flips.
private struct PhiFontModifier: ViewModifier {
    @AppStorage(PhiFont.storageKey) private var face: PhiFont = .spaceMono
    let style: PhiTextStyle

    func body(content: Content) -> some View {
        content
            .font(.phi(style, face: face))
            .textCase(style.isUppercase ? Text.Case.uppercase : nil)
    }
}

extension View {
    /// Applies a semantic Phi text role. Respects the user's font choice,
    /// updates live when it changes, and scales with Dynamic Type.
    func phiFont(_ style: PhiTextStyle) -> some View {
        modifier(PhiFontModifier(style: style))
    }
}

extension Text {
    /// Applies a role's letter spacing. Text-only in SwiftUI, so call it on the
    /// `Text` before `phiFont(_:)`.
    /// VERIFY: Text.tracking(_:) returns Text.
    func phiTracking(_ style: PhiTextStyle) -> Text {
        tracking(style.tracking)
    }
}

private struct PhiLessonModifier: ViewModifier {
    /// Lesson measure: about 60 characters of Space Mono at the lesson size.
    /// The 0.612 em advance width is an estimate. VERIFY against the bundled .ttf.
    @ScaledMetric(relativeTo: .body) private var pointSize: CGFloat = PhiTextStyle.lesson.size

    func body(content: Content) -> some View {
        content
            .phiFont(.lesson)
            // VERIFY: View.lineSpacing(_:) applies to the Text inside content.
            .lineSpacing(PhiTextStyle.lesson.lineSpacing)
            .frame(maxWidth: 60 * 0.612 * pointSize, alignment: .leading)
    }
}

extension View {
    /// Lesson body: the `.lesson` role, line spacing 6, and a measure capped at
    /// about 60 characters. The cap only binds on wide screens such as iPad.
    func phiLesson() -> some View {
        modifier(PhiLessonModifier())
    }
}
