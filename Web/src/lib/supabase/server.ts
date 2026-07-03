import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client.
 *
 * Use this in Server Components, Route Handlers, and Server Actions — anything
 * that runs on the server. It reads/writes the auth session from Next.js
 * cookies so the server knows who the logged-in user is.
 *
 * Note: this is async because in Next 15+ `cookies()` returns a Promise and
 * must be awaited. Always `await createClient()` at the call site.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase reads all cookies to find the existing session.
        getAll() {
          return cookieStore.getAll();
        },
        // Supabase writes refreshed session cookies back here. The try/catch
        // guards the case where this runs in a Server Component, where cookies
        // are read-only — without middleware that path can't set cookies, and
        // that's fine for our MVP (Server Actions and Route Handlers CAN set
        // them, which is where our login/signup writes happen).
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // No-op: called from a Server Component render. Safe to ignore.
          }
        },
      },
    }
  );
}
