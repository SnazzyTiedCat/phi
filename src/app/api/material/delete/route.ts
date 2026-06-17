import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  escapePostgresLikePattern,
  legacySectionLessonCachePrefix,
  sectionLessonCachePrefix,
} from "@/lib/lesson-cache-key";

/**
 * POST /api/material/delete
 *
 * Permanently removes ONE material (one uploaded file) and everything derived
 * from it, for the signed-in user only. A "material" isn't its own table — it's
 * a `source_name` value shared across six tables, all scoped by `user_id`:
 * `chunks`, `sources`, `lessons`, `flashcards`, `quizzes`, `source_meta`.
 *
 * Why the normal (cookie-bound) server client, NOT the service-role admin client:
 * this only deletes the caller's OWN rows. RLS on each table already restricts
 * writes to `auth.uid() = user_id`, so the user-scoped client physically cannot
 * touch another user's data even if a bug let a foreign source_name through. We
 * ALSO filter every delete by `user_id` explicitly — defense-in-depth, and it
 * makes the intent obvious. The account-delete route needs service-role because
 * it deletes the auth USER (a privileged op the anon key can't do); deleting
 * your own data rows is not privileged, so the smaller credential is the right
 * (and safer) choice — the service-role key never enters this path.
 *
 * The request body carries the source_name to delete. We never trust it as an
 * identity — it's scoped under the verified session's user_id, so the worst a
 * malicious body can do is try (and fail) to delete rows that aren't yours.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1) Parse the body. A non-JSON body is the caller's mistake → 400, not 500.
  let body: { source?: string };
  try {
    body = (await request.json()) as { source?: string };
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source : "";
  if (source.length === 0) {
    return NextResponse.json({ error: "Missing source." }, { status: 400 });
  }

  // 2) Who's asking? getUser() validates against Supabase's auth server, so it's
  //    the trustworthy "is this person really logged in?" check. No session → 401.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 3) Delete across all five tables, every delete scoped to THIS user + source.
  //
  //    Four tables key rows by the exact filename, so an `.eq` is correct. The
  //    `lessons` table is the exception: per-section lessons are stored under a
  //    reserved encoded prefix (see /api/lesson), so an exact match alone would
  //    orphan every section lesson. We delete the exact key OR the section-key
  //    prefix. LIKE wildcards are escaped before appending the one intentional
  //    trailing `%`.
  const sectionPattern = `${escapePostgresLikePattern(
    sectionLessonCachePrefix(source),
  )}%`;
  const legacySectionPattern = `${escapePostgresLikePattern(
    legacySectionLessonCachePrefix(source),
  )}%`;

  // Old section caches used `<source>_section_<N>`, which can also be a real
  // filename. Before deleting legacy rows, compare against active chunk sources
  // so deleting `notes` cannot remove the whole-document cache for an upload
  // literally named `notes_section_0`.
  const { data: legacyRows, error: legacyRowsError } = await supabase
    .from("lessons")
    .select("source_name")
    .eq("user_id", user.id)
    .like("source_name", legacySectionPattern);

  if (legacyRowsError) {
    console.error("[material/delete] legacy lesson lookup error:", legacyRowsError);
    return NextResponse.json(
      { error: "Could not fully delete this material. Please try again." },
      { status: 500 },
    );
  }

  const legacyKeys = Array.from(
    new Set((legacyRows ?? []).map((row) => row.source_name)),
  );
  let safeLegacyKeys: string[] = [];
  if (legacyKeys.length > 0) {
    const { data: collidingRows, error: collidingRowsError } = await supabase
      .from("chunks")
      .select("source_name")
      .eq("user_id", user.id)
      .in("source_name", legacyKeys);

    if (collidingRowsError) {
      console.error(
        "[material/delete] legacy collision lookup error:",
        collidingRowsError,
      );
      return NextResponse.json(
        { error: "Could not fully delete this material. Please try again." },
        { status: 500 },
      );
    }

    const collidingSources = new Set(
      (collidingRows ?? []).map((row) => row.source_name),
    );
    safeLegacyKeys = legacyKeys.filter((key) => !collidingSources.has(key));
  }

  // Run every delete together — they're independent. Lessons gets TWO deletes:
  // the exact whole-doc key, plus the reserved section-key prefix. The optional
  // legacy delete is constrained to safe keys found above.
  const emptyDelete = { error: null };
  const [
    chunksRes,
    sourcesRes,
    flashcardsRes,
    quizzesRes,
    lessonRes,
    sectionRes,
    legacySectionRes,
    metaRes,
  ] = await Promise.all([
    supabase.from("chunks").delete().eq("user_id", user.id).eq("source_name", source),
    supabase.from("sources").delete().eq("user_id", user.id).eq("source_name", source),
    supabase
      .from("flashcards")
      .delete()
      .eq("user_id", user.id)
      .eq("source_name", source),
    supabase.from("quizzes").delete().eq("user_id", user.id).eq("source_name", source),
    supabase.from("lessons").delete().eq("user_id", user.id).eq("source_name", source),
    supabase
      .from("lessons")
      .delete()
      .eq("user_id", user.id)
      .like("source_name", sectionPattern),
    safeLegacyKeys.length > 0
      ? supabase
          .from("lessons")
          .delete()
          .eq("user_id", user.id)
          .in("source_name", safeLegacyKeys)
      : Promise.resolve(emptyDelete),
    // source_meta holds only the material's icon/subject/title metadata, keyed by
    // the exact source_name — a plain `.eq` clears it alongside the content tables.
    supabase
      .from("source_meta")
      .delete()
      .eq("user_id", user.id)
      .eq("source_name", source),
  ]);

  // 4) Surface the first real failure. RLS rejections and connection errors land
  //    here. We log the detail server-side and return a clean message — a partial
  //    delete (some tables cleared, one failed) is rare but possible, so we tell
  //    the user it didn't fully complete rather than silently claiming success.
  const failure = [
    chunksRes,
    sourcesRes,
    flashcardsRes,
    quizzesRes,
    lessonRes,
    sectionRes,
    legacySectionRes,
    metaRes,
  ].find((r) => r.error);
  if (failure) {
    console.error("[material/delete] delete error:", failure.error);
    return NextResponse.json(
      { error: "Could not fully delete this material. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
