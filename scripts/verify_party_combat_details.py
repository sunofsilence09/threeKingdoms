"""All nested inspection paths must use the correct battle unit or reserve."""
from playwright.sync_api import sync_playwright, expect
from verify_h5 import URL, battle, wait_scene, click_canvas

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1280,'height':900})
    page.goto(URL,wait_until='networkidle')
    page.evaluate('''async()=>{
      const {createInitialState}=await import('/src/game/state.ts');
      const {createProgress}=await import('/src/game/growth.ts');
      const s=createInitialState(()=>0);s.phase='battle';s.encounter='ambush';s.route='cao';s.flags['met:cao']=true;
      s.party['bandit-leader']=createProgress();s.relationships['bandit-leader']={affinity:60};
      localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(s));
    }''')
    page.reload(wait_until='networkidle');wait_scene(page,'Battle')
    units=battle(page)['units']
    hero=next(u for u in units if u['id']=='traveler')
    click_canvas(page,222,98)
    page.locator('[data-member="traveler"]').get_by_role('button',name='成长',exact=True).click()
    attack=page.locator('[data-ability="攻击"] strong').inner_text()
    hp=page.locator('[data-ability="最大体力"] strong').inner_text()
    preview_correct=attack==str(hero['attack']) and hp==str(hero['maxHp'])
    page.get_by_role('button',name='返回',exact=True).click()
    page.locator('[data-member="bandit-leader"]').get_by_role('button',name='成长',exact=True).click()
    page.get_by_role('button',name='查看山贼头目详情',exact=True).click()
    reserve_correct='候补' in page.locator('.character-battle-status').inner_text()
    page.keyboard.press('Escape');page.get_by_role('button',name='返回',exact=True).click()
    page.get_by_role('button',name='寻访人物',exact=True).click()
    page.locator('[data-person="aman"]').get_by_role('button',name='查看详情',exact=True).click()
    weapon=page.locator('[data-detail-stat="武器"] dd').inner_text()
    nested_correct=weapon=='拳脚'
    browser.close()
    assert preview_correct and reserve_correct and nested_correct, {'growth_preview':preview_correct,'reserve_identity':reserve_correct,'nested_battle_weapon':nested_correct,'attack':attack,'maxHp':hp,'weapon':weapon}
    print('PASS: actual battle growth preview, reserve/enemy identity separation, nested recruitment details')
