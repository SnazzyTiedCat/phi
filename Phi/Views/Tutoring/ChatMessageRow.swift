import SwiftUI

/// One message in the tutor chat. The student's message is a raised card on the
/// trailing edge. Phi's reply is plain text on the leading edge, with no fill.
struct ChatMessageRow: View {
    let role: ChatMessage.Role
    let text: String

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isShown = false

    init(role: ChatMessage.Role, text: String) {
        self.role = role
        self.text = text
    }

    var body: some View {
        Group {
            if role == .user {
                HStack(spacing: 0) {
                    Spacer(minLength: PhiSpacing.xxl)
                    Text(text)
                        .phiFont(.body)
                        .foregroundStyle(Color.phiTextPrimary)
                        .textSelection(.enabled)
                        .padding(PhiSpacing.md)
                        .phiCard()
                }
            } else {
                Text(text)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiTextPrimary)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .opacity(isShown ? 1 : 0)
        .onAppear {
            // Fades once per appearance. Under Reduce Motion it appears at once.
            guard !isShown else { return }
            if reduceMotion {
                isShown = true
            } else {
                withAnimation(PhiMotion.entrance) {
                    isShown = true
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var accessibilityText: String {
        let speaker = role == .user ? "You" : "Phi"
        return "\(speaker): \(text)"
    }
}
