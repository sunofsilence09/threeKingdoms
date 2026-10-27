import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {musicSeasonForFile,collectSeasonalSources} from './seasonal-bgm-sources.mjs';

test('recognizes seasonal names and the provided winter filename without guessing unknown music',()=>{
 for(const [name,season] of [['春日.m4a','spring'],['春日2.m4a','spring'],['夏天.m4a','summer'],['秋风.m4a','autumn'],['东雪.m4a','winter'],['冬雪2.MP3','winter'],['winter-2.ogg','winter']])assert.equal(musicSeasonForFile(name),season);
 for(const name of ['战斗.m4a','春夏.m4a','README.md'])assert.equal(musicSeasonForFile(name),undefined);
});
test('deduplicates bytes within each bank, preserves cross-season assignments and reports unknown files',()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'three-kingdoms-seasonal-'));
 try{
  for(const [name,bytes] of [['春日.m4a','spring'],['春日2.m4a','spring'],['夏天.m4a','summer'],['秋风.m4a','same'],['东雪.m4a','same'],['战斗.mp3','other'],['README.txt','readme']])writeFileSync(path.join(folder,name),bytes);
  const result=collectSeasonalSources(folder);
  assert.equal(result.sources.length,5);assert.equal(result.tracks.length,4);
  assert.deepEqual(result.tracks.map(t=>t.season),['spring','summer','autumn','winter']);
  assert.deepEqual(result.skipped,['战斗.mp3']);
  assert.equal(result.tracks[0].name,'春日');assert.equal(result.tracks[3].name,'东雪');
  assert.ok(result.sources.every(t=>/^[a-f0-9]{64}$/.test(t.sha256)));
 }finally{
  assert.equal(path.dirname(path.resolve(folder)),path.resolve(tmpdir()));
  assert.ok(path.basename(folder).startsWith('three-kingdoms-seasonal-'));
  rmSync(folder,{recursive:true,force:true});
 }
});
