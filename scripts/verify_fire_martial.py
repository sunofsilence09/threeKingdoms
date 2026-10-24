"""Actual pointer/touch smoke for 0.8; uses persisted snapshots for observation."""
import copy
import json
import os
from pathlib import Path
from time import monotonic
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('H5_URL', 'http://127.0.0.1:5173')
OFFLINE = os.environ.get('H5_OFFLINE') == '1'
KEY = 'three-kingdoms-demo-state'
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'fire-martial'
OUT.mkdir(parents=True, exist_ok=True)

def saved(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def put(page, state):
    page.evaluate('([key,state])=>localStorage.setItem(key,JSON.stringify(state))', [KEY, state])
    page.reload(wait_until='networkidle')

def click_tile(page, unit, touch=False):
    # Default full-board view: 16×10 at36px, centred inside the630×360 viewport.
    page.locator('#game-container canvas').scroll_into_view_if_needed()
    box = page.locator('#game-container canvas').bounding_box()
    x = box['x'] + box['width'] * (51 + (unit['x'] + .5) * 36) / 960
    y = box['y'] + box['height'] * (118 + (unit['y'] + .5) * 36) / 540
    (page.touchscreen.tap if touch else page.mouse.click)(x, y)
    page.wait_for_timeout(100)

def player_turn(page):
    deadline = monotonic() + 12
    while monotonic() < deadline:
        state = saved(page)
        combat = state.get('activeBattle')
        if not combat and state['phase'] != 'battle': return state
        if combat and combat['turn'] == 'party': return state
        page.wait_for_timeout(80)
    raise AssertionError('Enemy did not yield its action')

def teach_fixture(base):
    state = copy.deepcopy(base)
    state.update(phase='overworld', currentCityId='yingchuan', heroName='陆长安')
    for key in ['activeBattle','duel','journey','encounter','battleParty','worldConflict','conflictMigration']:
        state.pop(key, None)
    state['party']['zhou-yu'] = copy.deepcopy(state['party']['aman'])
    state['relationships']['zhou-yu'] = {'affinity': 100}
    state['martial']['seed'] = 1
    return state

def show_teacher(page):
    page.locator('#world-party').click()
    page.locator('[data-member="zhou-yu"]').get_by_role('button', name='详情', exact=True).click()
    expect(page.locator('[data-martial-person="zhou-yu"]')).to_contain_text('火神')

def win_duel(page):
    for step in range(45):
        state = player_turn(page)
        combat = state.get('activeBattle')
        if not combat: return state
        actor = next(u for u in sorted(combat['units'],key=lambda u:-u['speed']) if u['hp']>0 and u['id'] not in combat['actedIds'])
        assert actor['id'] == 'traveler'
        enemy = next(u for u in combat['units'] if u['team']=='enemy' and u['hp']>0)
        if abs(actor['x']-enemy['x'])+abs(actor['y']-enemy['y']) == 1:
            click_tile(page,enemy)
        else:
            # Let the sparring partner approach. This is a real guarded action.
            page.get_by_role('button', name='守势 / 结束行动', exact=True).click()
    raise AssertionError('Duel failed to resolve with legal pointer actions')

def main():
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for width,height,touch in [(1440,1000,False),(390,844,True),(844,390,True)]:
      ctx = browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
      if OFFLINE: ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith(('data:','blob:')) else route.abort())
      page=ctx.new_page(); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
      page.goto(URL,wait_until='networkidle')
      expect(page.locator('#hero-name')).to_be_visible()
      page.locator('#hero-name').fill('a');page.locator('.name-entry button').click()
      expect(page.locator('#hero-name-error')).not_to_be_empty()
      page.locator('#hero-name').fill('陆长安');page.locator('#hero-name').press('Enter')
      page.get_by_role('button',name='踏上逃难路',exact=True).click()
      expect(page.locator('#world-root')).to_be_visible()
      expect(page.locator('.hero-heading strong')).to_have_text('陆长安')
      base=saved(page);page.reload(wait_until='networkidle');expect(page.locator('#hero-name')).to_have_count(0)
      # Legacy name/martial migration must retain all prior progress.
      legacy=copy.deepcopy(base);legacy.pop('heroName');legacy.pop('martial');legacy['economy']['coins']=1234
      put(page,legacy);expect(page.locator('#hero-name')).to_be_visible()
      page.locator('#hero-name').fill('云中客');page.locator('.name-entry button').click()
      assert saved(page)['economy']['coins']==1234 and saved(page)['date']==base['date']
      # Actual teaching -> equip -> native skill list and hero skill use.
      state=teach_fixture(base);put(page,state);show_teacher(page)
      before=saved(page)
      page.get_by_role('button',name='请教武学 · 1日',exact=True).click()
      expect(page.locator('.martial-feedback')).to_contain_text('已学会')
      learned=saved(page);assert 'martial-zhou-yu' in learned['martial']['learned']
      assert learned['date']!=before['date'];page.reload(wait_until='networkidle')
      assert saved(page)['martial']==learned['martial']
      page.locator('#world-party').click()
      page.get_by_role('button',name='主角武学',exact=True).click()
      page.get_by_role('button',name='装配《火神》',exact=True).click()
      assert saved(page)['martial']['equipped']==['martial-zhou-yu']
      page.keyboard.press('Escape');page.keyboard.press('Escape')
      battle_state=saved(page);battle_state.update(phase='battle',encounter='ambush',battleParty=['traveler'],deployed=['traveler'])
      battle_state['martial']['seed']=1
      put(page,battle_state);player_turn(page)
      expect(page.locator('#battle-commands')).to_be_visible()
      fire_button=page.get_by_role('button',name='放火',exact=True)
      (fire_button.tap if touch else fire_button.click)()
      expect(page.get_by_label('目标格',exact=True)).to_be_visible()
      labels=page.get_by_label('目标格',exact=True).locator('option').all_text_contents()
      assert any('点燃' in label for label in labels)
      page.get_by_role('button',name='取消选取',exact=True).click()
      page.locator('[data-battle-skill="martial-zhou-yu"]').click()
      opts=page.get_by_label('目标格',exact=True).locator('option').all_text_contents()
      forest=next((i for i,text in enumerate(opts) if '树林' in text),0)
      page.get_by_label('目标格',exact=True).select_option(index=forest)
      cast_button=page.get_by_role('button',name='对选中格施展',exact=True)
      (cast_button.tap if touch else cast_button.click)()
      state=player_turn(page);combat=state['activeBattle']
      assert combat['units'][0]['martialReady']['martial-zhou-yu']>1
      assert any('火神' in line for line in combat['battleLog'])
      assert combat.get('fires'), 'Seeded real fire god action must ignite the forest'
      expect(page.locator('#battle-commands')).to_contain_text('当前火格')
      page.reload(wait_until='networkidle');state=player_turn(page)
      assert state['activeBattle']['randomSeed']==combat['randomSeed']
      assert state['activeBattle']['round']==combat['round']
      assert state['activeBattle'].get('fires')==combat.get('fires')
      assert not state.get('battleRecovery')
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
      page.screenshot(path=str(OUT/f'battle-{width}.png'),full_page=True)
      if not touch:
        # An ongoing checkpoint cannot strand boot with an exhausted action queue.
        broken=copy.deepcopy(state)
        broken['activeBattle']['actedIds']=[unit['id'] for unit in broken['activeBattle']['units']]
        broken['activeBattle']['selectedId']=None
        put(page,broken);repaired=player_turn(page)
        assert repaired['phase']=='battle' and repaired.get('activeBattle')
        assert repaired['party']==state['party'] and repaired['economy']==state['economy']
        assert repaired['date']==state['date']
        assert page.evaluate('(key)=>!!localStorage.getItem(key+":active-battle-backup")',KEY)
        assert any(unit['hp']>0 and unit['id'] not in repaired['activeBattle']['actedIds'] for unit in repaired['activeBattle']['units'])
      page.get_by_role('button',name='撤退',exact=True).click()
      expect(page.locator('#world-root')).to_be_visible()
      # Real 1v1 entry and loss settlement, including refresh without respawning.
      state=teach_fixture(base);state['relationships']['zhou-yu']={'affinity':0}
      put(page,state);show_teacher(page)
      expect(page.get_by_role('button',name='请教武学 · 1日',exact=True)).to_be_disabled()
      page.get_by_role('button',name='切磋 · 1对1 · 1日',exact=True).click()
      state=player_turn(page);assert state['duel']['teacherId']=='zhou-yu'
      assert [u['id'] for u in state['activeBattle']['units'] if u['team']=='party']==['traveler']
      assert len(state['activeBattle']['units'])==2
      assert state['activeBattle']['units'][1]['martialIds']==['martial-zhou-yu']
      token=state['duel']['id'];page.reload(wait_until='networkidle');player_turn(page)
      assert saved(page)['duel']['id']==token
      page.get_by_role('button',name='撤退',exact=True).click()
      expect(page.get_by_role('button',name='返回城池',exact=True)).to_be_visible()
      final=saved(page);assert token in final['martial']['settled'] and final['martial']['lastResult']['outcome']=='lost'
      assert final['party']['traveler']==base['party']['traveler']
      page.reload(wait_until='networkidle');expect(page.locator('#world-root')).to_be_visible()
      assert saved(page)['martial']==final['martial']
      page.screenshot(path=str(OUT/f'world-{width}.png'),full_page=True)
      if not touch:
        # A challenge launched from an ending/growth overlay must navigate globally.
        ending=teach_fixture(base);ending['phase']='ending'
        put(page,ending)
        page.get_by_role('button',name='分配技能点',exact=True).click()
        page.get_by_role('button',name='周瑜',exact=True).click()
        page.get_by_role('button',name='切磋 · 1对1 · 1日',exact=True).click()
        assert player_turn(page)['duel']['teacherId']=='zhou-yu'
        page.get_by_role('button',name='撤退',exact=True).click()
        page.get_by_role('button',name='返回城池',exact=True).click()
        state=teach_fixture(base);state['relationships']['zhou-yu']={'affinity':0}
        state['party']['traveler'].update(level=10,xp=0,points=0)
        state['party']['traveler']['attributes'].update(strength=30,command=17)
        state['martial']['seed']=1
        put(page,state);show_teacher(page)
        page.get_by_role('button',name='切磋 · 1对1 · 1日',exact=True).click()
        final=win_duel(page)
        assert final['martial']['lastResult']['outcome'] in ['learned','declined']
        assert final['martial']['lastResult']['kind']=='duel'
        assert final['party']==state['party']
      assert not errors,errors
      print(f'PASS {width}x{height}: name/legacy/teach/equip/firegod/checkpoint/duel'+(' and real victory' if not touch else ' touch layout'),flush=True)
      ctx.close()
    browser.close()

if __name__=='__main__':main()
