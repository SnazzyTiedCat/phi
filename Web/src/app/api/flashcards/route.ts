import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * /api/flashcards
 *
 * Turns one uploaded source into a set of flashcards.
 *
 *   POST → generate (or return cached) flashcards for a source. Needs the user's
 *          Anthropic key in the body (localStorage lives in the browser — an MVP
 *          decision, see CLAUDE.md — so the client reads it and sends it here).
 *   GET  → read-only cache lookup. Returns the stored cards for a source, or
 *          null if none exist yet. Needs NO key (it never calls Claude), so the
 *          lesson view can call it on mount to "load instantly if they exist"
 *          WITHOUT risking an accidental generation (and token spend) on a
 *          cache miss. POST is the only path that ever spends tokens.
 *
 * This mirrors /api/lesson and /api/chat: Node runtime, we authenticate here
 * (route handlers skip the (app) layout's gate), we fetch the source's chunks
 * from Supabase ourselves, and we make a per-request Anthropic client with the
 * user's key, which we never store.
 */

// The Anthropic SDK targets Node, not Edge — same as the other routes.
export const runtime = "nodejs";

// One flashcard. A question/term on the front, the answer/definition on the back
// — the exact shape the client renders and the `cards` jsonb column stores.
type Flashcard = { front: string; back: string };

// The POST body. GET takes its source from the query string instead.
// `apiKey` is optional: a cached set is returned without a key, so it's only
// required on an actual cache miss (when we have to call Anthropic).
type FlashcardsRequest = {
  source: string;
  apiKey?: string;
};

// Model id as a one-line constant, same convention as the other routes. We use
// Sonnet here: flashcard extraction is well within its ability, it's cheaper per
// token than Opus (the student pays with their own key), and the result is
// cached, so the cost is paid at most once per source.
const MODEL = "claude-sonnet-4-6";

// The exact generation prompt. Flashcard quality is product-critical, so this
// lives in one findable place. The JSON-only instruction matters: we parse the
// reply as data, not prose.
const SYSTEM_PROMPT = `Generate 8-10 flashcards from this material.
Return ONLY a JSON array, no markdown, no explanation:
[{"front": "question or term", "back": "answer or definition"}]`;

/**
 * Pull a clean Flashcard[] out of the model's text reply.
 *
 * We ask for raw JSON, but models sometimes wrap it in a ```json fence or add a
 * stray sentence. Rather than trust the output blindly, we:
 *   1. strip a surrounding code fence if present,
 *   2. slice from the first "[" to the last "]" (drops any prose around it),
 *   3. JSON.parse, and
 *   4. keep only well-formed { front, back } string pairs.
 * Anything malformed yields [], which the caller turns into a clean error.
 */
function parseFlashcards(raw: string): Flashcard[] {
  let text = raw.trim();

  // 1) Strip a ```json ... ``` (or plain ``` ... ```) fence.
  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();

  // 2) Narrow to the array literal, ignoring any text before/after it.
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  // 3) Parse. A syntax error here just means "no usable cards".
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  // 4) Validate each entry. We only keep objects with string front AND back, so
  //    a single malformed card can't crash the renderer downstream.
  return parsed
    .filter(
      (c): c is Flashcard =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as Record<string, unknown>).front === "string" &&
        typeof (c as Record<string, unknown>).back === "string",
    )
    .map((c) => ({ front: c.front.trim(), back: c.back.trim() }));
}

/**
 * GET /api/flashcards?source=<filename>
 *
 * Cache-only read. Returns { cards: Flashcard[] | null }. No Claude call, no key.
 */
export async function GET(request: Request) {
  // The source comes in as a query param (GET has no body).
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");
  if (!source) {
    return NextResponse.json({ error: "Missing source." }, { status: 400 });
  }

  // Authenticate against Supabase's auth server, same as the other routes.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Keep source_name opaque. `searchParams.get()` has already decoded the query
  // string once; decoding again would turn valid identity characters into a
  // different filename (or throw on a literal "%").
  const sourceKey = source;

  const { data: cached, error } = await supabase
    .from("flashcards")
    .select("cards")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey)
    .maybeSingle();

  if (error) {
    console.error("[flashcards] cache lookup error:", error);
    // Don't fail the page over a cache read — report "none" and let the student
    // generate fresh ones.
    return NextResponse.json({ cards: null });
  }

  return NextResponse.json({ cards: cached?.cards ?? null });
}

