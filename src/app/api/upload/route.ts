import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { isReservedLessonCacheKey } from "@/lib/lesson-cache-key";

/**
 * POST /api/upload
 *
 * Takes one uploaded file (PDF or plain text), extracts its raw text, and
 * splits that text into ~500-token "chunks". Chunks are the unit the RAG
 * pipeline will later embed and store in pgvector — but at THIS milestone we
 * just return them so the UI can prove the pipeline works end to end.
 *
 * This is a Next.js App Router "Route Handler". The filename `route.ts` inside
 * `app/api/upload/` is what makes `/api/upload` a real HTTP endpoint. Exporting
 * an async function named `POST` is how you handle POST requests specifically —
 * a GET to this URL would 405 automatically because we don't export `GET`.
 */

// Force the Node.js runtime (not Edge). `unpdf` uses pdfjs-dist under the hood,
// which needs Node APIs. The Edge runtime is a stripped-down environment and
// would throw at import time. This export is how you opt in.
export const runtime = "nodejs";

// --- Chunking knobs ---------------------------------------------------------
// We don't run a real tokenizer here (that would mean shipping a tokenizer
// dependency for a job that only needs a rough size limit). A widely-used
// approximation is ~4 characters per token for English prose, so a 500-token
// target becomes a 2000-character target. If a future step needs exact token
// counts (e.g. to respect an embedding model's hard limit), swap this estimate
// for a real tokenizer — the chunking logic below stays the same.
const TOKENS_PER_CHUNK = 500;
const CHARS_PER_TOKEN = 4;
const MAX_CHUNK_CHARS = TOKENS_PER_CHUNK * CHARS_PER_TOKEN; // 2000

/**
 * Split raw extracted text into chunks no larger than MAX_CHUNK_CHARS.
 *
 * Strategy (in order of preference, so chunks stay semantically coherent):
 *   1. Split on blank lines (double newlines) — i.e. paragraph boundaries.
 *      Paragraphs are natural units of meaning, so keeping one paragraph per
 *      chunk gives the best retrieval quality later.
 *   2. If a single paragraph is itself longer than the limit (long PDFs love
 *      to produce these), hard-split it by character count. This is a blunt
 *      cut, but it guarantees no chunk ever exceeds the limit.
 *   3. Trim every piece and drop anything empty, so we never store whitespace.
 *
 * Pulled out as a plain function (not inlined in POST) so it's easy to unit
 * test and reason about independently of HTTP concerns.
 */
function chunkText(text: string): string[] {
  // Normalize Windows/Mac line endings to "\n" so the paragraph split below
  // behaves the same regardless of where the file came from.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split on one-or-more blank lines. `\n\s*\n` matches a newline, optional
  // whitespace, then another newline — this catches paragraphs separated by
  // blank lines even if those "blank" lines contain stray spaces or tabs.
  const paragraphs = normalized.split(/\n\s*\n/);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (trimmed.length === 0) continue; // drop empties

    if (trimmed.length <= MAX_CHUNK_CHARS) {
      // Common case: paragraph fits in one chunk.
      chunks.push(trimmed);
    } else {
      // Oversized paragraph: hard-split into MAX_CHUNK_CHARS-sized slices.
      for (let start = 0; start < trimmed.length; start += MAX_CHUNK_CHARS) {
        const slice = trimmed.slice(start, start + MAX_CHUNK_CHARS).trim();
        if (slice.length > 0) chunks.push(slice);
      }
    }
  }

  return chunks;
}

// Pull the raw text out of a PDF buffer using unpdf.
// `mergePages: true` concatenates all pages into one string so the chunker
// sees the full document rather than per-page fragments.
async function extractPdfText(data: Uint8Array): Promise<string> {
  const { text } = await extractText(data, { mergePages: true });
  return text;
}

// --- Section mapping -------------------------------------------------------
// The model that names the document's sections. Sonnet (not Opus): naming a
// handful of sections from the first few thousand characters is well within its
// ability and cheaper per token — and the student pays with their own key. Same
// choice /api/flashcards makes for the same reason.
const MAPPING_MODEL = "claude-sonnet-4-6";

// The exact prompt, verbatim and in one place because the JSON-only instruction
// is load-bearing: we parse the reply as data, not prose. The raw document text
// is appended after this prefix at call time.
const MAPPING_PROMPT = `You are analyzing a document to create a study roadmap.
Read this content and identify 3-8 logical sections (chapters, units, topics, or parts).
Return ONLY a JSON array, no markdown:
[{"title": "Section name", "description": "One sentence what this covers"}]

Document content (first 4000 chars): `;

