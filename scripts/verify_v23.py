"""2.3 desktop/touch UI and offline package regression, with isolated browser saves."""
from pathlib import Path
import json, os
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v2.3'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('H5_URL', 'http://127.0.0.1:5197')
LOCAL = os.environ.get('H5_LOCAL') == '1'
KEY = 'three-kingdoms-demo-state'
FIXTURE = OUT / 'fixtures.json'

def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def put(page, state):
    page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, state])
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='继续游戏', exact=True).click()

def conserved(s):
    w = s['worldConflict']
    total = sum(c['troops'] for c in w['cities'].values()) + sum(a['troops'] for a in w['armies']) + w.get('playerReserve', 0) + w.get('playerAssigned', 0)
    assert total == w['ledger']['initial'] + w['ledger'].get('expansion', 0) + w['ledger']['recruited'] + w['ledger']['raised'] - w['ledger']['losses']

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    results = []
    fixtures = None
    for width, height, touch in [(1440, 1000, False), (390, 844, True), (844, 390, True)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, is_mobile=touch)
        page = context.new_page()
        errors, external = [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        def route(req):
            if urlsplit(req.request.url).netloc == urlsplit(URL).netloc:
                req.continue_()
            else:
                external.append(req.request.url)
                req.abort()
        page.route('**/*', route)
        page.goto(URL, wait_until='networkidle')
        if fixtures is None:
            if LOCAL:
                fixtures = json.loads(FIXTURE.read_text(encoding='utf-8'))
            else:
                fixtures = page.evaluate("""async()=>{
                  const {createInitialState}=await import('/src/game/state.ts');
                  const {createCombatState,updateUnitHp}=await import('/src/game/combat.ts');
                  const {recruitPlayerTroops}=await import('/src/game/playerMilitary.ts');
                  const {assignTroops,initializeTroopCombat}=await import('/src/game/troopManagement.ts');
                  const {checkpointBattle}=await import('/src/game/battleSave.ts');
                  const {createWorldConflict}=await import('/src/game/worldConflict.ts');
                  const {withWorldDate}=await import('/src/game/worldTime.ts');
                  const {migrateHistory}=await import('/src/game/historicalEvents.ts');
                  let s={...createInitialState(()=>0),phase:'overworld',heroName:'统军验收'};
                  s.economy.coins=4000;s=recruitPlayerTroops(s,1000);
                  const troop=structuredClone(s);
                  s=assignTroops(s,'traveler','spear',1000);
                  const battle={...s,phase:'battle',encounter:'ambush',battleParty:[...s.deployed]};
                  let c=initializeTroopCombat(createCombatState(null,battle.party,'ambush',battle.deployed,{month:battle.date.month}),battle);
                  c.units=c.units.map(u=>u.id==='traveler'?{...updateUnitHp(u,u.hp-200),speed:100}:{...u,speed:1});
                  c.selectedId='traveler';c.turn='party';battle.activeBattle=checkpointBattle(c,battle);
                  const legacy=structuredClone(battle);delete legacy.activeBattle.troopRuleVersion;
                  legacy.activeBattle.units=legacy.activeBattle.units.map(u=>{
                    if(!u.troop)return u;const t={...u.troop};delete t.ruleVersion;delete t.command;delete t.strength;
                    return {...u,troop:t,attack:t.baseAttack+Math.ceil(t.count/10),defense:t.baseDefense+Math.ceil(t.count/40)};
                  });
                  let h={...createInitialState(()=>0),phase:'overworld',heroName:'史事验收',currentCityId:'chenliu'};
                  h=withWorldDate(h,{year:189,month:12,day:30});
                  h.worldConflict=createWorldConflict(h.date,Object.keys(h.party),7,h.life);
                  h=withWorldDate(h,{year:190,month:1,day:1});
                  // Stable historical starting world; quest participation still uses real UI and clock.
                  h.worldConflict=createWorldConflict(h.date,Object.keys(h.party),7,h.life);
                  h.economy.coins=1000;h.supplies=20;
                  const old={...h,date:{year:208,month:12,day:1},history:undefined};
                  old.life=structuredClone(h.life);
                  const added=['dong-bai','lu-zhi','huangfu-song'];
                  for(const id of added)delete old.life.people[id];
                  old.life.handledIds=old.life.handledIds.filter(id=>!added.includes(id));
                  old.worldConflict=createWorldConflict(old.date,Object.keys(old.party),7,old.life);
                  return {troop,battle,legacy,history:h,old};
                }""")
                FIXTURE.write_text(json.dumps(fixtures, ensure_ascii=False), encoding='utf-8')
        put(page, fixtures['troop'])
        page.locator('#world-party').click()
        hero = page.locator('[data-member="traveler"]')
        hero.get_by_label('统军验收配兵人数', exact=True).fill('1000')
        hero.get_by_label('统军验收兵种', exact=True).select_option('spear')
        expect(hero.locator('.troop-assignment')).to_contain_text('80士气预览')
        hero.get_by_role('button', name='确认配兵', exact=True).click()
        s = saved(page)
        assert s['troopAssignments']['traveler']['count'] == 1000
        assert s['worldConflict']['playerReserve'] == 0
        conserved(s)
        hero = page.locator('[data-member="traveler"]')
        hero.get_by_role('button', name='详情', exact=True).click()
        details = page.get_by_role('dialog', name='人物详情', exact=True)
        expect(details.locator('.troop-contribution')).to_contain_text('存活1000兵')
        expect(details.locator('.troop-assignment')).to_be_visible()
        details.locator('.troop-contribution').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f'hero-troops-{width}.png'))
        page.keyboard.press('Escape')
        hero = page.locator('[data-member="traveler"]')
        hero.get_by_role('button', name='前往募兵与军务', exact=True).click()
        expect(page.get_by_role('dialog', name='募兵与攻城', exact=True)).to_contain_text('统率')
        page.keyboard.press('Escape')
        page.keyboard.press('Escape')
        for kind in ['battle', 'legacy']:
            put(page, fixtures[kind])
            page.wait_for_selector('#battle-commands')
            cp = saved(page)['activeBattle']
            hero_unit = next(u for u in cp['units'] if u['id'] == 'traveler')
            assert hero_unit['troop']['count'] == 900
            assert cp.get('troopRuleVersion') == (2 if kind == 'battle' else None)
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='继续游戏', exact=True).click()
            restored = saved(page)['activeBattle']
            assert restored['randomSeed'] == cp['randomSeed']
            assert next(u for u in restored['units'] if u['id'] == 'traveler')['attack'] == hero_unit['attack']
            page.get_by_role('button', name='撤退', exact=True).click()
            settled = saved(page)
            assert settled['troopAssignments']['traveler']['count'] == 900
            conserved(settled)
        put(page, fixtures['history'])
        page.locator('#world-history').click()
        expect(page.get_by_role('heading', name='历史大事', exact=True)).to_be_visible()
        panel = page.locator('.history-panel')
        if not panel.count():
            panel = page.locator('.overlay-panel')
        expect(panel).to_contain_text('关东讨董')
        panel.get_by_label('按来源筛选', exact=True).select_option(label='演义')
        expect(panel).to_contain_text('三英战吕布')
        expect(panel.locator('[data-history-event="antiDong"]')).to_have_count(0)
        panel.get_by_label('按年代筛选', exact=True).select_option('late')
        expect(panel).to_contain_text('当前筛选下暂无已入册事件')
        panel.get_by_label('按年代筛选', exact=True).select_option('all')
        panel.get_by_label('按来源筛选', exact=True).select_option(label='全部来源')
        quest = panel.locator('[data-history-event="antiDong"]')
        before = saved(page)
        expect(quest.get_by_role('button', name='选择参与', exact=True)).to_be_enabled()
        quest.get_by_role('button', name='选择参与', exact=True).click()
        expect(quest.get_by_role('button', name='已领取奖励', exact=True)).to_be_disabled()
        after = saved(page)
        assert after['date'] == {'year': 190, 'month': 1, 'day': 4}
        assert after['economy']['coins'] == before['economy']['coins'] + 30
        assert after['relationships']['cao-cao']['affinity'] == 5
        conserved(after)
        panel.get_by_label('按来源筛选', exact=True).select_option(label='史实')
        page.screenshot(path=str(OUT / f'history-{width}.png'))
        # UI journal plus persistent read state, with no automatic support reward.
        assert all(e['read'] for e in saved(page)['history']['entries'])
        page.get_by_role('button', name='返回地图', exact=True).click()
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='继续游戏', exact=True).click()
        page.locator('#world-history').click()
        expect(page.locator('[data-history-event="antiDong"]').get_by_role('button', name='已领取奖励', exact=True)).to_be_disabled()
        page.keyboard.press('Escape')
        assert page.evaluate('document.activeElement.id') == 'world-history'
        put(page, fixtures['old'])
        s = saved(page)
        expect(page.locator('#world-root')).to_be_visible()
        assert not s.get('lifeRecovery')
        assert all(id in s['life']['people'] for id in ['dong-bai', 'lu-zhi', 'huangfu-song'])
        assert s['history']['entries'] and all(e['legacy'] and e['read'] for e in s['history']['entries'])
        assert s['economy']['coins'] == fixtures['old']['economy']['coins']
        # Decode new portraits in the real browser, offline requests only.
        images = page.evaluate("""async ext=>Promise.all(['dong-bai','lu-zhi','huangfu-song','zhang-liao','gao-shun','xu-huang'].map(async id=>{const i=new Image();i.src='/assets/characters/'+id+'-v1.'+ext;await i.decode();return [id,i.naturalWidth,i.naturalHeight];}))""", os.environ.get('H5_IMAGE_EXT','png'))
        assert all(w == 1024 and h == 1536 for _, w, h in images)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not errors, errors
        assert not external, external
        results.append({'viewport': [width, height], 'troops': True, 'new_and_legacy_resume': True, 'history_and_migration': True, 'portraits': images, 'pageErrors': errors, 'externalRequests': external})
        print(f'PASS 2.3 {width}x{height}: troop UI, saves, history, portraits', flush=True)
        context.close()
    browser.close()
    (OUT / ('package-results.json' if LOCAL else 'development-results.json')).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
