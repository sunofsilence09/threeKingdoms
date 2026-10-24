"""1.0 real UI QA. Dev exports fixtures; H5_OFFLINE=1 uses JSON/localStorage only.

H5_URL=http://127.0.0.1:5174 python scripts/verify_generations.py
H5_URL=http://127.0.0.1:18743 H5_OFFLINE=1 python scripts/verify_generations.py
The battle driver observes persisted checkpoints and sends real mouse/touch input.
It never edits combat state, HP, positions or outcomes after entering a battle.
"""
import copy
import heapq
import json
import os
from pathlib import Path
from time import monotonic
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
GEN=ROOT/'artifacts'/'generations'
URL=os.environ.get('H5_URL','http://127.0.0.1:5174').rstrip('/')
OFFLINE=os.environ.get('H5_OFFLINE')=='1'
OUT=Path(os.environ.get('H5_ARTIFACT_DIR',str(GEN/('complete-ui-offline' if OFFLINE else 'complete-ui')))).resolve()
OUT.mkdir(parents=True,exist_ok=True)
FIXTURES=GEN/'ui-fixtures.json'
KEY='three-kingdoms-demo-state'
FIGHTERS=['traveler','jiang-wei','deng-ai','zhong-hui','lu-kang']


def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',KEY)


def assert_menu_bounds(page):
    data=page.locator('.start-menu').evaluate("""panel=>{
      const p=panel.getBoundingClientRect();
      const buttons=[...panel.querySelectorAll('button')].map(button=>{
        const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {text:button.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,hit:hit===button||button.contains(hit)};
      });return {panel:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},viewport:{width:innerWidth,height:innerHeight},buttons};
    }""")
    panel=data['panel'];view=data['viewport']
    assert panel['left']>=0 and panel['right']<=view['width'] and panel['top']>=0 and panel['bottom']<=view['height'],data
    assert len(data['buttons'])==2,data
    for b in data['buttons']:
        assert b['width']>=44 and b['height']>=44 and b['left']>=panel['left'] and b['right']<=panel['right'] and b['top']>=panel['top'] and b['bottom']<=panel['bottom'] and b['hit'],data
    return data


def dismiss_migrations(page,touch):
    for _ in range(4):
        proceed=page.get_by_role('button',name='查看当前旅程',exact=True)
        if proceed.count():
            activate(proceed,touch)
            expect(proceed).to_have_count(0)
        else: break


def continue_menu(page,touch=False):
    menu=page.locator('.start-menu')
    expect(menu).to_be_visible()
    proceed=menu.get_by_role('button',name='继续游戏',exact=True)
    expect(proceed).to_be_enabled();activate(proceed,touch)
    expect(menu).to_have_count(0)


def reload_continue(page,touch=False):
    page.reload(wait_until='networkidle');continue_menu(page,touch);dismiss_migrations(page,touch)
    phase=saved(page)['phase']
    if phase=='battle': expect(page.locator('#battle-commands')).to_be_visible()
    elif phase=='overworld': expect(page.locator('#world-root')).to_be_visible()


def put(page,state,touch=False):
    page.evaluate('([key,state])=>localStorage.setItem(key,JSON.stringify(state))',[KEY,state])
    reload_continue(page,touch)
    expect(page.locator('#world-root')).to_be_visible()


def activate(locator,touch=False):
    locator.scroll_into_view_if_needed()
    locator.tap() if touch else locator.click()


