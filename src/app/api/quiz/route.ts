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

// One quiz question: the prompt, its answer options, and the 0-based index of
// the correct one. This is the exact shape the client renders and the
// `questions` jsonb column stores.
type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
};

// The POST body. GET takes its source from the query string instead.
type QuizRequest = {
  source: string;
  apiKey: string;
};

// Model id as a one-line constant, same convention as the other routes. Sonnet
// is plenty for question-writing, cheaper per token than Opus (the student pays
// with their own key), and the result is cached, so the cost is paid at most
// once per source.
const MODEL = "claude-sonnet-4-6";

// The exact generation prompt. The JSON-only instruction matters: we parse the
// reply as data, not prose. `correct` is a 0-based index into `options`.
const SYSTEM_PROMPT = `Generate exactly 5 multiple-choice questions from this material.
Each question must have exactly 4 options and exactly one correct answer.
Return ONLY a JSON array, no markdown, no explanation:
[{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]
The "correct" field is the 0-based index (0-3) of the correct option.`;

/**
 * Pull a clean QuizQuestion[] out of the model's text reply.
 *
 * We ask for raw JSON, but models sometimes wrap it in a ```json fence or add a
 * stray sentence. Rather than trust the output blindly, we:
 *   1. strip a surrounding code fence if present,
 *   2. slice from the first "[" to the last "]" (drops any prose around it),
 *   3. JSON.parse, and
 *   4. keep only well-formed questions — a string question, an array of string
 *      options, and a `correct` index that's actually IN range for that array.
 * Anything malformed is dropped, so a single bad question can't crash the UI.
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

  // 4) Validate each entry. The `correct` index must point at a real option, or
  //    the question is unscoreable and we drop it.
  return parsed
    .filter((q): q is QuizQuestion => {
      if (typeof q !== "object" || q === null) return false;
      const { question, options, correct } = q as Record<string, unknown>;
      return (
        typeof question === "string" &&
        question.trim().length > 0 &&
        Array.isArray(options) &&
        options.length >= 2 &&
        options.every((o) => typeof o === "string") &&
        typeof correct === "number" &&
        Number.isInteger(correct) &&
        correct >= 0 &&
        correct < options.length
      );
    })
    .map((q) => ({
      question: q.question.trim(),
      options: q.options.map((o) => o.trim()),
      correct: q.correct,
    }));
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

  // Normalise exactly like /api/lesson so the lookup key matches what we stored.
  const normalisedSource = decodeURIComponent(source.replace(/\+/g, " "));

  const { data: cached, error } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("user_id", user.id)
    .eq("source_name", normalisedSource)
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

  // 2) Validate. Precise messages beat a vague failure inside the Anthropic call.
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
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

  // 4) Normalise the source name (percent-encoding / "+"-for-space), identical
  //    to /api/lesson and /api/flashcards, so it matches the chunks + quizzes rows.
  const normalisedSource = decodeURIComponent(source.replace(/\+/g, " "));

  // 5) Cache check. If we've already built a quiz for this user + source, return
  //    it — no Claude call, no token spend. (The lesson view normally loads this
  //    via GET on mount, so a POST cache hit mainly guards against two tabs
  //    racing to generate the same quiz.)
  const { data: cached, error: cacheError } = await supabase
    .from("quizzes")
    .select("questions")
    .eq("user_id", user.id)
    .eq("source_name", normalisedSource)
    .maybeSingle();

  if (cacheError) {
    console.error("[quiz] cache lookup error:", cacheError);
  }
  if (cached) {
    return NextResponse.json({ questions: cached.questions });
  }

  // 6) Fetch the source's chunks (the material to make questions from). RLS
  //    already scopes rows to the user; we also filter by user_id for explicit
  //    intent.
  const { data: chunkRows, error: chunksError } = await supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", normalisedSource);

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
      { user_id: user.id, source_name: normalisedSource, questions },
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
