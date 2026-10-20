import os
from time import monotonic
from collections import deque
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)
URL = os.environ.get('H5_URL', 'http://127.0.0.1:5173')


def battle(page):
    return page.evaluate('''async () => {
      const entry = [...document.scripts].find(script => script.src.includes('/src/main.ts'));
      const { game } = await import(entry.src);
      if (!game.scene.isActive('Battle')) return null;
      const scene = game.scene.getScene('Battle');
      return { ...scene.combat, mode: scene.mode, finished: scene.finished };
    }''')


def wait_scene(page, name):
    deadline = monotonic() + 8
    while monotonic() < deadline:
        active = page.evaluate('''async name => {
          const entry = [...document.scripts].find(script => script.src.includes('/src/main.ts'));
          const { game } = await import(entry.src);
          return game.scene.isActive(name);
        }''', name)
        if active:
            return
        page.wait_for_timeout(50)
    raise AssertionError(f'scene {name} did not become active')


def click_canvas(page, x, y, touch=False):
    box = page.locator('canvas').bounding_box()
    assert box
    px = box['x'] + box['width'] * x / 960
    py = box['y'] + box['height'] * y / 540
    if touch:
        page.touchscreen.tap(px, py)
    else:
        page.mouse.click(px, py)
    # Phaser applies pointer events on the next frame.
    page.wait_for_timeout(45)


def click_tile(page, tile, touch=False):
    click_canvas(page, 88 + tile['x'] * 68, 136 + tile['y'] * 68, touch)


def distance(a, b):
    return abs(a['x'] - b['x']) + abs(a['y'] - b['y'])


def moves(state, unit):
    occupied = {(u['x'], u['y']) for u in state['units'] if u['hp'] > 0}
    seen = {(unit['x'], unit['y'])}
    queue = deque([(unit['x'], unit['y'], 0)])
    result = []
    limit = 3 if state['route'] == 'sun' else 2
    while queue:
        x, y, depth = queue.popleft()
        if depth == limit:
            continue
        for nx, ny in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]:
            if (nx, ny) in seen or (nx, ny) in occupied:
                continue
            if not (0 <= nx < state['width'] and 0 <= ny < state['height']):
                continue
            seen.add((nx, ny))
            result.append({'x': nx, 'y': ny})
            queue.append((nx, ny, depth + 1))
    return result


def win_battle(page, touch=False):
    for _ in range(100):
        state = battle(page)
        if state is None or state['finished']:
            assert '路还在，但你们走不动了' not in page.locator('#overlay-root').inner_text(), state
            return
        enemies = [u for u in state['units'] if u['team'] == 'enemy' and u['hp'] > 0]
        ready = [u for u in state['units'] if u['team'] == 'party' and u['hp'] > 0 and u['id'] not in state['actedIds']]
        assert ready and enemies, state
        unit = ready[0]
        click_tile(page, unit, touch)
        adjacent = [e for e in enemies if distance(unit, e) == 1]
        if not adjacent and unit['id'] not in state['movedIds']:
            candidates = moves(state, unit)
            if candidates:
                destination = min(candidates, key=lambda tile: min(distance(tile, e) for e in enemies))
                if min(distance(destination, e) for e in enemies) < min(distance(unit, e) for e in enemies):
                    click_tile(page, destination, touch)
                    current = battle(page)
                    unit = next(u for u in current['units'] if u['id'] == unit['id'])
                    assert (unit['x'], unit['y']) == (destination['x'], destination['y']), current
                    assert current['round'] == state['round'], 'movement triggered enemies early'
                    adjacent = [e for e in enemies if distance(unit, e) == 1]
        if adjacent:
            click_tile(page, min(adjacent, key=lambda enemy: enemy['hp']), touch)
        else:
            click_canvas(page, 740, 398, touch)
    raise AssertionError('battle did not finish within 100 party actions')


def assert_visible(page, selector):
    box = page.locator(selector).bounding_box()
    viewport = page.viewport_size
    assert box and viewport
    assert box['x'] >= 0 and box['y'] >= 0, box
    assert box['x'] + box['width'] <= viewport['width'] + 1, box
    assert box['y'] + box['height'] <= viewport['height'] + 1, box
    assert page.locator(selector).evaluate('''element => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return hit === element || element.contains(hit);
    }'''), f'{selector} is clipped or covered'


