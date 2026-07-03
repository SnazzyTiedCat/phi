-- BE-1 Part A — learning-chain tables: material → chunks → lesson → flashcards/quiz, plus persisted chat.
-- Additive and idempotent; safe to run any time after ios_materials_foundation.sql.
-- Run manually in the Supabase SQL Editor (this project's no-migration-tooling convention).
--
-- ios.materials already exists (Chunk 3) and is untouched here.
-- chat_messages is keyed off lesson_id (chat is a pause-mid-lesson action, reloaded per lesson).
-- lessons has unique(user_id, material_id, section_index) so regeneration upserts in place:
-- lesson id — and its chat history — survive a regenerate; deleting the material cascades everything.

create extension if not exists vector;  -- enabled now; embedding column deferred until an embedding provider is chosen

create table if not exists ios.chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references ios.materials(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  chunk_index int not null,
  created_at timestamptz not null default now()
);
create index if not exists ios_chunks_material_id_idx on ios.chunks(material_id);
alter table ios.chunks enable row level security;
create policy "Users can manage their own chunks" on ios.chunks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on ios.chunks to authenticated;

create table if not exists ios.lessons (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references ios.materials(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  section_index int not null default 0,
  title text not null,
  content text not null,
  tutor_persona text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, material_id, section_index)
);
alter table ios.lessons enable row level security;
create policy "Users can manage their own lessons" on ios.lessons for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on ios.lessons to authenticated;

create table if not exists ios.flashcards (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references ios.lessons(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  front text not null,
  back text not null,
  created_at timestamptz not null default now()
);
alter table ios.flashcards enable row level security;
create policy "Users can manage their own flashcards" on ios.flashcards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on ios.flashcards to authenticated;

create table if not exists ios.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references ios.lessons(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);
alter table ios.quizzes enable row level security;
create policy "Users can manage their own quizzes" on ios.quizzes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on ios.quizzes to authenticated;

create table if not exists ios.chat_messages (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references ios.lessons(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ios_chat_messages_lesson_id_idx on ios.chat_messages(lesson_id, created_at);
alter table ios.chat_messages enable row level security;
create policy "Users can manage their own chat messages" on ios.chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on ios.chat_messages to authenticated;
