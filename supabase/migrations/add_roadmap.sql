alter table public.projects add column if not exists roadmap jsonb not null default '[]';
