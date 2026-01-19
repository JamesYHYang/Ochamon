/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@matcha/shared'],
  // Allow pages using useSearchParams to build without Suspense boundaries
  // These pages use client-side rendering and don't need static prerendering
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
