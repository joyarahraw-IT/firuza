// Size guides and per-product measurements. Guide texts live in content/size-guides.json (also stored in the public
// settings row 'size_guides', which overrides them once supabase/fix-0011-specs.sql is applied). Specs live in
// products.specs; until a product has its own, the placeholders in content/specs.default.json are used (all provisional).
import guidesJson from '@/content/size-guides.json';
import specsJson from '@/content/specs.default.json';

export type GuideTable = { head: string[]; rows: string[][] };
export type Guide = { title: string; intro: string; table: GuideTable | null; diagram?: 'neckline'; stepsTitle?: string; steps: string[] | null };
export type GuideKey = 'collares' | 'pulseras' | 'pendientes' | 'ropa' | 'zapatillas' | 'bolsos' | 'alfombras';
export type Guides = Record<GuideKey, Guide>;

export const GUIDE_ORDER: GuideKey[] = ['collares', 'pulseras', 'pendientes', 'ropa', 'zapatillas', 'bolsos', 'alfombras'];
export const DEFAULT_GUIDES = guidesJson as unknown as Guides;

export type Specs = Partial<Record<SpecKey, number>> & { provisional?: boolean };
export type SpecKey = 'length_cm' | 'drop_cm' | 'weight_g' | 'width_cm' | 'height_cm' | 'depth_cm' | 'strap_drop_cm' | 'knots_dm2';
export const SPEC_META: Record<SpecKey, { label: string; unit: string }> = {
  length_cm: { label: 'Largo', unit: 'cm' },
  drop_cm: { label: 'Caída', unit: 'cm' },
  weight_g: { label: 'Peso', unit: 'g' },
  width_cm: { label: 'Ancho', unit: 'cm' },
  height_cm: { label: 'Alto', unit: 'cm' },
  depth_cm: { label: 'Fondo', unit: 'cm' },
  strap_drop_cm: { label: 'Caída del asa', unit: 'cm' },
  knots_dm2: { label: 'Nudos por dm²', unit: '' },
};
export const SPEC_KEYS = Object.keys(SPEC_META) as SpecKey[];

type P = { slug: string; name: string; category: string; specs?: Specs | null };

/** Which guide applies to a product (null: none). */
export function guideKeyFor(p: Pick<P, 'slug' | 'name' | 'category'>): GuideKey | null {
  if (p.category === 'collares') return 'collares';
  if (p.category === 'pulseras') return 'pulseras';
  if (p.category === 'pendientes') return 'pendientes';
  if (p.category === 'alfombras-kilims') return 'alfombras';
  if (p.category === 'tejidos-crochet') {
    if (/zapatilla/i.test(p.slug)) return 'zapatillas';
    if (/bolso|cartera/i.test(p.slug)) return 'bolsos';
    return 'ropa';
  }
  return null;
}

/** DB specs when the product has any, otherwise the provisional defaults. */
export function specsOf(p: P): Specs {
  const own = p.specs && Object.keys(p.specs).length ? p.specs : null;
  return own ?? ((specsJson as Record<string, Specs>)[p.slug] ?? {});
}

export function specRows(s: Specs): { label: string; value: string }[] {
  return SPEC_KEYS.filter((k) => typeof s[k] === 'number' && (s[k] as number) > 0).map((k) => ({ label: SPEC_META[k].label, value: `${String(s[k]).replace('.', ',')}${SPEC_META[k].unit ? ` ${SPEC_META[k].unit}` : ''}` }));
}

/** Necklace type from its length in cm. */
export function necklaceType(cm: number): string {
  if (cm < 43) return 'Gargantilla';
  if (cm < 50) return 'Princesa';
  if (cm < 70) return 'Matinée';
  if (cm < 90) return 'Ópera';
  return 'Sautoir';
}

export const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
export const MEASURE_MIN = 60;
export const MEASURE_MAX = 150;
