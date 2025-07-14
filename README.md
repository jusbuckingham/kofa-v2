# Kofa AI (kofa-v2)

AI-powered news aggregator and ticker delivering summaries through a culturally conscious Black lens, with user authentication and metered access.

---

## ✨ Features

- 📰 **Public News Ticker**: Continuously scrolling AI-summarized headlines.  
- 🔒 **User Accounts & Authentication**: Email-based sign-in via NextAuth.  
- ⭐ **Saved Stories / Favorites**: Users can save and unsave articles in their dashboard.  
- ⏳ **Metered Paywall**: Free users read up to 3 stories per day; Pro subscribers get unlimited access.  
- 💳 **Subscription Billing**: Stripe integration for paid subscriptions and automated webhook handling.  
- ⚙️ **Admin UI**: Trigger RSS fetch and summarize on demand.  
- 🕒 **Scheduled Fetch**: Vercel Cron hit `/api/fetch-news` periodically (optional).  

---

## 🧱 Tech Stack

- **Next.js** (App Router, TypeScript)  
- **Tailwind CSS**  
- **MongoDB Atlas**  
- **OpenAI API**  
- **Vercel**  

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥16  
- npm or Yarn account for dependencies  
- MongoDB Atlas cluster  
- OpenAI API key  

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root with:

```env
MONGODB_URI=<your MongoDB Atlas connection string>
OPENAI_API_KEY=<your OpenAI API key>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your NextAuth secret>
STRIPE_SECRET_KEY=<your Stripe secret key>
STRIPE_PRO_PRICE_ID=<your Stripe price ID>
STRIPE_WEBHOOK_SECRET=<your Stripe webhook secret>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Polyfills

If you see errors related to `expo-secure-store`, a shim is provided in `/polyfills/expo-secure-store.js`. No additional action is needed.

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Structure

```
app/
├── layout.tsx
├── page.tsx
├── dashboard/
│   └── page.tsx
├── admin/
│   └── page.tsx
└── components/
    └── NewsTicker.tsx

app/api/
├── auth/[...nextauth]/route.ts
├── stripe/
│   ├── checkout/route.ts
│   └── webhooks/route.ts
├── user/
│   └── read/route.ts
├── favorites/route.ts
└── user/metadata/route.ts

lib/
├── mongodb.ts
└── summarize.ts

middleware.ts
styles/globals.css
```

---

## 📝 Available Scripts

- `npm run dev` – Start the development server  
- `npm run build` – Build for production  
- `npm run start` – Start the production server  
- (Optional) Configure Vercel Cron to hit `/api/fetch-news` periodically

---

## 🛠 Development Tips

- Use `ngrok` or Vercel Preview Deployments to test Stripe webhooks locally.  
- Monitor read-quota events by inspecting `/api/user/read` responses.  
- Customize your MQTT fetch schedule via the Vercel Cron configuration.  

---

## 📄 License

This project is licensed under the MIT License.
