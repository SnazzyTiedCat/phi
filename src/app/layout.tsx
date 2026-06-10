import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import "./globals.css";

// Space Mono is the brand's single typeface (Spades DESIGN.md §2.2). It isn't a
// variable font, so its two weights — 400 (Regular) and 700 (Bold) — are
// requested explicitly. Exposed as a CSS variable that globals.css points both
// --font-sans and --font-mono at, so the whole product renders in one face.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phi — Your notes. Your tutor. Your mastery.",
  description:
    "Upload your study material. Phi structures it into lessons, teaches it back to you, and doesn't stop until you've got it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} h-full`}>
      <body className="h-full antialiased">
        {/* Atmospheric orbs (DESIGN.md §2.7) — two barely-visible radial
            gradients that give the near-black void a sense of depth. Fixed and
            behind everything (`-z-10`, above the page background but under all
            content), pointer-events-none so they never intercept input, and
            aria-hidden because they're purely decorative. Lives at the layout
            level so individual pages never re-implement it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          {/* Primary — top-right, drifting on a 28s loop. */}
          <div
            className="animate-orb-drift absolute -right-[20%] -top-[20%] h-[80vh] w-[80vh] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.011) 0%, transparent 65%)",
            }}
          />
          {/* Secondary — bottom-left, static and even fainter. */}
          <div
            className="absolute -bottom-[20%] -left-[20%] h-[70vh] w-[70vh] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.007) 0%, transparent 65%)",
            }}
          />
        </div>

        {children}
      </body>
    </html>
  );
}
