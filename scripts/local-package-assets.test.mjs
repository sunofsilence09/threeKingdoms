import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, statSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { syncPackageAssets } from './local-package-assets.mjs';

test('package refresh removes stale images and hashed bundles, retaining runtime and unchanged file times', () => {
  const root=mkdtempSync(path.join(tmpdir(),'three-kingdoms-package-'));
  try {
    const source=path.join(root,'dist'),output=path.join(root,'package');
    mkdirSync(source);mkdirSync(path.join(output,'runtime'),{recursive:true});
    writeFileSync(path.join(output,'runtime','node.exe'),'runtime');
    writeFileSync(path.join(source,'index.html'),'old');writeFileSync(path.join(source,'old.js'),'old');writeFileSync(path.join(source,'portrait.png'),'png');
    syncPackageAssets(source,output);
    unlinkSync(path.join(source,'old.js'));unlinkSync(path.join(source,'portrait.png'));
    writeFileSync(path.join(source,'index.html'),'new');writeFileSync(path.join(source,'new.js'),'new');writeFileSync(path.join(source,'portrait.webp'),'webp');
    syncPackageAssets(source,output);
    const webp=path.join(output,'www','portrait.webp'),stamp=statSync(webp).mtimeMs;
    assert.equal(existsSync(path.join(output,'www','portrait.png')),false);
    assert.equal(existsSync(path.join(output,'www','old.js')),false);
    assert.equal(readFileSync(path.join(output,'www','index.html'),'utf8'),'new');
    assert.equal(readFileSync(path.join(output,'runtime','node.exe'),'utf8'),'runtime');
    syncPackageAssets(source,output);assert.equal(statSync(webp).mtimeMs,stamp);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('package refresh refuses source and www overlap',()=>{
  const root=mkdtempSync(path.join(tmpdir(),'three-kingdoms-package-'));
  try {mkdirSync(path.join(root,'www'));assert.throws(()=>syncPackageAssets(path.join(root,'www'),root),/overlap/);}
  finally {rmSync(root,{recursive:true,force:true});}
});
