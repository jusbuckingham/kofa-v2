import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { KindeProvider } from "@kinde-oss/kinde-auth-nextjs/components";
import { AuthButtons } from "./components/AuthButtons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kofa AI",
  description: "AI news interpreted through a Black lens",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <KindeProvider
          clientId={process.env.KINDE_CLIENT_ID!}
          domain={process.env.KINDE_DOMAIN!}
          redirectUri={process.env.KINDE_REDIRECT_URI!}
          logoutUri={process.env.KINDE_LOGOUT_URI!}
        >
          <AuthButtons />
          {children}
        </KindeProvider>
      </body>
    </html>
  );
}
