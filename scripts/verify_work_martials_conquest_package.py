"""Offline portable acceptance: five-day work, real troop siege and equipped casting.

Obtain a valid funded test save from the isolated development server, then use
only production UI and localStorage. No production imports or game-state edits
occur after seeding. Contexts are isolated from the user's browser/save.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_player_military import create_settlement_fixture, settled_battles

DEV = os.environ.get('H5_URL', 'http://127.0.0.1:5189')
URL = os.environ.get('H5_PACKAGE_URL', 'http://127.0.0.1:18844')
KEY = 'three-kingdoms-demo-state'
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'work-martials-conquest'
OUT.mkdir(parents=True, exist_ok=True)

def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def ordinal(state):
    d = state['date']
    return d['year'] * 360 + (d['month'] - 1) * 30 + d.get('day', 1)

def resume(page):
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='继续游戏', exact=True).click()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    source = browser.new_page()
    source.goto(DEV, wait_until='networkidle')
    fixture = source.evaluate('''async()=>{
      const {createInitialState}=await import('/src/game/state.ts');
      const s={...createInitialState(()=>0),phase:'overworld',currentCityId:'moling',heroName:'离线验收',supplies:100};
      s.economy.coins=50000;s.martial.learned=['martial-cao-ren'];s.martial.equipped=['martial-cao-ren'];
      return s;
    }''')
    recovery_fixture=source.evaluate('''async()=>{
      const {createInitialState}=await import('/src/game/state.ts');
      const {createLifeState,ensureLifePeople}=await import('/src/game/personLife.ts');
      const {createWorldConflict}=await import('/src/game/worldConflict.ts');
      const date={year:193,month:1,day:1};let life=createLifeState(date,43);
      const world=createWorldConflict(date,[],123,life);life=ensureLifePeople(life,world.prefectIds);
      const state={...createInitialState(()=>0),heroName:'寿命恢复',phase:'overworld',date,life,worldConflict:world};
      state.life.seed=1;state.life.people['zhao-yu'].birthYear=0;
      return {state,world};
    }''')
    settlement_fixture=create_settlement_fixture(source)
    source.close()
    results = []
    for width, height in [(1440, 1000), (390, 844), (844, 390)]:
        ctx = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width!=1440, is_mobile=width!=1440)
        external, errors = [], []
        def restrict(route):
            if route.request.url.startswith(URL + '/'):
                route.continue_()
            else:
                external.append(route.request.url)
                route.abort()
        ctx.route('**/*', restrict)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, recovery_fixture['state']])
        resume(page)
        expect(page.get_by_role('heading',name='生命资料已单独恢复',exact=True)).to_be_visible()
        page.get_by_role('button',name='查看当前旅程',exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        repaired=saved(page);world=repaired['worldConflict'];before=recovery_fixture['world']
        assert not repaired.get('conflictRecovery') and world['cities']['guangling']['governorId']!='zhao-yu'
        for key in ['seed','ledger','armies','reports']:assert world[key]==before[key],key
        for city,stock in before['cities'].items():
            for key in ['troops','factionId','occupationDay']:assert world['cities'][city][key]==stock[key],(city,key)
        assert len({c['governorId'] for c in world['cities'].values()})==60
        page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))', [KEY, fixture])
        resume(page)
        expect(page.locator('#world-root')).to_be_visible()
        initial = saved(page)
        page.locator('#city-work-blocks').fill('1')
        expect(page.locator('#city-work-preview')).to_contain_text('共5日')
        assert saved(page) == initial
        page.locator('#city-work-submit').click()
        worked = saved(page)
        assert ordinal(worked) == ordinal(initial) + 5
        assert worked['economy']['coins'] == initial['economy']['coins'] + 100
        assert worked['supplies'] == initial['supplies'] + 5
        page.locator('#world-military').click()
        page.get_by_label('招募人数', exact=True).fill('20000')
        page.get_by_role('button', name='确认募兵', exact=True).click()
        raised = saved(page)
        assert raised['worldConflict']['playerReserve'] == 20000
        assert raised['economy']['coins'] == worked['economy']['coins'] - 40000
        assert ordinal(raised) == ordinal(worked) + 1
        page.get_by_label('出征人数', exact=True).fill('20000')
        page.get_by_role('button', name='检视攻城军令', exact=True).click()
        assert saved(page) == raised
        expect(page.locator('.military-confirmation')).to_contain_text('按天下兵力规则自动结算')
        page.get_by_role('button', name='确认攻城', exact=True).click()
        won = saved(page)
        w = won['worldConflict']
        assert w['cities']['moling']['factionId'] == 'player'
        assert 0 < w['cities']['moling']['troops'] < 20000
        assert w['playerReserve'] == 0 and w['ledger']['losses'] > raised['worldConflict']['ledger']['losses']
        assert sum(c['troops'] for c in w['cities'].values()) + sum(a['troops'] for a in w['armies']) + w['playerReserve'] == w['ledger']['initial'] + w['ledger'].get('expansion', 0) + w['ledger']['recruited'] + w['ledger']['raised'] - w['ledger']['losses']
        page.keyboard.press('Escape')
        resume(page)
        assert saved(page) == won
        page.locator('#enter-city').click()
        expect(page.locator('.city-panel h1')).to_contain_text('主角军府')
        page.get_by_role('button', name='军务 / 攻城', exact=True).click()
        expect(page.get_by_label('调拨人数', exact=True)).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('.city-panel')).to_be_visible()
        page.keyboard.press('Escape')
        page.get_by_role('button', name='当地故事', exact=True).click()
        page.get_by_role('button', name='进入战斗', exact=True).click()
        skill = page.locator('[data-battle-skill="martial-cao-ren"]')
        expect(skill).to_be_visible()
        expect(skill).to_contain_text('等待主角行动')
        page.get_by_role('button', name='守势 / 结束行动', exact=True).click()
        expect(skill).to_be_enabled(timeout=15000)
        skill.click()
        page.get_by_role('button', name='对选中格施展', exact=True).click()
        page.wait_for_function('''key=>JSON.parse(localStorage.getItem(key)).activeBattle?.units.find(u=>u.id==='traveler').martialReady['martial-cao-ren']===4''', arg=KEY)
        assert any('金城' in line for line in saved(page)['activeBattle']['battleLog'])
        resume(page)
        expect(skill).to_contain_text('冷却')
        page.get_by_role('button', name='撤退', exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        assert saved(page)['worldConflict']['cities']['moling']['factionId'] == 'player'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert not external and not errors, {'external': external, 'errors': errors}
        page.screenshot(path=str(OUT / f'packaged-{width}.png'), full_page=True)
        results.append({'viewport': [width, height], 'offline': True, 'workDays': 5, 'recruited': 20000, 'captured': 'moling', 'savedOwnership': True, 'equippedCastAndCooldown': True, 'externalRequests': external, 'pageErrors': errors})
        print('PASS ' + str(width) + ': offline work, recruitment, siege, ownership, casting and reload', flush=True)
        ctx.close()
    settled_battles(browser,settlement_fixture,URL)
    browser.close()
    (OUT / 'package-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