// One section as stored in `sources.sections` (jsonb). `start_chunk`/`end_chunk`
// are the inclusive chunk range this section spans. The authoritative filter is
// `section_index` on the chunk rows themselves; these two are kept for display.
type Section = {
  index: number;
  title: string;
  description: string;
  start_chunk: number;
  end_chunk: number;
};

// What Claude returns, before we attach indices and chunk ranges.
type ParsedSection = { title: string; description: string };

/**
 * Pull a clean ParsedSection[] out of the model's reply. Mirrors the defensive
 * parser in /api/flashcards: strip a code fence, narrow to the array literal,
 * JSON.parse, then keep only entries with a string `title`. A missing
 * `description` becomes "" rather than discarding the whole section. Anything
 * unparseable yields [], which the caller treats as "no sections".
 */
function parseSections(raw: string): ParsedSection[] {
  let text = raw.trim();

  const fence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter(
      (s): s is { title: string; description?: unknown } =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).title === "string",
    )
    .map((s) => ({
      title: (s.title as string).trim(),
      description: typeof s.description === "string" ? s.description.trim() : "",
    }));
}

/**
 * Turn the named sections into concrete chunk ranges via a simple even split,
 * and produce the per-chunk `section_index` array used when inserting rows.
 *
 * - The section count is clamped to the chunk count, so we never emit an empty
 *   section (more sections than chunks would otherwise leave some with none).
 * - The remainder is spread one-per-section across the first sections, so sizes
 *   differ by at most one and every chunk belongs to exactly one section.
 */
function buildSections(
  parsed: ParsedSection[],
  numChunks: number,
): { sections: Section[]; chunkSectionIndex: number[] } {
  const count = Math.max(1, Math.min(parsed.length, numChunks));
  const base = Math.floor(numChunks / count);
  const remainder = numChunks % count;

  const sections: Section[] = [];
  const chunkSectionIndex = new Array<number>(numChunks).fill(0);

  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < remainder ? 1 : 0);
    const startChunk = cursor;
    const endChunk = cursor + size - 1; // inclusive
    sections.push({
      index: i,
      title: parsed[i].title,
      description: parsed[i].description,
      start_chunk: startChunk,
      end_chunk: endChunk,
    });
    for (let j = startChunk; j <= endChunk && j < numChunks; j++) {
      chunkSectionIndex[j] = i;
    }
    cursor = endChunk + 1;
  }

  return { sections, chunkSectionIndex };
}

