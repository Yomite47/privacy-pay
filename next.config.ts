import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Fix "multiple lockfiles" warning — set root to this project
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    return config;
  },
};

export default nextConfig;
