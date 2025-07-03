import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable the App Router
  appDir: true,

  // Alias expo-secure-store to a no-op polyfill
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'expo-secure-store': path.resolve(__dirname, 'polyfills/expo-secure-store.js'),
    };
    return config;
  },
};

export default nextConfig;