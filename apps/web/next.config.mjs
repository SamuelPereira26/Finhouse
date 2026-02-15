/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@finhouse/core', '@finhouse/db'],
  experimental: {
    externalDir: true,
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default nextConfig;
