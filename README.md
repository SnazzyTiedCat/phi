# Phi (φ)

**Upload your notes. Phi teaches you.**

Phi is an AI tutor, not a research assistant — it turns a student's own material into a structured, multimodal lesson: read aloud, chat about, and get quizzed on, in that order. See [`Web/CLAUDE.md`](./Web/CLAUDE.md) for the full product vision.

This repo holds two independent apps that share the name and the Supabase project:

| | Web (`Web/`) | iOS (`Phi/`) |
|---|---|---|
| Status | MVP, live at usephi.io | Skeleton — prompt layer built, no UI wired to it yet |
| Stack | Next.js, Supabase, Claude API | SwiftUI, Supabase |
| Docs | [`Web/README.md`](./Web/README.md), [`Web/CLAUDE.md`](./Web/CLAUDE.md) | [`STRUCTURE.md`](./STRUCTURE.md), [`WALKTHROUGH.md`](./WALKTHROUGH.md) |

## Quick start

**Web** — see [`Web/README.md`](./Web/README.md), or from repo root: `npm run dev` (proxies into `Web/`).

**iOS** — copy `Config/Secrets.xcconfig.example` to `Config/Secrets.xcconfig`, fill in the Supabase URL/anon key (same project as `usephi.io`), then open `Phi.xcodeproj` in Xcode. A build without that file crashes on launch with instructions rather than talking to nowhere.

## Repo layout

```
Web/          the marketing/product web app — untouchable from iOS work
Phi/          the iOS app target (see STRUCTURE.md for the folder convention)
Docs/         cross-cutting docs (Supabase contracts, RLS audit, recall shapes)
Tools/        dev-only scripts, not compiled into the app
Config/       Secrets.xcconfig (gitignored; see .example)
```

## Status

Web is feature-complete for the core loop (upload → lesson → read-along → chat → flashcards → quiz); real vector search is the remaining RAG work — details in [`Web/README.md`](./Web/README.md#status).

iOS has a working Dashboard shell, anonymous Supabase identity, and a fully built, adversarially-tested AI prompt layer (`Phi/AI/`) — but nothing in the app calls it yet. [`WALKTHROUGH.md`](./WALKTHROUGH.md) is the honest, up-to-date account of what exists versus what's stubbed.
