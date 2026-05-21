-- Add current HP, temporary HP, and saving throws to personajes table

alter table public.personajes
  add column if not exists current_hp int not null default 0;

alter table public.personajes
  add column if not exists temporary_hp int not null default 0;

alter table public.personajes
  add column if not exists saving_throws jsonb not null default '{"str":false,"dex":false,"con":false,"int":false,"wis":false,"cha":false}'::jsonb;
