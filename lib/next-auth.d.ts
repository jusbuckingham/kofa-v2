import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      hasActiveSub: boolean;
      stripeCustomerId: string | null;
    };
  }

  interface User extends DefaultUser {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    hasActiveSub: boolean;
    stripeCustomerId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    hasActiveSub?: boolean;
    stripeCustomerId?: string | null;
    /** internal cache timestamp for metadata lookups */
    metaCheckedAt?: number;
  }
}