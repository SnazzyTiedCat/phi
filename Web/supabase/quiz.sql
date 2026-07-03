-- quizzes table
--
-- HOW TO APPLY: paste and run this in the Supabase dashboard → SQL Editor.
-- (This project has no migration tooling yet; this file is the committed record
-- of the schema so it lives in version control alongside the code that uses it.)
--
-- Mirrors the flashcards table exactly: one row per (user_id, source_name), RLS
-- so each student only ever sees their own rows. `questions` holds the generated
-- multiple-choice array as JSON. The unique constraint is what lets /api/quiz
-- upsert (regenerate overwrites instead of duplicating).

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_name text not null,
  questions jsonb not null,
  created_at timestamp with time zone default now(),
  unique(user_id, source_name)
);

alter table quizzes enable row level security;

create policy "Users can manage their own quizzes"
on quizzes for all using (auth.uid() = user_id);

grant insert, select, update, delete on table public.quizzes to authenticated;
