export interface MusicSettings {muted:boolean;volume:number}
export const MUSIC_SETTINGS_KEY='three-kingdoms-bgm-v1';
export function normalizeMusicSettings(value:unknown):MusicSettings {
 const input=value&&typeof value==='object'?value as Partial<MusicSettings>:{};
 return {muted:typeof input.muted==='boolean'?input.muted:false,
  volume:typeof input.volume==='number'&&Number.isFinite(input.volume)?Math.min(1,Math.max(0,input.volume)):.3};
}
let current:MusicSettings|undefined;
const listeners=new Set<(settings:MusicSettings)=>void>();
export function getMusicSettings():MusicSettings {
 if(!current){try{current=normalizeMusicSettings(JSON.parse(localStorage.getItem(MUSIC_SETTINGS_KEY)??'null'));}catch{current=normalizeMusicSettings(null);}}
 return {...current};
}
export function setMusicSettings(patch:Partial<MusicSettings>):MusicSettings {
 current=normalizeMusicSettings({...getMusicSettings(),...patch});
 try{localStorage.setItem(MUSIC_SETTINGS_KEY,JSON.stringify(current));}catch{/* In-memory settings still work. */}
 for(const listener of listeners)listener({...current});return {...current};
}
export function onMusicSettings(listener:(settings:MusicSettings)=>void):()=>void {
 listeners.add(listener);return ()=>{listeners.delete(listener);};
}
