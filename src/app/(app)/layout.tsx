import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout for the authenticated app: /dashboard, /settings, and anything else
 * that lives inside the (app) route group.
 *
 * Like (auth), the parentheses make this a Next.js "route group" — the folder
 * name is NOT part of the URL. It exists so every signed-in page shares this
 * shell (the auth gate + the top nav) without nesting under an /app path.
 *
 * This is a Server Component (no "use client"). That matters for two reasons:
 *   1. We read the auth session on the SERVER before any HTML reaches the
 *      browser, so a logged-out user is redirected before they ever see the
 *      protected UI. A client-side check would briefly flash the page first.
 *   2. The Supabase server client reads the session from cookies, which only
 *      works on the server.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `createClient()` is async in Next 16 because it awaits cookies() internally.
  const supabase = await createClient();

  // getUser() validates the session against Supabase's auth server (not just a
  // local cookie read), so it's the trustworthy check for "is this person
  // really logged in?". If there's no user, kick them to /login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      {/* Top navigation — minimal, restrained, matches the Arc/Dia energy from
          the rest of the app. Sticky so it stays put as content scrolls. The
          subtle bottom border + backdrop-blur keeps it visually separate from
          the page without a heavy bar. */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          {/* Left: the φ mark. On hover it spins and shrinks away while a back
              chevron scales in over it — the logo "melts" into a back button —
              and a "Dashboard" tooltip slides in from the left, all while still
              linking to the dashboard. The `group` lives on the Link itself, so
              every transition keys off hovering the link; the chevron and the
              tooltip are layered on with absolute positioning. Pure-CSS
              (group-hover), so no client JS is needed here. */}
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="group relative block leading-none"
          >
            <span className="block select-none text-2xl font-extralight leading-none tracking-tighter text-accent transition-all duration-300 group-hover:rotate-180 group-hover:scale-50 group-hover:opacity-0">
              φ
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 flex scale-50 items-center justify-center text-xl font-light text-white opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100"
            >
              ‹
            </span>
            {/* "Dashboard" tooltip — same left-of-icon pattern as the gear, but
                with a slide: it starts nudged 8px further left (-translate-x-2)
                and fades + slides into place on hover. `transition-all` (not just
                opacity) animates the slide; `-translate-y-1/2` keeps it vertically
                centred the whole time. */}
            <span
              role="tooltip"
              className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-x-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-surface px-2 py-1 text-xs text-text opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            >
              Dashboard
            </span>
          </Link>

          {/* Right: settings entry, now just the ⚙ gear. With the visible
              "Settings" label gone, the Link carries an aria-label so screen
              readers still announce it (the glyph stays aria-hidden). On hover a
              small tooltip fades in to the LEFT of the icon: `group` on the Link
              drives the fade, `relative` anchors the absolutely-positioned
              tooltip (`right-full mr-2` sits it just left of the gear, `top-1/2
              -translate-y-1/2` centres it vertically), and `pointer-events-none`
              stops the tooltip from eating the click. */}
          <Link
            href="/settings"
            aria-label="Settings"
            className="group relative flex items-center text-base text-muted transition-colors hover:text-text"
          >
            <span aria-hidden="true">⚙</span>
            <span
              role="tooltip"
              className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-surface px-2 py-1 text-xs text-text opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            >
              Settings
            </span>
          </Link>
        </nav>
      </header>

      {/* Page content. flex-1 lets a page grow to fill the viewport height. */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
