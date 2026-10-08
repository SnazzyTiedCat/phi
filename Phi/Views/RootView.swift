import SwiftUI

/// The app's launch destination: the library, wrapped in the navigation stack
/// every other screen attaches to.
///
/// The library store lives here and is injected into the environment, so the
/// Dashboard, the reader, and later screens all read the same instance.
///
/// This lives here rather than in `PhiApp` because an `App` struct exists to
/// declare what scenes exist, not to host the navigation container. Keeping it
/// in an ordinary View keeps the whole thing previewable in isolation.
struct RootView: View {
    @State private var materials = MaterialStore()

    var body: some View {
        NavigationStack {
            DashboardView()
                .navigationDestination(for: Material.self) { material in
                    TutoringView(material: material)
                }
        }
        .environment(materials)
        // Establish the anonymous cloud identity off the first-paint path.
        // The Dashboard loads the library once this resolves.
        .task {
            await IdentityStore.shared.bootstrap()
        }
    }
}

#Preview {
    RootView()
        .preferredColorScheme(.dark)
}
