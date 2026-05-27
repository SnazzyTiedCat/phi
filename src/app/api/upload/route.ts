import { NextResponse } from "next/server";
import { extractText } from "unpdf";
import { createClient } from "@/lib/supabase/server";

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

  // 9) Persist to Supabase. Each chunk becomes one row in the `chunks` table.
  //    The `embedding` column is vector(1536). We store a zero vector now as a
  //    placeholder — the shape is correct so the column accepts it, and real
  //    embeddings can be back-filled later without a schema change. pgvector
  //    reads the vector from PostgREST as a bracketed comma-separated string.
  const zeroVector = `[${new Array(1536).fill(0).join(",")}]`;
  const rows = chunks.map((content) => ({
    user_id: user.id,
    source_name: file.name,
    content,
    embedding: zeroVector,
  }));

  const { error: insertError } = await supabase.from("chunks").insert(rows);
  if (insertError) {
    console.error("chunk insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to save chunks. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ count: chunks.length });
}
