import Foundation
import Observation

/// Owns the "has this person finished onboarding" flag.
///
/// WHY A DEDICATED STORE, not `@AppStorage("hasSeenArrival")` directly in
/// the view: `@AppStorage` is the right call for a flag read/written by
/// exactly one view. The moment a second view needs to *read* the same
/// flag (RootView, to decide what to show at launch) — or a later chunk
/// adds more onboarding state (permission granted? paywall seen?) —
/// scattered `@AppStorage` calls become multiple sources of truth for the
/// same UserDefaults key, and a typo in the string silently creates a
/// second flag that never gets set. Centralizing reads/writes here means
/// the key string exists exactly once in the whole codebase.
///
/// NAMING NOTE: this key describes the *full* onboarding flow (Arrival →
/// value prop → permissions → paywall, per DESIGN.md §7.1), not just the
/// Arrival screen that exists today. Right now `completeOnboarding()` gets
/// called immediately after Arrival, because Arrival is the only screen
/// built so far. When later chunks add the remaining onboarding screens,
/// move that call to the end of the full sequence — don't leave it firing
/// after screen 1 forever.
@Observable
final class OnboardingStore {
    private let key = "phi.hasCompletedOnboarding"
    private let defaults: UserDefaults

    /// Accepts a `UserDefaults` instance rather than always using `.standard`
    /// so a future unit test can pass in a throwaway suite instead of
    /// polluting real device storage.
    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    var hasCompletedOnboarding: Bool {
        defaults.bool(forKey: key)
    }

    func completeOnboarding() {
        defaults.set(true, forKey: key)
    }
}
