"""0.7 browser acceptance: persistent armies, occupation, dynamic officials and save recovery."""
import copy
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL
from verify_trade_events import saved, seed, new_city, close_city, travel_to
from verify_city_offices import arrive

LOCAL='--local' in sys.argv
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'dynamic-conquest'
OUT.mkdir(parents=True,exist_ok=True)
KEY='three-kingdoms-demo-state'

def legacy(base,city='xiangyang',year=200,month=3):
    state=new_city(base,city,year,month)
    state.pop('worldConflict',None);state.pop('conflictRecovery',None)
    return state
def office(page):
    page.locator('#enter-city').click();page.get_by_role('button',name='府署名册',exact=True).click()
def reports(page):page.locator('#world-conflict').click()
def close_reports(page):page.locator('.conflict-panel').get_by_role('button',name='返回地图',exact=True).click()
def work(page):page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True).click()
def replenish_ledger(world):
    world['ledger']={'initial':sum(city['troops'] for city in world['cities'].values())+sum(army['troops'] for army in world['armies']),'recruited':0,'raised':0,'losses':0}

def siege_fixture(page,base,won=True,current='xiangyang',owned_ruler=False):
    state=legacy(base,current)
    if owned_ruler:state['party']['liu-biao']=copy.deepcopy(state['party']['traveler'])
    seed(page,state);state=saved(page);world=state['worldConflict']
    for city in world['cities'].values():city.pop('governorId',None)
    world['cities']['nanyang'].update(factionId='cao',troops=2000,occupationDay=-1)
    world['cities']['xiangyang'].update(factionId='liu-biao',troops=1000 if won else 19000,occupationDay=-1)
    world['cities']['jiangling'].update(factionId='liu-biao',occupationDay=-1)
    world['armies']=[{'id':'army-999','factionId':'cao','sourceCityId':'nanyang','targetCityId':'xiangyang','troops':3000 if won else 2000,
      'contributions':[{'cityId':'nanyang','troops':3000 if won else 2000}], 'phase':'sieging','path':['nanyang','xiangyang'],'legIndex':1,'legDay':0,'phaseDays':1}]
    world['nextArmyId']=1000;world['nextDecision']={key:world['lastDay']+30 for key in world['nextDecision']};world['reports']=[]
    replenish_ledger(world);seed(page,state)
    assert not saved(page).get('conflictRecovery'),'campaign fixture was rejected'
    return saved(page)

def interactions(browser,base):
    for width,height,touch in [(1440,1000,False),(390,844,True)]:
      ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=touch,is_mobile=touch)
      if LOCAL:ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith(('data:','blob:')) else route.abort())
      page=ctx.new_page();page.goto(URL,wait_until='networkidle');siege_fixture(page,base,current='nanyang')
      before=saved(page);expect(page.locator('[data-conflict-migration]')).to_be_visible()
      page.locator('#conflict-migration-dismiss').click();assert saved(page)['worldConflict']==before['worldConflict']
      page.reload(wait_until='networkidle');expect(page.locator('[data-conflict-migration]')).to_have_count(0)
      if not touch:
        page.locator('[data-city-id="ye"]').click();expect(page.locator('#world-destination')).to_have_value('ye')
        page.locator('[data-army-id="army-999"]').click();expect(page.locator('.conflict-army-detail')).to_contain_text('围城')
        page.get_by_role('button',name='返回',exact=True).click()
      if touch:page.locator('#world-conflict').tap()
      else:reports(page)
      page.locator('#conflict-faction-filter').select_option('cao')
      assert page.locator('[data-conflict-city]').count()>0
      for text in page.locator('[data-conflict-city]').all_inner_texts():assert '曹氏军府' in text
      tab=page.get_by_role('button',name='在外军队',exact=True)
      if touch:tab.tap()
      else:tab.click()
      button=page.get_by_role('button',name='查看军队详情',exact=True)
      if touch:button.tap()
      else:button.click()
      expect(page.locator('.conflict-army-detail')).to_contain_text('襄阳')
      page.keyboard.press('Escape');expect(page.locator('#conflict-faction-filter')).to_have_value('cao')
      assert '查看军队详情' in page.evaluate('document.activeElement.textContent')
      page.keyboard.press('Escape');assert page.evaluate('document.activeElement.id')=='world-conflict'
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
      page.screenshot(path=str(OUT/f'interaction-{width}.png'));ctx.close()
    print('PASS: migration notice dismisses once; map city/army selection, faction filter, nested Escape/focus and real phone touch',flush=True)

