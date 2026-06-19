"use client";

import { useEffect, useState } from "react";
import { greetingForHour } from "@/lib/greeting";

/**
 * The dashboard greeting heading.
 *
 * WHY a Client Component for one line of text: the greeting has to reflect the
 * STUDENT'S local time, but the dashboard is server-rendered — and on Vercel the
 * server clock is UTC, so a server-only greeting is wrong for anyone outside UTC
 * (a Californian at 9pm would be told "Good night" because it's already 4am UTC).
 * The browser is the only place that knows the user's real local time.
 *
 * `initial` is the server's (UTC-based) guess. We render it first so the word is
 * never missing — no flash of an empty greeting — and because it equals the
 * server HTML there's no hydration mismatch. Then on mount we recompute from the
 * browser clock (the user's LOCAL time) and update if it lands in a different
 * bucket. For users whose local hour matches UTC's bucket, nothing visibly
 * changes.
 */
export default function Greeting({
  initial,
  email,
}: {
  initial: string;
  email: string;
}) {
  const [greeting, setGreeting] = useState(initial);

  useEffect(() => {
    // Runs only in the browser, so new Date() here is the user's LOCAL time.
    // This is a legitimate "sync an external system (the browser clock) into
    // state on mount" effect, which is why the set-state-in-effect rule is
    // intentionally disabled for this one line.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    // Smaller on mobile so a long email doesn't force an awkward wrap. The email
    // itself truncates (inline-block + max-width) below md rather than wrapping
    // mid-string; at md+ it shows in full at the larger size.
    <h1 className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tracking-tight text-text md:text-3xl">
      <span>{greeting},</span>
      <span className="inline-block max-w-[60vw] truncate align-bottom text-accent md:max-w-none">
        {email}
      </span>
    </h1>
  );
}
