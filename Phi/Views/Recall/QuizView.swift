import Foundation
import SwiftUI

/// The lesson quiz, one card per question. Multiple-choice rows are checked on tap.
/// Each short-answer check goes to the store for grading. Grades are not kept.
struct QuizView: View {
    let store: RecallStore
    /// The lesson's questions. The caller passes a non-empty list.
    let questions: [QuizQuestion]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PhiSpacing.lg) {
                ForEach(questions.indices, id: \.self) { index in
                    QuizQuestionCard(number: index + 1, question: questions[index], store: store)
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
    }
}

private struct QuizQuestionCard: View {
    let number: Int
    let question: QuizQuestion
    let store: RecallStore

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            Text("Question \(number)")
                .phiTracking(.label)
                .phiFont(.label)
                .foregroundStyle(Color.phiTextSecondary)

            Text(question.question)
                .phiFont(.headline)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            answerBody
        }
        .padding(PhiSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .phiCard()
    }

    @ViewBuilder
    private var answerBody: some View {
        switch question.type {
        case .multipleChoice:
            MultipleChoiceBody(
                options: question.options ?? [],
                correct: question.correct,
                explanation: question.explanation
            )
        case .shortAnswer:
            // sample_answer is optional in the shape. The empty fallback only covers a row without one.
            ShortAnswerBody(
                prompt: question.question,
                sampleAnswer: question.sampleAnswer ?? "",
                explanation: question.explanation,
                store: store
            )
        }
    }
}

// MARK: - Multiple choice

private struct MultipleChoiceBody: View {
    let options: [String]
    /// 0-based index of the right option.
    let correct: Int?
    let explanation: String

    /// Nil until the student answers. The first tap locks the question.
    @State private var selected: Int?

    init(options: [String], correct: Int?, explanation: String) {
        self.options = options
        self.correct = correct
        self.explanation = explanation
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.sm) {
            ForEach(options.indices, id: \.self) { index in
                optionRow(index)
            }

            // The explanation waits until after the attempt, so it does not give the answer away.
            if selected != nil {
                Text(explanation)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextSecondary)
                    .padding(.top, PhiSpacing.xs)
            }
        }
    }

    private func optionRow(_ index: Int) -> some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        return Button {
            choose(index)
        } label: {
            HStack(spacing: PhiSpacing.md) {
                Text(options[index])
                    .phiFont(.body)
                    .foregroundStyle(textColor(for: index))
                    .frame(maxWidth: .infinity, alignment: .leading)

                status(for: index)
            }
            .padding(.horizontal, PhiSpacing.lg)
            .padding(.vertical, PhiSpacing.md)
            .frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
            .background(Color.phiSurface, in: shape)
            .overlay(shape.strokeBorder(borderColor(for: index), lineWidth: 1))
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .disabled(selected != nil)
    }

    /// A text label sits beside each result, so the answer does not depend on color.
    @ViewBuilder
    private func status(for index: Int) -> some View {
        if let selected = selected {
            if index == correct {
                statusLabel("Correct", symbol: "checkmark", color: Color.phiSuccess)
            } else if index == selected {
                statusLabel("Your answer", symbol: "xmark", color: Color.phiError)
            }
        }
    }

    private func statusLabel(_ text: String, symbol: String, color: Color) -> some View {
        HStack(spacing: PhiSpacing.xs) {
            Image(systemName: symbol)
                .foregroundStyle(color)
                .accessibilityHidden(true)
            Text(text)
                .phiFont(.caption)
                .foregroundStyle(Color.phiTextPrimary)
        }
    }

    private func textColor(for index: Int) -> Color {
        guard selected != nil, index != correct, index != selected else {
            return Color.phiTextPrimary
        }
        return Color.phiTextSecondary
    }

    private func borderColor(for index: Int) -> Color {
        guard selected != nil else { return Color.phiHairline }
        if index == correct { return Color.phiSuccess }
        if index == selected { return Color.phiError }
        return Color.phiHairline
    }

    private func choose(_ index: Int) {
        guard selected == nil else { return }
        selected = index
        if index == correct {
            PhiHaptics.success()
        } else {
            PhiHaptics.error()
        }
    }
}

