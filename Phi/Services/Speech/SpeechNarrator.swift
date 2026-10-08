import AVFoundation
import Foundation
import Observation

/// Reads lesson text aloud with AVSpeechSynthesizer. Speech runs on device,
/// works offline, and costs nothing, so no network call is involved.
///
/// The highlight follows `willSpeakRange` callbacks rather than a timer. Word
/// length, punctuation and rate all change the pace, and a timer drifts from
/// the voice after the first pause. Each callback reports the character range
/// being spoken right now, in the same string `play()` hands to the voice.
@MainActor
@Observable
final class SpeechNarrator: NSObject {
    private(set) var isSpeaking = false
    private(set) var isPaused = false
    private(set) var highlightedRange: NSRange?
    /// AVSpeech rate, clamped to `AVSpeechUtteranceMinimumSpeechRate...AVSpeechUtteranceMaximumSpeechRate`
    /// when a `play()` starts. Changes apply from the next utterance. Slower than
    /// the default is allowed on purpose: re-hearing a dense passage is a core study move.
    var rate: Float = AVSpeechUtteranceDefaultSpeechRate
    /// Runs when speech ends on its own. `stop()` and `load(text:)` do not call it.
    @ObservationIgnored var onFinish: (() -> Void)?

    @ObservationIgnored private let synthesizer = AVSpeechSynthesizer()
    @ObservationIgnored private var text = ""

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func load(text: String) {
        stop()
        self.text = text
    }

    func play() {
        guard !text.isEmpty else { return }
        if synthesizer.isPaused {
            resume()
            return
        }
        guard !synthesizer.isSpeaking else { return }

        activateSession()
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        utterance.rate = min(max(rate, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)
        isSpeaking = true
        synthesizer.speak(utterance)
    }

    func pause() {
        guard isSpeaking, !synthesizer.isPaused else { return }
        // `.word` waits for the next word boundary, so `isPaused` flips later, in the delegate.
        _ = synthesizer.pauseSpeaking(at: .word)
    }

    func resume() {
        guard synthesizer.isPaused else { return }
        activateSession()
        _ = synthesizer.continueSpeaking()
    }

    func stop() {
        _ = synthesizer.stopSpeaking(at: .immediate)
        clearState()
    }

    /// The device locale as a BCP 47 tag ("en-US"), which the voice lookup expects.
    /// Falls back to US English when the locale has no matching voice.
    private var voice: AVSpeechSynthesisVoice? {
        AVSpeechSynthesisVoice(language: Locale.current.identifier(.bcp47))
            ?? AVSpeechSynthesisVoice(language: "en-US")
    }

    private func activateSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio)
            try session.setActive(true)
        } catch {
            print("[SpeechNarrator] audio session activation failed: \(error)")
        }
    }

    private func deactivateSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            print("[SpeechNarrator] audio session deactivation failed: \(error)")
        }
    }

    private func clearState() {
        if isSpeaking { deactivateSession() }
        isSpeaking = false
        isPaused = false
        highlightedRange = nil
    }

    /// Runs when the synthesizer goes quiet. A callback from an utterance that
    /// `stop()` or `play()` already replaced finds the synthesizer busy and does nothing.
    private func speechEnded() {
        guard !synthesizer.isSpeaking else { return }
        // stop() clears isSpeaking before its cancel callback arrives, so only a natural finish sees it set.
        let finished = isSpeaking
        clearState()
        if finished { onFinish?() }
    }

    private func highlight(_ range: NSRange) {
        guard isSpeaking else { return }
        highlightedRange = range
    }

    private func setPaused(_ paused: Bool) {
        guard isSpeaking else { return }
        isPaused = paused
    }
}

// The delegate runs on an arbitrary queue. Each method passes only Sendable
// values across the hop to the main actor.
extension SpeechNarrator: AVSpeechSynthesizerDelegate {
    nonisolated func speechSynthesizer(
        _ synthesizer: AVSpeechSynthesizer,
        willSpeakRangeOfSpeechString characterRange: NSRange,
        utterance: AVSpeechUtterance
    ) {
        Task { @MainActor [weak self] in
            self?.highlight(characterRange)
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.setPaused(true)
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.setPaused(false)
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.speechEnded()
        }
    }

    nonisolated func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        Task { @MainActor [weak self] in
            self?.speechEnded()
        }
    }
}
