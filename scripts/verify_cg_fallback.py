"""A failed local illustration must yield a readable, operable event."""
from playwright.sync_api import sync_playwright,expect
from verify_h5 import URL
from verify_trade_events import saved,seed,new_city,travel_to,cg

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':390,'height':844})
    page.goto(URL,wait_until='networkidle');base=saved(page)
    seed(page,new_city(base));travel_to(page,'taiyuan');state=saved(page)
    state['journey']['event']={'id':0,'kind':'rain','cgSeen':False}
    page.route('**/event-rain-v1.png',lambda route:route.abort())
    seed(page,state)
    expect(page.locator('.event-cg')).to_contain_text('插画暂未加载')
    expect(page.locator('.event-cg-image')).not_to_be_visible()
    page.get_by_role('button',name='继续 · 处理见闻',exact=True).click()
    expect(page.get_by_role('button',name='等候2日 · 无需军需',exact=True)).to_be_visible()
    assert saved(page)['journey']['event']['cgSeen']
    print('PASS: failed CG hides broken image and keeps text, confirmation and event choices usable')
    browser.close()