def main():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000})
    if LOCAL:context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(URL) or route.request.url.startswith(('data:','blob:')) else route.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL,wait_until='networkidle');base=saved(page)
    if '--interactions-only' in sys.argv:
      interactions(browser,base);browser.close();return
    old=legacy(base,'yingchuan');old['economy']['coins']=4321;old['economy']['cargo']['salt']={'quantity':2,'cost':40}
    old['relationships']['garrison:yingchuan:captain']={'affinity':79}
    seed(page,old);migrated=saved(page)
    assert migrated['economy']==old['economy'] and migrated['party']==old['party'] and migrated['relationships']==old['relationships']
    assert migrated['worldConflict']['lastDay']==((200-184)*360+2*30)
    assert len(migrated['worldConflict']['cities'])==36
    before=saved(page);page.reload(wait_until='networkidle');assert saved(page)==before
    reports(page);expect(page.locator('[data-conflict-city]')).to_have_count(36)
    page.get_by_role('button',name='在外军队',exact=True).click();page.get_by_role('button',name='天下战报',exact=True).click();close_reports(page)
    assert saved(page)==before,'opening reports advanced or mutated the world'
    office(page);page.get_by_role('button',name='市集买卖',exact=True).click();page.locator('[data-good="tea"]').get_by_role('button',name='买入',exact=True).click();close_city(page)
    assert saved(page)['worldConflict']==before['worldConflict'],'trading advanced the world'
    print('PASS:0.6 migration preserves RPG economy/roster/relations,36 cities and exact clock; render/trade do not simulate',flush=True)

    original=siege_fixture(page,base,owned_ruler=True)
    expected_party=copy.deepcopy(original['party'])
    reports(page);page.get_by_role('button',name='在外军队',exact=True).click();expect(page.locator('[data-conflict-army]')).to_have_count(1)
    page.screenshot(path=str(OUT/'army-before-siege.png'));close_reports(page)
    work(page);settled=saved(page)
    assert settled['worldConflict']['cities']['xiangyang']['factionId']=='cao'
    assert 0<settled['worldConflict']['cities']['xiangyang']['troops']<=3000
    assert settled['party']==expected_party
    assert any(report['kind'] in ['occupation','victory','capture'] for report in settled['worldConflict']['reports'])
    office(page);expect(page.locator('[data-staff="garrison:xiangyang:captain"]')).to_contain_text('邀请门槛 80')
    expect(page.locator('[data-staff="liu-biao"]')).to_have_count(0)
    expect(page.locator('[data-staff="garrison:xiangyang:soldier"]')).to_contain_text('不能邀请')
    page.screenshot(path=str(OUT/'occupied-city.png'));close_city(page)
    before=saved(page);page.reload(wait_until='networkidle');assert saved(page)==before,'reload repeated war settlement'
    reports(page);page.get_by_role('button',name='天下战报',exact=True).click();assert page.locator('[data-conflict-report]').count()>0
    expect(page.locator('.conflict-panel')).to_contain_text('襄阳');page.screenshot(path=str(OUT/'occupation-report.png'));close_reports(page)
    print('PASS: real elapsed-day siege→occupation, changed government/captain threshold, old owned ruler retained, saved result once',flush=True)

    original=siege_fixture(page,base,won=False);work(page);failed=saved(page)
    assert failed['worldConflict']['cities']['xiangyang']['factionId']=='liu-biao'
    assert failed['worldConflict']['cities']['nanyang']['troops']==2000,'retreat restored troops instantly'
    assert any(army['phase']=='retreating' for army in failed['worldConflict']['armies'])
    for _ in range(20):
      if not any(army['id']=='army-999' for army in saved(page)['worldConflict']['armies']):break
      work(page)
    returned=saved(page);assert returned['worldConflict']['cities']['nanyang']['troops']>2000
    assert not any(army['id']=='army-999' for army in returned['worldConflict']['armies'])
    assert returned['worldConflict']['ledger']['losses']>0
    print('PASS: actual defeat keeps city, loses troops and only returns survivors after road travel',flush=True)

    siege_fixture(page,base,current='nanyang');travel_to(page,'xiangyang')
    page.locator('#travel-days').fill('1');page.locator('#continue-travel').click()
    assert saved(page)['worldConflict']['cities']['xiangyang']['factionId']=='cao'
    arrive(page);assert saved(page)['currentCityId']=='xiangyang'
    assert saved(page)['worldConflict']['lastDay']==((saved(page)['date']['year']-184)*360+(saved(page)['date']['month']-1)*30+saved(page)['date']['day']-1)
    office(page);expect(page.locator('[data-staff="liu-biao"]')).to_have_count(0);close_city(page)
    print('PASS: destination changes owner while traveling; arrival and personnel use the new world',flush=True)

    # Recruiting a leader before founding must release existing subordinates too.
    state=legacy(base,'yingchuan',184,3)
    state['relationships'].update({'sun-jian':{'affinity':60},'han-dang':{'affinity':60}})
    seed(page,state);page.locator('#world-recruitment').click()
    page.locator('[data-person="sun-jian"]').get_by_role('button',name='邀请同行',exact=True).click()
    assert 'sun-jian' in saved(page)['party'];page.keyboard.press('Escape')
    travel_to(page,'nanyang');arrive(page);office(page)
    expect(page.locator('[data-staff="han-dang"]')).to_contain_text('待聘')
    expect(page.locator('[data-staff="han-dang"]')).to_contain_text('邀请门槛 60')
    page.locator('#office-talk-han-dang').click()
    page.locator('[data-person="han-dang"]').get_by_role('button',name='邀请同行',exact=True).click()
    assert 'han-dang' in saved(page)['party']
    page.keyboard.press('Escape');close_city(page)
    print('PASS: actual pre-foundation leader invitation releases subordinate to waiting60 across city travel',flush=True)

    # Corrupt only the strategic field; valid player data must survive with an explicit recovery action.
    state=legacy(base,'runan');state['economy']['coins']=6789;state['worldConflict']={'version':1,'broken':True}
    seed(page,state);damaged=saved(page);assert damaged.get('conflictRecovery') is True
    assert damaged['economy']['coins']==6789 and damaged['party']==state['party']
    assert page.evaluate('(key)=>!!localStorage.getItem(key+":conflict-backup")',KEY)
    page.reload(wait_until='networkidle');assert saved(page).get('conflictRecovery') is True
    page.get_by_role('button',name='重建天下局势（保留人物与行旅）',exact=True).click()
    repaired=saved(page);assert not repaired.get('conflictRecovery') and repaired.get('worldConflict')
    assert repaired['economy']==state['economy'] and repaired['party']==state['party']
    print('PASS: malformed world is backed up and paused; explicit recovery retains RPG save',flush=True)

    for width,height in [(844,390),(390,844)]:
      page.set_viewport_size({'width':width,'height':height});siege_fixture(page,base,current='nanyang')
      reports(page)
      for tab in ['城池势力','在外军队','天下战报']:
        page.get_by_role('button',name=tab,exact=True).click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
      page.screenshot(path=str(OUT/f'war-reports-{width}.png'));close_reports(page)
      page.screenshot(path=str(OUT/f'world-{width}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert not errors,errors
    print('PASS: map, armies and reports in both phone orientations; no page exceptions'+(' offline' if LOCAL else ''),flush=True)
    interactions(browser,base);browser.close()

if __name__=='__main__':main()
