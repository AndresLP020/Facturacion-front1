import type { NextConfig } from "next";
import path from "node:path";
const ancestors = (
  process.env.ALLOWED_FRAME_ANCESTORS ||
  "https://app.gohighlevel.com,https://app.leadconnectorhq.com"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean)
  .join(" ");
// Proxy the API through the frontend's own domain so session/CSRF cookies are first-party.
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");
const config: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd(), ".."),
  turbopack: { root: path.resolve(process.cwd(), "..") },
  async rewrites() {
    if (!backendUrl) return [];
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}; frame-ancestors 'self' ${ancestors}; object-src 'none'; base-uri 'self'`,
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
