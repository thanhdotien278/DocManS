import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: [
    "@rtms/contracts",
    "@rtms/permissions",
    "@rtms/ui-tokens",
    "@rtms/validation"
  ]
};

export default nextConfig;
