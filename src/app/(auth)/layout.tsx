import Link from "next/link";

/**
 * Layout for the auth route group: /login and /signup.
 *
 * The (auth) folder is a Next.js "route group" — the parentheses mean the
 * folder name does NOT appear in the URL. It exists only to share this layout
 * across the auth pages without affecting routing.
 *
 * This is a Server Component (no "use client"): it renders no interactivity,
 * just the centered shell. The interactive form lives in the page components.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Subtle ambient glow — same gold as the landing page, dialed down so
          it reads as "same product" without competing with the form. Static
          (no breathing animation) to keep the auth screens calm. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="h-[480px] w-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,167,74,0.10) 0%, rgba(212,167,74,0.03) 45%, transparent 70%)",
          }}
        />
      </div>

      {/* The φ mark links home — small, restrained, sits above the card. */}
      <Link
        href="/"
        // Tighter gap below md so on short phones (iPhone SE-height) the φ mark
        // doesn't push the centered card past the fold; full breathing room at md+.
        className="relative mb-6 select-none text-4xl font-extralight leading-none tracking-tighter text-accent transition-opacity hover:opacity-80 md:mb-8"
        aria-label="Phi — back to home"
      >
        φ
      </Link>

      {children}
    </main>
  );
}
