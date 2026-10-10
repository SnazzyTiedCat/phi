import SwiftUI

/// Shown once, before the first AI call. It says in plain sentences where the
/// student's text goes. Accepting stores the consent, closes the sheet, then runs `onAccept`.
struct ConsentSheet: View {
    let onAccept: () -> Void

    @Environment(\.dismiss) private var dismiss

    init(onAccept: @escaping () -> Void) {
        self.onAccept = onAccept
    }

    var body: some View {
        ZStack {
            Color.phiBackground.ignoresSafeArea()

            VStack(alignment: .leading, spacing: PhiSpacing.lg) {
                ScrollView {
                    VStack(alignment: .leading, spacing: PhiSpacing.lg) {
                        Text("Before Phi builds a lesson")
                            .phiFont(.title)
                            .foregroundStyle(Color.phiTextPrimary)
                            .accessibilityAddTraits(.isHeader)

                        point("Your device sends the text of your material to Anthropic to write the lesson. Chat questions, and the answers you type in Practice, go to Anthropic the same way.")
                        point("Phi uses your own Anthropic API key. The key stays in this device's Keychain, and Phi never receives it.")
                        point("Your materials and the lessons Phi builds from them are stored in Phi's cloud project, under the anonymous account Phi creates for you.")
                        point("Phi does not sell your data, and it does not use it for advertising.")
                        point("AI output can be wrong. Check a lesson against your material before you rely on it.")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                VStack(spacing: PhiSpacing.sm) {
                    Button("Accept") {
                        accept()
                    }
                    .buttonStyle(PhiPrimaryButtonStyle())

                    Button("Not now") {
                        dismiss()
                    }
                    .buttonStyle(PhiGhostButtonStyle())
                }
            }
            .padding(PhiSpacing.lg)
            .frame(maxWidth: 620)
        }
    }

    private func point(_ text: String) -> some View {
        Text(text)
            .phiFont(.body)
            .foregroundStyle(Color.phiTextPrimary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func accept() {
        ConsentStore.shared.acceptAIUse()
        dismiss()
        onAccept()
    }
}

#Preview {
    ConsentSheet(onAccept: {})
        .preferredColorScheme(.dark)
}
