import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "/styles/globals.css";
import { AuthButtons } from "./components/AuthButtons";
import { KindeWrapper } from "./components/KindeWrapper";

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
        <KindeWrapper>
          <AuthButtons />
          {children}
        </KindeWrapper>
      </body>
    </html>
  );
}
