"""Real desktop/mobile city work controls. Run against an isolated Vite port."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('H5_URL', 'http://127.0.0.1:5187')
KEY = 'three-kingdoms-demo-state'
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'city-work'
OUT.mkdir(parents=True, exist_ok=True)


def saved(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)


def seed(page, date=None, journey=False):
    state = page.evaluate('''async ({date,journey}) => {
      const {createInitialState}=await import('/src/game/state.ts');
      const {createLifeState}=await import('/src/game/personLife.ts');
      const {createWorldConflict}=await import('/src/game/worldConflict.ts');
      const {startTravel}=await import('/src/game/travel.ts');
      let state={...createInitialState(()=>0),heroName:'帮工测试',phase:'overworld',currentCityId:'yingchuan'};
      if(date) state={...state,date,life:createLifeState(date),worldConflict:createWorldConflict(date,Object.keys(state.party))};
      if(journey) state=startTravel(state,'nanhai',9);
      return JSON.parse(JSON.stringify(state));
    }''', {'date': date, 'journey': journey})
    page.evaluate('({key,state}) => localStorage.setItem(key,JSON.stringify(state))', {'key': KEY, 'state': state})
    assert page.evaluate("async()=>!!(await import('/src/game/state.ts')).loadState()"), 'Fixture is not loadable'
    page.reload(wait_until='networkidle')
    if page.get_by_role('button', name='继续游戏', exact=True).count():
        page.get_by_role('button', name='继续游戏', exact=True).click()
    expect(page.locator('#world-root')).to_be_visible()
    return saved(page)


def ordinal(date):
    return date['year'] * 360 + (date['month'] - 1) * 30 + date.get('day', 1)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        errors = []
        for width, height in [(1440,1000), (390,844), (844,390)]:
            context = browser.new_context(viewport={'width':width,'height':height}, has_touch=width != 1440)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL, wait_until='networkidle')
            before = seed(page)
            blocks = page.get_by_label('帮工时长（每段5日）', exact=True)
            expect(blocks).to_have_value('1')
            expect(blocks).to_have_attribute('max', '72')
            expect(page.locator('#city-work-preview')).to_have_text('共5日 · 军需+5 / 铜钱+100')
            assert saved(page) == before, 'Rendering or previews advanced game state'
            page.get_by_role('button', name='开始帮工', exact=True).click()
            worked = saved(page)
            assert ordinal(worked['date']) - ordinal(before['date']) == 5
            assert worked['economy']['coins'] - before['economy']['coins'] == 100
            assert worked['supplies'] - before['supplies'] == 5
            page.reload(wait_until='networkidle')
            if page.get_by_role('button', name='继续游戏', exact=True).count():
                page.get_by_role('button', name='继续游戏', exact=True).click()
            assert saved(page) == worked
            blocks.fill('3')
            expect(page.locator('#city-work-preview')).to_have_text('共15日 · 军需+15 / 铜钱+300')
            assert saved(page) == worked
            page.screenshot(path=str(OUT / f'work-{width}.png'), full_page=True)
            page.get_by_role('button', name='开始帮工', exact=True).click()
            assert ordinal(saved(page)['date']) - ordinal(worked['date']) == 15
            assert saved(page)['economy']['coins'] - worked['economy']['coins'] == 300
            for bad in ['', '0', '-1', '1.5', '73', '10000000000000000']:
                blocks.fill(bad)
                expect(page.get_by_role('button', name='开始帮工', exact=True)).to_be_disabled()
            expect(page.get_by_role('button', name='安居一月 · 30日', exact=True)).to_be_enabled()
            expect(page.get_by_role('button', name='长期停留 · 一年', exact=True)).to_be_enabled()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            seed(page, journey=True)
            expect(blocks).to_be_disabled()
            expect(page.get_by_role('button', name='开始帮工', exact=True)).to_be_disabled()
            before = seed(page, {'year':310,'month':12,'day':23})
            expect(blocks).to_have_attribute('max', '1')
            blocks.fill('2')
            expect(page.get_by_role('button', name='开始帮工', exact=True)).to_be_disabled()
            assert saved(page) == before
            blocks.fill('1')
            page.get_by_role('button', name='开始帮工', exact=True).click()
            assert saved(page)['date'] == {'year':310,'month':12,'day':28}
            expect(blocks).to_be_disabled()
            expect(page.locator('#city-work-preview')).to_contain_text('不足5日')
            context.close()
            print(f'PASS: {width}x{height}: 5/15-day work, preview, reload, invalid input, calendar end and road lock', flush=True)
        browser.close()
        assert not errors, json.dumps(errors, ensure_ascii=False)


if __name__ == '__main__':
    main()
