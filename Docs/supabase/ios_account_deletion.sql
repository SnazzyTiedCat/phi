-- Not applied. Review, then apply in the Supabase SQL editor.
--
-- Account deletion for the iOS app. Run after ios_materials_foundation.sql,
-- which creates the `ios` schema and its Data API exposure.
--
-- Deleting the auth user cascades to every ios.* row: each ios table's user_id
-- references auth.users(id) on delete cascade. Storage objects have no foreign
-- key, so after this succeeds the app removes its files with the still-local
-- access token before signing out. Keep this order so a missing or failing RPC
-- never leaves a live account with material rows pointing at deleted files.
--
-- Lives in `ios`, not `public`, matching the rest of the iOS schema.
-- Idempotent: safe to re-run.

create or replace function ios.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function ios.delete_my_account() from public, anon;
grant execute on function ios.delete_my_account() to authenticated;
