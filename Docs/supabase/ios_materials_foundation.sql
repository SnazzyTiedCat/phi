-- Phi iOS — Chunk 3: isolated materials foundation for the native app.
--
-- Run manually in the Supabase SQL Editor (this project has no migration
-- tooling — this committed file IS the documentation of the schema), AFTER the
-- two manual dashboard steps:
--   1. Authentication -> Providers -> Anonymous Sign-Ins -> enable.
--   2. Settings -> API -> Data API -> Exposed schemas -> add `ios`.
--
-- Lives in the isolated `ios` schema, NOT the web app's `public` schema.
-- Storage path convention Chunk 4 must follow: `{user_id}/{filename}` — the
-- storage policy checks the first path segment against auth.uid().

create schema if not exists ios;

create table if not exists ios.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  storage_path text,
  file_size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ios_materials_user_id_idx on ios.materials(user_id);

alter table ios.materials enable row level security;

create policy "Users can manage their own materials"
on ios.materials for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant usage on schema ios to authenticated;
grant select, insert, update, delete on ios.materials to authenticated;

-- Storage bucket for the actual PDF files. Private (not public) — access is
-- governed entirely by the RLS-style policy below, same principle as the table.
insert into storage.buckets (id, name, public)
values ('ios-materials', 'ios-materials', false)
on conflict (id) do nothing;

create policy "Users can manage their own material files"
on storage.objects for all
using (bucket_id = 'ios-materials' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'ios-materials' and auth.uid()::text = (storage.foldername(name))[1]);
