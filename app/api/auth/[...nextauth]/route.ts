import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      id: "demo",
      name: "Demo Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "demo@example.com" },
      },
      async authorize(credentials) {
        if (credentials?.email) {
          // Accept any email for demo
          return { id: credentials.email, email: credentials.email };
        }
        return null;
      },
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET!,
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    // On initial sign in, read subscriptionStatus from MongoDB into token
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: User;
    }) {
      if (user) {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
        const users = db.collection("users");
        const dbUser = await users.findOne({ email: user.email });
        token.subscriptionStatus = dbUser?.subscriptionStatus || "inactive";
      }
      return token;
    },
    // Make subscriptionStatus available in the session
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      (session.user as any).subscriptionStatus = token.subscriptionStatus as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };