# Phi — CLAUDE.md

> The north star document. Read this before every session. Every decision gets checked against this.

-----

## What Phi Is

Phi is an AI-powered academic learning platform for students. Not a research assistant. Not a note-taking tool. A **tutor** — one that takes a student’s own uploaded material and turns it into a structured, multimodal learning experience designed to produce genuine mastery.

**Core philosophy:** AI augments human intelligence. It does not replace thinking. Phi makes students better learners, not dependent ones.

**The one-line pitch:** AI that actually teaches you.

-----

## Who It’s For

Students — high school through college. Primary user is a student who wants to actually learn their material, not just skim it. The product should feel like having a brilliant, subject-specific tutor available 24/7 for free.

-----

## What Makes Phi Different

NotebookLM is the primary competitor. It is a research assistant. Phi is a tutor. The distinction is everything.

|           |NotebookLM          |Phi                            |
|-----------|--------------------|-------------------------------|
|Core job   |Research assistant  |AI tutor                       |
|Audio      |Passive podcast     |Interactive read-along         |
|Persona    |Neutral             |Subject-specific personality   |
|Structure  |Query anything      |Structured lessons             |
|Progression|None                |Lesson → recall → quiz         |
|Target user|Researchers / adults|Students                       |
|Design     |Functional          |Distinctive, Arc-level ambition|

Phi’s real moat: **it’s deep where NotebookLM is wide.** Phi does one thing exceptionally — turn a student into a genuine learner of their own material.

-----

## The Full Vision (Do Not Build Yet)

1. Student uploads their notes, textbook chapters, or slides
1. Phi structures the content into titled, navigable lessons
1. A subject-specific AI tutor with a distinct personality teaches the lesson
1. ElevenLabs reads the lesson aloud while the student reads along — multimodal sensory learning
1. A chat sidebar lets the student pause, ask for simpler explanations, or skip ahead with a recap
1. Lesson ends with flashcards and active recall
1. V2: gamified project-based learning — build something real using the required tools and concepts
1. Dashboard across all subjects — sleek, modern, nothing like edtech has looked before
1. Subject-specific tutor personas — CS tutor, PreMed tutor, each with their own tone and personality

-----

## MVP Scope — Locked

Ship exactly this. Nothing more.

- [x] ✅ Auth (sign up / log in via Supabase)
- [x] ✅ Account page (formerly Settings) — API key storage in localStorage (Anthropic only)
- [x] ✅ File upload (PDF / text)
- [ ] 🚧 RAG pipeline — chunk, embed, store in pgvector (chunking done; real embeddings + pgvector search not yet wired up)
- [x] ✅ Lesson structuring — AI breaks content into titled lessons on upload
- [x] ✅ Lesson view — AI teaches the content, read aloud via the browser Web Speech API
- [x] ✅ Chat sidebar — pause, explain simply, skip ahead
- [x] ✅ Flashcards generated from lesson content
- [x] ✅ Basic quiz

**Exit condition:** A student can upload their data science textbook, get structured lessons, read along with audio, ask the chat questions mid-lesson, and get flashcards at the end.

-----

## Current State

What has actually been built and is running. Beyond the locked MVP, the app has had three large passes since: a full **Spades design system** (see `DESIGN.md`), a **sidebar app shell**, and a consolidated **Account page**. Engineering conventions for working in the codebase live in `AGENTS.md`.

**App shell** — every authenticated page lives in the `(app)` route group, wrapped in a sidebar shell that replaced the old top navbar:

- A floating glass **φ toggle** (fixed, top-left): φ → menu icon on hover, ✕ when open.
- A slide-in **Sidebar** drawer: Account (top), a gold "Upload Material" button, a scrollable list of the student's materials (fetched server-side in the layout), and the Phi wordmark (footer). A material opens its lesson; a ⋮ menu stubs Edit/Delete (UI only for now).

**Routes live**

