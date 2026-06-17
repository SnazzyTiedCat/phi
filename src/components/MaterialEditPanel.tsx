"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AcademicCapIcon,
  BeakerIcon,
  BookOpenIcon,
  CalculatorIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { SidebarSource } from "./Sidebar";

const INPUT =
  "w-full rounded-lg border border-white/[0.08] bg-background px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-muted/60 focus:border-accent/60";

/**
 * The icon choices for the grid picker. The stored value is the string `key`
 * (written to source_meta.icon); the component is only for rendering. Keeping a
 * short stable key — not the component name — means the column stays readable and
 * survives a future icon-library swap.
 */
const ICON_OPTIONS = [
  { key: "book", label: "Book", Icon: BookOpenIcon },
  { key: "beaker", label: "Science", Icon: BeakerIcon },
  { key: "calculator", label: "Math", Icon: CalculatorIcon },
  { key: "globe", label: "Geography", Icon: GlobeAltIcon },
  { key: "code", label: "Code", Icon: CodeBracketIcon },
  { key: "cap", label: "Academic", Icon: AcademicCapIcon },
] as const;

/**
 * MaterialEditPanel — the "Material Edit Slide".
 *
 * A right-edge slide-in for one material. Both the sidebar's Edit and Delete
 * menu items open this same panel (delete confirmation lives at the bottom).
 * Open/closed is driven by `source`: a SidebarSource means open, null means
 * closed. Portaled to <body> so its fixed positioning anchors to the viewport,
 * not to any transformed ancestor (same reason as the account delete modal).
 *
 * Fields:
 *   - Title   → sources.display_title (via /api/material/rename, the value the
 *               server-rendered sidebar reads) and mirrored into source_meta.
 *   - Icon    → source_meta.icon (the grid picker's key).
 *   - Subject → source_meta.subject.
 *   - Added   → read-only, the earliest chunks.created_at for this source.
 *
 * The icon/subject metadata is written straight from the browser Supabase client
 * (RLS on source_meta restricts every row to its owner, so this is safe and
 * needs no extra API route). The title still flows through the rename API so the
 * sidebar label updates and the 200-char cap is enforced server-side.
 *
 * Delete → POST /api/material/delete (clears the source across all six tables).
 * Both save + delete refresh() on success: the sidebar + dashboard are
 * server-rendered, so a router.refresh() re-runs the layout query and the new
 * title / removed row shows up without a full reload.
 */