export async function POST(request: Request) {
  // 1) Read the multipart form body. `request.formData()` is built into the
  //    web Request object Next gives us — no body-parser middleware needed.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    // This throws if the body isn't valid multipart/form-data (e.g. someone
    // POSTed JSON). Treat it as a client error.
    return NextResponse.json(
      { error: "Expected multipart/form-data with a file field." },
      { status: 400 },
    );
  }

  // 2) Grab the "file" field. `.get()` returns the value OR null if missing.
  //    In the browser a file input produces a `File`, which is a subclass of
  //    `Blob`. We check `instanceof File` so a stray text field named "file"
  //    can't sneak through.
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file provided. Attach a file under the 'file' field." },
      { status: 400 },
    );
  }

  // Lesson section caches use a reserved synthetic `source_name` namespace.
  // Browser file pickers should never produce names with `/`, but rejecting the
  // prefix here keeps crafted multipart uploads from colliding with cache rows.
  if (isReservedLessonCacheKey(file.name)) {
    return NextResponse.json(
      { error: "This filename is reserved. Rename the file and upload again." },
      { status: 400 },
    );
  }

  // 3) Validate the extension. We key off the filename suffix (lowercased so
  //    ".PDF" works too) rather than MIME type, because browsers are
  //    inconsistent about the MIME type they attach — .txt files in
  //    particular often arrive as "application/octet-stream".
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf");
  const isTxt = name.endsWith(".txt");
  if (!isPdf && !isTxt) {
    return NextResponse.json(
      { error: "Unsupported file type. Upload a .pdf or .txt file." },
      { status: 400 },
    );
  }

  // 4) Pull the bytes once. `arrayBuffer()` reads the whole file into memory —
  //    fine for the MVP (student-sized PDFs/notes). For very large files this
  //    would be a place to stream instead, but that's a later optimization.
  const arrayBuffer = await file.arrayBuffer();

  // 5) Extract the text based on type.
  let text: string;
  try {
    if (isTxt) {
      // Plain text: decode the bytes as UTF-8. TextDecoder is the standard,
      // dependency-free way to turn raw bytes into a string.
      text = new TextDecoder("utf-8").decode(arrayBuffer);
    } else {
      // PDF: hand the bytes to unpdf as a Uint8Array.
      text = await extractPdfText(new Uint8Array(arrayBuffer));
    }
  } catch {
    // A parse failure here means the file is corrupt, password-protected, or
    // otherwise unreadable. That's the caller's input, so it's still a 400 —
    // not a 500 (a 500 would imply OUR server broke).
    return NextResponse.json(
      { error: "Could not read the file. It may be corrupt or password-protected." },
      { status: 400 },
    );
  }

  // 6) Guard against "empty after extraction" — e.g. a scanned PDF that's all
  //    images with no embedded text layer. Without this the user would get a
  //    confusing "0 chunks" success instead of a clear explanation.
  if (text.trim().length === 0) {
    return NextResponse.json(
      { error: "No readable text found in the file. Scanned/image-only PDFs aren't supported yet." },
      { status: 400 },
    );
  }

  // 7) Chunk.
  const chunks = chunkText(text);

  // 8) Authenticate. Route handlers don't go through the (app) layout, so we
  //    must verify the session ourselves. getUser() validates against Supabase's
  //    auth server (not just a local cookie), so it's the trustworthy check.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 9) Map the document into sections (best-effort).
  //    This is the ONE place chunk order is unambiguous — the `chunks` array
  //    above — so we assign each chunk its `section_index` HERE, at insert time,
  //    rather than back-filling later (the `chunks` table has no ordering column
  //    to reconstruct order from afterwards). Claude only NAMES the sections;
  //    the boundaries are a plain even split over the chunk count.
  //
  //    "Best-effort" is the contract: if there's no key, or Claude fails, or the
  //    reply can't be parsed, we still save the chunks as one implicit section
  //    (section_index 0) and skip the `sources` row. An upload must never fail
  //    because the AI mapping did — the student's material is saved regardless.
  const apiKeyValue = formData.get("apiKey");
  const apiKey = typeof apiKeyValue === "string" ? apiKeyValue.trim() : "";

  let sections: Section[] = [];
  let chunkSectionIndex = new Array<number>(chunks.length).fill(0);

  if (apiKey.length > 0) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
        model: MAPPING_MODEL,
        max_tokens: 1024,
        messages: [
          { role: "user", content: `${MAPPING_PROMPT}${text.slice(0, 4000)}` },
        ],
      });

      const reply = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      const parsed = parseSections(reply);
      if (parsed.length > 0) {
        const built = buildSections(parsed, chunks.length);
        sections = built.sections;
        chunkSectionIndex = built.chunkSectionIndex;
      }
    } catch (err) {
      // Logged, never surfaced: the upload proceeds without a section roadmap.
      console.error("[upload] section mapping failed (saving without sections):", err);
    }
  }

  // 10) Persist the chunks. Each chunk becomes one row in the `chunks` table,
  //     now carrying its `section_index` so the lesson page can fetch a single
  //     section's chunks with one WHERE clause.
  //     The `embedding` column is vector(1536). We store a zero vector now as a
  //     placeholder — the shape is correct so the column accepts it, and real
  //     embeddings can be back-filled later without a schema change. pgvector
  //     reads the vector from PostgREST as a bracketed comma-separated string.
  const zeroVector = `[${new Array(1536).fill(0).join(",")}]`;
  const rows = chunks.map((content, i) => ({
    user_id: user.id,
    source_name: file.name,
    content,
    embedding: zeroVector,
    section_index: chunkSectionIndex[i],
  }));

  const { error: insertError } = await supabase.from("chunks").insert(rows);
  if (insertError) {
    console.error("chunk insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to save chunks. Please try again." },
      { status: 500 },
    );
  }

  // 11) Save the section roadmap. Non-fatal: the chunks are already saved (each
  //     tagged with its section_index), so a failure here just means the
  //     dashboard falls back to the flat card for this source until re-mapped.
  if (sections.length > 0) {
    const { error: sourcesError } = await supabase.from("sources").upsert(
      { user_id: user.id, source_name: file.name, sections },
      { onConflict: "user_id,source_name" },
    );
    if (sourcesError) {
      console.error("[upload] sources upsert error (roadmap not saved):", sourcesError);
    }
  }

  return NextResponse.json({ count: chunks.length, sections });
}
