"""Verify original bytes, converted hashes, duration and attribution metadata."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'docs/art/seasonal-bgm-sources.json').read_text(encoding='utf-8'))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def probe(path):
    return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:format_tags','-of','json',str(path)],encoding='utf-8'))['format']
source=Path(manifest['sourceDirectory'])
for item in manifest['sources']:
    original=source/item['name']
    assert original.stat().st_size==item['bytes'] and sha(original)==item['sha256'],item['name']
results=[]
for track in manifest['tracks']:
    original=probe(source/track['sourceName'])
    target=ROOT/'public'/track['src'].lstrip('/')
    assert sha(target)==track['sha256'],str(target)
    converted=probe(target)
    assert abs(float(original['duration'])-float(converted['duration']))<.2,track['id']
    assert converted['tags']['title']==track['name']
    for key in ['comment','copyright','artist']:
        if key in original.get('tags',{}):assert original['tags'][key]==converted['tags'].get(key),key
    results.append({'id':track['id'],'name':track['name'],'seconds':float(converted['duration']),'sha256':track['sha256'],'sourceUnchanged':True,'metadataPreserved':True})
assert {r['id'].split('-')[0] for r in results}=={'spring','summer','autumn','winter'}
out=ROOT/'artifacts/seasonal-bgm';out.mkdir(parents=True,exist_ok=True)
(out/'asset-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'sourcesVerified':len(manifest['sources']),'tracksVerified':len(results),'seasons':manifest['seasonCounts']},ensure_ascii=False))
