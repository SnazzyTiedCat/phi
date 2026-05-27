"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Shared email/password form for both login and signup.
 *
 * Why one component for both: the two screens are visually identical and share
 * all the same state (email, password, loading, error). The only differences
 * are (a) which Supabase call to make and (b) the surrounding copy/links — so
 * we pass `mode` in and branch on it. This avoids two near-duplicate files
 * drifting out of sync.
 *
 * This is a Client Component because forms need React state (controlled inputs,
 * loading + error UI) and the Supabase browser client, which both only run in
 * the browser.
 */
type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Pick the right Supabase call based on mode. Both write the auth session
    // to cookies on success, which the server client can then read.
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Send the user to the dashboard. router.refresh() forces Next to re-fetch
    // server components with the new session cookie attached, so the app sees
    // the user as logged in immediately.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative w-full max-w-sm">
      {/* Card */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface/80 p-8 backdrop-blur-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isSignup
              ? "Start learning from your own material."
              : "Sign in to continue learning."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wider text-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
              placeholder="you@school.edu"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wider text-muted"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
              placeholder="••••••••"
            />
          </div>

          {/* Error message — only renders when Supabase returns an error. */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
              ? "Create account"
              : "Sign in"}
          </button>
        </form>
      </div>

      {/* Toggle between login and signup. */}
      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-accent transition-opacity hover:opacity-80"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-accent transition-opacity hover:opacity-80"
            >
              Create one
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
