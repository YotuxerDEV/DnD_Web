create table if not exists public.campaign_treasury (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  gold int not null default 0,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.campaign_treasury enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'campaign_treasury'
      and policyname = 'Allow all campaign_treasury'
  ) then
    create policy "Allow all campaign_treasury"
      on public.campaign_treasury
      for all
      using (true)
      with check (true);
  end if;
end $$;
