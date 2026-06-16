alter table public.projects add column if not exists total_revenue numeric(10,2) not null default 0;
