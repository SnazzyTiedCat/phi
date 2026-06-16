import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/grade
 *
 * Grades one short-answer quiz response. The quiz route generates short-answer
 * questions with a `sample_answer`; this endpoint asks Claude whether the
 * student's answer means the same thing, and returns { correct: boolean }.
 *
 * This is a LIVE call on every submit (like /api/chat) — there's nothing to
 * cache, since the answer is different each time. It needs the user's key in the
 * body for the same reason every other Anthropic route does (localStorage lives
 * in the browser — see CLAUDE.md).
 */

export const runtime = "nodejs";

type GradeRequest = {
  apiKey?: string;
  question?: string;
  sampleAnswer: string;
  studentAnswer: string;
};

// A cheap, fast model is right here: the task is a single YES/NO judgement, not
// generation. Haiku answers it in a fraction of the latency of Sonnet/Opus.
const MODEL = "claude-haiku-4-5-20251001";

// The exact grading instruction from the spec.
const SYSTEM_PROMPT =
  "Does this student answer convey the same meaning as the sample answer? Respond with just YES or NO.";

export async function POST(request: Request) {
  let body: GradeRequest;
  try {
    body = (await request.json()) as GradeRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { apiKey, question, sampleAnswer, studentAnswer } = body;

  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
  if (typeof sampleAnswer !== "string" || typeof studentAnswer !== "string") {
    return NextResponse.json({ error: "Missing answer to grade." }, { status: 400 });
  }

  // Authenticate — route handlers skip the (app) layout's gate.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey });
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 5, // just "YES" / "NO"
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Question: ${question ?? ""}\n\nSample answer: ${sampleAnswer}\n\nStudent answer: ${studentAnswer}`,
        },
      ],
    });

    const reply = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim()
      .toUpperCase();

    // Treat a leading YES as correct; anything else (NO, or a hedge) is wrong.
    return NextResponse.json({ correct: reply.startsWith("YES") });
  } catch (err) {
    console.error("[grade] Anthropic error:", err);
    if (err instanceof Anthropic.APIError) {
      if (err.status === 401) {
        return NextResponse.json(
          { error: "Your Anthropic API key is invalid. Check it in Account." },
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
