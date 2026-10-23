"""Calendar journey smoke test; uses real pointer actions and the existing battle driver."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, click_canvas, wait_scene, win_battle, assert_text_bounds

OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'timeline'
OUT.mkdir(parents=True, exist_ok=True)


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")


def seed(page, origin='runan', patch=None):
    page.evaluate('''async ({origin, patch}) => {
      const { createInitialState } = await import('/src/game/state.ts');
      const state = {...createInitialState(() => 0), originId: origin, ...patch};
      localStorage.setItem('three-kingdoms-demo-state', JSON.stringify(state));
    }''', {'origin': origin, 'patch': patch or {}})
    page.reload(wait_until='networkidle')


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 820})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        # Each regional encounter unlocks its own faction only, and may be declined.
        for origin, leader in [('yingchuan', '曹操'), ('nanyang', '孙坚'), ('zhuo', '刘备')]:
            seed(page, origin)
            expect(page.locator('.panel-eyebrow')).to_contain_text('184')
            born = saved(page)['originId']
            page.get_by_role('button', name='踏上逃难路').click()
            wait_scene(page, 'Overworld')
            assert page.locator('.route-card').count() == 0
            click_canvas(page, 790, 160)
            expect(page.locator('h1')).to_have_text('与' + leader + '相遇')
            page.get_by_role('button', name='记下这份交情').click()
            wait_scene(page, 'RouteChoice')
            assert page.locator('.route-card:not(:disabled)').count() == 1
            assert page.locator('.route-card:disabled').count() == 2
            if origin == 'nanyang':
                assert page.locator('img[alt="孙权头像"]').count() == 0
            page.get_by_role('button', name='继续独自行旅').click()
            wait_scene(page, 'Overworld')
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Overworld')
            assert saved(page)['originId'] == born
            assert saved(page)['route'] is None
        print('PASS: regional encounters unlock one faction, optional choice, save persistence', flush=True)

        # An origin without a meeting can travel to 200 without choosing a side.
        seed(page)
        page.screenshot(path=str(OUT / '184-prologue.png'))
        page.get_by_role('button', name='踏上逃难路').click()
        for year in [184, 190, 194, 200]:
            wait_scene(page, 'Overworld')
            assert saved(page)['date']['year'] == year
            assert saved(page)['route'] is None
            assert_text_bounds(page)
            page.screenshot(path=str(OUT / f'{year}-map.png'))
            click_canvas(page, 245, 295)
            page.get_by_role('button', name='进入战斗').click()
            wait_scene(page, 'Battle')
            page.screenshot(path=str(OUT / f'{year}-battle.png'))
            win_battle(page)
            page.get_by_role('button', name='继续行旅', exact=True).click()
            wait_scene(page, 'Overworld')
            click_canvas(page, 475, 210)
            page.get_by_role('button', name='回到地图', exact=True).click()
            wait_scene(page, 'Overworld')
            click_canvas(page, 770, 320)
            page.get_by_role('button', name='开始护送').click()
            wait_scene(page, 'Battle')
            # A neutral escort remains the same encounter after refresh.
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Battle')
            assert saved(page)['encounter'] == 'route'
            assert saved(page)['route'] is None
            win_battle(page)
            wait_scene(page, 'Ending')
            assert saved(page)['route'] is None
            assert saved(page)['flags']['escortWon']
            if year < 200:
                page.get_by_role('button', name='继续下一段行旅').click()
            print(f'PASS: {year} local journey, two battles and neutral escort reload', flush=True)
        page.get_by_role('button', name='查看可投奔的阵营').click()
        wait_scene(page, 'RouteChoice')
        assert page.locator('.route-card:not(:disabled)').count() == 3
        page.screenshot(path=str(OUT / '200-routes.png'))
        page.get_by_role('button', name='曹操 · 可投奔', exact=True).click()
        page.get_by_role('button', name='走 曹 方的路').click()
        wait_scene(page, 'Battle')
        assert saved(page)['route'] == 'cao'
        print('PASS: 200 unlocks all factions and selected faction persists', flush=True)

        # Smaller screens, winter palette and early entry into a selected faction.
        for width, height in [(844, 390), (390, 844)]:
            page.set_viewport_size({'width': width, 'height': height})
            seed(page, 'nanyang', {'phase': 'overworld', 'date': {'year': 184, 'month': 12}})
            wait_scene(page, 'Overworld')
            page.screenshot(path=str(OUT / f'winter-{width}.png'))
            click_canvas(page, 790, 160)
            page.get_by_role('button', name='记下这份交情').click()
            wait_scene(page, 'RouteChoice')
            page.get_by_role('button', name='孙坚 · 可投奔', exact=True).click()
            page.get_by_role('button', name='走 孙 方的路').click()
            wait_scene(page, 'Battle')
            assert saved(page)['route'] == 'sun'
            assert saved(page)['date']['year'] == 184
            page.screenshot(path=str(OUT / f'early-sun-{width}.png'))
        assert not errors, errors
        browser.close()
        print('PASS: mobile layouts and early faction entry; no page errors', flush=True)


if __name__ == '__main__':
    main()
