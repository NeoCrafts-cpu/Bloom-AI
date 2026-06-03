/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bloom-ai/types"],
  serverExternalPackages: [],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.sosovalue.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },
  async rewrites() {
    const API_BASE =
      process.env.NEXT_PUBLIC_API_URL ?? "https://bloom-ai-mqrb.onrender.com";
    return [
      { source: "/api/:path*", destination: `${API_BASE}/api/:path*` },
      { source: "/health",     destination: `${API_BASE}/health` },
    ];
  },
  webpack(config) {
    // @metamask/sdk (pulled in transitively by wagmi/connectors) tries to
    // import React Native packages that don't exist in a web environment.
    // Stub them out so webpack doesn't fail during static generation.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

module.exports = nextConfig;
