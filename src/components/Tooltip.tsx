"use client";

import type { ReactNode } from "react";

/**
 * Tooltip — a small label that fades in beside its child on hover.
 *
 * The key idea is that the CALLER declares which side the label opens toward,
 * rather than every control hardcoding the same direction. A control pinned to
 * the LEFT edge of a bar needs its label to open RIGHT (or it clips off-screen);
 * one pinned to the RIGHT needs it to open LEFT. Making `side` explicit per use
 * fixes both the clipping and the awkward off-centre text we had before.
 *
 *   side="right" → label sits to the right of the child (left-full)
 *   side="left"  → label sits to the left of the child  (right-full)
 *
 * Pure CSS: a `group` on the wrapper drives the hover state, the label is
 * absolutely positioned + pointer-events-none so it never intercepts the click,
 * and it scales/fades from the edge nearest the child (origin-left/right).
 */
export function Tooltip({
  children,
  label,
  side,
}: {
  children: ReactNode;
  label: string;
  side: "left" | "right";
}) {
  return (
    <div className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-white/10 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-100 opacity-0 backdrop-blur-md transition-all duration-200 pointer-events-none scale-95 group-hover:scale-100 group-hover:opacity-100 ${
          side === "right"
            ? "left-full ml-2 origin-left"
            : "right-full mr-2 origin-right"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
