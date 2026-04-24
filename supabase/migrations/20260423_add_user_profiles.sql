create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  skin_type text not null default '',
  skin_condition text not null default '',
  age text not null default '',
  skin_tone text not null default '',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.user_profiles enable row level security;

grant select, insert, update on public.user_profiles to authenticated;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
on public.user_profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.user_profiles;
create policy "Users can insert own profile"
on public.user_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_updated_at_timestamp();

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do update
  set email = excluded.email,
      updated_at = timezone('utc'::text, now());

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row
execute function public.create_user_profile();
