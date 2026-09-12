-- Shredlog — schéma Supabase. À coller dans SQL Editor → Run.
-- 1) Table documents (même structure que l'artifact : un chemin "collection/id" → JSON)
create table if not exists public.docs (
  path text primary key,
  collection text not null,
  data jsonb not null default '{}'::jsonb,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
create index if not exists docs_collection_idx on public.docs (user_id, collection);

alter table public.docs enable row level security;
drop policy if exists "own docs" on public.docs;
create policy "own docs" on public.docs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Bucket photos (privé, chaque utilisateur voit son dossier <uid>/...)
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;
drop policy if exists "own photos" on storage.objects;
create policy "own photos" on storage.objects for all
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Ensuite : Authentication → Users → "Add user" (email + mot de passe, "Auto confirm" coché).
--    Authentication → Providers → Email : désactiver "Enable sign ups" (un seul compte).
