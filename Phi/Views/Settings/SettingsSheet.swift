import SwiftUI

/// The Settings sheet, presented from the Dashboard's profile button.
///
/// Five groups: the student's own Anthropic key, the font choice, AI use, the
/// legal documents, and deleting cloud data. The key lives only in the Keychain,
/// and this screen never shows its value.
@MainActor
struct SettingsSheet: View {
    /// The single persisted font choice, shared with the `.phiFont` modifier
    /// through the same `@AppStorage` key. Writing it here re-renders every
    /// font-aware view app-wide, live.
    @AppStorage(PhiFont.storageKey) private var fontChoice: PhiFont = .spaceMono
    @Environment(\.dismiss) private var dismiss

    /// What the student is typing. Cleared after a save, so the key is never shown again.
    @State private var keyDraft = ""
    @State private var hasSavedKey = false
    @State private var keyStatus: InlineStatus?

    var body: some View {
        NavigationStack {
            Form {
                apiKeySection
                fontSection
                aiDataSection
                legalSection
                DataDeletionSection(onDeleted: { refreshKeyState() })
            }
            .scrollContentBackground(.hidden) // flat dark rows over the app background
            .background(Color.phiBackground.ignoresSafeArea())
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear { refreshKeyState() }
        }
        // Gold is reserved for the primary action. The tint keeps Done, the
        // picker checkmark, and the link chevrons white.
        .tint(.white)
        .preferredColorScheme(.dark)
    }

    // MARK: - Anthropic API key

    private var apiKeySection: some View {
        Section("Anthropic API key") {
            Text(hasSavedKey ? "A key is saved on this device." : "No key is saved on this device.")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)

            SecureField("Paste your Anthropic key", text: $keyDraft)
                .autocorrectionDisabled(true)
                .textInputAutocapitalization(.never)
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)

            Text("Phi sends your lesson text to Anthropic using this key. The key stays in this device's Keychain.")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextSecondary)

            Button("Save key") { saveKey() }
                .buttonStyle(PhiPrimaryButtonStyle())

            if let status = keyStatus {
                Text(status.text)
                    .phiFont(.body)
                    .foregroundStyle(status.isError ? Color.phiError : Color.phiSuccess)
            }

            if hasSavedKey {
                Button("Remove key") { removeKey() }
                    .buttonStyle(PhiGhostButtonStyle())
            }
        }
        .listRowBackground(Color.phiSurface)
    }

    // MARK: - Font

    private var fontSection: some View {
        Section {
            // Inline picker renders "Font" as the group header and the two faces
            // as radio rows, which shows the live selection at a glance.
            Picker("Font", selection: $fontChoice) {
                ForEach(PhiFont.allCases) { face in
                    Text(face.rawValue).tag(face)
                }
            }
            .pickerStyle(.inline)
        }
        .listRowBackground(Color.phiSurface)
    }

    // MARK: - AI data

    private var aiDataSection: some View {
        Section("AI data") {
            Text(ConsentStore.shared.hasAcceptedAIUse
                 ? "You have accepted AI processing. Phi sends your material text and chat messages to Anthropic."
                 : "You have not accepted AI processing.")
                .phiFont(.body)
                .foregroundStyle(Color.phiTextPrimary)

            NavigationLink("Read what is shared") {
                LegalView(title: "Privacy policy", resourceName: "PRIVACY")
            }
            .phiFont(.body)
        }
        .listRowBackground(Color.phiSurface)
    }

    // MARK: - Legal

    private var legalSection: some View {
        Section("Legal") {
            NavigationLink("Privacy policy") {
                LegalView(title: "Privacy policy", resourceName: "PRIVACY")
            }
            .phiFont(.body)

            NavigationLink("Terms of use") {
                LegalView(title: "Terms of use", resourceName: "TERMS")
            }
            .phiFont(.body)

            NavigationLink("Support") {
                LegalView(title: "Support", resourceName: "SUPPORT")
            }
            .phiFont(.body)

            NavigationLink("Space Mono license") {
                LegalSheet()
            }
            .phiFont(.body)
        }
        .listRowBackground(Color.phiSurface)
    }

    // MARK: - Key actions

    private func saveKey() {
        let trimmed = keyDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            keyStatus = InlineStatus(text: "Paste your key before saving.", isError: true)
            return
        }
        do {
            try KeychainStore.save(trimmed, account: AnthropicConfiguration.apiKeyAccount)
            keyDraft = ""
            keyStatus = InlineStatus(text: "Key saved to this device.", isError: false)
        } catch {
            keyStatus = InlineStatus(text: "The key could not be saved. \(error.localizedDescription)", isError: true)
        }
        refreshKeyState()
    }

    private func removeKey() {
        do {
            try KeychainStore.delete(account: AnthropicConfiguration.apiKeyAccount)
            keyStatus = InlineStatus(text: "Key removed from this device.", isError: false)
        } catch {
            keyStatus = InlineStatus(text: "The key could not be removed. \(error.localizedDescription)", isError: true)
        }
        refreshKeyState()
    }

    /// Checks only whether a key exists. The value is read, tested for nil, and dropped.
    private func refreshKeyState() {
        do {
            hasSavedKey = try KeychainStore.read(account: AnthropicConfiguration.apiKeyAccount) != nil
        } catch {
            hasSavedKey = false
            keyStatus = InlineStatus(text: "The Keychain could not be checked. \(error.localizedDescription)", isError: true)
        }
    }

    /// A one-line result under the key controls. It never holds the key itself.
    private struct InlineStatus {
        let text: String
        let isError: Bool
    }
}

#Preview {
    SettingsSheet()
        .environment(MaterialStore.preview(materials: []))
}
