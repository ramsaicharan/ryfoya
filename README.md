# Ryfoya

Ryfoya is a Next.js App Router site for sunscreen discovery. It renders:

- an overall sunscreen rankings page
- persona-specific sunscreen landing pages
- individual sunscreen detail pages
- static editorial pages such as About, How It Works, and Legal

The site reads product and persona data directly from Supabase.

## Stack

- Next.js App Router
- React
- Supabase
- Standard CSS

## Environment Variables

Use these in local development and on Vercel:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
REVALIDATE_SECRET=your-long-random-secret
```

Legacy fallback support still exists for:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

These are only backward-compatible fallbacks and should not be the primary config.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Cache Revalidation

Production data reads use Next.js data-cache tags. After changing route-driving data in Supabase, call the internal revalidation endpoint so production updates immediately instead of waiting for TTL expiry.

Endpoint:

```bash
POST /api/internal/revalidate
```

Auth:

- set `REVALIDATE_SECRET` in Vercel
- send it as either:
  - `Authorization: Bearer <secret>`
  - `x-revalidate-secret: <secret>`
  - `?secret=<secret>`

Secret value:

- use any long random string
- recommended length: `32+` characters
- example:

```bash
openssl rand -hex 32
```

Recommended payloads:

```bash
curl -X POST "https://ryfoya.com/api/internal/revalidate" \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"scope":"all"}'
```

```bash
curl -X POST "https://ryfoya.com/api/internal/revalidate" \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"scope":"personas"}'
```

Available scopes:

- `all`
- `listings`
- `sitemap`
- `products`
- `personas`
- `lookups`

Use this after changes to:

- `target_personas`
- `products`
- `product_skin_scores`
- `brands`
- `product_formats`
- `filter_types`

Supabase webhook-friendly usage:

- the endpoint also accepts `GET`
- scope can be passed in the query string

Examples:

```text
https://ryfoya.com/api/internal/revalidate?scope=personas&secret=YOUR_SECRET
```

```text
https://ryfoya.com/api/internal/revalidate?scope=lookups&secret=YOUR_SECRET
```

```text
https://ryfoya.com/api/internal/revalidate?scope=products&secret=YOUR_SECRET
```

Recommended Supabase webhook mapping:

- `target_personas` -> `scope=personas`
- `brands`, `product_formats`, `filter_types` -> `scope=lookups`
- `products`, `product_skin_scores` -> `scope=products`

If you want a single simple webhook first, use:

```text
https://ryfoya.com/api/internal/revalidate?scope=all&secret=YOUR_SECRET
```

Start production locally:

```bash
npm run start
```

## Static Sitemap Refresh

Production sitemap files are committed static XML files:

- `public/sitemap.xml`
- `public/sitemaps/**`

The recommended production refresh path is the manual GitHub Action named `Generate static sitemaps`. It checks out `main`, runs the sitemap generator, commits changed sitemap XML files to `main`, pushes to GitHub, and lets Vercel deploy the updated static files.

Run it from the GitHub UI:

```text
Actions -> Generate static sitemaps -> Run workflow -> main
```

Or trigger it with GitHub CLI:

```bash
gh workflow run generate-sitemaps.yml --ref main
```

This command does not require switching your local branch. You can stay on `codex/develop`; the GitHub Action runs separately and pushes the sitemap commit to `main`.

For local preview/debug only:

```bash
npm run sitemap:generate
```

This only writes sitemap XML files on your current local branch. It does not commit, push, or update production.

## Route Architecture

- `/`
  - homepage
  - mostly static
  - rendered by [app/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/page.jsx)

- `/sunscreens`
  - overall sunscreen rankings from `products.overall_score`
  - paginated
  - rendered by [app/sunscreens/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/sunscreens/page.jsx)

- `/:page_slug`
  - persona page from `target_personas`
  - paginated
  - rendered by [app/[page_slug]/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/[page_slug]/page.jsx)

- `/sunscreens/:slug`
  - individual sunscreen detail page
  - rendered by [app/sunscreens/[slug]/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/sunscreens/[slug]/page.jsx)

- `/about`
  - rendered by [app/about/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/about/page.jsx)

- `/how-it-works`
  - rendered by [app/how-it-works/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/how-it-works/page.jsx)

- `/legal`
  - rendered by [app/legal/page.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/legal/page.jsx)

- `/sitemap.xml`
  - static sitemap index served from [public/sitemap.xml](/Users/ramcharan/Documents/0toX/sunscreen-analyser/public/sitemap.xml)
  - child sitemap shards are served from `public/sitemaps/`

## Layout Structure

The global shell lives in [app/layout.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/layout.jsx).

It is responsible for:

- global metadata defaults
- Google Analytics script injection
- top navigation via [src/components/BrandHeader.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/BrandHeader.jsx)
- footer via [src/components/Footer.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/Footer.jsx)

The footer receives a lightweight persona list from Supabase so it can show skin-context links.

## Data Layer

All server-side data access is centralized in:

- [src/lib/site-data.js](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/lib/site-data.js)
- [src/lib/supabaseServer.js](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/lib/supabaseServer.js)

`site-data.js` is the main architectural boundary for:

- route data loading
- normalization of database rows
- metadata helpers
- pagination
- server-side caching

`supabaseServer.js` creates the Supabase server client with the anon key.

## Current Data Flow

### Homepage

The homepage itself is mostly static. The layout fetches lightweight persona data for the footer.

### `/sunscreens`

Reads from `products` using:

- `overall_score`
- `overall_pros`
- `overall_cons`
- `product_buy_link`
- `spf_rating`
- `pa_rating`
- `filter_type`
- `product_format`
- `eco_reef_safety`
- `image_links`

The page also fetches lightweight persona rows for the left-side filter UI.

### `/:page_slug`

Reads:

1. `target_personas` by `page_slug`
2. `product_skin_scores` by `persona_id`
3. joined `products` data for the ranking cards

This route also fetches lightweight persona rows for the filter sidebar.

### `/sunscreens/:slug`

Reads:

1. `products` by `slug`
2. `product_skin_scores` by `product_id`
3. `target_personas` to label skin matches
4. `product_ingredients` by `product_id`
5. `ingredients` for ingredient metadata
6. `product_evaluations` for performance scores

The `context` query param is used to pin the originating persona match first when the detail page is opened from a persona page.

## Caching Strategy

The app is not relying on static prerender for the DB-backed ranking/detail pages.

Instead, it uses cached server fetchers inside [src/lib/site-data.js](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/lib/site-data.js).

This is the current performance model:

- HTML for DB-heavy pages is rendered on demand
- Supabase reads underneath those pages are cached with `unstable_cache`
- repeated metadata/page fetch duplication has been removed where possible
- pagination reduces payload size on list pages

This was chosen because it is operationally safer than forcing full build-time prerender for every DB-backed route.

## Pagination

Current list pages are server-side paginated.

- default page size: `24`
- query param: `?page=2`

Pagination UI is rendered by:

- [src/components/Pagination.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/Pagination.jsx)

## Loading States

Loading skeletons are implemented for the major route segments:

- [app/loading.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/loading.jsx)
- [app/sunscreens/loading.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/sunscreens/loading.jsx)
- [app/[page_slug]/loading.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/[page_slug]/loading.jsx)
- [app/sunscreens/[slug]/loading.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/app/sunscreens/[slug]/loading.jsx)

These improve perceived performance during route transitions.

## Important Components

- [src/components/Header.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/Header.jsx)
  - ranking page hero/header

- [src/components/PersonaChoiceSidebar.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/PersonaChoiceSidebar.jsx)
  - left filter rail on desktop
  - bottom-sheet filter UI on mobile

- [src/components/ProductCard.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/ProductCard.jsx)
  - ranking card UI

- [src/components/SkinMatchTabs.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/SkinMatchTabs.jsx)
  - skin-context match tabs on product detail pages

- [src/components/ProductImageGallery.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/ProductImageGallery.jsx)
  - client-side image gallery on detail pages

## Database Tables Used

- `target_personas`
- `products`
- `product_skin_scores`
- `product_ingredients`
- `ingredients`
- `product_evaluations`

## Index Expectations

Important indexes that should exist:

- `products(slug)` unique
- `products(overall_score desc)` partial on non-null values
- `target_personas(page_slug)` unique
- `product_skin_scores(persona_id, score desc)`
- `product_skin_scores(product_id, persona_id)` unique
- `product_ingredients(product_id, ingredient_position)`
- `product_evaluations(product_id, agent_name)` unique

## Deployment Notes

Set these on Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

No SPA rewrites are needed because routing is handled by Next.js.

## Current Performance Notes

The main performance improvements already in place are:

- cached Supabase fetchers
- reduced duplicate metadata/page DB work
- paginated list pages
- slimmer persona payloads for sidebar/footer
- loading skeletons for route transitions

Image optimization through `next/image` is intentionally not part of the current setup.

## Repo Notes

- `.env` is intentionally ignored
- the sitemap is generated from Supabase by a manual GitHub Action and served as static XML
- footer skin-context links are intentionally limited
- the architecture is route-first, with Supabase access centralized in `site-data.js`
