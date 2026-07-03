import Foundation
import Supabase

/// Owns the app's invisible cloud identity — mirroring the `OnboardingStore` /
/// `MaterialStore` `@Observable` single-store convention from Chunks 1–2.
///
/// The identity is anonymous: no form, no login screen. The Supabase SDK
/// persists the session in the Keychain automatically, so once bootstrapped an
/// identity survives relaunches and reinstalls-until-wipe without any custom
/// session cache of our own.
@Observable
final class IdentityStore {
    static let shared = IdentityStore()

    /// `nil` until `bootstrap()` resolves an identity. Chunk 4 gates upload on
    /// this, so a nil here (e.g. anonymous sign-ins disabled) fails loudly
    /// rather than letting an un-scoped write through.
    var currentUserID: UUID?

    private init() {}

    /// Establishes identity without blocking first paint — call from a `.task`
    /// on `RootView`, not from `PhiApp.init`. The Dashboard doesn't need
    /// identity this chunk; Chunk 4 will.
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
