"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

/**
 * LessonView — the interactive half of the lesson page.
 *
 * The Server Component (lesson/page.tsx) fetched the chunks and passed them
 * here. This component runs in the BROWSER, which is the only place that can:
 *   1. Read the Anthropic API key out of localStorage, and
 *   2. POST it to /api/lesson to generate the taught lesson.
 *
 * The whole component is a small state machine. At any moment we're in exactly
 * one of four states, and each renders a different thing:
 *
 *   "no-key"  → student hasn't saved an Anthropic key yet → point them to Settings
 *   "loading" → request in flight → calm "preparing your lesson" screen
 *   "error"   → request failed → show the message we got back
 *   "done"    → success → render the lesson markdown
 *
 * Using one `status` string (instead of several booleans) makes the states
 * mutually exclusive by construction — you can't accidentally be "loading" and
 * "error" at the same time.
 */

type Props = {
  chunks: string[];
  source: string;
};

type Status = "loading" | "no-key" | "error" | "done";

export default function LessonView({ chunks, source }: Props) {
  // Start in "loading": the moment the component mounts we'll either kick off
  // the request or immediately flip to "no-key". Starting here avoids a flash
  // of empty content before the effect runs.
  const [status, setStatus] = useState<Status>("loading");
  const [lesson, setLesson] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // We define the request as an inner async function because `useEffect`'s
    // callback itself cannot be `async` (it must return either nothing or a
    // cleanup function, not a Promise).
    async function generate() {
      // 1) Read the key from localStorage. This is safe here because the effect
      //    only runs in the browser (effects never run during server render).
      const apiKey = localStorage.getItem("phi_anthropic_key");

      // 2) No key (null) or empty string → can't call the API. Switch to the
      //    "no-key" state, which renders the "add your key in Settings" prompt.
      if (!apiKey) {
        setStatus("no-key");
        return;
      }

      // 3) Key exists → request the lesson.
      try {
        const res = await fetch("/api/lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunks, source, apiKey }),
        });

        const data: { lesson?: string; error?: string } = await res.json();

        if (!res.ok) {
          // The route handler always sends `{ error }` on failure. Fall back to
          // a generic message if for some reason it didn't.
          setErrorMessage(data.error || "Something went wrong. Please try again.");
          setStatus("error");
          return;
        }

        // Success: stash the markdown and flip to "done".
        setLesson(data.lesson ?? "");
        setStatus("done");
      } catch {
        // A thrown error here means the fetch itself failed (network down,
        // request aborted) — distinct from an error STATUS the server returned.
        setErrorMessage("Network error. Check your connection and try again.");
        setStatus("error");
      }
    }

    generate();
    // Empty dependency array = run exactly once, when the component mounts.
    // `chunks`/`source` come from the server render and don't change while
    // this component is alive, so there's no need to re-run on their account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── No API key ────────────────────────────────────────────────────────────
  // The student can't generate anything without a key. Send them to Settings
  // with a clear, gold-accented link (the accent is reserved for the primary
  // action on the screen).
  if (status === "no-key") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="text-4xl font-extralight leading-none text-accent"
        >
          φ
        </span>
        <p className="mt-6 text-sm text-muted">
          Add your Anthropic API key in{" "}
          <Link
            href="/settings"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Settings
          </Link>{" "}
          to start learning
        </p>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────--
  // A calm, centered holding screen. The φ pulses gently (the glow-breathe
  // animation already defined in globals.css) so the wait feels alive rather
  // than frozen. Muted text keeps it quiet.
  if (status === "loading") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <span
          aria-hidden="true"
          className="animate-glow-breathe text-5xl font-extralight leading-none text-accent"
        >
          φ
        </span>
        <p className="mt-6 text-sm text-muted">Phi is preparing your lesson…</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────--
  // Show the message the server (or our catch block) produced. `role="alert"`
  // makes screen readers announce it. Red-tinted text signals failure without
  // breaking the dark theme.
  if (status === "error") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      </div>
    );
  }

  // ── Done: render the lesson ─────────────────────────────────────────────--
  // `react-markdown` turns the markdown string into real HTML elements (h1, h2,
  // p, ul, …). We DON'T have the @tailwindcss/typography plugin installed, so
  // instead of `prose` classes we style those generated elements directly using
  // Tailwind's arbitrary-variant child selectors on the wrapper:
  //
  //     [&_h1]:text-3xl   →  applies text-3xl to every <h1> inside this div
  //
  // This keeps all the lesson typography in one place (this className) and needs
  // no extra dependency. If we add @tailwindcss/typography later, this can be
  // swapped for a single `prose prose-invert` class.
  return (
    <article
      className="
        mx-auto max-w-3xl px-6 py-12 leading-relaxed text-text
        [&_h1]:mb-4 [&_h1]:mt-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-text
        [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-text
        [&_h3]:mb-2 [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:text-text
        [&_p]:my-4 [&_p]:text-base [&_p]:text-text/90
        [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-text/90
        [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-text/90
        [&_li]:my-1
        [&_strong]:font-semibold [&_strong]:text-text
        [&_em]:italic
        [&_a]:text-accent [&_a]:underline-offset-4 hover:[&_a]:underline
        [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_blockquote]:italic
        [&_code]:rounded [&_code]:bg-surface [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-accent
        [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-surface [&_pre]:p-4
        [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-text
        [&_hr]:my-8 [&_hr]:border-white/10
      "
    >
      <ReactMarkdown>{lesson}</ReactMarkdown>
    </article>
  );
}
