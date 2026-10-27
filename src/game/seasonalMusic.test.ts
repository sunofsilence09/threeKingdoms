import {describe,it,expect,vi} from 'vitest';
import {SeasonalMusicPlayer,chooseMusicIndex,isSpringNarrative,musicSeason} from './seasonalMusic';
const tracks=[{id:'one',name:'第一首',src:'/one.mp3'},{id:'two',name:'第二首',src:'/two.mp3'}];
const spring={date:{year:184,month:3},phase:'overworld' as const};
const springOnly=(songs=tracks)=>({spring:songs,summer:[],autumn:[],winter:[]});
function fixture(random=()=>0){
 const audio={src:'',currentTime:0,volume:1,paused:true,preload:'',loop:false,
  play:vi.fn(function(this:{paused:boolean}){this.paused=false;return Promise.resolve();}),
  pause:vi.fn(function(this:{paused:boolean}){this.paused=true;}),addEventListener:vi.fn(),removeEventListener:vi.fn(),
  removeAttribute:vi.fn(),load:vi.fn()};
 const createAudio=vi.fn(()=>audio);const player=new SeasonalMusicPlayer(springOnly(),{createAudio,random});
 return {player,audio,createAudio};
}
describe('spring narrative music lifecycle',()=>{
 it('selects only March to May narrative scenes',()=>{
  for(const month of [3,4,5])expect(isSpringNarrative({...spring,date:{year:184,month}})).toBe(true);
  for(const month of [1,2,6,7,8,9,10,11,12])expect(isSpringNarrative({...spring,date:{year:184,month}})).toBe(false);
  expect(isSpringNarrative({...spring,phase:'battle'})).toBe(false);
 });
 it('waits for the start gesture; frequent updates never replace or rewind the track',async()=>{
  const {player,audio,createAudio}=fixture();player.update(spring);expect(createAudio).not.toHaveBeenCalled();
  player.begin();await Promise.resolve();expect(audio.src).toBe('/one.mp3');expect(audio.play).toHaveBeenCalledTimes(1);
  audio.currentTime=37;player.update({...spring,date:{year:184,month:4}});player.update(spring);
  expect(audio.currentTime).toBe(37);expect(audio.play).toHaveBeenCalledTimes(1);
 });
 it('pauses battle and the background, resuming the same position',async()=>{
  const {player,audio}=fixture();player.update(spring);player.begin();await Promise.resolve();audio.currentTime=28;
  player.update({...spring,phase:'battle'});expect(audio.paused).toBe(true);
  player.update(spring);await Promise.resolve();expect(audio.paused).toBe(false);expect(audio.currentTime).toBe(28);
  player.setVisible(false);expect(audio.paused).toBe(true);player.setVisible(true);await Promise.resolve();
  expect(audio.paused).toBe(false);expect(audio.currentTime).toBe(28);
 });
 it('releases music outside spring and chooses again for the next spring',async()=>{
  const {player,audio}=fixture();player.update(spring);player.begin();await Promise.resolve();
  player.update({...spring,date:{year:184,month:6}});expect(audio.paused).toBe(true);expect(player.currentTrack).toBeUndefined();
  player.update({...spring,date:{year:185,month:3}});await Promise.resolve();expect(player.currentTrack?.id).toBe('two');
 });
 it('uses an independent random source and rotates tracks on ended, including a single-song loop',async()=>{
  const random=vi.fn(()=>.99),{player,audio}=fixture(random);player.update(spring);player.begin();await Promise.resolve();
  expect(player.currentTrack?.id).toBe('two');audio.paused=true;player.advance();await Promise.resolve();expect(player.currentTrack?.id).toBe('one');
  expect(random).toHaveBeenCalledTimes(2);expect(chooseMusicIndex(1,0,()=>.9)).toBe(0);expect(chooseMusicIndex(0,-1,()=>0)).toBe(-1);
  const single=new SeasonalMusicPlayer(springOnly([tracks[0]]),{createAudio:()=>audio});single.update(spring);single.begin();await Promise.resolve();
  audio.currentTime=177;audio.paused=true;single.advance();await Promise.resolve();expect(audio.currentTime).toBe(0);expect(single.currentTrack?.id).toBe('one');
 });
 it('preserves position for independent mute/volume changes and survives unavailable media',async()=>{
  const {player,audio}=fixture();player.update(spring);player.begin();await Promise.resolve();audio.currentTime=14;
  player.setSettings({muted:true,volume:.2});expect(audio.paused).toBe(true);
  player.setSettings({muted:false,volume:.2});await Promise.resolve();expect(audio.volume).toBe(.2);expect(audio.currentTime).toBe(14);
  const unavailable=new SeasonalMusicPlayer(springOnly(),{createAudio:()=>{throw Error('Unavailable');}});
  unavailable.update(spring);expect(()=>unavailable.begin()).not.toThrow();
 });
 it('catches autoplay rejection, retries on a new gesture and cancels late playback after a battle transition',async()=>{
  const {player,audio}=fixture();audio.play.mockImplementationOnce(()=>Promise.reject(Error('NotAllowedError')));
  player.update(spring);player.begin();await new Promise(resolve=>setTimeout(resolve,0));expect(player.blocked).toBe(true);
  player.retry();await new Promise(resolve=>setTimeout(resolve,0));expect(player.blocked).toBe(false);
  player.setVisible(false);let resolve!:()=>void;audio.play.mockImplementationOnce(()=>new Promise<void>(r=>{resolve=r;}));
  player.setVisible(true);player.update({...spring,phase:'battle'});audio.paused=false;resolve();await Promise.resolve();expect(audio.paused).toBe(true);
 });
});

