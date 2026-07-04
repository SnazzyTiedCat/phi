import SwiftUI

/// The Spades Company's grayscale ramp, plus each product's single accent color.
///
/// PLACEHOLDER VALUES: DESIGN.md defines this scale as design tokens
/// (`--c-950` through `--c-white`), but the actual hex values live in the
/// base `DESIGN.md` token table (§2), which wasn't in the docs available
/// for this chunk. Swap these for the real values before this ships —
/// everything below just approximates a believable near-black-to-white
/// ramp so the screen looks right in the meantime.
extension Color {
    // Grayscale ramp, darkest to lightest.
    static let c950 = Color(hex: "#0A0A0A") // App background
    static let c900 = Color(hex: "#111111")
    static let c850 = Color(hex: "#1A1A1A")
    static let c800 = Color(hex: "#242424")
    static let c700 = Color(hex: "#333333")
    static let c600 = Color(hex: "#4D4D4D")
    static let c500 = Color(hex: "#777777")
    static let c400 = Color(hex: "#999999")

    /// Phi's product accent (DESIGN.md §2.5 — one accent per product).
    /// FLAGGED DISCREPANCY: CLAUDE.md lists this as `#d4a74a`, PROMPTING.md
    /// lists it as `#C9A84C`. Same gold family, different exact value.
    /// Pick one source of truth before this constant is used anywhere else.
    static let phiGold = Color(hex: "#C9A84C")
}

/// SwiftUI's `Color` has no built-in hex initializer — this is the standard
/// small utility every SwiftUI design-token file ends up needing.
extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")))
        var rgb: UInt64 = 0
        scanner.scanHexInt64(&rgb)
        self.init(
            red: Double((rgb & 0xFF0000) >> 16) / 255,
            green: Double((rgb & 0x00FF00) >> 8) / 255,
            blue: Double(rgb & 0x0000FF) / 255
        )
    }
}
