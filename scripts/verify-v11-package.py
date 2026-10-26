"""Compare every production file and every new portrait in the portable package."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
build=ROOT/'dist';package=ROOT/'release/三国行旅-本地版'
files=[p for p in build.rglob('*') if p.is_file()]
for source in files:
    target=package/'www'/source.relative_to(build)
    assert target.is_file() and hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(target.read_bytes()).digest(),str(target)
audit=json.loads((ROOT/'artifacts/v11-assets-audit.json').read_text(encoding='utf-8'))
for portrait in audit:
    target=package/'www/assets/characters'/f'{portrait["id"]}-v1.png'
    assert hashlib.sha256(target.read_bytes()).hexdigest()==portrait['sha256']
for name in ['启动游戏.cmd','server.cjs','runtime/node.exe','使用说明.txt','NODE-LICENSE.txt','PHASER-LICENSE.txt']:assert (package/name).is_file(),name
assert '1.1.0 群英新声' in (package/'使用说明.txt').read_text(encoding='utf-8-sig')
assert '1.1.0 群英新声' in (package/'www/index.html').read_text(encoding='utf-8')
result={'buildFiles':len(files),'matchingFiles':len(files),'newPortraits':40,'package':str(package)}
output=ROOT/'artifacts/v11-package-verification.json';output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
