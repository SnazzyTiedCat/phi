"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useFont } from "@/contexts/FontContext";
import {
  EXPLANATION_DEPTH_KEY,
  type ExplanationDepth,
} from "@/lib/tutor-depth";

/**
 * Account — the single settings surface (this replaced /settings).
 *
 * A Client Component because almost everything here is browser-only: the API key
 * and preferences live in localStorage, the font toggle drives a client context,
 * and the email/password/sign-out/delete actions use the browser Supabase client.
 * The (app) layout's server-side auth gate already guarantees a signed-in user.
 */

// localStorage contract — must match where these values are READ (LessonView for
// the key + depth; FontContext for the font).
const ANTHROPIC_KEY = "phi_anthropic_key";

// Shared button/input styles, so every card reads as one cohesive surface.
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-lg bg-accent px-5 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#e2bb68] hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-accent disabled:hover:shadow-none";
const BTN_SECONDARY =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 px-5 py-3 text-sm font-medium text-text transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const INPUT =
  "w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60";

export default function AccountPage() {
  const router = useRouter();
  // Lazy-init so the browser client is created once, not on every render.
  const [supabase] = useState(() => createClient());
  const { font, setFont } = useFont();

  // ── API key ────────────────────────────────────────────────────────────────
  const [anthropicKey, setAnthropicKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);

  // ── Tutor: explanation depth ─────────────────────────────────────────────--
  const [depth, setDepth] = useState<ExplanationDepth>("standard");

  // ── Account: email / password / delete ──────────────────────────────────────
  const [email, setEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  // Hydrate localStorage-backed fields once, in the browser. Deferred via rAF so
  // these aren't synchronous (cascading) setStates inside the effect body.
  useEffect(() => {
    const key = localStorage.getItem(ANTHROPIC_KEY) ?? "";
    const stored = localStorage.getItem(EXPLANATION_DEPTH_KEY);
    const storedDepth =
      stored === "concise" || stored === "standard" || stored === "thorough"
        ? stored
        : null;
    const id = requestAnimationFrame(() => {
      setAnthropicKey(key);
      if (storedDepth) setDepth(storedDepth);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Prefill the email field with the current account email.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active && data.user?.email) setEmail(data.user.email);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  // Modal: close on Escape (unless mid-delete) and lock background scroll.
  useEffect(() => {
    if (!showDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) setShowDelete(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [showDelete, deleting]);

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem(ANTHROPIC_KEY, anthropicKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  }

  function changeDepth(next: ExplanationDepth) {
    setDepth(next);
    localStorage.setItem(EXPLANATION_DEPTH_KEY, next);
  }

  async function handleEmailUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || emailLoading) return;
    setEmailLoading(true);
    setEmailMsg("");
    setEmailErr("");
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setEmailLoading(false);
    if (error) {
      setEmailErr(error.message);
      return;
    }
    setEmailMsg("Check your inbox to confirm the change.");
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6 || pwLoading) return;
    setPwLoading(true);
    setPwMsg("");
    setPwErr("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwErr(error.message);
      return;
    }
    setNewPassword("");
    setPwMsg("Password updated.");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDelete() {
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteErr("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteErr(data.error || "Could not delete your account.");
        setDeleting(false);
        return;
      }
      // The account is gone — clear the local session and leave.
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setDeleteErr("Network error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text">Account</h1>

      <div className="mt-8 flex flex-col gap-4">
        {/* ── API Key ─────────────────────────────────────────────────────── */}
        <Card title="API Key">
          <form onSubmit={handleSaveKey} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="anthropic-key"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                Anthropic API key
              </label>
              <input
                id="anthropic-key"
                type="password"
                autoComplete="off"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className={INPUT}
                placeholder="sk-ant-..."
              />
              <p className="text-xs text-muted">
                Stored only in this browser — it never reaches our servers. OpenAI
                support is coming soon.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button type="submit" className={BTN_PRIMARY}>
                Save key
              </button>
              {keySaved && (
                <span role="status" aria-live="polite" className="text-sm text-accent">
                  Saved
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <Card title="Appearance">
          <SettingRow
            label="Reading font"
            hint="The typeface used across lessons and pages."
          >
            <Segmented
              value={font}
              onChange={setFont}
              options={[
                { value: "mono", label: "Space Mono" },
                { value: "inter", label: "Inter" },
              ]}
            />
          </SettingRow>
        </Card>

        {/* ── Tutor ───────────────────────────────────────────────────────── */}
        <Card title="Tutor">
          <SettingRow
            label="Explanation depth"
            hint="How much detail Phi goes into when teaching and answering."
          >
            <Segmented
              value={depth}
              onChange={changeDepth}
              options={[
                { value: "concise", label: "Concise" },
                { value: "standard", label: "Standard" },
                { value: "thorough", label: "Thorough" },
              ]}
            />
          </SettingRow>
          <p className="mt-4 text-xs text-muted">
            More tutor personalities are coming — this is the first of them.
          </p>
        </Card>

        {/* ── Memory & Data ───────────────────────────────────────────────── */}
        <Card title="Memory & Data">
          <div className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              Phi stores your uploaded materials, generated lessons, flashcards,
              and quizzes.
            </p>
            <p>
              Your Anthropic API key is stored only in your browser and never
              reaches our servers.
            </p>
            <p className="text-xs text-c-600">
              Privacy Policy and Terms of Service — coming soon.
            </p>
          </div>
        </Card>

        {/* ── Account ─────────────────────────────────────────────────────── */}
        <Card title="Account">
          <div className="space-y-6">
            {/* Email */}
            <form onSubmit={handleEmailUpdate} className="space-y-2">
              <label
                htmlFor="account-email"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                Email
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  placeholder="you@school.edu"
                />
                <button type="submit" disabled={emailLoading} className={BTN_SECONDARY}>
                  {emailLoading ? "Saving…" : "Update"}
                </button>
              </div>
              {emailMsg && <p className="text-sm text-accent">{emailMsg}</p>}
              {emailErr && (
                <p role="alert" className="text-sm text-red-400">
                  {emailErr}
                </p>
              )}
            </form>

            {/* Password */}
            <form onSubmit={handlePasswordUpdate} className="space-y-2">
              <label
                htmlFor="account-password"
                className="block text-xs font-medium uppercase tracking-wider text-muted"
              >
                New password
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="account-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={INPUT}
                  placeholder="••••••••"
                />
                <button type="submit" disabled={pwLoading} className={BTN_SECONDARY}>
                  {pwLoading ? "Saving…" : "Update"}
                </button>
              </div>
              {pwMsg && <p className="text-sm text-accent">{pwMsg}</p>}
              {pwErr && (
                <p role="alert" className="text-sm text-red-400">
                  {pwErr}
                </p>
              )}
            </form>

            {/* Sign out */}
            <div>
              <button type="button" onClick={handleSignOut} className={BTN_SECONDARY}>
                Sign out
              </button>
            </div>

            {/* Delete */}
            <div className="border-t border-white/10 pt-6">
              <p className="text-sm font-medium text-text">Delete account</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Permanently deletes your account and all your data. This can&apos;t
                be undone.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm("");
                  setDeleteErr("");
                  setShowDelete(true);
                }}
                className="mt-3 inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 transition-colors duration-200 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400"
              >
                Delete account
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete confirmation modal — portaled to <body> so its fixed positioning
          anchors to the viewport, not to PageTransition's lingering transform. */}
      {showDelete &&
        createPortal(
          <div
            onClick={() => !deleting && setShowDelete(false)}
            className="animate-overlay-in fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Delete account"
              onClick={(e) => e.stopPropagation()}
              className="animate-modal-in relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/90 p-8 shadow-2xl backdrop-blur-xl"
            >
              <h2 className="text-lg font-semibold text-text">Delete account</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                This permanently deletes your account, materials, lessons,
                flashcards, and quizzes. This cannot be undone.
              </p>
              <p className="mt-4 text-sm text-muted">
                Type <span className="font-bold text-text">DELETE</span> to confirm.
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className={`mt-2 ${INPUT}`}
                placeholder="DELETE"
                aria-label="Type DELETE to confirm"
              />
              {deleteErr && (
                <p role="alert" className="mt-2 text-sm text-red-400">
                  {deleteErr}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDelete(false)}
                  disabled={deleting}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-white/25 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  className="inline-flex items-center justify-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? "Deleting…" : "Delete account"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-standard shadow-card rounded-2xl p-6">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

// A label + hint on the left, a control on the right; stacks on narrow screens.
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-text">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

// A pill segmented control. Generic so it works for any string-valued setting.
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-background/40 p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${
              active
                ? "bg-accent font-medium text-background"
                : "text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
