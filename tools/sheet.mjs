import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
// usage: node sheet.mjs out.jpg cellW cellH cols file1 file2 ... (label = index+offset or basename)
const [out,cw,ch,cols,...files]=process.argv.slice(2); const W=+cw,H=+ch,C=+cols;
const rows=Math.ceil(files.length/C); const comps=[];
for(let i=0;i<files.length;i++){
  const f=files[i]; const b=await sharp(f).resize(W,H,{fit:'contain',background:'#888'}).jpeg().toBuffer();
  const label=path.basename(f).replace(/_2026.*$/,'').slice(0,28);
  const svg=Buffer.from(`<svg width="${W}" height="26"><rect width="100%" height="100%" fill="#000" opacity=".7"/><text x="4" y="19" font-size="16" fill="#fff" font-family="Arial">${i+1} ${label.replace(/[&<>{}]/g,'')}</text></svg>`);
  const x=(i%C)*W,y=Math.floor(i/C)*H;
  comps.push({input:b,left:x,top:y},{input:svg,left:x,top:y});
}
await sharp({create:{width:W*C,height:H*rows,channels:3,background:'#fff'}}).composite(comps).jpeg({quality:85}).toFile(out);
