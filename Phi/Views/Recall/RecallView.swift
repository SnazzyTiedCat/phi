import Foundation
import SwiftUI

/// Practice for one lesson section: flashcards and a quiz. The store makes and
/// saves the content. This view shows it and passes answers back to the store.
///
/// The reader that presents this sheet must put a `MaterialStore` in the environment.
struct RecallView: View {
    let section: LessonSection
    let userID: UUID

    // RootView injects the one shared MaterialStore on the navigation stack. This
    // sheet inherits it, so no extra injection is needed here.
    @Environment(MaterialStore.self) private var materials

    @State private var mode: RecallMode = .cards
    @State private var store: RecallStore?
    @State private var cards: [Flashcard]?
    @State private var questions: [QuizQuestion]?
    /// The error for the mode on screen. Cleared when that mode loads again.
    @State private var loadError: String?

    // Explicit, because private state makes the synthesized memberwise init private.
    init(section: LessonSection, userID: UUID) {
        self.section = section
        self.userID = userID
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.lg) {
            Text(section.title)
                .phiFont(.title)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            modeControl

            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .padding(.horizontal, PhiSpacing.lg)
        .padding(.top, PhiSpacing.lg)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(Color.phiBackground.ignoresSafeArea())
        .task(id: mode) {
            await load(mode)
        }
    }

    // MARK: - Mode control

    /// Two buttons, not a Picker. The native segmented tint defaults to system blue,
    /// and the gold accent is reserved for the primary action.
    private var modeControl: some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        return HStack(spacing: PhiSpacing.xs) {
            ForEach(RecallMode.allCases, id: \.self) { option in
                modeSegment(option)
            }
        }
        .padding(PhiSpacing.xs)
        .background(Color.phiSurface, in: shape)
        .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))
    }

    private func modeSegment(_ option: RecallMode) -> some View {
        let isSelected = option == mode
        let shape = RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
        return Button {
            mode = option
        } label: {
            Text(option.title)
                .phiFont(.body)
                .foregroundStyle(isSelected ? Color.phiTextPrimary : Color.phiTextSecondary)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(isSelected ? Color.phiSurfaceHigh : Color.clear, in: shape)
                .contentShape(shape)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let loadError = loadError {
            errorState(loadError)
        } else {
            switch mode {
            case .cards:
                cardsContent
            case .quiz:
                quizContent
            }
        }
    }

    @ViewBuilder
    private var cardsContent: some View {
        if let cards = cards {
            if cards.isEmpty {
                emptyState(
                    symbol: "rectangle.on.rectangle",
                    message: "Phi builds cards from this section's text. It did not find enough here to make any. A longer section gives it more to work with."
                )
            } else {
                FlashcardDeckView(cards: cards)
            }
        } else {
            RecallPlaceholderCard(message: "Phi is making cards for this section.")
        }
    }

    @ViewBuilder
    private var quizContent: some View {
        if let store = store, let questions = questions {
            if questions.isEmpty {
                emptyState(
                    symbol: "list.bullet.rectangle",
                    message: "Phi writes the quiz from this section's text. It did not find enough here to write any questions. A longer section gives it more to work with."
                )
            } else {
                QuizView(store: store, questions: questions)
            }
        } else {
            RecallPlaceholderCard(message: "Phi is writing the quiz for this section.")
        }
    }

    /// Explains how the content is made. No button, because there is no next step to offer.
    private func emptyState(symbol: String, message: String) -> some View {
        VStack(spacing: PhiSpacing.md) {
            Image(systemName: symbol)
                .imageScale(.large)
                .foregroundStyle(Color.phiTextTertiary)
                .accessibilityHidden(true)
            Text(message)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(PhiSpacing.xl)
        .frame(maxWidth: .infinity)
    }

    private func errorState(_ message: String) -> some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            HStack(alignment: .top, spacing: PhiSpacing.sm) {
                Image(systemName: "exclamationmark.circle")
                    .foregroundStyle(Color.phiError)
                    .accessibilityHidden(true)
                Text(message)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextPrimary)
            }
            Button("Try again") {
                Task { await load(mode) }
            }
            .buttonStyle(PhiSecondaryButtonStyle())
        }
        .padding(PhiSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .phiCard()
    }

    // MARK: - Loading

    /// Loads the content for `mode` once. A cancelled load, such as a switch to the
    /// other mode, leaves no error behind.
    @MainActor
    private func load(_ mode: RecallMode) async {
        loadError = nil

        let active: RecallStore
        if let existing = store {
            active = existing
        } else {
            active = RecallStore(materials: materials)
            store = active
        }

        switch mode {
        case .cards:
            guard cards == nil else { return }
            do {
                cards = try await active.flashcards(for: section, userID: userID)
            } catch {
                guard !Task.isCancelled else { return }
                loadError = error.localizedDescription
            }
        case .quiz:
            guard questions == nil else { return }
            do {
                questions = try await active.quizQuestions(for: section, userID: userID)
            } catch {
                guard !Task.isCancelled else { return }
                loadError = error.localizedDescription
            }
        }
    }
}

/// The two practice modes, in segment order.
enum RecallMode: CaseIterable, Hashable {
    case cards
    case quiz

    var title: String {
        switch self {
        case .cards: return "Cards"
        case .quiz: return "Quiz"
        }
    }
}

/// One card size for the real cards and the loading placeholder, so the layout
/// does not jump when the content arrives.
enum RecallLayout {
    static let cardMinHeight: CGFloat = 280
}

/// Stands in for a card while its content loads. Same padding and minimum height as a real card.
private struct RecallPlaceholderCard: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            Text(message)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)

            RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
                .fill(Color.phiSurfaceHigh)
                .frame(maxWidth: .infinity)
                .frame(height: 14)

            RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
                .fill(Color.phiSurfaceHigh)
                .frame(maxWidth: .infinity)
                .frame(height: 14)
                .padding(.trailing, 96)

            Spacer(minLength: 0)
        }
        .padding(PhiSpacing.xl)
        .frame(maxWidth: .infinity, minHeight: RecallLayout.cardMinHeight, alignment: .topLeading)
        .phiCard()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(message)
    }
}
