"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ShowcaseNav — fixed glass pill nav for the iOS marketing showcase.
 *
 * Hides when the user scrolls down past 120px; reappears on scroll up.
 * Reduced-motion users always see the nav (no hide/show transform).
 */
export default function ShowcaseNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const reducedMotion = useRef(false);

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
        <a
          href="#positioning"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-c-500 transition-colors duration-200 hover:text-white"
        >
          Why Phi
        </a>
        <a
          href="#features"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-c-500 transition-colors duration-200 hover:text-white"
        >
          How it works
        </a>
        <a
          href="#join"
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-c-500 transition-colors duration-200 hover:text-white"
        >
          TestFlight
        </a>
      </div>

      <a
        href="#join"
        className="rounded-full bg-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
      >
        Get early access
      </a>
    </nav>
  );
}
