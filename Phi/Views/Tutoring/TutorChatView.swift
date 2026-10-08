import SwiftUI

/// The pause-and-ask sheet for one lesson section. The student asks about the
/// section, and Phi's reply streams in. Messages are saved per section.
@MainActor
struct TutorChatView: View {
    @State private var store: TutorChatStore
    @State private var draft = ""
    /// Text handed to the store that is not saved yet. The field clears once the store saves it.
    @State private var sentText: String?
    /// Text whose send failed before it was saved. Retry is offered only while it is still in the field.
    @State private var failedText: String?
    @State private var isSubmitting = false
    @State private var hasLoaded = false
    /// Whether the list sits at the newest message. Auto-scroll follows only while this is true.
    @State private var isNearBottom = true
    @State private var viewportHeight: CGFloat = 0

    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(section: LessonSection, userID: UUID) {
        _store = State(initialValue: TutorChatStore(section: section, userID: userID))
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            Rectangle()
                .fill(Color.phiHairline)
                .frame(height: 1)
            messageList
            if let errorMessage = store.errorMessage {
                errorBanner(errorMessage)
            }
            ChatComposer(text: $draft, canSend: canSend) {
                send()
            }
        }
        .background {
            Color.phiBackground.ignoresSafeArea()
        }
        .task {
            await store.load()
            hasLoaded = true
        }
    }

    // MARK: Sending

    private var canSend: Bool {
        !isSubmitting && !store.isReplying && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private var canRetry: Bool {
        !isSubmitting && failedText != nil && draft == failedText
    }

    private func send() {
        guard canSend else { return }
        let raw = draft
        let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        PhiHaptics.selection()
        isSubmitting = true
        sentText = raw
        failedText = nil
        let countBefore = store.messages.count
        Task {
            await store.send(text, mode: .lessonTeaching)
            // The store appends a message only after it saves it. If the count did not move,
            // nothing was saved, so the text stays in the field for Retry.
            if store.messages.count == countBefore {
                failedText = raw
            } else if draft == raw {
                // Saved. Clear here too, in case the change above has not been observed yet.
                draft = ""
            }
            sentText = nil
            isSubmitting = false
        }
    }

    // MARK: Header

    private var header: some View {
        HStack(spacing: PhiSpacing.sm) {
            Text("Ask about this section")
                .phiFont(.headline)
                .foregroundStyle(Color.phiTextPrimary)
                .accessibilityAddTraits(.isHeader)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button("Done") {
                dismiss()
            }
            .buttonStyle(PhiGhostButtonStyle())
            .accessibilityLabel("Done")
        }
        .padding(.horizontal, PhiSpacing.lg)
        .padding(.top, PhiSpacing.lg)
        .padding(.bottom, PhiSpacing.sm)
    }

    // MARK: Message list

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: PhiSpacing.lg) {
                    if hasLoaded && store.messages.isEmpty && !store.isReplying {
                        Text("Ask anything about this section. Phi will explain, not just answer.")
                            .phiFont(.body)
                            .foregroundStyle(Color.phiTextSecondary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.top, PhiSpacing.xxl)
                    }

                    ForEach(store.messages) { message in
                        ChatMessageRow(role: message.role, text: message.content)
                    }

                    if store.isReplying {
                        liveReply
                    }

                    bottomAnchor
                }
                .padding(.horizontal, PhiSpacing.lg)
                .padding(.vertical, PhiSpacing.md)
            }
            .coordinateSpace(name: ChatScroll.space)
            .scrollDismissesKeyboard(.interactively)
            .background {
                GeometryReader { geo in
                    Color.clear.preference(key: ChatViewportKey.self, value: geo.size.height)
                }
            }
            .onPreferenceChange(ChatViewportKey.self) { height in
                viewportHeight = height
            }
            .onPreferenceChange(ChatBottomKey.self) { bottom in
                // The viewport height arrives on the same pass. Until it does, there is nothing to compare.
                guard viewportHeight > 0 else { return }
                let atBottom = bottom <= viewportHeight + ChatScroll.slack
                if atBottom != isNearBottom {
                    isNearBottom = atBottom
                }
            }
            .onChange(of: store.messages.count) { oldCount, _ in
                let isOwnSend = sentText != nil
                if let sent = sentText {
                    // The store has saved the student's message, so the field can clear.
                    // If they have typed since, their new text stays.
                    if draft == sent {
                        draft = ""
                    }
                    sentText = nil
                }
                // The student's own send always shows. The first load lands at the bottom without animation.
                if isOwnSend || oldCount == 0 || isNearBottom {
                    followLatest(proxy, animated: oldCount > 0 && isNearBottom)
                }
            }
            .onChange(of: store.streamingText) { _, _ in
                if isNearBottom {
                    followLatest(proxy, animated: true)
                }
            }
            .onChange(of: store.isReplying) { _, _ in
                if isNearBottom {
                    followLatest(proxy, animated: true)
                }
            }
        }
    }

    /// The reply while it streams. Until the first words arrive, a short status line holds the space.
    @ViewBuilder
    private var liveReply: some View {
        if store.streamingText.isEmpty {
            Text("Phi is replying")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            ChatMessageRow(role: .assistant, text: store.streamingText)
        }
    }

    /// A one-point anchor at the end of the list. Scrolling to it keeps the newest content in view.
    private var bottomAnchor: some View {
        Color.clear
            .frame(height: 1)
            .id(ChatScroll.bottomID)
            .background {
                GeometryReader { geo in
                    Color.clear.preference(
                        key: ChatBottomKey.self,
                        value: geo.frame(in: .named(ChatScroll.space)).maxY
                    )
                }
            }
    }

    /// Scrolls to the bottom anchor. Animates only when the caller asks and Reduce Motion is off.
    private func followLatest(_ proxy: ScrollViewProxy, animated: Bool) {
        let animation: Animation? = (animated && !reduceMotion) ? PhiMotion.entrance : nil
        withAnimation(animation) {
            proxy.scrollTo(ChatScroll.bottomID, anchor: .bottom)
        }
    }

    // MARK: Error

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .center, spacing: PhiSpacing.sm) {
            Image(systemName: "exclamationmark.circle")
                .phiFont(.body)
                .symbolRenderingMode(.monochrome)
                .foregroundStyle(Color.phiError)
                .accessibilityHidden(true)

            Text(message)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            if canRetry {
                Button("Retry") {
                    send()
                }
                .buttonStyle(PhiGhostButtonStyle())
            }
        }
        .padding(PhiSpacing.md)
        .phiCard()
        .padding(.horizontal, PhiSpacing.lg)
        .padding(.bottom, PhiSpacing.sm)
        .accessibilityElement(children: .contain)
    }
}

// MARK: - Scroll tracking

/// Names and tuning for the list's scroll tracking.
private enum ChatScroll {
    static let space = "tutorChat.scroll"
    static let bottomID = "tutorChat.bottom"
    /// How far the newest message can sit above the bottom edge and still count as at the bottom.
    static let slack: CGFloat = PhiSpacing.xxl * 2
}

/// Reports the bottom anchor's position in the scroll view's coordinate space.
private struct ChatBottomKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

/// Reports the scroll view's height, so the bottom position has something to compare against.
private struct ChatViewportKey: PreferenceKey {
    static let defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}
