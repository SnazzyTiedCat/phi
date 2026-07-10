"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in your PDF, notes, or slides. Phi structures the content into titled, navigable lessons.",
  },
  {
    n: "02",
    title: "Learn",
    body: "Your tutor reads the lesson aloud while you read along. Pause anytime to ask for a simpler explanation.",
  },
  {
    n: "03",
    title: "Practice",
    body: "Flashcards and quizzes generated from your exact material — active recall that locks it in.",
  },
] as const;

const AUTO_ADVANCE_MS = 3000;
const EXIT_MS = 280;
const ENTER_MS = 380;

/**
 * FeatureCarousel — single centered card cycling the "How it works" steps.
 *
 * Auto-advances every 3s; chevrons and dots jump manually. Text exits/enters
 * on a vertical slide (always upward, regardless of direction — a ticker
 * feel, not a direction-aware carousel). Hover/focus pauses autoplay so
 * reading isn't interrupted; reduced-motion users get an instant swap with
 * autoplay off entirely (an auto-changing region without animation is still
 * disorienting, so it's manual-only for them).
 */
export default function FeatureCarousel() {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const phaseTimeout = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const goTo = useCallback(
    (resolveNext: (i: number) => number) => {
      if (phaseTimeout.current) window.clearTimeout(phaseTimeout.current);
      if (reducedMotion) {
        setCurrent(resolveNext);
        return;
      }
      setPhase("out");
      phaseTimeout.current = window.setTimeout(() => {
        setCurrent(resolveNext);
        setPhase("in");
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setPhase("idle")),
        );
      }, EXIT_MS);
    },
    [reducedMotion],
  );

  const next = () => goTo((i) => (i + 1) % STEPS.length);
  const prev = () => goTo((i) => (i - 1 + STEPS.length) % STEPS.length);
  const jumpTo = (target: number) => goTo(() => target);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const id = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, paused]);

  useEffect(() => () => {
    if (phaseTimeout.current) window.clearTimeout(phaseTimeout.current);
  }, []);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  const step = STEPS[current];

  return (
    <div
      className="relative mx-auto flex max-w-[1120px] items-center justify-center px-4"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <button
        type="button"
        aria-label="Previous step"
        onClick={prev}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        className="glass-standard absolute left-0 z-10 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-c-400 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:text-white sm:flex md:left-4"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <article
        className="glass-standard shadow-card relative w-full max-w-[560px] overflow-hidden rounded-[32px] px-8 py-14 text-center sm:px-14"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none text-[160px] font-bold leading-none text-white/[0.03]"
        >
          {step.n}
        </span>

        <div
          aria-live="polite"
          aria-atomic="true"
          className="relative"
          style={{
            transitionProperty: "opacity, transform",
            transitionDuration: phase === "out" ? `${EXIT_MS}ms` : `${ENTER_MS}ms`,
            transitionTimingFunction:
              phase === "out"
                ? "cubic-bezier(0.4,0,0.2,1)"
                : "cubic-bezier(0.16,1,0.3,1)",
            opacity: phase === "idle" ? 1 : 0,
            transform:
              phase === "out"
                ? "translateY(-16px)"
                : phase === "in"
                  ? "translateY(16px)"
                  : "translateY(0)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            {step.n} / 03
          </p>
          <h3 className="mt-4 text-[22px] font-bold text-white">{step.title}</h3>
          <p className="mt-3 text-[14px] leading-[1.65] text-c-400">{step.body}</p>
        </div>

        <div className="relative mt-8 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              type="button"
              aria-label={`Show step ${i + 1}: ${s.title}`}
              aria-current={current === i ? "true" : undefined}
              onClick={() => jumpTo(i)}
              className="flex h-8 w-8 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  current === i ? "w-5 bg-accent" : "w-1.5 bg-c-700"
                }`}
              />
            </button>
          ))}
        </div>
      </article>

      <button
        type="button"
        aria-label="Next step"
        onClick={next}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        className="glass-standard absolute right-0 z-10 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full text-c-400 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:text-white sm:flex md:right-4"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
