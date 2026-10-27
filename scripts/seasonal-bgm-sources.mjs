import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const SEASONS=['spring','summer','autumn','winter'];
const audioExtension=/\.(m4a|mp3|ogg|opus|wav|flac)$/i;
export function musicSeasonForFile(filename){
 if(!audioExtension.test(filename))return;
 const name=path.parse(filename).name;
 const matches=SEASONS.filter(season=>({spring:/春|spring/i,summer:/夏|summer/i,autumn:/秋|autumn|fall/i,winter:/冬|winter|^东雪/i})[season].test(name));
 return matches.length===1?matches[0]:undefined;
}
export function collectSeasonalSources(directory){
 const files=readdirSync(directory,{withFileTypes:true}).filter(f=>f.isFile()&&audioExtension.test(f.name)).map(f=>f.name).sort((a,b)=>a.localeCompare(b,'zh-CN',{numeric:true}));
 const sources=[],skipped=[],banks=Object.fromEntries(SEASONS.map(s=>[s,new Map()]));
 for(const name of files){
  const season=musicSeasonForFile(name);if(!season){skipped.push(name);continue;}
  const sourcePath=path.join(directory,name),sha256=createHash('sha256').update(readFileSync(sourcePath)).digest('hex');
  sources.push({name,season,sha256,bytes:statSync(sourcePath).size});
  if(!banks[season].has(sha256))banks[season].set(sha256,{name:path.parse(name).name,sourceName:name,path:sourcePath,sha256,season});
 }
 return {sources,skipped,tracks:SEASONS.flatMap(season=>[...banks[season].values()])};
}
