import type { NextConfig } from "next";
import packageJson from "./package.json";

const buildCommit = [process.env.VERCEL_GIT_COMMIT_SHA, process.env.GITHUB_SHA]
  .find((value) => /^[0-9a-f]{7,64}$/i.test(value ?? ""))
  ?.slice(0, 12)
  .toLowerCase() ?? "local";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // These are intentionally limited to release identifiers, never deployment secrets.
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_BUILD_COMMIT: buildCommit,
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(self)" },
        { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://checkout.stripe.com; object-src 'none'" },
      ],
    }];
  },
};

export default nextConfig;
