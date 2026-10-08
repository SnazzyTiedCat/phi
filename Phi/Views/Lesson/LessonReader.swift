import Foundation
import Observation

/// Reads a lesson one row at a time and tracks the word being spoken.
///
/// The narrator speaks one row per utterance. When a row ends on its own, the reader
/// moves to the next. AVSpeech applies a new rate only to a new utterance, so a speed
/// change restarts the current row from the word being spoken.
@MainActor
@Observable
final class LessonReader {
    /// The speeds the bar offers. These are AVSpeech rates, not multipliers.
    static let speeds: [Float] = [0.4, 0.5, 0.6]

    private(set) var rows: [LessonSection] = []
    /// The text of each row, built once when the lesson loads.
    private(set) var rendered: [LessonBody.Rendered] = []
    /// The row that play, Ask and Practice act on: the row being read, or the last one read.
    private(set) var focusIndex = 0
    private(set) var speed: Float = 0.5
    /// True once the last row has ended on its own. The next play starts over.
    private(set) var isFinished = false

    let narrator = SpeechNarrator()

    /// UTF-16 offset in the focused row where the next utterance starts.
    @ObservationIgnored private var resumeOffset = 0
    /// UTF-16 offset in the focused row where the current utterance starts.
    @ObservationIgnored private var segmentStart = 0

    init() {
        narrator.rate = speed
        narrator.onFinish = { [weak self] in
            guard let self else { return }
            self.rowFinished()
        }
    }

    var focusedRow: LessonSection? {
        rows.indices.contains(focusIndex) ? rows[focusIndex] : nil
    }

    /// True only while audio is playing. A paused utterance still reports isSpeaking.
    var isReading: Bool { narrator.isSpeaking && !narrator.isPaused }
    var isPaused: Bool { narrator.isPaused }
    var isPlaying: Bool { narrator.isSpeaking && !narrator.isPaused }

    /// Replaces the lesson and starts from its first row.
    func load(rows: [LessonSection]) {
        narrator.stop()
        self.rows = rows
        rendered = rows.map { LessonBody.rendered(from: $0.content) }
        focusIndex = 0
        resumeOffset = 0
        segmentStart = 0
        isFinished = false
    }

    /// Starts reading from the focused row, or resumes a paused one.
    func play() {
        guard !rows.isEmpty else { return }
        if narrator.isPaused {
            narrator.play()
            return
        }
        guard !narrator.isSpeaking else { return }
        if isFinished {
            focusIndex = 0
            resumeOffset = 0
            isFinished = false
        }
        speak(from: resumeOffset)
    }

    func pause() {
        narrator.pause()
    }

    func togglePlayback() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }

    /// Stops reading. The next play starts the focused row from its beginning.
    func stop() {
        narrator.stop()
        resumeOffset = 0
        isFinished = false
    }

    /// Stops reading but keeps the current word, for when the screen goes away.
    func suspend() {
        guard narrator.isSpeaking else { return }
        resumeOffset = currentPosition()
        narrator.stop()
    }

    /// Sets the speed. While speaking, the focused row restarts from the current word.
    func setSpeed(_ value: Float) {
        speed = value
        narrator.rate = value
        guard narrator.isSpeaking else { return }
        let position = currentPosition()
        if narrator.isPaused {
            narrator.stop()
            resumeOffset = position
        } else {
            speak(from: position)
        }
    }

    /// The word being spoken, as a range in the row's text. Only the focused row is highlighted.
    func highlight(forRow index: Int) -> NSRange? {
        guard index == focusIndex, narrator.isSpeaking, let range = narrator.highlightedRange else {
            return nil
        }
        return NSRange(location: segmentStart + range.location, length: range.length)
    }

    /// The UTF-16 offset in the focused row of the word being spoken, or where it resumes.
    private func currentPosition() -> Int {
        guard narrator.isSpeaking else { return resumeOffset }
        return segmentStart + (narrator.highlightedRange?.location ?? 0)
    }

    /// Speaks the focused row from a UTF-16 offset. AVSpeech has no start point,
    /// so the remaining text is handed over as its own string.
    private func speak(from offset: Int) {
        guard rows.indices.contains(focusIndex) else { return }
        let text = NSString(string: rendered[focusIndex].plain)
        let start = min(max(offset, 0), text.length)
        let remainder = text.substring(from: start)
        segmentStart = start
        guard !remainder.isEmpty else {
            rowFinished()
            return
        }
        narrator.load(text: remainder)
        narrator.play()
    }

    /// Runs when a row ends on its own. Moves to the next row, or marks the lesson finished.
    private func rowFinished() {
        resumeOffset = 0
        let next = focusIndex + 1
        guard rows.indices.contains(next) else {
            isFinished = true
            return
        }
        focusIndex = next
        speak(from: 0)
    }
}
