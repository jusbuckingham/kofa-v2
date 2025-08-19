// next.config.ts
import path from "path";
import { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
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