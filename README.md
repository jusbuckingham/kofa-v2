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

---

## Stripe Webhooks (Live) – Production Checklist

This app expects Stripe webhooks at:

```
https://kofa.ai/api/stripe/webhooks
```

> Stripe will **disable** the endpoint if it returns anything other than HTTP **2xx** repeatedly. Use this checklist to configure and verify production.

### 1) Configure in Stripe Dashboard (LIVE mode)
- Go to **Developers → Webhooks**.
- Select the endpoint for `https://kofa.ai/api/stripe/webhooks` (create it if it doesn’t exist).
- Copy the **Signing secret** — it starts with `whsec_`.

### 2) Configure environment vars in Vercel (Production)
Add/update these in **Vercel → Project → Settings → Environment Variables** (Production):

- `STRIPE_SECRET_KEY` → your **sk_live_...** key
- `STRIPE_WEBHOOK_SECRET` → the **whsec_...** from the Stripe Dashboard for the endpoint above

> ❗ Do not include quotes or extra whitespace. After updating, **redeploy** so the new env vars are available at runtime.

### 3) Relevant events we handle
The webhook route processes (acknowledges all, but specifically handles):
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.created | updated | deleted | paused | resumed | trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 4) Test delivery
- In Stripe Dashboard (LIVE), open the endpoint → **Send test event** (choose one of the supported types above) → confirm a **2xx** in the delivery log.
- Or trigger a real flow (e.g., complete a Checkout Session) and confirm the event shows **2xx** and is listed under **Events → Logs**.

### 5) Troubleshooting
- **400 Invalid signature** → The `STRIPE_WEBHOOK_SECRET` in Vercel doesn’t match the endpoint’s signing secret in the Dashboard. Copy/paste the LIVE `whsec_...` again.
- **500 Server misconfigured** → Missing `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` at runtime.
- **DB connection errors** → The webhook now safely acknowledges with 200 to prevent Stripe retries; check your database credentials and connectivity separately.
- **Middleware interference** → `middleware.ts` already allows `/api/stripe/webhooks` (no auth required). If you change middleware, keep this path whitelisted.

### 6) Observability
The route logs key events without leaking secrets. Check **Vercel → Deployments → Logs** for lines like:

```
[webhook] received { type, id }
[webhook] upsert user { customerId, email, status, hasActiveSub }
```

### 7) Security
- **Never** log full secrets or raw request bodies in production.
- Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set only in server/runtime contexts.

---

## License

MIT © 2025 Jus Kwesi Buckingham