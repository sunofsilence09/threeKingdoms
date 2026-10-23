"""0.2 real UI smoke: world routes, event persistence, arrival and responsive controls.

H5_URL may target Vite or the portable production server. --local omits only
the full battle driver that reads Vite's combat rules to plan pointer inputs.
"""
import copy
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import click_canvas, wait_scene, win_battle

URL = os.environ.get('H5_URL', 'http://127.0.0.1:5173')
LOCAL = '--local' in sys.argv
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'world-travel'
OUT.mkdir(parents=True, exist_ok=True)
KEY = 'three-kingdoms-demo-state'


def saved(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', KEY)


def seed(page, base, origin='yingchuan', **patch):
    state = copy.deepcopy(base)
    for key in ['journey', 'encounter', 'travelNotice']:
        state.pop(key, None)
    state.update(phase='overworld', date={'year': 184, 'month': 3, 'day': 1},
                 originId=origin, currentCityId=origin, route=None, travelCount=0,
                 flags={}, supplies=3, morale=2)
    state.update(patch)
    page.evaluate('({key,state}) => localStorage.setItem(key,JSON.stringify(state))', {'key': KEY, 'state': state})
    page.reload(wait_until='networkidle')
    expect(page.locator('#world-root')).to_be_visible()


def ordinal(date):
    return date['year'] * 360 + (date['month'] - 1) * 30 + date.get('day', 1)


def choose_safe(page, kind):
    name = {'rain': '等候2日', 'ferry': '等候2日', 'bandits': '绕路3日',
            'refugees': '陪伴3日', 'merchant': '帮工1日', 'contact': '拜访1日'}[kind]
    page.locator('.world-travel-event button').filter(has_text=name).click()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        # The packaged game must run without remote resources.
        if LOCAL:
            context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith('data:') else route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        base = saved(page)
        page.get_by_role('button', name='踏上逃难路').click()
        expect(page.locator('#world-root')).to_be_visible()
        assert page.locator('[data-city-id]').count() == 34
        assert page.locator('.route-card').count() == 0
        seed(page, base)
        assert page.locator('#world-destination optgroup').count() == 13
        page.locator('[data-city-id="nanhai"]').click()
        expect(page.locator('#world-destination')).to_have_value('nanhai')
        assert len(page.locator('.world-map-route').all()) >= 3
        page.screenshot(path=str(OUT / 'world-map-desktop.png'), full_page=True)
        start_date = saved(page)['date']
        page.get_by_role('button', name='启程', exact=True).click()
        route = saved(page)['journey']['path']
        assert len(route) > 3 and route[-1] == 'nanhai'
        assert saved(page)['currentCityId'] == 'yingchuan'
        assert page.get_by_role('button', name='地方官员', exact=True).is_disabled()
        seen_events = set()
        checked_reload = False
        for step in range(350):
            state = saved(page)
            if not state.get('journey'):
                break
            event = state['journey'].get('event')
            if event:
                seen_events.add(event['kind'])
                if not checked_reload:
                    before = state['journey']
                    page.screenshot(path=str(OUT / 'road-event.png'), full_page=True)
                    page.reload(wait_until='networkidle')
                    assert saved(page)['journey'] == before
                    expect(page.locator('.world-travel-event')).to_be_visible()
                    checked_reload = True
                choose_safe(page, event['kind'])
            else:
                page.get_by_role('button', name='继续赶路 · 最多3日', exact=True).click()
        else:
            raise AssertionError('journey did not arrive')
        arrived = saved(page)
        assert checked_reload and seen_events
        assert arrived['currentCityId'] == 'nanhai' and arrived['originId'] == 'yingchuan'
        assert ordinal(arrived['date']) > ordinal(start_date)
        page.reload(wait_until='networkidle')
        assert saved(page)['currentCityId'] == 'nanhai'
        page.get_by_role('button', name='地方官员', exact=True).click()
        expect(page.locator('.official-header .panel-eyebrow')).to_contain_text('番禺')
        assert '王允' not in page.locator('.official-register').inner_text()
        page.get_by_role('button', name='关闭', exact=True).click()
        page.screenshot(path=str(OUT / 'arrival-nanhai.png'), full_page=True)
        print('PASS: real route preview, daily travel, saved events, arrival and visited-city officials', flush=True)

        # Birthplace migration and independent faction mission after neutral escort.
        old = copy.deepcopy(base)
        old.update(originId='shujun', phase='overworld', supplies=7)
        old.pop('currentCityId', None); old.pop('travelCount', None); old['date'] = {'year':184,'month':3}
        page.evaluate('({key,state})=>localStorage.setItem(key,JSON.stringify(state))', {'key':KEY,'state':old})
        page.reload(wait_until='networkidle')
        assert saved(page)['currentCityId'] == 'shujun' and saved(page)['supplies'] == 7
        seed(page, base, 'zhuo', flags={'ambushWon':True,'recovered':True,'escortWon':True,'xp:escort':True})
        page.get_by_role('button', name='拜访刘备', exact=True).click()
        page.get_by_role('button', name='停留1日，记下交情', exact=True).click()
        page.get_by_role('button', name='查看可投奔的阵营', exact=True).click()
        expect(page.locator('.route-card:not(:disabled)')).to_have_count(1)
        page.locator('.route-card:not(:disabled)').click()
        page.get_by_role('button', name='走 刘 方的路', exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        assert saved(page)['route'] == 'liu'
        page.get_by_role('button', name='阵营护送任务', exact=True).click()
        expect(page.get_by_role('button', name='开始阵营护送', exact=True)).to_be_visible()
        page.get_by_role('button', name='回到地图', exact=True).click()

        # Crossing 200 and selecting an allegiance must preserve the active journey.
        seed(page, base, date={'year':199,'month':12,'day':30})
        page.locator('#world-destination').select_option('nanhai')
        page.get_by_role('button', name='启程', exact=True).click()
        page.get_by_role('button', name='继续赶路 · 最多3日', exact=True).click()
        assert saved(page)['date']['year'] == 200
        before = saved(page)['journey']
        page.get_by_role('button', name='查看可投奔的阵营', exact=True).click()
        expect(page.locator('.route-card:not(:disabled)')).to_have_count(3)
        page.locator('.route-card').first.click()
        page.get_by_role('button', name='走 曹 方的路', exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        assert saved(page)['journey'] == before and saved(page)['route'] == 'cao'
        print('PASS: 0.1 save migration, faction mission entry, 200 unlock and in-transit allegiance', flush=True)

        if not LOCAL:
            # Establish a valid saved encounter fixture, then perform a complete battle with pointers.
            seed(page, base)
            page.locator('#world-destination').select_option('nanhai')
            page.get_by_role('button', name='启程', exact=True).click()
            fixture = saved(page)
            fixture['journey']['event'] = {'id':0,'kind':'bandits'}
            seed(page, base, **fixture)
            page.get_by_role('button', name='迎战匪徒', exact=True).click()
            wait_scene(page, 'Battle')
            page.reload(wait_until='networkidle'); wait_scene(page, 'Battle')
            assert saved(page)['journey']['event']['inBattle']
            win_battle(page)
            page.get_by_role('button', name='回到原行程', exact=True).click()
            expect(page.locator('#world-root')).to_be_visible()
            won = saved(page)
            assert won['journey']['path'] == fixture['journey']['path']
            assert not won['journey'].get('event') and not won['flags'].get('escortWon')
            assert won['party']['traveler']['level'] > fixture['party']['traveler']['level']
            page.reload(wait_until='networkidle')
            assert saved(page)['party'] == won['party']
            print('PASS: complete travel battle, refresh context and once-only reward return to route', flush=True)

        for width, height in [(844,390), (390,844)]:
            mobile = browser.new_context(viewport={'width':width,'height':height}, has_touch=True)
            mp = mobile.new_page(); mp.on('pageerror', lambda error: errors.append(str(error)))
            mp.goto(URL, wait_until='networkidle')
            seed(mp, base, 'wujun')
            assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
            mp.locator('#world-destination').select_option('shujun')
            mp.locator('#start-travel').tap()
            mp.locator('#continue-travel').tap()
            assert saved(mp)['journey']
            mp.screenshot(path=str(OUT / f'world-map-{width}.png'), full_page=True)
            mp.reload(wait_until='networkidle')
            assert saved(mp)['journey']
            # Restore city fixture and verify one year is a deliberate, confirmed action.
            seed(mp, base, 'wujun')
            mp.get_by_role('button', name='长期停留 · 一年', exact=True).tap()
            assert saved(mp)['date']['year'] == 184
            mp.get_by_role('button', name='确认安居一年 · 推进360日', exact=True).tap()
            assert saved(mp)['date']['year'] == 185
            mobile.close()
            print(f'PASS: {width}x{height} touch selection, travel reload, overflow and explicit long stay', flush=True)
        assert not errors, errors
        browser.close()
        print('PASS: no browser runtime errors; ' + ('offline portable build' if LOCAL else 'development build'), flush=True)


if __name__ == '__main__':
    main()
