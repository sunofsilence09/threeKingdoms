"""2.0 acceptance: real recruitment/allocation/casting/retreat and saved rout fixture."""
import json, os, sys, math
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('H5_URL','http://127.0.0.1:5193')
KEY='three-kingdoms-demo-state'
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'v2-troops'
OUT.mkdir(parents=True,exist_ok=True)
LOCAL='--local' in sys.argv
SUFFIX='package' if LOCAL else 'development'
def saved(page): return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)
def resume(page):
    page.reload(wait_until='networkidle')
    page.get_by_role('button',name='继续游戏',exact=True).click()
def wait_party(page):
    page.wait_for_function('key=>JSON.parse(localStorage.getItem(key)).activeBattle?.turn==="party"',arg=KEY)
    return saved(page)['activeBattle']
def conserved(state):
    w=state['worldConflict']
    total=sum(c['troops'] for c in w['cities'].values())+sum(a['troops'] for a in w['armies'])+w.get('playerReserve',0)+w.get('playerAssigned',0)
    assert total==w['ledger']['initial']+w['ledger'].get('expansion',0)+w['ledger']['recruited']+w['ledger']['raised']-w['ledger']['losses']
    assert w.get('playerAssigned',0)==sum(t['count'] for t in state.get('troopAssignments',{}).values())
def click_tile(page,tile,touch):
    point=page.evaluate('''async tile=>{const {game}=await import('/src/main.ts');return game.scene.getScene('Battle').board.tileScreenPoint(tile)}''',tile)
    canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
    x=box['x']+point['x']*box['width']/960;y=box['y']+point['y']*box['height']/540
    (page.touchscreen.tap if touch else page.mouse.click)(x,y)

def edge_cases(page,touch,local=False):
    if local:
        fixtures=json.loads((OUT/'edge-fixtures.json').read_text(encoding='utf-8'))
    else:
        fixtures=page.evaluate('''async()=>{
          const {createInitialState}=await import('/src/game/state.ts');
          const {createCombatState,updateUnitHp}=await import('/src/game/combat.ts');
          const {checkpointBattle}=await import('/src/game/battleSave.ts');
          const {recruitPlayerTroops}=await import('/src/game/playerMilitary.ts');
          const {assignTroops,initializeTroopCombat}=await import('/src/game/troopManagement.ts');
          const base=()=>{const s=createInitialState(()=>0);return {...s,heroName:'兵战复查',phase:'battle',encounter:'ambush',battleParty:[...s.deployed]};};
          const fire=base();let c=createCombatState(null,fire.party);
          c.units=c.units.map(u=>u.id==='traveler'?{...u,x:1,y:1,speed:14,morale:65,hp:20,maxHp:20}:u.id==='bandit-leader'?{...u,x:8,y:8,speed:13,morale:80}:{...u,speed:1});
          c.actedIds=[];c.movedIds=[];c.selectedId='traveler';c.turn='party';
          c.fires=[{x:2,y:1,level:3,remainingRounds:3,sourceId:'bandit-leader'}];fire.activeBattle=checkpointBattle(c,fire);
          const legacy=base();c=createCombatState(null,legacy.party);
          c.units=c.units.map(u=>{const old={...u,speed:u.id==='traveler'?100:1};delete old.morale;return old;});
          c.actedIds=[];c.movedIds=[];c.selectedId='traveler';c.turn='party';legacy.activeBattle=checkpointBattle(c,legacy);
          let allocated=createInitialState(()=>0);allocated.phase='overworld';allocated.economy.coins=2000;
          allocated=recruitPlayerTroops(allocated,200);allocated=assignTroops(allocated,'aman','crossbow',100);
          const recovery={...allocated,heroName:'配兵恢复',phase:'battle',encounter:'ambush',battleParty:[...allocated.deployed]};
          c=initializeTroopCombat(createCombatState(null,recovery.party),recovery);
          c.units=c.units.map(u=>u.id==='aman'?updateUnitHp(u,u.hp-20):u);
          recovery.activeBattle=checkpointBattle(c,recovery);recovery.troopAssignments.aman.extra='unknown';
          const fallback=structuredClone(recovery);fallback.troopAssignments['chen-da']={kind:'unknown',count:0};
          return {fire,legacy,recovery,fallback};
        }''')
        (OUT/'edge-fixtures.json').write_text(json.dumps(fixtures),encoding='utf-8')
    def put(state):
        page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))',[KEY,state]);resume(page)
        expect(page.locator('#battle-commands')).to_be_visible()
    put(fixtures['fire'])
    canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box()
    x=box['x']+(51+2.5*36)*box['width']/960;y=box['y']+(118+1.5*36)*box['height']/540
    (page.touchscreen.tap if touch else page.mouse.click)(x,y)
    page.wait_for_function('key=>JSON.parse(localStorage.getItem(key)).activeBattle.units.find(u=>u.id==="traveler").x===2',arg=KEY)
    moved=saved(page)['activeBattle'];hero=next(u for u in moved['units'] if u['id']=='traveler')
    assert hero['morale']<65 and moved['selectedId']=='traveler' and moved['turn']=='party'
    resume(page)
    assert saved(page)['activeBattle']['selectedId']=='traveler'
    page.get_by_role('button',name='守势 / 结束行动',exact=True).click()
    page.wait_for_function('key=>JSON.parse(localStorage.getItem(key)).activeBattle.actedIds.includes("traveler")',arg=KEY)
    wait_party(page);page.get_by_role('button',name='撤退',exact=True).click()
    put(fixtures['legacy'])
    assert next(u for u in saved(page)['activeBattle']['units'] if u['id']=='traveler')['morale']==80
    page.get_by_role('button',name='守势 / 结束行动',exact=True).click()
    assert next(u for u in saved(page)['activeBattle']['units'] if u['id']=='traveler')['morale']==90
    page.get_by_role('button',name='撤退',exact=True).click()
    for kind in ['recovery','fallback']:
        put(fixtures[kind]);state=saved(page);world=state['worldConflict']
        if kind=='recovery':
            unit=next(u for u in state['activeBattle']['units'] if u['id']=='aman')
            assert unit['troop']['count']==90 and unit['troop']['initial']==100
            assert world['playerReserve']==100 and world['playerAssigned']==100
        else:
            assert world['playerReserve']==190 and world['playerAssigned']==0
            assert world['ledger']['losses']==fixtures[kind]['worldConflict']['ledger']['losses']+10
            assert page.evaluate('localStorage.getItem("three-kingdoms-demo-state:active-battle-troops-backup")')
        page.get_by_role('button',name='撤退',exact=True).click();state=saved(page);conserved(state)
        assert state['worldConflict']['ledger']['losses']==fixtures[kind]['worldConflict']['ledger']['losses']+10
    print('PASS edge cases: fire initiative/reload, legacy morale and atomic troop recovery',flush=True)

