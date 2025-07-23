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
      // When a user first logs in, "user" is defined. On subsequent calls, only the token is available.
      const email = user?.email || (token.email as string | undefined);
      if (!email) return token;

      // Avoid extra queries if we've already embedded these on the token
      if (typeof token.hasActiveSub !== "undefined" && typeof token.stripeCustomerId !== "undefined") {
        return token;
      }

      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || undefined);
      const coll = db.collection("user_metadata");
      const dbUser = await coll.findOne({ email });

      token.hasActiveSub = !!dbUser?.hasActiveSub;
      token.stripeCustomerId = dbUser?.stripeCustomerId ?? null;

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      const su = session.user as typeof session.user & {
        hasActiveSub: boolean;
        stripeCustomerId: string | null;
      };
      su.hasActiveSub = Boolean(token.hasActiveSub);
      su.stripeCustomerId = (token.stripeCustomerId as string | null) ?? null;
      session.user = su;
      return session;
    },
  },
};