import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";
const ancestors = (
  process.env.ALLOWED_FRAME_ANCESTORS ||
  "https://app.gohighlevel.com,https://app.leadconnectorhq.com"
)
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean)
  .join(" ");
const apiOrigin =
  process.env.NODE_ENV === "production"
    ? ""
    : (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const connectSrc = ["'self'", apiOrigin].filter(Boolean).join(" ");
const parent = path.resolve(process.cwd(), "..");
const isMonorepo = existsSync(path.join(parent, "frontend", "package.json"));
const config: NextConfig = {
  ...(isMonorepo
    ? {
        outputFileTracingRoot: parent,
        turbopack: { root: parent },
      }
    : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src ${connectSrc}; frame-ancestors 'self' ${ancestors}; object-src 'none'; base-uri 'self'`,
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