// MARK: - Short answer

private struct ShortAnswerBody: View {
    let prompt: String
    let sampleAnswer: String
    let explanation: String
    let store: RecallStore

    @State private var answer = ""
    @State private var grade: ShortAnswerGrade?
    @State private var gradeError: String?
    @State private var isChecking = false

    init(prompt: String, sampleAnswer: String, explanation: String, store: RecallStore) {
        self.prompt = prompt
        self.sampleAnswer = sampleAnswer
        self.explanation = explanation
        self.store = store
    }

    private var attempt: String {
        answer.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var checkLabel: String {
        isChecking ? "Checking answer" : "Check answer"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.md) {
            answerField

            Button {
                Task { await check() }
            } label: {
                Text(checkLabel)
            }
            .buttonStyle(PhiPrimaryButtonStyle())
            .disabled(attempt.isEmpty || isChecking)

            // The answer text stays in place on failure, so the student can retry without retyping.
            if let gradeError = gradeError {
                errorBlock(gradeError)
            }

            if let grade = grade {
                gradeBlock(grade)
                Text(explanation)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextSecondary)
            }
        }
    }

    private var answerField: some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.chip, style: .continuous)
        return ZStack(alignment: .topLeading) {
            TextEditor(text: $answer)
                .scrollContentBackground(.hidden)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(minHeight: 120)
                .padding(PhiSpacing.sm)
                .background(Color.phiSurface, in: shape)
                .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))
                .accessibilityLabel("Your answer")

            if answer.isEmpty {
                // VERIFY: the placeholder inset matches the TextEditor text origin on device.
                Text("Write your answer")
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextSecondary)
                    .padding(.horizontal, PhiSpacing.md)
                    .padding(.top, PhiSpacing.lg)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
    }

    private func errorBlock(_ message: String) -> some View {
        VStack(alignment: .leading, spacing: PhiSpacing.sm) {
            HStack(alignment: .top, spacing: PhiSpacing.sm) {
                Image(systemName: "exclamationmark.circle")
                    .foregroundStyle(Color.phiError)
                    .accessibilityHidden(true)
                Text(message)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextPrimary)
            }
            Button("Try again") {
                Task { await check() }
            }
            .buttonStyle(PhiSecondaryButtonStyle())
        }
    }

    private func gradeBlock(_ grade: ShortAnswerGrade) -> some View {
        VStack(alignment: .leading, spacing: PhiSpacing.sm) {
            HStack(spacing: PhiSpacing.sm) {
                Image(systemName: verdictSymbol(grade.verdict))
                    .foregroundStyle(verdictColor(grade.verdict))
                    .accessibilityHidden(true)
                Text(verdictText(grade.verdict))
                    .phiFont(.headline)
                    .foregroundStyle(Color.phiTextPrimary)
            }

            Text(grade.feedback)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)
        }
        .accessibilityElement(children: .combine)
    }

    private func verdictText(_ verdict: ShortAnswerGrade.Verdict) -> String {
        switch verdict {
        case .correct: return "Correct"
        case .partial: return "Partly correct"
        case .incorrect: return "Not quite"
        }
    }

    private func verdictSymbol(_ verdict: ShortAnswerGrade.Verdict) -> String {
        switch verdict {
        case .correct: return "checkmark.circle"
        case .partial: return "minus.circle"
        case .incorrect: return "xmark.circle"
        }
    }

    private func verdictColor(_ verdict: ShortAnswerGrade.Verdict) -> Color {
        switch verdict {
        case .correct: return Color.phiSuccess
        case .partial: return Color.phiWarning
        case .incorrect: return Color.phiError
        }
    }

    /// Grades the current answer. Each check is graded on its own, so nothing is cached.
    @MainActor
    private func check() async {
        guard !attempt.isEmpty, !isChecking else { return }
        isChecking = true
        gradeError = nil
        grade = nil
        defer { isChecking = false }
        do {
            grade = try await store.grade(
                question: prompt,
                sampleAnswer: sampleAnswer,
                studentAnswer: attempt
            )
        } catch {
            guard !Task.isCancelled else { return }
            gradeError = error.localizedDescription
        }
    }
}
