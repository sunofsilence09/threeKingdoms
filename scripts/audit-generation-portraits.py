"""Read-only provenance and transparent silhouette audit for all26 new assets."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
first=json.loads((ROOT/'docs/art/generations-portraits-8.json').read_text(encoding='utf-8'))
second=json.loads((ROOT/'docs/art/generations-portraits-18.json').read_text(encoding='utf-8'))['portraits']
entries=[{'id':p['id'],'assetPath':p['asset'],'sourcePath':p['original']} for p in first]+second
records=[]
for entry in entries:
    path=ROOT/entry['assetPath']
    raw=path.read_bytes()
    assert raw==Path(entry['sourcePath']).read_bytes(),entry['id']
    with Image.open(path) as picture:
        assert picture.mode=='RGBA',entry['id']
        width,height=picture.size
        assert height>width,entry['id']
        alpha=picture.getchannel('A')
        bounds=alpha.point(lambda value:255 if value>200 else 0).getbbox()
        corners=[alpha.getpixel(p) for p in [(0,0),(width-1,0),(0,height-1),(width-1,height-1)]]
        assert max(corners)<=1 and bounds,entry['id']
        assert 0<bounds[0]<bounds[2]<width and 0<bounds[1]<bounds[3]<height,entry['id']
        records.append({'id':entry['id'],'assetPath':entry['assetPath'],'sha256':hashlib.sha256(raw).hexdigest(),
          'bytes':len(raw),'size':[width,height],'mode':picture.mode,'cornerAlpha':corners,
          'effectiveAlphaAbove200Bounds':bounds,'sourceUnmodified':True})
assert len(records)==26 and len({r['id'] for r in records})==26 and len({r['sha256'] for r in records})==26
result={'count':26,'uniqueHashes':26,'visualReview':'Each independently viewed; full headwear, hands, footwear and props present.',
  'alphaNote':'Up to1/255 invisible corner dither is recorded; effective opaque silhouette must be wholly within canvas. Original PNGs are unmodified.',
  'portraits':records}
(ROOT/'docs/art/generations-portraits-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS:26 distinct RGBA portraits, complete silhouette margins, source hashes unchanged')
