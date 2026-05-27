import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonView from "@/components/LessonView";

/**
 * The lesson page — where a student actually learns a source.
 *
 * This is a Server Component (no "use client"). Its ONLY job is to gather the
 * data that has to come from the server — the user's chunks for this source —
 * and hand them to the client component that does the interactive work.
 *
 * Why the split (server page + client view):
 *   - The chunks live in Supabase, scoped to the logged-in user. The session
 *     lives in cookies the SERVER can read, so fetching here (server-side) is
 *     both correct and secure — the browser never has to be trusted with the
 *     query.
 *   - But the Anthropic API key lives in `localStorage`, which only exists in
 *     the BROWSER. So the actual "generate the lesson" step has to run client-
 *     side. That's <LessonView>, a Client Component this page renders.
 *
 * So: server fetches the material → passes it as props → client reads the key
 * and calls /api/lesson. Clean separation, each side doing what only it can.
 *
 * `searchParams` note (Next.js 16): in the App Router a `page.tsx` is handed
 * `searchParams`, and in Next 16 it's a Promise that must be awaited before you
 * can read the query values off it. That's why the signature takes a `props`
 * object and we `await props.searchParams`.
 */
export default async function LessonPage(props: {
  searchParams: Promise<{ source?: string }>;
}) {
  // Read ?source=... from the URL. The dashboard and upload pages link here as
  // `/lesson?source=<encoded filename>`, so `source` is the source_name of the
  // file the student wants to study. Next decodes the URL-encoding for us, so
  // `source` is the plain filename here.
  const { source } = await props.searchParams;

  // No source in the URL = nothing to teach. Send them back to pick a subject.
  // `redirect()` throws internally to stop rendering, so nothing after it runs.
  if (!source) {
    redirect("/dashboard");
  }

  // Get the logged-in user. The (app) layout already gates access, but each
  // page fetches the data IT needs — here we need the user id to scope the
  // chunks query (and as defense-in-depth alongside RLS).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: if somehow there's no user, bounce to dashboard (the
  // layout would normally have redirected to login already).
  if (!user) {
    redirect("/dashboard");
  }

  // Fetch every chunk for THIS user and THIS source. We only need the `content`
  // column — that's the text Claude teaches from. We filter by user_id even
  // though RLS already restricts rows to the current user: explicit intent +
  // defense-in-depth, same as the dashboard query.
  const { data: chunkRows } = await supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", source);

  // No chunks = the source doesn't exist for this user (bad/stale URL, or a
  // file that was never really uploaded). Don't render an empty lesson shell —
  // send them back to the dashboard.
  if (!chunkRows || chunkRows.length === 0) {
    redirect("/dashboard");
  }

  // Flatten the rows ({ content }[]) into a plain string[] — the shape both the
  // client component and the API route expect. Doing this mapping here keeps
  // the client component's props simple (it never sees the DB row shape).
  const chunks = chunkRows.map((row) => row.content);

  // Hand off to the interactive client component. From here the browser takes
  // over: it reads the API key from localStorage and requests the lesson.
  return <LessonView chunks={chunks} source={source} />;
}
