"""2.4 percentile attributes, old battles and optimized images in isolated browsers."""
import json, os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'v2.4'; OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('H5_URL','http://127.0.0.1:5198')
LOCAL=os.environ.get('H5_LOCAL')=='1'
ALL_ART=os.environ.get('H5_ALL_ART')=='1'
KEY='three-kingdoms-demo-state'

def saved(page): return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
def put(page,state):
    page.evaluate('([k,s])=>localStorage.setItem(k,JSON.stringify(s))',[KEY,state])
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='继续游戏',exact=True).click()
def conserved(s):
    w=s['worldConflict']
    total=sum(x['troops'] for x in w['cities'].values())+sum(x['troops'] for x in w['armies'])+w.get('playerReserve',0)+w.get('playerAssigned',0)
    assert total==w['ledger']['initial']+w['ledger'].get('expansion',0)+w['ledger']['recruited']+w['ledger']['raised']-w['ledger']['losses']

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    fixtures=None;results=[]
    for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
        page=context.new_page();errors=[];external=[];missing=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def intercept(route):
            target=urlsplit(route.request.url)
            if target.netloc==urlsplit(URL).netloc or target.scheme in ['data','blob']: route.continue_()
            else: external.append(route.request.url);route.abort()
        page.route('**/*',intercept)
        page.on('response',lambda r:missing.append(r.url) if r.status>=400 and '/assets/' in r.url else None)
        page.goto(URL,wait_until='networkidle')
        if fixtures is None:
            if LOCAL: fixtures=json.loads((OUT/'fixtures.json').read_text(encoding='utf-8'))
            else:
                fixtures=page.evaluate("""async()=>{
                  const {createInitialState}=await import('/src/game/state.ts');
                  const {createProgress}=await import('/src/game/growth.ts');
                  const {createCombatState,makePartyUnit,updateUnitHp}=await import('/src/game/combat.ts');
                  const {recruitPlayerTroops}=await import('/src/game/playerMilitary.ts');
                  const {assignTroops,initializeTroopCombat}=await import('/src/game/troopManagement.ts');
                  const {checkpointBattle,isBattleSnapshot}=await import('/src/game/battleSave.ts');
                  let normal={...createInitialState(()=>0),phase:'overworld',heroName:'百维验收'};
                  normal.party.traveler=createProgress(4);normal.economy.coins=5000;
                  normal=recruitPlayerTroops(normal,1000);
                  const cap=structuredClone(normal);cap.party.traveler={...createProgress(10),bondBonus:48};
                  let s=assignTroops(normal,'traveler','spear',1000);
                  const battle={...s,phase:'battle',encounter:'ambush',battleParty:[...s.deployed]};
                  let c=initializeTroopCombat(createCombatState(null,battle.party,'ambush',battle.deployed,{month:battle.date.month}),battle);
                  c.units=c.units.map(u=>u.id==='traveler'?{...updateUnitHp(u,u.hp-200),speed:100}:u.id==='bandit-leader'?{...u,x:4,y:4,speed:1,dodgeRate:0}:{...u,speed:1});
                  c.selectedId='traveler';c.turn='party';battle.activeBattle=checkpointBattle(c,battle);
                  const v1={...normal,phase:'battle',encounter:'ambush',battleParty:[...normal.deployed]};
                  c=createCombatState(null,v1.party,'ambush',v1.deployed,{month:v1.date.month});
                  c={...c,attributeVersion:1,troopRuleVersion:undefined,selectedId:'traveler',turn:'party',units:c.units.map(u=>u.team==='party'?{...makePartyUnit(u.id,v1.party[u.id],null,'ambush',u.x,u.y,1),speed:u.id==='traveler'?100:1}:{...u,speed:1})};
                  delete c.troopRuleVersion;
                  v1.activeBattle=checkpointBattle(c,v1);
                  if(!isBattleSnapshot(v1.activeBattle,v1)||!isBattleSnapshot(battle.activeBattle,battle))throw new Error('Invalid browser battle fixture');
                  const before23=structuredClone(normal);delete before23.history;
                  const added=(await import('/docs/art/2026-11-02-v24-roster.json')).default.map(x=>x.id);
                  for(const id of added)delete before23.life.people[id];
                  before23.life.handledIds=before23.life.handledIds.filter(id=>!added.includes(id));
                  return JSON.parse(JSON.stringify({normal,cap,battle,v1,before23}));
                }""")
                legacy=json.loads((ROOT/'artifacts/v2.3/fixtures.json').read_text(encoding='utf-8'))['battle']
                fixtures['v2']=legacy
                (OUT/'fixtures.json').write_text(json.dumps(fixtures,ensure_ascii=False),encoding='utf-8')
        put(page,fixtures['normal'])
        page.locator('#world-party').click();page.locator('.party-panel').get_by_role('button',name='角色成长',exact=True).click()
        growth=page.get_by_role('dialog',name='角色成长',exact=True)
        expect(growth.locator('[data-attribute="strength"] .attribute-value')).to_have_text('50')
        expect(growth.locator('[data-attribute="strength"]')).to_contain_text('天赋50')
        for _ in range(5):growth.get_by_role('button',name='增加武力',exact=True).click()
        expect(growth.locator('[data-attribute="strength"] .attribute-value')).to_have_text('50 → 55')
        expect(growth.locator('[data-ability="攻击"] strong')).to_have_text('4 → 5')
        growth.get_by_role('button',name='确认分配',exact=True).click()
        s=saved(page);assert s['party']['traveler']['attributes']['strength']==15 and s['party']['traveler']['points']==4
        page.keyboard.press('Escape')
        put(page,fixtures['cap'])
        page.locator('#world-party').click();page.locator('.party-panel').get_by_role('button',name='角色成长',exact=True).click()
        growth=page.get_by_role('dialog',name='角色成长',exact=True)
        expect(growth.locator('[data-attribute="strength"] .attribute-value')).to_have_text('98')
        growth.get_by_role('button',name='增加武力',exact=True).click();growth.get_by_role('button',name='增加武力',exact=True).click()
        expect(growth.get_by_role('button',name='增加武力',exact=True)).to_be_disabled()
        expect(growth.locator('[data-attribute="strength"] .attribute-value')).to_have_text('98 → 100')
        page.screenshot(path=str(OUT/f'growth-{width}.png'))
        growth.get_by_role('button',name='确认分配',exact=True).click()
        hero=page.locator('[data-member="traveler"]');hero.get_by_role('button',name='详情',exact=True).click()
        details=page.get_by_role('dialog',name='人物详情',exact=True)
        expect(details.locator('.character-attributes')).to_contain_text('武力 100')
        expect(details.locator('.character-attributes')).to_contain_text('上限100')
        details.locator('.character-attributes').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'details-{width}.png'))
        page.keyboard.press('Escape')
        hero=page.locator('[data-member="traveler"]')
        hero.locator('.troop-assignment input').fill('1000');hero.locator('.troop-assignment select').select_option('spear')
        hero.get_by_role('button',name='确认配兵',exact=True).click()
        s=saved(page);assert s['party']['traveler']['points']==25 and s['troopAssignments']['traveler']['count']==1000;conserved(s)
        page.keyboard.press('Escape')
        # Source PNG paths must resolve to prepared WebP on every normal image entry.
        page.get_by_role('button',name='进入城池',exact=True).click()
        page.locator('.city-panel img').evaluate_all("imgs=>imgs.forEach(i=>i.loading='eager')")
        page.wait_for_function('()=>[...document.querySelectorAll(".city-panel img")].every(i=>i.complete&&i.naturalWidth>0)')
        assert all('.webp' in src for src in page.locator('.city-panel img').evaluate_all('(imgs)=>imgs.map(i=>i.src)'))
        for kind in ['battle','v1','v2']:
            put(page,fixtures[kind]);page.wait_for_selector('#battle-commands')
            before=saved(page)['activeBattle'];version=before.get('attributeVersion',1)
            assert version=={'battle':3,'v1':1,'v2':2}[kind], (kind,version,saved(page).get('battleRecovery'))
            before_hero=next(u for u in before['units'] if u['id']=='traveler')
            page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
            restored=saved(page)['activeBattle'];after_hero=next(u for u in restored['units'] if u['id']=='traveler')
            assert restored['randomSeed']==before['randomSeed'] and after_hero['attack']==before_hero['attack'] and after_hero['hp']==before_hero['hp']
            if kind in ['v1','v2']:
                page.locator('.growth-open').click()
                old_growth=page.get_by_role('dialog',name='角色成长',exact=True)
                expect(old_growth.locator('[data-attribute="strength"]')).to_contain_text('每点攻击 +1')
                expect(old_growth).to_contain_text('本场沿用旧版属性与奖励')
                page.keyboard.press('Escape')
            if kind=='battle':
                # Real troop skill uses the standard accessible target control.
                page.locator('[data-troop-skill="spear"]').click()
                cast=page.get_by_role('button',name='对选中格施展',exact=True);expect(cast).to_be_enabled();cast.click()
                page.wait_for_function('k=>JSON.parse(localStorage.getItem(k)).activeBattle.actedIds.includes("traveler")',arg=KEY)
                assert any('突刺' in line for line in saved(page)['activeBattle'].get('battleLog',[]))
            page.get_by_role('button',name='撤退',exact=True).click();s=saved(page);conserved(s)
            if kind in ['battle','v2']:assert s['troopAssignments']['traveler']['count']==900
        put(page,fixtures['before23']);expect(page.locator('#world-root')).to_be_visible()
        upgraded=saved(page);assert not upgraded.get('lifeRecovery')
        roster=json.loads((ROOT/'docs/art/2026-11-02-v24-roster.json').read_text(encoding='utf-8'))
        assert all(row['id'] in upgraded['life']['people'] for row in roster)
        assert upgraded['party']==fixtures['before23']['party']
        assert upgraded['history']['entries'] and all(e['legacy'] and e['read'] for e in upgraded['history']['entries'])
        page.locator('#world-party').click()
        page.locator('.party-panel').get_by_role('button',name='寻访人物',exact=True).click()
        page.locator('.recruitment-panel').get_by_role('button',name='所有人物行踪',exact=True).click()
        page.locator('#person-search').fill('曹植')
        card=page.locator('[data-person="cao-zhi"]')
        card.get_by_role('button',name='查看详情',exact=True).click()
        scholar=page.get_by_role('dialog',name='人物详情',exact=True)
        expect(scholar).to_contain_text('书卷号令')
        expect(scholar.locator('.character-art img')).to_have_attribute('src','/assets/characters/cao-zhi-v1.webp')
        page.keyboard.press('Escape')
        page.locator('#person-search').fill('曹冲')
        child=page.locator('[data-person="cao-chong"]')
        child.get_by_role('button',name='查看详情',exact=True).click()
        expect(page.get_by_role('dialog',name='人物详情',exact=True)).to_contain_text('幼年资料人物')
        expect(page.get_by_role('dialog',name='人物详情',exact=True).locator('.social-controls')).to_have_count(0)
        page.screenshot(path=str(OUT/f'new-person-child-{width}.png'))
        page.keyboard.press('Escape');page.keyboard.press('Escape');page.keyboard.press('Escape')
        # Real browser decoding includes hero variants, event scenes and goods.
        manifest=page.evaluate('async()=>await(await fetch("/asset-manifest.json")).json()')
        if ALL_ART:
            images=manifest['images'];assert len([x for x in images if x['source'].startswith('assets/characters/')])==184
        else:
            images=[x for x in manifest['images'] if any(name in x['source'] for name in ['cao-hong-v1','guan-yu-v1','hero/','event-wolves','grain-v1'])]
        decoded=page.evaluate('''async rows=>{const result=[];for(let start=0;start<rows.length;start+=12){result.push(...await Promise.all(rows.slice(start,start+12).map(async row=>{const i=new Image();i.src='/'+row.output;await i.decode();return {path:row.output,width:i.naturalWidth,height:i.naturalHeight};})));}return result;}''',images)
        assert all(x['width']==row['width'] and x['height']==row['height'] for x,row in zip(decoded,images))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert not errors,errors
        assert not external,external
        assert not missing,missing
        results.append({'viewport':[width,height],'growth100':True,'normalization':True,'threeBattleVersions':True,'troopSkill':True,'oldCatalogMigration':True,'imagesDecoded':len(decoded),'pageErrors':errors,'externalRequests':external,'missingAssets':missing})
        print(f'PASS 2.4 {width}x{height}: 100 cap/growth/three battle versions/troop skill/WebP/migration',flush=True)
        context.close()
    browser.close()
    (OUT/('package-results.json' if LOCAL else 'development-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
