import '../styles/globals.css';
import Header from './components/Header';
import Providers from "./providers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: 'Kofa AI',
  description: 'AI news interpreted through a Black lens',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Safely fetch session for Providers
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (err) {
    console.error("Failed to get session in RootLayout:", err);
  }
  return (
    <html lang="en">
      <body className="antialiased bg-gray-100 dark:bg-gray-900">
        <Providers session={session}>
          <Header />
          <div className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}