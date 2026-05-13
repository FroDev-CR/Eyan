/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "playwright", "playwright-core"],
  },
  // Playwright contiene binarios nativos que no deben empaquetarse
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "playwright", "playwright-core"];
    }
    return config;
  },
};

module.exports = nextConfig;
