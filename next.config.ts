import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // ヘッダーのアバター（Google アカウントのプロフィール画像）
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }],
  },
};

export default nextConfig;
