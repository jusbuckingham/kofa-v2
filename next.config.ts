// next.config.ts
import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external news image CDNs
  images: {
    remotePatterns: [
      // BBC
      { protocol: "https", hostname: "ichef.bbci.co.uk" },
      { protocol: "https", hostname: "www.bbc.co.uk" },
      { protocol: "https", hostname: "www.bbc.com" },
      // NYTimes
      { protocol: "https", hostname: "static01.nyt.com" },
      { protocol: "https", hostname: "www.nytimes.com" },
      // Common news/image CDNs seen via aggregators
      { protocol: "https", hostname: "i.guim.co.uk" },       // The Guardian
      { protocol: "https", hostname: "media.npr.org" },      // NPR
      { protocol: "https", hostname: "s.yimg.com" },         // Yahoo
      { protocol: "https", hostname: "assets.bwbx.io" },     // Bloomberg
      { protocol: "https", hostname: "images.cnbcfm.com" },  // CNBC
      { protocol: "https", hostname: "img.youtube.com" },    // YouTube thumbs (podcasts/vids)
      // Google-linked CDNs you often see via GNews
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn1.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn2.gstatic.com" },
      { protocol: "https", hostname: "encrypted-tbn3.gstatic.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      // Generic large CDNs frequently used by publishers
      { protocol: "https", hostname: "cdn.vox-cdn.com" },
      { protocol: "https", hostname: "production-cdn.publishers.elsewhere.com" }, // placeholder; safe to keep
      { protocol: "https", hostname: "images.ctfassets.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "pbs.twimg.com" }
    ],
  },

  // Keep the existing webpack alias for expo-secure-store polyfill
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "expo-secure-store": path.resolve(
        __dirname,
        "polyfills/expo-secure-store.js"
      ),
    };
    return config;
  },

  // Helpful defaults
  reactStrictMode: true,
};

export default nextConfig;