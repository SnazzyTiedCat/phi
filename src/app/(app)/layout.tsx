import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackButton from "./BackButton";
import PageTransition from "./PageTransition";

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
    <div className="relative flex min-h-screen flex-col bg-background text-text">
      {/* Atmospheric orbs (Spades DESIGN.md §2.7) — a gold orb drifting top-right
          and a faint white one static bottom-left. Fixed and behind the content
          (z-0); they paint above the layout's solid background, so the root
          layout's marketing orbs stay occluded here (no doubling) while these
          give the authenticated app its own warm depth. pointer-events-none and
          aria-hidden — purely decorative. The header and <main> sit at z-10. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="animate-orb-drift absolute -right-[10%] -top-[20%] h-[60vw] w-[60vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,168,76,0.04) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute -bottom-[20%] -left-[10%] h-[50vw] w-[50vw] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,255,255,0.007) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* Top navigation — minimal, restrained, matches the Arc/Dia energy from
          the rest of the app. Sticky so it stays put as content scrolls. The
          subtle bottom border + backdrop-blur keeps it visually separate from
          the page without a heavy bar. */}
      <header className="sticky top-0 z-10 border-b border-white/[0.06] bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          {/* Left: the φ mark that melts into a back button on hover. Extracted
              into a Client Component because it now navigates with router.back()
              (real browser-history back), which the server can't do. */}
          <BackButton />

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
            className="group relative flex items-center leading-none text-2xl text-muted transition-colors hover:text-text"
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

      {/* Page content. flex-1 lets a page grow to fill the viewport height;
          relative z-10 lifts it above the atmospheric orbs. PageTransition fades
          each route in — and, because it's keyed on the pathname, replays that
          fade on every navigation (a persistent server layout otherwise animates
          only once). */}
      <main className="relative z-10 flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
