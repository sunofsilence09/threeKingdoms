"""Read-only source preservation, release size and WebP audit for version2.4."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/v2.4'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def inventory(root):return {p.relative_to(root).as_posix():p for p in root.rglob('*') if p.is_file()}
def size(root):return sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
baseline=json.loads((OUT/'baseline-public.json').read_text(encoding='utf-8'))
changed=[name for name,data in baseline.items() if not (ROOT/name).is_file() or digest(ROOT/name)!=data['sha256']]
assert not changed,changed
roster=json.loads((ROOT/'docs/art/2026-11-02-v24-roster.json').read_text(encoding='utf-8'))
manifest=json.loads((ROOT/'.generated/public/asset-manifest.json').read_text(encoding='utf-8'))
root_png=list((ROOT/'public/assets/characters').glob('*.png'))
all_png=list((ROOT/'public/assets/characters').rglob('*.png'))
assert len(root_png)==170 and len(all_png)==184,(len(root_png),len(all_png))
assert len(manifest['images'])==201,len(manifest['images'])
images=[]
for person in roster:
    source=ROOT/'public'/person['portrait'].lstrip('/')
    with Image.open(source) as image:
        assert image.size==(1024,1536) and image.mode=='RGBA',person['id']
        assert image.getchannel('A').getextrema()[0]==0,person['id']
    images.append({'id':person['id'],'sha256':digest(source)})
assert len({r['sha256'] for r in images})==37
for entry in manifest['images']:
    source=ROOT/'public'/entry['source'];target=ROOT/'.generated/public'/entry['output']
    assert digest(source)==entry['sourceSha256'] and digest(target)==entry['sha256']
    with Image.open(source) as image,Image.open(target) as compressed:
        assert image.size==compressed.size,entry['source']
        assert image.convert('RGBA').getchannel('A').tobytes()==compressed.convert('RGBA').getchannel('A').tobytes(),entry['source']
dist=inventory(ROOT/'dist');package=ROOT/'release/三国行旅-2.4.0-本地版'
www=inventory(package/'www')
assert dist.keys()==www.keys()
assert not [name for name in www if name.lower().endswith('.png')]
assert all(digest(p)==digest(www[name]) for name,p in dist.items())
old=ROOT/'release/三国行旅-2.3.0-本地版'
report={'originalCharacterDirectory':133,'characterDirectoryNow':170,'heroExtras':14,'allCharacterImages':184,'newPeople':images,
    'sourcePngsUnchanged':True,'allOriginalPublicFilesUnchanged':len(baseline),'preparedImages':201,'alphaAndDimensionsExact':True,
    'encoder':manifest['encoder'],'settings':manifest['settings'],'originalV23PackageBytes':size(old),
    'expandedOriginalPublicBytes':size(ROOT/'public'),'preparedPublicBytes':size(ROOT/'.generated/public'),
    'distributionBytes':size(ROOT/'dist'),'packageBytes':size(package),'packageFilesMatchingBuild':len(dist),'packageContainsPng':False}
report['reductionVsV23Percent']=round((1-report['packageBytes']/report['originalV23PackageBytes'])*100,2)
(OUT/'asset-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='newPeople'},ensure_ascii=False,indent=2))
