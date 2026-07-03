import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { depthInstruction } from "@/lib/tutor-depth";
import {
  legacySectionLessonCacheKey,
  lessonCacheKey,
} from "@/lib/lesson-cache-key";

/**
 * POST /api/lesson
 *
 * Takes the chunks of one uploaded source and asks Claude to turn them into a
 * structured, taught lesson (markdown). Returns the lesson text.
 *
 * Why this lives in a Route Handler and not the page:
 * The user's Anthropic API key is stored in the browser's `localStorage`
 * (an MVP decision — see CLAUDE.md). `localStorage` does not exist on the
 * server, so the *client* must read the key and send it to us. This handler is
 * the bridge: it receives the key in the request body and uses it to call
 * Anthropic. We never store the key — it lives only for the duration of this
 * one request.
 *
 * Like /api/upload, the filename `route.ts` inside `app/api/lesson/` is what
 * makes `/api/lesson` a real endpoint, and exporting an async `POST` function
 * is how we handle POST specifically (a GET would 405 automatically).
 */

// Force the Node.js runtime (not Edge). The Anthropic SDK is built for Node;
// the Edge runtime is a stripped-down environment and the safer default here is
// plain Node — matching /api/upload, which sets the same thing.
export const runtime = "nodejs";

// The shape we expect in the request body. Declaring it as a type (rather than
// trusting `any`) means TypeScript checks our access to these fields below, and
// it documents the contract the client must satisfy.
type LessonRequest = {
  chunks: string[];
  source: string;
  // Optional: the route serves a cached lesson WITHOUT a key. The key is only
  // required on an actual cache miss, when we have to call Anthropic.
  apiKey?: string;
  // Optional section context. Present when the student opened ONE section of a
  // mapped document (the lesson page already filtered `chunks` to that section).
  // We use them only for the cache key and to focus the system prompt — the
  // route never re-queries chunks. Absent = whole-document lesson (legacy path).
  sectionIndex?: number;
  sectionTitle?: string;
  // The student's "Explanation depth" setting (Tutor). Optional — absent or
  // "standard" leaves the default teaching voice unchanged.
  depth?: string;
};

// The exact tutor system prompt. Kept as a module-level constant (not inlined)
// so it's easy to find and tweak — the teaching voice is product-critical, and
// this is the single place that defines it.
const SYSTEM_PROMPT = `You are Phi, an expert AI tutor. A student has uploaded their study material.
Your job is to teach this material clearly and engagingly.

Structure your response as a proper lesson with:
1. A compelling title
2. An introduction that explains why this topic matters
3. 3-5 clearly titled sections that teach the core concepts
4. A summary of key takeaways

Write in a warm, direct teaching voice. Use examples. Make it genuinely interesting.
Format using markdown.
Do not use emojis anywhere in your response. Use clean typography and formatting only.`;

// The model id. Pulled out as a constant so a model upgrade is a one-line edit
// in one place rather than a string buried in the call below.
const MODEL = "claude-opus-4-7";