| Route | Status | Notes |
|---|---|---|
| `/` | Done | Marketing landing page — full-viewport scroll-snap sections, pagination rail, Spades design |
| `/login`, `/signup` | Done | Supabase SSR auth; redirects to `/dashboard` on success |
| `/dashboard` | Done | Source grid; mapped sources show a section roadmap; "Continue" vs "Start" from cached lessons |
| `/upload` | Done | PDF + .txt upload; multi-step progress |
| `/lesson?source=<name>&section=<n>` | Done | Server fetches chunks → `LessonView` (client) generates + renders; supports per-section lessons |
| `/account` | Done | The single settings surface (see below). Replaces `/settings` |
| `/settings` | Redirect | Server redirect → `/account` (legacy bookmarks + in-app links) |

**The Account page** (`/account`) — five `glass-standard` cards:

- **API Key** — Anthropic key in localStorage (`phi_anthropic_key`)
- **Appearance** — Reading-font toggle: Space Mono / Inter (`phi_font_preference`)
- **Tutor** — Explanation depth: Concise / Standard / Thorough (`phi_explanation_depth`). The first seed of the V2 tutor-persona system; threaded into the lesson + chat system prompts
- **Memory & Data** — informational
- **Account** — email/password change, sign out, delete account (typed-`DELETE` confirmation modal)

**API routes live**

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/upload` | Done | `unpdf` for PDFs; ~500-token chunks; zero-vector placeholder embeddings |
| `POST /api/lesson` | Done | Claude `claude-opus-4-7`; cached to `lessons`; accepts `depth` (tutor setting) |
| `POST /api/chat` | Done | RAG from chunks; streamed reply via `text/plain`; accepts `depth` |
| `GET` / `POST /api/flashcards` | Done | GET cache-only; POST Claude `claude-sonnet-4-6` → `flashcards` table |
| `GET` / `POST /api/quiz` | Done | Multiple-choice quiz; mirrors flashcards → `quizzes` table |
| `POST /api/account/delete` | Done | Service-role (`SUPABASE_SERVICE_ROLE_KEY`); verifies session, deletes the user; cascading FKs remove their data |

**Lesson view features**

- Read-aloud via the browser **Web Speech API** (no key, no dependency) — play/pause/stop with markdown stripping
- RAG chat sidebar with real-time streaming + auto-scroll (renders markdown replies)
- Flip-card flashcards (3D CSS) with an expand modal for long cards; generate-on-demand, cached per source
- Floating action bar: flashcards, quiz, read-aloud, chat toggles

**Design system** (`DESIGN.md`)

- **Space Mono** everywhere by default (optional **Inter** reading font); near-black base + a single gold accent (`#d4a74a`)
- Glass surfaces (`glass-standard` / `glass-subtle`), layered `shadow-card`, atmospheric orbs, standardized expo-curve motion
- Tailwind **v4** — theme tokens in `globals.css @theme` (there is **no** `tailwind.config`); custom `@keyframes` (no `tailwindcss-animate`)

**Not yet built**

- Real vector embeddings (zero-vector placeholders stored; pgvector similarity search not wired up)
- ElevenLabs / OpenAI TTS (still Web Speech), chat-history persistence, Supabase-side API-key storage

-----

## V2 — Do Not Touch Until MVP Has Real Users

Everything below goes here. Not in the codebase. Not in a branch. Here.

- Gamified project-based learning (build a model, write a script, solve a problem)
- Subject-specific tutor personas with distinct personalities
- Progress tracking and spaced repetition
- Dashboard across subjects with visual design ambition
- Mobile via Capacitor (iOS + Android)
- API keys migrated from localStorage to Supabase (secure server-side storage)
- Monetization / grant applications / partnerships
- ElevenLabs TTS integration (human-quality voice; replaces Web Speech API)
- OpenAI TTS as an ElevenLabs alternative
- Chat history persistence (currently in-memory only; lost on page reload)

-----

## Tech Stack

|Layer                        |Tool                            |Why                                                               |
|-----------------------------|--------------------------------|------------------------------------------------------------------|
|Frontend + Backend           |Next.js (App Router, TypeScript)|React + API routes in one, App Router is modern standard          |
|Styling                      |Tailwind CSS v4 (Spades system) |Theme tokens in `globals.css @theme` (no config file); glass surfaces, Space Mono / optional Inter, custom `@keyframes` — no animation libraries. See `DESIGN.md` / `AGENTS.md`|
|Auth + DB + Storage + Vectors|Supabase                        |One service covers auth, file storage, relational DB, and pgvector|
|AI tutor engine              |Anthropic Claude API            |Lesson structuring, chat, flashcards, quiz generation             |
|Read-aloud                   |Browser Web Speech API (MVP) / ElevenLabs (V2)|Zero-dependency, keyless TTS built into every modern browser; ElevenLabs deferred to V2 for human-quality voice|
|Deployment                   |Vercel                          |Free tier, deploys from GitHub, zero config                       |
|API key storage              |localStorage (MVP)              |Simple, private, no server involvement — migrate to Supabase in V2|

-----

## Architecture

### How Content Becomes a Lesson

```
User uploads PDF / notes
        ↓
Next.js API route chunks content (~500 token pieces)
        ↓
Each chunk is embedded (converted to a vector)
        ↓
Vectors stored in Supabase pgvector
        ↓
Claude structures content into titled lessons
        ↓
Lesson view loads — read aloud via the browser Web Speech API
        ↓
Chat sidebar answers questions via RAG (retrieves relevant chunks, injects into prompt)
        ↓
End of lesson → flashcards → quiz
```

### Why RAG, Not Fine-Tuning

Fine-tuning bakes knowledge into model weights. It’s expensive, slow, and requires a new fine-tune per user. RAG retrieves relevant chunks at query time and injects them into the prompt. It’s fast, cheap, accurate, and works with any user’s material. Supabase pgvector handles vector storage — no separate service needed.

### Why Subject Personas Use Prompts, Not Fine-Tuning

Strong system prompts produce 95% of fine-tuning’s benefit at 1% of the cost. Each tutor persona is a carefully written system prompt with a distinct voice, teaching style, and subject focus. Fine-tuning personas is a V3 problem.

-----

## Build Order

```
✅ Week 1  → Project setup, auth, settings page, API key storage in localStorage
✅ Week 2  → File upload + RAG pipeline (chunk, embed, pgvector)
✅ Week 3  → Lesson structuring + lesson view UI
✅ Week 4  → TTS integration (Web Speech API, MVP) + chat sidebar
   Week 5  → Flashcards + quiz generation
   Week 6  → Polish + deploy to Vercel
```

-----

## Workflow Rules

**Two Claude instances:**

- This project instance — direction, architecture, decisions, scope enforcement
- Separate Opus instance — writing code

**The v2.md rule:** Any feature idea that is not in MVP scope gets written into `v2.md` immediately. Not discussed. Not prototyped. Written down and closed.

**Scope creep signals:**

- “What if we also added…”
- “It would be cool if…”
- “While we’re at it…”

All three phrases mean stop and check against MVP scope.

**Definition of done for MVP:** A real student can use it start to finish without the builder explaining anything.

-----

## Domain + Branding

- **Name:** Phi (φ) — the golden ratio, mathematical beauty, the ideal proportion
- **Domain:** usephi.io
- **Design feeling:** Arc browser / Dia browser energy — fluid, restrained, dark-first, generous whitespace, micro-interactions that reward curiosity. Not loud. Not cluttered. Every animation has a reason.
- **Color palette:** Maximum 3 colors. One vivid accent. Dark base.

-----

## Business Model (Post-MVP)

|Stage         |Approach                                                            |
|--------------|--------------------------------------------------------------------|
|MVP           |User-provided Anthropic API key — free to use                       |
|Early traction|Apply for Anthropic startup credits, OpenAI for Startups            |
|Growth        |Freemium — limited free tier, paid for more subjects / storage      |
|Funded        |Handle API costs internally, pursue AI Grant / YC / Thiel Fellowship|

-----

## The Builder

16-year-old developer. iOS background (Swift). Learning web development through this project. Vibe-coding to MVP, then structured React/Next.js deep dive post-ship.

Every code decision in this project should be explained — what changed, where, why, what problem it solves, what the tradeoff was. Never dump unexplained code.

-----

## Phi’s North Star

> A student opens Phi, uploads their notes, and 20 minutes later understands the material better than they would have after 2 hours of passive reading. That’s the product. Ship that first.
