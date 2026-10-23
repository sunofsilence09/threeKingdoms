"""Regression: ending a travel battle must stop pending enemy turns."""
import json
from playwright.sync_api import sync_playwright
from verify_h5 import click_canvas, wait_scene, battle, URL

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 820})
    page.goto(URL, wait_until='networkidle')
    page.evaluate('''async () => {
      const {createInitialState} = await import('/src/game/state.ts');
      const {startTravel} = await import('/src/game/travel.ts');
      const s = startTravel({...createInitialState(()=>0),phase:'overworld',currentCityId:'yingchuan'},'nanhai',8);
      s.journey.event = {id:0,kind:'bandits'};
      localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(s));
    }''')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='迎战匪徒', exact=True).click()
    wait_scene(page, 'Battle')
    click_canvas(page, 870, 480)
    click_canvas(page, 350, 98)
    before = battle(page)
    page.wait_for_timeout(1000)
    after = battle(page)
    assert before == after, 'combat changed after retreat while its result panel was open'
    assert page.get_by_role('button', name='回到原行程').is_visible()
    saved = page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")
    assert saved['phase'] == 'overworld' and not saved['journey'].get('event')
    assert not saved['flags'].get('escortWon')
    print('PASS: retreat stops scheduled enemy actions and preserves original journey')
    browser.close()
