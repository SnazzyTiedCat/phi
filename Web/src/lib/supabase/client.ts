import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * Use this in Client Components ("use client") — anything that runs in the
 * user's browser. It reads the public env vars (safe to expose: the anon key
 * is designed to be public and is gated by Supabase Row Level Security).
 *
 * createBrowserClient handles auth session persistence in cookies for us, so
 * the session survives page reloads and is readable by the server client too.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
