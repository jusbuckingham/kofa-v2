import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { clientPromise, getDb } from "@/lib/mongoClient";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { stripe } from "@/lib/stripe";

function getEnvVar(name: string, options?: { required?: boolean; default?: string }): string {
  const val = process.env[name];
  if (typeof val === "string" && val.length > 0) return val;
  if (options?.default !== undefined) return options.default;
  if (options?.required === false) return "";
  throw new Error(`Missing required env var: ${name}`);
}


interface ExtendedJWT extends JWT {
  hasActiveSub?: boolean;
  stripeCustomerId?: string | null;
  metaCheckedAt?: number;
}

type SessionUserWithBilling = Session["user"] & {
  hasActiveSub: boolean;
  stripeCustomerId: string | null;
};

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    EmailProvider({
      server: {
        host: getEnvVar("EMAIL_SERVER_HOST"),
        port: Number(getEnvVar("EMAIL_SERVER_PORT", { default: "587" })),
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
      // Re-check DB at most every 10 minutes to keep token small & fast.
      const TEN_MIN = 10 * 60 * 1000;
      const now = Date.now();
      // When a user first logs in, "user" is defined. On subsequent calls, only the token is available.
      const email = user?.email || t.email;
      if (!email) return t;

      // Avoid extra queries if values exist and were checked recently
      if (
        typeof t.hasActiveSub !== "undefined" &&
        typeof t.stripeCustomerId !== "undefined" &&
        typeof t.metaCheckedAt === "number" &&
        now - t.metaCheckedAt < TEN_MIN
      ) {
        return t;
      }

      const db = await getDb();
      const coll = db.collection("user_metadata");
      const dbUser = await coll.findOne({ email });

      t.hasActiveSub = !!dbUser?.hasActiveSub;
      t.stripeCustomerId = dbUser?.stripeCustomerId ?? null;
      t.metaCheckedAt = now;

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
        const db = await getDb();
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