def verify_life_action_details(page,fixture,touch=False):
    for action in ['请教武学 · 1日','切磋 · 1对1 · 1日']:
        state=copy.deepcopy(fixture['memorial'])
        state['martial']['learned']=[];state['martial']['equipped']=[]
        put(page,state,touch)
        activate(page.locator('#world-party'),touch)
        activate(page.locator('[data-member="cao-cao"]').get_by_role('button',name='详情',exact=True),touch)
        activate(page.get_by_role('button',name=action,exact=True),touch)
        detail=page.locator('.character-details')
        expect(detail.locator('.character-life')).to_contain_text('本局于225年离世')
        expect(detail.locator('.character-identity')).to_contain_text('同行纪念')
        expect(detail.get_by_role('button',name='请教武学 · 1日',exact=True)).to_be_disabled()
        after=saved(page);assert after['phase']=='overworld' and not after.get('duel')
        assert 'cao-cao' not in after['party'] and after['life']['memorials']['cao-cao']['progress']['level']==5
        activate(detail.get_by_role('button',name='关闭人物详情',exact=True),touch)
        expect(page.locator('[data-memorial="cao-cao"]')).to_be_visible()
        expect(page.locator('[data-member="cao-cao"]')).to_have_count(0)
        activate(page.locator('.party-panel .company-header button'),touch)
        expect(page.locator('#world-root')).to_be_visible()


def export_fixtures(page):
    result=page.evaluate("""async()=>{
      const {createInitialState}=await import('/src/game/state.ts');
      const {createLifeState,reconcileLives}=await import('/src/game/personLife.ts');
      const {PERSON_LIFE_BASELINES}=await import('/src/game/personLifeData.ts');
      const {createWorldConflict}=await import('/src/game/worldConflict.ts');
      const {createProgress}=await import('/src/game/growth.ts');
      const {WEAPONS}=await import('/src/game/combat.ts');
      const {TERRAIN}=await import('/src/game/battlefield.ts');
      function base(year=253,city='nanzheng'){
        let s=createInitialState(()=>0);s.heroName='世代行者';s.date={year,month:3,day:1};s.phase='overworld';s.currentCityId=city;s.supplies=30;
        s.life=createLifeState(s.date,42);s.worldConflict=createWorldConflict(s.date,Object.keys(s.party),42,s.life);return s;
      }
      const city=base(253,'hefei'),battle=base(),contact=base(221,'henan'),memorial=base(224,'henan');
      battle.deployed=['traveler','jiang-wei','deng-ai','zhong-hui','lu-kang'];
      for(const id of battle.deployed){battle.party[id]=createProgress(5,7);const p=PERSON_LIFE_BASELINES.find(p=>p.id===id);if(p)battle.life.people[id].deathYear=p.deathBaseYear+5;}
      battle.life.handledIds=battle.life.handledIds.filter(id=>!battle.deployed.includes(id));
      battle.worldConflict=createWorldConflict(battle.date,Object.keys(battle.party),42,battle.life);
      contact.conflictRecovery=true;delete contact.worldConflict;contact.life.people['cao-cao'].deathYear=215;contact.life.people['cao-pi'].deathYear=231;
      const livingContact=reconcileLives(contact,contact.date),deadContact=structuredClone(livingContact);
      deadContact.life.people['cao-pi'].deathYear=221;
      const ghost=reconcileLives(deadContact,deadContact.date);
      memorial.date={year:224,month:12,day:30};memorial.life=createLifeState(memorial.date,42);memorial.life.people['cao-cao'].deathYear=225;
      memorial.life.handledIds=memorial.life.handledIds.filter(id=>id!=='cao-cao');memorial.party['cao-cao']=createProgress(5,7);memorial.deployed.push('cao-cao');memorial.relationships['cao-cao']={affinity:91};
      memorial.martial.learned=['martial-cao-cao'];memorial.martial.equipped=['martial-cao-cao'];memorial.worldConflict=createWorldConflict(memorial.date,Object.keys(memorial.party),42,memorial.life);
      const terrain=Object.fromEntries(Object.entries(TERRAIN).map(([id,t])=>[id,{cost:Number.isFinite(t.cost)?t.cost:null,blocksSight:t.blocksSight}]));
      return {version:1,city,battle,contact:livingContact,ghost,memorial,weapons:WEAPONS,terrain};
    }""")
    FIXTURES.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result


def tile_click(page,tile,touch=False):
    canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();box=canvas.bounding_box();assert box
    x=box['x']+box['width']*(51+(tile['x']+.5)*36)/960
    y=box['y']+box['height']*(118+(tile['y']+.5)*36)/540
    (page.touchscreen.tap if touch else page.mouse.click)(x,y)
    page.wait_for_timeout(80)


