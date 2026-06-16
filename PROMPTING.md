# Phi — Prompting Guide
> A reference for whoever is writing instructions for Opus (Claude Code) on this project. Read this before a session if it's been a while. Update it when you learn something new the hard way.

---

## 1. What This Document Is

This project runs on a two-instance workflow: this Claude instance (project chat) handles architecture, strategy, and scope — Opus (Claude Code) writes the actual code from prompts handed to it. That split only works if the prompts are good. This document exists to make the *next* prompt better than the last one, by writing down what's already been learned.

If you're a future instance of this project chat, or Spitz reading this fresh: the patterns below aren't theoretical. Every one of them came from something that broke.

---

## 2. Current Project Status

As of the most recent session, Phi is live at **usephi.io**, deployed on Vercel, domain routed through Cloudflare. The MVP exit condition from `CLAUDE.md` has been met and shipped — a student can upload material, get a structured lesson, read along with audio, ask the chat sidebar questions, get flashcards, and take a quiz.

**Architecture in production:**
- Next.js App Router + TypeScript, Tailwind CSS
- Supabase: auth, Postgres (chunks/lessons/flashcards/quizzes/sources tables), pgvector (embeddings currently placeholder zero-vectors, not yet real)
- Anthropic Claude API for lesson generation, chat, flashcards, quiz — model `claude-sonnet-4-6`
- TTS via browser `speechSynthesis` (Web Speech API) — ElevenLabs was attempted and abandoned for MVP because free tier blocks all library voices via API (see §6)
- API keys stored in `localStorage`, never touch the server

**Mid-build right now:** a navigation overhaul replacing the old navbar+Settings-page model with a ChatGPT/Claude-style persistent sidebar (materials list, upload CTA, account button) plus a slide-over material editor and a redesigned dashboard. This is being sent to Opus in sequential, dependent prompts (1A through 1E) because each piece shares layout/context with the next — sidebar geometry has to be right before the Account destination and material editor get built on top of it.

**Not yet started:** document/chapter sectioning (mapping a large upload into a navigable roadmap of sections rather than one flat lesson), and the broader "YC readiness" pass (emojis removed from lesson prompts, takeaways feature, error handling standardization, 404 page, wider PDF support messaging).

**Design system:** Phi inherits The Spades Company's `DESIGN.md` / `PRODUCT_DESIGN.md` — Space Mono typeface, 14-step grayscale, glass surfaces, slow cinematic motion (`cubic-bezier(0.16, 1, 0.3, 1)`), atmospheric background orbs. The one explicit deviation: the marketing site is pure grayscale with no accent, but **individual products carry one accent color each** — Phi's is gold (`#C9A84C`). This was a deliberate amendment to `PRODUCT_DESIGN.md §2.5`, not an oversight.

---

## 3. The Rules That Don't Change

These came from `CLAUDE.md` and have held up across the whole build:

