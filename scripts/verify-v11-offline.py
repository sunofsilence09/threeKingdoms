"""Exercise the shipped package in an isolated browser while blocking external traffic."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/v11-offline';OUT.mkdir(parents=True,exist_ok=True)
VERSION=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))['version']
URL=os.environ.get('H5_PACKAGE_URL','http://127.0.0.1:18844')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000})
    external=[];errors=[]
    def route(request):
        if request.request.url.startswith(URL+'/'):request.continue_()
        else:external.append(request.request.url);request.abort()
    context.route('**/*',route);page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='networkidle');expect(page.locator('.start-menu')).to_contain_text(VERSION)
    expect(page.get_by_role('button',name='继续游戏',exact=True)).to_be_disabled()
    page.screenshot(path=str(OUT/'start.png'))
    page.locator('[data-audio-mute]').click();page.locator('[data-audio-volume]').fill('35')
    page.get_by_role('button',name='重新开始',exact=True).click();page.locator('#hero-name').fill('云川')
    page.get_by_role('button',name='确认姓名 · 继续旅程').click();page.get_by_role('button',name='踏上逃难路',exact=True).click()
    page.get_by_role('button',name='进入城池',exact=True).click();page.get_by_role('button',name='府署名册',exact=True).click()
    office=page.locator('.city-office-roster');expect(office).to_contain_text('游戏人物')
    expect(page.locator('[data-service-kind="governing"]')).to_have_count(1)
    page.locator('[data-service-kind="governing"]').scroll_into_view_if_needed();page.screenshot(path=str(OUT/'office.png'))
    state=page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state"))')
    assert state['heroName']=='云川' and state['worldConflict']['version']==3
    assert len({c['governorId'] for c in state['worldConflict']['cities'].values()})==60
    portraits=json.loads((ROOT/'artifacts/v11-assets-audit.json').read_text(encoding='utf-8'))
    decoded=page.evaluate('''async ids=>await Promise.all(ids.map(async id=>{const i=new Image();i.src='/assets/characters/'+id+'-v1.png';await i.decode();return i.naturalWidth;}))''',[r['id'] for r in portraits])
    assert len(decoded)==40 and min(decoded)==1024
    page.reload(wait_until='networkidle');expect(page.locator('[data-audio-mute]')).to_have_text('音效：关')
    expect(page.locator('[data-audio-volume]')).to_have_value('35')
    page.get_by_role('button',name='继续游戏',exact=True).click();expect(page.get_by_role('button',name='进入城池',exact=True)).to_be_visible()
    current=page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state"))');assert current==state
    page.reload(wait_until='networkidle');page.get_by_role('button',name='重新开始',exact=True).click();expect(page.locator('#hero-name')).to_be_empty()
    old=json.loads((ROOT/'src/game/fixtures/v10-active-battle.json').read_text(encoding='utf-8'));old['heroName']='旧旅者'
    page.evaluate('(s)=>localStorage.setItem("three-kingdoms-demo-state",JSON.stringify(s))',old)
    page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
    if page.get_by_role('button',name='查看当前旅程',exact=True).count():page.get_by_role('button',name='查看当前旅程',exact=True).click()
    expect(page.locator('#battle-commands')).to_be_visible();page.screenshot(path=str(OUT/'legacy-battle.png'))
    current=page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state"))')
    assert current['activeBattle'].get('attributeVersion') is None
    for unit in current['activeBattle']['units']:
        previous=next(u for u in old['activeBattle']['units'] if u['id']==unit['id'])
        assert unit['maxHp']==previous['maxHp'] and unit['attack']==previous['attack']
    assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state:pre-1.1-fullbackup")')
    assert not external and not errors,{'external':external,'errors':errors}
    browser.close()
result={'offline':True,'externalRequests':external,'pageErrors':errors,'portraits':40,'sixtyPrefects':True,'continueAndRestart':True,'audioSettingsPersist':True,'genuineLegacyBattle':True}
(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
