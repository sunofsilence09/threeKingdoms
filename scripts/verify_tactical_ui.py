from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import battle, click_canvas, click_tile, assert_hero, assert_text_bounds, assert_visible, wait_scene

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)


def view(page):
    return page.evaluate('''async () => {
      const {game} = await import([...document.scripts].find(s => s.src.includes('/src/main.ts')).src);
      const board = game.scene.getScene('Battle').board;
      return {cell:board.cellSize, x:board.offset.x, y:board.offset.y};
    }''')


def drag(page, touch, target=(200, 180)):
    box = page.locator('canvas').bounding_box()
    def point(x, y):
        return {'x': box['x'] + box['width'] * x / 960, 'y': box['y'] + box['height'] * y / 540}
    start, end = point(440, 300), point(*target)
    if touch:
        session = page.context.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [start]})
        for i in range(1, 11):
            pt = {key: start[key] + (end[key] - start[key]) * i / 10 for key in ['x', 'y']}
            session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [pt]})
            page.wait_for_timeout(20)
        session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        session.detach()
    else:
        page.mouse.move(start['x'], start['y'])
        page.mouse.down()
        page.mouse.move(end['x'], end['y'], steps=12)
        page.mouse.up()
    page.wait_for_timeout(80)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (667, 375), (390, 844)]:
            touch = width != 1280
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto('http://127.0.0.1:5173', wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({phase:'battle',route:null,supplies:3,morale:2,flags:{}}))")
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Battle')
            expect(page.locator('.hero-level')).to_have_text('Lv.1')
            expect(page.locator('.hero-experience')).to_have_text('经验 0 / 20')
            assert page.locator('.hero-stats').inner_text().startswith('菜刀')
            assert (battle(page)['width'], battle(page)['height']) == (16, 10)
            assert_hero(page)
            assert_text_bounds(page)
            page.get_by_role('button', name='选中主角姜垣').click()
            page.wait_for_timeout(50)
            before = battle(page)
            click_tile(page, {'x': 5, 'y': 4}, touch)
            assert battle(page) == before, 'clicking an obstacle changed combat'
            click_canvas(page, 536, 98, touch)
            assert view(page)['cell'] == 56
            camera = view(page)
            drag(page, touch)
            assert view(page) != camera, 'drag did not pan the zoomed battlefield'
            assert battle(page) == before, 'drag triggered a unit action'
            for target in [(741, 480), (870, 480), (804, 390), (468, 98)]:
                drag(page, touch, target)
                assert battle(page) == before, 'dragging onto a fixed control triggered an action'
                assert view(page)['cell'] == 56, 'drag release changed zoom'
            page.get_by_role('button', name='选中主角姜垣').click()
            page.wait_for_timeout(50)
            point = page.evaluate('''async () => {
              const {game} = await import([...document.scripts].find(s => s.src.includes('/src/main.ts')).src); const scene=game.scene.getScene('Battle');
              return scene.board.tileScreenPoint(scene.combat.units[0]);
            }''')
            assert 24 <= point['x'] <= 654 and 118 <= point['y'] <= 478
            page.screenshot(path=str(ARTIFACTS / f'h5-tactical-zoom-{width}x{height}.png'))
            click_canvas(page, 468, 98, touch)
            assert view(page)['cell'] == 36
            assert_hero(page)
            assert_visible(page, 'canvas')
            assert_visible(page, '.hero-portrait')
            hud = page.locator('.hero-hud').bounding_box()
            assert hud['x'] >= 0 and hud['y'] >= 0
            assert hud['x'] + hud['width'] <= width + 1 and hud['y'] + hud['height'] <= height + 1
            assert page.locator('canvas').count() == 1
            if width >= height:
                panel = page.locator('.hero-hud').bounding_box()
                canvas = page.locator('canvas').bounding_box()
                assert panel['x'] >= canvas['x'] + canvas['width'] * 654 / 960, 'HUD covers battlefield'
            page.screenshot(path=str(ARTIFACTS / f'h5-tactical-{width}x{height}.png'))
            context.close()
            print(f'{width}x{height}: level HUD, obstacles, zoom, drag, selection and layout PASS', flush=True)
        browser.close()
    assert not errors, errors

if __name__ == '__main__':
    main()
