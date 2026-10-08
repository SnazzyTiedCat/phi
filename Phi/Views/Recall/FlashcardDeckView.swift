import SwiftUI

/// One flashcard at a time. A tap or a sideways swipe flips the card. "Again" and
/// "Got it" move the deck along. Ratings stay in view state and are not saved.
struct FlashcardDeckView: View {
    /// The lesson's cards. The caller passes a non-empty deck.
    let cards: [Flashcard]

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @State private var index = 0
    @State private var isFlipped = false
    @State private var gotItCount = 0
    @State private var isFinished = false

    private var current: Flashcard {
        cards[index]
    }

    private var cardLabel: String {
        isFlipped ? "Answer. \(current.back)" : "Question. \(current.front)"
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PhiSpacing.md) {
                if isFinished {
                    summary
                } else {
                    progress
                    card
                    actions
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
    }

    // MARK: - Progress

    private var progress: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.xs) {
            Text("\(index + 1) of \(cards.count)")
                .phiFont(.caption)
                .foregroundStyle(Color.phiTextSecondary)

            ProgressView(value: Double(index + 1), total: Double(cards.count))
                .progressViewStyle(.linear)
                .tint(Color.phiTextSecondary)
                .accessibilityHidden(true)
        }
    }

    // MARK: - Card

    private var card: some View {
        ZStack {
            cardFace(label: "Question", text: current.front, isAnswer: false)
                .opacity(isFlipped ? 0 : 1)
                .rotation3DEffect(.degrees(isFlipped ? 90 : 0), axis: (x: 0, y: 1, z: 0))

            cardFace(label: "Answer", text: current.back, isAnswer: true)
                .opacity(isFlipped ? 1 : 0)
                .rotation3DEffect(.degrees(isFlipped ? 0 : -90), axis: (x: 0, y: 1, z: 0))
        }
        .padding(PhiSpacing.xl)
        .frame(maxWidth: .infinity, minHeight: RecallLayout.cardMinHeight, alignment: .topLeading)
        .phiCard()
        .contentShape(RoundedRectangle(cornerRadius: PhiRadius.card, style: .continuous))
        .onTapGesture {
            flip()
        }
        .simultaneousGesture(
            DragGesture(minimumDistance: 24)
                .onEnded { value in
                    // Only a mostly sideways swipe flips, so a downward drag still reaches the sheet.
                    if abs(value.translation.width) > abs(value.translation.height) {
                        flip()
                    }
                }
        )
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(cardLabel)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            flip()
        }
    }

    private func cardFace(label: String, text: String, isAnswer: Bool) -> some View {
        let style: PhiTextStyle = isAnswer ? .lesson : .title
        return VStack(alignment: .leading, spacing: PhiSpacing.md) {
            Text(label)
                .phiTracking(.label)
                .phiFont(.label)
                .foregroundStyle(Color.phiTextSecondary)

            Text(text)
                .phiFont(style)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            Text("Tap or swipe to flip")
                .phiFont(.caption)
                .foregroundStyle(Color.phiTextSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }

    private func flip() {
        // A short spring with an opacity and rotation change. Reduce Motion gets no animation.
        let animation: Animation? = reduceMotion ? nil : Animation.spring(response: 0.4, dampingFraction: 0.86)
        withAnimation(animation) {
            isFlipped.toggle()
        }
    }

    // MARK: - Rating

    @ViewBuilder
    private var actions: some View {
        if isFlipped {
            HStack(spacing: PhiSpacing.md) {
                Button("Again") {
                    rate(gotIt: false)
                }
                .buttonStyle(PhiSecondaryButtonStyle())

                Button("Got it") {
                    rate(gotIt: true)
                }
                .buttonStyle(PhiPrimaryButtonStyle())
            }
        }
    }

    /// Moves to the next card, which starts on its front. The reset is not animated,
    /// so the next question does not flip back.
    private func rate(gotIt: Bool) {
        if gotIt {
            gotItCount += 1
        }
        isFlipped = false
        if index + 1 < cards.count {
            index += 1
        } else {
            isFinished = true
        }
    }

    private func restart() {
        index = 0
        gotItCount = 0
        isFlipped = false
        isFinished = false
    }

    // MARK: - Summary

    private var summary: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            VStack(alignment: .leading, spacing: PhiSpacing.md) {
                Text("Deck complete")
                    .phiFont(.headline)
                    .foregroundStyle(Color.phiTextPrimary)

                Text("Got it on \(gotItCount) of \(cards.count) cards.")
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextSecondary)
            }
            .padding(PhiSpacing.xl)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .phiCard()

            Button("Start again") {
                restart()
            }
            .buttonStyle(PhiSecondaryButtonStyle())
        }
    }
}
