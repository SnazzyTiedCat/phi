# RLS audit checklist — `ios` schema (living document)

Every table needs BOTH layers (known pitfall): the policy `for all using
(auth.uid() = user_id) with check (…)` AND `grant select, insert, update,
delete … to authenticated`. Plus the two project-level switches: Anonymous
Sign-Ins enabled; `ios` in the Data API exposed schemas.

Seeded by BE-4 (2026-07-03) because no earlier copy of this checklist exists
in the repo — if BE-3's original lives elsewhere, reconcile into this one.

| table | policy | grant | cross-user denial proven | date |
|---|---|---|---|---|
| ios.materials | in `ios_materials_foundation.sql` | same file | ❌ blocked, see below | — |
| ios.chunks | in `ios_learning_chain.sql` | same file | ❌ blocked | — |
| ios.lessons (+`content_hash`, BE-4) | in `ios_learning_chain.sql` | same file | ❌ blocked — run `be4_verification.sh` | — |
| ios.flashcards | in `ios_learning_chain.sql` | same file | ❌ blocked | — |
| ios.quizzes | in `ios_learning_chain.sql` | same file | ❌ blocked | — |
| ios.chat_messages | in `ios_learning_chain.sql` | same file | ❌ blocked | — |
| storage `ios-materials` bucket | path-prefix policy in `ios_materials_foundation.sql` | n/a | ❌ blocked | — |

## Live-project findings, 2026-07-03 (why everything is blocked)

Probed via PostgREST with the anon key:

- `ios` schema **not exposed** (`PGRST106`) — no client can reach any `ios.*` table.
- **Anonymous Sign-Ins disabled** (`anonymous_provider_disabled`) — the app's identity bootstrap cannot run.
- Legacy `public.sources` / `public.lessons` **still exist** (42501 permission-denied, not "table missing") — `legacy_public_wipe.sql` was never applied.

Unblock order: flip the two dashboard switches → apply
`ios_materials_foundation.sql`, `ios_learning_chain.sql`,
`ios_generated_content_cache.sql` → run `bash Docs/supabase/be4_verification.sh`
→ record results here → apply `legacy_public_wipe.sql` (gates in that file).

-----COMPLETE-----
PASS  identity A created a material
PASS  lesson persisted
PASS  cache hit: fresh-hash row returned (client makes zero generation calls)
PASS  regenerate replaced in place — lesson id stable (chat history survives)
PASS  no duplicate row after regenerate
PASS  stale-hash cleanup statement accepted
PASS  identity B cannot READ A's lesson (0 rows)
PASS  identity B cannot WRITE as A (rejected: 42501)
PASS  cleanup: material delete cascades

July 9, 2026
