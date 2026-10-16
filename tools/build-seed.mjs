// Builds data/seed/products.seed.json + PRODUCT_LIST.md + PRODUCTS_TO_CONFIRM.md from the hand-written product definitions below.
// Pricing rules (owner, 2026-10-05):
//   beadwork has a required "Material" option: Piedras, perlas y cristal = base price, Cuentas acrílicas = base / 6 rounded to the nearest x.90, min 5.90
//   "Collar + pendientes" = (necklace + earrings) - 10%, per material, rounded to x.90
import fs from 'fs';

const manifest = JSON.parse(fs.readFileSync('../public/products/manifest.json', 'utf8'));
const imagesOf = (slug) => manifest.find((m) => m.slug === slug);

// nearest price ending in .90
const r90 = (x) => Math.round(x - 0.9) + 0.9;
const acrylic = (stone) => Math.max(5.9, r90(stone / 6));
const cents = (x) => Math.round(x * 100);

const CARE_BEADS = 'Evita el agua, los perfumes y las cremas. Guárdalo en una bolsita, separado de otras joyas.';
const CARE_CROCHET = 'Lavar a mano en frío y secar en plano. [CONFIRMAR hilo]';
const MAKE = { neck: [3, 5], statement: [5, 8], brace: [2, 4], ear: [2, 3] };
const C = (name, hex) => ({ name, hex });

