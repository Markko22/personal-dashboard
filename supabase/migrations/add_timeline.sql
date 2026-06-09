CREATE TABLE public.project_timeline (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  event_date date not null,
  title text not null,
  description text,
  type text not null check (type in ('milestone', 'launch', 'revenue', 'users', 'pivot', 'other')),
  created_at timestamptz not null default now()
);

ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read timeline" ON public.project_timeline FOR SELECT USING (true);
CREATE POLICY "No public write timeline" ON public.project_timeline FOR INSERT WITH CHECK (false);
CREATE POLICY "No public update timeline" ON public.project_timeline FOR UPDATE USING (false);
CREATE POLICY "No public delete timeline" ON public.project_timeline FOR DELETE USING (false);
