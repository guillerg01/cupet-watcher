/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ticket.xutil.net" },
    ],
  },
};

export default nextConfig;
