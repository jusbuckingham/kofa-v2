# Kofa

**AI-powered, Black-conscious 3-point summaries of the latest news.**

Kofa delivers concise, AI-generated article summaries that highlight Black social movements and community impact. Enjoy **3 free stories daily** or subscribe for **unlimited access**.

---

## ⚡ Quickstart (Local Development)

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/jusbuckingham/kofa-v2.git
   cd kofa-v2
   npm install
   # or
   yarn install
   ```
2. **Copy and configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Then update `.env.local` with your credentials:
   ```env
   # MongoDB
   MONGODB_URI=your-mongo-uri
   MONGODB_DB_NAME=kofa

   # OpenAI
   OPENAI_API_KEY=sk-...

   # NextAuth
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=generate_a_random_string
   EMAIL_SERVER_HOST=smtp.example.com
   EMAIL_SERVER_PORT=465
   EMAIL_SERVER_USER=postmaster@example.com
   EMAIL_SERVER_PASSWORD=super-secret
   EMAIL_FROM="Kofa <no-reply@example.com>"

   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # News APIs
   GNEWS_API_KEY=your-gnews-api-key
   NEWSDATA_API_KEY=your-newsdata-api-key

   # Public
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Cron
   CRON_SECRET=generate_a_random_string
   FREE_READS_PER_DAY=3
   ```
3. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Core Features

- **News Ingestion:** Fetch news articles using external APIs like GNews and NewsData, summarize with OpenAI, and store results in MongoDB.
- **Black-Conscious Summaries:** AI-generated 3-point bullet summaries emphasizing historical context and community impact.
- **Metered Paywall:** 3 free reads per day for non-subscribers; unlimited access for subscribers.
- **Authentication:** Email magic link via NextAuth, with optional demo login in development.
- **Favorites Dashboard:** Save, view, and manage favorite stories at `/dashboard`.
- **Billing:** Stripe Checkout integration with subscription management via webhooks (checkout, subscription updates, cancellations, payment failures).
- **Admin Tools:** Manual fetch and cleanup endpoints under `/api/admin`.
- **Test Endpoint:** Validate the 3-point Black-conscious summarization prompt at `/api/test-summarize`.

---

## 🧱 Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **MongoDB Atlas** (official Node.js driver)
- **NextAuth v4** (Email provider)
- **Stripe** (Checkout and Webhooks)
- **OpenAI Node.js SDK**
- **GNews / NewsData API** (News ingestion)
- **Tailwind CSS**
- **Vercel** (Hosting and Cron Jobs)

---

## 📁 Project Structure

```
app/
  layout.tsx                    # Root layout, Providers, Header, Quota Banner
  page.tsx                      # Home page (infinite scroll, metered paywall)
  signin/page.tsx               # Sign-in (magic link, demo)
  dashboard/page.tsx            # Favorites dashboard
  dashboard/manage-subscription/page.tsx  # Subscription management UI
  pricing/page.tsx              # Pricing page with Subscribe button
  api/                          # App Router API routes (NextAuth, news, favorites, Stripe, admin)
components/                     # Reusable UI components (Header, StoryCard, banners, etc.)
lib/                            # Utility libraries (Mongo client, summarizer, quota helpers)
scripts/                        # Local scripts (e.g., testSummarize.ts)
types.ts                       # Shared TypeScript types
middleware.ts                  # Route protection
tsconfig.json
README.md
```

---

## 🛠️ Cron & Manual Fetch

- **Vercel Cron Jobs:** Configure in your Vercel project settings to call `/api/news/fetch` daily. The ingestion now relies on API keys for GNews and NewsData rather than RSS feeds.
- **Manual Trigger:**
  ```bash
  export CRON_SECRET=your_cron_secret
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/news/fetch
  ```

---

## 🧪 Testing the Summarizer

Run the test endpoint:
```bash
curl http://localhost:3000/api/test-summarize
```
Or run the local script:
```bash
npx ts-node --esm scripts/testSummarize.ts
```

---

## 💡 Troubleshooting

- **Unescaped apostrophes:** Use `&apos;` in JSX to pass ESLint on Vercel.
- **`useSession` / `useQuota` errors:** Ensure `<SessionProvider>` and `<ReadQuotaProvider>` wrap your app in `app/providers.tsx`.
- **Blank page:** Confirm `app/layout.tsx` and `app/page.tsx` exist and clear `.next`.
- **TypeScript alias issues:** Verify `tsconfig.json` paths for `@/components`, `@/lib`, and `@/types`.
- **Stripe Webhooks:** Use the Stripe CLI locally or set `STRIPE_WEBHOOK_SECRET` in your environment variables.

---

## 📄 License

MIT © 2025 Jus Buckingham