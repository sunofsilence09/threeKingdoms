import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {normalizeMusicSettings} from './musicSettings';
beforeEach(()=>vi.resetModules());afterEach(()=>vi.unstubAllGlobals());
describe('independent background-music preferences',()=>{
 it('defaults softly and clamps corrupt or excessive volume',()=>{
  expect(normalizeMusicSettings(null)).toEqual({muted:false,volume:.3});
  expect(normalizeMusicSettings({muted:'yes',volume:Infinity})).toEqual({muted:false,volume:.3});
  expect(normalizeMusicSettings({muted:true,volume:9})).toEqual({muted:true,volume:1});
  expect(normalizeMusicSettings({volume:-2}).volume).toBe(0);
 });
 it('saves and reloads background settings without changing attack-sound preferences',async()=>{
  const data=new Map([['three-kingdoms-audio-v1','{"muted":true,"volume":0.65}']]);
  vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
  const settings=await import('./musicSettings');expect(settings.getMusicSettings().volume).toBe(.3);
  settings.setMusicSettings({volume:.15,muted:true});vi.resetModules();
  expect((await import('./musicSettings')).getMusicSettings()).toEqual({volume:.15,muted:true});
  expect(data.get('three-kingdoms-audio-v1')).toBe('{"muted":true,"volume":0.65}');
 });
 it('keeps working in memory when storage is unavailable and unsubscribes listeners',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('denied');},setItem:()=>{throw Error('denied');}});
  const settings=await import('./musicSettings'),listener=vi.fn(),remove=settings.onMusicSettings(listener);
  expect(()=>settings.setMusicSettings({volume:.4})).not.toThrow();expect(listener).toHaveBeenCalledTimes(1);
  remove();settings.setMusicSettings({muted:true});expect(listener).toHaveBeenCalledTimes(1);
  expect(settings.getMusicSettings()).toEqual({volume:.4,muted:true});
 });
});
