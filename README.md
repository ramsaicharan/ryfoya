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

## How It Is Built And Served

The site is prebuilt. `next build` exports every page as static HTML (`output: 'export'`), and Cloudflare Workers static assets serves it. There is no server at runtime, so the old revalidation endpoint, middleware and Vercel deploy hook are gone.

- Pages read product and persona data from Supabase at build time.
- Sign-in runs in the browser through Supabase.
- `scripts/generate-sitemaps.mjs` runs as `prebuild` and writes `public/sitemaps/**` and `public/_redirects` (ignored by Git).
- `scripts/prepare-cloudflare.mjs` runs after `next build`. It strips navigation `.txt` files, then splits the pages into one Worker per page type, because the free plan allows 20,000 files per Worker:
  - `ryfoya` serves everything not listed below (`out/`)
  - `ryfoya-brand` serves `/sunscreens/best/brand/*` (`out-brand/`)
  - `ryfoya-filter` serves `/sunscreens/best/filter/*` (`out-filter/`)
- A page type over `splitAt` files in `cloudflare.config.json` is split again by its next path segment (`ryfoya-filter-1`, `ryfoya-filter-2`, ...). The generated Wrangler configs go to `.cloudflare/`.
- Routes on ryfoya.com are attached only when `cloudflare.config.json` has `"live": true`. With `false`, deploys go to the `*.workers.dev` test addresses only.
- `www.ryfoya.com` is redirected to `ryfoya.com` by a Cloudflare Redirect Rule (dashboard), not by the Workers.

## Environment Variables

Use these in local development (copy `.env.example` to `.env`):

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://ryfoya.com
```

## Local Development

Install dependencies:

```bash
npm install
```

Commands:

```bash
npm run dev      # dev server
npm run build        # sitemaps + static export (renders ~24,000 pages, about 12 minutes)
npm run preview      # builds, then serves the main Worker locally with wrangler dev
npm run deploy       # builds, then deploys every Worker
npm run deploy:only  # deploys the last build without rebuilding
```

`npm run deploy` from this machine needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment (see `.env.example`).

## Deploying

The GitHub Action `Deploy to Cloudflare` (`.github/workflows/deploy-cloudflare.yml`) builds and deploys on every push to `main`, and can be run by hand. Only one deploy runs at a time, with a 60 minute limit. The repo is public, so Actions minutes are free.

It can also run from a Mac:

```bash
npm run deploy       # rebuild from Supabase, then upload every Worker (only changed files go up)
npm run deploy:only  # upload the last build again without rebuilding
```

That needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in `.env`, next to the Supabase keys.

Required GitHub secrets (repo Settings -> Secrets and variables -> Actions):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

After changing data in Supabase, run the Deploy to Cloudflare workflow manually (Actions tab -> Run workflow -> main). The live site only changes when it is rebuilt and redeployed.

Or with GitHub CLI:

```bash
gh workflow run deploy-cloudflare.yml --ref main
```

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
  - legacy persona URL; 301-redirects to `/sunscreens/best/:route_slug`
  - redirects are written to `public/_redirects` by `scripts/generate-sitemaps.mjs` and applied by Cloudflare

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
  - static sitemap index generated during build and served from `public/sitemap.xml`
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

All build-time data access is centralized in:

- [src/lib/site-data.js](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/lib/site-data.js)
- [src/lib/supabaseServer.js](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/lib/supabaseServer.js)

`site-data.js` is the main architectural boundary for:

- route data loading
- normalization of database rows
- metadata helpers
- pagination
- build-time loading and caching

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

### `/sunscreens/:slug`

Reads:

1. `products` by `slug`
2. `product_skin_scores` by `product_id`
3. `target_personas` to label skin matches
4. `product_ingredients` by `product_id`
5. `ingredients` for ingredient metadata
6. `product_evaluations` for performance scores

The `context` query param is used to pin the originating persona match first when the detail page is opened from a persona page.

## Rendering Model

Every page is rendered to static HTML at build time from Supabase data, so there is no runtime cache or revalidation. Data changes reach the live site only after a rebuild and redeploy (see "Deploying").

## Pagination

Each list is one static page holding every product; the browser shows 24 at a time.

- default page size: `24`
- `?page=N` links still work: the pager reads the query string and updates it as you page

Pagination UI is rendered by:

- [src/components/ListingPager.jsx](/Users/ramcharan/Documents/0toX/sunscreen-analyser/src/components/ListingPager.jsx)

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

See "Deploying" above. Routing is handled by the exported static pages, so no SPA rewrites are needed.

## Current Performance Notes

The main performance improvements already in place are:

- reduced duplicate metadata/page DB work
- list pages paged in the browser, 24 at a time
- slimmer persona payloads for sidebar/footer

Image optimization through `next/image` is intentionally not part of the current setup.

## Repo Notes

- `.env` is intentionally ignored
- the sitemap is generated from Supabase during the build and served as ignored static XML
- footer skin-context links are intentionally limited
- the architecture is route-first, with Supabase access centralized in `site-data.js`
