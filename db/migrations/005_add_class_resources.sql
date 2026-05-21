alter table public.personajes
  add column if not exists class_resources jsonb not null default '[]'::jsonb;
