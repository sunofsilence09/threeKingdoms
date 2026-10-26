"""Read-only provenance and transparency checks for all forty 1.1 portraits."""
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
history=json.loads((ROOT/'docs/art/v11-historical-portraits.json').read_text(encoding='utf-8'))['entries']
original=json.loads((ROOT/'docs/art/v11-original-prefect-portraits.json').read_text(encoding='utf-8'))['items']
assert len(history)==32 and len(original)==8
results=[]
for entry in history+original:
    target=ROOT/'public/assets/characters'/f'{entry["id"]}-v1.png'
    data=target.read_bytes();digest=hashlib.sha256(data).hexdigest()
    assert digest==entry['sha256'],entry['id']
    assert data==Path(entry['originalPath']).read_bytes(),entry['id']
    assert entry['prompt'] and entry['originalPath'],entry['id']
    im=Image.open(target);assert im.mode=='RGBA' and im.size==(1024,1536),entry['id']
    alpha=im.getchannel('A');w,h=im.size
    corners=[alpha.getpixel(p) for p in [(0,0),(w-1,0),(0,h-1),(w-1,h-1)]]
    assert max(corners)<=1,entry['id']
    bbox=alpha.point(lambda n:255 if n>200 else 0).getbbox();assert bbox and 0<bbox[0]<bbox[2]<w and 0<bbox[1]<bbox[3]<h,entry['id']
    results.append({'id':entry['id'],'sha256':digest,'size':list(im.size),'corners':corners,'subjectBounds':list(bbox)})
assert len(set(r['sha256'] for r in results))==40
output=ROOT/'artifacts/v11-assets-audit.json';output.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'portraits':40,'uniqueOriginals':40,'transparentRGBA':40,'result':str(output)},ensure_ascii=False))
