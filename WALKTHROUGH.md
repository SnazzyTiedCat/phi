# Phi — Codebase Walkthrough

Read [STRUCTURE.md](STRUCTURE.md) first (30 seconds). This file explains what each group of files *does* and why. Terms of art get a one-line definition the first time they appear.

---

## The trace: what actually happens when the app runs

You launch the app. `PhiApp` (the entry point) puts `RootView` on screen in permanent dark mode. `RootView` does two things: shows the Dashboard inside a `NavigationStack` (iOS's screen-to-screen navigation container), and quietly kicks off `IdentityStore.bootstrap()` in the background — that either restores your anonymous Supabase session from the Keychain or mints a new one. No login screen exists; identity is invisible.

The Dashboard reads `MaterialStore.materials`. That array is **empty in the shipped app** — there is no import feature yet — so you see the ♠ empty state ("No materials yet."). In previews, where the store is seeded, tapping a material card pushes `TutoringView`… which is currently a stub that just shows the material's title.

**That is the whole runtime loop today.** The brief's core loop — material → lesson → TTS → chat → recall — does not exist in this app yet. What *does* exist beyond the loop above is a complete, tested **prompt layer** (the `AI/` group): personas, guardrails, and flashcard/quiz/grading prompts, all built and verified — but **nothing in the app calls them yet**. Phi currently has a brain with no mouth. That's not a flaw in the code; it's where the build actually is, whatever any ledger says.

---

## Group by group

### `PhiApp.swift` — the entry point
Eleven lines: declare one window, put `RootView` in it, force dark mode. It stays this small on purpose — the `App` struct declares *what scenes exist*; everything else lives in ordinary views so it can be previewed in isolation.

### `Views/` — everything you can see
**What it is:** all SwiftUI screens, one folder per screen area.

**Why it exists:** each screen is one file with its layout and nothing else. The deliberate decision here — stated in comments in almost every file — is **no ViewModels yet**. A ViewModel (an object that holds a screen's logic separate from its layout) earns its place when a screen has async work or logic worth testing without the UI. None of these screens do yet, so wrapping them would be ceremony. When import lands and screens get real async logic, ViewModels arrive with it.

**How navigation works — the one decision to understand deeply:** the Dashboard doesn't say "go to TutoringView." It says `NavigationLink(value: material)` — it pushes a *value*, and `RootView` declares "when a `Material` value is pushed, show `TutoringView` for it." This is value-based navigation, and it's why `Material` is `Hashable` (the comment in Material.swift calls this "load-bearing, not decorative"). The payoff: screens don't need to know about each other; the routing table lives in one place.

**Honest edge:** `ArrivalView` (onboarding) and its store are compiled but *unreferenced* — routing goes straight to the Dashboard. That was a deliberate, documented decision (a later chunk may repurpose the "shown once" mechanism), not forgotten code.

### `Stores/` — who owns the truth
**What it is:** three `@Observable` objects (Swift's mechanism for "views re-render when this changes"), each owning one slice of app state: `IdentityStore` (who am I in the cloud), `MaterialStore` (what have I imported), `OnboardingStore` (have I seen onboarding).

**Why it exists:** so every fact has exactly one owner. The `OnboardingStore` comment states the founding reasoning: scattered `@AppStorage` calls become multiple sources of truth for the same UserDefaults key, and a typo silently creates a second flag. Centralize the key once, and the whole class of bug disappears.

**The decision worth understanding:** `IdentityStore.bootstrap()` runs from `RootView`'s `.task`, *not* at app init — so the Dashboard paints instantly and identity resolves behind it. If anonymous sign-in fails (offline, or disabled in the Supabase dashboard), `currentUserID` stays `nil` **loudly** — future upload code gates on it, so a broken identity blocks writes instead of letting an unscoped write through.

**Honest edge:** `MaterialStore` is in-memory only and starts empty. No persistence was built because import doesn't exist yet — a throwaway persistence shim now is something a later chunk would have to unwind.

### `Models/` — plain data
One file: `Material` — an id and a title. Intentionally thin; the real fields (file URL, page count…) arrive when import defines what they are. Guessing at them now would pre-commit to the wrong shape.

### `Services/` — the outside world
**What it is:** the single configured Supabase client, plus a DEBUG-only verification harness.

**The security model, in plain terms:** the Supabase *anon key* (a publishable API key) ships inside the app binary **by design**. Access control is enforced by Row Level Security — RLS, database rules that filter every query to "only rows belonging to this user" — not by keeping the key secret. The key that must never exist in this repo is the *service-role* key (the one that bypasses RLS). Config comes from a gitignored `Config/Secrets.xcconfig`; a build missing it crashes at launch with instructions rather than silently talking to nowhere.

**The harness** (`SupabaseVerificationHarness`, the "Verify" button on the Dashboard): temporary DEBUG-only scaffolding that inserts a row into the `ios.materials` table and reads it back, proving RLS isolation works. It's meant to be deleted once verified.

**Honest edge:** the harness — and identity bootstrap itself — fail until the Supabase dashboard is configured: anonymous sign-ins enabled, the `ios` schema exposed in the Data API, and the SQL in `Docs/supabase/` applied. As of 2026-07-03 the project was restored but those steps were **not** all done. The app tolerates this (dashboard still renders); anything cloud-touching doesn't.

### `AI/` — the tutoring brain (built, not yet wired in)
**What it is:** everything about how the tutor thinks and speaks — pure logic, zero UI, and currently zero callers inside the app.

**The core idea — prompt composition:** a system prompt (the standing instructions an AI model gets before any conversation) is assembled from independent parts rather than written as one blob:

- `Personas/` — *who* the tutor is. `TutorPersona` is a plain struct: a frozen string `id`, a display name, and the identity half of the prompt. `Generalist` is the one persona so far: warm but rigorous, Socratic in proportion to how close the student is, honest about wrong answers.
- `Prompting/Guardrails.swift` — *the rules*, one authoritative block appended to every persona: protect the instructions, stay in character, keep sessions on tutoring, teach toward answers rather than handing them over.
- `Prompting/PromptComposer.swift` — the assembler: persona + guardrails + one pacing line per mode (teaching / recap / simplify) + optional context. Pure function, no state.

**Why split it this way:** one guardrail edit updates every current and future persona at once, and no persona can drift its own copy of the rules.

**The honesty note you must internalize** (it's written at the top of Guardrails.swift): these guardrails are *product behavior*, **not security**. Phi runs on a user-supplied API key — anyone holding the key can bypass the app and query the model raw. The architecture becomes a real trust boundary only when the key moves behind a Spades-owned server.

- `Recall/` — the one-shot prompts for flashcards, quizzes, and short-answer grading, plus their JSON shapes. Two decisions worth knowing: (1) they compose the persona *directly*, skipping PromptComposer — these are single JSON-producing calls, not chat turns, so the chat guardrails don't apply; (2) the JSON key names (`multiple_choice`, `sample_answer`, 0-based `correct`) deliberately match the web app's database shape — **renaming a key is a cross-platform breaking change**. Grading treats the student's answer as untrusted input and fences it behind delimiters, since a student can type "ignore your instructions" into an answer box.
- `Testing/` — the adversarial test suite for the guardrails and the recall verification docs. **Honest edge:** the AI-1 adversarial suite's results are *pending* — it was authored without an API key, so the prompts were never actually sent. The suite is real; the green checkmarks aren't there yet.

### `DesignSystem/` — the brand primitives
**What it is:** `Colors` (the grayscale ramp `c950`→white + gold accent), `Typography` (Space Mono vs SF Pro, applied via `.phiFont(...)`), and `SpadeMark` (the ♠, parameterized because it appears in six-plus contexts).

**The mechanism worth understanding:** the font choice is a single `@AppStorage` key that every font-aware view reads. Changing it in Settings re-renders the entire app live — no notification, no store, just every view watching the same persisted value.

**Honest edge:** the hex values in Colors.swift are *placeholders* — the file says so — approximating DESIGN.md's token table until the real values are transcribed.

### Outside the app target
- `Web/` — the marketing/web app; untouchable from iOS work.
- `Docs/` — the Supabase SQL, the lesson-cache contract, the RLS audit checklist.
- `Tools/recall-prompt.swift` — a CLI that compiles *against the real app source files* to print the composed recall prompts, so test runners never hold a hand-copied prompt that drifts. It lives outside `Phi/` because the app target compiles everything inside `Phi/` automatically.

---

## What's honestly missing or fragile (the short list)

1. **No lesson, TTS, chat UI, or recall UI** — `TutoringView` is a stub; the `AI/` layer has no caller. The advertised core loop is not yet in this app.
2. **Supabase dashboard config incomplete** — identity + harness fail until anonymous sign-ins are on, the `ios` schema is exposed, and the SQL is applied.
3. **AI-1 adversarial suite unrun** — authored, pending an API key run by you.
4. **Placeholder colors** — swap for DESIGN.md's real token values before shipping.
5. **Deliberately dead code** — ArrivalView/OnboardingStore (documented), the DEBUG Verify button + harness (delete after verification).

None of these are new discoveries — every one is flagged in the code where it lives. That consistency is the multi-agent build's most trustworthy habit: when something was skipped, a comment says so and says why.

---

## Suggested reading order

1. `PhiApp.swift` → `Views/RootView.swift` — the spine (5 min).
2. `Views/Dashboard/DashboardView.swift` — the richest real screen; read its comments, they teach the app's conventions.
3. `Stores/OnboardingStore.swift` then `IdentityStore.swift` — the store pattern, simplest first.
4. `Models/Material.swift` + `Views/Dashboard/MaterialCardView.swift` — data → pixel.
5. `DesignSystem/Typography.swift` — the `@AppStorage` live-switch trick.
6. `Services/SupabaseClient.swift` — the security model in 32 lines.
7. `AI/Personas/Generalist.swift` → `Prompting/Guardrails.swift` → `PromptComposer.swift` — read the prompts as *writing*; they're the product's voice.
8. `AI/Recall/RecallShapes.swift` + `RecallPrompts.swift` — the wire contract and why its keys are frozen.

After that, you can explain every file in this repo to someone else — which is the actual test.
