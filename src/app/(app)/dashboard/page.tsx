import Link from "next/link";
import { FireIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/server";
import { greetingForHour } from "@/lib/greeting";
import Greeting from "./Greeting";

/**
 * The dashboard — the first thing a student sees after logging in.
 *
 * Server Component: we read the user, their most recently active material, and
 * their study stats on the server (same async Supabase client + cookie session
 * as the layout). The (app) layout guarantees a logged-in user, but we still
 * call getUser() here because each page is responsible for the data IT needs.
 *
 * The redesign is intentionally focused: one greeting, one "Continue learning"
 * hero for the material the student touched last, a small streak/stats row, and
 * an understated way to add more. The full list of materials lives in the
 * sidebar — the dashboard's job is to get the student back into the work, not to
 * be a file browser.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // user is guaranteed non-null here (the layout redirects otherwise), but the
  // `?.` keeps TypeScript happy since getUser()'s type allows null.
  const email = user?.email ?? "there";
  const userId = user?.id ?? "";

  // ── Most recently active material ─────────────────────────────────────────
  // Each upload produces many `chunks` rows sharing one `source_name`. Ordering
  // by created_at descending and taking the first row gives the source whose
  // latest chunk is newest — i.e. the material the student worked with last.
  // RLS already scopes rows to the user; we also filter by user_id for explicit
  // intent (defense-in-depth).
  const { data: recentChunk } = await supabase
    .from("chunks")
    .select("source_name")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recentSource = recentChunk?.source_name ?? null;
  const hasMaterial = recentSource !== null;

  // Friendly title for the hero, if the student renamed the material. The route
  // still uses the raw `source_name` key — only the displayed label changes.
  let recentLabel = recentSource;
  if (recentSource) {
    const { data: sourceRow } = await supabase
      .from("sources")
      .select("display_title")
      .eq("user_id", userId)
      .eq("source_name", recentSource)
      .maybeSingle();
    if (
      sourceRow &&
      typeof sourceRow.display_title === "string" &&
      sourceRow.display_title.trim()
    ) {
      recentLabel = sourceRow.display_title.trim();
    }
  }

  // ── Study stats (streak + tallies) ────────────────────────────────────────
  // One row per user in `user_stats`, written by /api/lesson and /api/quiz.
  // Absent for a student who hasn't studied yet — treat that as all-zero.
  const { data: stats } = await supabase
    .from("user_stats")
    .select("streak_count, lessons_completed, quizzes_completed")
    .eq("user_id", userId)
    .maybeSingle();

  const streak = stats?.streak_count ?? 0;
  const lessonsCompleted = stats?.lessons_completed ?? 0;
  const quizzesCompleted = stats?.quizzes_completed ?? 0;

  // Don't show a wall of zeros to a new student — the streak is information, not
  // pressure. The row only appears once there's something real to report.
  const showStats =
    streak > 0 || lessonsCompleted > 0 || quizzesCompleted > 0;

  // ── Time-of-day greeting (server fallback) ────────────────────────────────
  // The server clock is UTC on Vercel, so this is only a first-paint fallback;
  // the <Greeting> client component corrects it to the student's LOCAL time on
  // mount via the same shared helper so the two can't drift.
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* Greeting reflects the student's LOCAL time-of-day; `greeting` here is
          the server-rendered fallback shown until it hydrates. */}
      <Greeting initial={greeting} email={email} />

      {/* ── Continue-learning hero ──────────────────────────────────────────
          The single most important action on the page, given the most weight:
          a large glass card that rises + scales in (Cinematic Reveal) on load.
          With a material it offers a big gold "Continue"; empty, it invites the
          first upload. */}
      <section className="animate-cinematic-reveal glass-standard shadow-card mt-8 rounded-3xl p-8 sm:p-12">
        {recentSource !== null ? (
          <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span
                aria-hidden="true"
                className="text-3xl font-extralight leading-none text-accent"
              >
                φ
              </span>
              <h2 className="mt-4 break-words text-2xl font-semibold tracking-tight text-text">
                {recentLabel}
              </h2>
              <p className="mt-2 text-sm text-muted">
                Pick up where you left off.
              </p>
            </div>

            {/* Large gold CTA. A <Link> (renders an <a>) because its job is
                navigation; `shrink-0` keeps it from being squeezed by a long
                title on the same row. */}
            <Link
              href={`/lesson?source=${encodeURIComponent(recentSource)}`}
              className="inline-flex shrink-0 items-center rounded-full bg-accent px-8 py-4 text-base font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              Continue
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span
              aria-hidden="true"
              className="text-5xl font-extralight leading-none text-muted"
            >
              φ
            </span>
            <p className="mt-6 max-w-sm text-sm text-muted">
              Upload your first material to begin.
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex items-center rounded-full bg-accent px-8 py-4 text-base font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              Upload Material
            </Link>
          </div>
        )}
      </section>

      {/* ── Stats row ───────────────────────────────────────────────────────
          Three small glass pills: streak, lessons, quizzes. Numbers in gold,
          labels muted. Each pill reveals with the same Cinematic Reveal, the
          row starting 150ms after the hero and pills 80ms apart (inline
          animation-delay). Hidden entirely when everything is zero. */}
      {showStats && (
        <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
          <div
            className="animate-cinematic-reveal glass-subtle flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ animationDelay: "150ms" }}
          >
            <FireIcon
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-accent"
            />
            <div className="min-w-0">
              <p className="text-xl font-semibold text-accent">{streak}</p>
              <p className="truncate text-xs text-muted">Day streak</p>
            </div>
          </div>

          <div
            className="animate-cinematic-reveal glass-subtle flex flex-col justify-center rounded-2xl px-4 py-3"
            style={{ animationDelay: "230ms" }}
          >
            <p className="text-xl font-semibold text-accent">
              {lessonsCompleted}
            </p>
            <p className="truncate text-xs text-muted">Lessons completed</p>
          </div>

          <div
            className="animate-cinematic-reveal glass-subtle flex flex-col justify-center rounded-2xl px-4 py-3"
            style={{ animationDelay: "310ms" }}
          >
            <p className="text-xl font-semibold text-accent">
              {quizzesCompleted}
            </p>
            <p className="truncate text-xs text-muted">Quizzes completed</p>
          </div>
        </div>
      )}

      {/* ── Secondary upload ────────────────────────────────────────────────
          Understated (ghost) entry point to add more material — deliberately
          quieter than the hero CTA so it never competes with "Continue".
          Hidden in the empty state, where the hero already offers an upload. */}
      {hasMaterial && (
        <div className="mt-8">
          <Link
            href="/upload"
            className="inline-flex items-center rounded-full border border-white/10 bg-surface/40 px-6 py-3 text-sm font-medium text-text transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg active:scale-95"
          >
            Upload new material
          </Link>
        </div>
      )}
    </div>
  );
}
