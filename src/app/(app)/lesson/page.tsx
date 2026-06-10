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
  searchParams: Promise<{ source?: string; section?: string }>;
}) {
  // Read ?source=... (and the optional ?section=) from the URL. The dashboard
  // and upload pages link here as `/lesson?source=<encoded filename>` and, for a
  // single section, `&section=<index>`. Next decodes the URL-encoding for us, so
  // `source` is the plain filename here.
  const { source, section } = await props.searchParams;

  // Parse ?section into a non-negative integer, or `undefined` if it's missing
  // or malformed. We're lenient on purpose: a bad section param falls through to
  // the whole-document lesson rather than erroring.
  const requestedSection =
    section !== undefined &&
    section !== "" &&
    Number.isInteger(Number(section)) &&
    Number(section) >= 0
      ? Number(section)
      : undefined;

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

  // Fetch the chunks for THIS user and THIS source. We only need the `content`
  // column — that's the text Claude teaches from. We filter by user_id even
  // though RLS already restricts rows to the current user: explicit intent +
  // defense-in-depth, same as the dashboard query. When a section was requested
  // we add `.eq("section_index", n)` so Claude only sees that section's chunks.
  let query = supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", source);
  if (requestedSection !== undefined) {
    query = query.eq("section_index", requestedSection);
  }
  let { data: chunkRows } = await query;

  // `effectiveSection` is the section we'll actually teach. It can differ from
  // `requestedSection` when the section filter matched nothing — e.g. a stale
  // link, or an older upload whose chunks all default to section_index 0. In
  // that case we fall back to the whole document rather than dead-ending the
  // student at the dashboard.
  let effectiveSection = requestedSection;
  if (requestedSection !== undefined && (!chunkRows || chunkRows.length === 0)) {
    const { data: allRows } = await supabase
      .from("chunks")
      .select("content")
      .eq("user_id", user.id)
      .eq("source_name", source);
    chunkRows = allRows;
    effectiveSection = undefined;
  }

  // No chunks even unfiltered = the source doesn't exist for this user (bad/
  // stale URL, or a file that was never really uploaded). Don't render an empty
  // lesson shell — send them back to the dashboard.
  if (!chunkRows || chunkRows.length === 0) {
    redirect("/dashboard");
  }

  // When teaching a section, look up its title so the tutor prompt can name it.
  // Read-only and best-effort: a missing roadmap just means no title is passed
  // (the lesson still generates, just without the "Section N: …" framing).
  let sectionTitle: string | undefined;
  if (effectiveSection !== undefined) {
    const { data: sourceRow } = await supabase
      .from("sources")
      .select("sections")
      .eq("user_id", user.id)
      .eq("source_name", source)
      .maybeSingle();
    const sections = (sourceRow?.sections ?? []) as { index: number; title: string }[];
    sectionTitle = sections.find((s) => s.index === effectiveSection)?.title;
  }

  // Flatten the rows ({ content }[]) into a plain string[] — the shape both the
  // client component and the API route expect. Doing this mapping here keeps
  // the client component's props simple (it never sees the DB row shape).
  const chunks = chunkRows.map((row) => row.content);

  // Hand off to the interactive client component. From here the browser takes
  // over: it reads the API key from localStorage and requests the lesson.
  return (
    <LessonView
      chunks={chunks}
      source={source}
      sectionIndex={effectiveSection}
      sectionTitle={sectionTitle}
    />
  );
}
