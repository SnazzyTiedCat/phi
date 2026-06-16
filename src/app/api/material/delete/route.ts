import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/material/delete
 *
 * Permanently removes ONE material (one uploaded file) and everything derived
 * from it, for the signed-in user only. A "material" isn't its own table — it's
 * a `source_name` value shared across five tables, all scoped by `user_id`:
 * `chunks`, `sources`, `lessons`, `flashcards`, `quizzes`.
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

  const source = typeof body.source === "string" ? body.source.trim() : "";
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
  //    `lessons` table is the exception: per-section lessons are stored under
  //    `<source>_section_<N>` (see /api/lesson), so an exact match alone would
  //    orphan every section lesson. We delete the exact key OR the section keys.
  //
  //    `_` is a single-char wildcard in SQL LIKE, so we escape the literal
  //    underscores in the filename and in "_section_" (ESCAPE '\') — otherwise a
  //    file like "a_b.pdf" could over-match unrelated rows. The pattern matches
  //    "<source>_section_" followed by anything (the digit index).
  const escapeLike = (s: string) => s.replace(/([\\%_])/g, "\\$1");
  const sectionPattern = `${escapeLike(source)}\\_section\\_%`;

  // Run the four exact-match deletes together — they're independent.
  const [chunksRes, sourcesRes, flashcardsRes, quizzesRes] = await Promise.all([
    supabase.from("chunks").delete().eq("user_id", user.id).eq("source_name", source),
    supabase.from("sources").delete().eq("user_id", user.id).eq("source_name", source),
    supabase.from("flashcards").delete().eq("user_id", user.id).eq("source_name", source),
    supabase.from("quizzes").delete().eq("user_id", user.id).eq("source_name", source),
  ]);

  // Lessons: exact whole-doc key OR any `<source>_section_<N>` key.
  const lessonsRes = await supabase
    .from("lessons")
    .delete()
    .eq("user_id", user.id)
    .or(`source_name.eq.${source},source_name.like.${sectionPattern}`);

  // 4) Surface the first real failure. RLS rejections and connection errors land
  //    here. We log the detail server-side and return a clean message — a partial
  //    delete (some tables cleared, one failed) is rare but possible, so we tell
  //    the user it didn't fully complete rather than silently claiming success.
  const failure = [chunksRes, sourcesRes, flashcardsRes, quizzesRes, lessonsRes].find(
    (r) => r.error,
  );
  if (failure) {
    console.error("[material/delete] delete error:", failure.error);
    return NextResponse.json(
      { error: "Could not fully delete this material. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
