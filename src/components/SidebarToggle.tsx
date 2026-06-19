"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSidebar } from "@/contexts/SidebarContext";

/**
 * The single glass square in the top-left corner — the only persistent chrome
 * now that the navbar is gone. It floats above everything (z-50, fixed) so it's
 * always reachable, and it toggles the sidebar.
 *
 *   closed → the φ mark, gold and centred. On hover it cross-fades into the
 *            Bars3 ("menu") icon, the same spin-and-shrink swap the old back
 *            button used.
 *   open   → a plain X (state-driven, no hover needed) to close the panel.
 */
export default function SidebarToggle() {
  const { isOpen, toggle } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isOpen ? "Close menu" : "Open menu"}
      aria-expanded={isOpen}
      // top-4/left-4 normally, but on notched/dynamic-island phones the safe-area
      // insets push it clear of system UI — max() means devices without a notch
      // (inset = 0) are unaffected. Requires viewportFit: "cover" (set in the root
      // layout's viewport export) for the insets to be non-zero.
      className="group fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/80 backdrop-blur-md transition-colors duration-200 hover:border-white/20"
    >
      {isOpen ? (
        <XMarkIcon className="h-5 w-5 text-white" />
      ) : (
        // Two icons stacked in the same box; opacity/scale cross-fades them on
        // hover so the button's footprint never changes.
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute select-none text-xl font-extralight leading-none text-accent transition-all duration-300 group-hover:rotate-180 group-hover:scale-50 group-hover:opacity-0"
          >
            φ
          </span>
          <Bars3Icon
            aria-hidden="true"
            className="absolute h-5 w-5 scale-50 text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
          />
        </span>
      )}
    </button>
  );
}
