'use client';
import { useMemo, useSyncExternalStore } from 'react';

// The bag lives in localStorage. Each line keeps a snapshot for display; the SERVER recomputes every price from the
// database when the order is placed (create_order), so tampering with this data changes nothing.
const KEY = 'hilvana-bag';

export type BagLine = {
  variantId: string;
  slug: string;
  name: string;
  options: Record<string, string>;
  priceCents: number;
  qty: number;
  imageKey: string;
  mode: 'made_to_order' | 'shipped';
  making: [number, number] | null;
  shipping: [number, number] | null;
  /** "A medida" clothing: body measurements in cm (60-150); validated again by the database */
  measurements?: { bust_cm: number; waist_cm: number; hip_cm: number };
};

/** A line is a variant plus (for made-to-measure clothing) its measurements. */
export const lineKey = (l: Pick<BagLine, 'variantId' | 'measurements'>) =>
  l.measurements ? `${l.variantId}|${l.measurements.bust_cm}-${l.measurements.waist_cm}-${l.measurements.hip_cm}` : l.variantId;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', cb);
  };
};
const raw = () => {
  try {
    return localStorage.getItem(KEY) ?? '[]';
  } catch {
    return '[]';
  }
};
const write = (lines: BagLine[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode: bag just will not persist */
  }
  emit();
};
const parse = (s: string): BagLine[] => {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

export const addToBag = (line: BagLine) => {
  const lines = parse(raw());
  const i = lines.findIndex((l) => lineKey(l) === lineKey(line));
  if (i >= 0) lines[i] = { ...lines[i], ...line, qty: Math.min(10, lines[i].qty + line.qty) };
  else lines.push({ ...line, qty: Math.min(10, line.qty) });
  write(lines);
};
export const setQty = (key: string, qty: number) =>
  write(parse(raw()).map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(10, qty)) } : l)));
export const removeLine = (key: string) => write(parse(raw()).filter((l) => lineKey(l) !== key));
export const clearBag = () => write([]);

/** Bag lines. `ready` is false during server render / first paint so the UI never flashes an empty bag. */
export function useBag() {
  const s = useSyncExternalStore(subscribe, raw, () => 'SSR');
  return useMemo(() => ({ ready: s !== 'SSR', lines: s === 'SSR' ? [] : parse(s) }), [s]);
}

export const useBagCount = () => useBag().lines.reduce((n, l) => n + l.qty, 0);
