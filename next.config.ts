import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        hostname: "shop.ize.capital",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;

// Cloudflare Workers 本地开发需要初始化 OpenNext 适配层。
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
