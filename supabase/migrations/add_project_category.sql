-- Migrate projects from is_private/is_company to category (aziendale | personale)

-- 1. Add category column
alter table public.projects
  add column if not exists category text not null default 'personale'
  constraint projects_category_check check (category in ('aziendale', 'personale'));

-- 2. Backfill from is_company when present
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'is_company'
  ) then
    update public.projects
    set category = 'aziendale'
    where is_company = true;

    alter table public.projects drop column is_company;
  end if;
end $$;

-- Manual classification for known seed projects (review in production)
update public.projects
set category = 'aziendale'
where name in ('Cost-Assistant', 'SCIA-SaaS');

update public.projects
set category = 'personale'
where name in ('OpFanta');

-- 3. Drop legacy is_private column after backfill
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'projects'
      and column_name = 'is_private'
  ) then
    alter table public.projects drop column is_private;
  end if;
end $$;

-- 4. Safe view for public aziendali dashboard (no mrr, users_count, private_notes)
create or replace view public.projects_aziendali_safe as
select
  id,
  name,
  tagline,
  status,
  next_milestone,
  stack,
  url_site,
  order_index
from public.projects
where category = 'aziendale';

grant select on public.projects_aziendali_safe to anon;
grant select on public.projects_aziendali_safe to authenticated;

-- 5. RLS: anon reads only the safe view, never the full projects table
drop policy if exists "Public read projects" on public.projects;

revoke all on table public.projects from anon;
grant select on table public.projects to authenticated;

create policy "Authenticated read all projects"
  on public.projects for select
  to authenticated
  using (true);

-- service_role bypasses RLS and retains full read/write access
