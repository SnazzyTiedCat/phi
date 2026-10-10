import Foundation
import Supabase

/// Account-level operations that span storage and auth.
struct AccountRepository {
    /// Deletes the signed-in account and everything it owns.
    ///
    /// The order matters. The server-side account deletion must succeed before
    /// storage is touched. Otherwise a missing or failing RPC can leave the
    /// account alive with material rows pointing at files that are already gone.
    func deleteAccount(userID: UUID) async throws {
        // 1. Auth user. The FK cascade removes every ios.* row. The function is
        //    in ios_account_deletion.sql, which is not applied automatically.
        // VERIFY: rpc("delete_my_account") with no params, via schema("ios").
        try await supabase.schema("ios")
            .rpc("delete_my_account")
            .execute()

        // 2. Files. The local access token is still present until sign-out below,
        //    so the storage policy can authorize immediate cleanup. If this
        //    fails, a retry never leaves live material rows pointing at missing
        //    files, because the account deletion already cascaded those rows.
        try await MaterialStorage().removeAll(under: userID.uuidString.lowercased())

        // 3. Local session. Scope `.local`: the server session is already gone,
        //    so a global sign-out would call the server with a dead token.
        // VERIFY: SignOutScope.local.
        try await supabase.auth.signOut(scope: .local)
    }
}
