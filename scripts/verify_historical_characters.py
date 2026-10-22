from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import battle, wait_scene, click_canvas, assert_visible

ARTIFACTS = Path(__file__).resolve().parents[1] / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width != 1280)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto('http://127.0.0.1:5173', wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state',JSON.stringify({phase:'route-choice',route:null,supplies:3,morale:2,flags:{ambushWon:true}}))")
            page.reload(wait_until='networkidle'); wait_scene(page, 'RouteChoice')
            if width < height:
                page.locator('.panel-button').scroll_into_view_if_needed()
            assert_visible(page, '.panel-button')
            saved = page.evaluate('localStorage.getItem("three-kingdoms-demo-state")')
            dialog = page.get_by_role('dialog', name='人物详情', exact=True)
            # Per-leader details must not select a route or confirm one.
            page.get_by_role('button', name='查看曹操详情', exact=True).click()
            expect(dialog.locator('h1')).to_have_text('曹操')
            page.keyboard.press('Escape')
            expect(page.locator('.route-card.is-selected')).to_have_count(0)
            expect(page.get_by_role('button', name='先看看条件', exact=True)).to_be_disabled()
            for index, leader in enumerate(['曹操', '孙权', '刘备']):
                page.locator('.route-card').nth(index).click()
                page.get_by_role('button', name=f'查看{leader}详情', exact=True).click()
                expect(dialog.locator('h1')).to_have_text(leader)
                page.get_by_role('button', name='关闭人物详情', exact=True).click()
                expect(page.locator('.route-card').nth(index)).to_have_class('route-card is-selected')
            assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state")') == saved
            page.get_by_role('button', name='人物详情', exact=True).click()
            dialog.get_by_role('button', name='乱世人物', exact=True).click()
            images = []
            previews = []
            for name in ['曹操', '刘备', '孙权', '孙尚香', '貂蝉', '蔡琰']:
                dialog.get_by_role('button', name=name, exact=True).click()
                expect(dialog.locator('h1')).to_have_text(name)
                expect(dialog.locator('.character-level')).to_have_text('尚未同行')
                expect(dialog.locator('.character-ultimate')).to_be_hidden()
                assert dialog.locator('[data-detail-stat="体力"]').count() == 0
                portrait = dialog.locator('.character-art img')
                expect(portrait).to_have_attribute('alt', f'{name}全身立绘')
                page.wait_for_function("() => {const i=document.querySelector('.character-art img');return i.complete && i.naturalHeight>=1000;}")
                images.append(portrait.get_attribute('src'))
                preview = dialog.get_by_role('img', name=f'{name}棋盘小人预览', exact=True)
                assert preview.evaluate('(c)=>c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3 && v>0)')
                previews.append(preview.evaluate('(c)=>c.toDataURL()'))
                if name in ['孙尚香', '蔡琰']:
                    dialog.locator('.character-art').scroll_into_view_if_needed()
                    page.screenshot(path=str(ARTIFACTS / f'h5-{name}-{width}x{height}.png'))
            assert len(set(images)) == len(set(previews)) == 6
            dialog.get_by_role('button', name='同行', exact=True).click()
            dialog.get_by_role('button', name='阿满', exact=True).click()
            expect(dialog.locator('[data-detail-stat="武器"] strong')).to_have_text('拳脚')
            page.keyboard.press('Escape')
            page.locator('.route-card').nth(0).click()
            page.screenshot(path=str(ARTIFACTS / f'h5-leader-route-{width}x{height}.png'))
            page.get_by_role('button', name='走 曹 方的路', exact=True).click(); wait_scene(page, 'Battle')
            before = battle(page)
            page.get_by_role('button', name='姜垣详情', exact=True).click()
            dialog.get_by_role('button', name='乱世人物', exact=True).click()
            dialog.get_by_role('button', name='孙尚香', exact=True).click()
            click_canvas(page, 870, 480, width != 1280)
            assert battle(page) == before
            dialog.get_by_role('button', name='本场敌人', exact=True).click()
            expect(dialog.locator('h1')).to_have_text('山贼头目')
            expect(dialog.locator('[data-detail-stat="体力"] strong')).to_have_text('9 / 9')
            page.keyboard.press('Escape')
            assert not page.locator('#game-container').evaluate('e=>e.inert')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            context.close()
            print(f'historical portraits and models passed {width}x{height}', flush=True)
        browser.close()
    assert not errors, errors


if __name__ == '__main__':
    main()
