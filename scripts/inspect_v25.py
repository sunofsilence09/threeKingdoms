"""Capture real current layouts before the full 2.5 acceptance run."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v2.5'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('H5_URL', 'http://127.0.0.1:5199')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    results = []
    for width, height in [(1440, 900), (1920, 1080), (390, 844), (844, 390)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        page.evaluate("""async()=>{
          const {createInitialState,STORAGE_KEY}=await import('/src/game/state.ts');
          const s={...createInitialState(()=>0),phase:'overworld',heroName:'城府验收'};
          localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
        }""")
        page.reload(wait_until='networkidle')
        page.get_by_role('button', name='继续游戏', exact=True).click()
        page.locator('#world-root').wait_for()
        page.screenshot(path=str(OUT / f'world-{width}.png'), full_page=True)
        layout = page.evaluate("""()=>({
          viewport:[innerWidth,innerHeight],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
          shell:(()=>{const r=document.querySelector('.game-shell').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})(),
          buttons:[...document.querySelectorAll('.world-navigation>button')].map(b=>{const r=b.getBoundingClientRect();return [b.id,r.x,r.y,r.width,r.height]})
        })""")
        page.locator('#world-nav-city').click()
        page.screenshot(path=str(OUT / f'city-actions-{width}.png'), full_page=True)
        page.get_by_role('button', name='查看城市府库与收支', exact=True).click()
        page.screenshot(path=str(OUT / f'treasury-{width}.png'), full_page=True)
        page.get_by_role('button', name='府库与月结', exact=True).click()
        page.screenshot(path=str(OUT / f'ledger-{width}.png'), full_page=True)
        results.append({'width':width,'height':height,'layout':layout,'errors':errors})
        page.close()
    browser.close()
    (OUT / 'initial-layout.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(results,ensure_ascii=False))