export async function POST(request: Request) {
  // 1) Parse the JSON body. `request.json()` throws if the body isn't valid
  //    JSON (e.g. someone POSTed a form). Treat that as a client error (400),
  //    not a server crash (500) — it's the caller's malformed input.
  let body: LessonRequest;
  try {
    body = (await request.json()) as LessonRequest;
  } catch {
    return NextResponse.json(
      { error: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const { chunks, source, apiKey, sectionIndex, sectionTitle, depth } = body;

  // A section lesson is one where a valid, non-negative section index came in.
  // We treat anything else (undefined, non-integer, negative) as a whole-doc
  // lesson rather than erroring — the param is an optimization, not a contract.
  const isSection =
    typeof sectionIndex === "number" &&
    Number.isInteger(sectionIndex) &&
    sectionIndex >= 0;

  // 2) Validate `source` only — it's the cache key, so we need it before we can
  //    even check the cache. `apiKey` and `chunks` are validated LATER, after the
  //    cache check, because a cache hit needs neither: viewing an already-taught
  //    lesson must never require a key.
  if (typeof source !== "string" || source.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing source." },
      { status: 400 },
    );
  }

  // 3) Authenticate. Route handlers don't go through the (app) layout, so we
  //    verify the session ourselves. getUser() validates against Supabase's auth
  //    server — the trustworthy check, not just a local cookie read.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 4) Treat source_name as an opaque identity key. The lesson page / client
  //    already receive a decoded filename from Next / URLSearchParams, and
  //    uploads store the browser's raw `file.name`. Decoding again would mutate
  //    valid filenames such as "chapter+notes.txt" or crash on "100%.txt".
  const sourceKey = source;

  // 4b) Derive the cache key. Per-section lessons must NOT collide with the
  //     whole-document lesson (or with each other), so a section lesson lives in
  //     a reserved encoded namespace rather than being appended to the raw
  //     filename. The dashboard and delete route use the same helper.
  const cacheSource = lessonCacheKey(
    sourceKey,
    isSection ? sectionIndex : undefined,
  );

  // 4a) Cache check. If we've already generated a lesson for this user + source,
  //     return it immediately — no Anthropic call, no token spend.
  //     We use `.maybeSingle()` rather than `.single()`: both return data=null
  //     when there's no row, but `.single()` also returns an error object on a
  //     miss which can obscure real DB errors. `.maybeSingle()` only errors on
  //     genuine problems (connection failure, RLS rejection, etc.).
  console.log("[lesson] cache check — user:", user.id, "source:", cacheSource);

  const { data: cached, error: cacheError } = await supabase
    .from("lessons")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", cacheSource)
    .maybeSingle();

  if (cacheError) {
    console.error("[lesson] cache lookup error:", cacheError);
  }

  if (cached) {
    console.log("[lesson] Cache hit — returning stored lesson");
    return NextResponse.json({ lesson: cached.content });
  }

  // Compatibility with section lessons generated before the reserved cache
  // namespace existed. We only read the legacy key when it cannot also be the
  // exact filename of a real uploaded material; otherwise a source named
  // `notes_section_0` could receive section 0 of `notes`.
  if (isSection) {
    const legacyCacheSource = legacySectionLessonCacheKey(sourceKey, sectionIndex!);
    const { data: collidingSource, error: collidingSourceError } = await supabase
      .from("chunks")
      .select("source_name")
      .eq("user_id", user.id)
      .eq("source_name", legacyCacheSource)
      .limit(1);

    if (collidingSourceError) {
      console.error("[lesson] legacy collision lookup error:", collidingSourceError);
    } else if (!collidingSource || collidingSource.length === 0) {
      const { data: legacyCached, error: legacyCacheError } = await supabase
        .from("lessons")
        .select("content")
        .eq("user_id", user.id)
        .eq("source_name", legacyCacheSource)
        .maybeSingle();

      if (legacyCacheError) {
        console.error("[lesson] legacy cache lookup error:", legacyCacheError);
      }

      if (legacyCached) {
        console.log("[lesson] Legacy cache hit — returning stored lesson");
        return NextResponse.json({ lesson: legacyCached.content });
      }
    }
  }

  console.log("[lesson] Cache miss — generating new lesson");

  // 4c) Cache miss → we must call Anthropic, which needs the user's key. If it's
  //     absent the client can't generate yet; signal that with `needsKey` so the
  //     UI shows the "add your key in Account" prompt instead of a hard error.
  //     (This is NOT an error case — it's the expected first-visit state for a
  //     student who hasn't saved a key.)
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ needsKey: true });
  }
  // chunks are only needed to generate (a hit returns without them), so we
  // validate them here rather than up front.
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return NextResponse.json(
      { error: "No content to teach. This source has no chunks." },
      { status: 400 },
    );
  }

  // 5) Build the user message. The chunks are the raw study material; joining
  //    them with blank lines reconstructs a readable document for Claude to
  //    teach from. The prefix tells the model what the following text IS.
  const material = chunks.join("\n\n");
  const userMessage = `Teach me this material:\n\n${material}`;

  // For a section lesson, focus the tutor on just this section. We append the
  // context to the base prompt rather than replacing it, so the teaching voice
  // and structure rules still apply. `sectionIndex + 1` is the human-facing
  // number (the index is 0-based); the title is whatever Claude named it at
  // upload. When there's no section, the base prompt is used unchanged.
  const baseSystemPrompt = isSection
    ? `${SYSTEM_PROMPT}\n\nYou are teaching Section ${sectionIndex! + 1}${
        sectionTitle ? `: ${sectionTitle}` : ""
      }. Focus exclusively on this section. The material below is only this section's content — teach it as a self-contained lesson, not the whole document.`
    : SYSTEM_PROMPT;

  // Append the student's explanation-depth instruction (Tutor setting), if any.
  // Caveat: lessons are CACHED (see the cache check above), so depth only shapes
  // the FIRST generation of a given source/section — changing it later won't
  // rewrite an already-cached lesson.
  const depthLine = depthInstruction(depth);
  const systemPrompt = depthLine
    ? `${baseSystemPrompt}\n\n${depthLine}`
    : baseSystemPrompt;

  // 6) Create an Anthropic client with the USER'S key (not a server env var).
  //    Each request makes its own client because each request carries a
  //    different user's key — there's no shared, long-lived client to reuse.
  const anthropic = new Anthropic({ apiKey });

  // 7) Call the model. Anything Anthropic-side (bad key, exhausted quota, rate
  //    limit) throws, so we wrap the call and translate the error into a clean,
  //    student-readable message below.
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // The response `content` is an array of blocks. For a normal text reply
    // there's one block of type "text". We pull text out of every text block
    // and join them — robust even if the model returns multiple blocks. We
    // ignore non-text block types (none expected here, but this is safe).
    const lesson = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n\n")
      .trim();

    // Defensive: if somehow no text came back, don't return an empty lesson —
    // surface it as an error the UI can show.
    if (lesson.length === 0) {
      return NextResponse.json(
        { error: "Phi returned an empty lesson. Please try again." },
        { status: 502 },
      );
    }

    // Save to the lessons table so the next visit returns instantly.
    // `.upsert` with `onConflict` handles the unique(user_id, source_name)
    // constraint — if two tabs race to generate the same lesson, the second
    // write just overwrites with an identical value.
    // We store cacheSource (exact source for whole-document lessons, reserved
    // encoded key for section lessons) so it always matches the cache lookup.
    const { error: upsertError } = await supabase.from("lessons").upsert(
      { user_id: user.id, source_name: cacheSource, content: lesson },
      { onConflict: "user_id,source_name" },
    );

    if (upsertError) {
      // Log but don't fail the request — the student still gets their lesson,
      // it just won't be cached for next time.
      console.error("[lesson] upsert error (lesson will not be cached):", upsertError);
    } else {
      console.log("[lesson] lesson cached successfully for source:", cacheSource);
    }

    return NextResponse.json({ lesson });
  } catch (err) {
    // Translate Anthropic SDK errors into a helpful message + status.
    //
    // The SDK throws `Anthropic.APIError` subclasses that carry an HTTP
    // `status`. We branch on the common ones the student is likely to hit:
    //   401 → the key is wrong/revoked.
    //   429 → rate limited OR out of credits/quota.
    // Everything else gets a generic message. We log the full error server-side
    // for debugging but never leak internals to the client.
    console.error("Anthropic lesson generation error:", err);

    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          { error: "Your Anthropic API key is invalid. Check it in Settings." },
          { status: 400 },
        );
      }
      if (err.status === 429) {
        return NextResponse.json(
          {
            error:
              "Anthropic rate limit or quota exceeded. Wait a moment or check your account credits.",
          },
          { status: 400 },
        );
      }
      // Other API errors (e.g. 400 bad request, 500 from Anthropic). Pass along
      // the SDK's message when present — it's usually actionable.
      return NextResponse.json(
        { error: err.message || "Anthropic API error. Please try again." },
        { status: 400 },
      );
    }

    // Not an APIError → likely a network failure reaching Anthropic. That's not
    // the client's fault, so 502 (bad gateway) is the honest status.
    return NextResponse.json(
      { error: "Could not reach Anthropic. Check your connection and try again." },
      { status: 502 },
    );
  }
}
