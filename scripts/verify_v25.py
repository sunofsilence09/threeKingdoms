"""Real-browser acceptance for the 2.5 workspace, travel, payroll and large armies."""
import copy, json, os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v2.5'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('H5_URL', 'http://127.0.0.1:5199')
LOCAL = os.environ.get('H5_LOCAL') == '1'
KEY = 'three-kingdoms-demo-state'

def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def put(page, state):
    page.evaluate('([key,s])=>{localStorage.clear();localStorage.setItem(key,JSON.stringify(s))}', [KEY,state])
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='继续游戏', exact=True).click()
    if page.get_by_role('heading', name='府库资料已单独恢复', exact=True).is_visible():
        page.get_by_role('button', name='继续旅程', exact=True).click()
    if state.get('phase') == 'battle':
        page.locator('#battle-commands').wait_for()
    else:
        page.locator('#world-root').wait_for()
    assert not saved(page).get('conflictRecovery'), 'Fixture unexpectedly entered world recovery'

def conserved(s):
    w=s['worldConflict']
    total=sum(c['troops'] for c in w['cities'].values())+sum(a['troops'] for a in w['armies'])+w.get('playerReserve',0)+w.get('playerAssigned',0)
    assert total==w['ledger']['initial']+w['ledger'].get('expansion',0)+w['ledger']['recruited']+w['ledger']['raised']-w['ledger']['losses']

def day(s):
    d=s['date']; return (d['year']-184)*360+(d['month']-1)*30+d.get('day',1)-1

def open_navigation(page):
    details=page.locator('.world-replan')
    if details.get_attribute('open') is None: details.locator('summary').click()

