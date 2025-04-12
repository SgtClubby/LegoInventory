// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  // or for server side
  webpack(config, { isServer }) {
    if (isServer) {
      config.devtool = "source-map";
    }
    return config;
  },
};

export default nextConfig;
