# Phi (φ)

**Upload your notes. Phi teaches you.**

Phi is an AI-powered learning platform that turns a student's own material into a structured, multimodal lesson — not a research assistant that answers queries, but a tutor that teaches. Upload a PDF or notes, and Phi structures it into a lesson, reads it aloud, answers questions in a chat sidebar, and tests you with flashcards and a quiz.

> **North star:** A student opens Phi, uploads their notes, and 20 minutes later understands the material better than they would have after 2 hours of passive reading.

---

## Why Phi

NotebookLM is wide — it answers questions about anything. Phi is deep — it does one thing exceptionally: turn a student into a genuine learner of their own material.

| | NotebookLM | Phi |
|---|---|---|
| Core job | Research assistant | AI tutor |
| Audio | Passive podcast | Interactive read-along |
| Structure | Query anything | Structured lessons |
| Progression | None | Lesson → recall → quiz |
| Target user | Researchers / adults | Students |

---

## Features

- **Auth** — sign up / log in via Supabase (SSR).
- **Upload** — drop a PDF or `.txt`; content is parsed and chunked server-side.
- **Lessons** — Claude structures raw material into a titled, taught lesson, cached per source so revisits load instantly.
- **Read-along** — the lesson is read aloud via the browser's Web Speech API (keyless, zero-dependency) with play / pause / stop.
- **Chat sidebar** — pause mid-lesson to ask for a simpler explanation or a recap, answered over your material via RAG, streamed in real time.
- **Flashcards** — generated on demand from the lesson, with flip-card review.
- **Quiz** — a short multiple-choice quiz generated from the same source to test recall.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Auth · DB · Storage · Vectors | Supabase (SSR, pgvector) |
| AI tutor engine | Anthropic Claude API (`claude-opus-4-7`, `claude-sonnet-4-6`) |
| Read-aloud | Browser Web Speech API |
| PDF parsing | `unpdf` |
| Deployment | Vercel |

**API keys** (Anthropic) are stored in the browser's `localStorage` and sent per request — a deliberate MVP choice that keeps keys off the server. They migrate to secure server-side storage in V2.

---

## Getting Started

**Prerequisites:** Node 18+, a Supabase project, and an Anthropic API key.

```bash
git clone <repo-url>
cd phi
npm install
```

Create `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, then add your Anthropic API key on the **Settings** page. Upload a PDF or text file to generate your first lesson.

> **Note:** The Supabase schema must include the `chunks`, `lessons`, `flashcards`, and `quizzes` tables. Generation falls back gracefully, but caching silently no-ops if a table is missing.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint with ESLint |

---

## Status

MVP — feature-complete for the core loop (upload → lesson → read-along → chat → flashcards → quiz). Embeddings are currently zero-vector placeholders; full pgvector similarity search is the remaining RAG work.

For scope, architecture, and the V2 roadmap, see [`CLAUDE.md`](./CLAUDE.md).
