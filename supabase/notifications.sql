-- Shredlog · notifications push — à coller UNE fois dans SQL Editor → Run.
-- Projet : zucsemhdglkuifqvhusi (celui de config.js). Relançable sans risque : rien n'est dupliqué.
-- Aucun secret dans ce fichier : le secret du cron est généré dans la base (Vault).

-- ─── Extensions ────────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- ─── Appareils abonnés (un par iPhone / navigateur) ────────────────────────
create table if not exists public.shredlog_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.shredlog_push_subscriptions enable row level security;
drop policy if exists "own push subscriptions" on public.shredlog_push_subscriptions;
create policy "own push subscriptions" on public.shredlog_push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.shredlog_push_subscriptions to authenticated;

-- ─── Journal des envois (rappel stock tous les 3 jours, pas de doublon) ─────
-- Réservé au serveur : ni lecture ni écriture depuis l'app.
create table if not exists public.shredlog_notification_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,                 -- ex. stock:omega3, cycle:tongkat:off:2026-11-23, evening:2026-09-28
  last_sent date not null,           -- date à Bangkok
  primary key (user_id, key)
);
alter table public.shredlog_notification_log enable row level security;
revoke all on public.shredlog_notification_log from anon, authenticated;
grant select, insert, update, delete on public.shredlog_notification_log to service_role;

-- ─── Secrets dans Vault ────────────────────────────────────────────────────
select vault.create_secret('https://zucsemhdglkuifqvhusi.supabase.co', 'shredlog_project_url')
 where not exists (select 1 from vault.secrets where name = 'shredlog_project_url');
select vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'shredlog_cron_secret')
 where not exists (select 1 from vault.secrets where name = 'shredlog_cron_secret');

-- L'Edge Function lit le secret du cron ici (réservé au serveur).
create or replace function public.shredlog_cron_secret()
returns text language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'shredlog_cron_secret'
$$;
revoke execute on function public.shredlog_cron_secret() from public, anon, authenticated;
grant execute on function public.shredlog_cron_secret() to service_role;

-- Appel de l'Edge Function avec le secret partagé.
create schema if not exists shredlog_private;
revoke all on schema shredlog_private from public, anon, authenticated;
create or replace function shredlog_private.call_notify(p_mode text)
returns bigint language sql security definer set search_path = '' as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'shredlog_project_url') || '/functions/v1/shredlog-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'shredlog_cron_secret')),
    body := jsonb_build_object('mode', p_mode),
    timeout_milliseconds := 60000)
$$;
revoke execute on function shredlog_private.call_notify(text) from public, anon, authenticated;

-- ─── Les 4 passages programmés ─────────────────────────────────────────────
-- ATTENTION : pg_cron programme en UTC. Bangkok = UTC+7 toute l'année (pas d'heure d'été).
-- Format : minute heure jour-du-mois mois jour-de-semaine (0 = dimanche, 3 = mercredi).
--   Bangkok mercredi 07:30 = UTC mercredi 00:30  → '30 0 * * 3'   (même jour : 07:30 − 7 h ne passe pas la veille)
--   Bangkok tous les jours 08:00 = UTC 01:00     → '0 1 * * *'
--   Bangkok tous les jours 20:30 = UTC 13:30     → '30 13 * * *'
--   Bangkok dimanche 21:00 = UTC dimanche 14:00  → '0 14 * * 0'   (même jour)
-- Double sécurité : l'Edge Function refuse d'envoyer le rappel « cou » hors mercredi et le rappel
-- hebdo hors dimanche, en recalculant elle-même le jour à Bangkok.
-- cron.schedule remplace un passage existant du même nom : relancer ce fichier ne crée pas de doublon.
select cron.schedule('shredlog-neck',    '30 0 * * 3',  $$ select shredlog_private.call_notify('neck') $$);
select cron.schedule('shredlog-morning', '0 1 * * *',   $$ select shredlog_private.call_notify('morning') $$);
select cron.schedule('shredlog-evening', '30 13 * * *', $$ select shredlog_private.call_notify('evening') $$);
select cron.schedule('shredlog-weekly',  '0 14 * * 0',  $$ select shredlog_private.call_notify('weekly') $$);

-- ─── Vérification explicite UTC → Bangkok (résultat affiché après Run) ─────
-- Pour chaque passage : l'heure UTC programmée, convertie en heure de Bangkok par PostgreSQL lui-même,
-- sur une date réelle (30/09/2026 = mercredi, 04/10/2026 = dimanche).
-- Attendu : 4 lignes, colonne « verdict » = OK partout.
select v.jobname                                                          as passage,
       j.schedule                                                         as cron_utc,
       to_char(v.t at time zone 'UTC', 'Dy DD/MM HH24:MI')                as heure_utc,
       to_char(v.t at time zone 'Asia/Bangkok', 'Dy DD/MM HH24:MI')       as heure_bangkok,
       v.attendu,
       case when j.jobname is null then 'ERREUR : passage absent'
            when j.schedule <> v.cron then 'ERREUR : cron ' || j.schedule || ' au lieu de ' || v.cron
            when extract(dow from v.t at time zone 'UTC') <> v.dow_utc then 'ERREUR : jour UTC'
            when to_char(v.t at time zone 'Asia/Bangkok', 'Dy HH24:MI') <> v.attendu then 'ERREUR : heure Bangkok'
            else 'OK' end                                                 as verdict
from (values
  -- passage,          cron attendu,  instant UTC réel correspondant,          jour UTC (0=dim), attendu à Bangkok
  ('shredlog-neck',    '30 0 * * 3',  timestamptz '2026-09-30 00:30:00+00', 3,                'Wed 07:30'),
  ('shredlog-morning', '0 1 * * *',   timestamptz '2026-09-30 01:00:00+00', 3,                'Wed 08:00'),
  ('shredlog-evening', '30 13 * * *', timestamptz '2026-09-30 13:30:00+00', 3,                'Wed 20:30'),
  ('shredlog-weekly',  '0 14 * * 0',  timestamptz '2026-10-04 14:00:00+00', 0,                'Sun 21:00')
) as v(jobname, cron, t, dow_utc, attendu)
left join cron.job j on j.jobname = v.jobname
order by v.t;
