"""Real equip -> default battle actor -> canvas/select casting -> saved reload regression."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
URL=os.environ.get('H5_URL','http://127.0.0.1:5188');KEY='three-kingdoms-demo-state'
OUT=Path('output/playwright/equipped-martials');OUT.mkdir(parents=True,exist_ok=True)
def saved(page):return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def resume(page):
 page.reload(wait_until='networkidle');page.get_by_role('button',name='继续游戏',exact=True).click()
def actor(c):return next((u for u in sorted(c['units'],key=lambda u:-u['speed']) if u['hp']>0 and u['id'] not in c['actedIds']),None)
def wait_party(page):
 page.locator('#game-container canvas').scroll_into_view_if_needed()
 page.wait_for_function('''key=>{const s=JSON.parse(localStorage.getItem(key));return s.activeBattle?.turn==='party'}''',arg=KEY)
 return saved(page)['activeBattle']
def tile(page,t,touch):
 canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
 x=box['x']+box['width']*(51+(t['x']+.5)*36)/960;y=box['y']+box['height']*(118+(t['y']+.5)*36)/540
 (page.touchscreen.tap if touch else page.mouse.click)(x,y)
def observe(page,skill):return page.evaluate('''async([key,id])=>{const {martialTargets}=await import('/src/game/martialCombat.ts');return martialTargets(JSON.parse(localStorage.getItem(key)).activeBattle,'traveler',id)}''',[KEY,skill])
def start_battle(page):
 page.get_by_role('button',name='当地故事',exact=True).click();page.get_by_role('button',name='进入战斗',exact=True).click();return wait_party(page)
def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True);results=[]
  for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
   print(f'BEGIN {width}x{height}',flush=True)
   page=browser.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(URL,wait_until='networkidle')
   # Seed already earned knowledge only; equip and every combat action use real UI input.
   page.evaluate('''async()=>{const {createInitialState}=await import('/src/game/state.ts');const {setState}=await import('/src/game/runtime.ts');const s=createInitialState(()=>0);s.heroName='陆长安';s.phase='overworld';s.martial.learned=['martial-guan-yu','martial-cao-ren','martial-lu-bu'];setState(s)}''')
   resume(page);page.locator('#world-party').click();page.get_by_role('button',name='主角武学',exact=True).click()
   for name in ['斩将','金城','飞将']:page.get_by_role('button',name=f'装配《{name}》',exact=True).click()
   page.keyboard.press('Escape');page.keyboard.press('Escape');equipped=saved(page);c=start_battle(page)
   assert actor(c)['id']=='aman'
   # Regression: equipped hero arts used to disappear during another unit's action.
   expect(page.locator('[data-battle-skill="martial-cao-ren"]')).to_be_visible()
   expect(page.locator('[data-battle-skill="martial-cao-ren"]')).to_be_disabled()
   expect(page.locator('#battle-commands')).to_contain_text('等待主角行动')
   page.get_by_role('button',name='守势 / 结束行动',exact=True).click()
   page.locator('#game-container canvas').scroll_into_view_if_needed()
   page.wait_for_function('''key=>JSON.parse(localStorage.getItem(key)).activeBattle?.selectedId==='traveler' ''',arg=KEY)
   expect(page.locator('[data-battle-skill="martial-guan-yu"]')).to_contain_text('无合法目标')
   page.locator('[data-battle-skill="martial-guan-yu"]').click()
   expect(page.get_by_role('button',name='对选中格施展',exact=True)).to_be_disabled()
   expect(page.locator('#battle-commands')).to_contain_text('按武器合法距离')
   page.get_by_role('button',name='取消选取',exact=True).click()
   before=saved(page);page.locator('[data-battle-skill="martial-cao-ren"]').click();hero=next(u for u in before['activeBattle']['units'] if u['id']=='traveler')
   # Exercise actual canvas pointer/touch for the self support target.
   tile(page,hero,touch);c=wait_party(page)
   assert any('金城' in line for line in c['battleLog']);assert next(u for u in c['units'] if u['id']=='traveler')['martialReady']['martial-cao-ren']==4
   party=saved(page)['party'];resume(page);c=wait_party(page)
   assert saved(page)['party']==party and next(u for u in c['units'] if u['id']=='traveler')['martialReady']['martial-cao-ren']==4
   expect(page.locator('[data-battle-skill="martial-cao-ren"]')).to_contain_text('冷却')
   # A separate fresh encounter uses the actual target select fallback for an attack.
   page.get_by_role('button',name='撤退',exact=True).click();page.locator('#world-party').click()
   # Return with the same equipment; use normal guarded turns until a legal shot exists.
   page.keyboard.press('Escape');start_battle(page)
   cast=False
   for _ in range(18):
    c=wait_party(page)
    if actor(c)['id']=='traveler' and observe(page,'martial-lu-bu'):
     targets=observe(page,'martial-lu-bu');t=targets[0];before=copy.deepcopy(c)
     page.locator('[data-battle-skill="martial-lu-bu"]').click();page.get_by_label('目标格',exact=True).select_option(f"{t['x']},{t['y']}")
     page.get_by_role('button',name='对选中格施展',exact=True).click();c=wait_party(page)
     assert any('飞将' in line for line in c['battleLog']);cast=True;break
    page.get_by_role('button',name='守势 / 结束行动',exact=True).click()
   assert cast,'No actual legal ranged martial cast was reached'
   resume(page);wait_party(page);assert saved(page)['martial']['equipped']==equipped['martial']['equipped']
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert not errors,errors
   page.screenshot(path=str(OUT/f'battle-{width}x{height}.png'),full_page=True)
   results.append({'viewport':[width,height],'equipRealUI':True,'waitingHeroVisible':True,'canvasSupport':True,'selectAttack':True,'reloadCooldown':True,'errors':errors});page.close()
  browser.close();(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(results,ensure_ascii=True))
if __name__=='__main__':main()
