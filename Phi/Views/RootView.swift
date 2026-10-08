import SwiftUI

/// The app's launch destination: the Dashboard, wrapped in the navigation
/// spine every other screen attaches to.
///
/// The app opens straight to the library (the Dashboard), with no gate in
/// front of it.
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
