"""Initial menu bounds plus real wallet continuation, on dev or the offline package."""
import json
from urllib.parse import urlsplit
from verify_generations import URL,OFFLINE,OUT,FIXTURES,KEY,activate,saved,put,reload_continue,assert_menu_bounds
from playwright.sync_api import sync_playwright,expect

def main():
    results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        fixture=json.loads(FIXTURES.read_text(encoding='utf-8'))
        for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
            external=[];errors=[]
            if OFFLINE:
                origin=urlsplit(URL)
                def local_only(route):
                    target=urlsplit(route.request.url)
                    if target.scheme in ['data','blob'] or target.scheme==origin.scheme and target.netloc==origin.netloc:route.continue_()
                    else:external.append(route.request.url);route.abort()
                context.route('**/*',local_only)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(URL,wait_until='networkidle')
            menu=page.locator('.start-menu');expect(menu).to_be_visible();expect(menu.get_by_role('button',name='继续游戏',exact=True)).to_be_disabled()
            bounds=assert_menu_bounds(page)
            page.screenshot(path=str(OUT/f'start-menu-final-{width}x{height}.png'))
            activate(menu.get_by_role('button',name='重新开始',exact=True),touch);expect(page.locator('#hero-name')).to_have_value('')
            put(page,fixture['battle'],touch)
            activate(page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True),touch)
            before=saved(page);assert before['economy']['coins']==620
            page.reload(wait_until='networkidle');expect(page.locator('.start-menu')).to_be_visible()
            continued_bounds=assert_menu_bounds(page)
            page.screenshot(path=str(OUT/f'continue-menu-final-{width}x{height}.png'))
            activate(page.locator('.start-menu').get_by_role('button',name='继续游戏',exact=True),touch)
            expect(page.locator('#world-root')).to_be_visible();after=saved(page)
            assert before['economy']==after['economy'] and before['party']==after['party'] and before['date']==after['date']
            page.reload(wait_until='networkidle');expect(page.locator('.start-menu')).to_be_visible()
            activate(page.locator('.start-menu').get_by_role('button',name='重新开始',exact=True),touch)
            expect(page.locator('#hero-name')).to_have_value('')
            assert saved(page)['phase']=='prologue' and saved(page)['economy']['coins']==600
            assert not external and not errors,{'external':external,'errors':errors}
            results.append({'viewport':[width,height],'offline':OFFLINE,'freshBounds':bounds,'continueBounds':continued_bounds,'wallet620Preserved':True,'restartClearsName':True,'errors':errors})
            print(f'PASS menu {width}x{height}: both buttons visible without scrolling; continue kept620; restart cleared name',flush=True)
            context.close()
        browser.close()
    (OUT/'start-menu-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':main()
