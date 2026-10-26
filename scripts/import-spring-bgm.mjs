// Import user-provided music, preserving source files and attribution metadata.
import {readFileSync,readdirSync,mkdirSync,writeFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceDirectory=path.resolve(process.argv[2]??'D:/games/bgms/ThreeKingdoms');
const output=path.join(root,'public/assets/music');mkdirSync(output,{recursive:true});
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const sources=readdirSync(sourceDirectory,{withFileTypes:true}).filter(f=>f.isFile()&&/\.(m4a|mp3|ogg|opus|wav|flac)$/i.test(f.name))
 .map(f=>({name:f.name,path:path.join(sourceDirectory,f.name)})).sort((a,b)=>a.name.localeCompare(b.name,'zh-CN',{numeric:true}));
if(!sources.length)throw Error('No supported music files in '+sourceDirectory);
const unique=new Map();const manifest=sources.map(file=>{const sha256=hash(file.path);const item={name:file.name,sha256,bytes:statSync(file.path).size};if(!unique.has(sha256))unique.set(sha256,file);return item;});
const tracks=[...unique.values()].map((file,index)=>{
 const id=`spring-${String(index+1).padStart(2,'0')}`,name=path.parse(file.name).name;
 const destination=path.join(output,id+'.mp3');
 execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file.path,'-vn','-c:a','libmp3lame','-b:a','192k','-map_metadata','0','-metadata',`title=${name}`,destination]);
 return {id,name,src:`/assets/music/${id}.mp3`,sha256:hash(destination),sourceName:file.name};
});
writeFileSync(path.join(root,'src/game/springMusicData.ts'),
 `export interface MusicTrack {id:string;name:string;src:string}\n/** Imported user music; byte-identical files are represented once. */\nexport const SPRING_MUSIC:readonly MusicTrack[]=${JSON.stringify(tracks.map(({id,name,src})=>({id,name,src})),null,2)};\n`);
writeFileSync(path.join(root,'docs/art/spring-bgm-sources.json'),JSON.stringify({title:'春季剧情BGM试听',sourceDirectory,sources:manifest,uniqueTracks:tracks.length,
 duplicateHandling:'Byte-identical sources share a single track; original files remain unchanged.',tracks,
 conversion:'FFmpeg MP3 192kbps, source metadata and attribution copied (-map_metadata 0); no source files modified.'},null,2)+'\n');
console.log(`Imported ${tracks.length} unique spring track(s) from ${sources.length} source files.`);
