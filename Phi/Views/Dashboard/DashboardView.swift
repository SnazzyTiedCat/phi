import SwiftUI

/// The app's first screen and the spine everything else hangs off: a header, a
/// horizontally paginated row of material cards (or a real empty state when
/// there are none), and a profile/settings entry point.
///
/// NO VIEWMODEL, ON PURPOSE — same reasoning as `ArrivalView` in Chunk 1. This
/// screen renders store state and forwards a navigation value; there's no
/// async work or testable business logic to isolate yet. A ViewModel here
/// would be MVVM-for-its-own-sake. Real ones arrive with real import (Chunk 4).
///
/// The `MaterialStore` is injected through the initializer (defaulting to a
/// fresh empty store) so the previews below can seed populated data without
/// any debug toggle reaching the shipped binary.
struct DashboardView: View {
    @State private var store: MaterialStore

    /// Drives the placeholder settings sheet. Local, transient, view-owned —
    /// textbook `@State`.
    @State private var showSettings = false

    init(store: MaterialStore = MaterialStore()) {
        _store = State(initialValue: store)
    }

    var body: some View {
        ZStack {
            Color.c950.ignoresSafeArea() // DESIGN.md: always-dark app background.

            VStack(alignment: .leading, spacing: 20) {
                header
                    .padding(.horizontal, 20)

                if store.materials.isEmpty {
                    emptyState
                } else {
                    cardRow
                    Spacer(minLength: 0)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.top, 8)
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                profileButton
            }
            #if DEBUG
            // TEMPORARY Chunk 3 verification trigger — remove with the harness.
            ToolbarItem(placement: .topBarTrailing) {
                Button("Verify") {
                    Task { await SupabaseVerificationHarness.run() }
                }
                .tint(.white)
            }
            #endif
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet()
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Your Library")
                .phiFont(.h1) // Chunk 1's headline-level type token.
                .foregroundStyle(.white)

            // Caption only when there's something to count.
            // TOKEN NOTE: the color is pinned by spec to the `--c-400`-equivalent
            // (`.c400`). The *size* is not — Chunk 1's Typography defines only
            // H1 / body / label, with no dedicated caption step, so `.phiBody`
            // is the neutral secondary-text choice here. Flagged as a token gap.
            if !store.materials.isEmpty {
                let count = store.materials.count
                Text("\(count) material\(count == 1 ? "" : "s")")
                    .phiFont(.body)
                    .foregroundStyle(Color.c400)
            }
        }
    }

    // MARK: - Populated state

    private var cardRow: some View {
        // iOS 17 paging APIs — no hand-rolled snap math. `.viewAligned` snaps
        // each card to the leading edge; `.contentMargins(.horizontal, 20)`
        // insets the scroll content so cards line up with the 20pt header
        // padding while the ScrollView itself still bleeds edge to edge.
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 16) {
                ForEach(store.materials) { material in
                    NavigationLink(value: material) {
                        MaterialCardView(material: material)
                    }
                    // Without `.plain`, NavigationLink applies list-row styling
                    // that visually breaks the card.
                    .buttonStyle(.plain)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
        .contentMargins(.horizontal, 20, for: .scrollContent)
    }

    // MARK: - Empty state

    private var emptyState: some View {
        VStack(spacing: 16) {
            // TOKEN NOTE: dimmed mark uses the `--c-800`-equivalent (`.c800`)
            // rather than a hardcoded opacity, per spec.
            SpadeMark(size: 64, color: .c800)

            Text("No materials yet.")
                .phiFont(.body)
                .foregroundStyle(Color.c400)
        }
        // Fill the space below the header and center within it. Deliberately no
        // CTA button: import doesn't exist until Chunk 4, and a button that
        // goes nowhere is worse than no button.
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Toolbar / settings

    private var profileButton: some View {
        Button {
            showSettings = true
        } label: {
            Image(systemName: "person.crop.circle")
                // Monochrome chrome: the gold accent is reserved, and the
                // AccentColor asset is empty (default would render system
                // blue), so tint white to stay on-brand.
                .foregroundStyle(.white)
        }
        // An SF Symbol isn't self-describing to VoiceOver; name what it does.
        .accessibilityLabel("Settings")
    }
}

// Two preview variants exercise both layout branches. The empty case is the
// shipped reality this chunk; the seeded case checks real-world truncation on
// titles of varying length (not just tidy placeholder strings).

#Preview("Empty") {
    NavigationStack {
        DashboardView()
    }
    .preferredColorScheme(.dark)
}

#Preview("Populated") {
    let store = MaterialStore()
    store.materials = [
        Material(id: UUID(), title: "Calculus"),
        Material(id: UUID(), title: "Organic Chemistry: Reactions and Mechanisms of Carbonyl Compounds"),
        Material(id: UUID(), title: "Physics 101"),
        Material(id: UUID(), title: "Introduction to Macroeconomics and Global Trade Policy"),
        Material(id: UUID(), title: "Linear Algebra")
    ]
    return NavigationStack {
        DashboardView(store: store)
            .navigationDestination(for: Material.self) { material in
                TutoringView(material: material)
            }
    }
    .preferredColorScheme(.dark)
}
