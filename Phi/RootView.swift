import SwiftUI

/// The app's launch destination: the Dashboard, wrapped in the navigation
/// spine every other screen attaches to.
///
/// CHUNK 2 CHANGE: the previous onboarding branch (Arrival vs. main app, gated
/// on `OnboardingStore.hasCompletedOnboarding`) is intentionally gone — the app
/// now always opens straight to the Dashboard.
///
/// `ArrivalView` and `OnboardingStore` are deliberately left in the project,
/// merely unreferenced from routing. Per the Orchestrator's decision log, Chunk
/// 3 repurposes their "shown once, persisted" mechanism for the Welcome Sheet;
/// whether it reuses, adapts, or discards pieces is Chunk 3's call, not this
/// one's. Leaving both files in place keeps that door open instead of forcing a
/// rebuild.
///
/// This lives here rather than in `PhiApp` because an `App` struct exists to
/// declare *what scenes exist*, not to host the navigation container — keeping
/// it in an ordinary View keeps the whole thing previewable in isolation.
struct RootView: View {
    var body: some View {
        NavigationStack {
            DashboardView()
                .navigationDestination(for: Material.self) { material in
                    TutoringView(material: material)
                }
        }
        // Establish the anonymous cloud identity off the first-paint path.
        // `.task` runs after the view appears (not in `PhiApp.init`), so the
        // Dashboard renders immediately; identity resolves in the background.
        // Chunk 4 is the first consumer of `IdentityStore.shared.currentUserID`.
        .task {
            await IdentityStore.shared.bootstrap()
        }
    }
}

#Preview {
    RootView()
        .preferredColorScheme(.dark)
}
