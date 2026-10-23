"""Check every starting region and long regional labels in the playable UI."""
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, click_canvas, wait_scene, assert_text_bounds
from verify_timeline import OUT, seed, saved


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 820})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        origins = page.evaluate("async () => (await import('/src/game/history.ts')).ORIGINS")
        assert len(origins) == 16
        assert {o['provinceId'] for o in origins} == {'sili','yu','yan','xu','qing','ji','you','bing','liang','yi','jing','yang','jiao'}
        for origin in origins:
            seed(page, origin['id'])
            wait_scene(page, 'Prologue')
            expect(page.locator('.panel-eyebrow')).to_contain_text(origin['name'])
            expect(page.locator('.panel-body')).to_contain_text(origin['detail'])
            assert saved(page)['route'] is None
            page.get_by_role('button', name='踏上逃难路').click()
            wait_scene(page, 'Overworld')
            assert_text_bounds(page)
            page.reload(wait_until='networkidle')
            wait_scene(page, 'Overworld')
            assert saved(page)['originId'] == origin['id']
            click_canvas(page, 245, 295)
            expect(page.locator('.panel-eyebrow')).to_have_text(origin['road'])
            if origin['id'] in ['wujun','changsha','nanhai']:
                page.get_by_role('button', name='稍后再来').click()
                page.screenshot(path=str(OUT / f"origin-{origin['id']}-desktop.png"))
        print('PASS: 13 regions / 16 origins, local prologue and encounter, save persistence', flush=True)
        for width, height in [(844,390),(390,844)]:
            page.set_viewport_size({'width':width,'height':height})
            for id in ['wujun','changsha','nanhai']:
                seed(page, id)
                page.get_by_role('button', name='踏上逃难路').click()
                wait_scene(page, 'Overworld')
                assert_text_bounds(page)
                page.screenshot(path=str(OUT / f'origin-{id}-{width}.png'))
        # Adding origins must not change the pre-200 encounter unlock rules.
        for id in ['yingchuan','nanyang','zhuo']:
            seed(page, id, {'phase':'overworld'})
            wait_scene(page, 'Overworld')
            click_canvas(page, 790, 160)
            page.get_by_role('button', name='记下这份交情').click()
            wait_scene(page, 'RouteChoice')
            assert page.locator('.route-card:not(:disabled)').count() == 1
        assert not errors, errors
        print('PASS: mobile layouts, long labels, legacy encounter unlocks; no page errors', flush=True)
        browser.close()


if __name__ == '__main__':
    main()
