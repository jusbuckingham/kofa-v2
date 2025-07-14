import NextAuth from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

import type { JWT } from "next-auth/jwt";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/api/auth/signin",
  },
  callbacks: {
    // On initial sign in, read subscriptionStatus from MongoDB into token
    async jwt({ token, user }) {
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
    async session({ session, token }) {
      session.user!.subscriptionStatus = (token as JWT).subscriptionStatus as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };