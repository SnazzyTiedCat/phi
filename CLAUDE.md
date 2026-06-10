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
- [x] ✅ Settings page — API key storage in localStorage (Anthropic + ElevenLabs)
- [x] ✅ File upload (PDF / text)
- [ ] 🚧 RAG pipeline — chunk, embed, store in pgvector (chunking done; real embeddings + pgvector search not yet wired up)
- [x] ✅ Lesson structuring — AI breaks content into titled lessons on upload
- [x] ✅ Lesson view — AI teaches the content, ElevenLabs reads aloud
- [x] ✅ Chat sidebar — pause, explain simply, skip ahead
- [x] ✅ Flashcards generated from lesson content
- [x] ✅ Basic quiz

**Exit condition:** A student can upload their data science textbook, get structured lessons, read along with audio, ask the chat questions mid-lesson, and get flashcards at the end.

-----

## Current State

What has actually been built and is running as of June 2026.

**Routes live**

| Route | Status | Notes |
|---|---|---|
| `/login`, `/signup` | Done | Supabase SSR auth; redirects to `/dashboard` on success |
| `/dashboard` | Done | Source grid; "Continue learning" vs "Start learning" based on cached lesson |
| `/upload` | Done | PDF + .txt upload; disclaimer and next-step hint |
| `/lesson?source=<name>` | Done | Server fetches chunks → `LessonView` (client) generates + renders lesson |
| `/settings` | Done | Anthropic API key only — ElevenLabs field removed |

**API routes live**

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/upload` | Done | `unpdf` for PDFs; ~500-token chunks; stored in Supabase with zero-vector placeholder embeddings |
| `POST /api/lesson` | Done | Claude `claude-opus-4-7`; cached to `lessons` table; subsequent visits return instantly |
| `POST /api/chat` | Done | RAG from chunks table; streamed reply via `text/plain`; full conversation history |
| `GET /api/flashcards` | Done | Cache-only read; no Claude call |
| `POST /api/flashcards` | Done | Claude `claude-sonnet-4-6`; cached to `flashcards` table |
| `GET /api/quiz` | Done | Cache-only read; no Claude call |
| `POST /api/quiz` | Done | Multiple-choice quiz; mirrors flashcards; cached to `quizzes` table |

**Features in the lesson view**

- Read-aloud via browser Web Speech API (no key, no dependency) — play/pause/stop with markdown stripping
- Chat sidebar with real-time streaming and auto-scroll
- Flip-card flashcards with 3D CSS rotation; generate-on-demand then cached per source
- Floating action bar toggles: flashcards panel, read-aloud, chat sidebar

**Not yet built**

- Real vector embeddings (zero-vector placeholders stored; pgvector similarity search not wired up)

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
|Styling                      |Tailwind CSS only               |No Framer Motion — Tailwind animations are enough for MVP         |
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
Lesson view loads — ElevenLabs reads aloud
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
|MVP           |User-provided API keys (Anthropic + ElevenLabs) — free to use       |
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