// ---- beadwork (Material option on every product) ----
const bead = (o) => o; // marker only
const necklaces = [
  { slug: 'collar-azul-dorado', name: 'Collar azul y dorado con gotas', stone: 52.9, colors: [C('Azul y dorado', '#2b4aa0')], make: MAKE.neck,
    desc: 'Collar corto de cuentas azules y doradas, con pequeñas gotas colgando en la parte delantera. Pensado para escote redondo o camisa abierta.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-largo-azul-marino-flores', name: 'Collar largo azul marino con florecillas', stone: 59.9, colors: [C('Azul marino y blanco', '#1f2a5c')], make: MAKE.neck, set: 27.9,
    desc: 'Collar largo de cuentas azul marino con pequeñas florecillas claras repartidas por todo el hilo. Se puede llevar solo o con los pendientes a juego.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-azul-dorado-perlas', name: 'Collar de flores azules y dorado', stone: 54.9, colors: [C('Azul y dorado', '#2b4aa0')], make: MAKE.neck, set: 26.9,
    desc: 'Varias vueltas finas doradas con florecillas de cuentas azules. Lo puedes pedir con los pendientes a juego.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-largo-perlas-azules', name: 'Collar largo de perlas con florecillas azules', stone: 62.9, colors: [C('Blanco y azul', '#3a4fa6')], make: MAKE.neck,
    desc: 'Collar largo de perlas blancas con pequeños detalles azules y cierre de mosquetón. Cae suave sobre el pecho.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-perlas-verdes', name: 'Collar de cuentas verdes y perlas', stone: 64.9, colors: [C('Verde y blanco', '#2f9a5a')], make: MAKE.neck,
    desc: 'Cuentas verdes facetadas junto a una hilera de perlas blancas, con una perla mayor como remate delantero.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-babero-rojo-negro', name: 'Collar babero rojo y negro', stone: 89.9, colors: [C('Rojo y negro', '#a8201f')], make: MAKE.statement, statement: true,
    desc: 'Collar tipo babero de red de cuentas negras con gotas rojas colgando en el borde. Una pieza de protagonista para un escote abierto.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-granate-perlas', name: 'Collar largo granate y perlas', stone: 74.9, colors: [C('Granate y blanco', '#7a1230')], make: MAKE.neck, set: 28.9,
    desc: 'Hilo de cuentas granate junto a tres vueltas de perlas blancas, con una gota granate al final. Se puede pedir con pendientes a juego.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-flecos-verde-oliva', name: 'Collar de flecos verde oliva', stone: 84.9, colors: [C('Verde oliva', '#6b7a2a')], make: MAKE.statement, statement: true,
    desc: 'Collar ancho con una hilera de tubitos verde oliva colgando en forma de abanico, con cadena de ajuste en la parte trasera.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-rojo-cadena-dorada', name: 'Collar largo rojo con cadena dorada', stone: 58.9, colors: [C('Rojo y dorado', '#b0182a')], make: MAKE.neck,
    desc: 'Cadena dorada fina con una trenza de cuentas facetadas rojas y doradas en la parte delantera. Cierre de mosquetón.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-azul-turquesa-negro', name: 'Collar negro con flores turquesa', stone: 49.9, colors: [C('Negro y turquesa', '#2a8fa8')], make: MAKE.neck,
    desc: 'Hilo de cuentas negras muy pequeñas con flores de cuentas turquesa en el centro. Ligero y fácil de combinar.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-perlas-granate', name: 'Collar babero de perlas y gotas granate', stone: 94.9, colors: [C('Crudo y granate', '#8a1c33')], make: MAKE.statement, statement: true,
    desc: 'Collar ancho de perlas blancas con gotas granate alargadas en el centro. Una pieza de ocasión especial.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-perlas-cristal-verde', name: 'Collar de perlas y cristal verde con colgante', stone: 69.9, colors: [C('Blanco y verde', '#4aa57a')], make: MAKE.neck, set: 27.9,
    desc: 'Eslabones de perlas blancas con cuentas verdes y un colgante de perla y cuenta verde. Lo puedes pedir con los pendientes a juego.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-azul-cristal-negro', name: 'Collar negro con cristales azules', stone: 52.9, colors: [C('Negro y azul', '#1f3f9a')], make: MAKE.neck,
    desc: 'Hilo de cuentas negras con una fila de cristales azules colgando en la parte delantera y cierre plateado.', length: '[CONFIRMAR largo]' },
  { slug: 'collar-dorado-gotas-verdes', name: 'Collar dorado con gotas verdes', stone: 54.9, colors: [C('Dorado y verde', '#c9a13a')], make: MAKE.neck,
    desc: 'Collar fino de cuentas doradas con pequeñas gotas en forma de lágrima y cuentas verdes.', length: '[CONFIRMAR largo]' },
];
const bracelets = [
  { slug: 'pulsera-perlas-cuatro-modelos', name: 'Pulseras de perlas', optionName: 'Modelo', models: [
      { label: 'Modelo 1', stone: 34.9 }, { label: 'Modelo 2', stone: 34.9 }, { label: 'Modelo 3', stone: 39.9 }, { label: 'Modelo 4', stone: 36.9 }],
    colors: [C('Crudo y dorado', '#e8dcc0'), C('Blanco y plata', '#eeeeee')], make: MAKE.brace,
    desc: 'Cuatro pulseras planas de perlas con distintos entramados: dorado, crudo y blanco con plata. Elige el modelo y el material.' },
  { slug: 'pulsera-perlas-azul-claro', name: 'Pulsera de perlas y cuentas azul claro', stone: 32.9, colors: [C('Blanco y azul claro', '#b9cfe8')], make: MAKE.brace,
    desc: 'Pulsera larga y fina de perlas blancas con detalles azul claro y cierre de mosquetón.' },
  { slug: 'pulsera-ancha-ambar', name: 'Pulsera ancha ámbar', stone: 36.9, colors: [C('Ámbar', '#e8a33a')], make: MAKE.brace,
    desc: 'Pulsera ancha de cuentas en tonos ámbar y naranja, con un entramado en zigzag.' },
  { slug: 'pulsera-flores-pastel', name: 'Pulsera de flores pastel', stone: 29.9, colors: [C('Pastel', '#e9d6e6')], make: MAKE.brace,
    desc: 'Pulsera elástica de pequeñas flores de cuentas en tonos pastel.' },
  { slug: 'pulsera-negra-amarilla', name: 'Pulsera negra y amarilla', stone: 34.9, colors: [C('Negro y amarillo', '#f2c200')], make: MAKE.brace,
    desc: 'Pulsera de cuentas negras redondas sobre un entramado amarillo, con argolla dorada en un extremo.' },
  { slug: 'pulsera-perlas-negro-dorado', name: 'Pulsera de perlas, negro y dorado', stone: 41.9, colors: [C('Crudo, negro y dorado', '#d9c9a0')], make: MAKE.brace,
    desc: 'Pulsera gruesa de perlas crudas con cuentas negras y doradas, con cierre dorado.' },
  { slug: 'pulsera-perlas-rojo-blanco-cierre', name: 'Pulsera de perlas y rojo con cierre', stone: 39.9, colors: [C('Blanco y rojo', '#b0182a')], make: MAKE.brace,
    desc: 'Pulsera de perlas blancas y cuentas rojas con cierre dorado de pestaña.' },
  { slug: 'pulsera-elastica-rojo-blanco', name: 'Pulsera elástica rojo y blanco', stone: 24.9, colors: [C('Rojo y blanco', '#d6213a')], make: MAKE.brace,
    desc: 'Pulsera sencilla con perlas blancas y cuentas rojas facetadas alternas. Sin cierre, elástica.' },
];
const earrings = [
  { slug: 'pendientes-artesanales', name: 'Pendientes artesanales', optionName: 'Modelo', models: [
      { label: 'Modelo 1', stone: 26.9 }, { label: 'Modelo 2', stone: 24.9 }, { label: 'Modelo 3', stone: 29.9 }, { label: 'Modelo 4', stone: 27.9 }],
    colors: [C('Ámbar', '#a9561f'), C('Verde', '#2f7a3a')], make: MAKE.ear,
    desc: 'Cuatro modelos de pendientes de cuentas: gotas ámbar, tubitos verdes y dos aros de cuentas en verde. Se venden por pares.' },
  { slug: 'pendientes-largos-turquesa', name: 'Pendientes largos turquesa', stone: 34.9, colors: [C('Turquesa', '#2ab3b0')], make: MAKE.ear,
    desc: 'Pendientes muy largos de cuentas diminutas en turquesa, blanco y toques de naranja y rojo, con cono plateado.' },
];

