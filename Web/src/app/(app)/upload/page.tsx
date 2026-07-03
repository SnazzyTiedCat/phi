"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Status = "idle" | "uploading" | "done" | "error";

// One section in the roadmap /api/upload returns. Mirrors the `sources.sections`
// jsonb shape. `sections` is empty when mapping was skipped or failed (no key,
// Claude error) — the success panel falls back to a single "Start learning".
type Section = {
  index: number;
  title: string;
  description: string;
  start_chunk: number;
  end_chunk: number;
};
type UploadResponse = { count: number; sections?: Section[] };

// The narrated steps shown while an upload is in flight. These are reassurance,
// not telemetry — the real /api/upload call runs in parallel and we have no
// progress events from it, so we pace these with timers to set honest
// expectations ("this takes a few seconds and here's roughly what's happening").
const UPLOAD_STEPS = [
  "Reading your file…",
  "Breaking into chunks…",
  "Mapping into sections…",
  "Saving to your library…",
];

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Captured at the moment of success so the success panel can show it even
  // after `file` is cleared by a reset.
  const [successFileName, setSuccessFileName] = useState<string | null>(null);
  // The section roadmap returned by /api/upload. Empty array = the document
  // wasn't mapped (no key / mapping failed); the success panel handles both.
  const [successSections, setSuccessSections] = useState<Section[]>([]);

  // Which narrated step we're on: 0 = none, 1/2/3 = the steps in UPLOAD_STEPS.
  // A step is "shown" once we reach it, "active" while it's the current one, and
  // "complete" once a later step arrives — so they accumulate top-to-bottom.
  const [step, setStep] = useState(0);
  // The pending step timers, held so we can cancel them the instant the real
  // request resolves (or the component unmounts) — otherwise a late setStep
  // would fire after we've already moved to the success/error state.
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearStepTimers() {
    stepTimers.current.forEach(clearTimeout);
    stepTimers.current = [];
  }

  // Cancel any in-flight step timers if the user navigates away mid-upload.
  useEffect(() => clearStepTimers, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const ACCEPTED = [".pdf", ".txt"];

  const isDone = status === "done";
  const isUploading = status === "uploading";

  function selectFile(candidate: File) {
    const name = candidate.name.toLowerCase();
    const isAccepted = ACCEPTED.some((ext) => name.endsWith(ext));
    if (!isAccepted) {
      setFile(null);
      setStatus("error");
      setErrorMessage("Only .pdf and .txt files are supported.");
      return;
    }
    setFile(candidate);
    setStatus("idle");
    setErrorMessage("");
  }

  function resetForm() {
    clearStepTimers();
    setStep(0);
    setFile(null);
    setSuccessFileName(null);
    setSuccessSections([]);
    setStatus("idle");
    setErrorMessage("");
    setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) selectFile(picked);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage("");

    // Kick off the narrated steps: step 1 immediately, then the rest on timers.
    // "Mapping into sections…" (step 3) is the long pole — it's the Claude call
    // — so we let it land at 2s and sit there through the wait. Clear first so a
    // quick retry doesn't stack two sets of timers.
    clearStepTimers();
    setStep(1);
    stepTimers.current = [
      setTimeout(() => setStep(2), 800),
      setTimeout(() => setStep(3), 1600),
      setTimeout(() => setStep(4), 3200),
    ];

    try {
      const body = new FormData();
      body.append("file", file);
      // Send the Anthropic key alongside the file so /api/upload can map the
      // document into sections. It's optional: with no key the upload still
      // succeeds, just without a section roadmap (the route is best-effort).
      const apiKey = localStorage.getItem("phi_anthropic_key");
      if (apiKey) body.append("apiKey", apiKey);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data: UploadResponse | { error?: string } = await res.json();

      // The real request resolved — stop narrating, whatever the outcome.
      clearStepTimers();

      if (!res.ok) {
        setStep(0);
        setStatus("error");
        setErrorMessage(
          ("error" in data && data.error) || "Upload failed. Please try again.",
        );
        return;
      }

      // Capture the filename + section roadmap before clearing state — the
      // success panel needs both. `sections` may be absent/empty (mapping
      // skipped or failed); the panel handles that with a single CTA.
      setSuccessFileName(file.name);
      setSuccessSections(
        "sections" in data && Array.isArray(data.sections) ? data.sections : [],
      );
      setStatus("done");
    } catch {
      clearStepTimers();
      setStep(0);
      setStatus("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  }

  return (
    // `relative` is load-bearing: the success panel uses `absolute inset-0` to
    // overlay exactly this container. The upload panel stays in normal flow so
    // the container keeps its natural height — no layout jump when success appears.
    <div className="relative mx-auto w-full max-w-2xl px-6 py-12">

      {/* ── Upload panel ─────────────────────────────────────────────────────
          Fades up and out when done. `pointer-events-none` prevents clicks on
          the invisible panel from leaking through the success overlay.        */}
      <div
        className={`transition-all duration-500 ease-out ${
          isDone
            ? "pointer-events-none -translate-y-3 opacity-0"
            : "translate-y-0 opacity-100"
        }`}
      >
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Upload Material
        </h1>
        <p className="mt-2 text-sm text-muted">
          Drop a PDF or text file and Phi will break it into lessons.
        </p>

        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a PDF or text file. Click to browse, or drag a file here."
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mt-10 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center transition-colors duration-200 ${
            isDragging
              ? "border-accent bg-accent/5"
              : "border-white/[0.10] bg-surface/40 hover:border-white/20"
          }`}
        >
          <span
            aria-hidden="true"
            className="text-4xl font-extralight leading-none tracking-tighter text-accent"
          >
            φ
          </span>

          <p className="mt-4 text-sm text-text">
            {file ? (
              <>
                Selected: <span className="text-accent">{file.name}</span>
              </>
            ) : (
              <>
                <span className="text-accent">Click to browse</span> or drag a
                file here
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted">PDF or TXT</p>

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        {/* File-type expectation, set here so a student with a scanned PDF
            learns the limit up front — not after an OCR-empty upload. Muted +
            xs: available, not shouting. Sits tight under the drop zone. */}
        <p className="mt-3 text-xs text-muted">
          Text-based PDFs and .txt files only. Scanned or image-based PDFs are
          not supported.
        </p>

        {/* One calm line on what the button does, grouped just above it. */}
        <p className="mt-6 text-xs text-muted">
          Phi will read your material and build a structured lesson.
        </p>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="mt-3 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-accent disabled:hover:shadow-none"
        >
          {isUploading ? "Processing…" : "Upload and process"}
        </button>

        {/* Narrated progress. Each step fades + slides in once we reach it
            (visible = step >= n), the current one spins, finished ones get a
            gold check — so the list reads as a checklist filling in. Only
            mounted while uploading; the whole panel then fades out into the
            success state. aria-live announces each new step to screen readers. */}
        {isUploading && (
          <ol className="mt-6 space-y-3" aria-live="polite">
            {UPLOAD_STEPS.map((label, i) => {
              const n = i + 1;
              const isActive = step === n;
              const isComplete = step > n;
              const isVisible = step >= n;
              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    isVisible
                      ? "translate-x-0 opacity-100"
                      : "-translate-x-1 opacity-0"
                  } ${isActive ? "text-text" : "text-muted"}`}
                >
                  {isComplete ? (
                    <span aria-hidden="true" className="text-accent">
                      ✓
                    </span>
                  ) : isActive ? (
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-white/15"
                    />
                  )}
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <div role="status" className="mt-4 text-sm">
          {status === "error" && (
            <p className="text-red-400">{errorMessage}</p>
          )}
        </div>
      </div>

      {/* ── Success panel ────────────────────────────────────────────────────
          Absolutely overlays the upload panel. Fades up into view when done.
          Starts slightly below (translate-y-3) and slides to its natural
          position — the opposite direction from the upload panel leaving.     */}
      <div
        aria-live="polite"
        className={`absolute inset-0 flex flex-col justify-center overflow-y-auto px-6 py-8 transition-all duration-500 ease-out ${
          isDone
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <p className="text-sm text-muted">
          {successSections.length > 0
            ? `Your material has been mapped into ${successSections.length} section${
                successSections.length === 1 ? "" : "s"
              }.`
            : "Your material is ready."}
        </p>
        <p className="mt-2 truncate text-2xl font-semibold text-accent">
          {successFileName}
        </p>

        {successSections.length > 0 ? (
          /* ── Roadmap ────────────────────────────────────────────────────
             One row per section: its title + a Start button that deep-links
             into that section's lesson. The student can dive straight into any
             section, or head to the dashboard to see the whole roadmap. Each
             row is a list item so it reads as an ordered study path. */
          <>
            <ol className="mt-6 space-y-2">
              {successSections.map((section) => (
                <li
                  key={section.index}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-surface/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {section.index + 1}. {section.title}
                    </p>
                    {section.description && (
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/lesson?source=${encodeURIComponent(
                      successFileName ?? "",
                    )}&section=${section.index}`}
                    className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-surface px-4 py-2 text-xs font-medium text-text transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent active:scale-95"
                  >
                    Start
                  </Link>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              >
                Go to dashboard
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center rounded-full border border-white/10 bg-surface/40 px-6 py-3 text-sm font-medium text-text transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg active:scale-95"
              >
                Upload another
              </button>
            </div>
          </>
        ) : (
          /* Fallback: mapping was skipped or failed. Keep the original single
             "Start learning" (whole document) + "Upload another" pair. */
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/lesson?source=${encodeURIComponent(successFileName ?? "")}`}
              className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-[#e2bb68] hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
            >
              Start learning
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center rounded-full border border-white/10 bg-surface/40 px-6 py-3 text-sm font-medium text-text transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg active:scale-95"
            >
              Upload another
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
