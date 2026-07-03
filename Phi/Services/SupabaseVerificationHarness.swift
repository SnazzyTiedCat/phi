#if DEBUG
import Foundation
import Supabase

/// TEMPORARY verification scaffolding for Chunk 3 — not a shipped feature.
/// Wrapped entirely in `#if DEBUG` so it can never reach a release build.
/// Triggered by a DEBUG-only toolbar button on the Dashboard; results print to
/// the console. Delete this file (and its Dashboard trigger) once the DONE WHEN
/// conditions are confirmed.
///
/// Targets `ios.materials` via `supabase.schema("ios")` — the isolated schema
/// this chunk creates, NOT the web app's `public` schema. Requires the two
/// manual dashboard steps first (Anonymous Sign-Ins enabled; `ios` exposed in
/// the Data API) and the SQL file applied — otherwise every call errors.
enum SupabaseVerificationHarness {
    private struct MaterialInsert: Encodable {
        let user_id: UUID
        let title: String
    }

    private struct MaterialRow: Decodable, Identifiable {
        let id: UUID
        let user_id: UUID
        let title: String
    }

    /// Insert a row scoped to the current identity, read it back in the same
    /// session, and report whether it round-trips. On a fresh identity (after a
    /// simulator reset) the read should come back empty — that's RLS filtering,
    /// proving cross-user isolation, not an error.
    static func run() async {
        guard let uid = IdentityStore.shared.currentUserID else {
            print("[Harness] No identity yet. Bootstrap must succeed first — is "
                + "Anonymous Sign-In enabled in the Supabase dashboard?")
            return
        }
        print("[Harness] identity = \(uid)")

        do {
            // Read what THIS identity can already see (relaunch/cross-user step).
            let existing: [MaterialRow] = try await supabase
                .schema("ios")
                .from("materials")
                .select()
                .eq("user_id", value: uid)
                .execute()
                .value
            print("[Harness] rows visible to this identity before insert: \(existing.count)")

            // Insert one row scoped to this identity, returning the created row.
            let inserted: MaterialRow = try await supabase
                .schema("ios")
                .from("materials")
                .insert(MaterialInsert(user_id: uid, title: "roundtrip-\(UUID().uuidString.prefix(8))"))
                .select()
                .single()
                .execute()
                .value
            print("[Harness] inserted id=\(inserted.id) title=\(inserted.title)")

            // Read it back in the same session.
            let readBack: [MaterialRow] = try await supabase
                .schema("ios")
                .from("materials")
                .select()
                .eq("id", value: inserted.id)
                .execute()
                .value
            let ok = readBack.contains { $0.id == inserted.id }
            print("[Harness] round-trip \(ok ? "OK ✅" : "FAILED ❌") (read \(readBack.count) row(s))")
        } catch {
            print("[Harness] error: \(error)")
        }
    }
}
#endif
