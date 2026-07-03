-- sources.display_title column
--
-- HOW TO APPLY: paste and run this in the Supabase dashboard → SQL Editor.
-- (This project has no migration tooling yet; this file is the committed record
-- of the schema so it lives in version control alongside the code that uses it.)
--
-- Adds an OPTIONAL friendly title for a material. A material's identity stays
-- `source_name` (the key shared across chunks/sources/lessons/flashcards/quizzes
-- and baked into the lesson URL). Renaming writes here instead of mutating that
-- key, so /api/material/rename is a single-row update with no risk of orphaning
-- rows across tables. Read paths (the app layout + dashboard) show
-- `display_title` when set, else fall back to `source_name`.
--
-- Nullable on purpose: only renamed materials have a value; everything else
-- keeps showing its filename. No backfill needed.

alter table sources
  add column if not exists display_title text;
