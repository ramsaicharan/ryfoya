-- Reuse existing slugify helper.
-- Assumes public.slugify_text(text) already exists.

-- 1) Generic helpers

create or replace function public.normalize_lookup_value(raw_value text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(coalesce(raw_value, ''), '\s+', ' ', 'g'));
$$;

create or replace function public.normalize_lookup_key(raw_value text)
returns text
language sql
immutable
as $$
  select lower(public.normalize_lookup_value(raw_value));
$$;

create or replace function public.build_unique_lookup_slug(
  lookup_table regclass,
  input_value text,
  existing_id uuid default null
)
returns text
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix_num integer := 1;
  slug_exists boolean;
begin
  base_slug := public.slugify_text(public.normalize_lookup_value(input_value));

  if coalesce(base_slug, '') = '' then
    base_slug := 'item';
  end if;

  candidate_slug := base_slug;

  loop
    execute format(
      'select exists (
         select 1
         from %s
         where slug = $1
           and ($2::uuid is null or id <> $2::uuid)
       )',
      lookup_table
    )
    into slug_exists
    using candidate_slug, existing_id;

    exit when not slug_exists;

    suffix_num := suffix_num + 1;
    candidate_slug := base_slug || '-' || suffix_num;
  end loop;

  return candidate_slug;
end;
$$;

-- 2) Lookup tables

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  source_value text not null,
  normalized_key text not null,
  slug text not null,
  label text not null,
  meta_title text,
  meta_description text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.product_formats (
  id uuid primary key default gen_random_uuid(),
  source_value text not null,
  normalized_key text not null,
  slug text not null,
  label text not null,
  meta_title text,
  meta_description text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists public.filter_types (
  id uuid primary key default gen_random_uuid(),
  source_value text not null,
  normalized_key text not null,
  slug text not null,
  label text not null,
  meta_title text,
  meta_description text,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create unique index if not exists brands_normalized_key_key
on public.brands (normalized_key);

create unique index if not exists brands_slug_key
on public.brands (slug);

create unique index if not exists product_formats_normalized_key_key
on public.product_formats (normalized_key);

create unique index if not exists product_formats_slug_key
on public.product_formats (slug);

create unique index if not exists filter_types_normalized_key_key
on public.filter_types (normalized_key);

create unique index if not exists filter_types_slug_key
on public.filter_types (slug);

-- 3) Lookup upsert helpers

create or replace function public.upsert_brand_lookup(raw_value text)
returns uuid
language plpgsql
as $$
declare
  cleaned_value text;
  normalized text;
  existing_row public.brands%rowtype;
  new_id uuid;
  new_slug text;
begin
  cleaned_value := public.normalize_lookup_value(raw_value);

  if cleaned_value = '' then
    return null;
  end if;

  normalized := public.normalize_lookup_key(cleaned_value);

  select *
  into existing_row
  from public.brands
  where normalized_key = normalized
  limit 1;

  if found then
    update public.brands
    set
      source_value = cleaned_value,
      label = cleaned_value,
      meta_title = format('Best %s Sunscreens | Ryfoya', cleaned_value),
      meta_description = format(
        'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
        cleaned_value
      ),
      updated_at = timezone('utc'::text, now())
    where id = existing_row.id;

    return existing_row.id;
  end if;

  new_id := gen_random_uuid();
  new_slug := public.build_unique_lookup_slug('public.brands'::regclass, cleaned_value, new_id);

  insert into public.brands (
    id,
    source_value,
    normalized_key,
    slug,
    label,
    meta_title,
    meta_description
  )
  values (
    new_id,
    cleaned_value,
    normalized,
    new_slug,
    cleaned_value,
    format('Best %s Sunscreens | Ryfoya', cleaned_value),
    format(
      'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
      cleaned_value
    )
  );

  return new_id;
end;
$$;

create or replace function public.upsert_product_format_lookup(raw_value text)
returns uuid
language plpgsql
as $$
declare
  cleaned_value text;
  normalized text;
  existing_row public.product_formats%rowtype;
  new_id uuid;
  new_slug text;
begin
  cleaned_value := public.normalize_lookup_value(raw_value);

  if cleaned_value = '' then
    return null;
  end if;

  normalized := public.normalize_lookup_key(cleaned_value);

  select *
  into existing_row
  from public.product_formats
  where normalized_key = normalized
  limit 1;

  if found then
    update public.product_formats
    set
      source_value = cleaned_value,
      label = cleaned_value,
      meta_title = format('Best %s Sunscreens | Ryfoya', cleaned_value),
      meta_description = format(
        'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
        cleaned_value
      ),
      updated_at = timezone('utc'::text, now())
    where id = existing_row.id;

    return existing_row.id;
  end if;

  new_id := gen_random_uuid();
  new_slug := public.build_unique_lookup_slug('public.product_formats'::regclass, cleaned_value, new_id);

  insert into public.product_formats (
    id,
    source_value,
    normalized_key,
    slug,
    label,
    meta_title,
    meta_description
  )
  values (
    new_id,
    cleaned_value,
    normalized,
    new_slug,
    cleaned_value,
    format('Best %s Sunscreens | Ryfoya', cleaned_value),
    format(
      'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
      cleaned_value
    )
  );

  return new_id;
end;
$$;

create or replace function public.upsert_filter_type_lookup(raw_value text)
returns uuid
language plpgsql
as $$
declare
  cleaned_value text;
  normalized text;
  existing_row public.filter_types%rowtype;
  new_id uuid;
  new_slug text;
begin
  cleaned_value := public.normalize_lookup_value(raw_value);

  if cleaned_value = '' then
    return null;
  end if;

  normalized := public.normalize_lookup_key(cleaned_value);

  select *
  into existing_row
  from public.filter_types
  where normalized_key = normalized
  limit 1;

  if found then
    update public.filter_types
    set
      source_value = cleaned_value,
      label = cleaned_value,
      meta_title = format('Best %s Sunscreens | Ryfoya', cleaned_value),
      meta_description = format(
        'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
        cleaned_value
      ),
      updated_at = timezone('utc'::text, now())
    where id = existing_row.id;

    return existing_row.id;
  end if;

  new_id := gen_random_uuid();
  new_slug := public.build_unique_lookup_slug('public.filter_types'::regclass, cleaned_value, new_id);

  insert into public.filter_types (
    id,
    source_value,
    normalized_key,
    slug,
    label,
    meta_title,
    meta_description
  )
  values (
    new_id,
    cleaned_value,
    normalized,
    new_slug,
    cleaned_value,
    format('Best %s Sunscreens | Ryfoya', cleaned_value),
    format(
      'Browse the best %s sunscreens ranked on Ryfoya with transparent scoring, formula analysis, and skin-context comparisons.',
      cleaned_value
    )
  );

  return new_id;
end;
$$;

-- 4) Alter products

