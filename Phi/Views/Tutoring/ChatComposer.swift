import SwiftUI

/// The reply field and send button at the foot of the tutor sheet. Send is the
/// only gold control on this screen.
struct ChatComposer: View {
    @Binding var text: String
    let canSend: Bool
    let onSend: () -> Void

    @ScaledMetric(relativeTo: .body) private var circleSize: CGFloat = 36
    @ScaledMetric(relativeTo: .body) private var symbolSize: CGFloat = 15

    init(text: Binding<String>, canSend: Bool, onSend: @escaping () -> Void) {
        self._text = text
        self.canSend = canSend
        self.onSend = onSend
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: PhiRadius.button, style: .continuous)
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.phiHairline)
                .frame(height: 1)

            HStack(alignment: .bottom, spacing: PhiSpacing.sm) {
                TextField("Ask a question", text: $text, axis: .vertical)
                    .lineLimit(1...5)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextPrimary)
                    .padding(.horizontal, PhiSpacing.md)
                    .padding(.vertical, PhiSpacing.sm)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .background(Color.phiSurfaceRaised, in: shape)
                    .overlay(shape.strokeBorder(Color.phiHairline, lineWidth: 1))

                Button(action: onSend) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: symbolSize, weight: .medium))
                        .symbolRenderingMode(.monochrome)
                        .foregroundStyle(Color.phiBackground)
                        .frame(width: circleSize, height: circleSize)
                        .background(Color.phiGold, in: Circle())
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(ChatSendButtonStyle())
                .disabled(!canSend)
                .accessibilityLabel("Send")
            }
            .padding(.horizontal, PhiSpacing.lg)
            .padding(.vertical, PhiSpacing.sm)
        }
    }
}

/// Press feedback for the send button. Scale 0.98 on the press spring, dropped under
/// Reduce Motion. A disabled button dims to 40%, as the other button styles do.
private struct ChatSendButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .modifier(ChatSendFeedback(isPressed: configuration.isPressed))
    }
}

private struct ChatSendFeedback: ViewModifier {
    let isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed && !reduceMotion ? 0.98 : 1)
            .opacity(isEnabled ? 1 : 0.4)
            .animation(PhiMotion.press, value: isPressed)
    }
}
