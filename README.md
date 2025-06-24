# Kofa AI (kofa-v2)

AI-powered news ticker delivering culturally conscious summaries. Built with Next.js, OpenAI, MongoDB, and Kinde.

> 🚀 This project will be hosted at [https://kofa.ai](https://kofa.ai)

---

## ✨ Features

- 🔁 Real-time news aggregation from RSS feeds (e.g. NYT)
- 🧠 Summarization using OpenAI GPT-4o with a culturally conscious Black American lens
- 📰 Scrollable news ticker UI
- 🔐 Auth via Kinde (login, logout, protected routes)
- 💳 Billing setup through Kinde + Stripe
- ☁️ Hosted on Vercel with MongoDB Atlas

---

## 🧱 Tech Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS** (custom themes + ticker animation)
- **MongoDB Atlas** (NoSQL database)
- **OpenAI GPT-4o** (summary generation)
- **Kinde** (auth + Stripe billing integration)
- **Vercel** (deployment)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create a `.env.local` file in the root with:

```env
MONGODB_URI=your-mongodb-uri
OPENAI_API_KEY=your-openai-key
KINDE_CLIENT_ID=your-kinde-client-id
KINDE_DOMAIN=your-org.kinde.com
KINDE_REDIRECT_URI=http://localhost:3000/api/auth/callback
KINDE_LOGOUT_URI=http://localhost:3000
NEXT_PUBLIC_KINDE_BILLING_URL=https://your-org.kinde.com/billing
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛡 Protected Routes

- `/dashboard` – only accessible to logged-in users
- `/admin/*` – optionally extend middleware

---

## 📦 Folder Structure Highlights

```
app/
├── layout.tsx           // App shell with KindeProvider + AuthButtons
├── components/          // Reusable UI
├── api/                 // Route handlers (fetch-news, get-news)
lib/                     // MongoDB, OpenAI, Kinde session utils
middleware.ts            // Route protection via Kinde
```

---

## ✅ To-Do (Stretch Goals)

- Search filters and topic tagging
- Real-time updates with websockets
- Personalized summaries by subscription tier

---

## 📄 License

MIT
