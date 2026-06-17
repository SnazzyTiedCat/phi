import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Streak + activity tracking for a student.
 *
 * One `user_stats` row per user (see `supabase/user_stats.sql`). We update it
 * whenever the student does something that counts as studying: viewing a lesson
 * (`lessons_completed`) or completing a quiz (`quizzes_completed`). Each of those
 * also nudges the daily streak.
 *
 * Streak rule (compared against the LAST active date):
 *   - last active = today      → no change (already counted today)
 *   - last active = yesterday  → +1 (kept the chain going)
 *   - last active = older/none → reset to 1 (chain broke, today restarts it)
 * `last_active_date` is always moved to today.
 *
 * Dates are computed in UTC to match Postgres `date` and the server clock on
 * Vercel — a streak is "another calendar day of activity", and UTC gives every
 * user one consistent day boundary. (Per-timezone day boundaries are a V2
 * refinement, not worth the complexity for the MVP.)
 *
 * This is best-effort: a failure here never blocks the lesson/quiz the student
 * actually asked for, so callers fire it and log on error rather than throwing.
 */

type StatField = "lessons_completed" | "quizzes_completed";

// YYYY-MM-DD for a Date, in UTC — the format Postgres `date` parses directly.
function utcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function recordActivity(
  supabase: SupabaseClient,
  userId: string,
  field: StatField,
): Promise<void> {
  const now = new Date();
  const today = utcDateString(now);
  // UTC has no DST, so subtracting 24h of milliseconds always lands on the
  // previous calendar day — no off-by-one around clock changes.
  const yesterday = utcDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  // Read the current row so we can compute the next streak + increment the
  // right counter. `.maybeSingle()` returns null (not an error) when the student
  // has no stats row yet — their first tracked activity.
  const { data: existing, error: readError } = await supabase
    .from("user_stats")
    .select("streak_count, last_active_date, lessons_completed, quizzes_completed")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    console.error("[user-stats] read error:", readError);
    return;
  }

  // Decide the new streak from the previous active date.
  let streak: number;
  if (!existing || !existing.last_active_date) {
    streak = 1;
  } else if (existing.last_active_date === today) {
    streak = existing.streak_count ?? 1;
  } else if (existing.last_active_date === yesterday) {
    streak = (existing.streak_count ?? 0) + 1;
  } else {
    streak = 1;
  }

  // Increment whichever counter this activity belongs to; carry the other over.
  const lessons =
    (existing?.lessons_completed ?? 0) + (field === "lessons_completed" ? 1 : 0);
  const quizzes =
    (existing?.quizzes_completed ?? 0) + (field === "quizzes_completed" ? 1 : 0);

  const { error: writeError } = await supabase.from("user_stats").upsert(
    {
      user_id: userId,
      streak_count: streak,
      last_active_date: today,
      lessons_completed: lessons,
      quizzes_completed: quizzes,
    },
    { onConflict: "user_id" },
  );

  if (writeError) {
    console.error("[user-stats] upsert error:", writeError);
  }
}
