// Product grouping + how each source image is turned into a 4:5 image.
// kind 'phone' : crop phone UI, cut product out of its (near-white) background, centre on #FBF8F3 (no upscaling)
// kind 'crop'  : crop a 4:5 window out of region [x0,y0,x1,y1] (fractions of the source), no upscaling
// kind 'pad'   : whole image placed on a #FBF8F3 canvas, 4:5, no upscaling
const O = '../assets/originals';
const P = (cat, n) => `${O}/${cat}/photo_${n}_2026-10-05_13-27-36.jpg`;
const K = (f) => `${O}/knitwear/${f}`;
const R = (d, f) => `${O}/rugs/${d}/${f}`;
const ph = (cat, n, role = 'main', opts) => ({ src: P(cat, n), kind: 'phone', role, opts });
const full = (src, role) => ({ src, kind: 'full', role });
const crop = (src, region, role) => ({ src, kind: 'crop', region, role });
const pad = (src, role) => ({ src, kind: 'pad', role });

export const products = [
  // ---- Collares
  { slug: 'collar-azul-dorado', cat: 'necklaces', images: [ph('necklaces', 2)] },
  { slug: 'collar-largo-azul-marino-flores', cat: 'necklaces', note: 'photo includes matching earrings', images: [ph('necklaces', 3)] },
  { slug: 'collar-azul-dorado-perlas', cat: 'necklaces', note: 'photo includes matching earrings', images: [ph('necklaces', 4)] },
  { slug: 'collar-largo-perlas-azules', cat: 'necklaces', images: [ph('necklaces', 7)] },
  { slug: 'collar-perlas-verdes', cat: 'necklaces', images: [ph('necklaces', 10)] },
  { slug: 'collar-babero-rojo-negro', cat: 'necklaces', images: [ph('necklaces', 12)] },
  { slug: 'collar-granate-perlas', cat: 'necklaces', note: 'photo includes matching earrings', images: [ph('necklaces', 13)] },
  { slug: 'collar-flecos-verde-oliva', cat: 'necklaces', images: [ph('necklaces', 14)] },
  { slug: 'collar-rojo-cadena-dorada', cat: 'necklaces', images: [ph('necklaces', 15)] },
  { slug: 'collar-azul-turquesa-negro', cat: 'necklaces', images: [ph('necklaces', 16)] },
  { slug: 'collar-perlas-granate', cat: 'necklaces', images: [ph('necklaces', 19)] },
  { slug: 'collar-perlas-cristal-verde', cat: 'necklaces', note: 'photo includes matching earrings', images: [ph('necklaces', 23)] },
  { slug: 'collar-azul-cristal-negro', cat: 'necklaces', images: [ph('necklaces', 24, 'main', { top: 112, bot: 75 })] },
  { slug: 'collar-dorado-gotas-verdes', cat: 'necklaces', images: [ph('necklaces', 26)] },
  // ---- Pulseras
  { slug: 'pulsera-perlas-cuatro-modelos', cat: 'bracelets', note: '4 bracelets in one photo -> options Modelo 1-4', images: [ph('bracelets', 20, 'main', { top: 64, bot: 204 })] },
  { slug: 'pulsera-perlas-azul-claro', cat: 'bracelets', images: [ph('bracelets', 1)] },
  { slug: 'pulsera-ancha-ambar', cat: 'bracelets', images: [ph('bracelets', 5)] },
  { slug: 'pulsera-flores-pastel', cat: 'bracelets', images: [ph('bracelets', 6)] },
  { slug: 'pulsera-negra-amarilla', cat: 'bracelets', images: [ph('bracelets', 9)] },
  { slug: 'pulsera-perlas-negro-dorado', cat: 'bracelets', images: [ph('bracelets', 11)] },
  { slug: 'pulsera-perlas-rojo-blanco-cierre', cat: 'bracelets', images: [ph('bracelets', 17)] },
  { slug: 'pulsera-elastica-rojo-blanco', cat: 'bracelets', images: [ph('bracelets', 22)] },
  // ---- Pendientes
  { slug: 'pendientes-artesanales', cat: 'earrings', note: '4 pairs in one photo -> options Modelo 1-4', images: [ph('earrings', 25)] },
  { slug: 'pendientes-largos-turquesa', cat: 'earrings', images: [ph('earrings', 28)] },
  // ---- Crochet (real photos)
  { slug: 'bolso-crochet-cuadros', cat: 'crochet', images: [ph('crochet', 8)] },
  { slug: 'zapatillas-crochet', cat: 'crochet', note: 'two colours in photo: cream, coral', images: [ph('crochet', 18)] },
  { slug: 'cartera-crochet', cat: 'crochet', note: 'two colours in photo: brown, pink', images: [ph('crochet', 21)] },
  { slug: 'top-crochet-halter-crudo', cat: 'crochet', images: [ph('crochet', 27)] },
  // ---- Alfombras
  { slug: 'alfombra-roja-geometrica', cat: 'rugs', needs_real_photo: true, images: [
    full(R('f1', 'a_Professional_product (3).jpeg'), 'main'), full(R('f1', 'b_Professional_product (3).jpeg'), 'alt')] },
  { slug: 'alfombra-medallon-negro', cat: 'rugs', needs_real_photo: true, images: [
    full(R('f2', 'a_Professional_product (2).jpeg'), 'main'), full(R('f2', 'b_Professional_product (2).jpeg'), 'alt')] },
  { slug: 'alfombra-tribal-rojo', cat: 'rugs', needs_real_photo: true, images: [
    full(R('f3', 'a_Professional_product (1).jpeg'), 'main'), full(R('f3', 'b_Professional_product (1).jpeg'), 'alt')] },
  { slug: 'kilim-multicolor', cat: 'rugs', needs_real_photo: true, images: [
    full(R('f4', 'a_Professional_product.jpeg'), 'main'), full(R('f4', 'b_Professional_product.jpeg'), 'alt')] },
  // ---- Tejidos (AI renders -> needs_real_photo)
  { slug: 'vestido-macrame-crudo', cat: 'knitwear', needs_real_photo: true, images: [
    crop(K('b_{__task____Create_ (2).png'), [0.2, 0, 0.8, 1], 'main'),
    crop(K('b_{__task____Generat.jpeg'), [0.18, 0, 0.88, 1], 'worn'),
    crop(K('b_{__task____Create_ (1).jpeg'), [0.51, 0, 1, 0.85], 'detail'),
    crop(K('a_{__task____Create_.png'), [0, 0, 0.497, 0.495], 'detail'),
    crop(K('a_{__task____Create_.png'), [0.503, 0.505, 1, 1], 'detail-texture'),
    crop(K('a_{__task____Create_ (1).png'), [0.668, 0, 1, 0.5], 'detail')] },
  { slug: 'jersey-poncho-crochet-rosa', cat: 'knitwear', needs_real_photo: true, images: [
    crop(K('b_{__task____Generat (1).jpeg'), [0.05, 0, 0.95, 1], 'main'),
    crop(K('b_{__task____Create_ (1).png'), [0, 0.02, 0.33, 0.98], 'flat'),
    crop(K('b_{__task____Create_ (1).png'), [0.675, 0, 1, 0.495], 'detail')] },
  { slug: 'conjunto-top-verde-falda-beige', cat: 'knitwear', needs_real_photo: true, images: [
    crop(K('Max_a_{__task____Create_.png'), [0, 0, 0.36, 1], 'main'),
    crop(K('Max_a_{__task____Generat.png'), [0, 0, 0.33, 1], 'worn'),
    crop(K('Max_a_{__task____Create_ (1).png'), [0, 0, 0.41, 1], 'angle'),
    crop(K('Max_a_{__task____Create_.png'), [0.365, 0.54, 0.67, 1], 'detail')] },
  { slug: 'top-crochet-conchas-crudo', cat: 'knitwear', needs_real_photo: true, images: [
    crop(K('b_Extreme_macro_close-.png'), [0, 0, 1, 1], 'main'),
    crop(K('a_Extreme_macro_close-.png'), [0, 0, 1, 1], 'detail')] },
  { slug: 'top-crochet-terracota', cat: 'knitwear', needs_real_photo: true, images: [
    crop(K('b_Professional_e-comme.png'), [0, 0, 1, 1], 'main')] },
];
