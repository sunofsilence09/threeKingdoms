"""0.3 UI acceptance: affinity, recruitment, five deployed, reserves and combat.

Isolated browser storage; save fixtures select time/place and rare encounters.
--local verifies the portable build without Vite-only battle planning helpers.
"""
import copy
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_world_travel import saved, seed, KEY
from verify_h5 import URL, battle, click_canvas, wait_scene, win_battle

LOCAL = '--local' in sys.argv
SKIP_BATTLE = '--skip-battle' in sys.argv
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'recruitment'
OUT.mkdir(parents=True, exist_ok=True)
HELP = '帮忙 +10 · 免费 · 1日'


def close(page, kind):
    page.locator(f'.{kind} .company-header button').click()


def member(page, identity):
    return page.locator(f'[data-member="{identity}"]')


def person(page, identity):
    return page.locator(f'[data-person="{identity}"]')


def open_party(page):
    page.locator('#world-party').click()
    expect(page.locator('.party-panel')).to_be_visible()


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000})
        if LOCAL:
            context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith('data:') else route.abort())
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        base = saved(page)
        seed(page, base, 'zhuo', supplies=0)
        page.locator('#world-recruitment').click()
        for n in range(6):
            for identity in ['guan-yu', 'zhang-fei']:
                card = person(page, identity)
                if n == 0:
                    expect(card.get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
                card.get_by_role('button',name=HELP,exact=True).click()
                expect(person(page,identity).get_by_role('button',name=HELP,exact=True)).to_be_disabled()
                assert saved(page)['relationships'][identity]['affinity'] == (n+1)*10
            if n == 0:
                page.reload(wait_until='networkidle')
                assert saved(page)['relationships']['zhang-fei']['affinity'] == 10
                page.locator('#world-recruitment').click()
                expect(person(page,'zhang-fei').get_by_role('button',name=HELP,exact=True)).to_be_disabled()
        assert saved(page)['date'] == {'year':184,'month':3,'day':13}
        assert saved(page)['supplies'] == 0
        for identity in ['guan-yu', 'zhang-fei']:
            person(page,identity).get_by_role('button',name='邀请同行',exact=True).click()
            expect(person(page,identity)).to_contain_text('已同行 · 候补')
        assert saved(page)['route'] is None and len(saved(page)['deployed']) == 3
        page.screenshot(path=str(OUT/'recruitment-desktop.png'),full_page=True)
        close(page,'recruitment-panel')
        open_party(page)
        for identity in ['guan-yu','zhang-fei']:
            member(page,identity).get_by_role('button',name='上阵',exact=True).click()
        assert len(saved(page)['deployed']) == 5
        reserve_before = copy.deepcopy(saved(page)['party']['aman'])
        member(page,'aman').get_by_role('button',name='下阵',exact=True).click()
        assert saved(page)['party']['aman'] == reserve_before
        expect(member(page,'traveler').get_by_role('button',name='下阵',exact=True)).to_have_count(0)
        close(page,'party-panel')

        # A recruit whose identity also appears as an enemy must not collide.
        fixture = saved(page)
        fixture['relationships']['bandit-leader'] = {'affinity':60}
        seed(page,base,**fixture)
        page.locator('#world-recruitment').click()
        person(page,'bandit-leader').get_by_role('button',name='邀请同行',exact=True).click()
        close(page,'recruitment-panel'); open_party(page)
        member(page,'bandit-leader').get_by_role('button',name='上阵',exact=True).click()
        member(page,'aman').get_by_role('button',name='替换上阵',exact=True).click()
        page.locator('.replacement-picker').get_by_role('button',name='替换陈达',exact=True).click()
        member(page,'chen-da').get_by_role('button',name='替换上阵',exact=True).click()
        page.locator('.replacement-picker').get_by_role('button',name='替换阿满',exact=True).click()
        roster = saved(page)
        assert len(roster['deployed']) == 5 and 'aman' not in roster['deployed']
        member(page,'aman').get_by_role('button',name='详情',exact=True).click()
        expect(page.locator('.character-battle-status')).to_contain_text('候补')
        page.keyboard.press('Escape')
        page.screenshot(path=str(OUT/'party-desktop.png'),full_page=True)
        close(page,'party-panel')
        page.reload(wait_until='networkidle')
        assert saved(page)['deployed'] == roster['deployed']
        print('PASS: real 0→60 affinity, daily cooldown/reload, free invite, five slots, bench and full-slot replacement',flush=True)

        page.locator('#world-destination').select_option('nanhai')
        page.get_by_role('button',name='启程',exact=True).click()
        trip = saved(page)
        trip['journey']['event'] = {'id':0,'kind':'bandits'}
        seed(page,base,**trip)
        open_party(page)
        for button in page.get_by_role('button',name='下阵',exact=True).all():
            expect(button).to_be_disabled()
        member(page,'guan-yu').get_by_role('button',name='成长',exact=True).click()
        expect(page.get_by_role('button',name='增加武力',exact=True)).to_be_disabled()
        page.get_by_role('button',name='返回',exact=True).click()
        close(page,'party-panel')
        page.get_by_role('button',name='迎战匪徒',exact=True).click()
        if not LOCAL and not SKIP_BATTLE:
            wait_scene(page,'Battle')
            state = battle(page)
            assert len([u for u in state['units'] if u['team']=='party']) == 5
            assert len([u for u in state['units'] if u['team']=='enemy']) == 5
            ids = [u['id'] for u in state['units']]
            assert len(set(ids)) == 10 and 'enemy:bandit-leader' in ids
            page.reload(wait_until='networkidle'); wait_scene(page,'Battle')
            assert saved(page)['battleParty'] == roster['deployed']
            page.screenshot(path=str(OUT/'battle-five.png'),full_page=True)
            inspected = []
            def inspect_wounded(page,state):
                if inspected:
                    return
                unit = next((u for u in state['units'] if u['team']=='party' and 0<u['hp']<u['maxHp']),None)
                if not unit:
                    return
                click_canvas(page,222,98)
                expect(page.locator('.party-panel')).to_be_visible()
                member(page,unit['id']).get_by_role('button',name='详情',exact=True).click()
                expect(page.locator('[data-detail-stat="体力"] dd')).to_have_text(f"{unit['hp']} / {unit['maxHp']}")
                page.keyboard.press('Escape')
                for button in page.get_by_role('button',name='下阵',exact=True).all():
                    expect(button).to_be_disabled()
                page.keyboard.press('Escape')
                inspected.append(unit['id'])
            win_battle(page,on_turn=inspect_wounded)
            assert inspected, 'battle never checked real wounded party details'
            page.get_by_role('button',name='回到原行程',exact=True).click()
            expect(page.locator('#world-root')).to_be_visible()
            won = saved(page)
            assert won['journey']['path'] == trip['journey']['path'] and not won['journey'].get('event')
            assert not won.get('battleParty') and won['party']['aman'] == reserve_before
            assert all(won['party'][identity]['level'] == 2 for identity in roster['deployed'])
            page.reload(wait_until='networkidle')
            assert saved(page)['party'] == won['party']
            # Resume in a city to allocate the recruit's earned growth.
            seed(page,base,party=won['party'],deployed=won['deployed'],relationships=won['relationships'],date=won['date'])
            open_party(page)
            member(page,'guan-yu').get_by_role('button',name='成长',exact=True).click()
            page.get_by_role('button',name='增加武力',exact=True).click()
            page.get_by_role('button',name='确认分配',exact=True).click()
            assert saved(page)['party']['guan-yu']['attributes']['strength'] == 11
            close(page,'party-panel')
            print('PASS: real five-v-five win, unique bandit IDs, battle snapshot/reload, real HP details, reserve XP excluded, recruit growth',flush=True)
        else:
            page.wait_for_timeout(300)
            page.reload(wait_until='networkidle')
            assert saved(page)['battleParty'] == roster['deployed']
            click_canvas(page,350,98)
            page.get_by_role('button',name='回到原行程',exact=True).click()
            expect(page.locator('#world-root')).to_be_visible()
            assert not saved(page).get('battleParty')
            print('PASS: five-member battle load, snapshot/reload and retreat',flush=True)

        # Representative officials, leaders and civil characters, with no auto allegiance.
        for identity,city,year,month in [('cao-cao','yingchuan',184,5),('wang-yun','yingchuan',184,5),('cai-yan','chenliu',195,3),('sun-ce','wujun',195,3)]:
            seed(page,base,currentCityId=city,date={'year':year,'month':month,'day':1},relationships={**base['relationships'],identity:{'affinity':60}})
            page.locator('#world-recruitment').click()
            person(page,identity).get_by_role('button',name='邀请同行',exact=True).click()
            assert identity in saved(page)['party'] and saved(page)['route'] is None
            image=person(page,identity).locator('img')
            image.scroll_into_view_if_needed()
            expect(image).to_be_visible()
            image.evaluate('image => image.decode()')
            assert image.evaluate('image => image.naturalWidth>0')
            close(page,'recruitment-panel')
        seed(page,base,'wujun',relationships={**base['relationships'],'sun-quan':{'affinity':100}})
        page.locator('#world-recruitment').click()
        page.get_by_role('button',name='所有人物行踪',exact=True).click()
        assert page.locator('[data-person]').count() == 31
        expect(person(page,'sun-quan').get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
        print('PASS: official/leader/civil invitations, identity portraits, no forced faction, 31-person catalog and age gate',flush=True)

        all_ids=page.locator('[data-person]').evaluate_all('(cards)=>cards.map(card=>card.dataset.person)')
        close(page,'recruitment-panel')
        full_roster=copy.deepcopy(roster)
        full_roster['party']={identity:copy.deepcopy(base['party']['traveler']) for identity in all_ids}
        seed(page,base,**full_roster)
        open_party(page)
        assert page.locator('[data-member]').count()==31
        page.locator('.party-panel').get_by_role('button',name='角色成长',exact=True).click()
        assert page.locator('.training-tabs button').count()==31
        page.locator('.training-tabs button').last.click()
        page.locator('.training-detail-open').click()
        expect(page.locator('.character-details')).to_be_visible()
        page.keyboard.press('Escape');page.get_by_role('button',name='取消',exact=True).click()
        close(page,'party-panel')
        print('PASS: all 31 owned identities render in party, growth tabs and reserve details',flush=True)

        for width,height in [(844,390),(390,844)]:
            mobile=browser.new_context(viewport={'width':width,'height':height},has_touch=True)
            if LOCAL:
                mobile.route('**/*',lambda route:route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith('data:') else route.abort())
            mp=mobile.new_page();mp.on('pageerror',lambda error:errors.append(str(error)))
            mp.goto(URL,wait_until='networkidle');seed(mp,base,**full_roster)
            mp.locator('#world-party').tap()
            member(mp,'guan-yu').get_by_role('button',name='下阵',exact=True).tap()
            member(mp,'guan-yu').get_by_role('button',name='上阵',exact=True).tap()
            assert len(saved(mp)['deployed'])==5
            assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            mp.locator('.party-panel').evaluate('(panel)=>panel.scrollTop=0')
            mp.locator('.party-panel img').evaluate_all('async images=>{for(const img of images)img.loading="eager";await Promise.all(images.map(img=>img.decode()))}')
            mp.screenshot(path=str(OUT/f'party-{width}.png'))
            close(mp,'party-panel')
            mp.locator('#world-recruitment').tap()
            mp.get_by_role('button',name='所有人物行踪',exact=True).tap()
            assert mp.locator('[data-person]').count()==31
            mp.locator('.recruitment-panel').evaluate('(node)=>node.scrollTop=node.scrollHeight')
            header=mp.locator('.recruitment-panel .company-header button')
            box=header.bounding_box()
            assert box and 0<=box['y']<height and box['y']+box['height']<=height
            assert mp.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            header.tap()
            mobile.close()
        assert not errors,errors
        print('PASS: landscape/portrait touch deployment, scrolling sticky close, no overflow or browser exceptions',flush=True)
        browser.close()


if __name__=='__main__':
    main()