alter table public.products
add column if not exists brand_id uuid,
add column if not exists product_format_id uuid,
add column if not exists filter_type_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_brand_id_fkey'
  ) then
    alter table public.products
    add constraint products_brand_id_fkey
    foreign key (brand_id) references public.brands(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_format_id_fkey'
  ) then
    alter table public.products
    add constraint products_product_format_id_fkey
    foreign key (product_format_id) references public.product_formats(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_filter_type_id_fkey'
  ) then
    alter table public.products
    add constraint products_filter_type_id_fkey
    foreign key (filter_type_id) references public.filter_types(id);
  end if;
end $$;

create index if not exists products_brand_id_idx
on public.products (brand_id);

create index if not exists products_product_format_id_idx
on public.products (product_format_id);

create index if not exists products_filter_type_id_idx
on public.products (filter_type_id);

-- 5) Sync trigger on products

create or replace function public.sync_product_lookups()
returns trigger
language plpgsql
as $$
begin
  new.brand_id := public.upsert_brand_lookup(new.brand_name);
  new.product_format_id := public.upsert_product_format_lookup(new.product_format);
  new.filter_type_id := public.upsert_filter_type_lookup(new.filter_type);
  return new;
end;
$$;

drop trigger if exists products_sync_lookups on public.products;

create trigger products_sync_lookups
before insert or update of brand_name, product_format, filter_type
on public.products
for each row
execute function public.sync_product_lookups();

-- 6) Backfill existing products

update public.products
set
  brand_name = brand_name,
  product_format = product_format,
  filter_type = filter_type;

-- 7) Optional updated_at triggers for lookup tables

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
before update on public.brands
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists product_formats_set_updated_at on public.product_formats;
create trigger product_formats_set_updated_at
before update on public.product_formats
for each row
execute function public.set_updated_at_timestamp();

drop trigger if exists filter_types_set_updated_at on public.filter_types;
create trigger filter_types_set_updated_at
before update on public.filter_types
for each row
execute function public.set_updated_at_timestamp();
