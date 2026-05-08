import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Cloudflare Pages 直接托管静态产物，构建后输出到 out/。
  output: "export",
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
