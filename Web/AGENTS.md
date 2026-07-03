<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Phi — agent handbook

Engineering conventions for working in this repo. For **product** direction, scope, and the north star, read `CLAUDE.md`. For the **visual** system, read `DESIGN.md` (+ `PRODUCT_DESIGN.md`). This file is the "how to write code here" companion.

## The builder
A 16-year-old iOS/Swift developer learning web development through this project. **Explain every change** — what changed, where, why, and the tradeoff. Never dump unexplained code. Match the surrounding code's heavy comment density (files here carry "why" comments, not just "what").

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (Next 16). **Does not run ESLint.**
- `npx tsc --noEmit` — typecheck
- `npx eslint <files>` — lint (run explicitly; the build won't)

Before claiming work is green, run **all three**: `tsc --noEmit`, `eslint` on touched files, and `build`.

## Stack realities (don't get surprised)
- **Next.js 16, App Router, React 19.** Server Components by default; `"use client"` only where you need browser APIs / state. Layouts persist across navigation (per-page entrance is handled by `(app)/PageTransition.tsx`, keyed on pathname).
- **Tailwind CSS v4** — there is **no `tailwind.config`**. The theme lives in `src/app/globals.css` under `@theme { … }`. Tokens like `--color-c-400` generate `text-c-400`; `--animate-foo` generates `animate-foo`.
  - **`tailwindcss-animate` is NOT installed.** `animate-in` / `fade-in` / `slide-in-from-*` compile to nothing. Use real `@keyframes` + an `--animate-*` token.
  - Arbitrary values must have **no spaces**: `ease-[cubic-bezier(0.16,1,0.3,1)]`, `bg-white/[0.055]`, `[scroll-snap-stop:always]`.
  - To reference a CSS var defined *outside* Tailwind (e.g. a `next/font` var), use `@theme inline { --font-inter: var(--font-inter); }` so Tailwind inlines it instead of emitting a shadowing `:root` var.
- **Fonts** (`src/app/layout.tsx`): **Space Mono** is the default (`--font-space-mono` → `font-mono`); **Inter** is the optional reading font (`--font-inter` → `font-inter`). `FontContext` applies one to the `(app)` content wrapper based on `phi_font_preference`.
- **Supabase** via `@supabase/ssr`: `lib/supabase/server.ts` (Server Components / route handlers, async — `await createClient()`), `lib/supabase/client.ts` (browser), `lib/supabase/admin.ts` (service-role, **server-only**, bypasses RLS — only for privileged ops like account deletion).
- **Anthropic SDK** — model ids are constants at the top of each route (`claude-opus-4-7` for lesson/chat, `claude-sonnet-4-6` for flashcards/quiz). Don't bump models without asking.

## Gotchas that will bite you
- **`react-hooks/set-state-in-effect`**: calling `setState` synchronously in a `useEffect` body is an ESLint **error** here. When reading `localStorage` on mount, defer with `requestAnimationFrame(() => setState(...))` (lazy `useState` init would cause an SSR hydration mismatch). See `Reveal.tsx`, `FontContext.tsx`.
- **Modals must portal to `document.body`.** `PageTransition` keeps a lingering `transform` (animation fill-mode), which creates a containing block that captures `position: fixed`. Use `createPortal(…, document.body)`; animate with the `animate-modal-in` / `animate-overlay-in` tokens. See the flashcard expand modal and the delete modal.
- **Nested interactive elements are invalid HTML.** A `<button>`/`<a>` can't contain another. Make the secondary control (⋮, ellipsis) a *sibling* inside a `relative` wrapper, not a child. See `Sidebar.tsx` `MaterialItem`, `LessonView.tsx` `FlipCard`.
- **`useSearchParams()`** in a client component needs a `<Suspense>` boundary above it (see `Sidebar` in `(app)/layout.tsx`).

## localStorage contracts (read in multiple places — keep keys in sync)
- `phi_anthropic_key` — Anthropic API key (set on Account, read by `LessonView` before every lesson/chat/flashcard/quiz call).
- `phi_font_preference` — `"mono"` | `"inter"` (Account → Appearance ↔ `FontContext`).
- `phi_explanation_depth` — `"concise"` | `"standard"` | `"thorough"` (Account → Tutor; sent to `/api/lesson` + `/api/chat`, mapped to a prompt line by `lib/tutor-depth.ts`).

## Auth & API routes
- The `(app)/layout.tsx` is the **server-side auth gate** (redirects logged-out users). Route handlers don't pass through it, so each one re-checks `supabase.auth.getUser()` itself.
- The Anthropic key lives in the browser (localStorage), so the client sends it in the request body; routes use it for one request and never store it.

## Data & environment
- **No migration tooling.** Schema SQL lives in `supabase/*.sql` and is applied **manually** in the Supabase dashboard SQL editor. New tables won't exist until that's run (caching/features silently fail otherwise). `flashcards` / `quizzes` reference `auth.users(id) on delete cascade`.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only, required for `/api/account/delete` — without it the route returns a clean 500).
- RAG embeddings are **placeholders** (zero vectors); pgvector similarity search is not wired up yet.

## Conventions
- **Conventional commits**: `feat:` / `fix:` / `style:` / `chore:` / `docs:`. End every commit body with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Commit/push only when asked.** Branch off `main` first if needed.
- **Scope discipline**: ideas outside current scope go in `CLAUDE.md`'s "V2" section — don't build them. Watch for "what if we also…", "it would be cool if…", "while we're at it…".