export default function MaterialEditPanel({
  source,
  onClose,
}: {
  source: SidebarSource | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  // Editable fields.
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<string>("");
  const [subject, setSubject] = useState("");
  // The loaded baseline, so we can tell whether anything actually changed.
  const [initial, setInitial] = useState({ title: "", icon: "", subject: "" });
  // Read-only metadata: the formatted "Added" date and the owner's user id.
  const [addedDate, setAddedDate] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  // Which action (if any) is in flight, so we can disable buttons + show status.
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState("");

  // Load this material's metadata + added date whenever a different one opens.
  // The title comes from the sidebar (already the display label); icon/subject
  // and the earliest chunk date come from Supabase under the signed-in user.
  useEffect(() => {
    if (!source) return;
    let active = true;

    // Reset the fields to a clean baseline. Deferred out of the effect body (via
    // rAF, like the account page) so these aren't cascading synchronous setStates;
    // the async load below then fills in the saved icon/subject/date.
    const resetId = requestAnimationFrame(() => {
      setTitle(source.title);
      setIcon("");
      setSubject("");
      setAddedDate(null);
      setDeleteConfirm("");
      setBusy(null);
      setError("");
    });

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active || !user) return;
      setUserId(user.id);

      const [{ data: meta }, { data: firstChunk }] = await Promise.all([
        supabase
          .from("source_meta")
          .select("icon, subject")
          .eq("user_id", user.id)
          .eq("source_name", source.name)
          .maybeSingle(),
        supabase
          .from("chunks")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("source_name", source.name)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;

      // 'phi' is the column default (no real icon chosen yet) — treat it as unset.
      const loadedIcon = meta?.icon && meta.icon !== "phi" ? meta.icon : "";
      const loadedSubject = meta?.subject ?? "";
      setIcon(loadedIcon);
      setSubject(loadedSubject);
      setInitial({ title: source.title, icon: loadedIcon, subject: loadedSubject });

      if (firstChunk?.created_at) {
        setAddedDate(
          new Date(firstChunk.created_at as string).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        );
      }
    })();

    return () => {
      active = false;
      cancelAnimationFrame(resetId);
    };
  }, [source, supabase]);

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

  // Save: persist icon/subject to source_meta, and the title via the rename API
  // (so the sidebar label updates). We only POST the rename when the title
  // actually changed — re-running it is harmless but pointless. Then refresh the
  // server-rendered shell so the new title shows up.
  const handleSave = useCallback(async () => {
    if (!source || !userId) return;
    const trimmedTitle = title.trim();
    setBusy("save");
    setError("");
    try {
      // Icon/subject metadata → source_meta (direct, RLS-protected client write).
      const { error: metaError } = await supabase.from("source_meta").upsert(
        {
          user_id: userId,
          source_name: source.name,
          display_title: trimmedTitle || null,
          icon: icon || "phi",
          subject: subject.trim() || null,
        },
        { onConflict: "user_id,source_name" },
      );
      if (metaError) throw new Error("Could not save. Please try again.");

      // Title → the rename API, but only when it actually changed (re-running it
      // is harmless but pointless). The API enforces the 200-char cap and updates
      // sources.display_title, which the server-rendered sidebar reads.
      if (trimmedTitle && trimmedTitle !== initial.title) {
        const res = await fetch("/api/material/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: source.name, title: trimmedTitle }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Could not save. Please try again.");
        }
      }

      onClose();
      router.refresh();
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Could not save. Please try again.");
    }
  }, [source, userId, title, icon, subject, initial.title, supabase, onClose, router]);

  // Delete: POST the source name, then refresh so the removed material drops out
  // of the list. The button is disabled until the user types the filename.
  async function handleDelete() {
    if (!source) return;
    setBusy("delete");
    setError("");
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
    }
  }

  if (!source) return null;

  const dirty =
    title.trim() !== initial.title ||
    icon !== initial.icon ||
    subject.trim() !== initial.subject;

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
        className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col border-l border-white/[0.16] bg-white/[0.09] shadow-2xl backdrop-blur-[18px]"
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

        {/* Body — fields at top, delete confirmation pinned to the bottom. */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          {/* Title */}
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
          </div>

          {/* Icon picker */}
          <div>
            <p className="block text-sm font-medium text-text">Icon</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {ICON_OPTIONS.map(({ key, label, Icon }) => {
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIcon(selected ? "" : key)}
                    aria-pressed={selected}
                    aria-label={label}
                    title={label}
                    className={`flex aspect-square items-center justify-center rounded-xl border transition-colors duration-150 ${
                      selected
                        ? "border-accent/60 bg-accent/10 text-accent"
                        : "border-white/10 text-c-400 hover:border-white/25 hover:text-text"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="material-subject"
              className="block text-sm font-medium text-text"
            >
              Subject
            </label>
            <input
              id="material-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
              className={`mt-2 ${INPUT}`}
              placeholder="e.g. Organic Chemistry"
            />
          </div>

          {/* Read-only added date */}
          <p className="text-xs text-muted">
            Added {addedDate ?? "—"}
          </p>

          <button
            type="button"
            onClick={handleSave}
            disabled={busy !== null || !dirty || !title.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#e2bb68] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "save" ? "Saving…" : "Save changes"}
          </button>

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
              Type{" "}
              <span className="break-all font-bold text-text">{source.name}</span>{" "}
              to confirm.
            </p>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={`mt-2 ${INPUT}`}
              placeholder={source.name}
              aria-label="Type the filename to confirm"
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null || deleteConfirm !== source.name}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "delete" ? "Deleting…" : "Delete material"}
            </button>
          </div>

          {/* Shared error line for both actions. role="alert" so a screen reader
              announces a failed save/delete. Only rendered when there's a message. */}
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
