alter table public.user_profiles
add column if not exists full_name text not null default '';

update public.user_profiles up
set full_name = coalesce(au.raw_user_meta_data ->> 'full_name', up.full_name, ''),
    updated_at = timezone('utc'::text, now())
from auth.users au
where up.user_id = au.id
  and coalesce(up.full_name, '') = ''
  and coalesce(au.raw_user_meta_data ->> 'full_name', '') <> '';

create or replace function public.create_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = case
        when excluded.full_name <> '' then excluded.full_name
        else public.user_profiles.full_name
      end,
      updated_at = timezone('utc'::text, now());

  return new;
end;
$$;
