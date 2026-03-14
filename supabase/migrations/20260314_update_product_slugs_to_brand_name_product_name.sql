create or replace function public.build_product_slug_source(brand text, product text)
returns text
language sql
immutable
as $$
  select trim(
    both ' '
    from concat_ws(' ', nullif(trim(coalesce(brand, '')), ''), nullif(trim(coalesce(product, '')), ''))
  );
$$;

with ranked_slugs as (
  select
    id,
    case
      when base_slug = '' then 'product-' || left(id::text, 8)
      when row_number() over (partition by base_slug order by created_at, id) = 1 then base_slug
      else base_slug || '-' || row_number() over (partition by base_slug order by created_at, id)
    end as final_slug
  from (
    select
      id,
      created_at,
      public.slugify_text(public.build_product_slug_source(brand_name, product_name)) as base_slug
    from public.products
  ) source
)
update public.products as products
set slug = ranked_slugs.final_slug
from ranked_slugs
where products.id = ranked_slugs.id;

create or replace function public.set_product_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.slug is null
    or btrim(new.slug) = ''
    or (tg_op = 'UPDATE' and (
      new.product_name is distinct from old.product_name
      or new.brand_name is distinct from old.brand_name
    ))
  then
    base_slug := public.slugify_text(public.build_product_slug_source(new.brand_name, new.product_name));

    if base_slug = '' then
      base_slug := 'product';
    end if;

    candidate_slug := base_slug;

    if exists (
      select 1
      from public.products
      where slug = candidate_slug
        and id <> new.id
    ) then
      candidate_slug := base_slug || '-' || left(new.id::text, 8);
    end if;

    new.slug := candidate_slug;
  else
    new.slug := public.slugify_text(new.slug);
  end if;

  return new;
end;
$$;

drop trigger if exists products_set_slug on public.products;

create trigger products_set_slug
before insert or update of brand_name, product_name, slug
on public.products
for each row
execute function public.set_product_slug();
