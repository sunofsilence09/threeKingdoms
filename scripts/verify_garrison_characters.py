"""Historical fallback UI regression: armies, captains, calendar art and NPCs.

The strategic clock is explicitly paused for these fixed career/troop fixtures;
verify_dynamic_conquest.py covers current dynamic ownership and personnel.
"""
import copy
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, click_canvas, wait_scene, battle, win_battle
from verify_trade_events import saved, seed, new_city as base_city, close_city, travel_to

LOCAL='--local' in sys.argv
SKIP_BATTLE=LOCAL or '--skip-battle' in sys.argv
ART='--no-art' not in sys.argv
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'garrison-characters'
OUT.mkdir(parents=True,exist_ok=True)
PEOPLE=['xiahou-dun','xiahou-yuan','cao-ren','cao-xiu','liu-biao','liu-zhang','zhang-lu','ma-teng','himiko','gongsun-zan','yuan-shao','liu-yu','zhang-yan']

def new_city(*args,**kwargs):
    state=base_city(*args,**kwargs)
    state.pop('worldConflict',None);state.pop('conflictMigration',None)
    state['conflictRecovery']=True
    return state

def office(page):
    page.locator('#enter-city').click();page.get_by_role('button',name='府署名册',exact=True).click()
def office_action(page,action,identity):page.locator(f'[id="office-{action}-{identity}"]').click()
def close_recruitment(page):page.locator('.recruitment-panel .company-header button').click()
def decode(locator):
    if ART:locator.evaluate('(image)=>image.decode()')
def show_local(page,identity):
    page.locator('#world-recruitment').click();return page.locator(f'[data-person="{identity}"]')

