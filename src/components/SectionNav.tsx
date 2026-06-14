"use client";

import { useEffect, useState } from "react";

/**
 * SectionNav — the marketing page's pagination rail.
 *
 * A fixed column of dots on the right edge: one per landing section. The active
 * dot grows and turns gold; hovering any dot reveals its label and clicking it
 * smooth-scrolls to that section. This is what turns "a long page that happens
 * to snap" into something that reads as discrete, navigable pages.
 *
 * WHY a Client Component: it reads scroll position (IntersectionObserver) and
 * handles clicks — both browser-only. The page itself stays a Server Component;
 * this is a small client island dropped into it, exactly like <Reveal>.
 *
 * The IDs here are a contract with page.tsx — each must match a <section id>.
 */
const SECTIONS = [
  { id: "hero", label: "Top" },
  { id: "compare", label: "The Difference" },
  { id: "how", label: "How It Works" },
  { id: "experience", label: "The Experience" },
  { id: "proof", label: "Why Phi" },
  { id: "start", label: "Get Started" },
];

export default function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    // The rootMargin collapses the viewport to a thin band at its vertical
    // centre (top/bottom each shrunk 45%). A section counts as "active" the
    // moment it crosses that centre line — which works no matter how tall the
    // section is (the Experience section is taller than the viewport, so a
    // simple "is it 50% visible?" test would never fire for it).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );

    for (const { id } of SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Page sections"
      // Fixed to the right edge, vertically centred. Hidden below lg so it never
      // crowds narrow screens (where snap-scrolling alone carries the paging).
      className="fixed right-7 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-5 lg:flex"
    >
      {SECTIONS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() =>
              document
                .getElementById(id)
                ?.scrollIntoView({ behavior: "smooth" })
            }
            aria-label={`Go to ${label}`}
            aria-current={isActive ? "true" : undefined}
            className="group flex items-center gap-3"
          >
            {/* Label — slides in from the right and fades up only on hover, so
                the rail stays minimal until the user reaches for it. */}
            <span
              className={`translate-x-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-0 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0 group-hover:opacity-100 ${
                isActive ? "text-accent" : "text-c-500"
              }`}
            >
              {label}
            </span>
            {/* Dot — grows and turns gold for the active section. */}
            <span
              className={`block rounded-full transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isActive
                  ? "h-2.5 w-2.5 bg-accent"
                  : "h-2 w-2 bg-c-700 group-hover:bg-c-500"
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}
