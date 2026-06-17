-- source_meta — per-material display metadata (icon + subject + friendly title).
--
-- A "material" isn't its own table; it's a `source_name` value shared across
-- chunks/sources/lessons/flashcards/quizzes. This table hangs optional, purely
-- presentational metadata off that same (user_id, source_name) identity so the
-- Material Edit panel can let a student pick an icon and label a subject without
-- touching the content tables. RLS keeps every row private to its owner.
--
-- Run this once in the Supabase SQL editor (Supabase → SQL → New query).
create table if not exists source_meta (
  user_id uuid references auth.users(id) on delete cascade,
  source_name text not null,
  display_title text,
  icon text default 'phi',
  subject text,
  primary key (user_id, source_name)
);
alter table source_meta enable row level security;
create policy "Users manage their own source_meta" on source_meta for all using (auth.uid() = user_id);
grant insert, select, update, delete on table public.source_meta to authenticated;
