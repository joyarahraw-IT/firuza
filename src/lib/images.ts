// Client-safe image URL helper. key = "<slug>/<file>"; files are <key>.webp, <key>.jpg and <key>-thumb.webp
export function imageUrl(key: string, thumb = false) {
  const name = `${key}${thumb ? '-thumb' : ''}.webp`;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || process.env.NEXT_PUBLIC_LOCAL_IMAGES === '1') return `/products/${name}`;
  return `${base}/storage/v1/object/public/product-images/${name}`;
}

/** Photos that are a collage of several models (not a single piece): never cropped, always shown whole. */
const WHOLE_PHOTOS = ['pendientes-artesanales/'];
export const showWhole = (key: string) => WHOLE_PHOTOS.some((p) => key.startsWith(p));
