import SwiftUI

/// The "Delete my data" row, with its confirmation alert.
///
/// The repository clears storage, then the auth user, then the local session.
/// Only after that does this view remove the device's saved API key. The AI
/// consent flag stays, because it is a device setting the student may keep.
@MainActor
struct DataDeletionSection: View {
    /// Runs once the cloud data is gone, so the parent can refresh its key row.
    let onDeleted: () -> Void

    @State private var showConfirmation = false
    @State private var state: DeletionState = .idle
    @Environment(MaterialStore.self) private var materials

    // Explicit, because private @State would make the memberwise init private.
    init(onDeleted: @escaping () -> Void) {
        self.onDeleted = onDeleted
    }

    var body: some View {
        Section("Your data") {
            if case .running = state {
                HStack(spacing: PhiSpacing.sm) {
                    ProgressView()
                    Text("Deleting your data")
                        .phiFont(.body)
                        .foregroundStyle(Color.phiTextSecondary)
                }
                .frame(minHeight: 44, alignment: .leading)
            } else {
                Button("Delete my data", role: .destructive) {
                    requestDeletion()
                }
                .phiFont(.body)
                .disabled(isDeleted)
            }

            if case .failed(let message) = state {
                Text(message)
                    .phiFont(.body)
                    .foregroundStyle(Color.phiError)
            }

            if case .deleted(let keyRemovalFailed) = state {
                Text(deletedMessage(keyRemovalFailed: keyRemovalFailed))
                    .phiFont(.body)
                    .foregroundStyle(keyRemovalFailed ? Color.phiError : Color.phiSuccess)
            }
        }
        .listRowBackground(Color.phiSurface)
        .alert("Delete all your data?", isPresented: $showConfirmation) {
            Button("Delete", role: .destructive) { startDeletion() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes your materials, lessons, and chat history. It cannot be undone.")
        }
    }

    // MARK: - Actions

    private func requestDeletion() {
        guard IdentityStore.shared.currentUserID != nil else {
            state = .failed(Self.stillConnectingMessage)
            return
        }
        showConfirmation = true
    }

    private func startDeletion() {
        guard let userID = IdentityStore.shared.currentUserID else {
            state = .failed(Self.stillConnectingMessage)
            return
        }
        state = .running
        Task {
            do {
                try await AccountRepository().deleteAccount(userID: userID)
            } catch {
                state = .failed("Your data could not be deleted. \(error.localizedDescription)")
                return
            }

            // The cloud data is gone. Remove the device's saved key as well.
            var keyRemovalFailed = false
            do {
                try KeychainStore.delete(account: AnthropicConfiguration.apiKeyAccount)
            } catch {
                keyRemovalFailed = true
            }
            // The old account is gone, so clear what it showed and start a new anonymous one.
            materials.forgetAll()
            await IdentityStore.shared.restartIdentity()
            state = .deleted(keyRemovalFailed: keyRemovalFailed)
            onDeleted()
        }
    }

    // MARK: - Helpers

    private var isDeleted: Bool {
        if case .deleted = state { return true }
        return false
    }

    private func deletedMessage(keyRemovalFailed: Bool) -> String {
        if keyRemovalFailed {
            return "Your data was deleted, but the saved API key could not be removed from the Keychain. Remove it from the Anthropic API key section."
        }
        return "Your data was deleted, and the saved API key was removed from this device. Phi will set up a new anonymous account as soon as it can connect."
    }

    private static let stillConnectingMessage = "Phi is still connecting. Try again in a moment."

    private enum DeletionState: Equatable {
        case idle
        case running
        case deleted(keyRemovalFailed: Bool)
        case failed(String)
    }
}

#Preview {
    Form {
        DataDeletionSection(onDeleted: {})
    }
    .scrollContentBackground(.hidden)
    .background(Color.phiBackground)
    .preferredColorScheme(.dark)
}
