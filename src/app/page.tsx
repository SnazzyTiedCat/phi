import Link from "next/link";
import {
  Squares2X2Icon,
  AcademicCapIcon,
  PauseIcon,
  ChatBubbleLeftIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Reveal from "@/components/Reveal";

/**
 * Phi's marketing landing page.
 *
 * Built to the Spades design system (DESIGN.md): Space Mono throughout, the
 * 14-step grayscale, glass surfaces only on floating cards, deep layered
 * shadows, and slow cinematic motion (650/900ms expo entrances). One deliberate
 * departure from the doc's "no accent, ever" rule: Phi keeps its gold (the φ
 * mark and a few key highlights), used with restraint per the brief.
 *
 * A Server Component — almost everything here is static markup. The only client
 * code is <Reveal>, a small IntersectionObserver wrapper that fades each block
 * in as it scrolls into view.
 */

// ── Shared class fragments ──────────────────────────────────────────────────
// Pulled out so the type scale and button system stay consistent across all six
// sections (and any tweak happens in one place).
const SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-c-500";
const H1 =
  "text-[clamp(28px,5vw,36px)] font-bold leading-[1.1] tracking-[-0.03em] text-white";
const BTN_PRIMARY =
  "inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-black transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-c-100 hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgba(0,0,0,0.55)]";
const BTN_SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-c-500 px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-white";

// The three "how it works" steps. Numbered, staggered on reveal.
const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Drop in your PDF, notes, or slides. Any subject, any course.",
  },
  {
    n: "02",
    title: "Learn",
    body: "Phi builds a structured lesson and teaches it — your tutor reads aloud while you follow along.",
  },
  {
    n: "03",
    title: "Practice",
    body: "Flashcards and quizzes generated from your exact material lock it in.",
  },
];

// The comparison rows. Left = research tools (×), right = Phi (✓).
const RESEARCH_ROWS = [
  "Answers what you ask — nothing more",
  "Passive audio you listen to",
  "No structure, no progression",
  "You still have to study after",
  "Built for researchers",
];
const PHI_ROWS = [
  "Builds a structured lesson from your material",
  "Reads it aloud while you read along",
  "Chat that explains, simplifies, or skips ahead",
  "Flashcards and quizzes from your exact content",
  "Built for students",
];

