import SwiftUI

/// The two faces the app can render its semantic type in. Space Mono is the
/// brand default; SF Pro is the system fallback at identical sizes and weights.
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

/// DESIGN.md's semantic type roles. Size and weight are fixed per role; only
/// the *face* swaps with the user's `PhiFont` choice — so a future type-scale
/// change touches this enum only, not every view.
enum PhiTextStyle {
    case h1, body, label

    var size: CGFloat {
        switch self {
        case .h1: 28
        case .body: 15
        case .label: 11
        }
    }

    var weight: Font.Weight {
        switch self {
        case .h1: .bold
        case .body: .regular
        case .label: .bold
        }
    }
}

extension Font {
    /// Space Mono at an explicit size/weight. The PostScript names
    /// (`SpaceMono-Regular` / `SpaceMono-Bold`) are verified against the
    /// bundled .ttf `name` tables — `.custom` silently falls back to the system
    /// font if the name is wrong or the file isn't registered via UIAppFonts.
    static func spaceMono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom(weight == .bold ? "SpaceMono-Bold" : "SpaceMono-Regular", size: size)
    }

    /// Resolves a semantic role against a face choice. SF Pro reuses the exact
    /// same size/weight so switching faces never reflows layout differently
    /// than the metrics the design was tuned against.
    static func phi(_ style: PhiTextStyle, face: PhiFont) -> Font {
        switch face {
        case .spaceMono: spaceMono(style.size, weight: style.weight)
        case .sfPro: .system(size: style.size, weight: style.weight)
        }
    }
}

/// Applies a semantic Phi text style whose face tracks the persisted choice
/// *live*. The `@AppStorage` here is the whole trick: a plain `static let
/// phiH1: Font` is an inert value with nothing to invalidate, so it can't
/// react to a Settings toggle. Reading the key inside a `ViewModifier` means
/// every call site subscribes to it and re-renders the instant it flips.
private struct PhiFontModifier: ViewModifier {
    @AppStorage(PhiFont.storageKey) private var face: PhiFont = .spaceMono
    let style: PhiTextStyle

    func body(content: Content) -> some View {
        content.font(.phi(style, face: face))
    }
}

extension View {
    /// Applies a semantic Phi text role (`.h1` / `.body` / `.label`) that
    /// respects the user's font choice and updates live when it changes.
    /// Replaces the old inert `.font(.phiH1)` tokens.
    func phiFont(_ style: PhiTextStyle) -> some View {
        modifier(PhiFontModifier(style: style))
    }
}
