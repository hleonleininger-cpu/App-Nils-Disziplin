-- Schema für die Disziplin-App. Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
-- Alle Daten gehören genau einem Konto (Row Level Security über auth.uid()).

-- 1) Kern: ein Eintrag pro Schlüssel (z. B. "day:2026-11-23", "settings", "learn", "books", "pack:<id>")
create table if not exists public.records (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
create index if not exists records_user_updated on public.records (user_id, updated_at);

alter table public.records enable row level security;
drop policy if exists "records_select_own" on public.records;
drop policy if exists "records_insert_own" on public.records;
drop policy if exists "records_update_own" on public.records;
drop policy if exists "records_delete_own" on public.records;
create policy "records_select_own" on public.records for select using (auth.uid() = user_id);
create policy "records_insert_own" on public.records for insert with check (auth.uid() = user_id);
create policy "records_update_own" on public.records for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "records_delete_own" on public.records for delete using (auth.uid() = user_id);

-- 2) Web-Push (optional, nur für Erinnerungen bei geschlossener App)
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text not null unique,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.reminders (
  user_id   uuid        not null references auth.users (id) on delete cascade,
  rid       text        not null,
  fire_at   timestamptz not null,
  title     text        not null,
  body      text        not null,
  hard_body text,
  tag       text,
  sent      boolean     not null default false,
  acked     boolean     not null default false,
  hard_sent boolean     not null default false,
  primary key (user_id, rid)
);
alter table public.reminders enable row level security;
drop policy if exists "reminders_own" on public.reminders;
create policy "reminders_own" on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