- **The v2.md rule.** Any feature idea outside current scope gets written into `v2.md` (or `README.md`'s V2 section) immediately — not discussed, not prototyped, just written down and closed. The phrases "what if we also added," "it would be cool if," and "while we're at it" are scope-creep signals — when one shows up, stop and check against current scope before continuing.
- **One coherent unit of work per prompt where possible.** When a request has multiple independent fixes, separate prompts that don't share state can be sent together. When they share layout, context, or a data model, sequence them and verify each lands before sending the next. The sidebar work is the clearest example — sending the layout, the account page, and the editor all at once would have made it much harder to know which change broke what.
- **Every code decision gets explained.** What changed, where, why, what tradeoff. This isn't just a courtesy — Opus has consistently called out deliberate deviations from spec when literal compliance would have produced worse behavior (e.g. the TTS play/pause logic resuming instead of restarting). Reading those notes is how you catch a wrong assumption before it compounds.

---

## 4. How to Write a Prompt Opus Actually Executes Well

These are patterns that produced clean, working output versus ones that produced ambiguity or rework.

**Name exact files and paths.** Not "the lesson page" — `src/app/(app)/lesson/page.tsx`. Not "the API route" — `src/app/api/lesson/route.ts`. Opus works in a real filesystem; ambiguity about *which* file gets interpreted, and the interpretation isn't always right.

**Give literal values, not vibes, when precision matters.** "Make the capsule float nicely" produces something. "`fixed bottom-6 left-1/2 -translate-x-1/2`, `bg-zinc-900/90 backdrop-blur-xl`, `shadow-2xl shadow-black/50`" produces *exactly* the thing you're picturing. This matters most for anything touching the design system — durations, easing curves, hex values, spacing tokens. Vague aesthetic direction is fine for genuinely exploratory asks; it's the wrong tool once you know what you want.

**Specify the *why*, not just the *what*, for non-obvious decisions.** "Resume from pause instead of restarting" is a behavior. "If you restart on play-after-pause, the voice stacks or jumps back to the top, which breaks the player feel" is a constraint Opus can reason from — and it's why Opus has, correctly, flagged when it deviated from a literal instruction to preserve an implied one.

**Always include the SQL when a feature needs a new table or column.** Don't describe the schema in prose and let Opus infer the SQL — write the `create table`, the `alter table`, the policy, and the grant statement yourself, in the prompt. This eliminates an entire category of mismatch between what you imagined and what got created.

**Number sequential steps explicitly.** Multi-part instructions read more reliably as "1. / 2. / 3." than as a paragraph. This is especially true when later steps depend on earlier ones (e.g. "after chunking, run a section-mapping call, then tag each chunk with its section_index").

**Flag cost and caching concerns by name.** "Don't regenerate the lesson on every page visit" is a sentence that prevented a real wasted-token bug. If something will call a paid API, say so and say what should be cached.

**End feature prompts with a commit instruction when it matters for tracking.** Opus has independently used Conventional Commits formatting well without being told the exact format every time — but explicitly asking for a commit message keeps the git history readable, which matters since you are the one who has to remember to `git push` (see §6 — this has bitten you once already, 16 commits sitting local).

---

## 5. Prompt Structure That's Worked

For anything beyond a one-line fix, this shape has produced clean results:

```
[One sentence: what this prompt accomplishes and why]

1. [File path] — [what changes, in specific terms]
   - [exact values/classes/SQL where precision matters]
2. [Next file/step]
   ...

[Any explicit constraint, tradeoff, or "don't do X" warning]
```

For a true multi-feature session, breaking it into labeled, separately-sendable prompts (1A, 1B, 1C…) with an explicit note on dependency order has worked better than one giant prompt — easier to verify, easier to stop and fix mid-sequence if something's off, and easier for *you* to track what's actually landed versus what's still theoretical.

---

## 6. Known Pitfalls — A Running Log

Add to this list every time something costs you more than 10 minutes to figure out.

| Symptom | Cause | Fix |
|---|---|---|
| `TurbopackInternalError`, "Failed to lookup task ids" after deleting/renaming a file | Turbopack's build cache holds stale references | `rm -rf .next`, restart dev server |
| Dev server randomly crashes, Finder shows a progress bar on the project folder | Project lives inside iCloud Drive (or any cloud-synced folder) — sync conflicts with Node | Move the project to `~/` or `~/dev/`, never develop inside synced folders |
| `permission denied for table X`, even with an RLS policy in place | RLS policies and Postgres role grants are two separate layers — a policy alone doesn't grant `INSERT`/`UPDATE`/`SELECT` to the `authenticated` role | Always run both: the policy *and* `grant insert, select, update, delete on table public.X to authenticated;` |
| Cache lookup always misses even though the row exists | URL query params encode spaces as `+` or `%20`; the raw param doesn't match the DB value | `decodeURIComponent(param.replace(/\+/g, ' '))` before any comparison or write |
| `pdf-parse` throws on import in Next.js App Router | Known incompatibility — it tries to load test fixtures at import time, which the App Router environment blocks | Use `unpdf` instead |
| ElevenLabs returns 401/402/404 on every voice you try | Free tier blocks all pre-made library voices via the API entirely — this is a paywall, not a bug | Use browser `speechSynthesis` for MVP; revisit ElevenLabs only with a paid plan |
| `usephi.io` shows `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` after adding Cloudflare | Cloudflare's SSL mode set to "Flexible" while Vercel forces HTTPS — creates a mismatch/redirect loop | Set Cloudflare SSL/TLS mode to **Full** |
| Vercel deployment looks stale, missing features that exist locally | Commits were made locally but never `git push`-ed — Vercel only deploys what's on GitHub | `git status` to check for "ahead of origin," then `git push` |
| Confirmation emails redirect to `localhost` in production | Supabase's Site URL config still points at `http://localhost:3000` | Update in Supabase → Authentication → URL Configuration → Site URL |
| A feature works for the user who generated it but fails for anyone without an API key in *this* browser | Confusing "no key available" with "no cached content available" — they're different conditions | Check cache first, server-side; only demand a key on an actual generation (cache-miss) path |

---

## 7. Recurring SQL Pattern — Copy This Every Time

Every new Supabase table in this project has followed the same shape. Copy it instead of writing from scratch, and you won't hit the grant issue from §6 again:

```sql
create table if not exists table_name (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  -- other columns here
  created_at timestamp with time zone default now()
);

alter table table_name enable row level security;

create policy "Users can manage their own rows"
on table_name for all
using (auth.uid() = user_id);

grant insert, select, update, delete on table public.table_name to authenticated;
```

If the table needs a cache-style unique constraint (one row per user per source, like `lessons`/`flashcards`/`quizzes`), add `unique(user_id, source_name)` to the column list and use `.upsert()` with `onConflict: 'user_id,source_name'` in the route handler instead of `.insert()`.

---

## 8. Architecture Decisions Log

A short list of calls that were made deliberately and shouldn't get silently re-litigated:

- **RAG over fine-tuning** for content ingestion, and **system prompts over fine-tuning** for tutor personas — cheaper, faster to iterate, works per-user without retraining.
- **localStorage for API keys in MVP**, migrating to secure server-side storage in V2 — explicit tradeoff for speed-to-ship.
- **Browser `speechSynthesis` over ElevenLabs for MVP TTS** — not a downgrade in vision, a paywall workaround. ElevenLabs is the planned V2 upgrade once there's budget or a paid tier.
- **Phi carries one accent color (gold) despite TheSpades.co being pure grayscale** — products are allowed an identity color; the parent brand is not. Documented in `PRODUCT_DESIGN.md §2.5`.
- **Sidebar replacing the navbar+Settings-page model** — driven by the materials list outgrowing a flat dashboard grid; matches the mental model of Claude/ChatGPT-style tools where a persistent left rail of "your stuff" plus a clean top-level account destination scales better than scattered nav links.

---

## 9. When to Update This Document

- A bug ate more than 10 minutes and the cause wasn't obvious → add it to §6.
- A new table got created → confirm it followed §7, note any deviation and why.
- A real architecture decision got made (not a UI tweak) → add it to §8.
- The project status materially changes (new feature shipped, new phase started) → update §2.

This document is only useful if it stays current. A stale pitfalls list is worse than no list — it gives false confidence that you've already solved a class of problem you haven't.
