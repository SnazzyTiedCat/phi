import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/greeting";
import {
  legacySectionLessonCacheKey,
  lessonCacheKey,
} from "@/lib/lesson-cache-key";
import Greeting from "./Greeting";

// One section of a mapped source, as stored in `sources.sections` (jsonb). The
// dashboard reads `index`/`title` to render the roadmap pills; the chunk-range
// fields aren't needed here (the lesson page filters by section_index instead).
type Section = {
  index: number;
  title: string;
  description: string;
  start_chunk: number;
  end_chunk: number;
};

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

  // ── Fetch the section roadmap for each source ─────────────────────────────
  // `sources` rows are written by /api/upload when mapping succeeds. Not every
  // file has one: older uploads (pre-sectioning) and uploads where mapping was
  // skipped/failed have no row — those fall back to a flat card below. We key
  // the map by the exact `source_name` because it is the database identity; the
  // display label may change, but the routing/mutation key must not.
  const { data: sourceRows } = await supabase
    .from("sources")
    .select("source_name, sections, display_title")
    .eq("user_id", user?.id ?? "");

  const sectionsBySource = new Map<string, Section[]>();
  // Friendly titles set by the rename action. Nullable: only renamed materials
  // have one. Card headings fall back to the filename when absent.
  const titleBySource = new Map<string, string>();
  for (const row of sourceRows ?? []) {
    const name = row.source_name;
    sectionsBySource.set(name, (row.sections ?? []) as Section[]);
    if (typeof row.display_title === "string" && row.display_title.trim()) {
      titleBySource.set(name, row.display_title.trim());
    }
  }

  // ── Fetch which lessons are already cached ────────────────────────────────
  // A lesson row exists once /api/lesson generates and saves one. Section
  // lessons are keyed with a reserved encoded namespace (see the lesson route),
  // so this Set holds BOTH whole-document keys (legacy/flat cards) and
  // per-section keys. We test membership with the matching helper below.
  const { data: lessonRows } = await supabase
    .from("lessons")
    .select("source_name")
    .eq("user_id", user?.id ?? "");

  const cachedSources = new Set(
    (lessonRows ?? []).map((row: { source_name: string }) => row.source_name),
  );

  function hasCachedSectionLesson(source: string, sectionIndex: number) {
    if (cachedSources.has(lessonCacheKey(source, sectionIndex))) return true;

    // Before section keys had their own namespace, section N was cached as
    // `<source>_section_<N>`. Keep recognizing that only when the key is not also
    // the exact filename of a real upload, avoiding false "done" dots for a
    // separate material named e.g. `notes_section_0`.
    const legacyKey = legacySectionLessonCacheKey(source, sectionIndex);
    return !seen.has(legacyKey) && cachedSources.has(legacyKey);
  }

  // ── Time-of-day greeting (server fallback) ────────────────────────────────
  // The server clock is UTC on Vercel, so this value is only a first-paint
  // fallback — it keeps the greeting word from being missing before hydration.
  // The <Greeting> client component corrects it to the student's LOCAL time on
  // mount. Same buckets via the shared helper so the two can't drift.
  const greeting = greetingForHour(new Date().getHours());

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
          {/* Greeting reflects the student's LOCAL time-of-day. It's a client
              component because only the browser knows their timezone; `greeting`
              here is the server-rendered fallback shown until it hydrates. */}
          <Greeting initial={greeting} email={email} />
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
          className="inline-flex shrink-0 items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
        >
          Upload Material
        </Link>
      </div>

      {hasSources ? (
        /* ── Subject grid ──────────────────────────────────────────────────
           One card per uploaded file. `grid` with responsive column counts:
           1 column on mobile, 2 on small screens, 3 on large — so cards stay a
           comfortable width instead of stretching edge-to-edge. */
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source) => {
            const sections = sectionsBySource.get(source) ?? [];
            // Card heading: the renamed title when set, else the filename. The
            // URL still uses the raw `source` key — only the label changes.
            const label = titleBySource.get(source) ?? source;

            // ── Flat fallback card ──────────────────────────────────────────
            // No section roadmap (old upload, or mapping was skipped/failed).
            // Keep the original behaviour: the WHOLE card is one link, and the
            // CTA reflects whether the whole-document lesson is cached.
            if (sections.length === 0) {
              const cached = cachedSources.has(source);
              return (
                <Link
                  key={source}
                  href={`/lesson?source=${encodeURIComponent(source)}`}
                  className="group glass-standard shadow-card flex cursor-pointer flex-col rounded-2xl p-4 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-2xl md:p-5"
                >
                  <span
                    aria-hidden="true"
                    className="text-2xl font-extralight leading-none text-accent"
                  >
                    φ
                  </span>

                  <h2 className="mt-4 break-words text-base font-medium text-text">
                    {label}
                  </h2>

                  <span
                    className={`mt-6 inline-flex items-center text-sm font-medium transition-colors ${
                      cached ? "text-accent" : "text-muted"
                    }`}
                  >
                    {cached ? "Continue learning" : "Start learning"}
                    <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              );
            }

            // ── Roadmap card ────────────────────────────────────────────────
            // A mapped source. The card is a <div> (not a <Link>) because it
            // contains several links — the header CTA plus one per section —
            // and nesting <a> inside <a> is invalid HTML. A section is
            // "completed" when its per-section lesson is cached; the card CTA
            // reads "Continue" if ANY section has been studied.
            const anyCached = sections.some((s) =>
              hasCachedSectionLesson(source, s.index),
            );

            return (
              <div
                key={source}
                className="glass-standard shadow-card flex flex-col rounded-2xl p-4 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-2 hover:shadow-2xl md:p-5"
              >
                <span
                  aria-hidden="true"
                  className="text-2xl font-extralight leading-none text-accent"
                >
                  φ
                </span>

                <h2 className="mt-4 break-words text-base font-medium text-text">
                  {label}
                </h2>

                {/* Card CTA → opens the first section. Links (not the whole
                    card) are the interactive elements here. */}
                <Link
                  href={`/lesson?source=${encodeURIComponent(source)}&section=0`}
                  className={`group mt-4 inline-flex w-fit items-center text-sm font-medium transition-colors ${
                    anyCached ? "text-accent" : "text-muted hover:text-text"
                  }`}
                >
                  {anyCached ? "Continue learning" : "Start learning"}
                  <span className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                {/* Section pills — the roadmap. Each links into its section;
                    a gold dot marks sections whose lesson is already cached.
                    Titles truncate to 20 chars (full title in the tooltip) so
                    the pills stay compact; they wrap rather than overflow. */}
                <div className="mt-5 flex flex-wrap gap-2">
                  {sections.map((s) => {
                    const done = hasCachedSectionLesson(source, s.index);
                    const label =
                      s.title.length > 20 ? `${s.title.slice(0, 20)}…` : s.title;
                    return (
                      <Link
                        key={s.index}
                        href={`/lesson?source=${encodeURIComponent(source)}&section=${s.index}`}
                        title={s.title}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-muted transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent active:scale-95"
                      >
                        {done && (
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                          />
                        )}
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
            className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
          >
            Upload Material
          </Link>
        </div>
      )}
    </div>
  );
}
