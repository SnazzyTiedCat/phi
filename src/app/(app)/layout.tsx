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
          {/* Left: the φ mark. On hover it cross-fades into a back chevron — the
              logo "melts" into a back button — while still linking to the
              dashboard. The `group` on the wrapper drives both fades; the chevron
              is layered on top of the φ with absolute positioning. Both are
              pure-CSS (group-hover), so no client JS is needed here. */}
          <div className="group relative">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="relative block leading-none"
            >
              <span className="select-none text-2xl font-extralight leading-none tracking-tighter text-accent transition-opacity duration-200 group-hover:opacity-0">
                φ
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center text-2xl text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              >
                ‹
              </span>
            </Link>
          </div>

          {/* Right: settings entry. The ⚙ is a Unicode glyph so we don't pull
              in an icon library for the MVP. aria-hidden on the glyph keeps it
              from being announced twice by screen readers — the visible
              "Settings" word carries the meaning. */}
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-text"
          >
            <span aria-hidden="true">⚙</span>
            Settings
          </Link>
        </nav>
      </header>

      {/* Page content. flex-1 lets a page grow to fill the viewport height. */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
