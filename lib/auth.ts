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
      // Re-check DB periodically. Use a short TTL when token shows no sub so upgrades reflect quickly.
      const POS_TTL = 10 * 60 * 1000; // 10 min when active
      const NEG_TTL = 30 * 1000;      // 30 sec when inactive
      const now = Date.now();
      // When a user first logs in, "user" is defined. On subsequent calls, only the token is available.
      const email = user?.email || t.email;
      if (!email) return t;

      const ttl = t.hasActiveSub ? POS_TTL : NEG_TTL;
      if (
        typeof t.stripeCustomerId !== "undefined" &&
        typeof t.metaCheckedAt === "number" &&
        now - t.metaCheckedAt < ttl
      ) {
        return t;
      }

      const db = await getDb();
      interface DbUser {
        email?: string;
        userEmail?: string;
        hasActiveSub?: boolean;
        subscriptionStatus?: string;
        stripeCustomerId?: string | null;
      }
      const coll = db.collection<DbUser>("user_metadata");
      const dbUser = await coll.findOne({ $or: [{ email }, { userEmail: email }] });

      const activeFromStatus = dbUser?.subscriptionStatus === "active";
      t.hasActiveSub = Boolean(dbUser?.hasActiveSub || activeFromStatus);
      t.stripeCustomerId = dbUser?.stripeCustomerId ?? null;
      t.metaCheckedAt = now;

      return t;
    },
    async session({ session, token }) {
      const t = token as ExtendedJWT;
      const su = (session.user ?? ({} as SessionUserWithBilling)) as SessionUserWithBilling;

      // 1) Fast path: copy flags from the JWT
      su.hasActiveSub = Boolean(t.hasActiveSub);
      su.stripeCustomerId = t.stripeCustomerId ?? null;
      session.user = su;

      // 2) Upgrade from DB if it shows active (ensures immediate flip to Pro after checkout)
      try {
        const email = session.user?.email;
        if (email) {
          interface DbUser {
            email?: string;
            userEmail?: string;
            hasActiveSub?: boolean;
            subscriptionStatus?: string;
            stripeCustomerId?: string | null;
          }
          const db = await getDb();
          const coll = db.collection<DbUser>("user_metadata");
          const dbUser = await coll.findOne({ $or: [{ email }, { userEmail: email }] });
          const activeFromStatus = dbUser?.subscriptionStatus === "active";
          const active = Boolean(dbUser?.hasActiveSub || activeFromStatus);
          if (active) {
            (session.user as any).hasActiveSub = true;
            (session.user as any).stripeCustomerId = dbUser?.stripeCustomerId ?? (session.user as any).stripeCustomerId ?? null;
          }
        }
      } catch {
        // ignore DB errors in session callback to avoid breaking auth
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      if (!stripe) {
        // In environments without Stripe configured, skip customer creation.
        const db = await getDb();
        await db
          .collection("user_metadata")
          .updateOne(
            { email: user.email },
            { $set: { hasActiveSub: false } },
            { upsert: true }
          );
        return;
      }

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
    },
  },
};