// ---- crochet / knitwear / rugs (no Material option) ----
const SIZE_XS_XL = ['XS', 'S', 'M', 'L', 'XL'].map((l) => ({ label: l, delta: 0 }));
const other = [
  { slug: 'bolso-crochet-cuadros', name: 'Bolso de crochet a cuadros', cat: 'crochet', price: 79.9, colors: [C('Marrón y beige', '#6b3a22')], make: [7, 10],
    desc: 'Bolso de mano de crochet con cuadros en marrón y beige, dos asas y detalles dorados en los anclajes.', care: CARE_CROCHET },
  { slug: 'zapatillas-crochet', name: 'Zapatillas de crochet', cat: 'crochet', price: 39.9, colors: [C('Crudo', '#efe3cc'), C('Coral', '#d9664f')], make: [4, 6],
    sizes: [{ label: '35–36 [CONFIRMAR]', delta: 0 }, { label: '37–38 [CONFIRMAR]', delta: 0 }, { label: '39–40 [CONFIRMAR]', delta: 0 }],
    desc: 'Zapatillas de casa de crochet con calados, en crudo y coral. Se hacen a tu talla.', care: CARE_CROCHET },
  { slug: 'cartera-crochet', name: 'Cartera de crochet con solapa', cat: 'crochet', price: 49.9, colors: [C('Marrón', '#6b2f1a'), C('Rosa', '#e7439a')], make: [5, 7],
    desc: 'Cartera de mano de crochet con solapa ondulada y un botón. La puedes elegir en marrón o en rosa.', care: CARE_CROCHET },
  { slug: 'top-crochet-halter-crudo', name: 'Top halter de crochet crudo', cat: 'crochet', price: 59.9, colors: [C('Crudo', '#efe3cc')], make: [4, 6], sizes: SIZE_XS_XL,
    desc: 'Top halter de crochet con calado central y borde ondulado, atado al cuello.', care: CARE_CROCHET },
  { slug: 'vestido-macrame-crudo', name: 'Vestido halter de macramé', cat: 'knitwear', price: 129.9, colors: [C('Crudo', '#efe6d2')], make: [8, 10], sizes: SIZE_XS_XL, aiPhoto: true,
    desc: 'Vestido de cuello halter anudado, con escote en gota y flecos largos en la falda. Lo hacemos a tu talla.', care: 'Lavar a mano en frío y secar en plano. [CONFIRMAR cuerda]' },
  { slug: 'jersey-poncho-crochet-rosa', name: 'Jersey poncho de crochet con borlas', cat: 'knitwear', price: 79.9, colors: [C('Rosa palo', '#e3a39c')], make: [8, 10], sizes: [{ label: 'S/M', delta: 0 }, { label: 'L/XL', delta: 0 }], aiPhoto: true,
    desc: 'Jersey amplio de punto calado con cuello de pico y borlas en el bajo. Ligero y fácil de combinar.', care: CARE_CROCHET },
  { slug: 'conjunto-top-verde-falda-beige', name: 'Conjunto de top verde y falda larga', cat: 'knitwear', price: 139.9, colors: [C('Verde petróleo y beige', '#1f5a57')], make: [9, 10], sizes: SIZE_XS_XL, aiPhoto: true,
    desc: 'Top halter de crochet con abertura y flecos, y falda larga de punto calado en tono beige rosado. Se hace a tu talla.', care: CARE_CROCHET },
  { slug: 'top-crochet-conchas-crudo', name: 'Top concha de crochet', cat: 'knitwear', price: 59.9, colors: [C('Crudo', '#f0e8da')], make: [5, 7], sizes: SIZE_XS_XL, aiPhoto: true,
    desc: 'Top corto con copas en forma de concha y borde ondulado de crochet.', care: CARE_CROCHET },
  { slug: 'top-crochet-terracota', name: 'Bralette de crochet terracota', cat: 'knitwear', price: 49.9, colors: [C('Terracota', '#b5643c')], make: [4, 6], sizes: SIZE_XS_XL, aiPhoto: true,
    desc: 'Bralette de crochet con tirantes anudados al cuello y banda calada en la parte inferior.', care: CARE_CROCHET },
  { slug: 'alfombra-roja-geometrica', silk: true, name: 'Alfombra roja geométrica', cat: 'rugs', price: 980, colors: [C('Como en la foto', '#9a2f2a')], ship: [15, 30], aiPhoto: true,
    sizes: [{ label: '100 × 150 cm [CONFIRMAR]', delta: -460 }, { label: '150 × 200 cm [CONFIRMAR]', delta: 0 }, { label: '200 × 300 cm [CONFIRMAR]', delta: 970 }],
    desc: 'Alfombra de seda anudada a mano. Campo rojo con motivos geométricos repetidos y varias cenefas, con flecos en los extremos. Origen: [CONFIRMAR].', care: 'Aspirar con succión suave, sin cepillo giratorio; evitar el sol directo y la humedad; limpieza profesional recomendada. [CONFIRMAR cuidados]' },
  { slug: 'alfombra-medallon-negro', silk: true, name: 'Alfombra medallón negro', cat: 'rugs', price: 1150, colors: [C('Como en la foto', '#1b1a24')], ship: [15, 30], aiPhoto: true,
    sizes: [{ label: '80 × 150 cm [CONFIRMAR]', delta: -630 }, { label: '150 × 200 cm [CONFIRMAR]', delta: 0 }, { label: '200 × 300 cm [CONFIRMAR]', delta: 1150 }],
    desc: 'Alfombra de seda anudada a mano. Medallón central sobre fondo negro, con flores en azul, granate y marfil y un marco de cenefas. Origen: [CONFIRMAR].', care: 'Aspirar con succión suave, sin cepillo giratorio; evitar el sol directo y la humedad; limpieza profesional recomendada. [CONFIRMAR cuidados]' },
  { slug: 'alfombra-tribal-rojo', silk: true, name: 'Alfombra tribal de rombo', cat: 'rugs', price: 1050, colors: [C('Como en la foto', '#a3402f')], ship: [15, 30], aiPhoto: true,
    sizes: [{ label: '100 × 150 cm [CONFIRMAR]', delta: -490 }, { label: '150 × 200 cm [CONFIRMAR]', delta: 0 }],
    desc: 'Alfombra de seda anudada a mano. Rombo central escalonado en rojo y negro, con pequeñas figuras geométricas alrededor y flecos en los extremos. Origen: [CONFIRMAR].', care: 'Aspirar con succión suave, sin cepillo giratorio; evitar el sol directo y la humedad; limpieza profesional recomendada. [CONFIRMAR cuidados]' },
  { slug: 'kilim-multicolor', name: 'Kilim de rombos de colores', cat: 'rugs', price: 290, colors: [C('Multicolor (como en la foto)', '#c4553d')], ship: [15, 30], aiPhoto: true, featured: true,
    sizes: [{ label: '80 × 150 cm [CONFIRMAR]', delta: -100 }, { label: '120 × 180 cm [CONFIRMAR]', delta: 0 }, { label: '160 × 230 cm [CONFIRMAR]', delta: 150 }],
    desc: 'Tejido plano con rombos en rojo, turquesa, naranja y magenta sobre fondo marfil, con flecos [CONFIRMAR material y técnica].', care: 'Aspirar con succión suave. [CONFIRMAR]' },
];

