// Real materials of each piece (products.materials). Nothing here is invented: the site shows only what the owner entered.
export const STONE_TYPES = ['Ágata', 'Turquesa', 'Lapislázuli', 'Cornalina', 'Jade', 'Ónix', 'Amatista', 'Cuarzo rosa', 'Ojo de tigre', 'Nácar', 'Perla cultivada', 'Perla de agua dulce', 'Cristal', 'Acrílico', 'Otra'] as const;
export const METALS = ['Plata 925', 'Baño de oro', 'Acero inoxidable', 'Latón'] as const;
export const THREADS = ['Hilo de nailon', 'Cable de acero', 'Elástico'] as const;
export const FIBERS = ['Algodón', 'Lana', 'Acrílico', 'Poliéster', 'Viscosa', 'Lino', 'Seda', 'Nailon', 'Elastano'] as const;

export type Stone = { name: string; natural: boolean };
export type Fiber = { fiber: string; pct: number };
export type Materials = { stones?: Stone[]; metal?: string; thread?: string; fibers?: Fiber[]; care?: string };

export const MAX_STONES = 6;
export const MAX_FIBERS = 4;

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export const JEWELLERY = ['collares', 'pulseras', 'pendientes'];
export const isJewellery = (category: string) => JEWELLERY.includes(category);

/** "ágata roja natural, turquesa natural, cristal": "natural" only when the owner marked it natural. */
export function stonesText(m: Materials): string {
  return (m.stones ?? []).map((s) => `${lower(s.name)}${s.natural ? ' natural' : ''}`).join(', ');
}

/** Main stone for the product card chip (the first one entered), or null. */
export function mainStone(m: Materials): string | null {
  const s = m.stones?.[0];
  return s ? `${s.name}${s.natural ? ' natural' : ''}` : null;
}

/** EU Regulation 1007/2011: fibre names and percentages, e.g. "100 % algodón". */
export function fibersText(m: Materials): string {
  return (m.fibers ?? []).map((f) => `${f.pct} % ${lower(f.fiber)}`).join(', ');
}

const CARE: Record<string, string> = {
  Algodón: 'Lava a mano o en ciclo delicado a 30 °C. Seca en plano. No uses lejía.',
  Lana: 'Lava a mano con agua fría y detergente suave. No la retuerzas. Seca en plano.',
  Acrílico: 'Lava a mano o en ciclo delicado a 30 °C. Seca en plano. No la planches directamente.',
  Poliéster: 'Lava a mano o en ciclo delicado a 30 °C. Seca en plano. No la planches directamente.',
  Viscosa: 'Lava a mano con agua fría. No la retuerzas. Seca en plano.',
  Lino: 'Lava a 30 °C en ciclo delicado. Plancha a temperatura media.',
  Seda: 'Lava a mano con agua fría y detergente suave. No la retuerzas. Seca a la sombra.',
  Nailon: 'Lava a mano con agua fría. Seca en plano.',
  Elastano: 'Lava a mano con agua fría. Seca en plano.',
};

/** The owner's own care text, or advice derived from the main fibre (orientativo). */
export function careText(m: Materials): string | null {
  if (m.care && m.care.trim()) return m.care.trim();
  const main = [...(m.fibers ?? [])].sort((a, b) => b.pct - a.pct)[0];
  return main ? (CARE[main.fiber] ?? null) : null;
}

/** Rows of the "Materiales" block, by kind of product. Empty when the owner has not entered anything yet. */
export function materialRows(m: Materials, category: string): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (isJewellery(category)) {
    if (m.stones?.length) rows.push({ label: 'Piedras', value: stonesText(m) });
    if (m.metal) rows.push({ label: 'Cierre', value: m.metal });
    if (m.thread) rows.push({ label: 'Montado en', value: m.thread });
  } else {
    if (m.fibers?.length) rows.push({ label: 'Composición', value: fibersText(m) });
    const care = careText(m);
    if (care && m.fibers?.length) rows.push({ label: 'Cuidados', value: care });
  }
  return rows;
}

export const photoKinds = ['studio', 'in_hand', 'worn'] as const;
export type PhotoKind = (typeof photoKinds)[number];
export const KIND_LABEL: Record<PhotoKind, string> = { studio: 'Estudio (fondo liso)', in_hand: 'En mano', worn: 'Puesto' };
export const KIND_PUBLIC: Record<PhotoKind, string | null> = { studio: null, in_hand: 'Foto real, en mano', worn: 'Foto real, puesta' };
