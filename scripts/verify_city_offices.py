"""Historical fallback UI regression: goods, offices, affinity and new fighters.

The strategic clock is explicitly paused for these fixed career scenarios;
verify_dynamic_conquest.py covers current dynamic ownership and personnel.
"""
import copy
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from verify_h5 import URL,click_canvas,wait_scene,battle,win_battle
from verify_trade_events import saved,seed,new_city as base_city,travel_to,cg,safe_event,close_city

LOCAL='--local' in sys.argv
SKIP_BATTLE=LOCAL or '--skip-battle' in sys.argv
ART='--no-art' not in sys.argv
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'city-offices'
OUT.mkdir(parents=True,exist_ok=True)

def new_city(*args,**kwargs):
    state=base_city(*args,**kwargs)
    state.pop('worldConflict',None);state.pop('conflictMigration',None)
    state['conflictRecovery']=True
    return state
def office(page):
    page.locator('#enter-city').click();page.get_by_role('button',name='府署名册',exact=True).click()
def talk(page,identity):page.locator(f'#office-talk-{identity}').click()
def close_recruitment(page):page.locator('.recruitment-panel .company-header button').click()
def picture(locator):
    if ART:locator.evaluate('(img)=>img.decode()')
def arrive(page):
    for _ in range(100):
        state=saved(page)
        if not state.get('journey'):return
        event=state['journey'].get('event')
        if event:
            if not event.get('cgSeen'):cg(page)
            safe_event(page,event['kind'])
        else:page.locator('#travel-days').fill('30');page.locator('#continue-travel').click()
    raise AssertionError('arrival did not finish')

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context(viewport={'width':1440,'height':1000})
        if LOCAL:context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith(('data:','blob:')) else r.abort())
        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(URL,wait_until='networkidle');base=saved(page)
        s=new_city(base,'runan',193)
        for key in ['shouchun','xiapi']:s['economy']['markets'].pop(key,None)
        seed(page,s);assert page.locator('[data-city-id]').count()==36
        page.locator('#enter-city').click();assert page.locator('[data-good]').count()==10
        images=page.locator('.trade-good-image')
        assert len(set(images.evaluate_all('(images)=>images.map(image=>image.src)')))==10
        if ART:images.evaluate_all('async images=>{for(const img of images)img.loading="eager";await Promise.all(images.map(img=>img.decode()))}')
        page.screenshot(path=str(OUT/'goods-desktop.png'))
        page.locator('[data-good="wine"] input').fill('2');page.locator('[data-good="wine"]').get_by_role('button',name='买入',exact=True).click()
        page.get_by_role('button',name='行囊与账本',exact=True).click();expect(page.locator('[data-good="wine"] .trade-good-image')).to_be_visible()
        picture(page.locator('[data-good="wine"] .trade-good-image'))
        close_city(page);before=saved(page);page.reload(wait_until='networkidle');assert saved(page)['economy']==before['economy']
        travel_to(page,'shouchun');arrive(page);assert saved(page)['currentCityId']=='shouchun'
        office(page)
        expect(page.locator('[data-staff="yuan-shu"]')).to_contain_text('邀请门槛 60')
        expect(page.locator('[data-staff="yuan-shu"]')).to_have_attribute('data-service-kind','governing')
        assert page.locator('[data-staff="chen-gong"]').count()==0
        print('PASS: ten illustrated commodity bindings, shared cargo art, preserved 34-city economy, real travel to Shouchun and ruler identity',flush=True)

        # Server-side 79 refusal has unit coverage; the same condition must hold in the real UI.
        state=new_city(base,'dongjun',193);state['relationships']['chen-gong']={'affinity':79}
        seed(page,state);office(page);talk(page,'chen-gong')
        card=page.locator('[data-person="chen-gong"]')
        expect(card).to_contain_text('邀请门槛 80');expect(card.get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
        assert page.evaluate("document.activeElement.closest('[data-person]')?.dataset.person")=='chen-gong'
        close_recruitment(page)
        assert page.locator('#office-talk-chen-gong').evaluate('(button)=>button===document.activeElement')
        state['relationships']['chen-gong']={'affinity':60};seed(page,state);office(page);talk(page,'chen-gong')
        expect(page.locator('[data-person="chen-gong"]').get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
        page.locator('[data-person="chen-gong"]').get_by_role('button',name='帮忙 +10 · 免费 · 1日',exact=True).click()
        assert saved(page)['relationships']['chen-gong']['affinity']==70
        close_recruitment(page);close_city(page)
        page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True).click()
        office(page);talk(page,'chen-gong')
        page.locator('[data-person="chen-gong"]').get_by_role('button',name='帮忙 +10 · 免费 · 1日',exact=True).click()
        page.locator('[data-person="chen-gong"]').get_by_role('button',name='邀请同行',exact=True).click()
        assert saved(page)['relationships']['chen-gong']['affinity']==80
        assert 'chen-gong' in saved(page)['party'] and 'chen-gong' not in saved(page)['deployed']
        close_recruitment(page);expect(page.locator('[data-staff="chen-gong"]')).to_have_count(0)
        page.reload(wait_until='networkidle');office(page);expect(page.locator('[data-staff="chen-gong"]')).to_have_count(0)
        print('PASS: 60/79 cannot invite employed Chen Gong, real help60→70→80, invite removes office assignment, nested focus and reload stay consistent',flush=True)

        for identity,city,year,kind,owner in [('yuan-shu','shouchun',193,'governing',None),('zhang-miao','chenliu',193,'governing',None),('chen-gong','xiapi',197,'employed','吕布'),('gao-shun','xiapi',197,'employed','吕布'),('zhou-tai','wujun',198,'employed','孙策'),('han-dang','changsha',188,'employed','孙坚')]:
            state=new_city(base,city,year);state['relationships'][identity]={'affinity':80 if kind=='employed' else 60}
            seed(page,state);office(page)
            card=page.locator(f'[data-staff="{identity}"]');expect(card).to_have_attribute('data-service-kind',kind)
            if owner:expect(card).to_contain_text(owner)
            page.locator(f'#office-details-{identity}').click()
            expect(page.locator('.character-service')).to_contain_text('邀请门槛')
            picture(page.locator('.character-art img'))
            assert identity+'-v1.png' in page.locator('.character-art img').get_attribute('src')
            page.keyboard.press('Escape');talk(page,identity)
            page.locator(f'[data-person="{identity}"]').get_by_role('button',name='邀请同行',exact=True).click()
            assert identity in saved(page)['party'] and saved(page)['route'] is None
            close_recruitment(page);expect(page.locator(f'[data-staff="{identity}"]')).to_have_count(0)
        state=new_city(base,'xiapi',197);state['party']['lu-bu']=copy.deepcopy(base['party']['traveler']);state['relationships']['gao-shun']={'affinity':60}
        seed(page,state);office(page)
        expect(page.locator('[data-staff="gao-shun"]')).to_have_attribute('data-service-kind','waiting')
        expect(page.locator('[data-staff="gao-shun"]')).to_contain_text('邀请门槛 60')
        assert '吕布军府' not in page.locator('.city-office-roster').inner_text()
        talk(page,'gao-shun');page.locator('[data-person="gao-shun"]').get_by_role('button',name='邀请同行',exact=True).click()
        state=new_city(base,'wujun',200);seed(page,state);office(page);expect(page.locator('[data-staff="zhou-tai"]')).to_have_count(0)
        state=new_city(base,'danyang',200);seed(page,state);office(page);expect(page.locator('[data-staff="zhou-tai"]')).to_contain_text('孙权')
        page.screenshot(path=str(OUT/'office-desktop.png'))
        close_city(page);page.locator('#world-recruitment').click();page.get_by_role('button',name='所有人物行踪',exact=True).click();assert page.locator('[data-person]').count()==124
        print('PASS: all six city portraits, true ruler/employer roles, no duplicate city roster, hired emperor absence, employer joins→waiting60, calendar move and 124 identities',flush=True)

        # Five new/old fighters use actual equipment; other owned people remain in reserve.
        state=new_city(base,'runan',197)
        for identity in ['yuan-shu','chen-gong','zhang-miao','gao-shun','zhou-tai','han-dang']:
            state['party'][identity]=copy.deepcopy(base['party']['traveler']);state['relationships'][identity]={'affinity':80}
        state['deployed']=['traveler','chen-gong','gao-shun','zhou-tai','han-dang']
        reserve=copy.deepcopy(state['party']['yuan-shu'])
        seed(page,state);travel_to(page,'shouchun');fixture=saved(page);fixture['journey']['event']={'id':0,'kind':'bandits','cgSeen':True};seed(page,fixture)
        page.get_by_role('button',name='迎战匪徒',exact=True).click()
        if not LOCAL:
            wait_scene(page,'Battle');units=[u for u in battle(page)['units'] if u['team']=='party']
            assert [u['weapon'] for u in units]==['cleaver','scroll','swordshield','glaive','bow']
            page.reload(wait_until='networkidle');wait_scene(page,'Battle')
        else:page.reload(wait_until='networkidle')
        assert saved(page)['battleParty']==state['deployed']
        page.screenshot(path=str(OUT/'new-people-battle.png'))
        if SKIP_BATTLE:click_canvas(page,350,98)
        else:win_battle(page)
        page.get_by_role('button',name='回到原行程',exact=True).click()
        settled=saved(page);assert settled['party']['yuan-shu']==reserve
        if not SKIP_BATTLE:assert all(settled['party'][identity]['level']==2 for identity in state['deployed'])
        print('PASS: five-person new-character battle, distinct equipment, same saved lineup and reserve exclusion'+(' (retreat smoke)' if SKIP_BATTLE else ' (actual victory)'),flush=True)

        # Assets are local and both goods and city offices remain operable on small screens.
        for width,height in [(844,390),(390,844)]:
            page.set_viewport_size({'width':width,'height':height});seed(page,new_city(base,'xiapi',197));office(page)
            card=page.locator('[data-staff="gao-shun"]');card.scroll_into_view_if_needed();picture(card.locator('img'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            page.screenshot(path=str(OUT/f'office-{width}.png'))
            talk(page,'gao-shun');expect(page.locator('[data-person="gao-shun"]')).to_contain_text('邀请门槛 80');close_recruitment(page)
            page.get_by_role('button',name='市集买卖',exact=True).click()
            if ART:page.locator('.trade-good-image').evaluate_all('async images=>{for(const img of images)img.loading="eager";await Promise.all(images.map(img=>img.decode()))}')
            page.locator('.city-panel').evaluate('(panel)=>panel.scrollTop=0');page.screenshot(path=str(OUT/f'goods-{width}.png'))
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            close_city(page)
        # Force one illustration failure, checking the new image never blocks the buy button.
        page.route('**/goods/tea-v1.png',lambda route:route.abort());seed(page,new_city(base));page.locator('#enter-city').click()
        expect(page.locator('[data-good="tea"] .trade-good-image')).not_to_be_visible()
        page.locator('[data-good="tea"]').get_by_role('button',name='买入',exact=True).click();assert saved(page)['economy']['cargo']['tea']['quantity']==1
        assert not errors,errors
        print('PASS: phone layouts/office focus, goods fallback, no overflow or page exceptions'+(' offline' if LOCAL else '')+(' (art skipped)' if not ART else ''),flush=True)
        browser.close()

if __name__=='__main__':main()
