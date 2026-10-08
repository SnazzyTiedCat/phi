import Foundation
import Observation

/// Whether the person has accepted that Phi sends their material text and chat
/// messages to Anthropic to generate lessons and replies. Stored in UserDefaults.
@MainActor
@Observable
final class ConsentStore {
    static let shared = ConsentStore()

    /// Versioned. A changed consent text can ask again by bumping the suffix.
    private static let aiUseKey = "phi.consent.aiUse.v1"

    private(set) var hasAcceptedAIUse: Bool
    private let defaults: UserDefaults

    /// Takes a `UserDefaults` so a test can pass a throwaway suite.
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.hasAcceptedAIUse = defaults.bool(forKey: Self.aiUseKey)
    }

    func acceptAIUse() {
        defaults.set(true, forKey: Self.aiUseKey)
        hasAcceptedAIUse = true
    }
}
