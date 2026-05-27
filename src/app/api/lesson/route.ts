import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
  apiKey: string;
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
Format using markdown.`;

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

  const { chunks, source, apiKey } = body;

  // 2) Validate. All three fields are required. We check them explicitly so the
  //    error message tells the caller exactly what's missing instead of letting
  //    a vague failure surface later inside the Anthropic call.
  //    - `apiKey` must be a non-empty string (a blank key would just 401 at
  //      Anthropic with a less helpful message).
  //    - `source` must be a non-empty string.
  //    - `chunks` must be a non-empty array (no chunks = nothing to teach).
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing API key." },
      { status: 400 },
    );
  }
  if (typeof source !== "string" || source.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing source." },
      { status: 400 },
    );
  }
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return NextResponse.json(
      { error: "No content to teach. This source has no chunks." },
      { status: 400 },
    );
  }

  // 3) Build the user message. The chunks are the raw study material; joining
  //    them with blank lines reconstructs a readable document for Claude to
  //    teach from. The prefix tells the model what the following text IS.
  const material = chunks.join("\n\n");
  const userMessage = `Teach me this material:\n\n${material}`;

  // 4) Create an Anthropic client with the USER'S key (not a server env var).
  //    Each request makes its own client because each request carries a
  //    different user's key — there's no shared, long-lived client to reuse.
  const anthropic = new Anthropic({ apiKey });

  // 5) Call the model. Anything Anthropic-side (bad key, exhausted quota, rate
  //    limit) throws, so we wrap the call and translate the error into a clean,
  //    student-readable message below.
  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
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
