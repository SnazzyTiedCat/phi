"use client";

import { useEffect, useState } from "react";

/**
 * Settings page — where the student stores their own API keys.
 *
 * WHY this is a Client Component ("use client"):
 * localStorage only exists in the browser. A Server Component can't read or
 * write it. Since the whole job of this page is reading/writing two keys from
 * localStorage, the entire page is a client component.
 *
 * WHY localStorage (and not the database) for the MVP:
 * Per the project plan, keys stay in the browser for now — simple, private, no
 * server involvement. They migrate to secure Supabase storage in V2. The exact
 * storage keys ("phi_anthropic_key" / "phi_elevenlabs_key") are a contract:
 * anything else that needs these keys later must read the SAME names.
 *
 * Note: this page sits inside the (app) route group, so the server-side auth
 * gate in (app)/layout.tsx already protects it — a logged-out user never gets
 * here. This component doesn't need to re-check auth.
 */

// Centralized so the read (useEffect) and write (handleSave) can't drift apart.
const ANTHROPIC_KEY = "phi_anthropic_key";
const ELEVENLABS_KEY = "phi_elevenlabs_key";

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [saved, setSaved] = useState(false);

  // On mount, hydrate the inputs from localStorage. The empty dependency array
  // means this runs ONCE after the first render. We can't read localStorage
  // during render or as the initial useState value because this code is
  // server-rendered first (where `window`/localStorage don't exist) — doing so
  // would crash or cause a hydration mismatch. useEffect only runs in the
  // browser, which is exactly where localStorage lives.
  useEffect(() => {
    setAnthropicKey(localStorage.getItem(ANTHROPIC_KEY) ?? "");
    setElevenLabsKey(localStorage.getItem(ELEVENLABS_KEY) ?? "");
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Write both keys under their fixed names. We trim to avoid storing a stray
    // space the user pasted in — API keys never have leading/trailing spaces.
    localStorage.setItem(ANTHROPIC_KEY, anthropicKey.trim());
    localStorage.setItem(ELEVENLABS_KEY, elevenLabsKey.trim());

    // Flash the success message, then auto-hide it after 2s so the UI settles
    // back to a calm resting state.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Settings
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your API keys are stored only in this browser. They never touch our
        servers.
      </p>

      {/* Same card styling as the auth form for a consistent product feel. */}
      <form
        onSubmit={handleSave}
        className="mt-8 space-y-6 rounded-2xl border border-white/[0.06] bg-surface/80 p-8 backdrop-blur-sm"
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
        </div>

        <div className="space-y-2">
          <label
            htmlFor="elevenlabs-key"
            className="block text-xs font-medium uppercase tracking-wider text-muted"
          >
            ElevenLabs API key
          </label>
          <input
            id="elevenlabs-key"
            type="password"
            autoComplete="off"
            value={elevenLabsKey}
            onChange={(e) => setElevenLabsKey(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60"
            placeholder="..."
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] active:scale-[0.99]"
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
    </div>
  );
}
