"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal — the scroll-triggered entrance used across the landing page.
 *
 * Every element starts invisible (faded + offset) and animates into place the
 * first time it enters the viewport, observed via IntersectionObserver. No
 * animation library — just a state flip toggling Tailwind transform/opacity
 * classes, with the exact Spades timing applied inline (so the cubic-beziers
 * and per-element stagger delays stay precise).
 *
 *   from   — which direction it slides in from (up | left | right)
 *   delay  — stagger, in ms, applied to the reveal (for sequenced cards)
 *   hero   — use the 900ms hero tempo instead of the 650ms section tempo
 *
 * The observer is one-shot: once revealed, it disconnects, so scrolling back up
 * and down doesn't replay (or worse, reverse) the entrance. Reduced-motion
 * users skip the animation entirely and see content immediately.
 */

type Direction = "up" | "left" | "right";

// The hidden (pre-reveal) transform for each entrance direction. Always pairs
// opacity with a transform — never animates one alone (DESIGN.md §3.6).
//
// On mobile, horizontal slide-ins (`left`/`right`) read as broken: their cards
// stack to a single full-width column, so a sideways entrance either gets
// clipped by the viewport edge or just looks arbitrary. Below md we collapse
// both into the same gentle vertical rise as `up`; the horizontal direction
// only kicks in at md+ where the two-column layout actually has left/right
// sides for the motion to mean something.
const HIDDEN: Record<Direction, string> = {
  up: "translate-y-5 opacity-0",
  left: "translate-y-5 opacity-0 md:translate-y-0 md:-translate-x-8",
  right: "translate-y-5 opacity-0 md:translate-y-0 md:translate-x-8",
};

export default function Reveal({
  children,
  from = "up",
  delay = 0,
  hero = false,
  className = "",
}: {
  children: ReactNode;
  from?: Direction;
  delay?: number;
  hero?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Reduced motion → reveal on the next frame, skipping the whole observer
    // dance. Deferred via rAF (rather than a synchronous setState in the effect
    // body) so it isn't a cascading-render update; the global reduced-motion CSS
    // already zeroes the transition, so it simply appears.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect(); // one-shot: never replay
        }
      },
      // Fire a touch before the element's edge fully clears, so it's already
      // settling as it scrolls into view (DESIGN.md §3.5).
      { threshold: 0.06, rootMargin: "0px 0px -32px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] ${
        visible ? "translate-x-0 translate-y-0 opacity-100" : HIDDEN[from]
      } ${className}`}
      style={{
        transitionDuration: hero ? "900ms" : "650ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: visible ? `${delay}ms` : "0ms",
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
