import 'server-only';
import sharp from 'sharp';
import { randomBytes } from 'node:crypto';

export type OptionGroupInput = { name: string; required: boolean; values: string[]; quote_values?: string[] };
export type Options = Record<string, string>;

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'producto';

export const canon = (o: Options) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));

/** Every purchasable combination of the option groups (values flagged quote_values are excluded: they are quote-only). */
export function combos(groups: OptionGroupInput[]): Options[] {
  return groups.reduce<Options[]>(
    (acc, g) => acc.flatMap((a) => g.values.filter((v) => !(g.quote_values ?? []).includes(v)).map((v) => ({ ...a, [g.name]: v }))),
    [{}],
  );
}

/** Acrylic = stone / 6, rounded to the nearest x.90, minimum 5.90 (owner rule). Cents in, cents out. */
export const acrylicCents = (stone: number) => Math.max(590, Math.round((Math.round(stone / 100 / 6 - 0.9) + 0.9) * 100));

export const parseEuros = (v: string) => {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 100) : null;
};

// ---------------------------------------------------------------- photos
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const LONG_SIDE = 1600;

/**
 * Automatic resizing for uploads: never enlarged, long side at most 1600 px, WebP + JPG, plus a thumbnail (max 480 px wide).
 * Photos are stored as shot (no AI, no retouching, no background change).
 */
export async function processPhoto(input: Buffer) {
  const base = sharp(input, { failOn: 'none' }).rotate(); // honour the camera's orientation
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error('Imagen no válida');
  const scale = Math.min(1, LONG_SIDE / Math.max(meta.width, meta.height));
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const resized = await base.resize(w, h).toBuffer();
  const [webp, jpg, thumb] = await Promise.all([
    sharp(resized).webp({ quality: 82 }).toBuffer(),
    sharp(resized).jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
    sharp(resized).resize({ width: Math.min(w, 480) }).webp({ quality: 80 }).toBuffer(),
  ]);
  return { webp, jpg, thumb, width: w, height: h };
}

export const newImageKey = (slug: string) => `${slug}/${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
export const imageFiles = (key: string) => [`${key}.webp`, `${key}.jpg`, `${key}-thumb.webp`];
