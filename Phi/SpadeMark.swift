import SwiftUI

/// The ♠ mark — Phi's (and every Spades Company product's) primary brand
/// element. DESIGN.md reuses this exact glyph in onboarding (§7.2), empty
/// states (§15.1 §I), the AI-processing pulse (§9.3), widgets (§13), and
/// the Dynamic Island (§12) — six-plus places, not one. Built once here as
/// a parameterized component instead of scattering `Text("♠")` everywhere.
///
/// Why bother, for a single character: the moment two of those places need
/// slightly different sizing, or the pulse animation, you either duplicate
/// the animation logic or refactor under time pressure later. Paying the
/// small abstraction cost now avoids that — this is the same reasoning
/// that justifies extracting any small, repeated UI piece into its own
/// file, independent of whether it's visually "interesting."
struct SpadeMark: View {
    var size: CGFloat = 48
    var color: Color = .white

    /// When true, plays the slow opacity/scale pulse defined in
    /// DESIGN.md §9.3 for the "AI is thinking" processing state.
    /// Off by default — the Arrival screen uses a one-time fade-in,
    /// not a loop. A later chunk (lesson generation, upload) will set
    /// this to `true` and get the exact same animation for free.
    var pulsing: Bool = false

    @State private var isPulsing = false

    var body: some View {
        Text("♠")
            .font(.system(size: size, weight: .bold))
            .foregroundStyle(color)
            .opacity(pulsing && isPulsing ? 0.4 : 1.0)
            .scaleEffect(pulsing && isPulsing ? 0.97 : 1.0)
            .onAppear {
                guard pulsing else { return }
                withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) {
                    isPulsing = true
                }
            }
    }
}

#Preview {
    VStack(spacing: 40) {
        SpadeMark(size: 56, color: .white)
        SpadeMark(size: 56, color: .white, pulsing: true)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.black)
}