def player_turn(page):
    deadline=monotonic()+15
    while monotonic()<deadline:
        state=saved(page);combat=state.get('activeBattle')
        if state['phase']!='battle' or combat and combat['turn']=='party': return state
        page.wait_for_timeout(80)
    raise AssertionError('Enemy did not yield to the party')


def actor_of(combat):
    return next((u for u in sorted(combat['units'],key=lambda u:-u['speed']) if u['hp']>0 and u['id'] not in combat['actedIds']),None)


def plan_action(combat,fixture):
    """Plan from saved public values; this does not execute any game rule or mutate the save."""
    actor=actor_of(combat);assert actor and actor['team']=='party'
    enemies=[u for u in combat['units'] if u['team']=='enemy' and u['hp']>0]
    terrain={(t['x'],t['y']):t['kind'] for t in combat['terrain']}
    scorched={(t['x'],t['y']) for t in combat.get('scorched',[])}
    def kind(x,y):
        value=terrain.get((x,y),'road');return 'road' if value=='woods' and (x,y) in scorched else value
    def clear(a,b):
        x,y=a;tx,ty=b;dx,dy=abs(tx-x),abs(ty-y);sx=(tx>x)-(tx<x);sy=(ty>y)-(ty<y);ix=iy=0
        blocked=lambda x,y:fixture['terrain'][kind(x,y)]['blocksSight']
        while ix<dx or iy<dy:
            cx=(1+2*ix)*dy;cy=(1+2*iy)*dx
            if cx==cy:
                if blocked(x+sx,y) or blocked(x,y+sy):return False
                x+=sx;y+=sy;ix+=1;iy+=1
            elif cx<cy:x+=sx;ix+=1
            else:y+=sy;iy+=1
            if blocked(x,y):return False
        return True
    weapon=fixture['weapons'][actor['weapon']]
    def attack(tile,enemy):
        gap=abs(tile[0]-enemy['x'])+abs(tile[1]-enemy['y'])
        return weapon['min']<=gap<=weapon['max'] and clear(tile,(enemy['x'],enemy['y']))
    start=(actor['x'],actor['y']);occupied={(u['x'],u['y']) for u in combat['units'] if u['hp']>0 and u['id']!=actor['id']}
    move=weapon['move']+(1 if combat['route']=='sun' else 0)-max([e['value'] for e in actor.get('effects',[]) if e['kind']=='move-down']+[0])
    if actor['id'] in combat['movedIds']:move=0
    costs={start:0};paths={start:[]};queue=[(0,start)]
    while queue:
        cost,(x,y)=heapq.heappop(queue)
        if cost!=costs[(x,y)]:continue
        for tile in [(x+1,y),(x-1,y),(x,y+1),(x,y-1)]:
            tx,ty=tile
            if not(0<=tx<combat['width'] and 0<=ty<combat['height']) or tile in occupied:continue
            step=fixture['terrain'][kind(tx,ty)]['cost']
            if step is None:continue
            total=cost+step
            if total>=costs.get(tile,float('inf')):continue
            costs[tile]=total;paths[tile]=paths[(x,y)]+[tile];heapq.heappush(queue,(total,tile))
    fire={(f['x'],f['y']) for f in combat.get('fires',[])}
    attacks=[]
    for tile,cost in costs.items():
        if cost>move:continue
        for enemy in enemies:
            if attack(tile,enemy):
                score=(100 if enemy['hp']<=actor['attack'] else 0)+actor['attack']*10-enemy['hp']-cost*.1-(20 if tile in fire else 0)
                attacks.append((score,tile,enemy))
    if attacks:
        _,tile,target=max(attacks,key=lambda p:p[0]);return actor,{'x':tile[0],'y':tile[1]},target
    goals=[(cost,tile) for tile,cost in costs.items() if any(attack(tile,e) for e in enemies)]
    if not goals:return actor,actor,None
    _,goal=min(goals,key=lambda p:p[0]);tile=start;cost=0
    for step in paths[goal]:
        cost+=fixture['terrain'][kind(*step)]['cost']
        if cost>move:break
        tile=step
    return actor,{'x':tile[0],'y':tile[1]},None


