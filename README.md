# Kofa AI (kofa-v2)

AI-powered news aggregator and ticker delivering summaries through a culturally conscious Black lens. Built with Next.js, Tailwind CSS, OpenAI, MongoDB, and a simple auth flow.

🚀 Live demo: https://kofa.ai

---

## ✨ Features

- 📰 **Public News Ticker**: Continuously scrolling AI-summarized headlines.
- 🔍 **Interactive Dashboard**: Client-side filters (category, keyword, date range, sort) and infinite scroll.
- ⚙️ **Admin UI**: Trigger RSS fetch & summarization on demand; view last run timestamp.
- 🔄 **Automated Fetch**: Schedule periodic RSS fetches (e.g., via Vercel Cron).
- 🛡 **Protected Routes**: Login/logout flow for accessing `/dashboard` and `/admin`.
- 🤖 **Summarization**: GPT-4o primary with GPT-3.5-turbo fallback and quota-aware handling.

---

## 🧱 Tech Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS** (utility-first styling & animations)
- **MongoDB Atlas** (NoSQL database)
- **OpenAI API** (GPT-4o / GPT-3.5-turbo)
- **Vercel** (deployment & scheduling)
- **Kinde** (auth & billing integration, optional)

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
# MongoDB Atlas
MONGODB_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"

# OpenAI
OPENAI_API_KEY=<your-openai-api-key>

# Base URL (for fetch in server components)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# (Optional) Kinde authentication
KINDE_CLIENT_ID=<your-kinde-client-id>
KINDE_DOMAIN=<your-org.kinde.com>
KINDE_REDIRECT_URI=http://localhost:3000/api/auth/callback
KINDE_LOGOUT_URI=http://localhost:3000
NEXT_PUBLIC_KINDE_BILLING_URL=https://<your-org>.kinde.com/billing
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡 Protected Routes

- **/dashboard**: Interactive news dashboard (login required)
- **/admin**: Admin control panel for manual fetch and system monitoring

---

## 📦 Project Structure

```
app/
├── layout.tsx            # Global layout (header, ticker, logout)
├── page.tsx              # Landing page hero
├── dashboard/
│   └── page.tsx          # Interactive dashboard (client)
├── admin/
│   └── page.tsx          # Admin UI
└── components/
    ├── NewsTicker.tsx    # Scrolling ticker component
    └── ...               # Other shared UI components
app/api/
├── fetch-news/
│   └── route.ts          # RSS fetch & summarization
└── news/
    └── get/
        └── route.ts      # Fetch stored summaries
lib/
├── mongodb.ts            # MongoDB connection helper
└── summarize.ts          # OpenAI summarization with fallback
middleware.ts             # Route protection logic
styles/globals.css        # Global styles and custom animations
```

---

## 📝 Available Scripts

- `npm run dev` – Start the development server  
- `npm run build` – Build for production  
- `npm run start` – Start the production server  
- (Optional) Configure Vercel Cron to hit `/api/fetch-news` periodically

---

## 📄 License

This project is licensed under the MIT License.
