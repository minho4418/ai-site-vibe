# AI News

An RSS-powered AI news aggregator for developers and AI engineers.
Built with Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase · Vercel Cron.

## Features

- Card-grid layout with category chips, search, and dark mode
- Like (global counter, one per device) and bookmark (per-device anonymous UUID)
- Hourly RSS ingestion via Vercel Cron — pulls from OpenAI, Google Research, Anthropic, Meta AI, TechCrunch, The Verge, Wired, Hacker News
- Mock-data fallback when Supabase isn't configured, so the UI keeps working through setup

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + CRON_SECRET
npm run dev
```

### Trigger the RSS cron manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ingest
```

## Project layout

```
src/
├── app/
│   ├── api/cron/ingest/route.ts   # RSS ingestion, Bearer CRON_SECRET
│   ├── layout.tsx                 # ThemeProvider + fonts
│   └── page.tsx                   # Server component → getArticles()
├── components/
│   ├── ArticleCard.tsx
│   ├── CategoryFilter.tsx
│   ├── HomeClient.tsx             # Client shell: filter / search / state
│   ├── SearchInput.tsx
│   ├── ThemeProvider.tsx
│   └── ThemeToggle.tsx
└── lib/
    ├── articles.ts                # Server-side fetch + mock fallback
    ├── categories.ts
    ├── feeds.ts                   # RSS feed list + category mapping
    ├── mock-articles.ts
    ├── rss-extract.ts             # Summary / thumbnail / URL normalize
    ├── supabase-browser.ts
    ├── supabase-server.ts
    ├── time.ts
    ├── types.ts
    ├── use-bookmarks.ts           # device_id-scoped, Supabase-backed
    ├── use-device-id.ts
    └── use-likes.ts               # RPC increment_likes, one-per-device

supabase/
└── schema.sql                     # Run once in Supabase SQL Editor

vercel.json                        # Cron: 0 * * * *  → /api/cron/ingest
```

## Deployment

1. Push to GitHub.
2. Import the repo in Vercel.
3. Set environment variables in Vercel Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
4. Redeploy. Vercel Cron will start hitting `/api/cron/ingest` hourly.
