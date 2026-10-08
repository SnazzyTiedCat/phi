#if DEBUG
import Foundation

/// Sample output for previews and mocks. Debug builds only.
enum SampleLesson {

    static let draft = LessonDraft(
        title: "Photosynthesis: Turning Light into Sugar",
        intro: "Plants make their own food. This lesson follows light from the sun into the sugar a leaf stores, and shows where each step happens.",
        sections: [
            LessonDraft.Section(
                heading: "Why plants need light",
                body: "A plant builds sugar from carbon dioxide and water. That process takes energy, and the energy comes from sunlight. **Chlorophyll**, the green pigment in leaves, absorbs mostly red and blue light and reflects green, which is why leaves look green."
            ),
            LessonDraft.Section(
                heading: "The light reactions",
                body: "Inside the thylakoid membranes, light energy splits water and releases oxygen. The energy is stored in two carrier molecules, ATP and NADPH, which move on to the next stage."
            ),
            LessonDraft.Section(
                heading: "The Calvin cycle",
                body: "In the stroma, the stored energy drives the fixation of carbon dioxide into sugar. This stage does not need light directly. It runs on the ATP and NADPH the light reactions made."
            ),
        ],
        takeaways: [
            "Light energy is captured by chlorophyll and stored as chemical energy.",
            "Oxygen comes from splitting water, not from carbon dioxide.",
            "The Calvin cycle builds sugar from carbon dioxide using stored energy.",
        ]
    )

    static let flashcards: [Flashcard] = [
        Flashcard(
            front: "Why does a leaf look green?",
            back: "Chlorophyll absorbs mostly red and blue light and reflects green."
        ),
        Flashcard(
            front: "Where do the light reactions take place?",
            back: "In the thylakoid membranes."
        ),
        Flashcard(
            front: "Where does the oxygen released in photosynthesis come from?",
            back: "From splitting water during the light reactions."
        ),
        Flashcard(
            front: "Why can the Calvin cycle run without light directly?",
            back: "It uses the ATP and NADPH that the light reactions already made."
        ),
    ]

    static let quizQuestions: [QuizQuestion] = [
        QuizQuestion(
            type: .multipleChoice,
            question: "Which wavelengths does chlorophyll absorb most strongly?",
            explanation: "Chlorophyll absorbs mostly red and blue light. Green is the tempting answer, but it is the color chlorophyll reflects.",
            options: ["Red and blue", "Green", "Ultraviolet", "All wavelengths equally"],
            correct: 0,
            sampleAnswer: nil
        ),
        QuizQuestion(
            type: .shortAnswer,
            question: "What two energy carriers does the light reaction produce for the Calvin cycle?",
            explanation: "The light reaction stores energy in ATP and NADPH, and the Calvin cycle spends them to fix carbon dioxide.",
            options: nil,
            correct: nil,
            sampleAnswer: "ATP and NADPH."
        ),
        QuizQuestion(
            type: .multipleChoice,
            question: "A researcher labels the oxygen released by a leaf with a heavy isotope. Which molecule was the source?",
            explanation: "The oxygen comes from water that was split in the light reactions. Carbon dioxide is the carbon source, not the oxygen source.",
            options: ["Carbon dioxide", "Water", "Glucose", "Chlorophyll"],
            correct: 1,
            sampleAnswer: nil
        ),
    ]

    static let tutorReply = "Good question. Start with where the energy comes from. Light hits chlorophyll in the thylakoid membranes, and that energy splits water. Based on that, what do you think the Calvin cycle needs from the light reactions to build sugar?"
}

struct MockLessonGenerator: LessonGenerating {
    func generateLesson(title: String, text: String) async throws -> LessonDraft {
        SampleLesson.draft
    }
}

struct MockTutor: TutorChatting {
    func reply(history: [AnthropicMessage], lessonContext: String, mode: InteractionMode) -> AsyncThrowingStream<String, Error> {
        let pieces = SampleLesson.tutorReply
            .split(separator: " ", omittingEmptySubsequences: false)
            .map { String($0) + " " }
        // VERIFY: AsyncThrowingStream trailing-closure init, matching AnthropicClient.stream.
        return AsyncThrowingStream<String, Error> { continuation in
            let task = Task {
                for piece in pieces {
                    try? await Task.sleep(nanoseconds: 40_000_000)
                    if Task.isCancelled { break }
                    continuation.yield(piece)
                }
                continuation.finish()
            }
            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }
}

struct MockRecallGenerator: RecallGenerating {
    func flashcards(lessonContext: String) async throws -> [Flashcard] {
        SampleLesson.flashcards
    }

    func quiz(lessonContext: String) async throws -> [QuizQuestion] {
        SampleLesson.quizQuestions
    }

    func grade(question: String, sampleAnswer: String, studentAnswer: String) async throws -> ShortAnswerGrade {
        ShortAnswerGrade(
            verdict: .partial,
            feedback: "You have the energy part. Say where the carbon comes from and you have the whole cycle."
        )
    }
}
#endif
