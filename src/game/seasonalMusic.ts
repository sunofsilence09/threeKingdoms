import type {GameState} from './state';
import type {MusicTrack} from './springMusicData';
import {SPRING_MUSIC} from './springMusicData';
import {getMusicSettings,normalizeMusicSettings,onMusicSettings,type MusicSettings} from './musicSettings';

type MusicContext=Pick<GameState,'date'|'phase'>;
interface AudioPort {
 src:string;currentTime:number;volume:number;paused:boolean;preload:string;loop:boolean;
 play:()=>Promise<void>|undefined;pause:()=>void;
 addEventListener:(type:string,listener:()=>void)=>void;
}
export function isSpringNarrative(state:MusicContext):boolean {
 return Number.isInteger(state.date.month)&&state.date.month>=3&&state.date.month<=5&&state.phase!=='battle';
}
export function chooseMusicIndex(count:number,previous:number,random:()=>number):number {
 if(count<=0)return -1;if(count===1)return 0;
 const eligible=Array.from({length:count},(_,i)=>i).filter(i=>i!==previous);
 const value=random();const roll=Number.isFinite(value)?Math.min(.999999999,Math.max(0,value)):0;
 return eligible[Math.floor(roll*eligible.length)];
}
let fallbackSeed=Date.now()>>>0;
function independentRandom():number {
 try{return crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;}catch{
  fallbackSeed=(Math.imul(fallbackSeed,1664525)+1013904223)>>>0;return fallbackSeed/4294967296;
 }
}
/** Presentation-only audio. This class never changes dates, RPG fields or gameplay RNG. */
export class SeasonalMusicPlayer {
 private audio?:AudioPort;private state?:MusicContext;private session=false;private visible=true;
 private key?:string;private index=-1;private previous=-1;private pending?:number;private serial=0;
 private settings:MusicSettings;private readonly createAudio:()=>AudioPort;private readonly random:()=>number;
 blocked=false;
 constructor(private readonly tracks:readonly MusicTrack[],options:{createAudio?:()=>AudioPort;random?:()=>number;settings?:MusicSettings}={}){
  this.createAudio=options.createAudio??(()=>new Audio());this.random=options.random??independentRandom;
  this.settings=normalizeMusicSettings(options.settings);
 }
 get currentTrack():MusicTrack|undefined{return this.tracks[this.index];}
 update(state:MusicContext):void {
  this.state={date:{...state.date},phase:state.phase};
  const key=state.date.month>=3&&state.date.month<=5?`${state.date.year}-spring`:undefined;
  if(key!==this.key){this.pause();this.index=-1;this.key=key;if(this.audio)this.audio.currentTime=0;}
  this.sync();
 }
 /** Call only from an explicit start/continue gesture. */
 begin():void {this.session=true;this.retry();}
 retry():void {this.blocked=false;this.sync();}
 setVisible(visible:boolean):void {this.visible=visible;this.sync();}
 setSettings(settings:MusicSettings):void {this.settings=normalizeMusicSettings(settings);if(this.audio)this.audio.volume=this.settings.volume;this.sync();}
 advance():void {
  if(!this.shouldPlay())return;
  this.pause();this.index=-1;this.blocked=false;this.sync();
 }
 private shouldPlay():boolean {
  return this.session&&this.visible&&!!this.state&&isSpringNarrative(this.state)&&!this.settings.muted&&this.settings.volume>0;
 }
 private pause():void {this.serial++;this.pending=undefined;this.audio?.pause();}
 private sync():void {
  if(!this.shouldPlay()){this.pause();return;}
  if(this.blocked||this.pending!==undefined)return;
  if(this.index<0){
   this.index=chooseMusicIndex(this.tracks.length,this.previous,this.random);
   if(this.index<0)return;this.previous=this.index;
   try{
    if(!this.audio){
     this.audio=this.createAudio();this.audio.preload='metadata';this.audio.loop=false;
     this.audio.addEventListener('ended',()=>this.advance());
     this.audio.addEventListener('error',()=>{this.blocked=true;this.pause();});
    }
    this.audio.src=this.currentTrack!.src;this.audio.currentTime=0;
   }catch{this.index=-1;this.blocked=true;return;}
  }
  const audio=this.audio;if(!audio)return;
  audio.volume=this.settings.volume;if(!audio.paused)return;
  const ticket=++this.serial;this.pending=ticket;
  try{
   Promise.resolve(audio.play()).then(()=>{if(!this.shouldPlay())audio.pause();if(ticket===this.serial)this.blocked=false;},()=>{if(ticket===this.serial)this.blocked=true;})
    .finally(()=>{if(this.pending===ticket)this.pending=undefined;});
  }catch{this.pending=undefined;this.blocked=true;}
 }
}
export const springMusic=new SeasonalMusicPlayer(SPRING_MUSIC,{settings:getMusicSettings()});
onMusicSettings(settings=>springMusic.setSettings(settings));

export function bindMusicLifecycle():()=>void {
 const visibility=()=>springMusic.setVisible(!document.hidden);
 const retry=()=>springMusic.retry();const pagehide=()=>springMusic.setVisible(false);
 document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',retry,{passive:true});
 document.addEventListener('keydown',retry);window.addEventListener('pagehide',pagehide);window.addEventListener('pageshow',visibility);visibility();
 return ()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',retry);
  document.removeEventListener('keydown',retry);window.removeEventListener('pagehide',pagehide);window.removeEventListener('pageshow',visibility);springMusic.setVisible(false);};
}
