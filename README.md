# Kofa AI (kofa-v2)

AI-powered news aggregator and ticker delivering summaries through a culturally conscious Black lens. Built with Next.js, Tailwind CSS, OpenAI, and MongoDB.

---

## ✨ Features

- 📰 **Public News Ticker**: Continuously scrolling AI-summarized headlines.  
- 🔍 **Interactive Dashboard**: Client-side filters and infinite scroll (planned).  
- ⚙️ **Admin UI**: Trigger RSS fetch and summarize on demand.  
- 🕒 **Scheduled Fetch**: Hit `/api/fetch-news` via Vercel cron (optional).  

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
NEXT_PUBLIC_BASE_URL=http://localhost:3000
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
├── fetch-news/
│   └── route.ts
└── news/
    └── get/
        └── route.ts

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

## 📄 License

This project is licensed under the MIT License.