const MAT = ['Piedras, perlas y cristal', 'Cuentas acrílicas'];
const SILK = 'Hecha a mano en seda';
const INDUSTRIAL = 'Industrial (a máquina), a medida';
const out = [];
const confirm = [];
const add = (p) => {
  const meta = imagesOf(p.slug);
  out.push({ ...p, status: 'draft', needs_real_photo: !!meta.needs_real_photo, images: meta.images.map((i, k) => ({ file: i.file, role: i.role, cover: k === 0 })) });
};
const setDefaults = { delivery_mode: 'made_to_order' };

for (const n of necklaces) {
  const optGroups = [{ name: 'Material', required: true, values: MAT }];
  const variants = [];
  if (n.set) {
    optGroups.push({ name: 'Conjunto', required: true, values: ['Solo collar', 'Collar + pendientes'] });
    for (const [mi, m] of MAT.entries()) {
      const neck = mi ? acrylic(n.stone) : n.stone, ear = mi ? acrylic(n.set) : n.set;
      variants.push({ options: { Material: m, Conjunto: 'Solo collar' }, price_cents: cents(neck) });
      variants.push({ options: { Material: m, Conjunto: 'Collar + pendientes' }, price_cents: cents(r90((neck + ear) * 0.9)) });
    }
  } else {
    for (const [mi, m] of MAT.entries()) variants.push({ options: { Material: m }, price_cents: cents(mi ? acrylic(n.stone) : n.stone) });
  }
  add({ slug: n.slug, name: n.name, category: 'collares', ...setDefaults, making_days: n.make, description: n.desc, care: CARE_BEADS, length: n.length, colors: n.colors,
    base_price_cents: cents(n.stone), option_groups: optGroups, variants, set_earrings_stone_cents: n.set ? cents(n.set) : null, statement: !!n.statement });
  confirm.push([n.slug, 'material de las cuentas (piedra natural / acrílico), largo, hilo y cierre']);
}
for (const b of [...bracelets, ...earrings]) {
  const cat = earrings.includes(b) ? 'pendientes' : 'pulseras';
  const variants = [];
  const groups = [{ name: 'Material', required: true, values: MAT }];
  if (b.models) {
    groups.unshift({ name: b.optionName, required: true, values: b.models.map((m) => m.label) });
    for (const m of b.models) for (const [mi, mat] of MAT.entries()) variants.push({ options: { [b.optionName]: m.label, Material: mat }, price_cents: cents(mi ? acrylic(m.stone) : m.stone) });
  } else {
    for (const [mi, mat] of MAT.entries()) variants.push({ options: { Material: mat }, price_cents: cents(mi ? acrylic(b.stone) : b.stone) });
  }
  add({ slug: b.slug, name: b.name, category: cat, ...setDefaults, making_days: b.make, description: b.desc, care: CARE_BEADS, colors: b.colors,
    base_price_cents: cents(b.models ? b.models[0].stone : b.stone), option_groups: groups, variants });
  confirm.push([b.slug, 'material de las cuentas (piedra natural / acrílico), cierre' + (cat === 'pulseras' ? ', largo/talla' : ', tipo de gancho')]);
}
for (const o of other) {
  const groups = [], variants = [];
  const colorNames = o.colors.map((c) => c.name);
  if (o.slug === 'cartera-crochet') groups.push({ name: 'Color', required: true, values: colorNames });
  if (o.slug === 'zapatillas-crochet') groups.push({ name: 'Color', required: true, values: colorNames });
  if (o.silk) groups.push({ name: 'Tipo', required: true, values: [SILK, INDUSTRIAL], quote_values: [INDUSTRIAL] }); // industrial = price on request (WhatsApp)
  if (o.sizes) groups.push({ name: o.cat === 'rugs' ? 'Medida' : (o.slug === 'zapatillas-crochet' ? 'Talla' : 'Talla'), required: true, values: o.sizes.map((s) => s.label) });
  const combos = (gs) => gs.reduce((acc, g) => acc.flatMap((a) => g.values.filter((v) => !(g.quote_values ?? []).includes(v)).map((v) => ({ ...a, [g.name]: v }))), [{}]);
  for (const c of combos(groups)) {
    const sizeName = c['Talla'] ?? c['Medida'];
    const delta = o.sizes && sizeName ? o.sizes.find((s) => s.label === sizeName).delta : 0;
    variants.push({ options: c, price_cents: cents(o.price + delta) });
  }
  add({ slug: o.slug, name: o.name, category: { crochet: 'tejidos-crochet', knitwear: 'tejidos-crochet', rugs: 'alfombras-kilims' }[o.cat], delivery_mode: o.ship ? 'shipped' : 'made_to_order',
    making_days: o.make ?? null, shipping_days: o.ship ?? null, description: o.desc, care: o.care, colors: o.colors, base_price_cents: cents(o.price), option_groups: groups, variants, featured: !!o.featured });
  confirm.push([o.slug, o.cat === 'rugs' ? (o.slug === 'kilim-multicolor' ? 'material y técnica (¿también seda anudada? un kilim es tejido plano), origen, medidas reales, foto real (ahora IA)' : 'material CONFIRMADO: seda anudada a mano. Falta: origen, medidas reales, foto real (ahora IA), cuidados') : o.aiPhoto ? 'hilo/material, tallas, foto real (ahora imagen IA)' : 'hilo/material, tallas']);
}

