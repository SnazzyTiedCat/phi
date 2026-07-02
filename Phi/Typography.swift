import SwiftUI

/// Space Mono text styles, mapped from DESIGN.md's semantic type scale.
///
/// MANUAL SETUP REQUIRED (can't be automated from here):
/// 1. Download Space Mono (Regular + Bold) from Google Fonts.
/// 2. Drag the .ttf files into the Xcode project — check "Copy items if
///    needed" and add them to your app target.
/// 3. Add a "Fonts provided by application" (UIAppFonts) array to
///    Info.plist listing each .ttf filename exactly.
/// Skipping step 3 does NOT crash the app — iOS just silently falls back
/// to the system font, which is an easy thing to miss during a quick look.
extension Font {
    static func spaceMono(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name = weight == .bold ? "SpaceMono-Bold" : "SpaceMono-Regular"
        return .custom(name, size: size)
    }

    // Semantic sizes, named for their role rather than their pixel value —
    // so a future type-scale change touches this file only, not every view.
    static let phiH1 = Font.spaceMono(28, weight: .bold)
    static let phiBody = Font.spaceMono(15)
    static let phiLabel = Font.spaceMono(11, weight: .bold)
}
