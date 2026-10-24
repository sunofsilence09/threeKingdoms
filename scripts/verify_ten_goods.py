"""Ten market commodities plus conservative 0.4.0 save migration."""
import copy
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from verify_h5 import URL
from verify_trade_events import saved,seed,new_city,close_city

OUT=Path(__file__).resolve().parents[1]/'artifacts'/'ten-goods'
OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000})
    if '--local' in sys.argv:context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith(('data:','blob:')) else r.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL,wait_until='networkidle');base=saved(page)
    seed(page,new_city(base));page.locator('#enter-city').click()
    assert page.locator('[data-good]').count()==10
    page.locator('[data-good="grain"] input').fill('3')
    page.locator('[data-good="grain"]').get_by_role('button',name='买入',exact=True).click()
    original=saved(page)
    legacy=copy.deepcopy(original)
    for market in legacy['economy']['markets'].values():
        market['stock'].pop('wine',None);market['stock'].pop('leather',None)
    seed(page,legacy)
    restored=saved(page)
    for key in ['coins','cargo','profit','ledger']:assert restored['economy'][key]==original['economy'][key],key
    assert restored['economy']['markets']['beihai']['stock']['grain']==original['economy']['markets']['beihai']['stock']['grain']
    assert all(len(market['stock'])==10 for market in restored['economy']['markets'].values())
    page.locator('#enter-city').click()
    for identity in ['wine','leather']:
        card=page.locator(f'[data-good="{identity}"]')
        card.locator('input').fill('2');card.get_by_role('button',name='买入',exact=True).click()
        assert saved(page)['economy']['cargo'][identity]['quantity']==2
        card.locator('input').fill('1');card.get_by_role('button',name='卖出',exact=True).click()
        assert saved(page)['economy']['cargo'][identity]['quantity']==1
    before=saved(page);page.reload(wait_until='networkidle');assert saved(page)['economy']==before['economy']
    page.locator('#enter-city').click();page.locator('[data-good="wine"]').scroll_into_view_if_needed()
    page.screenshot(path=str(OUT/'ten-goods-desktop.png'))
    print('PASS: ten market goods, old eight-good stock migration, exact old coins/cost/stock/ledger, wine/leather UI trades and reload',flush=True)
    for width,height in [(844,390),(390,844)]:
        page.set_viewport_size({'width':width,'height':height});seed(page,new_city(base,'changsha'))
        page.locator('#enter-city').click();assert page.locator('[data-good]').count()==10
        page.locator('[data-good="wine"] input').fill('1')
        page.locator('[data-good="wine"]').get_by_role('button',name='买入',exact=True).click()
        assert saved(page)['economy']['cargo']['wine']['quantity']==1
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        page.locator('[data-good="leather"]').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'ten-goods-{width}.png'))
        close_city(page)
    assert not errors,errors
    print('PASS: landscape/portrait ten-good market controls and no runtime errors'+(' offline' if '--local' in sys.argv else ''),flush=True)
    browser.close()
