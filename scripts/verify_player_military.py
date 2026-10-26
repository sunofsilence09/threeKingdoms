"""Real military UI acceptance on an isolated Vite/local server.

Fixtures fund supplies/coins only; all city troops, recruiting, sieges and losses
use the actual world rules. Run with H5_URL set for a different local port.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
URL=os.environ.get('H5_URL','http://127.0.0.1:5189')
KEY='three-kingdoms-demo-state'
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'player-military'
OUT.mkdir(parents=True,exist_ok=True)
def saved(page):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def ordinal(s):
 d=s['date'];return d['year']*360+(d['month']-1)*30+d.get('day',1)
def total(s):
 w=s['worldConflict'];return sum(c['troops'] for c in w['cities'].values())+sum(a['troops'] for a in w['armies'])+w.get('playerReserve',0)
def seed(page):
 page.evaluate('''async()=>{const {createInitialState}=await import('/src/game/state.ts'); const s={...createInitialState(()=>0),phase:'overworld',currentCityId:'moling',heroName:'军务测试',supplies:100};s.economy.coins=50000;localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(s));}''')
 page.reload(wait_until='networkidle')
 if page.get_by_role('button',name='继续游戏',exact=True).count():page.get_by_role('button',name='继续游戏',exact=True).click()
 expect(page.locator('#world-root')).to_be_visible()
 return saved(page)
def open_panel(page):
 page.locator('#world-military').click()
 expect(page.get_by_role('dialog',name='募兵与攻城',exact=True)).to_be_visible()
 return page.locator('.player-military-panel')
def conserved(s):
 w=s['worldConflict']; assert total(s)==w['ledger']['initial']+w['ledger'].get('expansion',0)+w['ledger']['raised']+w['ledger']['recruited']-w['ledger']['losses']
def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  errors=[]
  for width,height in [(1440,1000),(390,844),(844,390)]:
   ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=width!=1440,is_mobile=width!=1440)
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='networkidle')
   before=seed(page);panel=open_panel(page);assert saved(page)==before
   recruit=page.get_by_label('招募人数',exact=True);deploy=page.get_by_label('出征人数',exact=True)
   expect(recruit).to_have_value('100');expect(page.get_by_role('button',name='检视攻城军令',exact=True)).to_be_disabled()
   for bad in ['', '0','-100','101','100.5','20100','9007199254740992']:
    recruit.fill(bad);expect(page.get_by_role('button',name='确认募兵',exact=True)).to_be_disabled()
   assert saved(page)==before
   recruit.fill('20000');page.get_by_role('button',name='确认募兵',exact=True).click();raised=saved(page)
   assert raised['worldConflict']['playerReserve']==20000
   assert raised['economy']['coins']==10000
   assert ordinal(raised)==ordinal(before)+1
   expect(page.get_by_role('button',name='确认募兵',exact=True)).to_be_disabled()
   for bad in ['', '0','-1','99','100.5','20001']:
    deploy.fill(bad);expect(page.get_by_role('button',name='检视攻城军令',exact=True)).to_be_disabled()
   deploy.fill('20000');expect(page.get_by_role('button',name='确认攻城',exact=True)).to_have_count(0)
   page.get_by_role('button',name='检视攻城军令',exact=True).click()
   page.evaluate("async()=>{const {getState,setState}=await import('/src/game/runtime.ts');setState({...getState()});}")
   page.get_by_role('button',name='确认攻城',exact=True).click()
   expect(panel.get_by_role('status')).to_contain_text('局势已经变化')
   expect(page.get_by_role('button',name='确认攻城',exact=True)).to_have_count(0)
   assert saved(page)==raised
   page.get_by_role('button',name='检视攻城军令',exact=True).click()
   expect(page.locator('.military-confirmation')).to_contain_text('按天下兵力规则自动结算，期间战争推进')
   preview=page.evaluate("async()=>{const {getState}=await import('/src/game/runtime.ts');const {playerSiegePreview}=await import('/src/game/playerMilitary.ts');return playerSiegePreview(getState(),20000);}")
   assert saved(page)==raised
   deploy.fill('19999');expect(page.get_by_role('button',name='确认攻城',exact=True)).to_have_count(0)
   deploy.fill('20000');page.get_by_role('button',name='检视攻城军令',exact=True).click()
   page.get_by_role('button',name='取消军令',exact=True).click();assert saved(page)==raised
   page.get_by_role('button',name='检视攻城军令',exact=True).click()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   assert panel.evaluate('(p)=>p.scrollWidth<=p.clientWidth+1')
   assert panel.locator('button').evaluate_all('(bs)=>bs.every(b=>b.getBoundingClientRect().height>=44)')
   page.get_by_role('button',name='确认攻城',exact=True).scroll_into_view_if_needed()
   page.screenshot(path=str(OUT/f'preview-{width}.png'))
   page.get_by_role('button',name='确认攻城',exact=True).click();won=saved(page)
   assert ordinal(won)==ordinal(raised)+preview['days']
   assert won['supplies']==raised['supplies']-preview['foodCost']
   assert won['worldConflict']['cities']['moling']['factionId']=='player'
   assert won['worldConflict']['cities']['moling']['troops']<20000
   assert won['worldConflict']['playerReserve']==0
   assert won['worldConflict']['ledger']['losses']>raised['worldConflict']['ledger']['losses']
   conserved(won)
   expect(panel.get_by_role('status')).to_contain_text('攻下')
   expect(page.get_by_role('button',name='确认攻城',exact=True)).to_have_count(0)
   transfer=page.get_by_label('调拨人数',exact=True);transfer.fill('1000')
   page.get_by_role('button',name='提出预备兵',exact=True).click();pulled=saved(page)
   assert pulled['worldConflict']['playerReserve']==1000
   assert ordinal(pulled)==ordinal(won) and total(pulled)==total(won)
   transfer.fill('500');page.get_by_role('button',name='补入本城',exact=True).click();reinforced=saved(page)
   assert reinforced['worldConflict']['playerReserve']==500 and total(reinforced)==total(won)
   transfer.fill('20000');expect(page.get_by_role('button',name='提出预备兵',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='补入本城',exact=True)).to_be_disabled()
   assert saved(page)==reinforced
   page.screenshot(path=str(OUT/f'owned-{width}.png'),full_page=True)
   page.keyboard.press('Escape');expect(panel).to_have_count(0)
   page.reload(wait_until='networkidle')
   if page.get_by_role('button',name='继续游戏',exact=True).count():page.get_by_role('button',name='继续游戏',exact=True).click()
   assert saved(page)==reinforced
   panel=open_panel(page);expect(panel).to_contain_text('我方城池 · 1 座');expect(panel).to_contain_text('秣陵 · 所在')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   page.keyboard.press('Escape')
   assert page.evaluate('document.activeElement.id')=='world-military'
   page.locator('#enter-city').click();expect(page.locator('.city-panel')).to_be_visible()
   page.get_by_role('button',name='军务 / 攻城',exact=True).click()
   expect(page.locator('.city-panel')).to_have_count(0)
   page.get_by_label('调拨人数',exact=True).fill('100')
   page.get_by_role('button',name='补入本城',exact=True).click()
   page.get_by_role('button',name='返回',exact=True).click()
   expect(page.locator('.city-panel')).to_be_visible()
   assert page.evaluate('document.activeElement.textContent')=='军务 / 攻城'
   page.keyboard.press('Escape');expect(page.locator('#world-military')).to_be_visible()
   expect(page.locator('#world-root')).to_contain_text('随行预备兵 400')
   print(f'PASS {width}x{height}: untouched preview, invalid input, recruitment, two-step siege, actual victory/losses, transfers, reload, no overflow',flush=True)
   ctx.close()
  settled_battles(browser)
  locks(browser)
  browser.close();assert not errors,errors

def create_settlement_fixture(page):
 return page.evaluate('''async()=>{
   const {createInitialState}=await import('/src/game/state.ts');
   const {createCombatState}=await import('/src/game/combat.ts');
   const {checkpointBattle}=await import('/src/game/battleSave.ts');
   const s={...createInitialState(()=>0),heroName:'战后军务',phase:'battle',encounter:'ambush'};
   s.battleParty=[...s.deployed];
   const combat=createCombatState(null,s.party,'ambush',s.deployed);
   combat.units=combat.units.map(u=>u.id==='traveler'?{...u,x:3,y:4,speed:100,attack:100}:u.team==='enemy'?{...u,hp:u.id==='bandit-leader'?1:0,...(u.id==='bandit-leader'?{x:4,y:4,dodgeRate:0}:{})}:u);
   combat.selectedId='traveler';combat.turn='party';
   s.activeBattle=checkpointBattle(combat,s);
   return s;
  }''')

def settled_battles(browser,fixture=None,url=URL):
 for width,height in [(1440,1000),(390,844),(844,390)]:
  touch=width!=1440
  ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
  external=[];errors=[]
  def restrict(route):
   if route.request.url.startswith(url+'/'):route.continue_()
   else:external.append(route.request.url);route.abort()
  ctx.route('**/*',restrict)
  page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(url,wait_until='networkidle')
  state=fixture if fixture is not None else create_settlement_fixture(page)
  page.evaluate('(s)=>localStorage.setItem("three-kingdoms-demo-state",JSON.stringify(s))',state)
  page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
  expect(page.locator('#battle-commands')).to_be_visible()
  canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
  x=box['x']+box['width']*(51+4.5*36)/960;y=box['y']+box['height']*(118+4.5*36)/540
  (page.touchscreen.tap if touch else page.mouse.click)(x,y)
  expect(page.get_by_role('heading',name='路口让开了，你们也更坚韧了。',exact=True)).to_be_visible()
  page.get_by_role('button',name='继续行旅',exact=True).click()
  expect(page.locator('#world-root')).to_be_visible()
  after=saved(page)
  assert not after.get('encounter') and not after.get('activeBattle'),after.get('encounter')
  page.locator('#world-military').click()
  expect(page.get_by_role('button',name='确认募兵',exact=True)).to_be_enabled()
  page.get_by_role('button',name='确认募兵',exact=True).click()
  assert saved(page)['worldConflict']['playerReserve']==100
  page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
  page.locator('#world-military').click()
  expect(page.get_by_role('button',name='确认募兵',exact=True)).to_be_enabled()
  assert not external and not errors,(external,errors)
  print(f'PASS {width}x{height}: real ambush victory returns to usable military and reload',flush=True)
  ctx.close()

def locks(browser):
 page=browser.new_page();page.goto(URL,wait_until='networkidle')
 for mode in ['battle','active-battle','duel','encounter','journey','recovery','calendar','poor','food','reserve-cap']:
  page.evaluate('''async(mode)=>{
   const {clearOverlay}=await import('/src/game/ui.ts');clearOverlay();
   const {createInitialState}=await import('/src/game/state.ts');
   const {setState}=await import('/src/game/runtime.ts');
   const {recruitPlayerTroops}=await import('/src/game/playerMilitary.ts');
   let s={...createInitialState(()=>0),phase:'overworld',heroName:'锁定测试',currentCityId:'moling',supplies:100};
   s.economy.coins=50000;s=recruitPlayerTroops(s,1000);
   if(mode==='battle')s.phase='battle';
   if(mode==='active-battle')s.activeBattle={};
   if(mode==='duel')s.duel={};
   if(mode==='encounter')s.encounter='ambush';
   if(mode==='journey')s.journey={};
   if(mode==='recovery')s.conflictRecovery=true;
   if(mode==='calendar')s.date={year:310,month:12,day:30};
   if(mode==='poor')s.economy.coins=199;
   if(mode==='food')s.supplies=0;
   if(mode==='reserve-cap'){
    s.worldConflict.playerReserve=20000;s.economy.coins=50000;
    s.worldConflict.cities.moling.factionId='player';s.worldConflict.cities.moling.troops=5000;
   }
   setState(s);const {showPlayerMilitary}=await import('/src/game/playerMilitaryPanel.ts');showPlayerMilitary();
  }''',mode)
  before=saved(page)
  recruit=page.get_by_role('button',name='确认募兵',exact=True)
  if mode!='food':expect(recruit).to_be_disabled()
  if mode!='reserve-cap':
   page.get_by_label('出征人数',exact=True).fill('1000')
   if mode!='poor':expect(page.get_by_role('button',name='检视攻城军令',exact=True)).to_be_disabled()
  else:
   page.get_by_label('调拨人数',exact=True).fill('1')
   expect(page.get_by_role('button',name='提出预备兵',exact=True)).to_be_disabled()
  assert saved(page)==before
  print('PASS lock '+mode,flush=True)
 page.close()
if __name__=='__main__':run()
