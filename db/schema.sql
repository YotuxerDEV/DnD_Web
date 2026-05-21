-- DnD Web - Supabase schema bootstrap
-- Ejecuta este archivo en Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text not null default '',
  access_word text,
  created_at timestamptz default now()
);

alter table public.campaigns
  add column if not exists access_word text;

create table if not exists public.personajes (
  id text primary key,
  campaign_id uuid references public.campaigns(id) on delete set null,
  nombre text not null,
  clase text not null default 'fighter',
  race_key text not null default 'humano',
  level int not null default 1,
  abilities jsonb not null default '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}'::jsonb,
  hit_rolls jsonb not null default '[]'::jsonb,
  feats jsonb not null default '[]'::jsonb,
  history_blog text not null default '',
  journal_entries jsonb not null default '[]'::jsonb,
  skill_proficiencies jsonb not null default '[]'::jsonb,
  inventory_items jsonb not null default '[]'::jsonb,
  spell_slots jsonb not null default '{"1":{"max":0,"used":0},"2":{"max":0,"used":0},"3":{"max":0,"used":0},"4":{"max":0,"used":0},"5":{"max":0,"used":0},"6":{"max":0,"used":0},"7":{"max":0,"used":0},"8":{"max":0,"used":0},"9":{"max":0,"used":0}}'::jsonb,
  spells_by_level jsonb not null default '{"0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[],"7":[],"8":[],"9":[]}'::jsonb,
  class_resources jsonb not null default '[]'::jsonb,
  action_features jsonb not null default '{"actions":[],"bonusActions":[],"reactions":[]}'::jsonb,
  current_hp int not null default 0,
  temporary_hp int not null default 0,
  saving_throws jsonb not null default '{"str":false,"dex":false,"con":false,"int":false,"wis":false,"cha":false}'::jsonb,
  armor_name text not null default '',
  armor_base_ac int not null default 10,
  armor_max_dex_mod int,
  armor_bonus int not null default 0,
  created_at timestamptz default now()
);

alter table public.personajes
  add column if not exists journal_entries jsonb not null default '[]'::jsonb;

alter table public.personajes
  add column if not exists skill_proficiencies jsonb not null default '[]'::jsonb;

alter table public.personajes
  add column if not exists inventory_items jsonb not null default '[]'::jsonb;

alter table public.personajes
  add column if not exists spell_slots jsonb not null default '{"1":{"max":0,"used":0},"2":{"max":0,"used":0},"3":{"max":0,"used":0},"4":{"max":0,"used":0},"5":{"max":0,"used":0},"6":{"max":0,"used":0},"7":{"max":0,"used":0},"8":{"max":0,"used":0},"9":{"max":0,"used":0}}'::jsonb;

alter table public.personajes
  add column if not exists spells_by_level jsonb not null default '{"0":[],"1":[],"2":[],"3":[],"4":[],"5":[],"6":[],"7":[],"8":[],"9":[]}'::jsonb;

alter table public.personajes
  add column if not exists class_resources jsonb not null default '[]'::jsonb;

alter table public.personajes
  add column if not exists action_features jsonb not null default '{"actions":[],"bonusActions":[],"reactions":[]}'::jsonb;

alter table public.personajes
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

alter table public.personajes
  add column if not exists armor_name text not null default '';

alter table public.personajes
  add column if not exists armor_base_ac int not null default 10;

alter table public.personajes
  add column if not exists armor_max_dex_mod int;

alter table public.personajes
  add column if not exists armor_bonus int not null default 0;

alter table public.personajes enable row level security;

alter table public.campaigns enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'personajes'
      and policyname = 'Allow all personajes'
  ) then
    create policy "Allow all personajes"
      on public.personajes
      for all
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'campaigns'
      and policyname = 'Allow all campaigns'
  ) then
    create policy "Allow all campaigns"
      on public.campaigns
      for all
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists public.lore_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete set null,
  title text not null,
  region text not null,
  summary text not null,
  content text default '',
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.lore_entries enable row level security;

alter table public.lore_entries
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'lore_entries'
      and policyname = 'Allow all lore_entries'
  ) then
    create policy "Allow all lore_entries"
      on public.lore_entries
      for all
      using (true)
      with check (true);
  end if;
end $$;