describe('four-season narrative playlists',()=>{
 const libraries={spring:[{id:'s',name:'春日',src:'/spring.mp3'}],summer:[{id:'u',name:'夏天',src:'/summer.mp3'}],
  autumn:[{id:'a',name:'秋风',src:'/autumn.mp3'}],winter:[{id:'w',name:'东雪',src:'/winter.mp3'}]};
 const setup=()=>{const {audio}=fixture();const player=new SeasonalMusicPlayer(libraries,{createAudio:()=>audio,random:()=>0});return {audio,player};};
 it.each([[1,'w'],[2,'w'],[3,'s'],[4,'s'],[5,'s'],[6,'u'],[7,'u'],[8,'u'],[9,'a'],[10,'a'],[11,'a'],[12,'w']])('plays the correct bank in month %i',async(month,id)=>{
  const {audio,player}=setup();player.update({...spring,date:{year:184,month:Number(month)}});player.begin();await Promise.resolve();
  expect(player.currentTrack?.id).toBe(id);expect(audio.paused).toBe(false);
 });
 it('changes at every season boundary and preserves time within each season',async()=>{
  const {audio,player}=setup();player.update(spring);player.begin();await Promise.resolve();
  for(const [first,second,third,id] of [[3,4,5,'s'],[6,7,8,'u'],[9,10,11,'a']]){
   player.update({...spring,date:{year:184,month:Number(first)}});await Promise.resolve();
   expect(player.currentTrack?.id).toBe(id);expect(audio.currentTime).toBe(0);
   audio.currentTime=27;player.update({...spring,date:{year:184,month:Number(second)}});player.update({...spring,date:{year:184,month:Number(third)}});
   expect(audio.currentTime).toBe(27);
  }
 });
 it('keeps December and the following January/February in one winter, but resets the following winter',async()=>{
  const {audio,player}=setup();player.update({...spring,date:{year:184,month:12}});player.begin();await Promise.resolve();
  audio.currentTime=39;player.update({...spring,date:{year:185,month:1}});player.update({...spring,date:{year:185,month:2}});
  expect(player.currentTrack?.id).toBe('w');expect(audio.currentTime).toBe(39);expect(audio.play).toHaveBeenCalledTimes(1);
  player.update({...spring,date:{year:185,month:12}});await Promise.resolve();expect(audio.currentTime).toBe(0);
 });
 it('pauses and resumes summer, autumn and winter without losing the current song',async()=>{
  for(const month of [6,9,12]){
   const {audio,player}=setup();const context={...spring,date:{year:184,month}};player.update(context);player.begin();await Promise.resolve();audio.currentTime=18;
   player.update({...context,phase:'battle'});expect(audio.paused).toBe(true);player.update(context);await Promise.resolve();
   player.setVisible(false);expect(audio.paused).toBe(true);player.setVisible(true);await Promise.resolve();
   expect(audio.paused).toBe(false);expect(audio.currentTime).toBe(18);
  }
 });
 it('chooses the new season while muted and leaves an empty bank silent',async()=>{
  const {audio,player}=setup();player.update(spring);player.begin();await Promise.resolve();
  player.setSettings({muted:true,volume:.3});player.update({...spring,date:{year:184,month:6}});expect(audio.paused).toBe(true);
  player.setSettings({muted:false,volume:.3});await Promise.resolve();expect(player.currentTrack?.id).toBe('u');
  const empty=new SeasonalMusicPlayer({...libraries,summer:[]},{createAudio:()=>audio});empty.update({...spring,date:{year:184,month:6}});empty.begin();
  expect(empty.currentTrack).toBeUndefined();
 });
 it('never replaces a seasonal song with another bank and retains each bank repeat history',async()=>{
  const {audio}=fixture();const summer=[...libraries.summer,{id:'u2',name:'夏2',src:'/summer2.mp3'}];
  const player=new SeasonalMusicPlayer({...libraries,summer},{createAudio:()=>audio,random:()=>0});
  player.update({...spring,date:{year:184,month:6}});player.begin();await Promise.resolve();expect(player.currentTrack?.id).toBe('u');
  player.update({...spring,date:{year:184,month:9}});await Promise.resolve();expect(player.currentTrack?.id).toBe('a');
  player.update({...spring,date:{year:185,month:6}});await Promise.resolve();expect(player.currentTrack?.id).toBe('u2');
  audio.paused=true;player.advance();await Promise.resolve();expect(player.currentTrack?.id).toBe('u');
 });
 it('does not create audio for invalid calendar months',()=>{
  for(const month of [0,13,NaN,Infinity,2.5]){
   const createAudio=vi.fn();const player=new SeasonalMusicPlayer(libraries,{createAudio});
   expect(musicSeason(month)).toBeUndefined();player.update({...spring,date:{year:184,month}});player.begin();expect(createAudio).not.toHaveBeenCalled();
  }
 });
});
