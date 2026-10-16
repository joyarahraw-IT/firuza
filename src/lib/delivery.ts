// Delivery estimates. Same rules as the database function create_order():
//  - made to order: making days + shipping days, counted in working days (Mon-Fri)
//  - already woven (rugs): just the wait of 15-30 calendar days
export type Region = 'es' | 'eu';
export type ShipTimes = { es_min: number; es_max: number; eu_min: number; eu_max: number };
export type DeliveryInfo = {
  mode: 'made_to_order' | 'shipped';
  making: [number, number] | null;
  shipping: [number, number] | null;
};

export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export function estimate(info: DeliveryInfo, ship: ShipTimes, region: Region, from = new Date()) {
  if (info.mode === 'shipped' && info.shipping) {
    const a = new Date(from), b = new Date(from);
    a.setDate(a.getDate() + info.shipping[0]);
    b.setDate(b.getDate() + info.shipping[1]);
    return { from: a, to: b };
  }
  const [mMin, mMax] = info.making ?? [0, 0];
  const sMin = region === 'es' ? ship.es_min : ship.eu_min;
  const sMax = region === 'es' ? ship.es_max : ship.eu_max;
  return { from: addBusinessDays(from, mMin + sMin), to: addBusinessDays(from, mMax + sMax) };
}

/** Latest of several estimates (an order arrives when its slowest item is ready). */
export function latest(ranges: { from: Date; to: Date }[]) {
  return ranges.reduce((acc, r) => ({ from: r.from > acc.from ? r.from : acc.from, to: r.to > acc.to ? r.to : acc.to }));
}

const day = new Intl.DateTimeFormat('es-ES', { day: 'numeric' });
const month = new Intl.DateTimeFormat('es-ES', { month: 'long' });
export function formatRange(a: Date, b: Date) {
  if (a.getMonth() === b.getMonth()) return `del ${day.format(a)} al ${day.format(b)} de ${month.format(b)}`;
  return `del ${day.format(a)} de ${month.format(a)} al ${day.format(b)} de ${month.format(b)}`;
}