export default function Home() {
  return (
    <main className="relative">
      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — Hero
          Full viewport, centered. The φ mark and each line stagger in on the
          slow 900ms hero tempo.
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <Reveal hero from="up">
          <span
            aria-hidden="true"
            className="block text-[64px] leading-none text-accent"
          >
            φ
          </span>
        </Reveal>

        <Reveal hero from="up" delay={120}>
          <h1 className="mt-8 text-[clamp(36px,7vw,52px)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
            Your notes.
            <br />
            Your tutor.
            <br />
            Your mastery.
          </h1>
        </Reveal>

        <Reveal hero from="up" delay={240}>
          <p className="mx-auto mt-7 max-w-xl text-[18px] leading-[1.6] text-c-400">
            Upload your study material. Phi structures it into lessons, teaches
            it back to you, and doesn&apos;t stop until you&apos;ve got it.
          </p>
        </Reveal>

        <Reveal hero from="up" delay={360}>
          <div className="mt-11 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className={BTN_PRIMARY}>
              Start learning free
            </Link>
            <a href="#how" className={BTN_SECONDARY}>
              See how it works
            </a>
          </div>
        </Reveal>

        {/* Scroll indicator — a slow breathing chevron that jumps to the
            comparison. */}
        <a
          href="#compare"
          aria-label="Scroll to the comparison"
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDownIcon className="animate-breathe h-6 w-6 text-c-500" />
        </a>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — The Comparison
          Two glass cards. Research tools (dimmed, ×) slide in from the left;
          Phi (gold-edged, ✓) from the right.
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="compare"
        className="relative mx-auto max-w-5xl scroll-mt-8 px-6 py-28"
      >
        <Reveal>
          <p className={SECTION_LABEL}>The Difference</p>
          <h2 className={`${H1} mt-4 max-w-2xl`}>
            NotebookLM answers questions. Phi teaches.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {/* Left — research tools, dimmed glass */}
          <Reveal from="left">
            <div className="glass-subtle shadow-card h-full rounded-[24px] p-8 opacity-80">
              <p className={SECTION_LABEL}>Research Tools</p>
              <p className="mt-2 text-[12px] text-c-600">
                NotebookLM, ChatGPT, Perplexity
              </p>
              <ul className="mt-7 space-y-4">
                {RESEARCH_ROWS.map((row) => (
                  <li key={row} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-px select-none text-c-600"
                    >
                      ×
                    </span>
                    <span className="text-[14px] leading-[1.5] text-c-500">
                      {row}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Right — Phi, standard glass, gold left edge, slightly elevated */}
          <Reveal from="right" delay={120}>
            <div
              className="glass-standard shadow-card h-full rounded-[24px] p-8 md:-translate-y-2"
              style={{ borderLeft: "2px solid var(--color-accent)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                Phi
              </p>
              <p className="mt-2 text-[12px] text-c-500">
                Your tutor, built from your material
              </p>
              <ul className="mt-7 space-y-4">
                {PHI_ROWS.map((row) => (
                  <li key={row} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-px select-none text-white"
                    >
                      ✓
                    </span>
                    <span className="text-[14px] leading-[1.5] text-white">
                      {row}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — How It Works
          Three numbered glass cards, each reveal staggered by 150ms.
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="how"
        className="relative mx-auto max-w-5xl scroll-mt-8 px-6 py-28"
      >
        <Reveal>
          <p className={SECTION_LABEL}>How It Works</p>
          <h2 className={`${H1} mt-4`}>Three steps to mastery.</h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} from="up" delay={i * 150}>
              <div className="glass-standard shadow-card h-full rounded-[24px] p-8">
                <span
                  aria-hidden="true"
                  className="block text-[56px] font-bold leading-none tracking-[-0.04em] text-c-700"
                >
                  {step.n}
                </span>
                <h3 className="mt-7 text-[20px] font-bold tracking-[-0.01em] text-white">
                  {step.title}
                </h3>
                <p className="mt-3 text-[14px] leading-[1.6] text-c-400">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — The Lesson Experience
          Three alternating feature rows, each with a mock visual built from the
          real app's UI language.
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-5xl px-6 py-28">
        <Reveal>
          <p className={SECTION_LABEL}>The Experience</p>
          <h2 className={`${H1} mt-4`}>A tutor that knows your material.</h2>
        </Reveal>

        {/* Feature 1 — text left, visual right */}
        <div className="mt-20 grid items-center gap-10 md:grid-cols-2">
          <Reveal from="left">
            <h3 className="text-[clamp(22px,3.5vw,26px)] font-bold leading-[1.2] tracking-[-0.02em] text-white">
              Structured lessons, not document dumps.
            </h3>
            <p className="mt-5 max-w-md text-[15px] leading-[1.65] text-c-300">
              Every upload becomes a titled, navigable lesson with an
              introduction, sections, and key takeaways. Built from your
              material, in a voice that teaches.
            </p>
          </Reveal>

          <Reveal from="right" delay={120}>
            <MockLesson />
          </Reveal>
        </div>

        {/* Feature 2 — reversed: visual left, text right (on desktop) */}
        <div className="mt-24 grid items-center gap-10 md:grid-cols-2">
          <Reveal from="right" delay={120} className="md:order-2">
            <h3 className="text-[clamp(22px,3.5vw,26px)] font-bold leading-[1.2] tracking-[-0.02em] text-white">
              Ask anything. Mid-lesson.
            </h3>
            <p className="mt-5 max-w-md text-[15px] leading-[1.65] text-c-300">
              The chat sidebar is always there. Ask for a simpler explanation.
              Ask what you missed. Ask to skip ahead with a recap. It reads your
              material — it knows the answers.
            </p>
          </Reveal>

          <Reveal from="left" className="md:order-1">
            <MockChat />
          </Reveal>
        </div>

        {/* Feature 3 — text left, visual right */}
        <div className="mt-24 grid items-center gap-10 md:grid-cols-2">
          <Reveal from="left">
            <h3 className="text-[clamp(22px,3.5vw,26px)] font-bold leading-[1.2] tracking-[-0.02em] text-white">
              Read along. Remember more.
            </h3>
            <p className="mt-5 max-w-md text-[15px] leading-[1.65] text-c-300">
              The lesson reads itself aloud while you follow the text. Two senses
              engaged. One subject mastered.
            </p>
          </Reveal>

          <Reveal from="right" delay={120}>
            <MockAudio />
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — Credibility
          A single centered statement. The product's north star, stated plainly.
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-3xl px-6 py-32 text-center">
        <Reveal>
          <p className={SECTION_LABEL}>Built by a student, for students</p>
          <blockquote className="mt-9 text-[clamp(22px,3.6vw,30px)] font-bold leading-[1.4] tracking-[-0.02em] text-c-400">
            &ldquo;A student opens Phi, uploads their notes,
            <br className="hidden md:block" /> and 20 minutes later understands
            the material better
            <br className="hidden md:block" /> than they would have after 2 hours
            of passive reading.&rdquo;
          </blockquote>
          <p className="mt-9 text-[13px] text-c-500">
            That&apos;s the only metric that matters.
          </p>
        </Reveal>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — Final CTA + Footer
          Slightly elevated from the page via a faint radial glow.
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden px-6 pt-32 pb-16">
        {/* Very subtle lift off the page background. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />

        <Reveal className="relative text-center">
          <h2 className="text-[clamp(36px,7vw,52px)] font-bold leading-[1.05] tracking-[-0.04em] text-white">
            Upload your first document.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[18px] leading-[1.6] text-c-400">
            Free. No credit card. Your API key is yours.
          </p>
          <div className="mt-11">
            <Link href="/signup" className={BTN_PRIMARY}>
              Get started
            </Link>
          </div>
        </Reveal>

        {/* Footer */}
        <footer className="relative mx-auto mt-28 max-w-5xl border-t border-c-850 pt-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-[20px] text-accent">
                φ
              </span>
              <span className="text-[13px] text-c-400">
                Phi by The Spades Company
              </span>
            </div>

            <div className="flex items-center gap-3 text-[12px] text-c-500">
              <a
                href="https://usephi.io"
                className="transition-colors duration-[250ms] hover:text-c-300"
              >
                usephi.io
              </a>
              <span aria-hidden="true" className="text-c-700">
                ·
              </span>
              <a
                href="https://thespades.co"
                className="transition-colors duration-[250ms] hover:text-c-300"
              >
                thespades.co
              </a>
            </div>

            <p className="text-[11px] text-c-600">
              © 2026 The Spades Company. All rights reserved.
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}

/* ── Mock visuals ───────────────────────────────────────────────────────────
   Static, non-interactive previews built from the real app's UI language — a
   lesson table of contents, a chat exchange, and the floating audio capsule.
   They're styled exactly like the product so the page shows, not tells. */

function MockLesson() {
  const sections = [
    "What optimization actually means",
    "The cost function",
    "Taking the step downhill",
  ];
  return (
    <div className="glass-standard shadow-card rounded-[24px] p-7">
      <p className={SECTION_LABEL}>Lesson</p>
      <h4 className="mt-4 text-[22px] font-bold leading-tight tracking-[-0.02em] text-white">
        Gradient Descent
      </h4>
      <div className="mt-6 space-y-3.5">
        {sections.map((s, i) => (
          <div key={s} className="flex items-baseline gap-3.5">
            <span className="text-[12px] text-c-600">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-[14px] text-c-300">{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 h-px w-full bg-c-800" />
      <p className="mt-5 text-[13px] leading-[1.6] text-c-400">
        A function has a minimum. Gradient descent is how you walk downhill to
        find it — one careful step at a time.
      </p>
    </div>
  );
}

function MockChat() {
  return (
    <div className="glass-standard shadow-card rounded-[24px] p-7">
      <div className="flex items-center gap-2 border-b border-white/10 pb-3.5">
        <span aria-hidden="true" className="text-[11px] text-accent">
          ✦
        </span>
        <span className={SECTION_LABEL}>Ask</span>
      </div>
      <div className="mt-6 space-y-5">
        <div className="flex justify-end">
          <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-white/10 px-3.5 py-2.5 text-[13px] leading-[1.5] text-white">
            Can you explain the cost function more simply?
          </p>
        </div>
        <p className="text-[13px] leading-[1.65] text-c-300">
          It&apos;s a score for how wrong the model is right now. Lower is
          better — training just nudges the numbers to bring that score down.
        </p>
      </div>
    </div>
  );
}

function MockAudio() {
  return (
    <div className="glass-standard shadow-card flex flex-col items-center gap-7 rounded-[24px] p-10">
      <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-c-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
        Now reading
      </div>
      {/* The floating capsule, lifted straight from the lesson view. */}
      <div className="shadow-card flex items-center gap-7 rounded-2xl border border-white/10 bg-zinc-900/90 px-7 py-4">
        <Squares2X2Icon className="h-5 w-5 text-white/60" />
        <AcademicCapIcon className="h-5 w-5 text-white/60" />
        <PauseIcon className="h-5 w-5 text-accent" />
        <ChatBubbleLeftIcon className="h-5 w-5 text-white/60" />
      </div>
    </div>
  );
}