def win_battle(page,fixture,touch=False):
    fire_used=native_used=checkpoint=False
    for step in range(160):
        state=player_turn(page);combat=state.get('activeBattle')
        if not combat:
            assert state['flags'].get('ambushWon'),'Battle did not award an actual victory'
            assert fire_used and native_used and checkpoint
            return step
        actor=actor_of(combat);assert actor and actor['team']=='party'
        if step%10==0: print(f'  combat action {step}, round {combat["round"]}, actor {actor["id"]}',flush=True)
        if not fire_used:
            activate(page.get_by_role('button',name='放火',exact=True),touch)
            options=page.get_by_label('目标格',exact=True).locator('option');assert options.count()
            labels=options.all_text_contents();index=next((i for i,text in enumerate(labels) if '树林' in text),0)
            page.get_by_label('目标格',exact=True).select_option(index=index)
            activate(page.get_by_role('button',name='对选中格施展',exact=True),touch)
            after=saved(page)['activeBattle']
            assert actor['id'] in after['actedIds'] and any('放火' in line for line in after.get('battleLog',[])),'Fire input did not consume a real action'
            fire_used=True;continue
        skill=page.locator('[data-battle-skill]:not(:disabled)').first
        if not native_used and actor['id']!='traveler' and skill.count():
            skill_id=skill.get_attribute('data-battle-skill')
            activate(skill,touch)
            choices=page.get_by_label('目标格',exact=True)
            if choices.locator('option').count():
                choices.select_option(index=0);activate(page.get_by_role('button',name='对选中格施展',exact=True),touch)
                after=next(u for u in saved(page)['activeBattle']['units'] if u['id']==actor['id'])
                assert after['martialReady'].get(skill_id,0)>combat['round'],'Native martial input did not set its real cooldown'
                native_used=True;continue
            activate(page.get_by_role('button',name='取消选取',exact=True),touch)
        if native_used and not checkpoint:
            before=copy.deepcopy(combat)
            reload_continue(page,touch);after=player_turn(page)['activeBattle']
            for key in ['randomSeed','round','units','fires','scorched','movedIds','actedIds']:
                assert before.get(key)==after.get(key),f'Checkpoint changed {key}'
            assert not saved(page).get('battleRecovery');checkpoint=True
            page.screenshot(path=str(OUT/f'battle-checkpoint-{page.viewport_size["width"]}.png'),full_page=True)
            continue
        actor,tile,target=plan_action(combat,fixture)
        canvas=page.locator('#game-container canvas');canvas.scroll_into_view_if_needed();top=canvas.bounding_box()['y']
        tile_click(page,actor,touch)
        assert abs(canvas.bounding_box()['y']-top)<1,'Selecting a unit moved the canvas between pointer inputs'
        if (tile['x'],tile['y'])!=(actor['x'],actor['y']):
            tile_click(page,tile,touch)
            moved=next(u for u in saved(page)['activeBattle']['units'] if u['id']==actor['id'])
            if (moved['x'],moved['y'])!=(tile['x'],tile['y']):
                page.screenshot(path=str(OUT/f'failed-movement-{page.viewport_size["width"]}.png'),full_page=True)
                diagnostic={'actor':actor,'expected':tile,'actual':moved,'startMenuCount':page.locator('.start-menu').count(),'commands':page.locator('#battle-commands').inner_text()}
                (OUT/'failed-movement.json').write_text(json.dumps(diagnostic,ensure_ascii=False,indent=2),encoding='utf-8')
                raise AssertionError(f'Pointer movement did not match legal plan: {diagnostic}')
        if target:tile_click(page,target,touch)
        else:activate(page.get_by_role('button',name='守势 / 结束行动',exact=True),touch)
    raise AssertionError('Battle did not finish after 160 real party actions')


