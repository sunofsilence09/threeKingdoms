"""0.4 real UI acceptance; --local runs offline production without Vite battle planner."""
import copy
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from verify_h5 import URL,click_canvas,wait_scene,battle,win_battle

LOCAL='--local' in sys.argv
SKIP_BATTLE=LOCAL or '--skip-battle' in sys.argv
KEY='three-kingdoms-demo-state'
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'trade-events'
OUT.mkdir(parents=True,exist_ok=True)
def saved(page):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def seed(page,state):
    page.evaluate('({key,state})=>localStorage.setItem(key,JSON.stringify(state))',{'key':KEY,'state':state})
    page.reload(wait_until='networkidle')
    expect(page.locator('#world-root')).to_be_visible()
def new_city(base,city='beihai',year=184,month=3):
    s=copy.deepcopy(base)
    s.update(phase='overworld',currentCityId=city,originId='beihai',date={'year':year,'month':month,'day':1})
    for key in ['journey','encounter','battleParty','travelNotice']:s.pop(key,None)
    return s
def close_city(page):page.get_by_role('button',name='出城 · 返回地图',exact=True).click()
def cg(page):
    panel=page.locator('.event-cg')
    expect(panel).to_be_visible()
    panel.locator('img').evaluate('(img)=>img.decode()')
    assert page.locator('.world-travel-event button').count()==0
    page.get_by_role('button',name='继续 · 处理见闻',exact=True).click()
    expect(panel).to_have_count(0)
    assert page.evaluate("!!document.activeElement.closest('.world-travel-event')"),'CG close should focus the event choices'
def safe_event(page,kind):
    names={'rain':'等候2日','ferry':'等候2日','bandits':'绕路3日','wolves':'避开狼群','refugees':'留下祝愿','merchant':'辞别商旅','contact':'暂不拜访','market-news':'记下行情'}
    page.locator('.world-travel-event button').filter(has_text=names[kind]).click()
def travel_to(page,destination):
    page.locator('#world-destination').select_option(destination)
    page.locator('#start-travel').click()

