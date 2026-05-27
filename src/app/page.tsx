import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#080808] px-6 text-center">

      {/* Ambient glow — breathes behind the φ */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="animate-glow-breathe h-[640px] w-[640px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(212,167,74,0.18) 0%, rgba(212,167,74,0.06) 45%, transparent 70%)",
          }}
        />
      </div>

      {/* φ — the mark, floating */}
      <div className="animate-float relative select-none" style={{ animationDelay: "0s" }}>
        <span
          className="text-[108px] font-extralight leading-none tracking-tighter"
          style={{ color: "#d4a74a" }}
        >
          φ
        </span>
      </div>

      {/* Wordmark */}
      <h1
        className="animate-fade-in-up mt-2 text-5xl font-semibold tracking-tight text-[#f0f0f0]"
        style={{ animationDelay: "0.15s" }}
      >
        Phi
      </h1>

      {/* Tagline */}
      <p
        className="animate-fade-in-up mt-5 text-base tracking-wide text-[#666]"
        style={{ animationDelay: "0.3s" }}
      >
        Upload your notes.{" "}
        <span
          style={{
            background: "linear-gradient(90deg, #d4a74a, #f0d080, #d4a74a)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "shimmer-text 4s linear infinite",
          }}
        >
          Phi teaches you.
        </span>
      </p>

      {/* Descriptor */}
      <p
        className="animate-fade-in-up mt-5 max-w-xs text-sm leading-relaxed text-[#3d3d3d]"
        style={{ animationDelay: "0.45s" }}
      >
        Structured lessons. A subject-specific AI tutor. Read-along audio.
        Active recall. All from your own material.
      </p>

      {/* CTA */}
      <div
        className="animate-fade-in-up mt-10"
        style={{ animationDelay: "0.6s" }}
      >
        <Link
          href="/signup"
          className="inline-flex items-center rounded-full bg-[#d4a74a] px-8 py-3 text-sm font-medium text-[#080808] transition-all duration-300 hover:bg-[#e2bb68] hover:scale-[1.04] active:scale-[0.97]"
        >
          Get early access
        </Link>
      </div>

      {/* Bottom mark */}
      <div
        className="animate-fade-in-up absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-3"
        style={{ animationDelay: "0.8s" }}
      >
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#222]" />
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#2a2a2a]">
          usephi.io
        </span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#222]" />
      </div>

    </main>
  );
}
