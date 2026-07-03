import Reveal from "@/components/Reveal";
import DeviceMockup from "@/components/DeviceMockup";
import ShowcaseNav from "@/components/ShowcaseNav";

/**
 * Phi's iOS-first marketing showcase.
 *
 * Port of the finalized HTML prototype: smooth document scroll (no snap),
 * honest WIP framing, TestFlight waitlist CTA, and an iPhone device mockup
 * cycling real app screens. Server Component shell with small client islands
 * (ShowcaseNav, DeviceMockup, Reveal).
 */

const SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-c-500";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-c-100 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.55)]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-c-500 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white";
const CARD =
  "glass-standard shadow-card h-full rounded-[24px] p-8 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.65)]";
const CARD_SUBTLE =
  "glass-subtle shadow-card h-full rounded-[24px] p-8 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.65)]";

const RESEARCH_ROWS = [
  "Answers what you ask — nothing more",
  "Passive audio you listen to",
  "No structure, no progression",
  "You still have to study after",
];

const PHI_ROWS = [
  "Structured lessons from your uploads",
  "Read-aloud teaching while you follow along",
  "Chat that explains, simplifies, or skips ahead",
  "Flashcards and quizzes from your exact content",
];

const FEATURES = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in your PDF, notes, or slides. Phi structures the content into titled, navigable lessons.",
  },
  {
    n: "02",
    title: "Learn",
    body: "Your tutor reads the lesson aloud while you read along. Pause anytime to ask for a simpler explanation.",
  },
  {
    n: "03",
    title: "Practice",
    body: "Flashcards and quizzes generated from your exact material — active recall that locks it in.",
  },
];

