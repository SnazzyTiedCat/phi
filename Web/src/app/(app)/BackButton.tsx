"use client";

import { useRouter } from "next/navigation";

/**
 * The left-of-navbar control: the φ mark that melts into a back chevron on hover.
 *
 * It behaves like an iOS back button — clicking it pops the browser history with
 * router.back(), returning to the PREVIOUS page rather than a fixed destination.
 * That fixes the confusing flow where a student is sent from a lesson to Settings
 * to add their API key, then hits this expecting to land back on the lesson — not
 * be thrown to the dashboard.
 *
 * It's a Client Component because router.back() reads the browser's history,
 * which only exists on the client. The hover animation is still pure CSS
 * (group-hover); the only added JS is the click handler.
 */
export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Go back"
      className="group relative block cursor-pointer leading-none"
    >
      {/* φ spins and shrinks away on hover. */}
      <span className="block select-none text-2xl font-extralight leading-none tracking-tighter text-accent transition-all duration-300 group-hover:rotate-180 group-hover:scale-50 group-hover:opacity-0">
        φ
      </span>
      {/* Back chevron scales in over the φ. Same size (text-2xl) as the φ so the
          swap doesn't change the button's footprint. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 flex scale-50 items-center justify-center text-2xl font-light text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
      >
        ‹
      </span>
      {/* The hover label now comes from the <Tooltip> wrapper in the layout
          (side="right"), so the old hardcoded left-side tooltip is gone — it was
          the one that clipped off the pill's left edge. */}
    </button>
  );
}
