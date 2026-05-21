-- Add per-character armor fields to personajes table

alter table public.personajes
  add column if not exists armor_name text not null default '';

alter table public.personajes
  add column if not exists armor_base_ac int not null default 10;

alter table public.personajes
  add column if not exists armor_max_dex_mod int;

alter table public.personajes
  add column if not exists armor_bonus int not null default 0;
