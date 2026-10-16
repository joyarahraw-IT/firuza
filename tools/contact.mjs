import sharp from 'sharp'; import fs from 'fs';
const man=JSON.parse(fs.readFileSync('../public/products/manifest.json','utf8'));
const [out,from,to]=process.argv.slice(2); const sel=man.slice(+from,+to);
const CW=170,CH=212,COLS=12,CAP=34; let comps=[],row=0,col=0,n=0; for(const p of man.slice(0,+from)) n+=p.images.length;
const esc=s=>s.replace(/[&<>]/g,'');
// each product starts a new row-run: header chip + its images
let x=0,y=0; const W=CW*COLS; const items=[];
for(const p of sel){ if(col+p.images.length>COLS && col>0){row++;col=0;}
  // header
  const startCol=col;
  for(const im of p.images){ items.push({p,im,col,row,n:++n}); col++; if(col>=COLS){row++;col=0;} }
  if(col!==0){} }
const rows=row+(col?1:0);
for(const it of items){
  const b=await sharp(`../public/products/${it.p.slug}/${it.im.file}-thumb.webp`).resize(CW,CH,{fit:'contain',background:'#FBF8F3'}).jpeg().toBuffer();
  const X=it.col*CW,Y=it.row*(CH+CAP);
  const svg=Buffer.from(`<svg width="${CW}" height="${CAP}"><rect width="100%" height="100%" fill="#1F2A2E"/><text x="4" y="14" font-size="14" font-weight="bold" fill="#fff" font-family="Arial">#${it.n} ${esc(it.im.role)}</text><text x="4" y="29" font-size="10.5" fill="#cfe" font-family="Arial">${esc(it.p.slug.slice(0,30))}${it.p.needs_real_photo?' AI':''}</text></svg>`);
  comps.push({input:svg,left:X,top:Y},{input:b,left:X,top:Y+CAP});
}
await sharp({create:{width:W,height:rows*(CH+CAP),channels:3,background:'#ddd'}}).composite(comps).jpeg({quality:88}).toFile(out);
console.log('images',items.length,'last #',n);