export default function Home() {
  return (
    <>
      <ShowcaseNav />

      <main className="relative">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section
          id="top"
          className="relative z-[1] mx-auto grid min-h-screen w-full max-w-[1120px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-[calc(56px+64px)] md:grid-cols-2 md:gap-16 md:pb-24 md:pt-[calc(56px+80px)]"
        >
          <div className="text-center md:text-left">
            <Reveal hero from="up">
              <span
                aria-hidden="true"
                className="block text-[clamp(56px,10vw,80px)] leading-none text-accent [text-shadow:0_0_44px_rgba(212,167,74,0.35)]"
              >
                φ
              </span>
            </Reveal>

            <Reveal hero from="up" delay={120}>
              <h1 className="mt-6 text-[clamp(32px,6vw,52px)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
                Your notes.
                <br />
                Your tutor.
                <br />
                Your mastery.
              </h1>
            </Reveal>

            <Reveal hero from="up" delay={240}>
              <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-[1.65] text-c-400 md:mx-0">
                Phi is a native iOS tutor that turns your uploaded material into
                structured lessons, read-aloud teaching, and active recall —
                built for students who want to actually learn.
              </p>
            </Reveal>

            <Reveal hero from="up" delay={360}>
              <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
                <span className="rounded-full border border-[rgba(212,167,74,0.35)] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
                  iOS — In development
                </span>
                <span className="rounded-full border border-c-800 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-c-400">
                  Space Mono · Dark-first
                </span>
                <span className="rounded-full border border-c-800 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-c-400">
                  By The Spades Company
                </span>
              </div>
            </Reveal>

            <Reveal hero from="up" delay={360}>
              <div className="mt-9 flex flex-wrap justify-center gap-3 md:justify-start">
                <a href="#join" className={BTN_PRIMARY}>
                  Join TestFlight waitlist
                </a>
                <a href="#features" className={BTN_SECONDARY}>
                  See how it works
                </a>
              </div>
            </Reveal>

            <Reveal hero from="up" delay={360}>
              <div
                aria-hidden="true"
                className="mt-12 flex animate-breathe flex-col items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-c-600 md:items-start"
              >
                <span>Scroll</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 3v10M4 9l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Reveal>
          </div>

          <Reveal hero from="up" delay={240}>
            <DeviceMockup />
          </Reveal>
        </section>

        {/* ── Positioning ────────────────────────────────────────────────── */}
        <section id="positioning" className="relative z-[1] py-[120px]">
          <div className="mx-auto w-full max-w-[1120px] px-6">
            <Reveal>
              <p className={SECTION_LABEL}>Why Phi exists</p>
              <h2 className="mt-4 max-w-3xl text-[clamp(24px,4vw,36px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                A research assistant answers questions. A tutor teaches you the
                material.
              </h2>
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <Reveal from="left">
                <div className={CARD_SUBTLE}>
                  <h3 className="text-[14px] font-bold uppercase tracking-[0.12em] text-c-500">
                    Research tools
                  </h3>
                  <ul className="mt-6 flex flex-col gap-4">
                    {RESEARCH_ROWS.map((row) => (
                      <li
                        key={row}
                        className="flex items-start gap-3 text-[13px] leading-[1.55] text-c-500"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 w-[18px] shrink-0 text-center text-[12px]"
                        >
                          ×
                        </span>
                        {row}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal from="right" delay={120}>
                <div className={CARD}>
                  <h3 className="text-[14px] font-bold uppercase tracking-[0.12em] text-accent">
                    Phi on iOS
                  </h3>
                  <ul className="mt-6 flex flex-col gap-4">
                    {PHI_ROWS.map((row) => (
                      <li
                        key={row}
                        className="flex items-start gap-3 text-[13px] leading-[1.55] text-c-300"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-0.5 w-[18px] shrink-0 text-center text-[12px] text-accent"
                        >
                          ✓
                        </span>
                        {row}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section id="features" className="relative z-[1] py-[120px]">
          <div className="mx-auto w-full max-w-[1120px] px-6">
            <div className="max-w-[560px]">
              <Reveal>
                <p className={SECTION_LABEL}>How it works</p>
                <h2 className="mt-4 text-[clamp(24px,4vw,36px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                  Upload. Learn. Practice. On your iPhone.
                </h2>
              </Reveal>
              <Reveal delay={120}>
                <p className="mt-4 text-[14px] leading-[1.65] text-c-400">
                  The iOS app follows the same Spades design language — slow
                  cinematic motion, near-black surfaces, and UI that recedes so
                  the teaching stays primary.
                </p>
              </Reveal>
            </div>

            <div className="mt-16 grid gap-5 md:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <Reveal key={feature.n} from="up" delay={i * 150}>
                  <article className={CARD}>
                    <div className="mb-4 text-[11px] text-c-600">
                      {feature.n}
                    </div>
                    <h3 className="text-[18px] font-bold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-[13px] leading-[1.65] text-c-400">
                      {feature.body}
                    </p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section id="join" className="relative z-[1] py-[120px] pb-20">
          <div className="mx-auto w-full max-w-[1120px] px-6 text-center">
            <Reveal>
              <div className="relative overflow-hidden rounded-[32px] p-16 glass-standard shadow-card md:px-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 50% 0%, rgba(212,167,74,0.12) 0%, transparent 60%)",
                  }}
                />
                <p className={`relative ${SECTION_LABEL}`}>Early access</p>
                <h2 className="relative mt-4 text-[clamp(28px,5vw,40px)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
                  Phi is coming to iOS.
                </h2>
                <p className="relative mx-auto mt-3 max-w-[440px] text-[14px] leading-[1.65] text-c-400">
                  We&apos;re building the native app now — Dashboard, library,
                  and tutoring flow. Join the waitlist to get TestFlight access
                  when the next build ships.
                </p>
                <div className="relative mt-8 flex flex-wrap justify-center gap-3">
                  <a
                    href="mailto:hello@usephi.io?subject=Phi%20TestFlight%20waitlist"
                    className={BTN_PRIMARY}
                  >
                    Request TestFlight access
                  </a>
                  <a
                    href="https://usephi.io"
                    className={BTN_SECONDARY}
                  >
                    usephi.io
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="relative z-[1] border-t border-c-850 px-6 py-12 pb-16">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6 text-center">
            <div className="flex items-center gap-2.5 text-[13px] text-c-400">
              <span aria-hidden="true" className="text-[16px] text-accent">
                φ
              </span>
              Phi by The Spades Company
            </div>
            <div className="flex gap-4 text-[12px] text-c-500">
              <a
                href="https://usephi.io"
                className="transition-colors duration-200 hover:text-c-300"
              >
                usephi.io
              </a>
              <a
                href="https://thespades.co"
                className="transition-colors duration-200 hover:text-c-300"
              >
                thespades.co
              </a>
            </div>
            <p className="text-[11px] text-c-600">
              © 2026 The Spades Company. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
