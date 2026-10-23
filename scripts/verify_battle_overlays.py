"""Regression coverage for inspection dialogs overlapping delayed enemy actions."""
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, wait_player_turn, battle, click_canvas, wait_scene


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 820})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.evaluate("localStorage.setItem('three-kingdoms-demo-state',JSON.stringify({phase:'battle',route:null,supplies:3,morale:2,flags:{}}))")
        page.reload(wait_until='networkidle')
        wait_scene(page, 'Battle')
        # Arrange a legal lethal enemy attack against the last surviving ally.
        page.evaluate('''async () => {
          const {game} = await import([...document.scripts].find(s => s.src.includes('/src/main.ts')).src);
          const scene = game.scene.getScene('Battle');
          scene.combat = {...scene.combat, terrain: [], selectedId: 'aman',
            units: scene.combat.units.map(u => ({...u,
              hp: u.id === 'aman' ? 1 : u.id === 'bandit-scout-a' ? 4 : 0,
              x: u.id === 'aman' ? 1 : 2, y: 1, attack: 99, dodgeRate: 0}))};
          scene.renderBoard();
        }''')
        click_canvas(page, 870, 480)
        click_canvas(page, 804, 98)
        expect(page.locator('.character-details')).to_be_visible()
        before = battle(page)
        page.wait_for_timeout(900)
        assert battle(page) == before, 'enemy acted behind the inspection dialog'
        page.get_by_role('button', name='关闭人物详情').click()
        expect(page.get_by_role('button', name='重试这场战斗')).to_be_visible()
        assert not page.locator('#game-container').evaluate('e => e.inert')
        page.keyboard.press('Escape')
        expect(page.get_by_role('button', name='重试这场战斗')).to_be_visible()
        page.get_by_role('button', name='重试这场战斗').click()
        wait_scene(page, 'Battle')
        assert not battle(page)['finished']
        click_canvas(page, 870, 480)
        wait_player_turn(page)
        assert battle(page)['selectedId'] == 'traveler', 'retry controls remained disabled'
        # Nested growth/details closes only the top dialog and restores input last.
        page.get_by_role('button', name='角色成长', exact=True).click()
        page.get_by_role('button', name='查看姜垣详情').click()
        page.keyboard.press('Escape')
        expect(page.locator('.training-panel')).to_be_visible()
        assert page.locator('#game-container').evaluate('e => e.inert')
        page.keyboard.press('Escape')
        expect(page.locator('.training-panel')).to_have_count(0)
        assert not page.locator('#game-container').evaluate('e => e.inert')
        # Replacing a dialog externally must remove its Escape handler as well.
        click_canvas(page, 804, 98)
        page.evaluate('''async () => {
          const {showPanel} = await import('/src/game/ui.ts');
          showPanel({title: 'replacement marker', body: ''});
        }''')
        page.keyboard.press('Escape')
        expect(page.locator('#overlay-root')).to_contain_text('replacement marker')
        assert not page.locator('#game-container').evaluate('e => e.inert')
        assert not errors, errors
        browser.close()
    print('Battle overlay regressions passed: pause, lethal attack, Escape, retry, nested dialogs and forced cleanup.')


if __name__ == '__main__':
    main()
