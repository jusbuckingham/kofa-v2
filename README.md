# Kofa

**AI-powered, Black-conscious 3‑point summaries of the news.**

Kofa delivers concise, AI‑generated article summaries that highlight Black social movements and community impact. Readers get **7 free stories daily** or can subscribe for **unlimited access**.

---

## ⚡ Quickstart

1. **Clone and install:**
   ```bash
   git clone https://github.com/jusbuckingham/kofa-v2.git
   cd kofa-v2
   npm install
   ```
2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `.env.local` with your own keys (MongoDB, OpenAI, Stripe, SMTP, etc.).
3. **Run locally:**
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

---

- **News ingestion:** Multi-source pipeline: NewsData → GNews → RSS (with defaults if unset, including TheGrio, The Root, Capital B, LA Sentinel, Essence). All feeds go through relevance/junk filtering → AI summarization → MongoDB.
- **Black‑conscious summaries:** 3‑point bullets emphasizing history & community impact.
- **Ranking lens:** Trust‑list boost for major outlets + extra weight for Black publishers (e.g. TheGrio, The Root, LA Sentinel). Configurable via env vars.
- **Metered paywall:** 7 free reads/day; unlimited for subscribers.
- **Authentication:** Magic‑link email with NextAuth.
- **Billing:** Stripe Checkout + Webhooks.
- **Favorites dashboard:** Save and manage stories at `/dashboard`.
- **Admin tools:** Manual fetch and cleanup endpoints at `/api/admin`.

---

- **Next.js 15** (App Router, TypeScript)
- **MongoDB Atlas** (official Node.js driver)
- **NextAuth v4** (Email provider)
- **Stripe** (Checkout & Webhooks)
- **OpenAI Node.js SDK**
- **NewsData / GNews / RSS fallback** (ingestion)
- **Tailwind CSS**
- **Vercel** (hosting + cron)

---

## 📁 Structure

```
app/            # Pages & API routes (NextAuth, news, favorites, Stripe, admin)
components/     # UI components (Header, StoryCard, banners, etc.)
lib/            # Utilities (Mongo client, summarizer, quota, news filters)
scripts/        # Local scripts (e.g. testSummarize.ts)
types.ts        # Shared TS types
middleware.ts   # Route protection
tsconfig.json
```

---

## 🛠️ Cron & Manual Fetch

- **Vercel Cron:** Calls `/api/news/fetch` once daily (default 06:00 UTC). Adjust in `vercel.json`.
- **Manual run:**
  ```bash
  export CRON_SECRET=your_cron_secret
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/news/fetch
  ```

---

## 🧪 Testing

- **API endpoint:**
  ```bash
  curl http://localhost:3000/api/test-summarize
  ```
- **Local script:**
  ```bash
  npx ts-node --esm scripts/testSummarize.ts
  ```

---

## 💡 Troubleshooting

- **Unescaped apostrophes:** Use `&apos;` in JSX for Vercel lint.
- **Session/quota hooks:** Ensure `<SessionProvider>` + `<ReadQuotaProvider>` wrap `app/providers.tsx`.
- **Blank page:** Confirm `app/layout.tsx` & `app/page.tsx` exist; clear `.next`.
- **TypeScript aliasing:** Verify `tsconfig.json` paths (`@/components`, `@/lib`, `@/types`).
- **Stripe webhooks:** Use Stripe CLI locally or set `STRIPE_WEBHOOK_SECRET`.

---

## 📄 License

MIT © 2025 Jus Buckingham