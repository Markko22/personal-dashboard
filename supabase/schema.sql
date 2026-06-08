-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null check (char_length(tagline) <= 80),
  status text not null check (status in ('idea', 'building', 'beta', 'live', 'paused', 'archived')),
  next_milestone text,
  mrr integer not null default 0,
  users_count integer not null default 0,
  stack text[] not null default '{}',
  url_site text,
  url_repo text,
  url_substack text,
  private_notes text,
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

-- RLS
alter table public.projects enable row level security;
alter table public.telegram_sessions enable row level security;

-- Public read on projects (anon key can SELECT)
create policy "Public read projects"
  on public.projects for select
  using (true);

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

-- Enable Realtime for live dashboard updates
alter publication supabase_realtime add table public.projects;
