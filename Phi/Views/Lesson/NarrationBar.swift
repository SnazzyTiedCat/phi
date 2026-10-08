import SwiftUI

/// The reading bar that floats over the bottom of the lesson. Its first lines say
/// where reading is, so the highlight is never the only cue. The controls are play
/// or pause, stop, speed, then Ask (only while paused) and Practice.
struct NarrationBar: View {
    let reader: LessonReader
    let onAsk: () -> Void
    let onPractice: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PhiSpacing.sm) {
            HStack(alignment: .top, spacing: PhiSpacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(caption)
                        .phiFont(.caption)
                        .foregroundStyle(Color.phiTextSecondary)
                    Text(reader.focusedRow?.title ?? "")
                        .phiFont(.body)
                        .foregroundStyle(Color.phiTextPrimary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityElement(children: .combine)

                speedMenu
            }

            HStack(spacing: PhiSpacing.sm) {
                playButton
                stopButton
                Spacer(minLength: 0)
                askButton
                practiceButton
            }
        }
        .padding(PhiSpacing.md)
        .frame(maxWidth: 620)
        .phiFloatingChrome()
        .padding(.horizontal, PhiSpacing.lg)
        .padding(.bottom, PhiSpacing.sm)
    }

    // MARK: - Caption

    private var caption: String {
        if reader.isFinished {
            return "Lesson finished"
        }
        let index = reader.focusIndex
        let lastSection = max(reader.rows.count - 1, 0)
        let place = index == 0 ? "the introduction" : "section \(index) of \(lastSection)"
        return reader.isReading ? "Reading " + place : "Up next: " + place
    }

    // MARK: - Controls

    private var playButton: some View {
        Button {
            PhiHaptics.tap()
            reader.togglePlayback()
        } label: {
            Image(systemName: reader.isPlaying ? "pause.fill" : "play.fill")
                .font(.system(size: 17, weight: .medium))
        }
        .buttonStyle(NarrationButtonStyle(bordered: false))
        .accessibilityLabel(playLabel)
    }

    private var playLabel: String {
        if reader.isPlaying { return "Pause reading" }
        return reader.isPaused ? "Resume reading" : "Read aloud"
    }

    private var stopButton: some View {
        Button {
            reader.stop()
        } label: {
            Image(systemName: "stop.fill")
                .font(.system(size: 17, weight: .medium))
        }
        .buttonStyle(NarrationButtonStyle(bordered: false))
        .disabled(!reader.isReading)
        .accessibilityLabel("Stop reading")
    }

    private var speedMenu: some View {
        Menu {
            ForEach(LessonReader.speeds, id: \.self) { value in
                Button {
                    reader.setSpeed(value)
                } label: {
                    if value == reader.speed {
                        Label(speedText(value), systemImage: "checkmark")
                    } else {
                        Text(speedText(value))
                    }
                }
            }
        } label: {
            Text(speedText(reader.speed))
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Reading speed")
        .accessibilityValue(speedText(reader.speed))
    }

    private var askButton: some View {
        Button {
            onAsk()
        } label: {
            Text("Ask")
        }
        .buttonStyle(NarrationButtonStyle(bordered: true))
        .disabled(!reader.isPaused)
        .accessibilityLabel("Ask about this section")
    }

    private var practiceButton: some View {
        Button {
            onPractice()
        } label: {
            Text("Practice")
        }
        .buttonStyle(NarrationButtonStyle(bordered: true))
        .disabled(reader.rows.isEmpty)
        .accessibilityLabel("Practice this section")
    }

    /// The rates are AVSpeech values, where 0.5 is the normal speed, not half speed.
    /// Show names, so nobody reads the default as a slowdown.
    private func speedText(_ value: Float) -> String {
        switch value {
        case ..<0.45: return "Slower"
        case ..<0.55: return "Normal"
        default: return "Faster"
        }
    }
}

/// Bar buttons: at least 44pt tall, body type, no gold. Bordered buttons get a hairline
/// stroke. Press scale is 0.98, dropped under Reduce Motion, which dims instead.
private struct NarrationButtonStyle: ButtonStyle {
    let bordered: Bool

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        return configuration.label
            .phiFont(.body)
            .foregroundStyle(Color.phiTextPrimary)
            .padding(.horizontal, bordered ? PhiSpacing.md : 0)
            .frame(minWidth: 44, minHeight: 44)
            .overlay {
                if bordered {
                    shape.strokeBorder(Color.phiHairline, lineWidth: 1)
                }
            }
            .contentShape(shape)
            .modifier(NarrationPressFeedback(isPressed: configuration.isPressed))
    }
}

private struct NarrationPressFeedback: ViewModifier {
    let isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(isEnabled ? (isPressed && reduceMotion ? 0.7 : 1) : 0.4)
            .animation(PhiMotion.press, value: isPressed)
    }
}