def travel_to_shu(page,touch):
    page.locator('#world-destination').select_option('shu');activate(page.locator('#start-travel'),touch)
    assert saved(page)['journey']['path'][-1]=='shu'
    for _ in range(40):
        state=saved(page)
        if not state.get('journey'):break
        event=state['journey'].get('event')
        if event:
            if not event.get('cgSeen'):activate(page.get_by_role('button',name='继续 · 处理见闻',exact=True),touch)
            kind=event['kind'];name={'rain':'等候2日 · 无需军需','ferry':'等候2日 · 无需军需','bandits':'绕路3日 · 士气−1','wolves':'避开狼群 · 绕行3日 / 士气−1','merchant':'辞别商旅，继续赶路','refugees':'留下祝愿，继续赶路','contact':'暂不拜访，继续赶路','market-news':'记下行情，继续行程'}[kind]
            activate(page.get_by_role('button',name=name,exact=True),touch)
        else:
            page.locator('#travel-days').fill('7');activate(page.locator('#continue-travel'),touch)
    assert saved(page)['currentCityId']=='shu' and not saved(page).get('journey')
    expect(page.locator('.world-header h1')).to_contain_text('舒')
    activate(page.locator('#enter-city'),touch);expect(page.locator('.trade-card')).to_have_count(10)
    activate(page.get_by_role('button',name='出城 · 返回地图',exact=True),touch)


