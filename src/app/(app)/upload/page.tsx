"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Status = "idle" | "uploading" | "done" | "error";
type UploadResponse = { count: number };

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  // Captured at the moment of success so the success panel can show it even
  // after `file` is cleared by a reset.
  const [successFileName, setSuccessFileName] = useState<string | null>(null);

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
    setFile(null);
    setSuccessFileName(null);
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

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data: UploadResponse | { error?: string } = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          ("error" in data && data.error) || "Upload failed. Please try again.",
        );
        return;
      }

      // Capture the filename before clearing state — the success panel needs it.
      setSuccessFileName(file.name);
      setStatus("done");
    } catch {
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
          Upload material
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
          className="mt-3 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          {isUploading ? "Processing…" : "Upload and process"}
        </button>

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
        className={`absolute inset-0 flex flex-col justify-center px-6 transition-all duration-500 ease-out ${
          isDone
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <p className="text-sm text-muted">Your material is ready.</p>
        <p className="mt-2 truncate text-2xl font-semibold text-accent">
          {successFileName}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/lesson?source=${encodeURIComponent(successFileName ?? "")}`}
            className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98]"
          >
            Start learning
          </Link>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center rounded-full border border-white/10 bg-surface/40 px-6 py-3 text-sm font-medium text-text transition-all duration-300 hover:border-white/20 hover:scale-[1.03] active:scale-[0.98]"
          >
            Upload another
          </button>
        </div>
      </div>

    </div>
  );
}
