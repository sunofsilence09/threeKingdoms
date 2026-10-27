// Import user-provided seasonal music, preserving originals and attribution.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SEASONS,collectSeasonalSources} from './seasonal-bgm-sources.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceDirectory=path.resolve(process.argv[2]??'D:/games/bgms/ThreeKingdoms');
const output=path.join(root,'public/assets/music'),catalog=collectSeasonalSources(sourceDirectory);
if(!catalog.tracks.length)throw Error('No recognized seasonal music in '+sourceDirectory);
mkdirSync(output,{recursive:true});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const counts=Object.fromEntries(SEASONS.map(s=>[s,0]));
const tracks=catalog.tracks.map(file=>{
 const id=`${file.season}-${String(++counts[file.season]).padStart(2,'0')}`,destination=path.join(output,id+'.mp3');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file.path,'-vn','-c:a','libmp3lame','-b:a','192k','-map_metadata','0','-metadata',`title=${file.name}`,destination]);
 return {id,name:file.name,season:file.season,src:`/assets/music/${id}.mp3`,sha256:hash(destination),sourceName:file.sourceName};
});
const library=Object.fromEntries(SEASONS.map(season=>[season,tracks.filter(t=>t.season===season).map(({id,name,src})=>({id,name,src}))]));
writeFileSync(path.join(root,'src/game/seasonalMusicData.ts'),`export interface MusicTrack {id:string;name:string;src:string}\nexport type MusicSeason='spring'|'summer'|'autumn'|'winter';\nexport type MusicLibrary=Readonly<Record<MusicSeason,readonly MusicTrack[]>>;\n/** Imported user music; duplicate bytes are represented once within each season. */\nexport const SEASONAL_MUSIC:MusicLibrary=${JSON.stringify(library,null,2)};\n`);
writeFileSync(path.join(root,'docs/art/seasonal-bgm-sources.json'),JSON.stringify({title:'四季剧情BGM',sourceDirectory,sources:catalog.sources,skipped:catalog.skipped,uniqueTracks:tracks.length,seasonCounts:counts,
 duplicateHandling:'Byte-identical sources share one track within their season; original files remain unchanged.',tracks,
 winterFilename:'东雪.m4a is the user-provided winter track; its filename/title are preserved.',conversion:'FFmpeg MP3 192kbps; source metadata and attribution copied (-map_metadata 0); no source files modified.'},null,2)+'\n');
console.log(`Imported ${tracks.length} seasonal track(s): ${JSON.stringify(counts)} from ${catalog.sources.length} sources.`);
if(catalog.skipped.length)console.log('Unclassified audio skipped: '+catalog.skipped.join(', '));
