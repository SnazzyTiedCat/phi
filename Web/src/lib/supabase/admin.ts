import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — FULL admin access that BYPASSES Row Level
 * Security. SERVER-ONLY. Never import this into a Client Component or anything
 * that ships to the browser: the service-role key is a master credential.
 *
 * It exists for privileged operations the anon key can't perform — chiefly
 * `auth.admin.deleteUser`, which permanently removes an auth user (and, given
 * ON DELETE CASCADE foreign keys, their rows). The key comes from
 * SUPABASE_SERVICE_ROLE_KEY (NOT a NEXT_PUBLIC_ var, so it never reaches the
 * client bundle). It must be set in .env.local and in the Vercel project env.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase admin configuration. Set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL).",
    );
  }

  // No session persistence/refresh — this is a stateless server client used for
  // a single privileged call, not a logged-in user session.
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
