# Lesson-cache contract (BE-4 → Builder 1 / iOS-10)

The table shape and access pattern the iOS client wires to. Owner: Backend
(Builder 2). Changes to this contract are announced, not slipped in.

## Table shape

`ios.lessons` (defined in `ios_learning_chain.sql` + `ios_generated_content_cache.sql`):

| column | type | notes |
|---|---|---|
| `id` | uuid PK | **stable across regenerates** — chat history hangs off it |
| `material_id` | uuid FK → ios.materials, cascade | |
| `user_id` | uuid FK → auth.users, cascade | RLS: `auth.uid() = user_id` on every op |
| `section_index` | int | `unique(user_id, material_id, section_index)` — the upsert key |
| `title`, `content` | text | AI-2's structured lesson output |
| `tutor_persona` | text nullable | |
| `content_hash` | text nullable | SHA-256 lowercase hex of the material text this lesson was generated from |

`ios.materials.content_hash` (same encoding) is the current-truth side of the
comparison. The client writes it at upload/extraction and rewrites it whenever
the material's content is replaced.

**Hash spec (both sides must agree):** `SHA256(extracted_text_utf8)` →
lowercase hex. Swift: `CryptoKit.SHA256`.

## Access pattern (open a material)

1. Fetch the material row → gives current `content_hash` (call it `h`).
2. `select * from ios.lessons where material_id = X` (RLS scopes to the user).
3. Every returned row with `content_hash == h` is a **cache hit — render it,
   make zero generation calls.** Verify by observing the absence of the API
   call, not by vibes.
4. Any missing/stale section → generate **once**, then upsert:
   `insert … on conflict (user_id, material_id, section_index) do update`
   (supabase-swift: `.upsert(…, onConflict: "user_id,material_id,section_index")`),
   writing `content_hash = h`.
5. After a regenerate, delete leftovers:
   `delete from ios.lessons where material_id = X and content_hash <> h`
   — a shrunk section count replaces artifacts instead of orphaning them.
   (FK cascade cleans up flashcards/quizzes hanging off any deleted lesson.)

Deleting the material cascades everything; no client-side cleanup needed.

All calls go through `supabase.schema("ios")` with the anon key — client-direct,
no server in the loop. Runnable proof of the whole pattern (including
cross-user denial): `Docs/supabase/be4_verification.sh`.

## Extension point (Builder 3)

Flashcards/quizzes adopt the identical pattern when their shapes land: carry
`content_hash`, one artifact set per (user, lesson or material), replace-don't-
append on regenerate. Their shapes are theirs to publish — not guessed here.
