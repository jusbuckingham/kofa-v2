# Kofa

**Black culturally conscious summaries of the latest news.**

Kofa lets anyone read **3 AI‑summarized stories per day for free** and unlocks **unlimited reads with a paid subscription**. It’s built with the Next.js App Router, MongoDB, NextAuth, and Stripe.

---

## 🔗 Quick Links
- [Tech Stack](#-tech-stack)
- [Quickstart](#-quickstart-local-dev)
- [Environment Variables](#-environment-variables)
- [Auth & Paywall Flow](#-auth--paywall-flow-high-level)
- [Project Structure](#-project-structure)
- [Deploying to Vercel](#-deploying-to-vercel)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap--ideas)

---

## ✨ Features

| Area | What it does |
|------|---------------|
| News ingestion | Fetch RSS feeds, summarize with OpenAI, persist to MongoDB |
| Public home page | “Today’s Top Stories” with client-side pagination / infinite scroll (optional) |
| Auth | Email magic link via NextAuth (with optional local demo login) |
| Metered paywall | 3 free reads/day stored in MongoDB; unlimited for subscribers |
| Favorites | Save/unsave stories and view them in `/dashboard` |
| Billing | Stripe Checkout session creation + webhook to flip `hasActiveSub` |
| Admin tools | Manual fetch endpoint and optional Vercel cron job |

---

## 🧱 Tech Stack

- **Next.js 15 (App Router, TypeScript)**
- **MongoDB Atlas** (official Node driver)
- **NextAuth v4** (Email provider)
- **Stripe** (Checkout + Webhooks)
- **Tailwind CSS**
- **Vercel** (hosting + cron jobs)

---

## 🚀 Quickstart (Local Dev)

1. **Install dependencies**
   ```bash
   npm install
   # or: yarn install
   ```
2. **Create `.env.local`** (see the table below).
3. **Run the dev server**
   ```bash
   npm run dev
   ```
4. Visit <http://localhost:3000>
5. **(Optional) Stripe webhooks locally**
   ```bash
   # If you have the Stripe CLI installed
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

---

## 🔐 Environment Variables

Create `.env.local` and fill in:

```env
# Mongo / OpenAI
MONGODB_URI=your-mongodb-uri
MONGODB_DB_NAME=kofa
OPENAI_API_KEY=sk-...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_long_random_string
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=465
EMAIL_SERVER_USER=postmaster@example.com
EMAIL_SERVER_PASSWORD=super-secret
EMAIL_FROM="Kofa <no-reply@example.com>"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_123
STRIPE_WEBHOOK_SECRET=whsec_123

# Public
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Quota
FREE_READS_PER_DAY=3
```

> **Tip:** Generate a secret quickly: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## 🧭 Project Structure

```
app/
  layout.tsx                     # Root layout – Providers, Header, ReadQuotaBanner
  page.tsx                       # Home page (news list)
  signin/page.tsx                # Magic-link sign in + demo button (dev only)
  dashboard/page.tsx             # Saved stories list
  api/
    auth/[...nextauth]/route.ts  # NextAuth handler (email provider)
    favorites/route.ts           # GET/POST/DELETE favorites
    news/get/route.ts            # Public stories API
    stripe/checkout/route.ts     # Create Stripe Checkout session
    stripe/webhooks/route.ts     # Stripe webhook handler (sets hasActiveSub)
    user/read/route.ts           # Increment & peek read counts
    user/metadata/route.ts       # Update subscription/reads metadata
lib/
  mongodb.ts                     # Mongo Client (clientPromise)
  quota.ts                       # incrementRead / peekQuota helpers
  summarize.ts                   # OpenAI summarization logic
  auth.ts                        # NextAuth options & callbacks
middleware.ts                     # Route protection (/dashboard, /api/favorites, etc.)
```

---

## 🧑‍💻 Auth & Paywall Flow (High Level)

1. **Unauthenticated** users land on `/` and can read up to `FREE_READS_PER_DAY` stories.
2. Each read triggers `POST /api/user/read` → increments `readsToday` in `user_metadata`.
3. When `readsToday >= FREE_READS_PER_DAY`, the **ReadQuotaBanner** appears and links to pricing.
4. **Subscribers** (`hasActiveSub: true`) bypass the meter (limit becomes `null`).
5. Stripe webhook updates `hasActiveSub` on success/cancel/payment_failed events.

---

## 💳 Stripe Setup

1. Create a **Product** and **Price** in Stripe → copy the Price ID to `STRIPE_PRO_PRICE_ID`.
2. Add a webhook endpoint pointing to `/api/stripe/webhooks`.
3. Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
4. During local dev, forward events via Stripe CLI.

---

## 🛠 Scripts

| Script             | Purpose                     |
|--------------------|-----------------------------|
| `npm run dev`      | Start dev server            |
| `npm run build`    | Production build            |
| `npm run start`    | Start prod server locally   |
| `npm run lint`     | Run ESLint                  |

---

## 🚢 Deploying to Vercel

1. Push to GitHub and connect the repo in Vercel.
2. Add all env vars in **Project Settings → Environment Variables**.
3. (Optional) Create a cron job in **Settings → Cron Jobs** to call your news-fetch endpoint.
4. Default build settings are fine: build command `next build`, output `.next`.

---

## 🧰 Troubleshooting

- **"useSession must be wrapped in <SessionProvider />"** – Ensure the provider is in `layout.tsx`.
- **Email auth fails** – Double-check SMTP creds/ports & `EMAIL_FROM` syntax.
- **Stripe webhook signature errors** – Verify `STRIPE_WEBHOOK_SECRET` matches the dashboard.
- **ESLint build errors on Vercel** – Fix the rule or disable it explicitly in `.eslintrc`.
- **TS can’t find augmented types** – Ensure `global.d.ts` is included in `tsconfig.json` (`"**/*.d.ts"`).

---

## 🗺 Roadmap / Ideas

- [ ] Topic filters & search
- [ ] Mobile app shell / PWA install
- [ ] Commenting / community notes
- [ ] Multiple pricing tiers & bundles
- [ ] News source transparency pages

---

## 📄 License

MIT © 2025 Jus Buckingham
