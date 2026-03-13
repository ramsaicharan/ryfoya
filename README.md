# Ryfoya

Ryfoya is a Next.js app that renders skincare landing pages and sunscreen ranking pages directly from Supabase.

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
```

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` still exist only as backward-compatible fallbacks. They are not the preferred config anymore.

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

Start production locally:

```bash
npm run start
```

## Routes

- `/` : homepage
- `/sunscreens` : overall sunscreen rankings from `products.overall_score`
- `/:page_slug` : persona-specific pages from `target_personas`
- `/sitemap.xml` : dynamic sitemap generated from the database

## Data Sources

### Homepage

Reads from `target_personas` for footer skin-context links.

### `/sunscreens`

Reads from `products` and uses:

- `overall_score`
- `overall_pros`
- `overall_cons`
- `spf_rating`
- `pa_rating`
- `filter_type`
- `product_format`

### `/:page_slug`

Reads:

1. `target_personas` by `page_slug`
2. `product_skin_scores` by `persona_id`
3. joined `products` data

## Vercel Deployment

Set these project environment variables in Vercel:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

No SPA rewrite is needed. Routes are server-rendered by Next.js.

## Notes

- `.env` is intentionally ignored and should not be committed.
- The sitemap is generated dynamically from Supabase at request time.
- Footer skin-context links are currently limited to 12 items total.
