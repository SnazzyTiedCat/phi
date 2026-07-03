import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/account/delete
 *
 * Permanently deletes the signed-in user's account. Deleting an auth user is a
 * privileged operation the anon key can't perform, so it needs the service-role
 * key — which must NEVER reach the browser (hence this server route).
 *
 *   1. Verify the session with the normal cookie-bound server client. We delete
 *      ONLY the currently signed-in user — never an id taken from the request
 *      body — so one user can't delete another.
 *   2. Use the service-role admin client to delete that user. ON DELETE CASCADE
 *      foreign keys (chunks/sources/lessons/flashcards/quizzes → auth.users)
 *      remove their data along with the account.
 */
export const runtime = "nodejs";

export async function POST() {
  // 1) Who's asking? getUser() validates against Supabase's auth server.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2) Build the privileged client. createAdminClient throws when
  //    SUPABASE_SERVICE_ROLE_KEY isn't configured — translate that into a clean
  //    500 rather than a stack trace.
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error("[account/delete] admin client unavailable:", err);
    return NextResponse.json(
      { error: "Account deletion isn't configured. Please contact support." },
      { status: 500 },
    );
  }

  // 3) Delete this exact user. Cascading FKs handle their rows.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] deleteUser error:", error);
    return NextResponse.json(
      { error: "Could not delete your account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
