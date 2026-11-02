import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const inside = (child,root) => child.startsWith(root + path.sep);
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function files(root, folder = root) {
  return readdirSync(folder, {withFileTypes:true}).flatMap(entry => {
    const full=path.join(folder,entry.name);
    if (entry.isSymbolicLink()) throw new Error('Package assets cannot contain symlinks');
    return entry.isDirectory() ? files(root,full) : [path.relative(root,full)];
  });
}

/** Copy assets before publishing index, then remove stale files only within this package's www. */
export function syncPackageAssets(source, packageRoot) {
  source=path.resolve(source);packageRoot=path.resolve(packageRoot);
  const target=path.join(packageRoot,'www');
  if(source===target||inside(source,target)||inside(target,source))throw new Error('Package source and www overlap');
  mkdirSync(packageRoot,{recursive:true});
  if(existsSync(target)&&lstatSync(target).isSymbolicLink())throw new Error('Package www cannot be a symlink');
  mkdirSync(target,{recursive:true});
  const actualRoot=realpathSync(packageRoot),actualTarget=realpathSync(target);
  if(!inside(actualTarget,actualRoot))throw new Error('Package www escapes the package directory');
  const incoming=files(source).sort((a,b)=>Number(a==='index.html')-Number(b==='index.html')||a.localeCompare(b));
  const expected=new Set(incoming);
  for(const relative of incoming){
    const from=path.join(source,relative),to=path.join(target,relative);
    if(!inside(path.resolve(to),target))throw new Error('Invalid package asset path');
    mkdirSync(path.dirname(to),{recursive:true});
    if(!inside(realpathSync(path.dirname(to)),actualTarget)&&realpathSync(path.dirname(to))!==actualTarget)throw new Error('Package asset escapes www');
    if(existsSync(to)&&lstatSync(to).isSymbolicLink())throw new Error('Package asset cannot be a symlink');
    if(!existsSync(to)||digest(from)!==digest(to))copyFileSync(from,to);
  }
  for(const relative of files(target)){
    if(expected.has(relative))continue;
    const stale=path.resolve(target,relative);
    if(!inside(stale,target)||!inside(realpathSync(stale),actualTarget))throw new Error('Stale package asset escapes www');
    unlinkSync(stale);
  }
}
