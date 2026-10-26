"""Real UI checks for city appointments, recruitment, portraits and resumed rewards."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from verify_h5 import wait_scene
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/v11-governors';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('H5_URL','http://127.0.0.1:5185')
def saved(page):return page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state"))')
def continue_game(page):
    page.get_by_role('button',name='继续游戏',exact=True).click()
    if page.get_by_role('button',name='查看当前旅程',exact=True).count():page.get_by_role('button',name='查看当前旅程',exact=True).click()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True);results=[]
    for width,height in [(1440,1000),(390,844),(844,390)]:
        page=browser.new_page(viewport={'width':width,'height':height});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        expect(page.locator('.start-menu')).to_contain_text('1.1.0 群英新声')
        expect(page.get_by_role('button',name='继续游戏',exact=True)).to_be_disabled()
        fixture=page.evaluate('''async()=>{
          const {createInitialState,STORAGE_KEY}=await import('/src/game/state.ts');
          const s=createInitialState(()=>0);s.phase='overworld';s.currentCityId='moling';s.heroName='云川';
          const id=s.worldConflict.cities.moling.governorId;s.relationships[id]={affinity:100};
          localStorage.setItem(STORAGE_KEY,JSON.stringify(s));return {id,state:s};
        }''')
        ids=[c['governorId'] for c in fixture['state']['worldConflict']['cities'].values()]
        assert len(set(ids))==60 and all(i in fixture['state']['life']['people'] for i in ids)
        page.reload(wait_until='networkidle');continue_game(page);wait_scene(page,'Overworld')
        page.get_by_role('button',name='进入城池',exact=True).click()
        page.get_by_role('button',name='府署名册',exact=True).click()
        governor=page.locator('[data-service-kind="governing"]');expect(governor).to_have_count(1)
        expect(governor).to_have_attribute('data-staff',fixture['id']);expect(governor).to_contain_text('游戏人物')
        image=governor.locator('img');expect(image).to_be_visible();image.evaluate('i=>i.decode()')
        assert image.evaluate('i=>i.naturalWidth')>=512
        governor.scroll_into_view_if_needed();page.screenshot(path=str(OUT/f'office-{width}x{height}.png'))
        governor.get_by_role('button',name='人物详情',exact=True).click()
        expect(page.locator('.character-details')).to_contain_text('游戏人物')
        expect(page.locator('.character-martial')).to_contain_text('安郡')
        page.screenshot(path=str(OUT/f'details-{width}x{height}.png'))
        page.locator('.character-close').click()
        governor.get_by_role('button',name='交谈与邀请',exact=True).click()
        card=page.locator(f'[data-person="{fixture["id"]}"]')
        card.get_by_role('button',name='邀请同行',exact=True).click()
        state=saved(page);old=fixture['state'];successor=state['worldConflict']['cities']['moling']['governorId']
        assert fixture['id'] in state['party'] and successor!=fixture['id']
        assert successor in state['life']['people']
        assert state['date']==old['date'] and state['worldConflict']['seed']==old['worldConflict']['seed']
        assert state['worldConflict']['ledger']==old['worldConflict']['ledger']
        assert all(c['troops']==old['worldConflict']['cities'][id]['troops'] for id,c in state['worldConflict']['cities'].items())
        page.reload(wait_until='networkidle');continue_game(page);wait_scene(page,'Overworld')
        assert saved(page)['worldConflict']['cities']['moling']['governorId']==successor
        assert not errors,errors
        results.append({'viewport':[width,height],'sixtyIndependentPrefects':True,'portraitLoaded':True,'inviteSameDaySuccessor':True,'reloadStable':True,'errors':errors})
        page.close()
    page=browser.new_page(viewport={'width':1440,'height':1000});page.goto(URL,wait_until='networkidle')
    portrait_results=page.evaluate('''async()=>{
      const {V11_CHARACTERS}=await import('/src/game/v11Data.ts');
      return await Promise.all(V11_CHARACTERS.map(async p=>{const image=new Image();image.src=p.appearance.portrait;await image.decode();return {id:p.id,width:image.naturalWidth,height:image.naturalHeight};}));
    }''');assert len(portrait_results)==32 and all(p['width']>=512 for p in portrait_results)
    old=json.loads((ROOT/'src/game/fixtures/v10-active-battle.json').read_text(encoding='utf-8'));old['heroName']='旧旅者'
    page.evaluate('(s)=>localStorage.setItem("three-kingdoms-demo-state",JSON.stringify(s))',old)
    page.reload(wait_until='networkidle');continue_game(page);wait_scene(page,'Battle')
    page.screenshot(path=str(OUT/'legacy-battle.png'))
    reward=page.evaluate('''async()=>{
      const entry=[...document.scripts].find(s=>s.src.includes('/src/main.ts'));const {game}=await import(entry.src);
      game.scene.getScene('Battle').finishBattle('win');
      const s=JSON.parse(localStorage.getItem('three-kingdoms-demo-state'));return {hero:s.party.traveler,active:s.activeBattle??null};
    }''')
    assert reward['hero']['level']==2 and reward['hero']['xp']==25 and reward['active'] is None,reward
    results.append({'legacySceneActualReward45':True,'heroXP':reward['hero'],'historicalPortraits':portrait_results})
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'viewports':3,'portraits':32,'legacyReward45':True,'result':str(OUT/'results.json')},ensure_ascii=False))
