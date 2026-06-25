import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: resolve(root),
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata", "bcryptjs"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ticket.xutil.net" },
    ],
  },
};

export default nextConfig;
