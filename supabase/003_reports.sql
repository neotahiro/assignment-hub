-- Phase 4: reports table for BOTH weekly and monthly reports. Run once in Supabase -> SQL Editor. Safe to re-run.
-- Replaces the unused weekly_reports table from 002. Rows are written only by the server-side email job
-- (service role) as a record of what was sent; the Reports page on the website calculates live from your history.

drop table if exists public.weekly_reports;

create table if not exists public.period_reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  period       text not null check (period in ('week', 'month')),
  period_start date not null,
  period_end   date not null,
  stats        jsonb not null default '{}'::jsonb,
  emailed_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, period, period_start)          -- one report per student per period: stops double-sending
);

alter table public.period_reports enable row level security;

drop policy if exists "own reports" on public.period_reports;
create policy "own reports" on public.period_reports for select using (user_id = auth.uid());
drop policy if exists "admin read reports" on public.period_reports;
create policy "admin read reports" on public.period_reports for select using (public.is_admin());

revoke all on public.period_reports from anon, authenticated;
grant select on public.period_reports to authenticated;
grant all on public.period_reports to service_role;
