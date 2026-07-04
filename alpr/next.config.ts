import type { NextConfig } from "next";

const basePath = process.env.BASE_PATH || "/aipack";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  output: "standalone",
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
