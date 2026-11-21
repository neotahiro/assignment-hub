-- Phase 1: profiles + roles. Run once in Supabase -> SQL Editor.

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  avatar_url text,
  role       text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admin check runs as the table owner so the policy below can't recurse into itself.
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles for select using (public.is_admin());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Students may only change their display name / avatar, never their role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on public.profiles to authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- Auto-create a profile the first time someone signs in with Google.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- AFTER you have signed in once, make yourself admin (replace the email):
-- update public.profiles set role = 'admin' where email = 'you@gmail.com';
