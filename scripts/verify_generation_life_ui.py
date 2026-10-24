"""Browser checks for age access, death notices and retained memorial progression."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_generations import continue_menu

URL=os.environ.get('H5_URL','http://127.0.0.1:5174')
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'generations'/'life-ui'
OUT.mkdir(parents=True,exist_ok=True)


def seed(page,year=184,death=False,teaching=False):
    page.evaluate("""async ({year,death,teaching})=>{
      const {createInitialState}=await import('/src/game/state.ts');
      const {createWorldConflict}=await import('/src/game/worldConflict.ts');
      const {createLifeState}=await import('/src/game/personLife.ts');
      const {createProgress}=await import('/src/game/growth.ts');
      const state=createInitialState(()=>0);
      state.phase='overworld';state.heroName='行旅者';state.currentCityId='henan';
      state.date=death?{year:224,month:12,day:30}:{year,month:3,day:1};
      state.life=createLifeState(state.date,42);
      state.lifeMigration=undefined;state.lifeRecovery=undefined;
      if(death){
        state.life.people['cao-cao'].deathYear=225;
        state.life.handledIds=state.life.handledIds.filter(id=>id!=='cao-cao');
        state.party['cao-cao']=createProgress(5,7);state.deployed.push('cao-cao');
        state.relationships['cao-cao']={affinity:91};
        state.martial.learned=teaching?[]:['martial-cao-cao'];state.martial.equipped=[...state.martial.learned];
      }
      state.worldConflict=createWorldConflict(state.date,Object.keys(state.party),42);
      localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(state));
    }""",{'year':year,'death':death,'teaching':teaching})
    page.reload(wait_until='networkidle')
    continue_menu(page,page.viewport_size['width']!=1440)
    expect(page.locator('#world-root')).to_be_visible()


def main():
    checks=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for width,height in [(1440,1000),(390,844),(844,390)]:
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=width!=1440,is_mobile=width!=1440)
            page=context.new_page();errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            def activate(locator):
                locator.tap() if width!=1440 else locator.click()
            page.goto(URL,wait_until='networkidle')
            for year,label,kind in [(184,'尚未出生','unborn'),(190,'未满16岁','child')]:
                seed(page,year)
                activate(page.locator('#world-recruitment'))
                activate(page.get_by_role('button',name='所有人物行踪',exact=True))
                page.locator('#person-search').fill('曹丕')
                page.locator('#person-life').select_option(kind)
                card=page.locator('[data-person="cao-pi"]')
                expect(card).to_contain_text(label)
                expect(card.get_by_role('button',name='邀请同行',exact=True)).to_be_disabled()
                expect(card.get_by_role('button',name='交谈 +8 · 免费 · 1日',exact=True)).to_be_disabled()
                activate(card.get_by_role('button',name='查看详情',exact=True))
                detail=page.locator('.character-details')
                expect(detail.locator('.character-life')).to_contain_text(label)
                expect(detail.locator('.character-battle-status')).to_contain_text(label)
                expect(detail.get_by_role('button',name='请教武学 · 1日',exact=True)).to_be_disabled()
                page.get_by_label('人物志生命状态',exact=True).select_option(kind)
                expect(detail.locator('[data-character="cao-pi"]')).to_be_visible()
                activate(detail.locator('[data-group="garrison"]'))
                expect(detail.locator('.character-layout')).to_be_hidden()
                expect(detail.locator('[data-group="garrison"]')).to_have_attribute('aria-pressed','true')
                activate(detail.get_by_role('button',name='关闭人物详情',exact=True))
                activate(page.locator('.recruitment-panel .company-header button'))
            for action in ['请教武学 · 1日','切磋 · 1对1 · 1日']:
                seed(page,death=True,teaching=True)
                activate(page.locator('#world-party'))
                activate(page.locator('[data-member="cao-cao"]').get_by_role('button',name='详情',exact=True))
                activate(page.get_by_role('button',name=action,exact=True))
                detail=page.locator('.character-details')
                expect(detail.locator('.character-life')).to_contain_text('本局于225年离世')
                expect(detail.locator('.character-identity')).to_contain_text('同行纪念')
                expect(detail.get_by_role('button',name='请教武学 · 1日',exact=True)).to_be_disabled()
                activate(detail.get_by_role('button',name='关闭人物详情',exact=True))
                expect(page.locator('[data-memorial="cao-cao"]')).to_be_visible()
                expect(page.locator('[data-member="cao-cao"]')).to_have_count(0)
            seed(page,death=True)
            activate(page.get_by_role('button',name='帮工1日 · 军需+1 / 铜钱+20',exact=True))
            expect(page.locator('[data-life-notices]')).to_contain_text('曹操 · 本局于225年离世')
            state=page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-demo-state'))")
            assert state['date']['year']==225 and 'cao-cao' not in state['party']
            assert state['life']['memorials']['cao-cao']['progress']['level']==5
            assert state['life']['memorials']['cao-cao']['relationship']['affinity']==91
            assert state['martial']['equipped']==['martial-cao-cao']
            activate(page.locator('#world-party'))
            memorial=page.locator('[data-memorial="cao-cao"]')
            expect(memorial).to_contain_text('Lv.5')
            activate(memorial.get_by_role('button',name='查看纪念详情',exact=True))
            detail=page.locator('.character-details')
            expect(detail.locator('.character-identity')).to_contain_text('同行纪念')
            expect(detail.locator('.character-level')).to_have_text('Lv.5')
            expect(detail.locator('.character-attributes')).to_contain_text('武力 10')
            expect(detail.locator('.character-battle-status')).to_contain_text('亲密 91/100')
            expect(detail.get_by_role('button',name='请教武学 · 1日',exact=True)).to_be_disabled()
            detail.locator('.character-life').scroll_into_view_if_needed()
            page.screenshot(path=str(OUT/f'memorial-{width}x{height}.png'))
            activate(detail.get_by_role('button',name='关闭人物详情',exact=True))
            activate(page.locator('.party-panel .company-header button'))
            activate(page.locator('#life-notices-dismiss'))
            page.reload(wait_until='networkidle')
            continue_menu(page,width!=1440)
            expect(page.locator('[data-life-notices]')).to_have_count(0)
            legacy=json.loads((Path(__file__).resolve().parents[1]/'src'/'game'/'fixtures'/'v08-saves.json').read_text(encoding='utf-8'))['city200']
            page.evaluate("state=>localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(state))",legacy)
            page.reload(wait_until='networkidle')
            continue_menu(page,width!=1440)
            expect(page.get_by_role('heading',name='旧旅程已接入世代更迭',exact=True)).to_be_visible()
            activate(page.get_by_role('button',name='查看当前旅程',exact=True))
            expect(page.locator('#world-root')).to_be_visible()
            page.evaluate("()=>{const key='three-kingdoms-demo-state',state=JSON.parse(localStorage.getItem(key));state.lifeRecovery=true;localStorage.setItem(key,JSON.stringify(state));}")
            page.reload(wait_until='networkidle')
            continue_menu(page,width!=1440)
            expect(page.get_by_role('heading',name='生命资料已单独恢复',exact=True)).to_be_visible()
            activate(page.get_by_role('button',name='查看当前旅程',exact=True))
            expect(page.locator('#world-root')).to_be_visible()
            assert not errors,errors
            checks.append({'viewport':[width,height],'unborn':True,'child':True,'deathBoundary':True,'teachingDetailRefresh':True,'cancelledDuelClosable':True,'memorialGrowth':True,'noticeAcknowledgedAfterReload':True,'legacyMigrationPrompt':True,'recoveryPrompt':True,'errors':errors})
            context.close()
        browser.close()
    (OUT/'ui-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False))


if __name__=='__main__':
    main()
