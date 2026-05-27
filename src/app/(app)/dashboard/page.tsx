import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * The dashboard — the first thing a student sees after logging in.
 *
 * Server Component: we read the user's email on the server (same async Supabase
 * client + cookie session as the layout). The (app) layout already guarantees a
 * logged-in user exists, but we still call getUser() here because each page is
 * responsible for the data IT needs — we need the email to greet them.
 *
 * For the MVP this is intentionally sparse: a greeting, an empty-state card, and
 * a non-functional "Upload material" button. It establishes the visual frame
 * that real subjects/lessons will slot into later.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed non-null here (the layout redirects otherwise), but the
  // `?.` keeps TypeScript happy since getUser()'s type allows null.
  const email = user?.email ?? "there";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      {/* Greeting. "Good morning" is hardcoded for the MVP — no time-of-day
          logic yet (it'd need the user's timezone to be correct, which is a
          V2 detail). */}
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Good morning, <span className="text-accent">{email}</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        Your subjects will live here. Upload your first material to begin.
      </p>

      {/* Empty-state card. The dashed border signals "this is a slot waiting to
          be filled," distinct from the solid-bordered cards real content will
          use. Centered content keeps the empty state calm rather than busy. */}
      <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-surface/40 px-6 py-16 text-center">
        <p className="max-w-sm text-sm text-muted">
          No subjects yet — upload your first material to get started.
        </p>

        {/* "Upload material" — navigates to the /upload flow. It's a Next.js
            <Link> (renders an <a>) rather than a <button>, because its job is
            navigation, not an in-page action: that gives us correct semantics
            (open-in-new-tab, right-click, keyboard focus) for free, and lets
            Next prefetch the upload route. Styled to match the primary action
            elsewhere (auth submit + landing CTA) so it still reads as a button.
            `inline-flex` keeps the link sized to its content like the old
            button rather than stretching full-width. */}
        <Link
          href="/upload"
          className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98]"
        >
          Upload material
        </Link>
      </div>
    </div>
  );
}
