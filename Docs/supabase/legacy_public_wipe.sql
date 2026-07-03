-- BE-1 Part B — legacy web-app table wipe. DESTRUCTIVE. Do not run unchecked.
--
-- GATES — all three must pass BEFORE running the drops:
--
-- 1. BE-0's Supabase-usage audit came back clean: no live dependency from the
--    landing page on any table below. If it found one, re-point or remove that
--    dependency FIRST.
--
-- 2. Diff reality against this file's assumed list:
--
--      select table_name from information_schema.tables where table_schema = 'public';
--
--    If that returns tables not named below, decide about them explicitly and
--    add them here before proceeding — do not assume this enumeration is complete.
--
-- 3. The consolidated repo is not mid-merge (BE-0 fully landed and committed).
--
-- Named drops on purpose — NOT `drop schema public cascade` — so the public
-- schema itself, extensions, and Supabase-managed defaults stay untouched.

drop table if exists public.quizzes cascade;
drop table if exists public.flashcards cascade;
drop table if exists public.lessons cascade;
drop table if exists public.chunks cascade;
drop table if exists public.sources cascade;

-- AFTER the wipe, re-run Chunk 3's verification harness against ios.materials
-- (write as identity A, unreadable by identity B, survives relaunch) — BE-1 is
-- not done until that regression check passes.