def assert_layout(page, width, height):
    data=page.evaluate("""()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
      nav:[...document.querySelectorAll('.world-navigation>button')].map(b=>{const r=b.getBoundingClientRect();return {id:b.id,x:r.x,y:r.y,w:r.width,h:r.height}})})""")
    assert data['width']<=width and data['height']<=height, data
    for r in data['nav']:
        assert r['x']>=0 and r['y']>=0 and r['x']+r['w']<=width+1 and r['y']+r['h']<=height+1, r
        assert r['h']>=44, r
    return data

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    fixtures=None; results=[]
    for width,height in [(1440,900),(1920,1080),(390,844),(844,390)]:
        context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<1000,is_mobile=width<760)
        page=context.new_page(); errors=[]; missing=[]; external=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('response',lambda r: missing.append(r.url) if r.status>=400 and '/assets/' in r.url else None)
        def intercept(route):
            target=urlsplit(route.request.url)
            if target.netloc==urlsplit(URL).netloc or target.scheme in ['data','blob']: route.continue_()
            else: external.append(route.request.url);route.abort()
        page.route('**/*',intercept)
        page.goto(URL,wait_until='networkidle')
        if fixtures is None:
            if LOCAL:
                fixtures=json.loads((OUT/'fixtures.json').read_text(encoding='utf-8'))
            else:
                fixtures=page.evaluate("""async()=>{
                  const {createInitialState}=await import('/src/game/state.ts');
                  const {withWorldDate}=await import('/src/game/worldTime.ts');
                  const {recruitPlayerTroops}=await import('/src/game/playerMilitary.ts');
                  const {assignTroops,initializeTroopCombat}=await import('/src/game/troopManagement.ts');
                  const {createCombatState,updateUnitHp}=await import('/src/game/combat.ts');
                  const {checkpointBattle,isBattleSnapshot}=await import('/src/game/battleSave.ts');
                  const {startTravel,advanceTravel,previewTravelChange}=await import('/src/game/travel.ts');
                  const {cityFinanceSummary}=await import('/src/game/cityEconomy.ts');
                  const {advanceDays}=await import('/src/game/history.ts');
                  const {planRoute}=await import('/src/game/world.ts');
                  const {isWorldConflict}=await import('/src/game/worldConflict.ts');
                  const base={...createInitialState(()=>0),phase:'overworld',heroName:'城府验收'};
                  let owned=recruitPlayerTroops({...structuredClone(base),economy:{...base.economy,coins:100000},supplies:200},20000);
                  const c=owned.worldConflict.cities.henan;owned.worldConflict.ledger.raised+=20000-c.troops;c.troops=20000;c.factionId='player';
                  owned=withWorldDate(owned,owned.date);owned.party.traveler.bondBonus=50;
                  const t=owned.cityEconomy.cities.henan;t.coins=50000;t.grain=100000;t.morale=80;
                  owned.worldConflict.nextDecision=Object.fromEntries(Object.keys(owned.worldConflict.nextDecision).map(id=>[id,owned.worldConflict.lastDay+30]));
                  const monthly=structuredClone(owned);monthly.cityEconomy.camp.fundingCityId='henan';
                  const shortage=structuredClone(owned);shortage.cityEconomy.cities.henan.coins=0;shortage.cityEconomy.cities.henan.grain=0;
                  const personalSource=structuredClone(owned);personalSource.economy.coins=0;personalSource.supplies=0;
                  const personalDebt=withWorldDate(personalSource,advanceDays(personalSource.date,30));
                  const citySource=structuredClone(monthly);Object.assign(citySource.cityEconomy.cities.henan,{coins:0,grain:0,commerce:0,agriculture:0});
                  const cityDebt=withWorldDate(citySource,advanceDays(citySource.date,30));
                  const captureSource=structuredClone(monthly),cw=captureSource.worldConflict,cc=cw.cities.henan;
                  cw.ledger.losses+=cc.troops-1;cc.troops=1;cw.ledger.raised+=20000;
                  const capturePath=planRoute('julu','henan').path;
                  cw.armies.push({id:'army-'+cw.nextArmyId++,factionId:'yellow-turban',sourceCityId:'julu',targetCityId:'henan',troops:20000,contributions:[],phase:'sieging',path:capturePath,legIndex:capturePath.length-1,legDay:0,phaseDays:1});
                  if(!isWorldConflict(cw,captureSource.date,Object.keys(captureSource.party),captureSource.life))throw Error('Capture fixture must satisfy actual strategic-save validation');
                  const fundingCapture=startTravel(captureSource,'nanhai',42);
                  const underway=advanceTravel(startTravel(structuredClone(base),'nanhai',42),1);
                  if(!underway.journey||underway.journey.event)throw Error('Expected one unobstructed actual travel day');
                  const start=startTravel(structuredClone(base),'nanhai',42);
                  let bs=assignTroops(structuredClone(owned),'traveler','spear',10000);
                  bs.cityEconomy.camp.morale=40;bs={...bs,phase:'battle',encounter:'ambush',battleParty:[...bs.deployed]};
                  let battle=initializeTroopCombat(createCombatState(null,bs.party,'ambush',bs.deployed,{month:bs.date.month}),bs);
                  battle.units=battle.units.map(u=>u.id==='traveler'?{...u,speed:100}:u.id==='bandit-leader'?{...u,x:4,y:4,speed:1,dodgeRate:0}:{...u,speed:1});
                  battle.selectedId='traveler';bs.activeBattle=checkpointBattle(battle,bs);if(!isBattleSnapshot(bs.activeBattle,bs))throw Error('Invalid large-army fixture');
                  return JSON.parse(JSON.stringify({base,owned,monthly,shortage,personalDebt,cityDebt,fundingCapture,underway,start,battle:bs,redirect:previewTravelChange(underway,'redirect','shujun')}));
                }""")
                old=json.loads((ROOT/'artifacts'/'v2.4'/'fixtures.json').read_text(encoding='utf-8'))
                fixtures['oldBattles']=[old[k] for k in ['v1','v2','battle']]
                (OUT/'fixtures.json').write_text(json.dumps(fixtures,ensure_ascii=False),encoding='utf-8')
        if os.environ.get('H5_ALL_ART')=='1' and width==1440:
            count=page.evaluate("""async()=>{
              const manifest=await (await fetch('/asset-manifest.json')).json();
              for(const item of manifest.images){const img=new Image();img.src='/'+item.output;await img.decode();
                if(img.naturalWidth!==item.width||img.naturalHeight!==item.height)throw Error(item.output);img.src='';}
              return manifest.images.length;
            }""")
            assert count==201
            print('Decoded all201 optimized images',flush=True)

        put(page,fixtures['base']); layout=assert_layout(page,width,height)
        page.screenshot(path=str(OUT/f'world-{width}.png'),full_page=True)
        page.get_by_role('button',name='查看城市府库与收支',exact=True).click();page.keyboard.press('Escape')
        assert page.evaluate('()=>document.activeElement.textContent')=='查看城市府库与收支'
        page.locator('#world-nav-city').click()
        page.locator('#enter-city').click()
        expect(page.locator('.city-overview')).to_be_visible()
        page.get_by_role('button',name='市集买卖',exact=True).click()
        expect(page.locator('[data-good="grain"]')).to_be_visible()
        page.get_by_role('button',name='礼品铺',exact=True).click()
        gift=page.locator('.trade-card').first
        gift.get_by_role('button').click()
        assert saved(page)['economy']['coins']<fixtures['base']['economy']['coins']
        page.keyboard.press('Escape'); page.locator('#world-root').wait_for()
        page.locator('#world-nav-more').click(); expect(page.get_by_label('四季背景音乐设置')).to_be_visible()
        if width<760:
            page.locator('#world-nav-travel').click();page.locator('.world-map-toggle').click()
            assert page.evaluate('()=>document.activeElement.id')=='world-map-toggle'
            expect(page.locator('.world-map')).to_be_visible()
            page.get_by_role('button',name='复位至完整地图',exact=True).click()
            page.screenshot(path=str(OUT/f'map-{width}.png'),full_page=True)
            page.locator('.world-map-toggle').click()
            assert page.evaluate('()=>document.activeElement.id')=='world-map-toggle'
        assert_layout(page,width,height)

        put(page,fixtures['underway']); before=saved(page);open_navigation(page)
        page.locator('#turn-back-travel').click(); turned=saved(page)
        assert turned['journey']['seed']==before['journey']['seed'] and day(turned)==day(before)
        assert turned['journey']['path'][-1]==before['currentCityId']
        page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
        assert saved(page)['journey']==turned['journey']
        page.locator('#travel-days').fill('1');page.locator('#continue-travel').click()
        assert not saved(page).get('journey') and saved(page)['currentCityId']==before['currentCityId']
        assert day(saved(page))==day(before)+1

        put(page,fixtures['underway']);before=saved(page);open_navigation(page)
        page.locator('#redirect-destination').select_option('shujun');page.locator('#redirect-travel').click()
        changed=saved(page);assert changed['journey']['path']==fixtures['redirect']['path']
        assert changed['journey']['seed']==before['journey']['seed'] and day(changed)==day(before)
        page.screenshot(path=str(OUT/f'redirect-{width}.png'),full_page=True)
        open_navigation(page);page.locator('#stop-next-city').click()
        assert len(saved(page)['journey']['path'])==2
        put(page,fixtures['start']);open_navigation(page);page.locator('#stop-next-city').click()
        assert not saved(page).get('journey') and day(saved(page))==day(fixtures['start'])

        put(page,fixtures['fundingCapture']);page.locator('#travel-days').fill('1');page.locator('#continue-travel').click()
        lost=saved(page);assert lost['worldConflict']['cities']['henan']['factionId']!='player'
        assert not lost['cityEconomy']['camp'].get('fundingCityId') and lost['cityEconomy']['fundingNotice']['cityId']=='henan'
        expect(page.locator('.world-message-bar')).to_contain_text('个人铜钱和军需')
        page.screenshot(path=str(OUT/f'funding-loss-{width}.png'),full_page=True)
        page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
        assert saved(page)['cityEconomy']['fundingNotice']==lost['cityEconomy']['fundingNotice']
        page.get_by_role('button',name='查看军费',exact=True).click()
        page.get_by_role('button',name='已知晓付款变更',exact=True).click()
        assert not saved(page)['cityEconomy'].get('fundingNotice') and day(saved(page))==day(lost)

        put(page,fixtures['owned']);page.locator('#world-nav-army').click()
        page.get_by_label('随行军费付款来源',exact=True).select_option('henan')
        assert saved(page)['cityEconomy']['camp']['fundingCityId']=='henan'
        page.get_by_label('随行军费付款来源',exact=True).select_option('')
        assert not saved(page)['cityEconomy']['camp'].get('fundingCityId')
        page.locator('#world-nav-city').click()
        page.get_by_role('button',name='府库 / 发展 / 月度收支',exact=True).click()
        page.get_by_role('button',name='府库与月结',exact=True).click();before=saved(page)
        page.get_by_label('捐资铜钱',exact=True).fill('100');page.get_by_role('button',name='捐入府库',exact=True).click()
        donated=saved(page);assert donated['economy']['coins']==before['economy']['coins']-100
        assert donated['cityEconomy']['cities']['henan']['coins']==before['cityEconomy']['cities']['henan']['coins']+100
        page.get_by_label('购粮预算',exact=True).fill('10');page.get_by_role('button',name='采购粮草 · 1钱换5粮',exact=True).click()
        bought=saved(page);assert bought['cityEconomy']['cities']['henan']['grain']==before['cityEconomy']['cities']['henan']['grain']+50
        page.get_by_role('button',name='商业与农业',exact=True).click();before=saved(page)
        page.get_by_role('button',name='发展商业 · 1000钱 / 10日',exact=True).click()
        developed=saved(page);assert day(developed)==day(before)+10
        assert developed['cityEconomy']['cities']['henan']['commerce']==before['cityEconomy']['cities']['henan']['commerce']+5
        conserved(developed)
        page.screenshot(path=str(OUT/f'development-{width}.png'),full_page=True)

        put(page,fixtures['monthly']);page.locator('#world-nav-city').click();before=saved(page)
        page.get_by_role('button',name='安居一月 · 30日',exact=True).click();after=saved(page)
        assert day(after)==day(before)+30 and after['economy']['coins']==before['economy']['coins']
        t=after['cityEconomy']['cities']['henan'];r=t['records'][-1];old=before['cityEconomy']['cities']['henan']
        assert t['coins']==old['coins']+r['income']['coins']-r['paid']['coins']-r['recruitmentCost']
        assert t['grain']==old['grain']+r['income']['grain']-r['paid']['grain']
        assert after['cityEconomy']['camp']['records'][-1]['shortfall']=={'coins':0,'grain':0}
        conserved(after)
        page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
        assert saved(page)['cityEconomy']==after['cityEconomy']

        put(page,fixtures['shortage']);page.locator('#world-nav-city').click();before=saved(page)
        page.locator('#city-work-blocks').fill('1');page.locator('#city-work-submit').click();after=saved(page)
        assert after['cityEconomy']['cities']['henan']['morale']==max(0,before['cityEconomy']['cities']['henan']['morale']-40)
        page.screenshot(path=str(OUT/f'shortage-{width}.png'),full_page=True)

        for key,new_source,unit in [('personalDebt','henan','军需'),('cityDebt','','粮草')]:
            put(page,fixtures[key]);page.locator('#world-nav-army').click()
            deficit=saved(page)['cityEconomy']['camp']['unpaidGrain'];assert deficit>0
            expect(page.locator('.camp-finance .finance-warning')).to_contain_text(f'缺供{deficit:,}{unit}')
            page.get_by_label('随行军费付款来源',exact=True).select_option(new_source)
            expect(page.locator('.camp-finance .finance-warning')).to_contain_text(f'缺供{deficit:,}{unit}')

        put(page,fixtures['owned']);page.locator('#world-nav-party').click()
        hero=page.locator('[data-member="traveler"]'); count=hero.get_by_label('城府验收配兵人数',exact=True)
        assert count.get_attribute('max')=='10000';count.fill('10000');hero.get_by_role('button',name='确认配兵',exact=True).click()
        assert saved(page)['troopAssignments']['traveler']['count']==10000;conserved(saved(page))
        page.screenshot(path=str(OUT/f'troops-{width}.png'),full_page=True)

        put(page,fixtures['battle']);start=saved(page)['activeBattle'];hero=next(u for u in start['units'] if u['id']=='traveler')
        assert hero['troop']['initial']==10000 and hero['morale']==40 and hero['moraleRuleVersion']==2
        page.get_by_role('button',name='突刺',exact=False).click();page.get_by_role('button',name='对选中格施展',exact=True).click()
        active=saved(page)['activeBattle'];assert active['randomSeed']!=start['randomSeed'] or active['actedIds']!=start['actedIds']
        page.screenshot(path=str(OUT/f'battle-{width}.png'),full_page=True)
        page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
        assert saved(page)['activeBattle']['randomSeed']==active['randomSeed']
        assert [(u['id'],u['hp']) for u in saved(page)['activeBattle']['units']]==[(u['id'],u['hp']) for u in active['units']]
        for old in fixtures['oldBattles']:
            put(page,old);restored=saved(page)['activeBattle'];expected=old['activeBattle']
            assert restored['randomSeed']==expected['randomSeed'] and restored.get('troopRuleVersion')==expected.get('troopRuleVersion')
            assert [(u['hp'],u['attack'],u['defense'],u.get('troop')) for u in restored['units']]==[(u['hp'],u['attack'],u['defense'],u.get('troop')) for u in expected['units']]
        corrupt=copy.deepcopy(fixtures['base']);corrupt['cityEconomy']['cities']['henan']['coins']=123
        corrupt['cityEconomy']['cities']['henan']['commerce']=100;corrupt['cityEconomy']['cities']['yingchuan']['coins']='bad'
        corrupt['cityEconomy']['camp']['fundingCityId']={'toString':None,'valueOf':None}
        put(page,corrupt);repaired=saved(page)
        assert repaired['cityEconomy']['cities']['henan']['coins']==123 and repaired['cityEconomy']['cities']['henan']['commerce']==100
        assert repaired['cityEconomy']['cities']['yingchuan']['coins']==0
        assert page.evaluate('(key)=>!!localStorage.getItem(key+":city-economy-backup")',KEY)
        assert not errors and not missing and not external, {'errors':errors,'missing':missing,'external':external}
        results.append({'width':width,'height':height,'layout':layout,'errors':errors,'missing':missing,'external':external,'passed':True})
        (OUT/('package-results.json' if LOCAL else 'development-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        print(f'Passed {width}x{height}',flush=True)
        context.close()
    browser.close()
    (OUT/('package-results.json' if LOCAL else 'development-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=False))