def main():
    results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        fixture=None
        for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
            if os.environ.get('H5_WIDTHS') and str(width) not in os.environ['H5_WIDTHS'].split(','):continue
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
            remote=[];failures=[];errors=[]
            if OFFLINE:
                origin=urlsplit(URL)
                def local_only(route):
                    parsed=urlsplit(route.request.url)
                    if parsed.scheme in ['data','blob'] or parsed.scheme==origin.scheme and parsed.netloc==origin.netloc:route.continue_()
                    else:remote.append(route.request.url);route.abort()
                context.route('**/*',local_only)
            page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('response',lambda response:failures.append(response.url) if response.status>=400 else None)
            page.goto(URL,wait_until='networkidle')
            menu=page.locator('.start-menu');expect(menu).to_be_visible()
            expect(menu.get_by_role('button',name='继续游戏',exact=True)).to_be_disabled()
            assert_menu_bounds(page)
            page.screenshot(path=str(OUT/f'start-menu-{width}x{height}.png'),full_page=True)
            activate(menu.get_by_role('button',name='重新开始',exact=True),touch)
            expect(page.locator('#hero-name')).to_be_visible();page.locator('#hero-name').fill('世代行者');activate(page.locator('.name-entry button'),touch)
            activate(page.get_by_role('button',name='踏上逃难路',exact=True),touch)
            state=saved(page);assert len(state['life']['people'])==73 and len(state['worldConflict']['cities'])==60
            if fixture is None:
                fixture=json.loads(FIXTURES.read_text(encoding='utf-8')) if OFFLINE else export_fixtures(page)
            put(page,fixture['contact'],touch)
            expect(page.get_by_role('button',name='拜访曹操',exact=True)).to_have_count(0)
            activate(page.get_by_role('button',name='拜访曹丕',exact=True),touch)
            expect(page.get_by_role('heading',name='拜访曹丕',exact=True)).to_be_visible()
            activate(page.get_by_role('button',name='停留1日，记下交情',exact=True),touch)
            assert saved(page)['flags'].get('met:cao');expect(page.locator('.world-sidebar')).to_contain_text('已结识曹丕')
            put(page,fixture['ghost'],touch)
            expect(page.get_by_role('button',name='拜访曹丕',exact=True)).to_have_count(0);expect(page.get_by_role('button',name='拜访曹操',exact=True)).to_have_count(0)
            put(page,fixture['city'],touch);travel_to_shu(page,touch)
            legacy=json.loads((ROOT/'src'/'game'/'fixtures'/'v08-saves.json').read_text(encoding='utf-8'))['journey']
            put(page,legacy,touch);restored=saved(page)
            assert restored['journey']==legacy['journey'] and restored['economy']['coins']==legacy['economy']['coins']
            assert len(restored['worldConflict']['cities'])==60
            verify_life_action_details(page,fixture,touch)
            put(page,fixture['memorial'],touch)
            activate(page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True),touch)
            expect(page.locator('[data-life-notices]')).to_contain_text('曹操 · 本局于225年离世')
            assert saved(page)['life']['memorials']['cao-cao']['progress']['level']==5
            assert saved(page)['martial']['equipped']==['martial-cao-cao']
            activate(page.locator('#life-notices-dismiss'),touch);reload_continue(page,touch);expect(page.locator('[data-life-notices]')).to_have_count(0)
            put(page,fixture['battle'],touch);activate(page.locator('#world-party'),touch)
            print(f'CHECK {width}x{height}: succession/city/migration/memorial passed; checking portraits and real battle',flush=True)
            portraits=[]
            for person in FIGHTERS[1:]:
                activate(page.locator(f'[data-member="{person}"]').get_by_role('button',name='详情',exact=True),touch)
                image=page.locator('.character-details .character-art img');expect(image).to_have_attribute('src',f'/assets/characters/{person}-v1.png')
                page.wait_for_function("selector=>{const img=document.querySelector(selector);return img&&img.complete&&img.naturalWidth>0}",arg='.character-details .character-art img')
                portraits.append(image.get_attribute('src'));expect(page.locator(f'[data-martial-person="{person}"]')).to_be_visible()
                activate(page.get_by_role('button',name='关闭人物详情',exact=True),touch)
            assert len(set(portraits))==4
            activate(page.locator('.party-panel .company-header button'),touch)
            activate(page.get_by_role('button',name='当地故事',exact=True),touch);activate(page.get_by_role('button',name='进入战斗',exact=True),touch)
            expect(page.locator('#battle-commands')).to_be_visible()
            combat=player_turn(page)['activeBattle'];assert [u['id'] for u in combat['units'] if u['team']=='party']==FIGHTERS
            for person in FIGHTERS[1:]:assert next(u for u in combat['units'] if u['id']==person)['martialIds']==[f'martial-{person}']
            actions=win_battle(page,fixture,touch)
            expect(page.get_by_role('heading',name='路口让开了，你们也更坚韧了。',exact=True)).to_be_visible()
            page.screenshot(path=str(OUT/f'victory-{width}x{height}.png'),full_page=True)
            final=saved(page);assert all(final['party'][id]['xp']!=fixture['battle']['party'][id]['xp'] for id in FIGHTERS)
            activate(page.get_by_role('button',name='继续行旅',exact=True),touch)
            expect(page.locator('#world-root')).to_be_visible()
            coins=final['economy']['coins']
            activate(page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True),touch)
            final=saved(page);assert final['economy']['coins']==coins+20
            reload_continue(page,touch);continued=saved(page)
            assert continued['date']==final['date'] and continued['economy']==final['economy'] and continued['party']==final['party'],'Continue reset the completed journey'
            page.reload(wait_until='networkidle');menu=page.locator('.start-menu');expect(menu).to_be_visible()
            activate(menu.get_by_role('button',name='重新开始',exact=True),touch)
            expect(page.locator('#hero-name')).to_be_visible();expect(page.locator('#hero-name')).to_have_value('')
            restarted=saved(page);assert restarted['phase']=='prologue' and restarted['date']['year']==184 and restarted['economy']['coins']==600
            assert not remote and not failures and not errors,{'remote':remote,'failures':failures,'errors':errors}
            results.append({'viewport':[width,height],'offline':OFFLINE,'startMenuNewAndContinue':True,'newGame73Lives60Cities':True,'livingCaoPiContact':True,'noGhostContact':True,'newCityArrival':True,'legacyJourneyPreserved':True,'memorialRetained':True,'lifeActionDetailsRefreshed':True,'independentPortraits':portraits,'fivePersonVictory':True,'realActions':actions,'fireAndNativeMartial':True,'checkpointReload':True,'errors':errors})
            print(f'PASS {width}x{height}: naming / succession / new city / migration / memorial / portraits / five-person victory ({actions} pointer actions)',flush=True)
            context.close()
        browser.close()
    (OUT/('production-results.json' if OFFLINE else 'dev-results.json')).write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')


if __name__=='__main__':main()
