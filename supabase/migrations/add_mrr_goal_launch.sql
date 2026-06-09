alter table public.projects add column if not exists launch_date date;
alter table public.projects add column if not exists mrr_goal numeric(10,2) not null default 0;
alter table public.projects add column if not exists mrr_prev numeric(10,2) not null default 0;
