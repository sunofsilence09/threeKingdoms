"""Verify the portable Windows package against the current production build."""
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
build=root/'dist'
package=root/'release'/'三国行旅-本地版'
files=[p for p in build.rglob('*') if p.is_file()]
for source in files:
    target=package/'www'/source.relative_to(build)
    assert target.is_file(),str(target)
    assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(target)
audit=json.loads((root/'docs/art/generations-portraits-audit.json').read_text(encoding='utf-8'))
for portrait in audit['portraits']:
    target=package/'www'/Path(portrait['assetPath']).relative_to('public')
    assert hashlib.sha256(target.read_bytes()).hexdigest()==portrait['sha256'],portrait['id']
for name in ['启动游戏.cmd','server.cjs','runtime/node.exe','使用说明.txt']:
    assert (package/name).is_file(),name
assert '1.0.0 世代更迭' in (package/'使用说明.txt').read_text(encoding='utf-8-sig')
result={'buildFiles':len(files),'matchingFiles':len(files),'newPortraits':26,'package':str(package)}
output=root/'artifacts/generations/package-verification.json'
output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
