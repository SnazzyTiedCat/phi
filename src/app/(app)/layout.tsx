import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider } from "@/contexts/SidebarContext";
import SidebarToggle from "@/components/SidebarToggle";
import Sidebar, { type SidebarSource } from "@/components/Sidebar";
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

  // ── Sidebar material list ───────────────────────────────────────────────────
  // The sidebar shows on every authenticated page, so the shell fetches the
  // user's uploads here (once) and passes them to the client Sidebar. Same shape
  // as the dashboard: each upload is many `chunks` rows sharing a source_name, so
  // we dedupe to one entry per name, newest-first. Older rows may store an
  // URL-encoded name while chunks store the raw filename — normalise both sides
  // so cross-table matching is reliable (decodeURIComponent throws on a lone "%",
  // hence the try/catch fallback).
  const normalise = (s: string) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };

  const { data: chunkRows } = await supabase
    .from("chunks")
    .select("source_name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const seen = new Set<string>();
  const orderedNames: string[] = [];
  for (const row of chunkRows ?? []) {
    const name = normalise(row.source_name);
    if (!seen.has(name)) {
      seen.add(name);
      orderedNames.push(name);
    }
  }

  // Which uploads were mapped into sections — those route to their first section
  // rather than a flat lesson.
  const { data: sourceRows } = await supabase
    .from("sources")
    .select("source_name, sections")
    .eq("user_id", user.id);

  const sectionedNames = new Set<string>();
  for (const row of sourceRows ?? []) {
    const sections = (row.sections ?? []) as unknown[];
    if (sections.length > 0) sectionedNames.add(normalise(row.source_name));
  }

  // No display_title/icon columns exist yet, so the title is the filename and the
  // icon defaults to φ (rendered inside the Sidebar).
  const sidebarSources: SidebarSource[] = orderedNames.map((name) => ({
    name,
    title: name,
    hasSections: sectionedNames.has(name),
  }));

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen flex-col bg-background text-text">
        {/* Atmospheric orbs (Spades DESIGN.md §2.7) — a gold orb drifting
            top-right and a faint white one static bottom-left. Fixed and behind
            the content (z-0); they paint above the layout's solid background, so
            the root layout's marketing orbs stay occluded here (no doubling)
            while these give the authenticated app its own warm depth.
            pointer-events-none and aria-hidden — purely decorative. */}
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

        {/* App shell: a single floating glass toggle in the top-left corner and
            the slide-in Sidebar drawer it controls (both read the shared
            SidebarProvider state). The drawer is wrapped in Suspense because it
            reads the URL's ?source= via useSearchParams to highlight the active
            material. */}
        <SidebarToggle />
        <Suspense fallback={null}>
          <Sidebar sources={sidebarSources} />
        </Suspense>

        {/* Page content. flex-1 lets a page grow to fill the viewport height;
            relative z-10 lifts it above the atmospheric orbs. No top padding —
            content starts at the top of the viewport and the toggle floats over
            it. PageTransition fades each route in, keyed on the pathname so the
            fade replays on every navigation. */}
        <main className="relative z-10 flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </SidebarProvider>
  );
}
