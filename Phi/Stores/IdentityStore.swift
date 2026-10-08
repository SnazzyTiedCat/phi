import Foundation
import Supabase

/// Owns the app's invisible cloud identity. Like the other stores, it is one
/// `@Observable` object that owns one slice of app state.
///
/// The identity is anonymous: no form, no login screen. The Supabase SDK
/// persists the session in the Keychain automatically, so once bootstrapped an
/// identity survives relaunches and reinstalls-until-wipe without any custom
/// session cache of our own.
@MainActor
@Observable
final class IdentityStore {
    static let shared = IdentityStore()

    /// `nil` until `bootstrap()` resolves an identity. Material loads and imports
    /// check this first, so a nil here (e.g. anonymous sign-ins disabled) fails
    /// loudly rather than letting an un-scoped write through.
    var currentUserID: UUID?

    private init() {}

    /// Drops the current identity and mints a new anonymous one. Used after the
    /// student deletes their data, because the old account no longer exists.
    /// Callers must have signed out first, so bootstrap does not reuse the session.
    func restartIdentity() async {
        currentUserID = nil
        await bootstrap()
    }

    /// Establishes identity without blocking first paint. Call it from a `.task`
    /// on `RootView`, not from `PhiApp.init`. Until it resolves, material loads
    /// report that Phi is still connecting.
    func bootstrap() async {
        // 1. Existing persisted session? The SDK restores it from the Keychain
        //    on init — we just read it, no custom session cache.
        if let userID = supabase.auth.currentSession?.user.id {
            currentUserID = userID
            return
        }

        // 2. None yet — mint an anonymous identity. The SDK persists the
        //    resulting session to the Keychain, so the next launch takes the
        //    branch above.
        do {
            let session = try await supabase.auth.signInAnonymously()
            // 3. Adopt the new identity.
            currentUserID = session.user.id
        } catch {
            // Reachable when Anonymous Sign-Ins are disabled at the org level,
            // or the device is offline. Leave `currentUserID` nil and log —
            // this must stay loud, not silent (see the property doc above).
            print("[IdentityStore] anonymous sign-in failed: \(error)")
        }
    }
}