def main():
    errors=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        ctx=browser.new_context(viewport={'width':1440,'height':1000})
        if LOCAL:ctx.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith(('data:','blob:')) else r.abort())
        page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(URL,wait_until='networkidle');base=saved(page)
        origin=new_city(base)
        seed(page,origin)
        page.locator('#enter-city').click();expect(page.locator('.city-panel')).to_be_visible()
        card=page.locator('[data-good="salt"]')
        before=saved(page)
        card.locator('input').fill('0');card.get_by_role('button',name='买入',exact=True).click()
        assert saved(page)==before
        expect(page.locator('.trade-feedback')).to_contain_text('整数')
        card.locator('input').fill('10');card.get_by_role('button',name='买入',exact=True).click()
        bought=saved(page);cost=600-bought['economy']['coins']
        assert bought['economy']['cargo']['salt']['quantity']==10 and cost>0
        assert bought['economy']['ledger'][-1]['amount']==cost
        stock=bought['economy']['markets']['beihai']['stock']['salt']
        page.reload(wait_until='networkidle');page.locator('#enter-city').click()
        expect(page.locator('[data-good="salt"]')).to_contain_text(f'市集库存 {stock}')
        page.locator('.city-panel').get_by_role('button',name='寻访人物',exact=True).click();expect(page.locator('.recruitment-panel')).to_be_visible()
        page.keyboard.press('Escape');expect(page.locator('.city-panel')).to_be_visible()
        page.locator('.city-banner').evaluate('(img)=>img.decode()')
        page.screenshot(path=str(OUT/'city-market-desktop.png'))
        close_city(page);travel_to(page,'taiyuan')
        trip=saved(page)
        # A quiet deterministic first seven days tests the actual numerical control.
        def quiet(seed_value):
            for _ in range(7):
                seed_value=(seed_value*1664525+1013904223)&0xffffffff
                if seed_value/4294967296<.2:return False
            return True
        trip['journey']['seed']=next(n for n in range(10000) if quiet(n))
        seed(page,trip)
        for value in ['0','31','1.5','']:
            before=saved(page);page.locator('#travel-days').fill(value);page.locator('#continue-travel').click();assert saved(page)==before
            expect(page.locator('.travel-validation')).to_contain_text('整数')
        page.locator('#travel-days').fill('7');page.locator('#continue-travel').click()
        assert saved(page)['journey']['elapsed']==7 and saved(page)['travelDays']==7
        seen=set()
        for _ in range(160):
            s=saved(page)
            if not s.get('journey'):break
            event=s['journey'].get('event')
            if event:
                seen.add(event['kind'])
                if not event.get('cgSeen'):cg(page)
                safe_event(page,event['kind'])
            else:
                page.locator('#travel-days').fill('30');page.locator('#continue-travel').click()
        else:raise AssertionError('trade journey did not reach destination')
        assert saved(page)['currentCityId']=='taiyuan'
        page.locator('#enter-city').click()
        page.get_by_role('button',name='行囊与账本',exact=True).click()
        page.locator('[data-good="salt"] input').fill('10')
        page.locator('[data-good="salt"]').get_by_role('button',name='卖出',exact=True).click()
        sold=saved(page)
        assert not sold['economy']['cargo'].get('salt') and sold['economy']['coins']>600
        assert sold['economy']['profit']==sold['economy']['coins']-600
        assert len(sold['economy']['ledger'])==2
        page.screenshot(path=str(OUT/'trade-profit-ledger.png'))
        page.reload(wait_until='networkidle');assert saved(page)['economy']==sold['economy']
        print(f'PASS: actual buy→custom travel→CG encounters→arrival→profitable sale, persisted stock/cost/ledger; events={sorted(seen)}',flush=True)

        # Stage persistence and a real price shock are saved before the player opens the CG.
        news_state=new_city(base)
        seed(page,news_state);travel_to(page,'taiyuan');fixture=saved(page)
        day=60
        message={'id':'qa-news','cityId':'beihai','goodId':'salt','change':.2,'fromDay':day,'untilDay':day+30,'reason':'盐商收货，市价走高。'}
        fixture['economy']['news']=[message]
        fixture['journey']['event']={'id':0,'kind':'market-news','cgSeen':False,'news':message}
        seed(page,fixture)
        expect(page.locator('.event-cg')).to_contain_text('20%')
        original=saved(page);page.reload(wait_until='networkidle');assert saved(page)==original
        page.screenshot(path=str(OUT/'event-cg-news.png'))
        cg(page);confirmed=saved(page);assert confirmed['journey']['event']['cgSeen']
        page.reload(wait_until='networkidle');expect(page.locator('.event-cg')).to_have_count(0)
        assert saved(page)['economy']['news']==[message]
        safe_event(page,'market-news')
        # Inspect the affected city's current price and the same period after expiry.
        fixture=new_city(base);fixture['economy']['news']=[message]
        seed(page,fixture);page.locator('#enter-city').click()
        expect(page.locator('.trade-news')).to_contain_text('生效中')
        quoted=page.locator('[data-good="salt"] p').first.inner_text()
        no_news=copy.deepcopy(fixture);no_news['economy']['news']=[]
        seed(page,no_news);page.locator('#enter-city').click()
        assert quoted!=page.locator('[data-good="salt"] p').first.inner_text()
        expired=copy.deepcopy(fixture);expired['date']={'year':184,'month':4,'day':1}
        seed(page,expired);page.locator('#enter-city').click();expect(page.locator('.trade-news')).to_contain_text('已过期')
        print('PASS: CG-first stages/reload/focus, market news affects actual quotes once and expires',flush=True)

        for kind,city,destination in [('merchant','beihai','taiyuan'),('refugees','beihai','taiyuan'),('ferry','jiangling','changsha'),('contact','yingchuan','nanyang')]:
            seed(page,new_city(base,city));travel_to(page,destination);illustrated=saved(page)
            event={'id':0,'kind':kind,'cgSeen':False}
            if kind=='contact':event['contact']='cao'
            illustrated['journey']['event']=event;seed(page,illustrated)
            cg(page);safe_event(page,kind)
            assert not saved(page)['journey'].get('event')
        print('PASS: merchant/refugee/ferry/contact illustrations are bound to complete event choices',flush=True)

        # Actual five-person encounter; an extra owned member remains in reserve.
        wolves=new_city(base)
        for identity in ['guan-yu','zhang-fei','bandit-leader']:
            wolves['party'][identity]=copy.deepcopy(base['party']['traveler'])
            wolves['relationships'][identity]={'affinity':60}
        wolves['deployed']=['traveler','aman','chen-da','guan-yu','zhang-fei']
        reserve=copy.deepcopy(wolves['party']['bandit-leader'])
        seed(page,wolves);travel_to(page,'taiyuan');wolves=saved(page)
        wolves['journey']['event']={'id':0,'kind':'wolves','cgSeen':False}
        seed(page,wolves);page.screenshot(path=str(OUT/'event-cg-wolves.png'));cg(page)
        page.get_by_role('button',name='迎战狼群',exact=True).click()
        if not LOCAL:
            wait_scene(page,'Battle')
            assert [u['weapon'] for u in battle(page)['units'] if u['team']=='enemy']==['claws']*5
            page.reload(wait_until='networkidle');wait_scene(page,'Battle')
        else:page.reload(wait_until='networkidle')
        assert saved(page)['journey']['event']['kind']=='wolves' and saved(page)['battleParty']==wolves['deployed']
        click_canvas(page,804,98)
        expect(page.locator('.character-details')).to_contain_text('头狼')
        expect(page.locator('[data-detail-stat="武器"] dd')).to_have_text('爪牙')
        page.locator('.character-art img').evaluate('(img)=>img.decode()');page.keyboard.press('Escape')
        page.screenshot(path=str(OUT/'wolves-battle-five.png'))
        if SKIP_BATTLE:click_canvas(page,350,98)
        else:win_battle(page)
        page.get_by_role('button',name='回到原行程',exact=True).click()
        after=saved(page)
        assert after['journey']['path']==wolves['journey']['path'] and not after['journey'].get('event')
        assert after['party']['bandit-leader']==reserve
        if not SKIP_BATTLE:
            assert after['economy']['coins']==620 and all(after['party'][identity]['level']==2 for identity in wolves['deployed'])
        else:assert after['economy']['coins']==600
        page.reload(wait_until='networkidle');assert saved(page)['economy']==after['economy']
        print('PASS: five-person wolf encounter, real animal model/details, saved battle identity, once-only rewards and reserve exclusion',flush=True)

        for identity,city,year in [('sun-jian','yingchuan',184),('sun-ce','wujun',195),('zhuge-liang','xiangyang',207),('zhou-yu','wujun',200)]:
            s=new_city(base,city,year);s['relationships'][identity]={'affinity':60}
            seed(page,s);page.locator('#world-recruitment').click()
            card=page.locator(f'[data-person="{identity}"]');card.get_by_role('button',name='邀请同行',exact=True).click()
            card.get_by_role('button',name='查看详情',exact=True).click()
            image=page.locator('.character-art img');image.evaluate('(img)=>img.decode()')
            assert identity+'-v1.png' in image.get_attribute('src')
            assert identity in saved(page)['party'] and saved(page)['route'] is None
        print('PASS: four formal historical portraits and complete recruitment/details integration',flush=True)

        for width,height in [(844,390),(390,844)]:
            mobile=browser.new_context(viewport={'width':width,'height':height},has_touch=True)
            if LOCAL:mobile.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith(('data:','blob:')) else r.abort())
            mp=mobile.new_page();mp.on('pageerror',lambda error:errors.append(str(error)))
            mp.goto(URL,wait_until='networkidle');seed(mp,new_city(base))
            mp.locator('#enter-city').tap();mp.locator('.city-banner').evaluate('(img)=>img.decode()')
            mp.locator('[data-good="grain"] input').fill('5');mp.locator('[data-good="grain"]').get_by_role('button',name='买入',exact=True).tap()
            assert saved(mp)['economy']['cargo']['grain']['quantity']==5
            assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            mp.locator('.city-panel').evaluate('(panel)=>panel.scrollTop=0');mp.screenshot(path=str(OUT/f'city-{width}.png'))
            close_city(mp);travel_to(mp,'taiyuan')
            f=saved(mp);f['journey']['event']={'id':0,'kind':'rain','cgSeen':False};seed(mp,f)
            mp.locator('.event-cg-image').evaluate('(img)=>img.decode()')
            assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            mp.screenshot(path=str(OUT/f'cg-{width}.png'));cg(mp);safe_event(mp,'rain')
            mp.locator('#travel-days').fill('15');mp.locator('#continue-travel').tap()
            assert saved(mp)['travelDays']==15
            mobile.close()
        assert not errors,errors
        print('PASS: landscape/portrait trading, CG, numeric touch travel, focus, no overflow or runtime errors'+(' offline' if LOCAL else ''),flush=True)
        browser.close()

if __name__=='__main__':main()
