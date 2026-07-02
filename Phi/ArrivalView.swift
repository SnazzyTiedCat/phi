import SwiftUI

/// Screen 1 of onboarding (DESIGN.md §7.2) — the Arrival screen.
/// Full-screen, centered: ♠ mark, then app name, then tagline, each
/// staggered in on its own delay — then a Continue button pinned above
/// the safe area. Shown exactly once, ever, per the one-time behavior
/// this chunk adds.
///
/// NO VIEWMODEL, ON PURPOSE. This view has exactly one piece of logic —
/// "tell the store onboarding is done" — with no async work and nothing
/// worth unit-testing independently of the view itself. Wrapping that in
/// a ViewModel now would be following the MVVM pattern for its own sake,
/// not because this screen needs it. Real ViewModels arrive with Chunk 2+
/// (login, upload) once there's actual async/error-handling logic to
/// isolate from the view.
struct ArrivalView: View {
    /// Injected rather than constructed inline, so RootView (and any
    /// future preview or test) controls which store instance is used.
    var onboardingStore: OnboardingStore
    var onContinue: () -> Void

    // Four separate animation flags, not one — DESIGN.md's timing is
    // "mark, then name 200ms later, then tagline 400ms after that,"
    // which means three offset animations, not one shared fade.
    @State private var showMark = false
    @State private var showName = false
    @State private var showTagline = false
    @State private var showButton = false

    var body: some View {
        ZStack {
            Color.c950.ignoresSafeArea()

            VStack(spacing: 16) {
                Spacer()

                SpadeMark(size: 56, color: .white)
                    .opacity(showMark ? 1 : 0)

                Text("Phi")
                    .font(.phiH1)
                    .foregroundStyle(.white)
                    .opacity(showName ? 1 : 0)
                    .offset(y: showName ? 0 : 8)

                Text("AI that actually teaches you.")
                    .font(.phiBody)
                    .foregroundStyle(Color.c400)
                    .opacity(showTagline ? 1 : 0)
                    .offset(y: showTagline ? 0 : 8)

                Spacer()

                Button(action: handleContinue) {
                    Text("CONTINUE")
                        .font(.phiLabel)
                        .tracking(2) // approximates DESIGN.md's 0.08em letter-spacing
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white, in: .capsule)
                }
                .opacity(showButton ? 1 : 0)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
        .onAppear(perform: animateIn)
    }

    private func animateIn() {
        withAnimation(.easeOut(duration: 0.9)) { showMark = true }
        withAnimation(.easeOut(duration: 0.5).delay(0.2)) { showName = true }
        withAnimation(.easeOut(duration: 0.5).delay(0.6)) { showTagline = true }
        withAnimation(.easeOut(duration: 0.5).delay(1.0)) { showButton = true }
    }

    private func handleContinue() {
        onboardingStore.completeOnboarding()
        onContinue()
    }
}

#Preview {
    ArrivalView(onboardingStore: OnboardingStore(), onContinue: {})
}
