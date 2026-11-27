const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Content-Security-Policy được gắn theo từng yêu cầu kèm nonce trong src/middleware.ts (lib/csp.ts).
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : [])
];

/** @type {import("next").NextConfig} */
const nextConfig = {
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
