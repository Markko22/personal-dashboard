-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null check (char_length(tagline) <= 80),
  status text not null check (status in ('idea', 'building', 'beta', 'live', 'paused', 'archived')),
  next_milestone text,
  mrr numeric(10, 2) not null default 0,
  mrr_goal numeric(10, 2) not null default 0,
  mrr_prev numeric(10, 2) not null default 0,
  launch_date date,
  idea_date date,
  build_start_date date,
  users_count integer not null default 0,
  stack text[] not null default '{}',
  url_site text,
  url_repo text,
  url_substack text,
  private_notes text,
  category text not null default 'personale' check (category in ('aziendale', 'personale')),
  roadmap jsonb not null default '[]',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- Wizard session state for Telegram /add command (serverless-safe)
create table if not exists public.telegram_sessions (
  chat_id bigint primary key,
  step text not null,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Project timeline events
create table if not exists public.project_timeline (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  event_date date not null,
  title text not null,
  description text,
  type text not null check (type in ('milestone', 'launch', 'revenue', 'users', 'pivot', 'other')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.projects enable row level security;
alter table public.project_timeline enable row level security;
alter table public.telegram_sessions enable row level security;

-- Anon: no direct access to projects (reads via projects_aziendali_safe view only)
revoke all on table public.projects from anon;
grant select on table public.projects to authenticated;

create policy "Authenticated read all projects"
  on public.projects for select
  to authenticated
  using (true);

-- Safe public view for aziendali dashboard
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

-- No public write on projects (only service_role bypasses RLS)
create policy "No public insert projects"
  on public.projects for insert
  with check (false);

create policy "No public update projects"
  on public.projects for update
  using (false);

create policy "No public delete projects"
  on public.projects for delete
  using (false);

-- telegram_sessions: service_role only (no anon access)
create policy "No public access telegram_sessions"
  on public.telegram_sessions for all
  using (false);

-- project_timeline: public read only
create policy "Public read timeline"
  on public.project_timeline for select
  using (true);

create policy "No public write timeline"
  on public.project_timeline for insert
  with check (false);

create policy "No public update timeline"
  on public.project_timeline for update
  using (false);

create policy "No public delete timeline"
  on public.project_timeline for delete
  using (false);

-- Enable Realtime for live dashboard updates
alter publication supabase_realtime add table public.projects;

-- Migration (run once if mrr was previously integer):
-- alter table public.projects alter column mrr type numeric(10, 2) using mrr::numeric(10, 2);
