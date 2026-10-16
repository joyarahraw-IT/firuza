'use client';
import Link from 'next/link';
import { useBagCount } from '@/lib/bag';
import { BagIcon } from './Icons';

export function BagButton({ label, className }: { label: string; className: string }) {
  const n = useBagCount();
  return (
    <Link href="/bolsa" className={`${className} relative`} aria-label={n ? `${label}, ${n}` : label}>
      <BagIcon />
      {n > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-firuza-ink px-1 text-[11px] font-semibold leading-none text-on-firuza-ink">
          {n}
        </span>
      )}
    </Link>
  );
}
