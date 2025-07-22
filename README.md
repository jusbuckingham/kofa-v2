# Kofa

**Black culturally conscious summaries of the latest news.**

Kofa lets anyone read 3 AI‑summarized stories a day for free and offers unlimited access with a paid subscription. Built with the Next.js App Router, MongoDB, NextAuth, and Stripe.

---

## ✨ Features

| Area | What it does |
|------|---------------|
| News ingestion | Fetch RSS feeds, summarize with OpenAI, store in MongoDB |
| Public home page | "Today’s Top Stories" list with client pagination |
| Auth | Email magic link (NextAuth Email provider) + optional demo login for local dev |
| Metered paywall | 3 free reads / day tracked in MongoDB; banner + CTA when you hit the limit |
| Favorites | Save / unsave from any card, view in `/dashboard` |
| Billing | Stripe Checkout for Pro, webhook to mark users as `pro` |
| Admin tools | Manual fetch endpoint & (optional) cron job on Vercel |

---

## 🧱 Tech Stack

- **Next.js 15 (App Router, TypeScript)**
- **MongoDB Atlas** via the official Node driver
- **NextAuth v4** (email provider)
- **Stripe** (Checkout + Webhooks)
- **Tailwind CSS**
- **Vercel** for hosting & cron

---

## 🚀 Quickstart (Local Dev)

1. **Install deps**
   ```bash
   npm install
   # or: yarn install
   ```
2. **Create `.env.local`** (see table below).
3. **Run dev server**
   ```bash
   npm run dev
   ```
4. Visit http://localhost:3000
5. (Optional) **Stripe webhooks locally**
   ```bash
   # If you have the Stripe CLI installed
   stripe listen --forward-to localhost:3000/api/stripe/webhooks
   ```

---

## 🔐 Environment Variables

Create **`.env.local`** with:

```env
# Mongo / OpenAI
MONGODB_URI=your-mongodb-uri
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
```

> **Tip:** Generate a secret quickly: `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

---

## 🧭 Project Structure

```
app/
  layout.tsx             # Root layout – Providers, Header, Quota banner
  page.tsx               # Home page (news list)
  signin/page.tsx        # Magic-link sign in + demo button (dev only)
  dashboard/page.tsx     # Saved stories + remove button
  components/            # UI & context components
    Header.tsx
    NewsList.tsx
    ReadQuotaContext.tsx
    ReadQuotaBanner.tsx
    ReadCounter.tsx
  api/
    auth/[...nextauth]/route.ts     # NextAuth handler
    favorites/route.ts              # GET/POST/DELETE favorites
    news/get/route.ts               # Public stories API
    stripe/checkout/route.ts        # Create Checkout session
    stripe/webhooks/route.ts        # Stripe webhook handler
    user/read/route.ts              # Increment read count
    user/metadata/route.ts          # Update subscription/reads
lib/
  mongodb.ts
  summarize.ts
middleware.ts                       # Protect routes (/dashboard, /api/favorites, etc.)
```

---

## 🧑‍💻 Auth & Paywall Flow (High Level)

1. **Unauthenticated** user hits home → can read 3 stories/day.
2. Each read calls `/api/user/read` which increments `readsToday` for the user or in a guest cookie.
3. When `readsToday >= 3`, the **ReadQuotaBanner** renders and links to `/pricing`.
4. Pro users skip the meter (flag `subscriptionStatus === 'pro'`).
5. Stripe webhook flips that flag when payment succeeds; cancellation flips it back.

---

## 💳 Stripe Setup

1. Create a **Product** and a **Price** in the Stripe Dashboard → copy the Price ID.
2. Create a webhook endpoint pointing to `/api/stripe/webhooks`.
3. Copy the **Signing secret** to `STRIPE_WEBHOOK_SECRET`.
4. Use the Stripe CLI or `ngrok` during local dev to forward events.

---

## 🛠 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start prod server locally |

---

## 🚢 Deploying to Vercel

1. Push to GitHub → connect repo in Vercel.
2. Add all env vars in **Project Settings → Environment Variables**.
3. (Optional) Add a cron job in **Settings → Cron Jobs** to call `/api/fetch-news`.
4. Set **Build Command** to `next build` and **Output Directory** to `.next` (default).

---

## 🧰 Troubleshooting

- **`useSession must be wrapped in <SessionProvider />`** – ensure `Providers` wraps the app in `layout.tsx`.
- **`Invalid login` for email auth** – verify SMTP creds & ports.
- **`Unexpected token '<'` JSON parse** – your fetch hit an HTML error page; log `res.text()`.
- **ESLint build errors on Vercel** – either fix them or disable specific rules in `.eslintrc`.

---

## 🗺 Roadmap / Ideas

- [ ] Topic filters & search
- [ ] Mobile app shell
- [ ] Commenting / community notes
- [ ] Multiple pricing tiers

---

## 📄 License

MIT © 2025 Jus Buckingham
