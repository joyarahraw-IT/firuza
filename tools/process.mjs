import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { products } from './products.mjs';

const OUT = '../public/products';
const CREAM = [0xfb, 0xf8, 0xf3];
const MAXLONG = 1600;
const TOP = 64; // phone status bar (and black bar)
const BOT = 72; // phone navigation bar
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

// Phone screenshot: remove UI, swap the near-white backdrop for cream, keep the product pixels untouched.
async function phone(file, o = {}) {
  const meta = await sharp(file).metadata();
  const SIDE = 4; // thin grey frame lines at the screenshot edges
  const W = meta.width - 2 * SIDE, H = meta.height, y0 = o.top ?? TOP, h = H - (o.bot ?? BOT) - y0;
  const { data } = await sharp(file).extract({ left: SIDE, top: y0, width: W, height: h }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // per-row backdrop colour: median of the outer columns; if the product touches the frame in that row,
  // fall back to the bright, flat majority of the row
  const bg = new Float32Array(h * 3), E = 6;
  const edge = (y, c) => { const v = []; for (let x = 0; x < E; x++) { v.push(data[(y * W + x) * 3 + c]); v.push(data[(y * W + W - 1 - x) * 3 + c]); } v.sort((p, q) => p - q); return v[v.length >> 1]; };
  const brightMode = (y, c) => {
    const idx = Array.from({ length: W }, (_, x) => x);
    const lum = (x) => data[(y * W + x) * 3] + data[(y * W + x) * 3 + 1] + data[(y * W + x) * 3 + 2];
    idx.sort((p, q) => lum(p) - lum(q));
    const v = [];
    for (let k = Math.floor(W * 0.55); k < Math.floor(W * 0.9); k++) v.push(data[(y * W + idx[k]) * 3 + c]);
    v.sort((p, q) => p - q); return v[v.length >> 1];
  };
  const gm = [0, 1, 2].map((c) => { const v = []; for (let y = 0; y < h; y += 4) v.push(edge(y, c)); v.sort((p, q) => p - q); return v[v.length >> 1]; });
  for (let y = 0; y < h; y++) {
    const e = [0, 1, 2].map((c) => edge(y, c));
    const bad = e.some((v, c) => Math.abs(v - gm[c]) > 18);
    for (let c = 0; c < 3; c++) bg[y * 3 + c] = bad ? brightMode(y, c) : e[c];
  }
  const sm = new Float32Array(h * 3), R = 15;
  for (let y = 0; y < h; y++) for (let c = 0; c < 3; c++) {
    let s = 0, n = 0;
    for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += bg[yy * 3 + c]; n++; } }
    sm[y * 3 + c] = s / n;
  }
  const out = Buffer.alloc(W * h * 3);
  let minx = W, maxx = 0, miny = h, maxy = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(data[i + c] - sm[y * 3 + c]));
    const w = smooth((d - 16) / 30);
    for (let c = 0; c < 3; c++) {
      const flat = Math.min(255, Math.max(0, CREAM[c] + (data[i + c] - sm[y * 3 + c])));
      out[i + c] = Math.round(w * data[i + c] + (1 - w) * flat);
    }
    if (d > 40 && x > 6 && x < W - 7) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  const bw = maxx - minx + 1, bh = maxy - miny + 1;
  const warn = (miny < 4 || maxy > h - 5 || minx < 2 || maxx > W - 3) ? 'TOUCHES-EDGE' : '';
  // 4:5 canvas, product fills 84% of the limiting side; never smaller than 576x720
  let CH = Math.max(720, Math.ceil(bh / 0.84)), CW = Math.round(CH * 0.8);
  if (bw > 0.84 * CW) { CW = Math.ceil(bw / 0.84); CH = Math.round(CW * 1.25); }
  const left = Math.round(CW / 2 - (minx + maxx) / 2), top = Math.round(CH / 2 - (miny + maxy) / 2);
  const sx = Math.max(0, -left), sy = Math.max(0, -top);
  const dw = Math.min(W - sx, CW - Math.max(0, left)), dh = Math.min(h - sy, CH - Math.max(0, top));
  const piece = await sharp(out, { raw: { width: W, height: h, channels: 3 } }).extract({ left: sx, top: sy, width: dw, height: dh }).png().toBuffer();
  const buf = await sharp({ create: { width: CW, height: CH, channels: 3, background: { r: CREAM[0], g: CREAM[1], b: CREAM[2] } } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer();
  return { buf, info: `product ${bw}x${bh} ${warn}` };
}

// largest 4:5 rectangle centred inside a region given as fractions of the source
function fit45(w, h, [a, b, c, d]) {
  const rx = a * w, ry = b * h, rw = (c - a) * w, rh = (d - b) * h;
  let cw, ch;
  if (rw / rh > 0.8) { ch = rh; cw = ch * 0.8; } else { cw = rw; ch = cw * 1.25; }
  cw = Math.floor(cw); ch = Math.floor(ch);
  return { left: Math.round(rx + (rw - cw) / 2), top: Math.round(ry + (rh - ch) / 2), width: cw, height: ch };
}
async function crop(file, region) {
  const m = await sharp(file).metadata();
  const r = fit45(m.width, m.height, region);
  return { buf: await sharp(file).extract(r).removeAlpha().png().toBuffer(), info: `crop ${r.width}x${r.height} of ${m.width}x${m.height}` };
}
// original aspect ratio kept (rugs on their wooden floor); only ever downscaled by exportAll
async function full(file) {
  const m = await sharp(file).metadata();
  return { buf: await sharp(file).removeAlpha().png().toBuffer(), info: `full ${m.width}x${m.height}` };
}
async function pad(file) {
  const m = await sharp(file).metadata();
  const w = m.width, h = m.height;
  let CW = w, CH = Math.round(w * 1.25);
  if (CH < h) { CH = h; CW = Math.round(h * 0.8); }
  const buf = await sharp({ create: { width: CW, height: CH, channels: 3, background: { r: CREAM[0], g: CREAM[1], b: CREAM[2] } } })
    .composite([{ input: await sharp(file).removeAlpha().png().toBuffer(), left: Math.round((CW - w) / 2), top: Math.round((CH - h) / 2) }]).png().toBuffer();
  return { buf, info: `pad ${w}x${h} in ${CW}x${CH}` };
}

async function exportAll(buf, dir, name) {
  let m = await sharp(buf).metadata();
  let s = sharp(buf);
  if (Math.max(m.width, m.height) > MAXLONG) s = s.resize({ width: m.width >= m.height ? MAXLONG : Math.round(m.width * MAXLONG / m.height), height: m.width >= m.height ? Math.round(m.height * MAXLONG / m.width) : MAXLONG }); // downscale only
  const base = await s.png().toBuffer();
  m = await sharp(base).metadata();
  let q = 84, webp;
  do { webp = await sharp(base).webp({ quality: q }).toBuffer(); q -= 6; } while (webp.length > 205000 && q > 40);
  let jq = 86, jpg;
  do { jpg = await sharp(base).jpeg({ quality: jq, mozjpeg: true }).toBuffer(); jq -= 6; } while (jpg.length > 205000 && jq > 45);
  fs.writeFileSync(`${dir}/${name}.webp`, webp);
  fs.writeFileSync(`${dir}/${name}.jpg`, jpg);
  const thumb = await sharp(base).resize(m.width / m.height < 0.99 ? { width: Math.min(m.width, 480) } : { width: Math.min(m.width, 600) }).webp({ quality: 80 }).toBuffer(); // 480x600, never enlarged
  fs.writeFileSync(`${dir}/${name}-thumb.webp`, thumb);
  return `${m.width}x${m.height} webp ${(webp.length / 1024) | 0}KB jpg ${(jpg.length / 1024) | 0}KB`;
}

fs.rmSync(OUT, { recursive: true, force: true });
const manifest = [];
for (const p of products) {
  const dir = `${OUT}/${p.slug}`;
  fs.mkdirSync(dir, { recursive: true });
  const imgs = [];
  for (let i = 0; i < p.images.length; i++) {
    const im = p.images[i], name = `${p.slug}-${i + 1}`;
    const r = im.kind === 'phone' ? await phone(im.src, im.opts) : im.kind === 'full' ? await full(im.src) : im.kind === 'crop' ? await crop(im.src, im.region) : await pad(im.src);
    const e = await exportAll(r.buf, dir, name);
    imgs.push({ file: name, role: im.role, source: path.basename(im.src) });
    console.log(p.slug.padEnd(34), String(i + 1), im.role.padEnd(14), r.info, '->', e);
  }
  manifest.push({ slug: p.slug, category: p.cat, needs_real_photo: !!p.needs_real_photo, note: p.note || null, images: imgs });
}
fs.writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 1));
