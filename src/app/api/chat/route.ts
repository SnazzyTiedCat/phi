import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/chat
 *
 * The chat sidebar's backend. While a student is reading a lesson, they can ask
 * Phi questions about the material. This endpoint:
 *   1. takes the question + the prior turns + the source filename,
 *   2. pulls that source's chunks out of Supabase (the RAG step — we ground
 *      Phi's answer in the student's OWN material, not the model's general
 *      knowledge),
 *   3. asks Claude to answer, and STREAMS the reply back token-by-token so the
 *      sidebar fills in live instead of waiting for the whole answer.
 *
 * Why it mirrors /api/lesson:
 * Same reasons that route exists. The Anthropic key lives in the browser's
 * localStorage (MVP decision, see CLAUDE.md), so the client must send it to us;
 * we use it for this one request and never store it. Auth is checked here
 * because route handlers don't pass through the (app) layout's gate.
 *
 * The one big difference from /api/lesson: this STREAMS.
 * /api/lesson uses `messages.create` and returns the whole lesson as JSON once
 * it's done. Chat should feel like a conversation, so we use `messages.stream`
 * and pipe each text delta to the browser as it arrives.
 */

// Force the Node.js runtime (not Edge). The Anthropic SDK targets Node; this
// matches /api/lesson and /api/upload.
export const runtime = "nodejs";

// The request contract. Declaring it as a type lets TypeScript check our field
// access below and documents exactly what the client must send.
type ChatRequest = {
  message: string;
  source: string;
  history: { role: "user" | "assistant"; content: string }[];
  apiKey: string;
};

// The model id, pulled out as a constant so a future upgrade is one edit — same
// pattern as /api/lesson.
const MODEL = "claude-opus-4-7";

// The base tutor prompt. We append the source material to this at request time
// (it's per-request data, so it can't be baked into a constant). Keeping the
// fixed instructions here, separate from the dynamic material, makes the prompt
// easy to read and tweak — the teaching voice is product-critical.
const SYSTEM_PROMPT_BASE = `You are Phi, a focused AI tutor. The student is currently reading a lesson.
Answer their questions using only the provided source material.
Be concise, clear, and encouraging. If they ask to explain something simply,
use an analogy. If they ask to skip ahead, give a brief recap of what they'd miss.
Keep responses under 150 words unless a detailed explanation is truly needed.
Do not use emojis anywhere in your response. Use clean typography and formatting only.

Source material:
`;

export async function POST(request: Request) {
  // 1) Parse the body. Invalid JSON is the caller's fault → 400, not a 500.
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { message, source, history, apiKey } = body;

  // 2) Validate all four fields. Explicit checks give the caller a precise
  //    message instead of a vague failure deep inside the Anthropic call.
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }
  if (typeof source !== "string" || source.trim().length === 0) {
    return NextResponse.json({ error: "Missing source." }, { status: 400 });
  }
  // `history` is allowed to be empty (the first question has no prior turns),
  // but it must be an array if present. A non-array means a malformed client.
  if (!Array.isArray(history)) {
    return NextResponse.json({ error: "Missing conversation history." }, { status: 400 });
  }

  // 3) Authenticate. getUser() validates against Supabase's auth server, not
  //    just a local cookie — the trustworthy check. Same as /api/lesson.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 4) Normalise the source name, identical to /api/lesson: the URL may carry
  //    percent-encoding or "+"-for-space, but the chunks table stores the plain
  //    filename. Decoding once is idempotent for already-decoded strings and
  //    fixes the mismatch when it's still encoded.
  const normalisedSource = decodeURIComponent(source.replace(/\+/g, " "));

  // 5) Fetch the source's chunks (the RAG step). We only need `content`. We
  //    filter by user_id even though RLS already scopes rows — explicit intent
  //    plus defense-in-depth, matching the lesson page.
  const { data: chunkRows, error: chunksError } = await supabase
    .from("chunks")
    .select("content")
    .eq("user_id", user.id)
    .eq("source_name", normalisedSource);

  if (chunksError) {
    console.error("[chat] chunk fetch error:", chunksError);
    return NextResponse.json(
      { error: "Could not load the lesson material. Please try again." },
      { status: 500 },
    );
  }

  if (!chunkRows || chunkRows.length === 0) {
    // No chunks = the source doesn't exist for this user (stale URL, deleted
    // file). Without material there's nothing to ground an answer in.
    return NextResponse.json(
      { error: "No material found for this lesson." },
      { status: 404 },
    );
  }

  // 6) Build the system prompt: fixed instructions + the student's material.
  const material = chunkRows.map((row) => row.content).join("\n\n");
  const systemPrompt = SYSTEM_PROMPT_BASE + material;

  // 7) Build the conversation. Anthropic's `messages` array is the running
  //    transcript: all prior turns, then the new question last. The client
  //    sends `history` WITHOUT the new message (it's optimistic-rendered on the
  //    client separately), so we append it here.
  const messageHistory = [
    ...history,
    { role: "user" as const, content: message },
  ];

  // 8) Each request makes its own client because each carries a different
  //    user's key — there's no shared, long-lived client to reuse.
  const anthropic = new Anthropic({ apiKey });

  // 9) Open the stream. `messages.stream` returns an async-iterable of events.
  //    We DON'T await the whole thing — we want to pipe deltas as they arrive.
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: messageHistory,
  });

  // 10) The streaming-vs-JSON-errors problem.
  //
  //     The spec asks for BOTH: stream text/plain AND return JSON { error } on
  //     failure. Those are mutually exclusive once the first byte is flushed —
  //     you can't change a response's Content-Type mid-stream. So we split by
  //     WHEN the error happens:
  //
  //       - Errors BEFORE the first token (bad key → 401, no quota → 429, etc.)
  //         are the common, student-facing ones. We catch them here, before we
  //         start streaming, and return a clean JSON { error } the sidebar
  //         already knows how to display.
  //       - Errors AFTER streaming has begun (rare: a network drop mid-reply)
  //         can't switch to JSON. We just close the stream; the client keeps
  //         whatever partial text arrived.
  //
  //     To make a pre-flight key error land in the JSON path, we PROBE the
  //     first event inside a try/catch. A bad key throws on this first await —
  //     before we've sent anything — so we can still answer with JSON.
  const iterator = stream[Symbol.asyncIterator]();
  let firstResult: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    firstResult = await iterator.next();
  } catch (err) {
    // Same Anthropic-error translation as /api/lesson: turn SDK errors into a
    // student-readable message. Log the full error server-side; never leak
    // internals to the client.
    console.error("[chat] Anthropic stream error (pre-stream):", err);

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

  // 11) The first event arrived without throwing → the key is good and the
  //     stream is live. Build a ReadableStream that emits the text from the
  //     first event (if any) and then drains the rest of the iterator.
  //
  //     We narrow each event the same way: only `content_block_delta` events
  //     of `text_delta` type carry visible text. Everything else (message
  //     start/stop, content-block start/stop, usage deltas) we skip.
  const readableStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const emit = (event: Anthropic.MessageStreamEvent) => {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      };

      try {
        // The first event we already pulled during the probe.
        if (!firstResult.done && firstResult.value) {
          emit(firstResult.value);
        }
        // Drain the remaining events.
        let next = await iterator.next();
        while (!next.done) {
          emit(next.value);
          next = await iterator.next();
        }
        controller.close();
      } catch (err) {
        // Mid-stream failure (e.g. connection dropped). We can't switch to a
        // JSON error now — the headers are already sent — so we close the
        // stream. The client keeps the partial text it received.
        console.error("[chat] mid-stream error:", err);
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
