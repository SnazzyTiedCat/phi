"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { SidebarSource } from "./Sidebar";

const INPUT =
  "w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60";

/**
 * MaterialEditPanel — the "Material Edit Slide".
 *
 * A right-edge slide-in for one material. Both the sidebar's Edit and Delete
 * menu items open this same panel (delete confirmation lives at the bottom).
 * Open/closed is driven by `source`: a SidebarSource means open, null means
 * closed. Portaled to <body> so its fixed positioning anchors to the viewport,
 * not to any transformed ancestor (same reason as the account delete modal).
 *
 * Save → POST /api/material/rename (writes sources.display_title).
 * Delete → POST /api/material/delete (clears the source across all five tables).
 * Both refresh() on success: the sidebar + dashboard are server-rendered, so a
 * router.refresh() re-runs the layout query and the new title / removed row
 * shows up without a full reload.
 */
export default function MaterialEditPanel({
  source,
  onClose,
}: {
  source: SidebarSource | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  // Which action (if any) is in flight, so we can disable buttons + show status.
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState("");
  // Which action the current error belongs to, so it renders next to that
  // action's button rather than orphaned at the bottom of the panel.
  const [errorScope, setErrorScope] = useState<"save" | "delete" | null>(null);

  // Reset the fields each time a different material opens the panel.
  useEffect(() => {
    if (source) {
      setTitle(source.title);
      setDeleteConfirm("");
      setBusy(null);
      setError("");
      setErrorScope(null);
    }
  }, [source]);

  // Close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!source) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [source, onClose]);

  if (!source) return null;

  // Rename: POST the new title, then refresh the server-rendered shell so the
  // sidebar/dashboard pick up display_title. The button is already disabled when
  // the title is empty or unchanged, so we don't re-check that here.
  async function handleSave() {
    if (!source) return;
    setBusy("save");
    setError("");
    setErrorScope(null);
    try {
      const res = await fetch("/api/material/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.name, title: title.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setBusy(null);
        setError(data.error ?? "Could not rename. Please try again.");
        setErrorScope("save");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setBusy(null);
      setError("Network error. Check your connection and try again.");
      setErrorScope("save");
    }
  }

  // Delete: POST the source name, then refresh so the removed material drops out
  // of the list. The button is disabled until the user types DELETE.
  async function handleDelete() {
    if (!source) return;
    setBusy("delete");
    setError("");
    setErrorScope(null);
    try {
      const res = await fetch("/api/material/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: source.name }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setBusy(null);
        setError(data.error ?? "Could not delete. Please try again.");
        setErrorScope("delete");
        return;
      }
      onClose();
      // If the student is currently reading the material they just deleted, the
      // lesson page would now fail to load its (gone) chunks. Send them to the
      // dashboard instead; otherwise just re-run the server-rendered shell.
      const viewing =
        new URLSearchParams(window.location.search).get("source") === source.name;
      if (viewing) router.push("/dashboard");
      else router.refresh();
    } catch {
      setBusy(null);
      setError("Network error. Check your connection and try again.");
      setErrorScope("delete");
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="animate-overlay-in fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${source.title}`}
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <h2 className="text-base font-semibold text-text">Edit material</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-c-400 transition-colors hover:bg-white/10 hover:text-text"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body — rename at top, delete confirmation pinned to the bottom. */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <div>
            <label
              htmlFor="material-title"
              className="block text-sm font-medium text-text"
            >
              Title
            </label>
            <input
              id="material-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`mt-2 ${INPUT}`}
              placeholder="Material title"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={
                busy !== null ||
                !title.trim() ||
                title.trim() === source.title
              }
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#e2bb68] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "save" ? "Saving…" : "Save changes"}
            </button>
            {/* Save error sits directly under its button. role="alert" so a
                screen reader announces a failed rename. */}
            {error && errorScope === "save" && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>

          {/* Danger zone — pushed to the bottom with mt-auto. */}
          <div className="mt-auto rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-400">
              <TrashIcon className="h-4 w-4" />
              Delete material
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This permanently removes this material and its lessons, flashcards,
              and quizzes. This cannot be undone.
            </p>
            <p className="mt-4 text-sm text-muted">
              Type <span className="font-bold text-text">DELETE</span> to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={`mt-2 ${INPUT}`}
              placeholder="DELETE"
              aria-label="Type DELETE to confirm"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null || deleteConfirm !== "DELETE"}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "delete" ? "Deleting…" : "Delete material"}
            </button>
            {/* Delete error stays inside the danger zone, under its button —
                not orphaned at the bottom of the panel (MaterialEditNetworkError). */}
            {error && errorScope === "delete" && (
              <p role="alert" className="mt-4 text-sm text-red-400">
                {error}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
