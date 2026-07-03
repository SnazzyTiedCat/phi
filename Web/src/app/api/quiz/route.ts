import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * /api/quiz
 *
 * Turns one uploaded source into a short multiple-choice quiz. This mirrors
 * /api/flashcards almost exactly — same caching, same auth, same Anthropic
 * error handling — just a different shape of generated content.
 *
 *   POST → generate (or return cached) quiz for a source. Needs the user's
 *          Anthropic key in the body (localStorage lives in the browser — an MVP
 *          decision, see CLAUDE.md — so the client reads it and sends it here).
 *   GET  → read-only cache lookup. Returns the stored questions for a source, or
 *          null if none exist yet. Needs NO key (it never calls Claude), so the
 *          lesson view can call it on mount to "load instantly if they exist"
 *          WITHOUT risking an accidental generation (and token spend) on a cache
 *          miss. POST is the only path that ever spends tokens.
 */

// The Anthropic SDK targets Node, not Edge — same as the other routes.
export const runtime = "nodejs";

// A quiz question is one of two shapes (discriminated by `type`):
//   - multiple_choice: options + the 0-based index of the correct one.
//   - short_answer:    a free-text question graded against a sample answer.
// Legacy cached quizzes have no `type` field; we treat those as multiple_choice.
// This is the exact shape the client renders and the `questions` jsonb column
// stores.
type QuizQuestion =
  | { question: string; type: "multiple_choice"; options: string[]; correct: number }
  | { question: string; type: "short_answer"; sample_answer: string };

// The POST body. GET takes its source from the query string instead.
// `apiKey` is optional: a cached quiz serves without a key (required only on a
// real miss). `count` (3–10) and `types` come from the config step in the UI.
type QuizRequest = {
  source: string;
  apiKey?: string;
  count?: number;
  types?: string[];
};

// Model id as a one-line constant, same convention as the other routes. Sonnet
// is plenty for question-writing, cheaper per token than Opus (the student pays
// with their own key), and the result is cached, so the cost is paid at most
// once per source.
const MODEL = "claude-sonnet-4-6";

// The two question types the UI can request. Anything else is ignored.
const QUESTION_TYPES = ["multiple_choice", "short_answer"] as const;

// Build the generation prompt from the student's config. The JSON-only
// instruction matters: we parse the reply as data, not prose. We only describe
// the formats the student asked for, so a multiple-choice-only quiz never gets
// short-answer questions and vice versa.
function buildQuizPrompt(count: number, types: string[]): string {
  const wantsMC = types.includes("multiple_choice");
  const wantsSA = types.includes("short_answer");

  const formats: string[] = [];
  if (wantsMC) {
    formats.push(
      `- Multiple choice: {"question": "...", "type": "multiple_choice", "options": ["A","B","C","D"], "correct": 0} — exactly 4 options; "correct" is the 0-based index of the right one.`,
    );
  }
  if (wantsSA) {
    formats.push(
      `- Short answer: {"question": "...", "type": "short_answer", "sample_answer": "a concise model answer"}`,
    );
  }

  return `Generate exactly ${count} questions from this material.
Return ONLY a JSON array, no markdown, no explanation. Each object uses one of these formats:
${formats.join("\n")}${wantsMC && wantsSA ? "\nUse a mix of both question types." : ""}`;
}

// Clamp the requested count into the UI's 3–10 range, defaulting to 5 for
// anything missing or out of bounds.
function clampCount(n: unknown): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(3, Math.round(n)));
}

/**
 * Pull a clean QuizQuestion[] out of the model's text reply.
 *
 * We ask for raw JSON, but models sometimes wrap it in a ```json fence or add a
 * stray sentence. Rather than trust the output blindly, we:
 *   1. strip a surrounding code fence if present,
 *   2. slice from the first "[" to the last "]" (drops any prose around it),
 *   3. JSON.parse, and
 *   4. normalise each entry to one of the two valid shapes, dropping anything
 *      malformed — so a single bad question can't crash the UI.
 */
function parseQuiz(raw: string): QuizQuestion[] {
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

  // 3) Parse. A syntax error here just means "no usable questions".
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  // 4) Normalise + validate each entry. Drop anything that doesn't fit either
  //    shape (filter out the nulls).
  return parsed
    .map(normaliseQuestion)
    .filter((q): q is QuizQuestion => q !== null);
}

/**
 * Coerce one raw object into a valid QuizQuestion, or null if it's malformed.
 * Short-answer entries (type "short_answer") need a question + sample_answer.
 * Everything else is treated as multiple-choice — including legacy cached
 * questions that predate the `type` field — and needs options + an in-range
 * `correct` index.
 */
