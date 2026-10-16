import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const O='../assets/originals'; const files=[];
for(const c of ['necklaces','bracelets','earrings','crochet']) for(const f of fs.readdirSync(`${O}/${c}`)) files.push(`${O}/${c}/${f}`);
const comps=[]; const S=[];
for(let i=0;i<files.length;i++){
 const m=await sharp(files[i]).metadata();
 const top=await sharp(files[i]).extract({left:0,top:0,width:m.width,height:110}).toBuffer();
 const bot=await sharp(files[i]).extract({left:0,top:m.height-110,width:m.width,height:110}).toBuffer();
 comps.push({input:top,left:(i%9)*290,top:Math.floor(i/9)*250});
 comps.push({input:await sharp(bot).resize(285).toBuffer(),left:(i%9)*290,top:Math.floor(i/9)*250+120});
 S.push(i+1+' '+path.basename(files[i]).slice(0,9));
}
const comps2=comps.map(c=>({...c,input:c.input}));
await sharp({create:{width:290*9,height:250*4,channels:3,background:'#f0f'}}).composite(await Promise.all(comps.map(async c=>({...c,input:await sharp(c.input).resize({width:285}).toBuffer()})))).jpeg({quality:85}).toFile('../_work/strips.jpg');
console.log(S.join('\n'));
