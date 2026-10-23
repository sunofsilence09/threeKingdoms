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
    box = page.locator('#game-container canvas').bounding_box()
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
    point = page.evaluate('''async tile => {
      const entry = [...document.scripts].find(script => script.src.includes('/src/main.ts'));
      const { game } = await import(entry.src);
      return game.scene.getScene('Battle').board.tileScreenPoint(tile);
    }''', {'x': tile['x'], 'y': tile['y']})
    assert 24 <= point['x'] < 654 and 118 <= point['y'] < 478, point
    click_canvas(page, point['x'], point['y'], touch)


def current_actor(state):
    if not state or state['finished']:
        return None
    return next((u for u in sorted(state['units'], key=lambda u: -u['speed'])
                 if u['hp'] > 0 and u['id'] not in state['actedIds']), None)


def wait_player_turn(page):
    deadline = monotonic() + 8
    while monotonic() < deadline:
        state = battle(page)
        if not state or state['finished'] or state['turn'] == 'party':
            return state
        page.wait_for_timeout(50)
    raise AssertionError('enemy actions did not yield to the party')


def assert_hero(page):
    expect(page.locator('.hero-hud')).to_be_visible()
    portrait = page.locator('.hero-portrait img')
    assert portrait.evaluate('image => image.complete && image.naturalWidth > 0')
    assert page.locator('.hero-hud').evaluate('''panel => {
      const box = panel.getBoundingClientRect();
      return [...panel.querySelectorAll('strong, span, img, meter')].every(element => {
        if (!element.getClientRects().length) return true;
        let rect = element.getBoundingClientRect();
        // A portrait deliberately zooms its source image inside a clipped frame.
        const frame = element.tagName === 'IMG' ? element.closest('.hero-portrait') : null;
        if (frame && getComputedStyle(frame).overflow === 'hidden') rect = frame.getBoundingClientRect();
        return rect.left >= box.left - 1 && rect.right <= box.right + 1 &&
          rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1;
      });
    }'''), 'Hero UI extends outside its panel'
    state = battle(page)
    if state:
        hero = next(unit for unit in state['units'] if unit['id'] == 'traveler')
        expect(page.locator('.hero-health-value')).to_have_text(f"{hero['hp']} / {hero['maxHp']}")
        assert page.locator('.hero-health-meter').evaluate('meter => meter.value') == hero['hp']
        weapon = {'cleaver': '菜刀', 'fists': '拳脚', 'knife': '短刀', 'spear': '木枪', 'bow': '猎弓'}[hero['weapon']]
        movement = 4 if state['route'] == 'sun' else 3
        expect(page.locator('.hero-stats')).to_have_text(f"{weapon} · 攻 {hero['attack'] * (1.5 if hero.get('empowered') else 1):g} · 速 {hero['speed']} · 移 {movement}")
        expect(page.locator('.hero-level')).to_have_text(f"Lv.{hero['level']}")
        threshold = 20 + (hero['level'] - 1) * 10
        expect(page.locator('.hero-experience')).to_have_text(f"经验 {hero['xp']} / {threshold}")
        status = '无法行动' if hero['hp'] <= 0 else '攻击强化' if hero.get('empowered') else '守势中' if hero['guarded'] else '已行动' if hero['id'] in state['actedIds'] else '已移动' if hero['id'] in state['movedIds'] else '当前行动' if current_actor(state) and current_actor(state)['id'] == hero['id'] else '等待顺序'
        expect(page.locator('.hero-action')).to_have_text(status)


def assert_text_bounds(page):
    clipped = page.evaluate('''async () => {
      const entry = [...document.scripts].find(script => script.src.includes('/src/main.ts'));
      const { game } = await import(entry.src);
      const clipped = [];
      function inspect(objects) {
        for (const object of objects) {
          if (object.type === 'Container') inspect(object.list);
          if (object.type !== 'Text') continue;
          for (const line of object.text.split('\\n')) {
            const bounds = object.context.measureText(line);
            if (bounds.actualBoundingBoxAscent > object.style.metrics.ascent + object.padding.top ||
                bounds.actualBoundingBoxDescent > object.style.metrics.descent + object.padding.bottom) {
              clipped.push(object.text);
            }
          }
        }
      }
      for (const scene of game.scene.getScenes(true)) inspect(scene.children.list);
      return clipped;
    }''')
    assert not clipped, f'Text exceeds its canvas: {clipped}'


def distance(a, b):
    return abs(a['x'] - b['x']) + abs(a['y'] - b['y'])


def plan_action(page):
    # Read real rules to plan inputs, without changing the live scene or its state.
    return page.evaluate('''async () => {
      const entry = [...document.scripts].find(s => s.src.includes('/src/main.ts'));
      const { game } = await import(entry.src);
      const rules = await import('/src/game/combat.ts');
      const { TERRAIN } = await import('/src/game/battlefield.ts');
      const state = game.scene.getScene('Battle').combat;
      const actor = rules.currentActor(state);
      if (!actor || actor.team !== 'party') return null;
      const ready = [actor];
      const enemies = state.units.filter(u => u.team === 'enemy' && u.hp > 0);
      const attacks = [];
      for (const unit of ready) {
        for (const tile of [unit, ...rules.reachableTiles(state, unit.id)]) {
          const moved = tile.x === unit.x && tile.y === unit.y ? state : rules.moveUnit(state, unit.id, tile.x, tile.y);
          const attacker = moved.units.find(u => u.id === unit.id);
          for (const enemy of enemies.filter(e => rules.canAttack(moved, attacker, e))) {
            const after = rules.performAttack(moved, unit.id, enemy.id);
            const hp = after.units.find(u => u.id === enemy.id).hp;
            const threat = enemies.filter(e => rules.canAttack(moved, e, attacker)).length;
            attacks.push({ id: unit.id, tile: {x: tile.x, y: tile.y}, target: enemy.id,
              score: (hp === 0 ? 100 : 0) + (enemy.hp - hp) * 10 - threat * 2 - (tile === unit ? 0 : 0.1) });
          }
        }
      }
      if (attacks.length) return attacks.sort((a,b) => b.score-a.score)[0];
      const plans = [];
      for (const unit of ready) {
        const occupied = new Set(state.units.filter(u => u.hp > 0 && u.id !== unit.id).map(u => `${u.x},${u.y}`));
        const queue = [{x: unit.x, y: unit.y, cost: 0, path: []}];
        const costs = new Map([[`${unit.x},${unit.y}`, 0]]);
        while (queue.length) {
          queue.sort((a,b) => a.cost-b.cost);
          const current = queue.shift();
          if (current.cost !== costs.get(`${current.x},${current.y}`)) continue;
          if (enemies.some(e => rules.canAttack(state, {...unit, x: current.x, y: current.y}, e))) {
            let cost = 0, tile = {x: unit.x, y: unit.y};
            if (!state.movedIds.includes(unit.id)) for (const step of current.path) {
              cost += TERRAIN[rules.terrainAt(state, step.x, step.y)].cost;
              if (cost > rules.movementRange(state, unit)) break;
              tile = step;
            }
            plans.push({id:unit.id, tile, target:null, score:current.cost});
            break;
          }
          for (const [x,y] of [[current.x+1,current.y],[current.x-1,current.y],[current.x,current.y+1],[current.x,current.y-1]]) {
            if (x < 0 || y < 0 || x >= state.width || y >= state.height || occupied.has(`${x},${y}`)) continue;
            const cost = current.cost + TERRAIN[rules.terrainAt(state,x,y)].cost;
            if (!Number.isFinite(cost) || cost >= (costs.get(`${x},${y}`) ?? Infinity)) continue;
            costs.set(`${x},${y}`,cost);
            queue.push({x,y,cost,path:[...current.path,{x,y}]});
          }
        }
      }
      return plans.sort((a,b) => a.score-b.score)[0] ?? {id:ready[0].id, tile:ready[0], target:null};
    }''')


def win_battle(page, touch=False, on_turn=None):
    for _ in range(150):
        state = wait_player_turn(page)
        if state is None or state['finished']:
            assert '路还在，但你们走不动了' not in page.locator('#overlay-root').inner_text(), state
            return
        if on_turn:
            on_turn(page, state)
        assert_hero(page)
        assert_text_bounds(page)
        plan = plan_action(page)
        unit = next(u for u in state['units'] if u['id'] == plan['id'])
        click_tile(page, unit, touch)
        if (plan['tile']['x'], plan['tile']['y']) != (unit['x'], unit['y']):
            click_tile(page, plan['tile'], touch)
            current = battle(page)
            moved = next(u for u in current['units'] if u['id'] == unit['id'])
            assert (moved['x'], moved['y']) == (plan['tile']['x'], plan['tile']['y']), current
            assert current['round'] == state['round'], {'reason': 'movement triggered enemies early', 'plan': plan, 'before': state, 'after': current}
        if plan['target']:
            click_tile(page, next(e for e in state['units'] if e['id'] == plan['target']), touch)
        else:
            click_canvas(page, 741, 480, touch)
    raise AssertionError('battle did not finish within 150 party actions')


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
            assert_hero(page)
            assert_text_bounds(page)
            click_canvas(page, 210, 315, touch)
            expect(page.get_by_role('button', name='进入战斗')).to_be_visible()
            page.get_by_role('button', name='进入战斗').click()
            wait_scene(page, 'Battle')
            click_canvas(page, 741, 480, touch)  # Aman's faster turn.
            wait_player_turn(page)
            page.get_by_role('button', name='选中主角姜垣').click()
            page.wait_for_timeout(60)
            assert battle(page)['selectedId'] == 'traveler'
            click_canvas(page, 741, 480, touch)
            assert_hero(page)
            expect(page.locator('.hero-action')).to_have_text('守势中')
            if index == 0:
                wait_player_turn(page)
                click_tile(page, {'x': 2, 'y': 6})
                click_tile(page, {'x': 3, 'y': 6})
                assert battle(page)['units'][2]['x'] == 3
                page.reload(wait_until='networkidle')
                wait_scene(page, 'Battle')
                assert battle(page)['mode'] == 'ambush'
                assert battle(page)['units'][2]['x'] == 2
                assert page.locator('#overlay-root').inner_text() == ''
                for _ in range(40):
                    wait_player_turn(page)
                    if battle(page)['finished']:
                        break
                    click_canvas(page, 870, 480)
                expect(page.get_by_role('button', name='重试这场战斗')).to_be_visible()
                page.get_by_role('button', name='重试这场战斗').click()
                wait_scene(page, 'Battle')
                assert battle(page)['round'] == 1
                assert all((progress['level'],progress['xp'],progress['points']) == (1,0,0) for progress in page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state')).party").values())
                assert all(u['hp'] == u['maxHp'] for u in battle(page)['units'])
            win_battle(page, touch)
            expect(page.get_by_role('button', name='继续前往临水镇')).to_be_visible()
            expect(page.locator('.panel-body')).to_contain_text('升级！')
            saved = page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")
            assert all((p['level'],p['xp'],p['points']) == (2,10,3) for p in saved['party'].values()), saved
            page.screenshot(path=str(ARTIFACTS / f'h5-{route}-level-up.png'))
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
            assert battle(page)['units'][0]['level'] == 2
            assert [u['weapon'] for u in battle(page)['units'][:3]] == ['knife', 'spear', 'bow']
            assert_visible(page, 'canvas')
            page.screenshot(path=str(ARTIFACTS / f'h5-{route}-battle.png'))
            win_battle(page, touch)
            wait_scene(page, 'Ending')
            saved = page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")
            assert all((p['level'],p['xp'],p['points']) == (3,25,6) for p in saved['party'].values()), saved
            expect(page.locator('.panel-body')).to_contain_text('Lv.2 → Lv.3')
            expect(page.locator('.panel-body')).to_contain_text('攻击 +1')
            expect(page.locator('.hero-hud')).to_have_count(0)
            expect(page.get_by_role('button', name='从头再走一遍')).to_be_visible()
            page.screenshot(path=str(ARTIFACTS / f'h5-{route}-ending.png'))
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Ending')
            after_reload = page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")
            assert after_reload['party'] == saved['party'], 'ending reload duplicated XP'
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
            assert_hero(page)
            assert_text_bounds(page)
            page.screenshot(path=str(ARTIFACTS / f'h5-hero-{width}x{height}.png'))
            context.close()
            print(f'{width}x{height}: route selection and canvas fit PASS')
        assert not errors, errors
        browser.close()
        print('No browser runtime errors. Desktop mouse and mobile touch passed.')


if __name__ == '__main__':
    main()
