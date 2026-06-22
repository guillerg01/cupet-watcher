/** @type {import('next').NextConfig} */
const nextConfig = {
images: {
    remotePatterns: [
      { protocol: "https", hostname: "ticket.xutil.net" },
    ],
  },
};

export default nextConfig;
