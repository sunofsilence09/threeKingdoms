"""Exercise mixed initiative through real controls at desktop and mobile sizes."""
from playwright.sync_api import sync_playwright, expect
from verify_h5 import ARTIFACTS, URL, wait_player_turn, battle, click_canvas, wait_scene, assert_text_bounds


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(URL, wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({phase:'battle',route:null,supplies:3,morale:2,flags:{}}))")
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Battle')
            assert battle(page)['selectedId'] == 'aman'
            assert [u['speed'] for u in battle(page)['units']] == [12, 14, 10, 11, 13, 9]
            assert_text_bounds(page)
            page.screenshot(path=str(ARTIFACTS / f'speed-order-{width}.png'), full_page=True)
            # An ally waiting in the queue cannot steal the current actor's turn.
            click_canvas(page, 760, 335, True)
            assert battle(page)['selectedId'] == 'aman'
            # End only Aman's action; scout acts before Jiang Yuan.
            click_canvas(page, 870, 480, True)
            assert battle(page)['turn'] == 'enemy'
            assert battle(page)['actedIds'] == ['aman']
            click_canvas(page, 870, 480, True)
            assert battle(page)['actedIds'] == ['aman'], 'input during enemy turn advanced the queue'
            wait_player_turn(page)
            assert battle(page)['selectedId'] == 'traveler'
            assert battle(page)['actedIds'] == ['aman', 'bandit-scout-a']
            click_canvas(page, 741, 480, True)
            wait_player_turn(page)
            assert battle(page)['selectedId'] == 'chen-da'
            assert battle(page)['round'] == 1
            click_canvas(page, 870, 480, True)
            wait_player_turn(page)
            assert battle(page)['selectedId'] == 'aman'
            assert battle(page)['round'] == 2
            assert battle(page)['actedIds'] == []
            # All enemy and historical NPC details expose speed as well.
            click_canvas(page, 908, 410, True)
            expect(page.locator('.character-details')).to_be_visible()
            expect(page.locator('.character-stats')).to_contain_text('速度')
            page.get_by_role('button', name='乱世人物', exact=True).click()
            expect(page.locator('.character-stats')).to_contain_text('速度')
            page.get_by_role('button', name='关闭人物详情').click()
            assert_text_bounds(page)
            context.close()
        browser.close()
    assert not errors, errors
    print('Speed initiative UI passed: desktop, landscape touch, portrait touch; mixed turns, input lock, round reset, NPC details.')


if __name__ == '__main__':
    main()
