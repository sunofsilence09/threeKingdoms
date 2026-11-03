"""Verify the final portable copy and unchanged optimized art without mutating either."""
from pathlib import Path
import hashlib, json

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/v2.5'
PACKAGE=ROOT/'release/三国行旅-2.5.0-本地版'
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def inventory(path): return {p.relative_to(path).as_posix():p for p in path.rglob('*') if p.is_file()}
def size(path): return sum(p.stat().st_size for p in path.rglob('*') if p.is_file())

dist=inventory(ROOT/'dist'); www=inventory(PACKAGE/'www')
assert set(dist)==set(www), {'missing':sorted(set(dist)-set(www)),'stale':sorted(set(www)-set(dist))}
assert all(digest(p)==digest(www[name]) for name,p in dist.items())
assert not list((PACKAGE/'www').rglob('*.png'))
assert '2.5.0' in (PACKAGE/'www/index.html').read_text(encoding='utf-8')
manifest=json.loads((PACKAGE/'www/asset-manifest.json').read_text(encoding='utf-8'))
assert len(manifest['images'])==201
old=ROOT/'release/三国行旅-2.4.0-本地版/www'
for image in manifest['images']:
    target=PACKAGE/'www'/image['output']
    assert digest(target)==image['sha256'], image['output']
    assert digest(ROOT/'public'/image['source'])==image['sourceSha256'], image['source']
    assert digest(target)==digest(old/image['output']), image['output']
result={'version':'2.5.0','wwwFiles':len(www),'hashesMatchDist':True,'optimizedImages':len(manifest['images']),
        'imagesUnchangedFrom24':True,'pngInRelease':0,'distBytes':size(ROOT/'dist'),'packageBytes':size(PACKAGE),
        'old24PackageBytes':size(old.parent),'runtimeIncluded':(PACKAGE/'runtime/node.exe').is_file()}
(OUT/'package-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
