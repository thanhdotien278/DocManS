import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Only the clickjacking directive: a script/style policy needs per-request nonces and is not set up yet.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : [])
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  devIndicators: false,
  transpilePackages: [
    "@rtms/contracts",
    "@rtms/permissions",
    "@rtms/ui-tokens",
    "@rtms/validation"
  ]
};

export default nextConfig;
