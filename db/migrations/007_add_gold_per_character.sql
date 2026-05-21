alter table public.personajes
  add column if not exists gold int not null default 0;
