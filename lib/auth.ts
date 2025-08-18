import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { stripe } from "@/lib/stripe";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is required but was not provided.`);
  }
  return value;
}

const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME ?? "default_db_name";

interface ExtendedJWT extends JWT {
  hasActiveSub?: boolean;
  stripeCustomerId?: string | null;
}

type SessionUserWithBilling = Session["user"] & {
  hasActiveSub: boolean;
  stripeCustomerId: string | null;
};

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
        host: getEnvVar("EMAIL_SERVER_HOST"),
        port: Number(getEnvVar("EMAIL_SERVER_PORT")),
        auth: {
          user: getEnvVar("EMAIL_SERVER_USER"),
          pass: getEnvVar("EMAIL_SERVER_PASSWORD"),
        },
      },
      from: getEnvVar("EMAIL_FROM"),
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: getEnvVar("NEXTAUTH_SECRET"),
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, user }) {
      const t = token as ExtendedJWT;
      // When a user first logs in, "user" is defined. On subsequent calls, only the token is available.
      const email = user?.email || t.email;
      if (!email) return t;

      // Avoid extra queries if we've already embedded these on the token
      if (typeof t.hasActiveSub !== "undefined" && typeof t.stripeCustomerId !== "undefined") {
        return t;
      }

      const client = await clientPromise;
      const db = client.db(MONGODB_DB_NAME);
      const coll = db.collection("user_metadata");
      const dbUser = await coll.findOne({ email });

      t.hasActiveSub = !!dbUser?.hasActiveSub;
      t.stripeCustomerId = dbUser?.stripeCustomerId ?? null;

      return t;
    },
    async session({ session, token }) {
      const t = token as ExtendedJWT;
      const su = (session.user ?? ({} as SessionUserWithBilling)) as SessionUserWithBilling;
      su.hasActiveSub = Boolean(t.hasActiveSub);
      su.stripeCustomerId = t.stripeCustomerId ?? null;
      session.user = su;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { email: user.email },
        });
        const client = await clientPromise;
        const db = client.db(MONGODB_DB_NAME);
        await db
          .collection("user_metadata")
          .updateOne(
            { email: user.email },
            { $set: { stripeCustomerId: customer.id, hasActiveSub: false } },
            { upsert: true }
          );
      }
    },
  },
};