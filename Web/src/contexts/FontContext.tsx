"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * FontContext — the student's "Reading font" preference (Account → Appearance).
 *
 * Two surfaces need it: the Appearance toggle (reads + writes it) and the (app)
 * content wrapper (applies the matching Tailwind font utility). A context keeps
 * them in sync and makes the switch instant — toggling re-renders the wrapper
 * without a reload. localStorage (`phi_font_preference`) is the durable store so
 * the choice survives reloads and reaches the wrapper on first paint.
 *
 *   "mono"  → Space Mono (the brand default)
 *   "inter" → Inter (a softer reading face)
 */
export type FontPreference = "mono" | "inter";

const FONT_KEY = "phi_font_preference";

type FontContextValue = {
  font: FontPreference;
  setFont: (font: FontPreference) => void;
};

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: ReactNode }) {
  // Default to "mono" so the server-rendered HTML matches the brand default; the
  // effect below corrects it to the stored choice once we're in the browser
  // (localStorage doesn't exist during SSR). Worst case is a one-frame flash from
  // Space Mono to Inter for students who picked Inter — acceptable for a reading
  // preference.
  const [font, setFontState] = useState<FontPreference>("mono");

  useEffect(() => {
    const stored = localStorage.getItem(FONT_KEY);
    const next = stored === "inter" || stored === "mono" ? stored : null;
    if (!next) return;
    // Defer out of the effect body (rather than a synchronous setState) so it
    // isn't a cascading render; the default already painted, this corrects it.
    const id = requestAnimationFrame(() => setFontState(next));
    return () => cancelAnimationFrame(id);
  }, []);

  const setFont = (next: FontPreference) => {
    setFontState(next);
    localStorage.setItem(FONT_KEY, next);
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {/* The content wrapper the task calls for: the chosen font cascades to
          every (app) page inside it. The sidebar/toggle live outside, so the
          brand chrome stays Space Mono. */}
      <div className={font === "inter" ? "font-inter" : "font-mono"}>
        {children}
      </div>
    </FontContext.Provider>
  );
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) {
    throw new Error("useFont must be used within a FontProvider");
  }
  return ctx;
}
