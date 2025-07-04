// next.config.ts
import path from "path";
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In‐line both public AND server‐only Kinde settings
  env: {
    // server‐side (for auth middleware):
    KINDE_DOMAIN: process.env.KINDE_DOMAIN!,
    KINDE_POST_LOGIN_REDIRECT_URL: process.env.KINDE_POST_LOGIN_REDIRECT_URL!,

    // client‐side (for your wrapper component):
    NEXT_PUBLIC_KINDE_CLIENT_ID: process.env.KINDE_CLIENT_ID!,
    NEXT_PUBLIC_KINDE_DOMAIN: process.env.KINDE_DOMAIN!,
    NEXT_PUBLIC_KINDE_POST_LOGIN_REDIRECT_URL:
      process.env.KINDE_POST_LOGIN_REDIRECT_URL!,
    NEXT_PUBLIC_KINDE_POST_LOGOUT_REDIRECT_URL:
      process.env.KINDE_POST_LOGOUT_REDIRECT_URL!,
  },

  webpack: (config, { isServer }) => {
    // alias expo‐secure‐store to your polyfill
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "expo-secure-store": path.resolve(
        __dirname,
        "polyfills/expo-secure-store.js"
      ),
    };
    return config;
  },
};

export default nextConfig;