function normaliseQuestion(q: unknown): QuizQuestion | null {
  if (typeof q !== "object" || q === null) return null;
  const obj = q as Record<string, unknown>;

  const question = typeof obj.question === "string" ? obj.question.trim() : "";
  if (question.length === 0) return null;

  if (obj.type === "short_answer") {
    if (typeof obj.sample_answer !== "string" || obj.sample_answer.trim().length === 0) {
      return null;
    }
    return { question, type: "short_answer", sample_answer: obj.sample_answer.trim() };
  }

  const { options, correct } = obj;
  if (
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every((o) => typeof o === "string") &&
    typeof correct === "number" &&
    Number.isInteger(correct) &&
    correct >= 0 &&
    correct < options.length
  ) {
    return {
      question,
      type: "multiple_choice",
      options: (options as string[]).map((o) => o.trim()),
      correct,
    };
  }
  return null;
}

/**
 * GET /api/quiz?source=<filename>
 *
 * Cache-only read. Returns { questions: QuizQuestion[] | null }. No Claude call,
 * no key.
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
  // string once; decoding again would mutate valid filenames such as
  // "chapter+notes.txt" or throw on a literal "%".
  const sourceKey = source;

  const { data: cached, error } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey)
    .maybeSingle();

  if (error) {
    console.error("[quiz] cache lookup error:", error);
    // Don't fail the page over a cache read — report "none" and let the student
    // generate a fresh quiz.
    return NextResponse.json({ questions: null });
  }

  return NextResponse.json({ questions: cached?.questions ?? null });
}

/**
 * POST /api/quiz
 *
 * Body: { source, apiKey }. Generates (or returns cached) quiz questions.
 */
export async function POST(request: Request) {
  // 1) Parse the body. Bad JSON is the caller's fault → 400, not a 500.
  let body: QuizRequest;
  try {
    body = (await request.json()) as QuizRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { source, apiKey } = body;

  // 2) Validate `source` only — `apiKey` is checked after the cache lookup so a
  //    cached quiz serves without a key (required only on a real miss).
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

  // 4) Keep source_name opaque. Uploads store raw `file.name`, and the client
  //    sends that same decoded string; mutating it here breaks cache/chunk keys.
  const sourceKey = source;

  // 5) Cache check. If we've already built a quiz for this user + source, return
  //    it — no Claude call, no token spend. (The lesson view normally loads this
  //    via GET on mount, so a POST cache hit mainly guards against two tabs
  //    racing to generate the same quiz.)
  const { data: cached, error: cacheError } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey)
    .maybeSingle();

  if (cacheError) {
    console.error("[quiz] cache lookup error:", cacheError);
  }
  if (cached) {
    return NextResponse.json({ questions: cached.questions });
  }

  // 5b) Cache miss → we must call Anthropic, so a key is now required.
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }

  // 5c) Resolve the config from the body. `count` is clamped to 3–10; `types`
  //     keeps only the known values and falls back to multiple-choice if the
  //     student somehow sent an empty/garbage list.
  const count = clampCount(body.count);
  const requestedTypes = Array.isArray(body.types)
    ? body.types.filter((t): t is (typeof QUESTION_TYPES)[number] =>
        (QUESTION_TYPES as readonly string[]).includes(t),
      )
    : [];
  const types = requestedTypes.length > 0 ? requestedTypes : ["multiple_choice"];

  // 6) Fetch the source's chunks (the material to make questions from). RLS
  //    already scopes rows to the user; we also filter by user_id for explicit
  //    intent.
  const { data: chunkRows, error: chunksError } = await supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", sourceKey);

  if (chunksError) {
    console.error("[quiz] chunk fetch error:", chunksError);
    return NextResponse.json(
      { error: "Could not load the lesson material. Please try again." },
      { status: 500 },
    );
  }
  if (!chunkRows || chunkRows.length === 0) {
    // No chunks = the source doesn't exist for this user (stale URL, deleted
    // file). Nothing to make a quiz from.
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
      max_tokens: 3072,
      system: buildQuizPrompt(count, types),
      messages: [{ role: "user", content: `Material:\n\n${material}` }],
    });

    // Join all text blocks (normally just one) into the raw reply.
    const replyText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    // 8) Parse the JSON. If nothing usable came back, surface it as an error
    //    rather than caching an empty quiz.
    const questions = parseQuiz(replyText);
    if (questions.length === 0) {
      console.error("[quiz] could not parse questions from reply:", replyText);
      return NextResponse.json(
        { error: "Phi could not generate a quiz. Please try again." },
        { status: 502 },
      );
    }

    // 9) Cache for next time. upsert handles the unique(user_id, source_name)
    //    constraint; a failure here is non-fatal — the student still gets the
    //    quiz, it just won't be cached.
    const { error: upsertError } = await supabase.from("quizzes").upsert(
      { user_id: user.id, source_name: sourceKey, questions },
      { onConflict: "user_id,source_name" },
    );
    if (upsertError) {
      console.error("[quiz] upsert error (quiz will not be cached):", upsertError);
    }

    return NextResponse.json({ questions });
  } catch (err) {
    // Same Anthropic error translation as the other routes: helpful
    // student-facing message, full error logged server-side, never leaked.
    console.error("[quiz] Anthropic generation error:", err);

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