def main():
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for index, route in enumerate(['cao', 'sun', 'liu']):
            touch = route == 'liu'
            context = browser.new_context(
                viewport={'width': 844, 'height': 390} if touch else {'width': 1280, 'height': 820},
                has_touch=touch,
            )
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.goto(URL, wait_until='networkidle')
            expect(page.get_by_role('button', name='踏上逃难路')).to_be_visible()
            if index == 0:
                page.screenshot(path=str(ARTIFACTS / 'h5-desktop-prologue.png'))
            page.get_by_role('button', name='踏上逃难路').click()
            wait_scene(page, 'Overworld')
            click_canvas(page, 210, 315, touch)
            expect(page.get_by_role('button', name='进入战斗')).to_be_visible()
            page.get_by_role('button', name='进入战斗').click()
            wait_scene(page, 'Battle')
            if index == 0:
                click_tile(page, {'x': 1, 'y': 2})
                click_tile(page, {'x': 3, 'y': 2})
                assert battle(page)['units'][1]['x'] == 3
                page.reload(wait_until='networkidle')
                wait_scene(page, 'Battle')
                assert battle(page)['mode'] == 'ambush'
                assert battle(page)['units'][1]['x'] == 1
                assert page.locator('#overlay-root').inner_text() == ''
                for _ in range(40):
                    if battle(page)['finished']:
                        break
                    click_canvas(page, 740, 476)
                expect(page.get_by_role('button', name='重试这场战斗')).to_be_visible()
                page.get_by_role('button', name='重试这场战斗').click()
                wait_scene(page, 'Battle')
                assert battle(page)['round'] == 1
                assert all(u['hp'] == u['maxHp'] for u in battle(page)['units'])
            win_battle(page, touch)
            expect(page.get_by_role('button', name='继续前往临水镇')).to_be_visible()
            page.get_by_role('button', name='继续前往临水镇').click()
            wait_scene(page, 'Overworld')
            click_canvas(page, 480, 215, touch)
            expect(page.get_by_role('button', name='前往临水镇', exact=True)).to_be_visible()
            page.get_by_role('button', name='前往临水镇', exact=True).click()
            wait_scene(page, 'RouteChoice')
            assert page.locator('.route-card').count() == 3
            assert_visible(page, '.panel-button')
            if touch:
                page.screenshot(path=str(ARTIFACTS / 'h5-mobile-route-choice.png'))
            page.locator('.route-card').nth(index).click()
            page.locator('.panel-button').click()
            wait_scene(page, 'Battle')
            assert battle(page)['route'] == route
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Battle')
            assert battle(page)['mode'] == 'route'
            assert battle(page)['route'] == route
            assert_visible(page, 'canvas')
            page.screenshot(path=str(ARTIFACTS / f'h5-{route}-battle.png'))
            win_battle(page, touch)
            wait_scene(page, 'Ending')
            expect(page.get_by_role('button', name='从头再走一遍')).to_be_visible()
            page.screenshot(path=str(ARTIFACTS / f'h5-{route}-ending.png'))
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Ending')
            page.get_by_role('button', name='从头再走一遍').click()
            wait_scene(page, 'Prologue')
            expect(page.get_by_role('button', name='踏上逃难路')).to_be_visible()
            print(f'{route}: prologue -> ambush -> recovery -> route battle -> ending -> restart PASS')
            context.close()
        for width, height in [(667, 375), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
            page = context.new_page()
            page.goto(URL, wait_until='networkidle')
            page.evaluate('''localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({
              phase: 'route-choice', route: null, supplies: 3, morale: 2, flags: { ambushWon: true }
            }))''')
            page.reload(wait_until='networkidle')
            wait_scene(page, 'RouteChoice')
            page.locator('.route-card').nth(1).tap()
            page.locator('.panel-button').scroll_into_view_if_needed()
            assert_visible(page, '.panel-button')
            page.screenshot(path=str(ARTIFACTS / f'h5-route-{width}x{height}.png'))
            page.locator('.panel-button').tap()
            wait_scene(page, 'Battle')
            assert_visible(page, 'canvas')
            context.close()
            print(f'{width}x{height}: route selection and canvas fit PASS')
        assert not errors, errors
        browser.close()
        print('No browser runtime errors. Desktop mouse and mobile touch passed.')


if __name__ == '__main__':
    main()
