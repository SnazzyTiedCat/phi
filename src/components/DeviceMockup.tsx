"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SCREENS = [
  { id: 0, label: "Arrival" },
  { id: 1, label: "Dashboard" },
  { id: 2, label: "Tutoring" },
] as const;

const MATERIALS = ["Calculus II", "Organic Chem", "Data Structures"];

/**
 * DeviceMockup — iPhone frame cycling Arrival, Dashboard, and Tutoring stub.
 *
 * Auto-advances every 4s; tab dots jump to a screen. Parallax tilts subtly on
 * scroll. Reduced-motion users see screen 0 only with no float/carousel/parallax.
 */
export default function DeviceMockup() {
  const deviceRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [parallax, setParallax] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const reduced = mq.matches;
      setReducedMotion(reduced);
      if (reduced) {
        setCurrent(0);
        setParallax("");
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % SCREENS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const updateParallax = useCallback(() => {
    if (reducedMotion) return;
    const node = deviceRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const progress = Math.min(
      1,
      Math.max(0, 1 - rect.top / window.innerHeight),
    );
    setParallax(
      `rotateY(${progress * -8}deg) rotateX(${progress * 4}deg)`,
    );
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    updateParallax();
    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateParallax);
      window.removeEventListener("resize", updateParallax);
    };
  }, [reducedMotion, updateParallax]);

  const showScreen = (index: number) => setCurrent(index);

  return (
    <div className="flex justify-center [perspective:1200px]">
      <div
        ref={deviceRef}
        className={`aspect-[9/19.5] w-[min(280px,72vw)] rounded-[44px] bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-3 shadow-card md:w-[300px] [transform-style:preserve-3d] ${
          reducedMotion ? "" : "animate-float"
        }`}
        style={{
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          transform: parallax || undefined,
        }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-c-950">
          {/* Dynamic Island / notch */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-2.5 z-10 h-7 w-24 -translate-x-1/2 rounded-full bg-black"
          />

          {/* Screen 0 — Arrival (matches ArrivalView.swift) */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center px-4 pb-6 pt-12 text-center transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              current === 0 ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <span aria-hidden="true" className="mb-4 text-[40px]">
              ♠
            </span>
            <h2 className="text-[22px] font-bold text-white">Phi</h2>
            <p className="mt-2 text-[12px] text-c-400">
              AI that actually teaches you.
            </p>
            <div className="mt-auto w-full rounded-full bg-white px-3 py-3 text-[10px] font-bold tracking-[0.08em] text-black">
              CONTINUE
            </div>
          </div>

          {/* Screen 1 — Dashboard (matches DashboardView.swift) */}
          <div
            className={`absolute inset-0 flex flex-col px-4 pb-6 pt-12 transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              current === 1 ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <h2 className="text-[20px] font-bold text-white">Your Library</h2>
            <p className="mt-1 text-[11px] text-c-400">3 materials</p>
            <div className="mt-5 flex gap-3 overflow-hidden">
              {MATERIALS.map((title) => (
                <div
                  key={title}
                  className="flex h-[150px] w-[120px] shrink-0 items-end rounded-[22px] bg-c-900 p-3 text-[11px] leading-[1.35] text-white"
                >
                  {title}
                </div>
              ))}
            </div>
          </div>

          {/* Screen 2 — Tutoring stub (matches TutoringView.swift — title only) */}
          <div
            className={`absolute inset-0 flex flex-col px-4 pb-6 pt-14 transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              current === 2 ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <p className="mb-6 text-[11px] text-c-500">← Back</p>
            <h2 className="text-[18px] font-bold text-white">
              Gradient Descent
            </h2>
            <p className="mt-2 text-[11px] text-c-500">
              Tutoring session — coming in next build
            </p>
          </div>

          {/* Carousel dots */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-1.5">
            {SCREENS.map(({ id }) => (
              <button
                key={id}
                type="button"
                aria-label={`Show ${SCREENS[id].label} screen`}
                aria-current={current === id ? "true" : undefined}
                onClick={() => showScreen(id)}
                className={`h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  current === id
                    ? "w-5 rounded-full bg-white"
                    : "w-1.5 bg-c-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
