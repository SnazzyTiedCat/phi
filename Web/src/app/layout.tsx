import type { Metadata } from "next";
import { Space_Mono, Inter } from "next/font/google";
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

// Inter is the optional "Reading font" a student can switch to in Account →
// Appearance. Exposed as --font-inter; globals.css turns it into a `font-inter`
// utility that the (app) content wrapper applies when chosen. Loaded here (not
// per-page) so it's ready instantly when toggled.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Phi — AI that actually teaches you",
  description:
    "Native iOS tutor that turns your uploaded material into structured lessons, read-aloud teaching, and active recall. Join the TestFlight waitlist.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${inter.variable} h-full`}>
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
            className="animate-orb-drift absolute -right-[20%] -top-[20%] h-[80vh] w-[80vh] rounded-full opacity-[0.22] blur-[80px]"
            style={{
              background:
                "radial-gradient(circle, rgba(212,167,74,0.35) 0%, transparent 70%)",
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
