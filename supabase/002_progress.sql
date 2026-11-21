-- Phase 2: per-student data tables + security rules. Run once in Supabase -> SQL Editor.
-- Safe to re-run. Requires 001_profiles.sql to have been run first.
--
-- Design notes
--  * assignment_id / item_id is the "id" from data.js (e.g. 'fsd-a1'). Assignments are NOT copied
--    into the database; these tables only store each student's own state keyed by that id.
--  * Every private table: students touch only their own rows (user_id = auth.uid()); admins can read all.
--  * progress_log is append-only and written by a trigger, so history cannot be edited from the browser.
--  * weekly_reports is written only by the server-side email job (service role).

-- ---------- profiles: add email preference + explicit grants ----------
alter table public.profiles add column if not exists email_reports boolean not null default true;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, email_reports) on public.profiles to authenticated;

-- ---------- assignment_progress ----------
create table if not exists public.assignment_progress (
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assignment_id text not null check (char_length(assignment_id) between 1 and 100),
  status        text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority      smallint not null default 0 check (priority between 0 and 3),  -- 0 none, 1 low, 2 medium, 3 high
  personal_due  date,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, assignment_id)
);

-- ---------- notes ----------
create table if not exists public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assignment_id text check (assignment_id is null or char_length(assignment_id) between 1 and 100),
  body          text not null check (char_length(body) between 1 and 10000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

-- ---------- calendar_events (personal events; assignment due dates come from data.js) ----------
create table if not exists public.calendar_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 200),
  event_date    date not null,
  note          text check (note is null or char_length(note) <= 2000),
  assignment_id text check (assignment_id is null or char_length(assignment_id) between 1 and 100),
  created_at    timestamptz not null default now()
);
create index if not exists calendar_events_user_idx on public.calendar_events (user_id, event_date);

-- ---------- progress_log (append-only history) ----------
create table if not exists public.progress_log (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  assignment_id text not null,
  old_status    text,
  new_status    text not null,
  changed_at    timestamptz not null default now()
);
create index if not exists progress_log_user_idx on public.progress_log (user_id, changed_at desc);

-- ---------- weekly_reports (written by the server-side job only) ----------
create table if not exists public.weekly_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  week_start  date not null,
  stats       jsonb not null default '{}'::jsonb,
  emailed_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------- triggers ----------
-- Both run as owner so students cannot skip them.
-- 1) BEFORE: keep updated_at / completed_at honest.
create or replace function public.progress_before_write() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at := now();
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then new.completed_at := now();
    else new.completed_at := old.completed_at; end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists progress_before_write on public.assignment_progress;
create trigger progress_before_write before insert or update on public.assignment_progress
  for each row execute function public.progress_before_write();

-- 2) AFTER: append a history row for every real status change.
--    (AFTER INSERT does not fire when an upsert turns into an update, so nothing is logged twice.)
create or replace function public.progress_after_write() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'todo' then
      insert into public.progress_log (user_id, assignment_id, old_status, new_status)
      values (new.user_id, new.assignment_id, null, new.status);
    end if;
  elsif new.status is distinct from old.status then
    insert into public.progress_log (user_id, assignment_id, old_status, new_status)
    values (new.user_id, new.assignment_id, old.status, new.status);
  end if;
  return null;
end;
$$;
drop trigger if exists progress_after_write on public.assignment_progress;
create trigger progress_after_write after insert or update on public.assignment_progress
  for each row execute function public.progress_after_write();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end; $$;
drop trigger if exists notes_touch on public.notes;
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- ---------- row level security ----------
alter table public.assignment_progress enable row level security;
alter table public.notes               enable row level security;
alter table public.calendar_events     enable row level security;
alter table public.progress_log        enable row level security;
alter table public.weekly_reports      enable row level security;

-- own rows: full control on progress / notes / events
drop policy if exists "own progress" on public.assignment_progress;
create policy "own progress" on public.assignment_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own events" on public.calendar_events;
create policy "own events" on public.calendar_events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- own rows: read-only for history and reports
drop policy if exists "own log" on public.progress_log;
create policy "own log" on public.progress_log for select using (user_id = auth.uid());
drop policy if exists "own reports" on public.weekly_reports;
create policy "own reports" on public.weekly_reports for select using (user_id = auth.uid());

-- admins can read everything
drop policy if exists "admin read progress" on public.assignment_progress;
create policy "admin read progress" on public.assignment_progress for select using (public.is_admin());
drop policy if exists "admin read notes" on public.notes;
create policy "admin read notes" on public.notes for select using (public.is_admin());
drop policy if exists "admin read events" on public.calendar_events;
create policy "admin read events" on public.calendar_events for select using (public.is_admin());
drop policy if exists "admin read log" on public.progress_log;
create policy "admin read log" on public.progress_log for select using (public.is_admin());
drop policy if exists "admin read reports" on public.weekly_reports;
create policy "admin read reports" on public.weekly_reports for select using (public.is_admin());

-- ---------- grants (the browser role gets only what it needs; nothing for anon) ----------
revoke all on public.assignment_progress, public.notes, public.calendar_events,
              public.progress_log, public.weekly_reports from anon, authenticated;

grant select, delete on public.assignment_progress to authenticated;
grant insert (assignment_id, status, priority, personal_due) on public.assignment_progress to authenticated;
-- assignment_id must be updatable because the browser saves with an upsert (ON CONFLICT DO UPDATE).
grant update (assignment_id, status, priority, personal_due) on public.assignment_progress to authenticated;

grant select, delete on public.notes to authenticated;
grant insert (assignment_id, body) on public.notes to authenticated;
grant update (assignment_id, body) on public.notes to authenticated;

grant select, delete on public.calendar_events to authenticated;
grant insert (title, event_date, note, assignment_id) on public.calendar_events to authenticated;
grant update (title, event_date, note, assignment_id) on public.calendar_events to authenticated;

grant select on public.progress_log  to authenticated;
grant select on public.weekly_reports to authenticated;

-- server-side jobs (GitHub Actions with the service key) need full access
grant all on public.profiles, public.assignment_progress, public.notes, public.calendar_events,
             public.progress_log, public.weekly_reports to service_role;
grant usage, select on all sequences in schema public to service_role;
