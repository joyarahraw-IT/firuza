import type { NextConfig } from 'next';

const config: NextConfig = {
  env: { NEXT_PUBLIC_BIZUM_ENABLED: process.env.STRIPE_BIZUM_ENABLED ?? '' },
  // admin photo uploads go through a server action (up to 10 photos of 12 MB each)
  experimental: { serverActions: { bodySizeLimit: '130mb' } },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' }],
  },
};

export default config;
