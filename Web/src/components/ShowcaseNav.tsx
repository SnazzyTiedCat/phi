"use client";

import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "#positioning", label: "Why Phi" },
  { href: "#features", label: "How it works" },
  { href: "#join", label: "TestFlight" },
] as const;

/**
 * ShowcaseNav — fixed glass pill nav for the iOS marketing showcase.
 *
 * Hides when the user scrolls down past 120px; reappears on scroll up.
 * Reduced-motion users always see the nav (no hide/show transform). Below
 * `md`, the in-page links collapse into a hamburger — a full-screen glass
 * overlay, matching the thespades.co mobile menu (44px toggle, centered
 * stacked links) rather than a dropdown.
 */
export default function ShowcaseNav() {
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
      if (e.matches) setHidden(false);
    };
    mq.addEventListener("change", onMotionChange);

    const onScroll = () => {
      if (reducedMotion.current) return;
      const y = window.scrollY;
      if (y > lastY.current && y > 120) setHidden(true);
      else setHidden(false);
      lastY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      mq.removeEventListener("change", onMotionChange);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      <nav
        aria-label="Showcase navigation"
        className={`glass-standard shadow-card fixed left-1/2 top-4 z-50 flex h-14 w-[min(calc(100%-32px),680px)] -translate-x-1/2 items-center gap-6 rounded-full pl-5 pr-2 transition-[transform,opacity] duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:translate-x-[-50%] motion-reduce:opacity-100 ${
          hidden
            ? "-translate-x-1/2 -translate-y-[120%] opacity-0"
            : "-translate-x-1/2 translate-y-0 opacity-100"
        }`}
      >
        <a
          href="#top"
          className="flex items-center gap-2.5 text-[13px] font-bold text-white"
        >
          <span
            aria-hidden="true"
            className="text-[18px] text-accent [text-shadow:0_0_32px_rgba(212,167,74,0.35)]"
          >
            φ
          </span>
          Phi
        </a>

        <div className="ml-auto mr-2 hidden items-center gap-5 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[11px] font-bold uppercase tracking-[0.12em] text-c-500 transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#join"
          className="hidden rounded-full bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] md:ml-0 md:inline-flex"
        >
          Get early access
        </a>

        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors duration-200 hover:text-accent md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      <div
        className={`glass-standard fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ backdropFilter: "blur(24px)" }}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="glass-standard absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-[24px] text-white transition-colors duration-200 hover:text-accent"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="text-[22px] font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:text-accent"
          >
            {link.label}
          </a>
        ))}

        <a
          href="#join"
          onClick={() => setMenuOpen(false)}
          className="mt-4 rounded-full bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-black"
        >
          Get early access
        </a>
      </div>
    </>
  );
}
