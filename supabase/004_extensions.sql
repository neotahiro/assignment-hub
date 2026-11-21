-- Personal deadline extensions. Run once in Supabase -> SQL Editor. Safe to re-run. Requires 001-003.
-- A student's own deadline for an item lives in assignment_progress.personal_due (added in 002).
-- This adds an optional note, a server-set timestamp (so you can see WHEN it was set), and sanity checks.
-- The effective deadline used everywhere is the LATER of the class deadline (data.js) and personal_due.

alter table public.assignment_progress
  add column if not exists extension_note text,
  add column if not exists extension_at   timestamptz;

alter table public.assignment_progress drop constraint if exists ap_ext_note_len;
alter table public.assignment_progress add constraint ap_ext_note_len
  check (extension_note is null or char_length(extension_note) <= 300);

alter table public.assignment_progress drop constraint if exists ap_personal_due_range;
alter table public.assignment_progress add constraint ap_personal_due_range
  check (personal_due is null or personal_due between date '2020-01-01' and date '2100-12-31');

alter table public.assignment_progress drop constraint if exists ap_note_needs_date;
alter table public.assignment_progress add constraint ap_note_needs_date
  check (extension_note is null or personal_due is not null);

-- Same trigger as 002, plus: stamp extension_at whenever personal_due is set or changed (students cannot write it).
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

  if tg_op = 'INSERT' then
    new.extension_at := case when new.personal_due is null then null else now() end;
  elsif new.personal_due is distinct from old.personal_due then
    new.extension_at := case when new.personal_due is null then null else now() end;
  else
    new.extension_at := old.extension_at;
  end if;
  return new;
end;
$$;

grant insert (assignment_id, status, priority, personal_due, extension_note) on public.assignment_progress to authenticated;
grant update (assignment_id, status, priority, personal_due, extension_note) on public.assignment_progress to authenticated;
