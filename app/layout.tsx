// app/layout.tsx
import '../styles/globals.css';
import type { Metadata } from "next";
import Header from "./components/Header";
import Providers from "./providers";
import ReadQuotaBanner from "./components/ReadQuotaBanner";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "KOFA",
  description: "Black culturally conscious news summaries",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Header />
          <div className="mx-auto max-w-5xl px-4 py-4 space-y-4">
            <ReadQuotaBanner />
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}