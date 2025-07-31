# Kofa

**3 concise, Black-conscious bullet-point summaries of the latest news.**

Kofa delivers AI-generated 3-point article summaries through the lens of Black social movements and community impact. Read **3 free stories per day** or subscribe for **unlimited access**.

---

## ⚡ Quickstart (Local Development)

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/jusbuckingham/kofa-v2.git
   cd kofa-v2
   npm install
   # or: yarn install
   ```
2. **Copy and configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Update `.env.local` with your secrets:
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
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # Public
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Cron
   CRON_SECRET=generate_a_random_string
   FREE_READS_PER_DAY=3
   ```
3. **Start the development server**
   ```bash
   npm run dev
   # or: yarn dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000).

---

## 🚀 Core Features

- **News Ingestion**: Fetch multiple RSS feeds, summarize with OpenAI, and store in MongoDB.
- **Black-Conscious Summaries**: AI-generated, 3-point bullet summaries emphasizing historical context and community impact.
- **Metered Paywall**: 3 free reads per day for non-subscribers; unlimited for paying subscribers.
- **Authentication**: Email magic link via NextAuth (with optional demo login in dev).
- **Favorites Dashboard**: Save, view, and manage favorite stories at `/dashboard`.
- **Billing**: Stripe Checkout integration and Webhooks to manage subscription state.
- **Admin Tools**: Manual fetch and cleanup endpoints under `/api/admin`.
- **Test Endpoint**: Call `/api/test-summarize` to validate the 3-point Black-conscious summarization prompt.

---

## 🧱 Tech Stack

- **Next.js 15 (App Router, TypeScript)**
- **MongoDB Atlas** (official Node.js driver)
- **NextAuth v4** (Email provider)
- **Stripe** (Checkout and Webhooks)
- **OpenAI Node.js SDK**
- **Tailwind CSS**
- **Vercel** (Hosting and Cron Jobs)

---

## 📁 Project Structure

```
app/
  layout.tsx            # Root layout + Providers + Header + Quota Banner
  page.tsx              # Home page (infinite scroll + metered paywall)
  signin/page.tsx       # Sign-in (magic link + demo)
  dashboard/page.tsx    # Favorites dashboard
  pricing/page.tsx      # Pricing page + Subscribe button
  api/                  # App Router API routes (NextAuth, news, favorites, stripe, admin)
components/             # Reusable UI components (Header, StoryCard, banners, etc.)
lib/                    # Utility libraries (Mongo client, summarizer, quota helpers)
scripts/                # Local scripts (e.g., testSummarize.ts)
types.ts                # Shared TypeScript types
middleware.ts           # Route protection
tsconfig.json
README.md
```

---

## 🛠️ Cron & Manual Fetch

- **Vercel Cron Jobs**: Configure in your Vercel project settings to call `/api/news/fetch` daily.
- **Manual Trigger**:
  ```bash
  export CRON_SECRET=your_cron_secret
  curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/news/fetch
  ```

---

## 🧪 Testing the Summarizer

```bash
curl http://localhost:3000/api/test-summarize
```

Alternatively, run the local script:
```bash
npx ts-node --esm scripts/testSummarize.ts
```

---

## 💡 Troubleshooting

- **Unescaped apostrophes**: Escape with `&apos;` in JSX to pass ESLint on Vercel.
- **`useSession` / `useQuota` errors**: Ensure `<SessionProvider>` and `<ReadQuotaProvider>` wrap your app in `app/providers.tsx`.
- **Blank page**: Confirm `app/layout.tsx` and `app/page.tsx` exist and you’ve cleared `.next`.
- **TypeScript alias issues**: Verify `tsconfig.json` paths for `@/components`, `@/lib`, and `@/types`.
- **Stripe Webhooks**: Use the Stripe CLI locally or set `STRIPE_WEBHOOK_SECRET` in your env vars.

---

## 📄 License

MIT © 2025 Jus Buckingham