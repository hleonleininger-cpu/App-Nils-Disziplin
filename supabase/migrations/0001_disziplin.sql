-- Disziplin: Tabellen, Row Level Security, Einladungs-Grundlage, Push.
-- Einmal im Supabase-Dashboard unter SQL Editor einfügen und ausführen (oder: supabase db push).
-- Jede Tabelle gehört je Zeile genau einem Nutzer (user_id). Ohne Login ist nichts lesbar.

-- Gemeinsames Muster: data enthält {"v": <Wert>} (die App schreibt den kompletten Eintrag).

create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,                 -- 'settings' | 'timetable'
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create table if not exists public.day_log (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,                 -- Tageslog: Aufstehzeit, erledigte Blöcke, Wasser, Lernzeit, Abendcheck
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table if not exists public.streak (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,               -- Punkte, Wiedereinstieg, Ausgleich, Nachholliste, Hinweise
  updated_at timestamptz not null default now()
);
create table if not exists public.books (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,               -- Liste der Bücher mit Seiten, Notizen, Zitaten
  updated_at timestamptz not null default now()
);
create table if not exists public.topics (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,                 -- 'topics' (eigene Themen) | 'learn' (Wissensstand)
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create table if not exists public.packs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,                  -- importierte Inhaltspakete
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.excuses (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,                 -- Begründungen für ausgefallene Tage
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create table if not exists public.homework (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  data jsonb not null,               -- Fach, Titel, Fälligkeit, Aufwand, Rest in Minuten
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create table if not exists public.tasks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,                  -- freie Aufgaben (Reserve für spätere Funktionen)
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.reminders (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rid text not null,
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  hard_body text,
  tag text,
  sent boolean not null default false,
  acked boolean not null default false,
  hard_sent boolean not null default false,
  primary key (user_id, rid)
);
create index if not exists reminders_due on public.reminders (fire_at) where sent = false;
create index if not exists reminders_user_idx on public.reminders (user_id);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Row Level Security: nur eigene Zeilen
do $$
declare t text;
begin
  foreach t in array array['settings','day_log','streak','books','topics','packs','excuses','homework','tasks','push_subscriptions','reminders']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own_all" on public.%I', t);
    execute format('create policy "own_all" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Einladungen (Grundlage). Registrierung bleibt vorerst offen, nichts wird abgeschaltet.
-- Codes werden nur als SHA-256 gespeichert. Clients dürfen die Tabelle nicht lesen (RLS ohne Policy).
create table if not exists public.invites (
  code_hash text primary key,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);
alter table public.invites enable row level security;

create or replace function public.redeem_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  update public.invites
     set used_at = now(), used_by = auth.uid()
   where code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex')
     and used_at is null;
  get diagnostics n = row_count;
  return n > 0;
end $$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- Einen Einladungscode anlegen (im SQL Editor, Code selbst wählen):
--   insert into public.invites (code_hash) values (encode(sha256(convert_to('MEIN-GEHEIMER-CODE', 'UTF8')), 'hex'));
