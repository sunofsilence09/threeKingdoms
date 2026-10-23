"""Read-only hero gallery QA. Run after all fifteen portrait assets are installed."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import battle, wait_scene, click_canvas, URL

ARTIFACTS = Path(__file__).resolve().parents[1] / 'artifacts'
WEAPONS = ['fists', 'cleaver', 'knife', 'spear', 'bow']
STAGES = [('refugee', 1), ('veteran', 3), ('commander', 6)]


def path(stage, weapon):
    if stage == 'refugee' and weapon == 'cleaver':
        return '/assets/characters/jiang-yuan-refugee-v1.png'
    return f'/assets/characters/hero/jiang-yuan-{stage}-{weapon}-v1.png'


def image_ready(page):
    page.wait_for_function("() => {const i=document.querySelector('.character-art img');return i.complete && i.naturalHeight>0}")


def main():
    ARTIFACTS.mkdir(exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width != 1280)
            page = context.new_page()
            page.set_default_timeout(9000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL, wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state',JSON.stringify({phase:'battle',route:'cao',supplies:3,morale:2,flags:{ambushWon:true}}))")
            page.reload(wait_until='networkidle'); wait_scene(page, 'Battle')
            saved = page.evaluate('localStorage.getItem("three-kingdoms-demo-state")')
            before = battle(page)
            page.get_by_role('button', name='姜垣详情', exact=True).click()
            dialog = page.get_by_role('dialog', name='人物详情', exact=True)
            stats = dialog.locator('.character-stats').inner_text()
            previews = []
            for stage, level in STAGES:
                for weapon in WEAPONS:
                    dialog.get_by_label('预览成长阶段', exact=True).select_option(stage)
                    dialog.get_by_label('预览武器', exact=True).select_option(weapon)
                    image_ready(page)
                    expected = path(stage, weapon)
                    expect(dialog.locator('.character-art img')).to_have_attribute('src', expected)
                    preview = dialog.locator('.character-model-preview')
                    expect(preview).to_have_attribute('data-portrait', expected)
                    expect(preview).to_have_attribute('data-weapon', weapon)
                    previews.append(preview.evaluate('(c)=>c.toDataURL()'))
                    assert dialog.locator('.character-stats').inner_text() == stats
                    if stage != 'refugee':
                        expect(dialog.locator('.hero-gallery-hint')).to_contain_text(f'未达到 Lv.{level}')
                    if weapon != 'knife':
                        expect(dialog.locator('.hero-gallery-hint')).to_contain_text('当前未装备')
                    assert battle(page) == before
                    assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state")') == saved
                dialog.locator('.hero-gallery').scroll_into_view_if_needed()
                page.screenshot(path=str(ARTIFACTS / f'hero-gallery-{stage}-{width}x{height}.png'))
            assert len(set(previews)) == 15
            dialog.get_by_role('button', name='返回当前外观', exact=True).click()
            expect(dialog.locator('.character-art img')).to_have_attribute('src', path('refugee', 'knife'))
            expect(dialog.locator('.hero-gallery-hint')).to_have_text('当前外观')
            # Restoring rebuilds the gallery; focus must stay inside so Escape still closes.
            expect(dialog.get_by_label('预览成长阶段', exact=True)).to_be_focused()
            page.keyboard.press('Escape')
            expect(dialog).to_have_count(0)
            page.get_by_role('button', name='姜垣详情', exact=True).click()
            expect(dialog.locator('.hero-gallery-hint')).to_have_text('当前外观')
            # Person, category and reopen all discard local gallery selection.
            for reset in ['person', 'category', 'reopen']:
                dialog.get_by_label('预览成长阶段', exact=True).select_option('commander')
                if reset == 'person':
                    dialog.get_by_role('button', name='阿满', exact=True).click()
                    expect(dialog.locator('.hero-gallery')).to_be_hidden()
                    dialog.get_by_role('button', name='姜垣', exact=True).click()
                elif reset == 'category':
                    dialog.get_by_role('button', name='乱世人物', exact=True).click()
                    expect(dialog.locator('.hero-gallery')).to_be_hidden()
                    dialog.get_by_role('button', name='同行', exact=True).click()
                else:
                    page.keyboard.press('Escape')
                    page.get_by_role('button', name='姜垣详情', exact=True).click()
                expect(dialog.locator('.hero-gallery-hint')).to_have_text('当前外观')
            # Pick covered board space without opening a native select popup.
            point = page.evaluate("""() => {
              const b=document.querySelector('#game-container canvas').getBoundingClientRect();
              const overlay=document.querySelector('#overlay-root');
              for(let y=130;y<470;y+=20) for(let x=40;x<650;x+=20) {
                const px=b.left+b.width*x/960, py=b.top+b.height*y/540;
                const e=document.elementFromPoint(px,py);
                if(e && overlay.contains(e) && !e.closest('button,select,label,input,a')) return {x:px,y:py};
              }
              return null;
            }""")
            assert point, 'no covered noninteractive board point found'
            if width != 1280:
                page.touchscreen.tap(point['x'], point['y'])
            else:
                page.mouse.click(point['x'], point['y'])
            assert battle(page) == before
            page.keyboard.press('Escape')
            expect(dialog).to_have_count(0)
            # Explicit live fixtures exercise every boundary and weapon. Runtime save stays Lv.1.
            for level in [1, 2, 3, 5, 6, 10]:
                for weapon in WEAPONS:
                    actual = page.evaluate('''async ({level,weapon}) => {
                      const {game}=await import([...document.scripts].find(s=>s.src.includes('/src/main.ts')).src);
                      const scene=game.scene.getScene('Battle');
                      const hero=scene.combat.units.find(u=>u.id==='traveler');
                      hero.level=level;hero.weapon=weapon;scene.renderBoard();
                      const model=scene.board.layer.list.find(c=>c.name===`model:traveler:${weapon}`);
                      return model.getData('portrait');
                    }''', {'level': level, 'weapon': weapon})
                    stage = 'refugee' if level < 3 else 'veteran' if level < 6 else 'commander'
                    assert actual == path(stage, weapon)
                    expect(page.locator('.hero-portrait img')).to_have_attribute('src', actual)
                    page.get_by_role('button', name='姜垣详情', exact=True).click()
                    expect(dialog.locator('.character-level')).to_have_text(f'Lv.{level}')
                    expect(dialog.locator('.character-art img')).to_have_attribute('src', actual)
                    expect(dialog.locator('.character-model-preview')).to_have_attribute('data-portrait', actual)
                    expect(dialog.locator('.character-model-preview')).to_have_attribute('data-level', str(level))
                    image_ready(page)
                    page.keyboard.press('Escape')
                    expect(dialog).to_have_count(0)
            assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state")') == saved
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            context.close()
            print(f'hero gallery and live appearance passed {width}x{height}', flush=True)
        browser.close()
    assert not errors, errors


if __name__ == '__main__':
    main()
