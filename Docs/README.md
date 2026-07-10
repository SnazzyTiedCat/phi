# Phi (φ)

**AI for Human Intelligence.**

Phi is an AI tutor that provides a more in-depth teaching experience at any time of the day. Anywhere (with an internet connection).

This repo is currently in the process of transitioning from a web application that didn't live up to The Spades Company's standards to an iOS application.

| |  iOS (`Phi/`) |
|---|---|---|
| Status | Skeleton — prompt layer built, no UI wired to it yet |
| Stack  | SwiftUI, Supabase |
| Docs | [ [`STRUCTURE.md`](./STRUCTURE.md), [`WALKTHROUGH.md`](./WALKTHROUGH.md) |

## Quick start

**iOS** — copy `Config/Secrets.xcconfig.example` to `Config/Secrets.xcconfig`, fill in the Supabase URL/anon key (same project as `usephi.io`), then open `Phi.xcodeproj` in Xcode. A build without that file crashes on launch with instructions rather than talking to nowhere.

## Repo layout

```
Web/          the marketing/landing page — untouchable from iOS work
Phi/          the iOS app target (see STRUCTURE.md for the folder convention)
Docs/         cross-cutting docs (Supabase contracts, RLS audit, recall shapes)
Tools/        dev-only scripts, not compiled into the app
Config/       Secrets.xcconfig (gitignored; see .example)
```

## Status

iOS has a working Dashboard shell, anonymous Supabase identity, and a fully built, adversarially-tested AI prompt layer (`Phi/AI/`) — but nothing in the app calls it yet. [`WALKTHROUGH.md`](./WALKTHROUGH.md) is the honest, up-to-date account of what exists versus what's stubbed.
