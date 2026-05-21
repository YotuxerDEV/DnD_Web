create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  summary text not null default '',
  created_at timestamptz default now()
);

alter table public.personajes
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

alter table public.lore_entries
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

alter table public.campaigns enable row level security;

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
