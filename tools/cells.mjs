import sharp from 'sharp'; import fs from 'fs';
const man=JSON.parse(fs.readFileSync('../public/products/manifest.json','utf8'));
const want=['alfombra-roja-geometrica','alfombra-medallon-negro','alfombra-tribal-rojo','kilim-multicolor','pulsera-perlas-cuatro-modelos','collar-azul-cristal-negro'];
const items=[];for(const p of man) if(want.includes(p.slug)) for(const im of p.images) items.push({p,im});
const H=520,comps=[];let x=0;
for(const it of items){const b=await sharp(`../public/products/${it.p.slug}/${it.im.file}.jpg`).resize({height:H}).jpeg().toBuffer();const m=await sharp(b).metadata();
 comps.push({input:b,left:x,top:30});
 comps.push({input:Buffer.from(`<svg width="${m.width}" height="30"><rect width="100%" height="100%" fill="#1F2A2E"/><text x="4" y="20" font-size="14" fill="#fff" font-family="Arial">${it.p.slug.slice(0,26)} ${it.im.role}</text></svg>`),left:x,top:0});x+=m.width+4;}
await sharp({create:{width:x,height:H+30,channels:3,background:'#ddd'}}).composite(comps).jpeg({quality:88}).toFile('../contact-sheets/4-updated-rugs-20-24.jpg');console.log(x);
