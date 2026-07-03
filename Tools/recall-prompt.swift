// Standalone CLI helper for run-recall.sh — prints the REAL composed AI-3
// prompts by compiling against the actual app sources, so the runner has no
// hand-copied prompt mirror to drift (the debt AI-1's runner carried).
//
// Lives in Tools/, deliberately OUTSIDE Phi/: the app target uses a
// filesystem-synchronized group over Phi/, and top-level code in there would
// join the app compile and break the build.
//
// Build (from repo root):
//   swiftc -o /tmp/recall-prompt Tools/recall-prompt.swift \
//     Phi/AI/Recall/RecallShapes.swift Phi/AI/Recall/RecallPrompts.swift \
//     Phi/AI/Personas/TutorPersona.swift Phi/AI/Personas/Generalist.swift
//
// Usage:
//   recall-prompt flashcards            → flashcard system prompt
//   recall-prompt quiz [count]          → quiz system prompt
//   recall-prompt grading               → grading system prompt
//   recall-prompt grade-user <q> <sample> <student> → grading user message
//   recall-prompt check                 → run the shape/parse self-checks

import Foundation

func die(_ msg: String) -> Never {
    FileHandle.standardError.write(Data((msg + "\n").utf8))
    exit(1)
}

// Assert-based self-check for the non-trivial logic in RecallShapes: the
// fence/prose-tolerant decoding and the cache-key stability contract.
func check() {
    let fenced = """
    Here you go!
    ```json
    [{"front": "What does the testing effect say?", "back": "Retrieval strengthens memory more than re-reading."}]
    ```
    """
    let cards: [Flashcard]? = Recall.decodeArray(fenced)
    assert(cards?.count == 1 && cards?[0].front.hasPrefix("What") == true,
           "decodeArray must survive fences and surrounding prose")

    let malformed = #"[{"front": "ok", "back": "ok"}, {"front": 42}]"#
    let bad: [Flashcard]? = Recall.decodeArray(malformed)
    assert(bad == nil, "one malformed element must fail the whole decode")

    let quizJSON = #"[{"question":"q","type":"short_answer","sample_answer":"a","explanation":"e"}]"#
    let qs: [QuizQuestion]? = Recall.decodeArray(quizJSON)
    assert(qs?.first?.type == .shortAnswer && qs?.first?.sampleAnswer == "a",
           "snake_case wire keys must decode")

    let grade: ShortAnswerGrade? = Recall.decodeObject(
        #"Sure: {"verdict":"partial","feedback":"Half right."} hope that helps"#)
    assert(grade?.verdict == .partial, "decodeObject must survive surrounding prose")

    assert(Recall.cacheKey(lesson: "L\n", artifact: "quiz")
        == Recall.cacheKey(lesson: "  L ", artifact: "quiz"),
           "cache key must be whitespace-trim stable")
    assert(Recall.cacheKey(lesson: "L", artifact: "quiz")
        != Recall.cacheKey(lesson: "L", artifact: "flashcards"),
           "artifact type must separate keys")

    print("recall-prompt check: all assertions passed")
}

// @main instead of top-level code: only a file literally named main.swift may
// hold top-level statements in a multi-file compile.
@main
enum RecallPromptCLI {
    static func main() {
        let args = CommandLine.arguments
        switch args.count > 1 ? args[1] : "" {
        case "flashcards":
            print(RecallPrompts.flashcards)
        case "quiz":
            let count = args.count > 2 ? (Int(args[2]) ?? 6) : 6
            print(RecallPrompts.quiz(count: count))
        case "grading":
            print(RecallPrompts.grading)
        case "grade-user":
            guard args.count == 5 else { die("usage: recall-prompt grade-user <question> <sample_answer> <student_answer>") }
            print(RecallPrompts.gradingUserMessage(question: args[2], sampleAnswer: args[3], studentAnswer: args[4]))
        case "check":
            check()
        default:
            die("usage: recall-prompt flashcards | quiz [count] | grading | grade-user <q> <s> <a> | check")
        }
    }
}