/**
 * POST /api/flashcards
 *
 * Body: { source, apiKey }. Generates (or returns cached) flashcards.
 */
export async function POST(request: Request) {
  // 1) Parse the body. Bad JSON is the caller's fault → 400, not a 500.
  let body: FlashcardsRequest;
  try {
    body = (await request.json()) as FlashcardsRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { source, apiKey } = body;

  // 2) Validate `source` only — `apiKey` is checked after the cache lookup so a
  //    cached set serves without a key (required only on a real miss).
  if (typeof source !== "string" || source.trim().length === 0) {
    return NextResponse.json({ error: "Missing source." }, { status: 400 });
  }

  // 3) Authenticate. getUser() validates against Supabase's auth server.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 4) Keep source_name opaque. The upload route stores raw `file.name`, and the
  //    client sends that same decoded string; mutating it here breaks lookups.
  const sourceKey = source;

  // 5) Cache check. If we've already built cards for this user + source, return
  //    them — no Claude call, no token spend. (The lesson view normally loads
  //    these via GET on mount, so a POST cache hit mainly guards against two
  //    tabs racing to generate the same set.)
  const { data: cached, error: cacheError } = await supabase
    .from("flashcards")
    .select("cards")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey)
    .maybeSingle();

  if (cacheError) {
    console.error("[flashcards] cache lookup error:", cacheError);
  }
  if (cached) {
    return NextResponse.json({ cards: cached.cards });
  }

  // 5b) Cache miss → we must call Anthropic, so a key is now required.
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }

  // 6) Fetch the source's chunks (the material to make cards from). RLS already
  //    scopes rows to the user; we also filter by user_id for explicit intent.
  const { data: chunkRows, error: chunksError } = await supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey);

  if (chunksError) {
    console.error("[flashcards] chunk fetch error:", chunksError);
    return NextResponse.json(
      { error: "Could not load the lesson material. Please try again." },
      { status: 500 },
    );
  }
  if (!chunkRows || chunkRows.length === 0) {
    // No chunks = the source doesn't exist for this user (stale URL, deleted
    // file). Nothing to make cards from.
    return NextResponse.json(
      { error: "No material found for this lesson." },
      { status: 404 },
    );
  }

  // 7) Build the material and call Claude with the user's key.
  const material = chunkRows.map((row) => row.content).join("\n\n");
  const anthropic = new Anthropic({ apiKey });

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Material:\n\n${material}` }],
    });

    // Join all text blocks (normally just one) into the raw reply.
    const replyText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // 8) Parse the JSON. If nothing usable came back, surface it as an error
    //    rather than caching an empty set.
    const cards = parseFlashcards(replyText);
    if (cards.length === 0) {
      console.error("[flashcards] could not parse cards from reply:", replyText);
      return NextResponse.json(
        { error: "Phi could not generate flashcards. Please try again." },
        { status: 502 },
      );
    }

    // 9) Cache for next time. upsert handles the unique(user_id, source_name)
    //    constraint; a failure here is non-fatal — the student still gets cards,
    //    they just won't be cached.
    const { error: upsertError } = await supabase.from("flashcards").upsert(
      { user_id: user.id, source_name: sourceKey, cards },
      { onConflict: "user_id,source_name" },
    );
    if (upsertError) {
      console.error("[flashcards] upsert error (cards will not be cached):", upsertError);
    }

    return NextResponse.json({ cards });
  } catch (err) {
    // Same Anthropic error translation as /api/lesson and /api/chat: helpful
    // student-facing message, full error logged server-side, never leaked.
    console.error("[flashcards] Anthropic generation error:", err);

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
      return NextResponse.json(
        { error: err.message || "Anthropic API error. Please try again." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Could not reach Anthropic. Check your connection and try again." },
      { status: 502 },
    );
  }
}
