-- chunks.section_index column
--
-- HOW TO APPLY: paste and run this in the Supabase dashboard -> SQL Editor.
-- (This project has no migration tooling yet; this file is the committed record
-- of the schema so it lives in version control alongside the code that uses it.)
--
-- Document sectioning tags every chunk with the section it belongs to, then the
-- lesson page filters chunks by this integer when a student opens
-- `/lesson?source=...&section=N`. Existing pre-sectioning uploads should behave
-- like one whole-document section, so the default/backfill value is 0.

alter table chunks
  add column if not exists section_index integer not null default 0;
