-- BE-4 — generated-content cache: generate-once semantics for AI artifacts.
--
-- HOW TO APPLY: paste into Supabase dashboard → SQL Editor (repo convention:
-- no migration tooling — this committed file IS the schema record).
-- Prerequisites, in order:
--   1. ios_materials_foundation.sql, plus its two manual dashboard steps:
--      Anonymous Sign-Ins enabled; `ios` added to Data API exposed schemas.
--      (Both were found OFF against the live project on 2026-07-03.)
--   2. ios_learning_chain.sql (lessons/flashcards/quizzes/chat_messages).
-- Idempotent — safe to re-run.
--
-- The pattern (the web era's proven cache shape, solved once for all artifact
-- types: one artifact per user per material per type):
--
--   * ios.materials.content_hash — SHA-256, lowercase hex, of the material's
--     extracted text. Written by the client at upload/extraction time and
--     rewritten whenever the material's content is replaced.
--   * Every artifact row carries the content_hash it was generated FROM.
--   * Cache HIT  ⇔ artifact.content_hash = materials.content_hash
--                → render from the row, zero generation calls.
--   * MISS/stale → generate once, upsert on the row's uniqueness key
--     (lessons: user_id, material_id, section_index — the id stays stable, so
--     ios.chat_messages keyed off lesson_id survive a regenerate untouched),
--     then delete rows for that material still carrying a stale hash, so a
--     shrunk section count replaces artifacts instead of orphaning them.
--
-- Full access pattern for clients: Docs/supabase/CONTRACT-lesson-cache.md.
--
-- Flashcards/quizzes (Builder 3's lane) get the same single column when their
-- shapes land — deliberately not guessed here.

alter table ios.materials add column if not exists content_hash text;

-- Nullable on purpose: a NULL hash never equals a real one, so any row that
-- predates this migration (or a client bug that skips the hash) reads as
-- stale and regenerates — the cache self-heals instead of serving junk.
alter table ios.lessons add column if not exists content_hash text;
