"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Settings page — where the student stores their own API keys.
 *
 * WHY this is a Client Component ("use client"):
 * localStorage only exists in the browser. A Server Component can't read or
 * write it. Since the whole job of this page is reading/writing the Anthropic
 * key from localStorage, the entire page is a client component.
 *
 * WHY localStorage (and not the database) for the MVP:
 * Per the project plan, the key stays in the browser for now — simple, private,
 * no server involvement. It migrates to secure Supabase storage in V2. The exact
 * storage key ("phi_anthropic_key") is a contract: anything else that needs the
 * key later must read the SAME name. (Read-aloud used to also store an ElevenLabs
 * key here; that's gone — TTS now uses the browser's keyless Web Speech API.)
 *
 * Note: this page sits inside the (app) route group, so the server-side auth
 * gate in (app)/layout.tsx already protects it — a logged-out user never gets
 * here. This component doesn't need to re-check auth.
 */

// Centralized so the read (useEffect) and write (handleSave) can't drift apart.
const ANTHROPIC_KEY = "phi_anthropic_key";

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [saved, setSaved] = useState(false);

  // ── Account / email confirmation ──────────────────────────────────────────
  // The signed-in user's email, and whether it still needs confirming. We start
  // `needsConfirmation` at false so the Account section stays hidden until we've
  // actually fetched the user and learned their email is unverified — no flash
  // of the section for someone whose email is already confirmed.
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  // Resend request state: an in-flight flag (disables the button), a one-shot
  // success flag, and an error message.
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");

  // On mount, hydrate the input from localStorage. The empty dependency array
  // means this runs ONCE after the first render. We can't read localStorage
  // during render or as the initial useState value because this code is
  // server-rendered first (where `window`/localStorage don't exist) — doing so
  // would crash or cause a hydration mismatch. useEffect only runs in the
  // browser, which is exactly where localStorage lives.
  useEffect(() => {
    setAnthropicKey(localStorage.getItem(ANTHROPIC_KEY) ?? "");
  }, []);

  // Fetch the signed-in user from the BROWSER Supabase client to learn their
  // email and confirmation status. getUser() returns a Promise, so we set state
  // inside its `.then` callback (not synchronously in the effect body) — that's
  // the standard way to sync an async external source into React. `active`
  // guards against the request resolving after this component has unmounted.
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const user = data.user;
      if (!user) return;
      setAccountEmail(user.email ?? null);
      // The spec says check `email_confirmed_at === null`; we treat any falsy
      // value (null OR undefined) as "not confirmed" so the section can't be
      // skipped just because Supabase returned undefined instead of null.
      setNeedsConfirmation(!user.email_confirmed_at);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Write the key under its fixed name. We trim to avoid storing a stray space
    // the user pasted in — API keys never have leading/trailing spaces.
    localStorage.setItem(ANTHROPIC_KEY, anthropicKey.trim());

    // Flash the success message, then auto-hide it after 2s so the UI settles
    // back to a calm resting state.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Resend the confirmation email ─────────────────────────────────────────
  // Ask Supabase to re-send the signup confirmation link to the user's email.
  async function handleResend() {
    // Need an email to send to, and don't fire a second request over the first.
    if (!accountEmail || isResending) return;

    // Clear any prior outcome before the new attempt.
    setResendError("");
    setResendSuccess(false);
    setIsResending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: accountEmail,
      });
      if (error) {
        // Supabase rejected it (rate-limited, already confirmed, etc.) — show
        // its message so the student knows what happened.
        setResendError(error.message || "Could not send the email. Please try again.");
        return;
      }
      setResendSuccess(true);
    } catch {
      // The request never reached Supabase (network down).
      setResendError("Network error. Check your connection and try again.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your Anthropic API key is stored only in this browser. It never touches
        our servers.
      </p>

      {/* Same card styling as the auth form for a consistent product feel. */}
      <form
        onSubmit={handleSave}
        className="glass-standard shadow-card mt-8 space-y-6 rounded-2xl p-8"
      >
        <div className="space-y-2">
          <label
            htmlFor="anthropic-key"
            className="block text-xs font-medium uppercase tracking-wider text-muted"
          >
            Anthropic API key
          </label>
          <input
            id="anthropic-key"
            // type="password" masks the key so it isn't shoulder-surfed.
            type="password"
            // These keys are secrets — never let the browser autofill/save them.
            autoComplete="off"
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
            placeholder="sk-ant-..."
          />
          {/* Heads-up that an alternative provider is on the way — muted + xs so
              it informs without competing with the field itself. */}
          <p className="text-xs text-muted">
            OpenAI API key support is coming soon.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            Save keys
          </button>

          {/* Success message. role="status" + aria-live="polite" makes screen
              readers announce "Keys saved" without stealing focus. It only
              renders while `saved` is true (the 2s window). */}
          {saved && (
            <span
              role="status"
              aria-live="polite"
              className="text-sm text-accent"
            >
              Keys saved
            </span>
          )}
        </div>
      </form>

      {/* ── Account ─────────────────────────────────────────────────────────
          Only rendered when the user's email is unconfirmed. Same card styling
          as the keys form above so the page reads as one cohesive surface. */}
      {needsConfirmation && (
        <section className="glass-standard shadow-card mt-8 rounded-2xl p-8">
          <h2 className="text-base font-medium text-text">Account</h2>
          <p className="mt-2 text-sm text-muted">
            {accountEmail ? (
              <>
                <span className="text-text">{accountEmail}</span> isn’t confirmed
                yet. Resend the link to verify it.
              </>
            ) : (
              "Your email isn’t confirmed yet. Resend the link to verify it."
            )}
          </p>

          <div className="mt-5 flex items-center gap-4">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-accent disabled:hover:shadow-none"
            >
              {isResending ? "Sending…" : "Resend confirmation email"}
            </button>

            {/* Success — gold, as specced. role="status" announces it politely. */}
            {resendSuccess && (
              <span role="status" aria-live="polite" className="text-sm text-accent">
                Confirmation email sent
              </span>
            )}

            {/* Failure — red, announced assertively via role="alert". */}
            {resendError && (
              <span role="alert" className="text-sm text-red-400">
                {resendError}
              </span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
