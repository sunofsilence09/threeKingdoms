from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import battle, click_canvas, click_tile, wait_scene, assert_hero, assert_text_bounds

ARTIFACTS = Path(__file__).resolve().parents[1] / 'artifacts'
ARTIFACTS.mkdir(exist_ok=True)


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")


def fixture(page, kind):
    # Explicit, isolated combat fixtures exercise HP thresholds and a known dodge roll.
    # Complete route runs are covered separately by verify_h5.py without fixtures.
    page.evaluate('''async kind => {
      const { game } = await import([...document.scripts].find(s => s.src.includes('/src/main.ts')).src);
      const scene = game.scene.getScene('Battle');
      scene.combat = { ...scene.combat, terrain: [], round: 1, movedIds: [], actedIds: [], turn: 'party', selectedId: 'traveler', randomSeed: 1,
        units: scene.combat.units.map(u => ({...u, ultimateUsed:false, empowered:false, guarded:false})) };
      const hero = scene.combat.units.find(u => u.id === 'traveler');
      const enemy = scene.combat.units.find(u => u.id === 'bandit-leader');
      hero.x=3; hero.y=4; enemy.x=4; enemy.y=4;
      if (kind === 'survival') hero.hp=Math.floor(hero.maxHp/2);
      if (kind === 'dodge') {
        hero.hp=10;
        scene.combat.units.forEach(u => { if(u.id!=='traveler' && u.id!=='bandit-leader') u.hp=0; });
        enemy.hp=enemy.maxHp=20;
      }
      scene.renderBoard();
    }''', kind)


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1280, 820), (844, 390), (390, 844)]:
            touch = width != 1280
            context = browser.new_context(viewport={'width':width,'height':height},has_touch=touch)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.goto('http://127.0.0.1:5173',wait_until='networkidle')
            page.evaluate("localStorage.setItem('three-kingdoms-demo-state',JSON.stringify({phase:'overworld',route:null,supplies:3,morale:2,flags:{ambushWon:true},party:{traveler:{level:3,xp:25},aman:{level:3,xp:25},'chen-da':{level:3,xp:25}}}))")
            page.reload(wait_until='networkidle');wait_scene(page,'Overworld')
            def press(locator):
                locator.scroll_into_view_if_needed()
                locator.tap() if touch else locator.click()
            original = saved(page)
            assert all(prog['points']==6 for prog in original['party'].values())
            press(page.get_by_role('button',name='角色成长',exact=True))
            expect(page.get_by_role('dialog',name='角色成长')).to_be_visible()
            press(page.get_by_role('button',name='增加武力',exact=True))
            press(page.get_by_role('button',name='增加武力',exact=True))
            expect(page.locator('[data-ability="攻击"] strong')).to_have_text('4 → 6')
            press(page.get_by_role('button',name='增加智力',exact=True))
            expect(page.locator('[data-ability="闪避"] strong')).to_have_text('0% → 2%')
            press(page.get_by_role('button',name='阿满',exact=True))
            expect(page.locator('.training-points')).to_have_text('剩余技能点 6')
            press(page.get_by_role('button',name='增加政略',exact=True))
            press(page.get_by_role('button',name='姜垣',exact=True))
            expect(page.locator('.training-points')).to_have_text('剩余技能点 3')
            press(page.get_by_role('button',name='取消',exact=True))
            assert saved(page)==original, 'cancel changed the saved state'
            press(page.get_by_role('button',name='角色成长',exact=True))
            for name in ['统率','武力','智力','智力','魄力','魅力']:
                press(page.get_by_role('button',name=f'增加{name}',exact=True))
            expect(page.locator('.training-points')).to_have_text('剩余技能点 0')
            expect(page.get_by_role('button',name='增加武力',exact=True)).to_be_disabled()
            press(page.get_by_role('button',name='阿满',exact=True))
            press(page.get_by_role('button',name='增加政略',exact=True))
            page.screenshot(path=str(ARTIFACTS / f'h5-training-{width}x{height}.png'))
            press(page.get_by_role('button',name='确认分配',exact=True))
            trained = saved(page)
            assert trained['party']['traveler']['points']==0
            assert trained['party']['traveler']['attributes']['intellect']==12
            assert trained['party']['aman']['points']==5
            page.reload(wait_until='networkidle');wait_scene(page,'Overworld')
            assert saved(page)['party']==trained['party'], 'refresh lost or duplicated points'
            click_canvas(page,770,320,touch);wait_scene(page,'RouteChoice')
            press(page.locator('.route-card').nth(0))
            press(page.get_by_role('button',name='角色成长',exact=True))
            press(page.get_by_role('button',name='取消',exact=True))
            expect(page.locator('.route-card').nth(0)).to_have_class('route-card is-selected')
            press(page.locator('.panel-button'));wait_scene(page,'Battle')
            hero=battle(page)['units'][0]
            assert (hero['attack'],hero['defense'],hero['maxHp'])==(7,1,17),hero
            assert abs(hero['dodgeRate']-0.04)<0.0001
            press(page.get_by_role('button',name='角色成长',exact=True))
            press(page.get_by_role('button',name='阿满',exact=True))
            expect(page.locator('.training-points')).to_have_text('剩余技能点 5')
            expect(page.get_by_role('button',name='增加武力',exact=True)).to_be_disabled()
            expect(page.get_by_role('button',name='确认分配',exact=True)).to_be_disabled()
            press(page.get_by_role('button',name='返回战斗',exact=True))
            click_canvas(page,804,390,touch)
            before=battle(page)
            aman=next(u for u in before['units'] if u['id']=='aman')
            click_canvas(page,804,440,touch)
            after=battle(page)
            current=next(u for u in after['units'] if u['id']=='aman')
            assert current['hp']==aman['hp']-3 and current['empowered'] and current['ultimateUsed']
            assert 'aman' not in after['actedIds']
            fixture(page,'survival')
            before=battle(page)['units'][0]
            click_canvas(page,804,440,touch)
            after=battle(page)['units'][0]
            assert after['hp']==before['hp']+6 and after['empowered'] and after['ultimateUsed']
            assert battle(page)['actedIds']==[]
            assert_hero(page)
            assert_text_bounds(page)
            page.screenshot(path=str(ARTIFACTS / f'h5-survival-{width}x{height}.png'))
            click_tile(page,next(u for u in battle(page)['units'] if u['id']=='bandit-leader'),touch)
            assert not battle(page)['units'][0]['empowered']
            assert battle(page)['units'][0]['ultimateUsed']
            fixture(page,'dodge')
            click_canvas(page,870,480,touch)
            state=battle(page)
            assert state['units'][0]['hp']==10 and state['lastEvent']['kind']=='dodge',state
            assert_text_bounds(page)
            page.screenshot(path=str(ARTIFACTS / f'h5-dodge-{width}x{height}.png'))
            context.close()
            print(f'{width}x{height}: training preview/cancel/save, migration, read-only battle, ultimates and dodge PASS',flush=True)
        browser.close()
    assert not errors,errors

if __name__=='__main__':main()
