"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Gives every authenticated page a soft fade-in entrance.
 *
 * WHY this is a Client Component, and why it keys on the pathname:
 * The (app) layout is a SERVER Component that PERSISTS across navigations — it
 * doesn't re-render when you move from /dashboard to /settings. So a plain
 * <div className="animate-page-in"> in the layout would play its entrance ONCE,
 * on first load, and never again. To replay the fade on every navigation we give
 * the wrapper a `key` that changes with the route. A new key = React treats it
 * as a brand-new element = it remounts = the CSS animation restarts. Reading the
 * route needs the client-only `usePathname()` hook, hence "use client".
 *
 * Note: `usePathname()` ignores the query string, so switching between two
 * lessons (`/lesson?source=A` → `?source=B`) is the same pathname and won't
 * re-fade. That's fine — the lesson view runs its own loading state on a source
 * change; this is purely the cross-page transition.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