fs.mkdirSync('../data/seed', { recursive: true });
fs.writeFileSync('../data/seed/products.seed.json', JSON.stringify(out, null, 1));

// ---- human-readable list ----
const eur = (c) => (c / 100).toFixed(2).replace('.', ',') + ' €';
const catLabel = { collares: 'Collares', pulseras: 'Pulseras', pendientes: 'Pendientes', 'tejidos-crochet': 'Tejidos y crochet', 'alfombras-kilims': 'Alfombras y kilims' };
let md = '# Lista de productos (borrador del seed)\n\nPrecios en EUR. Todos los productos se crean como **borrador**. Piedras, perlas y cristal = precio base; acrílico = piedra ÷ 6 (redondeado a x,90, mínimo 5,90).\n\n';
let n = 0;
for (const cat of Object.keys(catLabel)) {
  md += `## ${catLabel[cat]}\n\n| # | Producto | Opciones | Precio | Hacer / llegar |\n|---|---|---|---|---|\n`;
  for (const p of out.filter((x) => x.category === cat)) {
    n++;
    let opts = p.option_groups.map((g) => `${g.name}: ${g.values.join(' / ')}`).join('<br>');
    let price;
    const mat = p.variants.filter((v) => v.options.Material);
    if (mat.length) {
      const rows = {};
      for (const v of mat) { const k = Object.entries(v.options).filter(([a]) => a !== 'Material').map(([, b]) => b).join(' · ') || ''; (rows[k] ??= {})[v.options.Material] = v.price_cents; }
      price = Object.entries(rows).map(([k, r]) => `${k ? k + ': ' : ''}**${eur(r['Piedras, perlas y cristal'])}** / ${eur(r['Cuentas acrílicas'])}`).join('<br>');
    } else {
      const ps = p.variants.map((v) => v.price_cents);
      price = Math.min(...ps) === Math.max(...ps) ? eur(ps[0]) : `${eur(Math.min(...ps))} – ${eur(Math.max(...ps))}`;
    }
    const time = p.delivery_mode === 'shipped' ? `llega en ${p.shipping_days[0]}–${p.shipping_days[1]} días` : `${p.making_days[0]}–${p.making_days[1]} días + envío`;
    md += `| ${n} | ${p.name}${p.needs_real_photo ? ' ⚠ foto IA' : ''} | ${opts || '—'} | ${price} | ${time} |\n`;
  }
  md += '\n';
}
fs.writeFileSync('../PRODUCT_LIST.md', md);

// ---- confirm list ----
let cf = `# Cosas por confirmar (PRODUCTS_TO_CONFIRM)\n\nEscribe aquí tus respuestas o corrígelas directamente en el panel de admin. Todo lo marcado [CONFIRMAR] en la web debe resolverse antes de publicar.\n\n## Global\n\n- **Materiales de joyería**: en todos los collares, pulseras y pendientes hay dos materiales (Piedras, perlas y cristal / Cuentas acrílicas). [CONFIRMAR] qué piedras o cuentas lleva cada pieza y cuál es el aspecto real de la versión acrílica.\n- **Precios**: son propuestas basadas en el mercado artesanal español; ajústalos en el admin. Las alfombras y kilims parten de los precios del prototipo Firuza.\n- **Tiempos de elaboración**: propuestas de 2–10 días según pieza.\n- **Fotos IA**: los productos marcados ⚠ (tejidos y alfombras) usan imágenes generadas; hay que sustituirlas por fotos reales antes de vender.\n- **Alfombras**: material confirmado (seda anudada a mano) para las tres alfombras. El origen sigue pendiente. Las descripciones largas originales (f1–f4.txt) no se usan como hecho (hablaban de lana, tintes naturales, Qashqai…). Tipo «industrial (a máquina), a medida»: pendiente de aprobar la tabla de precios.
- **IVA y pago online**: aplazados. Sin líneas de IVA por ahora.

## Por producto

| Producto | Por confirmar |
|---|---|
`;
for (const [s, t] of confirm) cf += `| ${out.find((p) => p.slug === s).name} (\`${s}\`) | ${t} |\n`;
fs.writeFileSync('../PRODUCTS_TO_CONFIRM.md', cf);
console.log(out.length, 'products');
