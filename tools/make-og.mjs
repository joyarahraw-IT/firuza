import sharp from 'sharp';
const photo = await sharp('../public/products/collar-babero-rojo-negro/collar-babero-rojo-negro-1.jpg').resize({ height: 630 }).toBuffer();
const pm = await sharp(photo).metadata();
const left = Buffer.from(`<svg width="700" height="630" xmlns="http://www.w3.org/2000/svg"><rect width="700" height="630" fill="#FBF8F3"/><text x="64" y="270" font-family="Georgia, serif" font-size="112" fill="#1F2A2E">Firuza</text><text x="68" y="340" font-family="Arial, sans-serif" font-size="30" letter-spacing="4" fill="#187A78">HECHO A MANO</text><text x="68" y="400" font-family="Georgia, serif" font-size="30" fill="#5B676B">Tejidos, bisutería y alfombras</text></svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#FBF8F3' } })
  .composite([{ input: left, left: 0, top: 0 }, { input: photo, left: 1200 - pm.width, top: 0 }])
  .jpeg({ quality: 86 }).toFile('../public/og-default.jpg');
console.log('og-default.jpg', pm.width);
