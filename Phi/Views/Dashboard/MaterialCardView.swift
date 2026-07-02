import SwiftUI

/// A single material card in the Dashboard's horizontal row. Its own file per
/// Chunk 1's convention of giving repeated UI pieces a home of their own
/// (same reasoning as `SpadeMark`).
///
/// Sizing and shape are literal spec, not preference:
/// - 168 × 210 pt — "slightly taller than a square" (≈ 1 : 1.25).
/// - `cornerRadius: 28, style: .continuous` — the `.continuous` (superellipse)
///   corner is what reads as Spades sleekness and matches the app-icon
///   construction in PRODUCT_DESIGN.md §14. A plain corner radius looks
///   noticeably more generic here.
struct MaterialCardView: View {
    let material: Material

    var body: some View {
        RoundedRectangle(cornerRadius: 28, style: .continuous)
            // TOKEN NOTE: Chunk 1's Colors ramp has no dedicated card/surface
            // token, so per the prompt we fall back to the `--c-900`-equivalent
            // (`.c900`) as a flat fill. No glass material yet — that's a design
            // call flagged back to the Prompter, not silently finalized here.
            .fill(Color.c900)
            .frame(width: 168, height: 210)
            .overlay(alignment: .bottomLeading) {
                // Bottom-anchored title. Real textbook filenames are
                // unpredictable in length, so this must clamp to two lines and
                // tail-truncate rather than overflow the card.
                Text(material.title)
                    .font(.phiBody)
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)
                    .truncationMode(.tail)
                    .padding(16)
            }
    }
}

#Preview {
    HStack(spacing: 16) {
        MaterialCardView(material: Material(id: UUID(), title: "Calculus"))
        MaterialCardView(
            material: Material(
                id: UUID(),
                title: "Organic Chemistry: Reactions and Mechanisms of Carbonyl Compounds"
            )
        )
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.c950)
}
