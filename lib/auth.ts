import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "./mongodb";
import type { Session, User } from "next-auth";
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
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        const client = await clientPromise;
        const dbUser = await client.db().collection("users").findOne({ email: user.email });
        token.subscriptionStatus = dbUser?.subscriptionStatus || "inactive";
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session.user as any).subscriptionStatus = token.subscriptionStatus as string;
      return session;
    },
  },
};