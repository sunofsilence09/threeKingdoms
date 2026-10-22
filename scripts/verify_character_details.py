from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import battle, click_canvas, wait_scene

ARTIFACTS = Path(__file__).resolve().parents[1] / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width != 1280,
                                          reduced_motion='reduce' if width == 844 else 'no-preference')
            page = context.new_page()
            page.set_default_timeout(7000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto('http://127.0.0.1:5173', wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({phase:'overworld',route:null,supplies:3,morale:2,flags:{ambushWon:true},party:{traveler:{level:3,xp:25},aman:{level:3,xp:25},'chen-da':{level:3,xp:25}}}))")
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Overworld')
            saved = page.evaluate('localStorage.getItem("three-kingdoms-demo-state")')
            page.get_by_role('button', name='姜垣详情', exact=True).click()
            dialog = page.get_by_role('dialog', name='人物详情', exact=True)
            expect(dialog).to_be_visible()
            for name in ['姜垣', '阿满', '陈达']:
                dialog.get_by_role('button', name=name, exact=True).click()
                expect(dialog.locator('h1')).to_have_text(name)
                portrait = dialog.locator('.character-art img')
                expect(portrait).to_have_attribute('alt', f'{name}全身立绘')
                expect(portrait).to_be_visible()
                page.wait_for_function("() => { const i=document.querySelector('.character-art img'); return i.complete && i.naturalHeight>1000; }")
            page.screenshot(path=str(ARTIFACTS / f'h5-character-details-{width}x{height}.png'))
            page.keyboard.press('Escape')
            expect(dialog).to_have_count(0)
            assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state")') == saved
            # Nested details must preserve the actual growth draft and route-card callbacks.
            page.get_by_role('button', name='角色成长', exact=True).click()
            page.get_by_role('button', name='增加武力', exact=True).click()
            page.get_by_role('button', name='查看姜垣详情', exact=True).click()
            page.get_by_role('button', name='关闭人物详情', exact=True).click()
            expect(page.locator('[data-attribute="strength"] .attribute-value')).to_have_text('10 → 11')
            page.get_by_role('button', name='取消', exact=True).click()
            click_canvas(page, 770, 320, width != 1280)
            wait_scene(page, 'RouteChoice')
            page.locator('.route-card').nth(0).click()
            page.get_by_role('button', name='人物详情', exact=True).click()
            page.keyboard.press('Escape')
            expect(page.locator('.route-card').nth(0)).to_have_class('route-card is-selected')
            page.get_by_role('button', name='走 曹 方的路', exact=True).click()
            wait_scene(page, 'Battle')
            # Open the explicit roster detail control without consuming an action.
            before = battle(page)
            models = page.evaluate('''async () => {
              const {game}=await import([...document.scripts].find(s=>s.src.includes('/src/main.ts')).src);
              return game.scene.getScene('Battle').board.layer.list.filter(c=>c.name.startsWith('model:')).map(c=>({id:c.getData('character'),weapon:c.getData('weapon'),pose:c.getData('pose'),portrait:c.getData('portrait')}));
            }''')
            assert len(models) == 6
            assert len(set(m['pose'] for m in models)) == 5
            assert [m['weapon'] for m in models[:3]] == ['knife', 'spear', 'bow']
            click_canvas(page, 908, 390, width != 1280)
            expect(dialog.locator('h1')).to_have_text('阿满')
            expect(dialog.locator('[data-detail-stat="武器"] strong')).to_have_text('木枪')
            assert battle(page) == before
            for name in ['姜垣', '阿满', '陈达', '山贼头目', '拦路山贼', '山贼弓手']:
                if name == '山贼头目':
                    dialog.get_by_role('button', name='本场敌人', exact=True).click()
                dialog.get_by_role('button', name=name, exact=True).click()
                page.wait_for_function("() => { const i=document.querySelector('.character-art img'); return i.complete && i.naturalWidth>0; }")
                expect(dialog.locator('h1')).to_have_text(name)
            # Input above the board and end-turn control is intercepted by the modal.
            click_canvas(page, 870, 480, width != 1280)
            assert battle(page) == before
            page.get_by_role('button', name='关闭人物详情', exact=True).click()
            # Defeated and already-acted characters can still be inspected, with live HP.
            page.evaluate('''async () => {
              const {game}=await import([...document.scripts].find(s=>s.src.includes('/src/main.ts')).src);
              const s=game.scene.getScene('Battle');
              s.combat.units[0].hp=0; s.combat.units[1].hp=3; s.combat.actedIds=['traveler','aman'];
              s.renderBoard();
            }''')
            page.get_by_role('button', name='姜垣详情', exact=True).click()
            expect(dialog.locator('[data-detail-stat="体力"] strong')).to_have_text('0 / 15')
            expect(dialog.locator('.character-battle-status')).to_contain_text('倒地')
            dialog.get_by_role('button', name='阿满', exact=True).click()
            expect(dialog.locator('[data-detail-stat="体力"] strong')).to_have_text('3 / 14')
            expect(dialog.locator('.character-battle-status')).to_contain_text('已行动')
            page.get_by_role('button', name='关闭人物详情', exact=True).focus()
            page.keyboard.press('Shift+Tab')
            assert page.evaluate("document.querySelector('.character-details').contains(document.activeElement)")
            page.keyboard.press('Escape')
            page.screenshot(path=str(ARTIFACTS / f'h5-character-models-{width}x{height}.png'))
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            context.close()
            print(f'character details passed {width}x{height}', flush=True)
        browser.close()
    assert not errors, errors


if __name__ == '__main__':
    main()
