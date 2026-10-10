import Foundation
import Supabase

/// The one configured Supabase client for the whole app. It is a plain global
/// `let` because `SupabaseClient` is `Sendable` and immutable here, so it needs
/// no store wrapper and is safe to touch from any actor.
///
/// URL and anon key are read from the Info.plist, which is populated by
/// build-setting substitution from the gitignored `Config/Secrets.xcconfig`
/// (`$(SUPABASE_URL)` / `$(SUPABASE_ANON_KEY)`). Nothing secret is hardcoded.
///
/// The anon key is *designed* to ship inside a client binary — Row Level
/// Security, not key secrecy, is the access-control boundary. The service-role
/// key has no reason to exist on a device and must never appear in this repo.
let supabase: SupabaseClient = {
    let info = Bundle.main.infoDictionary
    guard
        let urlString = info?["SUPABASE_URL"] as? String, !urlString.isEmpty,
        let url = URL(string: urlString),
        let anonKey = info?["SUPABASE_ANON_KEY"] as? String, !anonKey.isEmpty
    else {
        // A misconfigured build should fail loudly at launch, not silently talk
        // to nowhere. Copy Secrets.xcconfig.example → Secrets.xcconfig to fix.
        fatalError("""
        Supabase config missing from Info.plist. Copy \
        Config/Secrets.xcconfig.example to Config/Secrets.xcconfig and fill in \
        SUPABASE_URL and SUPABASE_ANON_KEY.
        """)
    }
    return SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
}()
