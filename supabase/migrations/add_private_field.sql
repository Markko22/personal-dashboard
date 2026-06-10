alter table public.projects add column if not exists is_private boolean not null default false;
