"""Selecting the departure city while travelling must retain it as redirect target."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];KEY='three-kingdoms-demo-state'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':900})
 page.goto(os.environ.get('H5_URL','http://127.0.0.1:5200'),wait_until='networkidle')
 s=json.loads((ROOT/'artifacts/v2.5/fixtures.json').read_text(encoding='utf-8'))['underway']
 page.evaluate('([k,s])=>localStorage.setItem(k,JSON.stringify(s))',[KEY,s]);page.reload(wait_until='networkidle')
 page.get_by_role('button',name='继续游戏',exact=True).click();page.locator('#world-root').wait_for()
 before=page.evaluate('(k)=>localStorage.getItem(k)',KEY)
 city=page.locator(f'[data-city-id="{s["currentCityId"]}"]');city.focus();city.press('Enter')
 expect(page.locator('#redirect-destination')).to_have_value(s['currentCityId'])
 assert page.evaluate('(k)=>localStorage.getItem(k)',KEY)==before
 print('PASS map departure-city redirect selection; saved state unchanged',flush=True)
 browser.close()
