import SwiftUI

/// Phi's grayscale ramp, semantic colors, and the single gold accent.
/// Values come from DESIGN.md. The gold is #C9A84C (see Docs/DESIGN-IOS.md).
///
/// Gold is reserved for the primary action, the ♠ mark, and the focus ring.
/// Never use it for body text or decoration.
extension Color {
    // MARK: Surfaces

    /// App background. Off-black on purpose, never pure black.
    static let phiBackground = Color(hex: "#0A0A0A")
    /// Lowest surface step: cards on the background, grouped rows.
    static let phiSurface = Color(hex: "#111111")
    /// Raised surface step: cards that sit above a surface.
    static let phiSurfaceRaised = Color(hex: "#1A1A1A")
    /// Highest opaque surface step: floating chrome and its fallback.
    static let phiSurfaceHigh = Color(hex: "#222222")
    /// Hairline strokes and dividers. White at 10%, so it works on any surface step.
    static let phiHairline = Color.white.opacity(0.10)

    // MARK: Text

    static let phiTextPrimary = Color(hex: "#F2F2F2")
    static let phiTextSecondary = Color(hex: "#999999")
    static let phiTextTertiary = Color(hex: "#777777")

    // MARK: Semantic

    static let phiSuccess = Color(hex: "#4ADE80")
    static let phiWarning = Color(hex: "#FBBF24")
    static let phiError = Color(hex: "#F87171")

    // MARK: Accent

    /// Phi's one accent. Primary action, the ♠ mark, and the focus ring only.
    static let phiGold = Color(hex: "#C9A84C")

    // MARK: Legacy names

    // Existing call sites use these. Kept as aliases so nothing needs renaming.
    static let c950 = Color.phiBackground
    static let c900 = Color.phiSurface
    static let c850 = Color.phiSurfaceRaised
    static let c800 = Color.phiSurfaceHigh
    static let c700 = Color(hex: "#333333")
    static let c600 = Color(hex: "#555555")
    static let c500 = Color.phiTextTertiary
    static let c400 = Color.phiTextSecondary
}

/// SwiftUI's `Color` has no hex initializer, so this small helper lives with the tokens.
extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        let rgb = UInt64(cleaned, radix: 16) ?? 0
        self.init(
            red: Double((rgb & 0xFF0000) >> 16) / 255,
            green: Double((rgb & 0x00FF00) >> 8) / 255,
            blue: Double(rgb & 0x0000FF) / 255
        )
    }
}
