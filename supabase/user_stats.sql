-- user_stats table
--
-- HOW TO APPLY: paste and run this in the Supabase dashboard → SQL Editor.
-- (This project has no migration tooling yet; this file is the committed record
-- of the schema so it lives in version control alongside the code that uses it.)
--
-- One row per user (user_id is the primary key, so the upsert in
-- src/lib/user-stats.ts keys on it directly). Tracks the daily study streak and
-- lifetime lesson/quiz tallies surfaced on the dashboard. RLS restricts every
-- student to their own row.

create table if not exists user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak_count integer default 0,
  last_active_date date,
  lessons_completed integer default 0,
  quizzes_completed integer default 0
);

alter table user_stats enable row level security;

create policy "Users manage their own stats" on user_stats for all using (auth.uid() = user_id);

grant insert, select, update on table public.user_stats to authenticated;
