"""2.2.0 browser regression on the local Vite server. Uses isolated browser saves."""
from pathlib import Path
import json, os
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'social-v2.2'
OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('H5_URL','http://127.0.0.1:5173')
FIXTURE=OUT/'initial-state.json'
KEY='three-kingdoms-demo-state'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for width,height in [(1440,1000),(390,844),(844,390)]:
  context=browser.new_context(viewport={'width':width,'height':height},has_touch=width<500)
  external=[]
  origin=urlsplit(URL)
  def local_only(route):
   target=urlsplit(route.request.url)
   if target.scheme in ['data','blob'] or (target.scheme,target.netloc)==(origin.scheme,origin.netloc): route.continue_()
   else: external.append(route.request.url);route.abort()
  context.route('**/*',local_only)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL,wait_until='networkidle')
  if os.environ.get('H5_PRODUCTION'):
   page.evaluate('([k,s])=>localStorage.setItem(k,JSON.stringify(s))',[KEY,json.loads(FIXTURE.read_text(encoding='utf-8'))])
  else:
   initial=page.evaluate("""async()=>{
   const {createInitialState,STORAGE_KEY}=await import('/src/game/state.ts');
   const {createProgress}=await import('/src/game/growth.ts');
   const {createLifeState}=await import('/src/game/personLife.ts');
   const s=createInitialState(()=>0);s.date={year:200,month:5,day:1};s.life=createLifeState(s.date,23);
   s.heroName='验收旅人';s.phase='overworld';s.currentCityId='xiangyang';delete s.worldConflict;
   s.party['cai-yan']=createProgress();s.party['guan-yu']=createProgress();s.party['aman']=createProgress();
   s.relationships['cai-yan']={affinity:95};s.relationships['guan-yu']={affinity:100};s.relationships.aman={affinity:0};
   s.economy.coins=3000;localStorage.setItem(STORAGE_KEY,JSON.stringify(s));return s;
  }""")
   FIXTURE.write_text(json.dumps(initial,ensure_ascii=False),encoding='utf-8')
  page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
  page.get_by_role('button',name='进入城池',exact=True).click()
  page.get_by_role('button',name='礼品铺',exact=True).click()
  page.get_by_role('button',name='购买玉佩',exact=True).click()
  assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).economy.coins',KEY)==2400
  page.screenshot(path=str(OUT/f'gift-shop-{width}.png'))
  page.locator('.city-panel').get_by_role('button',name='寻访人物',exact=True).click()
  card=page.locator('[data-person="cai-yan"]')
  card.get_by_role('button',name='查看详情',exact=True).click()
  details=page.get_by_role('dialog',name='人物详情',exact=True)
  details.get_by_role('button',name='送玉佩 +20 · 持有1 · 1日',exact=True).click()
  details=page.get_by_role('dialog',name='人物详情',exact=True)
  details.get_by_role('button',name='结婚 · 双方六维+2',exact=True).click()
  details=page.get_by_role('dialog',name='人物详情',exact=True)
  expect(details.locator('.social-controls')).to_contain_text('夫妻')
  expect(details.locator('.character-attributes')).to_contain_text('羁绊2')
  details.locator('.social-controls').scroll_into_view_if_needed()
  page.screenshot(path=str(OUT/f'marriage-{width}.png'))
  page.keyboard.press('Escape')
  card=page.locator('[data-person="guan-yu"]')
  expect(card.get_by_role('button',name='结婚 · 结婚仅限异性',exact=True)).to_be_disabled()
  card.get_by_role('button',name='结义 · 双方六维+2',exact=True).click()
  expect(page.locator('[data-person="guan-yu"] .social-controls')).to_contain_text('结义伙伴')
  card=page.locator('[data-person="aman"]')
  card.get_by_role('button',name='帮忙 +10 · 每月一次 · 1日',exact=True).click()
  expect(page.locator('[data-person="aman"]').get_by_role('button',name='帮忙 · 本月已帮忙',exact=True)).to_be_disabled()
  saved=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
  assert saved['party']['traveler']['bondBonus']==4
  assert saved['gifts']['jade']==0 and saved['relationships']['cai-yan']['affinity']==100
  assert saved['relationships']['aman']['lastHelpMonth']==(200-184)*12+4
  page.screenshot(path=str(OUT/f'sworn-and-cooldown-{width}.png'))
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
  restored=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))',KEY)
  assert restored['party']['traveler']['bondBonus']==4
  assert restored['relationships']['cai-yan']['bond']=='marriage'
  assert not errors,errors
  assert not external,external
  print(f'PASS social {width}x{height}: shop/gift/marriage/sworn/help/attributes/reload',flush=True)
  context.close()
 browser.close()
