# Kofa

**AI-powered, Black-conscious 5-point news summaries.**

Kofa delivers concise, AI-generated article summaries that spotlight Black social movements and community impact. Enjoy **7 free stories daily** or subscribe for **unlimited access**.

---

## Quickstart

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/jusbuckingham/kofa-v2.git
   cd kofa-v2
   npm install
   ```
2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Update `.env.local` with your keys (MongoDB, OpenAI, Stripe, SMTP, etc.).
3. **Run the app locally:**
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Features

- **Multi-source news ingestion:** Aggregates from NewsData, GNews, and RSS feeds (defaults include TheGrio, The Root, Capital B, LA Sentinel, Essence). All content passes relevance and junk filtering before AI summarization and storage in MongoDB.
- **Black-conscious summaries:** 5-point bullet summaries emphasizing historical context and community impact.
- **Ranking system:** Trust-list boosts for major outlets plus extra weight for Black publishers (e.g., TheGrio, The Root, LA Sentinel). Fully configurable via environment variables.
- **Metered paywall:** Access 7 free stories per day; unlimited reading with subscription.
- **Authentication:** Secure magic-link email login powered by NextAuth.
- **Billing:** Stripe Checkout and Webhooks integration for subscriptions.
- **Favorites dashboard:** Save and manage stories at `/dashboard`.
- **Admin tools:** Manual fetch and cleanup endpoints available at `/api/admin`.

---

## Technology Stack

- Next.js 15 (App Router, TypeScript)
- MongoDB Atlas (official Node.js driver)
- NextAuth v4 (Email provider)
- Stripe (Checkout & Webhooks)
- OpenAI Node.js SDK
- NewsData / GNews / RSS fallback ingestion
- Tailwind CSS
- Vercel (hosting and cron jobs)

---

## Project Structure

```
app/            # Pages & API routes (NextAuth, news, favorites, Stripe, admin)
components/     # UI components (Header, StoryCard, banners, etc.)
lib/            # Utilities (Mongo client, summarizer, quota, news filters)
scripts/        # Local scripts (e.g., testSummarize.ts)
types.ts        # Shared TypeScript types
middleware.ts   # Route protection
tsconfig.json
```

---

## Cron Jobs & Manual Fetch

- **Vercel Cron:** Automatically triggers `/api/news/fetch` daily at 06:00 UTC by default (configurable in `vercel.json`).
- **Manual fetch:**
  ```bash
  export CRON_SECRET=your_cron_secret
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/news/fetch
  ```

---

## Testing

- **API endpoint:**
  ```bash
  curl http://localhost:3000/api/test-summarize
  ```
- **Local script:**
  ```bash
  npx ts-node --esm scripts/testSummarize.ts
  ```

---

- **Unescaped apostrophes:** Use `&apos;` in JSX/TSX to pass linting on Vercel builds.
- **Session and quota hooks:** Wrap your app with `<SessionProvider>` and `<ReadQuotaProvider>` in `app/providers.tsx`.
- **Blank page issues:** Confirm `app/layout.tsx` and `app/page.tsx` exist; clear the `.next` cache.
- **TypeScript aliasing:** Verify paths in `tsconfig.json` (`@/components`, `@/lib`, `@/types`).
- **Stripe webhooks:** Use Stripe CLI locally or set `STRIPE_WEBHOOK_SECRET` in your environment.

---

## License

MIT © 2025 Jus Kwesi Buckingham