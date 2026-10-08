import SwiftUI
import UniformTypeIdentifiers

/// The library: the person's imported materials as cards, with import, open,
/// and delete. Opening a card pushes its `Material` onto the root stack, and
/// `RootView` routes that value to the reader.
///
/// The store comes from the environment, injected by `RootView`. The screen
/// renders store state and forwards the person's actions to it.
struct DashboardView: View {
    @Environment(MaterialStore.self) private var store

    @State private var showSettings = false
    @State private var isImporterPresented = false
    /// True while a picked file is read and uploaded.
    @State private var isImporting = false

    private let columns = [GridItem(.adaptive(minimum: 160, maximum: 220), spacing: PhiSpacing.lg)]

    /// PDF, plain text, and Markdown. Markdown is left out if the system has no type for `.md`.
    private static let importTypes: [UTType] = {
        var types: [UTType] = [.pdf, .plainText]
        // VERIFY: UTType(filenameExtension: "md") resolves on device. If it returns nil, .md files cannot be picked.
        if let markdown = UTType(filenameExtension: "md") {
            types.append(markdown)
        }
        return types
    }()

    var body: some View {
        ZStack {
            Color.phiBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: PhiSpacing.lg) {
                header

                if isImporting {
                    importingBanner
                }

                if let message = store.errorMessage {
                    errorBanner(message)
                }

                ScrollView {
                    libraryContent
                        .frame(maxWidth: .infinity, alignment: .top)
                }
                .refreshable {
                    await store.load()
                }
            }
            .padding(.horizontal, PhiSpacing.lg)
            .padding(.top, PhiSpacing.sm)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "person.crop.circle")
                        .foregroundStyle(Color.phiTextPrimary)
                }
                .accessibilityLabel("Settings")
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isImporterPresented = true
                } label: {
                    Image(systemName: "plus")
                        .foregroundStyle(Color.phiTextPrimary)
                }
                .accessibilityLabel("Import material")
                .disabled(isImporting)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .fileImporter(
            isPresented: $isImporterPresented,
            allowedContentTypes: DashboardView.importTypes
        ) { result in
            handlePick(result)
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet()
        }
        // RootView's task resolves the identity. Load only once it is set, so the
        // first fetch is not refused as "still connecting". The load runs again
        // whenever the identity changes.
        .task(id: IdentityStore.shared.currentUserID) {
            guard IdentityStore.shared.currentUserID != nil else { return }
            await store.load()
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.xs) {
            Text("Library")
                .phiFont(.title)
                .foregroundStyle(Color.phiTextPrimary)
                .accessibilityAddTraits(.isHeader)

            if !store.materials.isEmpty {
                Text(countText)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var countText: String {
        let count = store.materials.count
        return "\(count) material\(count == 1 ? "" : "s")"
    }

    // MARK: - Library

    @ViewBuilder
    private var libraryContent: some View {
        if !store.materials.isEmpty {
            grid
        } else if store.isLoading {
            ProgressView()
                .frame(maxWidth: .infinity)
                .padding(.top, PhiSpacing.xxl)
        } else if !isImporting {
            emptyState
        }
    }

    private var grid: some View {
        LazyVGrid(columns: columns, spacing: PhiSpacing.lg) {
            // The stagger stops at eight, so a card far down a long list does not wait to appear.
            ForEach(Array(store.materials.enumerated()), id: \.element.id) { index, material in
                NavigationLink(value: material) {
                    MaterialCardView(material: material)
                }
                .buttonStyle(.plain)
                .phiEntrance(delay: Double(min(index, 8)) * 0.06)
                .contextMenu {
                    Button(role: .destructive) {
                        Task { await store.delete(material) }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        PhiEmptyState(
            symbol: "doc.text",
            title: "Add your first material",
            message: "Import a PDF, .txt, or .md file to start a lesson from it.",
            actionLabel: "Import material",
            action: { isImporterPresented = true }
        )
        .padding(.top, PhiSpacing.xl)
    }

    // MARK: - Banners

    private var importingBanner: some View {
        HStack(spacing: PhiSpacing.md) {
            ProgressView()
            Text("Importing your file")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)
        }
        .padding(PhiSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .phiCard()
        .accessibilityElement(children: .combine)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: PhiSpacing.md) {
            Image(systemName: "exclamationmark.circle")
                .foregroundStyle(Color.phiError)
                .accessibilityHidden(true)

            Text(message)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button {
                store.errorMessage = nil
            } label: {
                Image(systemName: "xmark")
                    .foregroundStyle(Color.phiTextSecondary)
                    .frame(width: 44, height: 44)
            }
            .accessibilityLabel("Dismiss message")
        }
        .padding(PhiSpacing.lg)
        .phiCard()
    }

    // MARK: - Import

    /// Routes the picker's result. Cancelling the picker is not an error.
    @MainActor
    private func handlePick(_ result: Result<URL, Error>) {
        switch result {
        case .success(let url):
            Task { await importPicked(url) }
        case .failure(let error):
            // VERIFY: the picker reports a cancel as CocoaError.userCancelled.
            if (error as? CocoaError)?.code == .userCancelled { return }
            store.errorMessage = "Phi couldn't open that file. Try again."
        }
    }

    @MainActor
    private func importPicked(_ url: URL) async {
        isImporting = true
        defer { isImporting = false }
        do {
            // The store opens and closes the file's security scope itself, so it is not started here.
            _ = try await store.importFile(at: url)
            PhiHaptics.success()
        } catch {
            // The store has set errorMessage, and the banner shows it.
            PhiHaptics.error()
        }
    }
}

#if DEBUG
#Preview("Empty") {
    NavigationStack {
        DashboardView()
    }
    .environment(MaterialStore.preview(materials: []))
    .preferredColorScheme(.dark)
}

#Preview("Populated") {
    NavigationStack {
        DashboardView()
            .navigationDestination(for: Material.self) { material in
                TutoringView(material: material)
            }
    }
    .environment(MaterialStore.preview(materials: [
        Material(id: UUID(), title: "Calculus"),
        Material(id: UUID(), title: "Organic Chemistry: Reactions and Mechanisms of Carbonyl Compounds"),
        Material(id: UUID(), title: "Physics 101"),
        Material(id: UUID(), title: "Introduction to Macroeconomics and Global Trade Policy"),
        Material(id: UUID(), title: "Linear Algebra")
    ]))
    .preferredColorScheme(.dark)
}
#endif
