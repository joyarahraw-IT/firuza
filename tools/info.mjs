import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const root='../assets/originals';
const walk=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
for (const f of walk(root)) { if(f.endsWith('.txt'))continue; const m=await sharp(f).metadata(); console.log(m.width+'x'+m.height, path.relative(root,f)); }
