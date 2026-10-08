import SwiftUI

/// Motion tokens. Springs only, no linear easing. Loops are reserved for live
/// status, and this file adds none.
enum PhiMotion {
    /// Reveal on appear.
    static let entrance: Animation = .spring(response: 0.6, dampingFraction: 0.86)
    /// Press in and out.
    static let press: Animation = .spring(response: 0.25, dampingFraction: 0.8)
    /// Vertical travel for entrance reveals (DESIGN.md's translateY(24px)).
    static let travel: CGFloat = 24
}

extension View {
    /// Fades and rises in once per appearance. Under Reduce Motion the rise is
    /// dropped and only the fade runs. Re-renders do not replay it.
    func phiEntrance(delay: Double = 0) -> some View {
        modifier(PhiEntranceModifier(delay: delay))
    }
}

private struct PhiEntranceModifier: ViewModifier {
    let delay: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isShown = false

    func body(content: Content) -> some View {
        content
            .opacity(isShown ? 1 : 0)
            .offset(y: isShown || reduceMotion ? 0 : PhiMotion.travel)
            .onAppear {
                // State survives redraws, so this reveals once per appearance.
                guard !isShown else { return }
                withAnimation(PhiMotion.entrance.delay(delay)) {
                    isShown = true
                }
            }
    }
}
