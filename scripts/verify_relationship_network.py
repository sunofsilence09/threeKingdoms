"""Relationship UI, nested return, read-only state, paging and touch layouts.
H5_URL may point to Vite or the portable production build; no dev imports required.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('H5_URL', 'http://127.0.0.1:5176')
KEY = 'three-kingdoms-demo-state'
OUT = ROOT / 'artifacts' / 'relationship-network'
OUT.mkdir(parents=True, exist_ok=True)


def main():
    state = json.loads((ROOT / 'src/game/fixtures/v10-saves.json').read_text(encoding='utf-8'))['city']
    state['heroName'] = '行旅客'
    # Existing contacts exercise pagination without altering the running UI state.
    for person in list(state['life']['people'])[:35]:
        state['relationships'][person] = {'affinity': 35}
    state['relationships'].pop('himiko', None)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1440, 1000), (390, 844), (844, 390)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width != 1440)
            errors = []
            external = []
            origin = urlsplit(URL)
            def local_only(route):
                target = urlsplit(route.request.url)
                if target.scheme in ['data', 'blob'] or (target.scheme, target.netloc) == (origin.scheme, origin.netloc):
                    route.continue_()
                else:
                    external.append(route.request.url)
                    route.abort()
            context.route('**/*', local_only)
            page = context.new_page()
            page.set_default_timeout(7000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL, wait_until='networkidle')
            page.evaluate('([key,value])=>localStorage.setItem(key,JSON.stringify(value))', [KEY, state])
            page.reload(wait_until='networkidle')
            page.get_by_role('button', name='继续游戏', exact=True).click()
            for _ in range(4):
                page.locator('#world-root:visible, .panel-actions button').first.wait_for(state='visible')
                proceed = page.get_by_role('button', name='查看当前旅程', exact=True)
                if not proceed.is_visible():
                    break
                proceed.click()
                page.wait_for_timeout(100)
            page.locator('#world-root .hero-hud button').last.click()
            details = page.get_by_role('dialog', name='人物详情', exact=True)
            expect(details).to_be_visible()
            saved = page.evaluate('(key)=>localStorage.getItem(key)', KEY)
            details.get_by_role('button', name='查看关系网', exact=True).click()
            panel = page.get_by_role('dialog', name='人物关系网', exact=True)
            expect(panel).to_be_visible()
            expect(panel.locator('h1')).to_have_text('行旅客的关系网')
            expect(panel.locator('.relationship-contact')).to_have_count(12)
            panel.get_by_role('button', name='下一页', exact=True).click()
            expect(panel.locator('.relationship-pager')).to_contain_text('2 /')
            panel.get_by_role('button', name='展开二度联系', exact=True).click()
            assert panel.locator('.relationship-node').count() <= 24
            search = panel.get_by_role('searchbox', name='搜索关系网人物')
            search.fill('曹操')
            panel.get_by_role('button', name='查看关系', exact=True).click()
            expect(panel.locator('h1')).to_have_text('曹操的关系网')
            panel.get_by_label('关系类别', exact=True).select_option('family')
            expect(panel.locator('.relationship-contact')).to_contain_text(['曹丕'])
            panel.locator('.relationship-contact').get_by_role('button', name='曹丕', exact=True).click()
            expect(panel.locator('h1')).to_have_text('曹丕的关系网')
            expect(panel.locator('.relationship-list')).to_contain_text('父亲')
            panel.get_by_role('button', name='返回上一人物', exact=True).click()
            expect(panel.locator('h1')).to_have_text('曹操的关系网')
            search.fill('卑弥呼')
            panel.get_by_role('button', name='查看关系', exact=True).click()
            panel.get_by_label('关系类别', exact=True).select_option('all')
            expect(panel.locator('.relationship-list')).to_contain_text('暂无已记录')
            search.fill('不存在的人物')
            expect(panel.get_by_role('button', name='查看关系', exact=True)).to_be_disabled()
            search.fill('')
            panel.get_by_role('button', name='回到最初人物', exact=True).click()
            panel.get_by_role('button', name='收起二度联系', exact=True).click()
            panel.evaluate('(node)=>node.scrollTop=0')
            page.screenshot(path=str(OUT / f'network-{width}x{height}.png'))
            panel.locator('.relationship-graph-scroll').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT / f'graph-{width}x{height}.png'))
            bounds = panel.bounding_box()
            assert bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= width + 1
            assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= height + 1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            # Escape returns to the retained character DOM, then to the original screen.
            page.keyboard.press('Escape')
            expect(details).to_be_visible()
            expect(details.get_by_role('button', name='查看关系网', exact=True)).to_be_focused()
            page.keyboard.press('Escape')
            assert page.evaluate('(key)=>localStorage.getItem(key)', KEY) == saved
            assert not errors, errors
            assert not external, external
            print(f'PASS relationship network {width}x{height}: graph/navigation/filter/paging/empty/read-only/focus', flush=True)
            context.close()
        browser.close()


if __name__ == '__main__':
    main()
