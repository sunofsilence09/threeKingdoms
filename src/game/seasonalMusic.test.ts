import {describe,it,expect,vi} from 'vitest';
import {SeasonalMusicPlayer,chooseMusicIndex,isSpringNarrative} from './seasonalMusic';
const tracks=[{id:'one',name:'第一首',src:'/one.mp3'},{id:'two',name:'第二首',src:'/two.mp3'}];
const spring={date:{year:184,month:3},phase:'overworld' as const};
function fixture(random=()=>0){
 const audio={src:'',currentTime:0,volume:1,paused:true,preload:'',loop:false,
  play:vi.fn(function(this:{paused:boolean}){this.paused=false;return Promise.resolve();}),
  pause:vi.fn(function(this:{paused:boolean}){this.paused=true;}),addEventListener:vi.fn(),removeEventListener:vi.fn(),
  removeAttribute:vi.fn(),load:vi.fn()};
 const createAudio=vi.fn(()=>audio);const player=new SeasonalMusicPlayer(tracks,{createAudio,random});
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
  const single=new SeasonalMusicPlayer([tracks[0]],{createAudio:()=>audio});single.update(spring);single.begin();await Promise.resolve();
  audio.currentTime=177;audio.paused=true;single.advance();await Promise.resolve();expect(audio.currentTime).toBe(0);expect(single.currentTrack?.id).toBe('one');
 });
 it('preserves position for independent mute/volume changes and survives unavailable media',async()=>{
  const {player,audio}=fixture();player.update(spring);player.begin();await Promise.resolve();audio.currentTime=14;
  player.setSettings({muted:true,volume:.2});expect(audio.paused).toBe(true);
  player.setSettings({muted:false,volume:.2});await Promise.resolve();expect(audio.volume).toBe(.2);expect(audio.currentTime).toBe(14);
  const unavailable=new SeasonalMusicPlayer(tracks,{createAudio:()=>{throw Error('Unavailable');}});
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