def main():
    results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
            page=browser.new_page(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
            errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.route('**/*',lambda route:route.continue_() if route.request.url.startswith(URL.rstrip('/')+'/') else route.abort())
            page.goto(URL,wait_until='networkidle')
            if LOCAL:
                page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))',[KEY,json.loads((OUT/'initial-save.json').read_text(encoding='utf-8'))])
            else:
                page.evaluate('''async()=>{const {createInitialState}=await import('/src/game/state.ts');const s=createInitialState(()=>0);s.heroName='陆行舟';s.phase='overworld';s.economy.coins=2000;localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(s))}''')
                (OUT/'initial-save.json').write_text(json.dumps(saved(page)),encoding='utf-8')
            resume(page)
            expect(page.locator('[data-city-model]')).to_have_count(60)
            city=page.locator('[data-city-id="changan"]');city.click()
            expect(city).to_have_attribute('aria-pressed','true')
            page.screenshot(path=str(OUT/f'{SUFFIX}-map-{width}.png'),full_page=True)
            page.locator('#world-party').click()
            page.get_by_role('button',name='军务 · 募兵',exact=True).click()
            page.get_by_label('招募人数',exact=True).fill('300')
            page.get_by_role('button',name='确认募兵',exact=True).click()
            page.get_by_role('button',name='返回',exact=True).click()
            expect(page.locator('.party-panel')).to_be_visible()
            for member,kind in [('aman','crossbow'),('traveler','spear'),('chen-da','infantry')]:
                card=page.locator(f'[data-member="{member}"]')
                card.locator('.troop-assignment select').select_option(kind)
                card.locator('.troop-assignment input').fill('100')
                card.get_by_role('button',name='确认配兵',exact=True).click()
            state=saved(page);assert state['worldConflict']['playerReserve']==0;conserved(state)
            assert state['troopAssignments']['aman']=={'kind':'crossbow','count':100}
            assert page.locator('.party-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
            page.screenshot(path=str(OUT/f'{SUFFIX}-party-{width}.png'),full_page=True)
            page.keyboard.press('Escape');resume(page)
            assert saved(page)['troopAssignments']==state['troopAssignments']
            page.get_by_role('button',name='当地故事',exact=True).click()
            page.get_by_role('button',name='进入战斗',exact=True).click();combat=wait_party(page)
            assert next(u for u in combat['units'] if u['id']=='aman')['troop']['count']==100
            cast_morale=0
            for turn in range(36):
                combat=wait_party(page)
                actor=next(u for u in sorted(combat['units'],key=lambda u:-math.floor(u['speed']*(.5+u.get('morale',80)/160)+.5)) if u['hp']>0 and u['id'] not in combat['actedIds'])
                if actor['id']=='aman':
                    skill=page.locator('[data-troop-skill="crossbow"]');expect(skill).to_be_enabled();skill.click()
                    cast=page.get_by_role('button',name='对选中格施展',exact=True)
                    if cast.is_enabled():
                        cast_morale=actor['morale'];cast.click();combat=wait_party(page);break
                    page.get_by_role('button',name='取消选取',exact=True).click()
                page.get_by_role('button',name='守势 / 结束行动',exact=True).click()
            assert cast_morale,'Strong shot never reached a legal target'
            assert any('强射' in line for line in combat.get('battleLog',[]))
            aman=next(u for u in combat['units'] if u['id']=='aman');assert aman['morale']<=cast_morale-20
            page.screenshot(path=str(OUT/f'{SUFFIX}-battle-{width}.png'),full_page=True)
            resume(page);combat=wait_party(page)
            assert not saved(page).get('battleRecovery')
            assert any('强射' in line for line in combat.get('battleLog',[]))
            page.get_by_role('button',name='撤退',exact=True).click()
            expect(page.locator('#world-root')).to_be_visible()
            conserved(saved(page))
            # A saved end-of-round fixture isolates the <10 rout boundary in the real scene.
            if LOCAL:
                page.evaluate('([key,s])=>localStorage.setItem(key,JSON.stringify(s))',[KEY,json.loads((OUT/f'rout-save-{width}.json').read_text(encoding='utf-8'))])
            else:
                page.evaluate('''async()=>{const {getState,setState}=await import('/src/game/runtime.ts');const {createCombatState}=await import('/src/game/combat.ts');const {initializeTroopCombat}=await import('/src/game/troopManagement.ts');const {initializeMartialCombat}=await import('/src/game/martialCombat.ts');const {checkpointBattle}=await import('/src/game/battleSave.ts');const s={...getState(),phase:'battle',encounter:'ambush',battleParty:[...getState().deployed]};let c=initializeMartialCombat(initializeTroopCombat(createCombatState(s.route,s.party,'ambush',s.battleParty,{month:s.date.month}),s),s);c={...c,units:c.units.map(u=>u.id==='chen-da'?{...u,morale:9}:u),actedIds:c.units.filter(u=>u.id!=='aman').map(u=>u.id)};setState({...s,activeBattle:checkpointBattle(c,s)});}''')
                (OUT/f'rout-save-{width}.json').write_text(json.dumps(saved(page)),encoding='utf-8')
            resume(page);before=wait_party(page)
            count=next(u for u in before['units'] if u['id']=='chen-da')['troop']['count']
            page.get_by_role('button',name='守势 / 结束行动',exact=True).click();after=wait_party(page)
            remain=next(u for u in after['units'] if u['id']=='chen-da')['troop']['count']
            assert remain==count-(count+9)//10,(count,remain)
            assert any('溃散离队' in line for line in after.get('battleLog',[]))
            page.get_by_role('button',name='撤退',exact=True).click();conserved(saved(page))
            edge_cases(page,touch,LOCAL)
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            assert not errors,errors
            results.append({'viewport':[width,height],'cities':60,'recruitAllocate':True,'strongShot':True,'refresh':True,'rout':True,'ledger':True,'errors':errors})
            print(f'PASS {width}x{height}',flush=True);page.close()
        browser.close()
    (OUT/f'{SUFFIX}-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':main()