def main():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':1000})
    if LOCAL:context.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL) or r.request.url.startswith(('data:','blob:')) else r.abort())
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(URL,wait_until='networkidle');base=saved(page);seed(page,new_city(base,'runan'))
    paths=[f'/assets/characters/{identity}-v1.png' for identity in PEOPLE+['xiahou-dun-uninjured','local-soldier','local-captain']]
    if ART:page.evaluate('async paths=>{await Promise.all(paths.map(async path=>{const img=new Image();img.src=path;await img.decode();if(img.naturalHeight<=img.naturalWidth)throw new Error(path)}))}',paths)
    assert page.locator('[data-city-id]').count()==36

    for city in ['runan','nanzheng','wujun']:
      seed(page,new_city(base,city));office(page)
      expect(page.locator('[data-garrison-city]')).to_have_attribute('data-troops','5000')
      expect(page.locator('.garrison-summary')).to_contain_text('共同管理')
      expect(page.locator(f'[data-staff="garrison:{city}:captain"]')).to_contain_text('邀请门槛 80')
      soldier=page.locator(f'[data-staff="garrison:{city}:soldier"]')
      expect(soldier).to_contain_text('不能邀请');assert soldier.get_by_role('button',name='交谈与邀请',exact=True).count()==0
      office_action(page,'details',f'garrison:{city}:soldier')
      expect(page.locator('.character-details')).to_have_attribute('data-character',f'garrison:{city}:soldier')
      expect(page.locator('.character-army')).to_contain_text('50000');expect(page.locator('.character-army')).to_contain_text('15000')
      decode(page.locator('.character-art img'));page.locator('.character-close').click();close_city(page)
    seed(page,new_city(base,'julu',184,11));office(page)
    expect(page.locator('[data-garrison-city]')).to_have_attribute('data-troops','3780')
    before=saved(page);page.reload(wait_until='networkidle');assert saved(page)==before
    office(page);expect(page.locator('[data-garrison-city]')).to_have_attribute('data-troops','3780')
    print('PASS: independent 5000-base armies, joint administration, time changes, summed strength, readonly troops and reload',flush=True)

    captain='garrison:runan:captain';state=new_city(base,'runan');state['relationships'][captain]={'affinity':79}
    seed(page,state);office(page);office_action(page,'talk',captain)
    card=page.locator(f'[data-person="{captain}"]');expect(card.get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
    state['relationships'][captain]={'affinity':60};seed(page,state);office(page);office_action(page,'talk',captain)
    card=page.locator(f'[data-person="{captain}"]');expect(card.get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
    card.get_by_role('button',name='帮忙 +10 · 免费 · 1日',exact=True).click();assert saved(page)['relationships'][captain]['affinity']==70
    close_recruitment(page);close_city(page);page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True).click()
    office(page);office_action(page,'talk',captain);card=page.locator(f'[data-person="{captain}"]')
    card.get_by_role('button',name='帮忙 +10 · 免费 · 1日',exact=True).click();card.get_by_role('button',name='邀请同行',exact=True).click()
    assert captain in saved(page)['party'];close_recruitment(page)
    expect(page.locator(f'[data-staff="{captain}"]')).to_have_count(0);expect(page.locator('.garrison-summary')).to_contain_text('士兵长缺任')
    expect(page.locator('[data-garrison-city]')).to_have_attribute('data-troops','5000')
    close_city(page);before=saved(page);page.reload(wait_until='networkidle');assert saved(page)==before
    office(page);expect(page.locator(f'[data-staff="{captain}"]')).to_have_count(0)
    state=new_city(base,'chenliu',190);state['party']['zhang-miao']=copy.deepcopy(base['party']['traveler']);seed(page,state);office(page)
    expect(page.locator('[data-staff="garrison:chenliu:captain"]')).to_contain_text('邀请门槛 60')
    expect(page.locator('[data-staff="garrison:chenliu:soldier"]')).to_contain_text('不能邀请')
    print('PASS: captain 60/79 refusal, real help60→70→80 invitation, army stays, no respawn and commander-owned waiting60',flush=True)

    # Non-historical, unowned NPCs previously fell back to the hero. Exercise real entry buttons.
    for identity,city,year in [('wang-yun','yingchuan',184),('sun-jian','nanyang',184),('sun-ce','danyang',195),('bandit','runan',184)]:
      seed(page,new_city(base,city,year));before=saved(page);card=show_local(page,identity)
      card.get_by_role('button',name='查看详情',exact=True).click()
      expect(page.locator('.character-details')).to_have_attribute('data-character',identity)
      page.locator('.character-close').click();assert saved(page)==before;close_recruitment(page)
    cases=[('xiahou-dun','dongjun',193),('xiahou-yuan','nanzheng',216),('cao-ren','xiangyang',219),('cao-xiu','shouchun',222),('liu-biao','xiangyang',200),('liu-zhang','shujun',200),('zhang-lu','nanzheng',200),('ma-teng','changan',200),('gongsun-zan','zhuo',190),('yuan-shao','ye',195),('liu-yu','ji',190),('zhang-yan','julu',190)]
    for identity,city,year in cases:
      seed(page,new_city(base,city,year));card=show_local(page,identity);card.get_by_role('button',name='查看详情',exact=True).click()
      expect(page.locator('.character-details')).to_have_attribute('data-character',identity);decode(page.locator('.character-art img'))
      page.locator('.character-close').click();close_recruitment(page)
    for year,suffix in [(193,'xiahou-dun-uninjured-v1.png'),(194,'xiahou-dun-v1.png')]:
      seed(page,new_city(base,'dongjun',year));office(page)
      assert page.locator('[data-staff="xiahou-dun"] img').get_attribute('src').endswith(suffix)
      office_action(page,'details','xiahou-dun');assert page.locator('.character-art img').get_attribute('src').endswith(suffix)
      assert page.locator('.character-model-preview').get_attribute('data-portrait').endswith(suffix)
      page.locator('.character-close').click();close_city(page)
    print('PASS: all twelve encounter characters, old NPC identity regression, calendar portraits and models',flush=True)

    state=new_city(base);state['relationships']['himiko']={'affinity':100};seed(page,state);page.locator('#world-recruitment').click()
    assert page.locator('[data-person="himiko"]').count()==0
    page.get_by_role('button',name='所有人物行踪',exact=True).click();assert page.locator('[data-person]').count()==124
    page.locator('#person-search').fill('卑弥呼');card=page.locator('[data-person="himiko"]')
    expect(card).to_contain_text('暂未开放相遇');assert card.get_by_role('button',name='邀请同行',exact=True).count()==0;assert card.get_by_role('button').count()==1
    card.get_by_role('button',name='查看详情',exact=True).click();decode(page.locator('.character-art img'))
    expect(page.locator('.character-equipment-note')).to_contain_text('暂未开放相遇');assert '达到60' not in page.locator('.character-equipment-note').inner_text()
    page.locator('.character-close').click();expect(page.locator('#person-search')).to_have_value('卑弥呼')
    page.locator('#person-search').fill('下邳');page.locator('#person-category').select_option('historical');assert page.locator('[data-person="gao-shun"]').count()==1
    assert page.locator('[data-person]').count()<10
    page.locator('#person-search').fill('');page.locator('#person-category').select_option('garrison');assert page.locator('[data-person]').count()==72
    page.screenshot(path=str(OUT/'garrison-catalog.png'));close_recruitment(page)
    print('PASS:124 profiles, read-only Himiko even100 affinity,72 troop/captain records, search/category and nested return',flush=True)

    state=new_city(base,'runan',200)
    fighters=['traveler',captain,'xiahou-dun','xiahou-yuan','cao-ren']
    for identity in fighters[1:]+['yuan-shao']:state['party'][identity]=copy.deepcopy(base['party']['traveler'])
    state['deployed']=fighters;reserve=copy.deepcopy(state['party']['yuan-shao'])
    seed(page,state);travel_to(page,'shouchun');fixture=saved(page);fixture['journey']['event']={'id':0,'kind':'bandits','cgSeen':True};seed(page,fixture)
    page.get_by_role('button',name='迎战匪徒',exact=True).click();page.reload(wait_until='networkidle')
    assert saved(page)['battleParty']==fighters
    if not LOCAL:
      wait_scene(page,'Battle');assert [u['weapon'] for u in battle(page)['units'] if u['team']=='party']==['cleaver','swordshield','glaive','bow','swordshield']
    page.screenshot(path=str(OUT/'garrison-party-battle.png'))
    if SKIP_BATTLE:click_canvas(page,350,98)
    else:win_battle(page)
    page.get_by_role('button',name='回到原行程',exact=True).click()
    assert saved(page)['party']['yuan-shao']==reserve
    if not SKIP_BATTLE:assert all(saved(page)['party'][identity]['level']==2 for identity in fighters)
    print('PASS: captain plus historical five-person lineup, reload/namespace/equipment/reserve'+(' retreat' if SKIP_BATTLE else ' actual victory'),flush=True)

    for width,height in [(844,390),(390,844)]:
      page.set_viewport_size({'width':width,'height':height});seed(page,new_city(base,'runan'));office(page)
      decode(page.locator('[data-staff="garrison:runan:captain"] img'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
      page.screenshot(path=str(OUT/f'army-{width}.png'))
      office_action(page,'details','garrison:runan:soldier');expect(page.locator('.character-army')).to_contain_text('50000')
      assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(OUT/f'troops-{width}.png'));page.locator('.character-close').click()
      office_action(page,'talk',captain);expect(page.locator(f'[data-person="{captain}"]')).to_contain_text('邀请门槛 80');close_recruitment(page);close_city(page)
    assert not errors,errors
    print('PASS: both phone orientations, army/NPC details, focus/overflow and no page errors'+(' offline' if LOCAL else ''),flush=True)
    browser.close()

if __name__=='__main__':main()
