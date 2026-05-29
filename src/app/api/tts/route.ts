import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/tts
 *
 * Turns the lesson text into spoken audio. The browser sends the plain text and
 * the student's ElevenLabs key; we forward both to ElevenLabs, then stream the
 * MP3 back so the lesson view can play it through a plain <audio> element.
 *
 * Why this route exists (rather than calling ElevenLabs from the browser):
 *   - ElevenLabs returns a raw audio body, not JSON. Proxying it through our own
 *     route keeps the client code simple — it just reads a blob.
 *   - It mirrors /api/chat and /api/lesson: the key lives in the browser's
 *     localStorage (MVP decision, see CLAUDE.md), the client sends it per
 *     request, and we never store it.
 *   - We still gate on auth here, because route handlers don't pass through the
 *     (app) layout's auth check.
 */

// Node.js runtime, matching the other routes. (Edge would work for a fetch
// proxy, but staying consistent avoids surprises.)
export const runtime = "nodejs";

type TtsRequest = {
  text: string;
  apiKey: string;
};

// Rachel — ElevenLabs' default stock voice. Pulled out as a constant so swapping
// voices later (or making it per-persona in V2) is a one-line change.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

export async function POST(request: Request) {
  // 1) Parse the body. Bad JSON is the caller's fault → 400.
  let body: TtsRequest;
  try {
    body = (await request.json()) as TtsRequest;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const { text, apiKey } = body;

  // 2) Validate both fields up front so failures are precise.
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    return NextResponse.json({ error: "Missing API key." }, { status: 400 });
  }
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  // 3) Authenticate against Supabase's auth server (not just a cookie), the same
  //    trustworthy check used by /api/chat and /api/lesson.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 4) Call ElevenLabs. We send the exact contract from their text-to-speech
  //    endpoint: model + voice tuning. The response body is raw MP3 bytes.
  let elevenRes: Response;
  try {
    elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );
  } catch (err) {
    // The fetch itself failed (network down). 502: we couldn't reach upstream.
    console.error("[tts] ElevenLabs request failed:", err);
    return NextResponse.json(
      { error: "Could not reach ElevenLabs. Check your connection and try again." },
      { status: 502 },
    );
  }

  // 5) ElevenLabs answered, but with an error status (bad key → 401, quota →
  //    429, etc). Their error body is JSON, not audio — log it server-side and
  //    return a clean message. Never leak upstream internals to the client.
  if (!elevenRes.ok) {
    const detail = await elevenRes.text().catch(() => "");
    console.error("[tts] ElevenLabs error:", elevenRes.status, detail);
    return NextResponse.json(
      { error: "ElevenLabs could not generate audio. Check your key and credits." },
      { status: 400 },
    );
  }

  // 6) Success: pipe the MP3 straight back to the browser. We pass the upstream
  //    body through unchanged and label it audio/mpeg so the client can wrap it
  //    in a Blob and feed it to <audio>.
  return new Response(elevenRes.body, {
    headers: { "Content-Type": "audio/mpeg" },
  });
}
