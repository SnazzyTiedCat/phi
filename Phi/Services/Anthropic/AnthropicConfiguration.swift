import Foundation

/// The one place the app builds an Anthropic client. Every feature calls
/// `makeClient()`, so the key lookup lives in exactly one spot.
enum AnthropicConfiguration {
    /// Keychain account name for the user's own key. Settings writes it, and this file reads it.
    static let apiKeyAccount = "anthropic.api-key"

    /// A client that reads the key from the Keychain on every request. A key
    /// saved in Settings takes effect on the next call, with no restart.
    static func makeClient() -> AnthropicClient {
        AnthropicClient(keyProvider: {
            guard let key = try KeychainStore.read(account: apiKeyAccount) else {
                throw AnthropicError.missingAPIKey
            }
            return key
        })
    }
}
