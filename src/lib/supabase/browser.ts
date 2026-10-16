'use client';
import { createBrowserClient } from '@supabase/ssr';
import { SHOP_COOKIE } from './config';

/** Browser client for the shop session (publishable key only). */
export const shopBrowserClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: { name: SHOP_COOKIE },
  });
