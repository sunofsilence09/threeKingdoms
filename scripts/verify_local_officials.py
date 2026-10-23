"""Black-box portrait and sourced-office checks through the map entry."""
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, click_canvas, wait_scene
from verify_timeline import seed

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'local-officials'
OUT.mkdir(parents=True, exist_ok=True)
PEOPLE = {'wang-yun':'王允','xu-qiu':'徐璆','guo-xun':'郭勋','jia-cong':'贾琮','guo-dian':'郭典','zhao-qian':'赵谦','chu-gong':'褚贡','qin-jie':'秦颉'}


def open_panel(page):
    click_canvas(page, 560, 143)
    panel = page.get_by_role('dialog', name='地方官员', exact=True)
    expect(panel).to_be_visible()
    return panel


def main():
    for id in PEOPLE:
        im = Image.open(ROOT / 'public/assets/characters' / f'{id}-v1.png')
        assert im.mode == 'RGBA' and im.height >= 1500
        alpha = im.getchannel('A')
        assert alpha.getextrema()[0] == 0
        box = alpha.point(lambda x: 255 if x > 128 else 0).getbbox()
        assert box[0] > 0 and box[1] > 0 and box[2] < im.width and box[3] < im.height, (id,box)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        errors = []
        for width, height in [(1280,820),(844,390),(390,844)]:
            page = browser.new_page(viewport={'width':width,'height':height})
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL, wait_until='networkidle')
            seed(page, 'nanyang', {'phase':'overworld','date':{'year':184,'month':3}})
            wait_scene(page, 'Overworld')
            before = page.evaluate("localStorage.getItem('three-kingdoms-demo-state')")
            panel = open_panel(page)
            expect(panel.locator('[data-office-level="province"] [data-official]')).to_have_count(0)
            expect(panel.locator('[data-office-level="prefecture"] [data-official]')).to_have_count(1)
            expect(panel.locator('.official-info h2')).to_have_text('褚贡')
            expect(panel.locator('.official-status')).to_contain_text('本月遇害')
            panel.get_by_role('button', name='八人立绘', exact=True).click()
            for id, name in PEOPLE.items():
                panel.locator(f'[data-official="{id}"]').click()
                expect(panel.locator('.official-info h2')).to_have_text(name)
                image = panel.locator('.official-art img')
                expect(image).to_have_attribute('alt', f'{name}全身立绘')
                page.wait_for_function("() => {const i=document.querySelector('.official-art img'); return i.complete && i.naturalHeight>=1500;}")
                assert image.evaluate("i=>getComputedStyle(i).objectFit") == 'contain'
                assert panel.locator('.official-source').get_attribute('href').startswith('https://')
                assert page.evaluate("localStorage.getItem('three-kingdoms-demo-state')") == before
                if id in ['wang-yun','jia-cong','qin-jie']:
                    image.scroll_into_view_if_needed()
                    page.screenshot(path=str(OUT / f'{id}-{width}.png'))
            page.keyboard.press('Escape')
            expect(panel).to_have_count(0)
            assert not page.locator('#game-container').evaluate('e=>e.inert')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            # The next inspection must reopen safely without mutating the save.
            panel = open_panel(page)
            panel.get_by_role('button', name='关闭', exact=True).click()
            assert page.evaluate("localStorage.getItem('three-kingdoms-demo-state')") == before
            page.close()
            print(f'PASS: all 8 portraits, inspection lifecycle and unchanged save at {width}x{height}', flush=True)
        page = browser.new_page(viewport={'width':1280,'height':820})
        page.goto(URL, wait_until='networkidle')
        for origin, month, names in [('nanhai',3,[]),('nanhai',6,['贾琮']),('nanyang',6,['徐璆','秦颉','褚贡']),('runan',4,['王允','赵谦']),('wujun',3,[])]:
            seed(page, origin, {'phase':'overworld','date':{'year':184,'month':month}})
            wait_scene(page, 'Overworld')
            panel = open_panel(page)
            displayed = panel.locator('.official-register [data-official] strong').all_text_contents()
            assert displayed == names, (origin, month, displayed)
            if not names:
                expect(panel.locator('.official-empty')).to_be_visible()
            page.keyboard.press('Escape')
        assert not errors, errors
        browser.close()
        print('PASS: dated office records, vacancies, transparency and no page errors', flush=True)


if __name__ == '__main__':
    main()
