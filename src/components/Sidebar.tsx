"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useSidebar } from "@/contexts/SidebarContext";
import MaterialEditPanel from "./MaterialEditPanel";

/**
 * One material in the sidebar list. The Server Component (the app layout) derives
 * these from the user's uploads and passes them down.
 */
export type SidebarSource = {
  // The exact source_name identity key — used in the URL and as the React key.
  name: string;
  // The list label. There's no display_title column yet, so this is the name.
  title: string;
  // Whether this upload was mapped into sections (sources.sections non-empty).
  // Mapped sources open at their first section.
  hasSections: boolean;
};

/**
 * Sidebar — the ChatGPT/Claude-style app shell drawer.
 *
 * Slides in from the left over a dimmed backdrop. The open/closed state comes
 * from SidebarContext (shared with the corner toggle button). Reads the current
 * `?source=` so the active material stays highlighted as you move around.
 */
export default function Sidebar({ sources }: { sources: SidebarSource[] }) {
  const { isOpen, close } = useSidebar();
  // The active material is whichever one the current URL is pointing at. Reading
  // it here (client-side) is necessary because layouts don't receive searchParams.
  const activeSource = useSearchParams().get("source");
  // The material currently open in the edit panel (null = panel closed). Lifted
  // here so there's a single shared panel rather than one per row.
  const [editing, setEditing] = useState<SidebarSource | null>(null);

  return (
    <>
      {/* Backdrop — fades in behind the panel; a click anywhere closes. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Panel — glass, full height, slides on the Spades expo curve. */}
      <aside
        aria-label="Your materials"
        className={`fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-[320px] flex-col border-r border-white/10 bg-white/[0.055] backdrop-blur-[18px] transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:w-[280px] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top row — the LEFT side is intentionally empty: that's where the
            fixed floating toggle button (top-4 left-4, 44px) sits, so nothing
            renders there. Account is pushed to the right. */}
        <div className="flex h-16 shrink-0 items-center justify-end px-4">
          <Link
            href="/account"
            onClick={close}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors duration-150 hover:border-white/30 hover:text-white"
          >
            <UserCircleIcon className="h-4 w-4" />
            Account
          </Link>
        </div>

        {/* Upload · divider · label · scrollable list */}
        <div className="flex min-h-0 flex-1 flex-col px-3">
          <Link
            href="/upload"
            onClick={close}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-background transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:bg-[#e2bb68] hover:shadow-lg active:scale-95"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Upload Material
          </Link>

          <div className="my-3 border-t border-white/10" />

          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-c-500">
            Your Materials
          </p>

          <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pb-3">
            {sources.length === 0 ? (
              <p className="px-3 py-2 text-xs leading-relaxed text-c-600">
                Nothing here yet. Upload your first material to get started.
              </p>
            ) : (
              sources.map((source) => (
                <MaterialItem
                  key={source.name}
                  source={source}
                  active={activeSource === source.name}
                  onNavigate={close}
                  onEdit={() => setEditing(source)}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer — the brand's new home, moved out of the old top header that
            collided with the floating toggle. */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-4">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center text-xl font-extralight leading-none text-accent"
          >
            φ
          </span>
          <span className="text-[17px] font-bold tracking-tight text-text">Phi</span>
        </div>
      </aside>

      {/* Single shared edit panel (portals to <body>). */}
      <MaterialEditPanel source={editing} onClose={() => setEditing(null)} />
    </>
  );
}

/**
 * A single row in the material list: a link that navigates to the material, plus
 * a "⋮" options button (kept as a SIBLING of the link, not nested, since a link
 * can't legally contain a button). The button opens a tiny Edit/Delete menu.
 */
function MaterialItem({
  source,
  active,
  onNavigate,
  onEdit,
}: {
  source: SidebarSource;
  active: boolean;
  onNavigate: () => void;
  // Opens the shared edit panel. Both Edit and Delete route here for now.
  onEdit: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Mapped sources open at their first section; flat ones at the whole-doc lesson.
  // (A dedicated /roadmap route doesn't exist yet — section 0 is today's landing.)
  const href = source.hasSections
    ? `/lesson?source=${encodeURIComponent(source.name)}&section=0`
    : `/lesson?source=${encodeURIComponent(source.name)}`;

  return (
    <div className="group relative">
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 pr-12 transition-colors duration-150 hover:bg-white/5 ${
          active ? "bg-white/[0.08]" : ""
        }`}
      >
        <span
          aria-hidden="true"
          className="shrink-0 text-sm font-extralight leading-none text-accent"
        >
          φ
        </span>
        <span className="truncate text-sm text-text">{source.title}</span>
      </Link>

      {/* Options button — see the `.material-menu` rule in globals: always shown
          on touch, hover-revealed on pointer devices. Sibling of the link, so
          clicking it doesn't also navigate. */}
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={`Options for ${source.title}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="material-menu absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-c-400 transition-all duration-150 hover:bg-white/10 hover:text-text"
      >
        <EllipsisVerticalIcon className="h-4 w-4" />
      </button>

      {menuOpen && (
        <>
          {/* Invisible click-away catcher. */}
          <div
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div
            role="menu"
            className="absolute right-1.5 top-11 z-50 w-32 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 py-1 shadow-2xl backdrop-blur-md"
          >
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-text transition-colors hover:bg-white/5"
            >
              <PencilSquareIcon className="h-4 w-4 text-c-400" />
              Edit
            </button>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit();
              }}
              className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
