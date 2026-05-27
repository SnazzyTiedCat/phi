"use client";

import { useRef, useState } from "react";

/**
 * /upload — where a student hands Phi their raw material (a PDF or text file).
 *
 * This is a Client Component ("use client" at the top). It HAS to be: drag/drop,
 * file selection, and tracking upload progress are all browser-side interactions
 * that rely on React state and event handlers. (The auth gate in the (app)
 * layout still runs on the server, so this page is only ever reached by a
 * logged-in user — we don't repeat that check here.)
 *
 * The whole page is one small state machine. Rather than a dozen booleans, we
 * keep a single `status` string that can be exactly one of a few values. That
 * makes impossible states impossible (you can't be "uploading" AND "error" at
 * once) and makes the JSX easy to read: each piece of UI keys off `status`.
 */

// The four states this page can be in. Using a string union (not booleans)
// means TypeScript will catch typos and force us to handle each case.
type Status = "idle" | "uploading" | "done" | "error";

// Shape of the successful JSON response from /api/upload. Keeping this in sync
// with the route's return value is a manual contract for now; if these endpoints
// grow, a shared types file is the natural next step.
type UploadResponse = {
  chunks: string[];
  count: number;
};

export default function UploadPage() {
  // The file the user has picked but not yet sent. null = nothing selected.
  const [file, setFile] = useState<File | null>(null);

  // Where we are in the upload lifecycle. Drives every conditional below.
  const [status, setStatus] = useState<Status>("idle");

  // True only while the user is actively dragging a file over the drop zone.
  // Purely cosmetic — it powers the border/background highlight.
  const [isDragging, setIsDragging] = useState(false);

  // How many chunks came back on success. null until we have a result.
  const [chunkCount, setChunkCount] = useState<number | null>(null);

  // The message to show when status === "error".
  const [errorMessage, setErrorMessage] = useState<string>("");

  // A ref to the hidden <input type="file">. We never show the ugly native
  // input; instead we click it programmatically when the user clicks the zone.
  // useRef gives us a stable handle to the DOM node without re-rendering.
  const inputRef = useRef<HTMLInputElement>(null);

  // Accept only these extensions. Defined once so the drop handler, the input's
  // `accept` attribute, and any future validation all agree.
  const ACCEPTED = [".pdf", ".txt"];

  /**
   * Validate + record a freshly chosen file (from either drop or browse).
   * Centralized so both entry points behave identically. Resets us back to a
   * clean "idle" state so a previous success/error message doesn't linger.
   */
  function selectFile(candidate: File) {
    const name = candidate.name.toLowerCase();
    const isAccepted = ACCEPTED.some((ext) => name.endsWith(ext));

    if (!isAccepted) {
      // Reject client-side too (the server also checks) so the user gets
      // instant feedback instead of waiting for a round trip.
      setFile(null);
      setStatus("error");
      setErrorMessage("Only .pdf and .txt files are supported.");
      return;
    }

    setFile(candidate);
    setStatus("idle");
    setChunkCount(null);
    setErrorMessage("");
  }

  // --- Drag-and-drop handlers ---------------------------------------------
  // Each must call preventDefault(): the browser's DEFAULT behavior for a
  // dropped file is to navigate away and open it. preventDefault() cancels that
  // so our handler runs instead.

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
    // dataTransfer.files is a FileList; we only handle the first file for the
    // MVP (one upload at a time keeps the flow simple).
    const dropped = e.dataTransfer.files[0];
    if (dropped) selectFile(dropped);
  }

  // Fired when the user picks a file through the native browse dialog.
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) selectFile(picked);
    // Reset the input's value so picking the SAME file twice still fires
    // onChange (browsers skip the event if the value is unchanged).
    e.target.value = "";
  }

  /**
   * Send the selected file to /api/upload as multipart FormData and react to
   * the response. We build FormData (not JSON) because that's how you transport
   * a binary file over HTTP from the browser — and it's exactly what the route
   * reads with request.formData().
   */
  async function handleUpload() {
    if (!file) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      const body = new FormData();
      body.append("file", file); // field name must match the route's expectation

      const res = await fetch("/api/upload", { method: "POST", body });
      // We try to parse JSON either way — the route returns JSON for both
      // success and error, so this gives us the message on failure too.
      const data: UploadResponse | { error?: string } = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(
          ("error" in data && data.error) || "Upload failed. Please try again.",
        );
        return;
      }

      const success = data as UploadResponse;
      setChunkCount(success.count);
      setStatus("done");
    } catch {
      // This catch only fires for network-level failures (offline, DNS, etc.) —
      // an HTTP 400/500 is a successful fetch with a non-ok status, handled above.
      setStatus("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  }

  const isUploading = status === "uploading";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-text">
        Upload material
      </h1>
      <p className="mt-2 text-sm text-muted">
        Drop a PDF or text file and Phi will break it into lessons.
      </p>

      {/*
        The drop zone. It's a <div> with role="button" + keyboard handlers so it
        behaves like a button for assistive tech and keyboard users (Enter/Space
        open the file picker), while still being a big drop target visually.

        Tailwind notes:
          - We toggle border/background classes off `isDragging` for the
            drag-over highlight. All colors come from the theme tokens defined
            in globals.css (accent, surface, muted) — never hardcoded hex.
          - `transition-colors` makes the highlight fade in/out smoothly.
      */}
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
        {/* The φ mark as a soft visual anchor, echoing the brand. */}
        <span
          aria-hidden="true"
          className="text-4xl font-extralight leading-none tracking-tighter text-accent"
        >
          φ
        </span>

        <p className="mt-4 text-sm text-text">
          {/* Once a file is chosen, show its name. Otherwise, the call to action. */}
          {file ? (
            <>
              Selected: <span className="text-accent">{file.name}</span>
            </>
          ) : (
            <>
              <span className="text-accent">Click to browse</span> or drag a file
              here
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">PDF or TXT</p>

        {/*
          The real file input, visually hidden. We can't style the native input
          nicely, so we hide it and trigger it via the zone's onClick. `sr-only`
          keeps it reachable for screen readers and form semantics without
          showing the default button. The `accept` attribute hints the OS file
          dialog to prefer these types (it's a hint, not enforcement — the
          server still validates).
        */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          onChange={handleInputChange}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {/* Primary action. Disabled until a file is selected, and while an upload
          is in flight (prevents double-submits). Matches the dashboard/auth
          button styling for a consistent "primary action" look. */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="mt-6 inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
      >
        {isUploading ? "Processing…" : "Upload and process"}
      </button>

      {/* Result line. We render exactly one of these based on status, with
          role="status" so screen readers announce the outcome politely. */}
      <div role="status" className="mt-4 text-sm">
        {status === "done" && chunkCount !== null && (
          <p className="text-accent">Done — {chunkCount} chunks extracted</p>
        )}
        {status === "error" && (
          <p className="text-red-400">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
