import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile exists in $HOME).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
