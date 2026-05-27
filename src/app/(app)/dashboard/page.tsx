import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * The dashboard — the first thing a student sees after logging in.
 *
 * Server Component: we read the user's email AND their uploaded sources on the
 * server (same async Supabase client + cookie session as the layout). The (app)
 * layout already guarantees a logged-in user exists, but we still call getUser()
 * here because each page is responsible for the data IT needs — the email to
 * greet them, and the user id to scope the sources query.
 *
 * A "source" = one uploaded file. When a file is uploaded it's split into many
 * `chunks` rows, all sharing the same `source_name` (the filename). So to list a
 * student's subjects we need the DISTINCT set of source_name values for them.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed non-null here (the layout redirects otherwise), but the
  // `?.` keeps TypeScript happy since getUser()'s type allows null.
  const email = user?.email ?? "there";

  // ── Fetch the student's uploaded sources ──────────────────────────────────
  // Each upload produces many `chunks` rows that share one `source_name`. We
  // want each filename listed ONCE, newest upload first.
  //
  // Postgres has `DISTINCT ON (source_name)` for exactly this, but the Supabase
  // JS client can't express `DISTINCT ON` (it'd need a raw SQL RPC). The simple,
  // readable alternative: pull source_name + created_at ordered newest-first,
  // then de-duplicate in JS keeping the first time we see each name. Because the
  // rows are already sorted newest-first, the first occurrence of each name IS
  // its most-recent chunk — so the de-duped list stays in most-recent order.
  //
  // RLS (row-level security) on `chunks` already restricts rows to the current
  // user, but we filter by user_id explicitly too: it's defense-in-depth and
  // makes the intent obvious to anyone reading this later.
  const { data: chunks } = await supabase
    .from("chunks")
    .select("source_name, created_at")
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  // De-duplicate: walk the (newest-first) rows and keep the first sighting of
  // each source_name. A Set tracks which names we've already added.
  const seen = new Set<string>();
  const sources: string[] = [];
  for (const row of chunks ?? []) {
    if (!seen.has(row.source_name)) {
      seen.add(row.source_name);
      sources.push(row.source_name);
    }
  }

  const hasSources = sources.length > 0;

  // ── Fetch which sources already have a cached lesson ──────────────────────
  // A lesson row exists once /api/lesson generates and saves one. We use this
  // to show "Continue learning" (gold) vs "Start learning" (muted) per card.
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("source_name")
    .eq("user_id", user?.id ?? "");

  // Normalise source_names on both sides before comparing. The lessons table
  // may have been written before the decodeURIComponent fix in the API route,
  // meaning some rows have encoded names ("my%20notes.pdf") while the chunks
  // table always stores the raw filename ("my notes.pdf"). Decoding both sides
  // makes the Set lookup reliable regardless of what was previously stored.
  // decodeURIComponent throws on malformed sequences (e.g. a lone "%") so we
  // catch and fall back to the original string.
  function normalise(s: string) {
    try { return decodeURIComponent(s); } catch { return s; }
  }

  const cachedSources = new Set(
    (lessonRows ?? []).map((row: { source_name: string }) => normalise(row.source_name)),
  );

  // Normalise the sources array too, so the has() comparison is always
  // decoded-vs-decoded.
  const normalisedSources = sources.map(normalise);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      {/* ── Header row: greeting + persistent "Upload material" action ─────────
          Kept at the top whether or not the student has sources yet. When the
          dashboard is empty the empty-state card below also offers an upload
          button, but once subjects exist this header button is the only way to
          add more — so it must always be present. `flex` with `justify-between`
          puts the greeting on the left and the action on the right; it wraps on
          narrow screens so the button drops below the text rather than
          overflowing. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {/* "Good morning" is hardcoded for the MVP — no time-of-day logic yet
              (it'd need the user's timezone to be correct, a V2 detail). */}
          <h1 className="text-3xl font-semibold tracking-tight text-text">
            Good morning, <span className="text-accent">{email}</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            {hasSources
              ? "Pick up where you left off, or upload something new."
              : "Your subjects will live here. Upload your first material to begin."}
          </p>
        </div>

        {/* Persistent upload entry point. A Next.js <Link> (renders an <a>)
            rather than a <button> because its job is navigation, not an in-page
            action — that gives correct semantics (open-in-new-tab, right-click,
            keyboard focus) for free and lets Next prefetch the route. Styled to
            match the primary action used elsewhere. `shrink-0` stops it from
            being squeezed when the greeting is long. */}
        <Link
          href="/upload"
          className="inline-flex shrink-0 items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98]"
        >
          Upload material
        </Link>
      </div>

      {hasSources ? (
        /* ── Subject grid ──────────────────────────────────────────────────
           One card per uploaded file. `grid` with responsive column counts:
           1 column on mobile, 2 on small screens, 3 on large — so cards stay a
           comfortable width instead of stretching edge-to-edge. */
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {normalisedSources.map((source) => (
            /* The whole card is the link — a larger, more forgiving click
               target than a small button, and the natural mental model is
               "tap the subject to open it." Solid border (vs. the dashed
               empty-state border) signals real, filled content. The hover
               lift + border brighten is the same micro-interaction language as
               the primary buttons. `key` is the source_name, which is unique
               here because we de-duplicated above. */
            <Link
              key={source}
              href={`/lesson?source=${encodeURIComponent(source)}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-surface/40 p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
            >
              {/* Gold φ icon. `aria-hidden` because it's decorative — the
                  filename below already names the card for screen readers. */}
              <span
                aria-hidden="true"
                className="text-2xl font-extralight leading-none text-accent"
              >
                φ
              </span>

              {/* Filename = card title. `break-words` so a long filename wraps
                  inside the card instead of overflowing it. */}
              <h2 className="mt-4 break-words text-base font-medium text-text">
                {source}
              </h2>

              {/* The call to action. Gold = lesson already cached ("come back"),
                  muted = not generated yet ("start here"). It's text, not a
                  nested button — the parent <Link> is the interactive element. */}
              <span
                className={`mt-6 inline-flex items-center text-sm font-medium transition-colors ${
                  cachedSources.has(source) ? "text-accent" : "text-muted"
                }`}
              >
                {cachedSources.has(source) ? "Continue learning" : "Start learning"}
                <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        /* ── Empty state ───────────────────────────────────────────────────
           Shown only when the student has no sources. The dashed border signals
           "this is a slot waiting to be filled," distinct from the solid-
           bordered cards above. Centered content keeps it calm rather than busy.
           It carries its own upload button so the empty dashboard has a clear,
           central call to action (in addition to the header one). */
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.10] bg-surface/40 px-6 py-16 text-center">
          <p className="max-w-sm text-sm text-muted">
            No subjects yet — upload your first material to get started.
          </p>

          <Link
            href="/upload"
            className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98]"
          >
            Upload material
          </Link>
        </div>
      )}
    </div>
  );
}
