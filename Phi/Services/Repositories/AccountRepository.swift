import Foundation
import Supabase

/// Account-level operations that span storage and auth.
struct AccountRepository {
    /// Deletes the signed-in account and everything it owns.
    ///
    /// The order matters. Storage goes first. Deleting the auth user cascades to
    /// the ios rows, but not to the files, which have no foreign key. Once the
    /// user is gone, the storage policy can no longer match `auth.uid()`, so the
    /// files could never be removed afterward. If the RPC fails after storage is
    /// cleared, the account survives with no files, and a retry finishes the job.
    func deleteAccount(userID: UUID) async throws {
        // 1. Files, while the session still passes the storage policy.
        try await MaterialStorage().removeAll(under: userID.uuidString.lowercased())

        // 2. Auth user. The FK cascade removes every ios.* row. The function is
        //    in ios_account_deletion.sql, which is not applied automatically.
        // VERIFY: rpc("delete_my_account") with no params, via schema("ios").
        try await supabase.schema("ios")
            .rpc("delete_my_account")
            .execute()

        // 3. Local session. Scope `.local`: the server session is already gone,
        //    so a global sign-out would call the server with a dead token.
        // VERIFY: SignOutScope.local.
        try await supabase.auth.signOut(scope: .local)
    }
}
