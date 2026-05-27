"use client";

import { useEffect, useRef, useState } from "react";
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

// One chat turn. Same shape the /api/chat route expects in its `history` array,
// and the same shape Anthropic's `messages` array uses — so what we keep in
// state maps 1:1 onto what we send, no translation needed.
type Message = { role: "user" | "assistant"; content: string };

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

  // ── Chat sidebar state ──────────────────────────────────────────────────--
  // The whole conversation, oldest first. We render this list and also send it
  // (minus the in-flight message) to /api/chat as `history`.
  const [messages, setMessages] = useState<Message[]>([]);
  // The controlled textarea value.
  const [chatInput, setChatInput] = useState("");
  // True while a request is in flight. Disables the input + send button so the
  // student can't fire a second request on top of the first.
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Auto-scroll anchor. We put an empty div at the very bottom of the message
  // list and scroll it into view whenever `messages` changes — so the newest
  // message (and each streamed token) stays visible without manual scrolling.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // `block: "end"` keeps the anchor pinned to the bottom of the scroll area.
    // This runs on every messages change, including each streamed token, so the
    // view tracks the growing assistant reply in real time.
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // ── Send a chat message ─────────────────────────────────────────────────--
  // Optimistically renders the student's message, then opens the streaming
  // response and grows the assistant's reply token-by-token.
  async function sendMessage() {
    const trimmed = chatInput.trim();
    // Bail on empty input or while a request is already running.
    if (trimmed.length === 0 || isChatLoading) return;

    // The key lives in localStorage (same as the lesson request). If it's gone
    // (cleared since the lesson loaded), show that as an assistant message
    // rather than firing a request we know will fail.
    const apiKey = localStorage.getItem("phi_anthropic_key");
    if (!apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: "Add your Anthropic API key in Settings to chat.",
        },
      ]);
      setChatInput("");
      return;
    }

    // Snapshot the history we'll SEND: everything so far, BEFORE this new turn.
    // The route appends the new message itself, so `history` must not include
    // it — otherwise the question would be duplicated in the prompt.
    const history = messages;

    // Optimistic update: show the student's message immediately. We don't wait
    // for the network — the UI should feel instant.
    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, source, history, apiKey }),
      });

      // Errors come back as JSON (the route returns JSON { error } for any
      // failure that happens before streaming begins — bad key, no quota, etc).
      // A successful streamed reply is text/plain, so we branch on Content-Type.
      const contentType = res.headers.get("Content-Type") ?? "";

      if (!res.ok || contentType.includes("application/json")) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      // Streaming success. We have no body reader = treat as empty reply.
      if (!res.body) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Phi sent an empty reply. Please try again." },
        ]);
        return;
      }

      // Add an empty assistant message we'll grow as tokens arrive. We update
      // the SAME message in place (replacing the LAST item) rather than
      // appending a new bubble per token. Updating "the last message" instead
      // of a captured index keeps this correct even if state shifts — and only
      // one send can be in flight at a time (isChatLoading guards it), so the
      // last message is always this turn's assistant reply.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      // Read the text/plain stream chunk-by-chunk. `TextDecoder` with
      // `stream: true` correctly handles multi-byte characters that get split
      // across chunk boundaries.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Replace the last message (the assistant placeholder) with everything
        // received so far.
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: accumulated };
          return next;
        });
      }
    } catch {
      // The fetch itself failed (network down). Distinct from a server-returned
      // error status, which we handled above as JSON.
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Check your connection and try again.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

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
  // Skeleton that mirrors the lesson layout: wide title block, narrower subtitle,
  // then a series of paragraph-width bars. `animate-pulse` fades them in and out
  // so the screen feels alive. All blocks use bg-surface (the dark card color
  // from globals.css) — slightly lighter than the page background, visible but
  // not jarring against the dark theme.
  if (status === "loading") {
    return (
      <div
        aria-label="Loading lesson…"
        aria-busy="true"
        className="mx-auto max-w-3xl px-6 py-12 animate-pulse"
      >
        {/* Title */}
        <div className="h-9 w-2/3 rounded-lg bg-surface" />
        {/* Subtitle / intro line */}
        <div className="mt-4 h-5 w-1/2 rounded bg-surface" />

        {/* First section */}
        <div className="mt-12 h-6 w-2/5 rounded-lg bg-surface" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-surface" />
          <div className="h-4 w-full rounded bg-surface" />
          <div className="h-4 w-4/5 rounded bg-surface" />
        </div>

        {/* Second section */}
        <div className="mt-10 h-6 w-1/3 rounded-lg bg-surface" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-surface" />
          <div className="h-4 w-11/12 rounded bg-surface" />
          <div className="h-4 w-3/4 rounded bg-surface" />
        </div>

        {/* Third section */}
        <div className="mt-10 h-6 w-2/5 rounded-lg bg-surface" />
        <div className="mt-4 space-y-2">
          <div className="h-4 w-full rounded bg-surface" />
          <div className="h-4 w-5/6 rounded bg-surface" />
          <div className="h-4 w-full rounded bg-surface" />
          <div className="h-4 w-2/3 rounded bg-surface" />
        </div>
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
  // Two-column layout: lesson on the left, chat sidebar on the right.
  //
  //   - `flex-col lg:flex-row` → stacked on mobile (lesson, then chat below),
  //     side-by-side from the `lg` breakpoint up.
  //   - The lesson <main> takes 2/3 of the width on desktop, the <aside> 1/3.
  //   - On desktop the sidebar is `sticky top-0 h-screen` so it stays in view
  //     and scrolls its OWN message list while the lesson scrolls the page.
  //     On mobile it has natural height and just sits under the lesson.
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left: the taught lesson. The article keeps all the markdown typography
          from before; we only swapped its page-spanning `mx-auto max-w-3xl` for
          `flex-1` + an inner max-width so it reads well inside the 2/3 column. */}
      <main className="flex-1 lg:w-2/3">
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
      </main>

      {/* Right: the chat sidebar. `bg-surface` lifts it off the page bg; the
          left border is a quiet divider. On desktop it's a fixed-height column
          (`lg:h-screen lg:sticky lg:top-0`) split into three stacked rows:
          header, scrollable message list, and the input. `flex flex-col`
          makes the middle row (`flex-1 overflow-y-auto`) absorb the leftover
          height so the header and input stay pinned. */}
      <aside
        className="
          flex flex-col border-t border-white/10 bg-surface
          lg:h-[calc(100vh-4rem)] lg:w-1/3 lg:sticky lg:top-16 lg:border-l lg:border-t-0
        "
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <span aria-hidden="true" className="text-xs leading-none text-accent">✦</span>
          <h2 className="text-sm font-medium text-muted">Ask</h2>
        </div>

        {/* Message list — the only scrollable region. `flex-1` lets it eat the
            remaining height; `overflow-y-auto` scrolls just the messages. On
            mobile we cap it so the sidebar doesn't grow unbounded down the page. */}
        <div className="max-h-[60vh] flex-1 space-y-4 overflow-y-auto px-5 py-4 lg:max-h-none">
          {messages.length === 0 ? (
            // Empty state: a quiet hint, not a loud empty card.
            <p className="text-sm leading-relaxed text-muted">
              Stuck on something? Ask a question, request a simpler explanation,
              or skip ahead.
            </p>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                // User: right-aligned, faint accent-tinted bubble.
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent/10 px-3.5 py-2 text-sm leading-relaxed text-text">
                    {m.content}
                  </p>
                </div>
              ) : (
                // Assistant: left-aligned, markdown-rendered. Same ReactMarkdown
                // used for the lesson, but with lighter chat-appropriate styles
                // (tighter spacing, smaller code blocks). Empty content while
                // streaming shows a pulsing placeholder.
                <div key={i} className="text-sm leading-relaxed text-text">
                  {m.content.length > 0 ? (
                    <div
                      className="
                        [&_p]:my-1 [&_p]:text-sm [&_p]:leading-relaxed
                        [&_strong]:font-semibold [&_em]:italic
                        [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4
                        [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4
                        [&_li]:my-0.5
                        [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-xs [&_code]:text-accent
                        [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background [&_pre]:p-3
                        [&_pre_code]:bg-transparent [&_pre_code]:p-0
                        [&_blockquote]:border-l-2 [&_blockquote]:border-accent/40 [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_blockquote]:italic
                      "
                    >
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="text-muted animate-pulse">Phi is thinking…</span>
                  )}
                </div>
              ),
            )
          )}
          {/* Scroll anchor — kept at the very bottom so auto-scroll lands here. */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input row. Enter sends; Shift+Enter inserts a newline. The textarea
            is single-line by default (`rows={1}`) and we block resizing so the
            layout stays predictable. */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter = newline. We preventDefault on the
                // plain Enter so it doesn't also insert a line break.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={3}
              disabled={isChatLoading}
              placeholder="Ask Phi anything…"
              aria-label="Ask Phi a question about this lesson"
              className="
                max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-background
                px-3.5 py-2.5 text-sm leading-relaxed text-text placeholder:text-muted
                focus:border-accent/50 focus:outline-none
                disabled:cursor-not-allowed disabled:opacity-50
              "
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isChatLoading || chatInput.trim().length === 0}
              aria-label="Send message"
              className="
                cursor-pointer shrink-0 rounded-xl bg-accent px-3.5 py-2.5 text-sm font-medium text-background
                transition-colors hover:bg-[#e2bb68]
                disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-accent
              "
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
