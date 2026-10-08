import SwiftUI

/// The lesson reader for one material. The store builds the lesson once and caches it.
/// Sections show in reading order, and a bar at the bottom reads them aloud with the
/// current word highlighted. Ask and Practice open for the section in focus.
struct TutoringView: View {
    let material: Material

    @Environment(MaterialStore.self) private var materials
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Made on first use, because the environment store is only readable from the view.
    @State private var lessonStore: LessonStore? = nil
    @State private var reader: LessonReader
    @State private var phase: Phase = .loading
    /// Set while a build runs, so a second appearance does not start another call.
    @State private var isGenerating = false
    @State private var showConsent = false
    @State private var showSettings = false
    @State private var showConnecting = false
    @State private var tutorTarget: LessonSheetTarget? = nil
    @State private var recallTarget: LessonSheetTarget? = nil

    init(material: Material) {
        self.material = material
        _reader = State(initialValue: LessonReader())
    }

    var body: some View {
        ZStack {
            Color.phiBackground.ignoresSafeArea()
            content
        }
        .navigationTitle(material.title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await start()
        }
        .onDisappear {
            reader.suspend()
        }
        .sheet(isPresented: $showConsent, onDismiss: { consentDismissed() }) {
            ConsentSheet(onAccept: { retry() })
        }
        .sheet(isPresented: $showSettings, onDismiss: { settingsDismissed() }) {
            SettingsSheet()
        }
        .sheet(item: $tutorTarget) { target in
            TutorChatView(section: target.section, userID: target.userID)
        }
        .sheet(item: $recallTarget) { target in
            RecallView(section: target.section, userID: target.userID)
        }
        .alert("Phi is still connecting. Try again in a moment.", isPresented: $showConnecting) {
            Button("OK", role: .cancel) {}
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            LessonSkeletonView()
        case .needsConsent:
            PhiEmptyState(
                symbol: "hand.raised",
                title: "Phi needs your OK first",
                message: "Read what Phi does with your material before it builds this lesson.",
                actionLabel: "Review and accept",
                action: { showConsent = true }
            )
        case .missingKey:
            PhiEmptyState(
                symbol: "key",
                title: "Add your API key",
                message: "Phi uses your own Anthropic API key to build lessons. Add it in Settings.",
                actionLabel: "Open Settings",
                action: { showSettings = true }
            )
        case .failed(let message):
            PhiEmptyState(
                symbol: "exclamationmark.triangle",
                title: "Phi couldn't build this lesson",
                message: message,
                actionLabel: "Try again",
                action: { retry() }
            )
        case .ready:
            lessonScroll
        }
    }

    private var lessonScroll: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(spacing: PhiSpacing.xl) {
                    ForEach(Array(reader.rows.enumerated()), id: \.element.id) { index, row in
                        LessonSectionView(
                            index: index,
                            section: row,
                            rendered: reader.rendered[index],
                            highlight: reader.highlight(forRow: index),
                            entranceDelay: Double(min(index, 6)) * 0.06
                        )
                        .id(row.id)
                    }
                }
                .padding(.horizontal, PhiSpacing.lg)
                .padding(.top, PhiSpacing.lg)
                .padding(.bottom, PhiSpacing.xl)
                .frame(maxWidth: .infinity)
            }
            .onChange(of: reader.focusIndex) { _, newValue in
                scrollToRow(newValue, proxy: proxy)
            }
        }
        .safeAreaInset(edge: .bottom) {
            NarrationBar(
                reader: reader,
                onAsk: { askAboutFocusedSection() },
                onPractice: { practiceFocusedSection() }
            )
        }
    }

    /// Brings the row being read to the top. Under Reduce Motion the jump is instant.
    private func scrollToRow(_ index: Int, proxy: ScrollViewProxy) {
        guard reader.rows.indices.contains(index) else { return }
        let target = reader.rows[index].id
        if reduceMotion {
            proxy.scrollTo(target, anchor: .top)
        } else {
            withAnimation(PhiMotion.entrance) {
                proxy.scrollTo(target, anchor: .top)
            }
        }
    }

    // MARK: - Loading

    /// Runs on appear. Consent comes first, then the lesson loads.
    private func start() async {
        if case .ready = phase { return }
        guard ConsentStore.shared.hasAcceptedAIUse else {
            phase = .needsConsent
            showConsent = true
            return
        }
        await generate()
    }

    /// Builds or loads the lesson, then sets the phase to match the result.
    private func generate() async {
        guard !isGenerating else { return }
        isGenerating = true
        defer { isGenerating = false }
        phase = .loading

        do {
            let rows = try await makeOrReuseLessonStore().sections(for: material)
            guard !rows.isEmpty else {
                phase = .failed(Self.fallbackMessage)
                return
            }
            reader.load(rows: rows)
            phase = .ready
        } catch is CancellationError {
            // The screen went away mid-build. The next appearance starts again.
            return
        } catch AnthropicError.missingAPIKey {
            phase = .missingKey
        } catch {
            phase = .failed(Self.message(for: error))
        }
    }

    private func retry() {
        Task { await generate() }
    }

    /// Dismissing consent without accepting leaves a state with its own button.
    private func consentDismissed() {
        if !ConsentStore.shared.hasAcceptedAIUse {
            phase = .needsConsent
        }
    }

    /// The key may have been added in Settings, so the lesson is tried again.
    private func settingsDismissed() {
        guard case .missingKey = phase else { return }
        retry()
    }

    private func makeOrReuseLessonStore() -> LessonStore {
        if let existing = lessonStore {
            return existing
        }
        let created = LessonStore(materials: materials)
        lessonStore = created
        return created
    }

    // MARK: - Ask and Practice

    private func askAboutFocusedSection() {
        guard let section = reader.focusedRow else { return }
        guard let userID = IdentityStore.shared.currentUserID else {
            showConnecting = true
            return
        }
        tutorTarget = LessonSheetTarget(section: section, userID: userID)
    }

    private func practiceFocusedSection() {
        guard let section = reader.focusedRow else { return }
        guard let userID = IdentityStore.shared.currentUserID else {
            showConnecting = true
            return
        }
        // Pause first, so the reading does not run under the sheet.
        if reader.isPlaying {
            reader.pause()
        }
        recallTarget = LessonSheetTarget(section: section, userID: userID)
    }

    // MARK: - Helpers

    private static let fallbackMessage = "Phi couldn't build this lesson. Try again."

    private static func message(for error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? fallbackMessage
    }

    private enum Phase {
        case loading
        case needsConsent
        case missingKey
        case failed(String)
        case ready
    }
}

/// The section and user an Ask or Practice sheet opens with, captured at the tap.
private struct LessonSheetTarget: Identifiable {
    let id = UUID()
    let section: LessonSection
    let userID: UUID
}
