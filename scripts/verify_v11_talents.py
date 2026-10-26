"""Focused local UI checks for individual talents, training, archives and legacy encounters."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
OUT=Path('artifacts/v11-talents');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    results=[]
    for width,height in [(1440,1000),(390,844),(844,390)]:
        page=browser.new_page(viewport={'width':width,'height':height});errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:4180',wait_until='networkidle')
        page.evaluate('''async()=>{
          const {clearInspections}=await import('/src/game/inspectionOverlay.ts');clearInspections();
          const {createInitialState}=await import('/src/game/state.ts');
          const {createProgress}=await import('/src/game/growth.ts');
          const {createLifeState}=await import('/src/game/personLife.ts');
          const {setState}=await import('/src/game/runtime.ts');
          const state=createInitialState(()=>0);state.phase='overworld';state.route='liu';
          state.date={year:220,month:3,day:1};state.life=createLifeState(state.date,42);
          state.party['liu-bei']=createProgress(10);state.party['liu-bei'].attributes.charisma=30;state.party['liu-bei'].points-=20;
          const progress=createProgress(8,3);progress.attributes.intellect=30;progress.points-=20;
          state.life.memorials['cai-yan']={id:'cai-yan',deathYear:220,age:43,progress};
          setState(state);const {showPartyPanel}=await import('/src/game/partyPanel.ts');showPartyPanel();
        }''')
        expect(page.locator('[data-member="liu-bei"]')).to_contain_text('魅力 38')
        page.locator('[data-member="liu-bei"]').get_by_role('button',name='成长',exact=True).click(force=True)
        panel=page.locator('.training-panel');expect(panel.locator('[data-attribute="charisma"]')).to_contain_text('培养20/20')
        expect(panel.locator('[data-attribute="charisma"] .training-plus')).to_be_disabled()
        panel.locator('[data-attribute="strength"] .training-plus').click(force=True)
        expect(panel.locator('[data-attribute="strength"] .attribute-value')).to_have_text('13 → 14')
        panel.locator('.training-detail-open').click(force=True)
        expect(page.locator('.character-details .character-attributes')).to_contain_text('魅力 38')
        page.locator('.character-close').click(force=True)
        expect(panel.locator('[data-attribute="strength"] .attribute-value')).to_have_text('13 → 14')
        page.evaluate("document.querySelector('#overlay-root').scrollTop=0")
        page.screenshot(path=str(OUT/f'training-{width}x{height}.png'))
        overflow=panel.locator('.training-row').evaluate_all('(rows)=>rows.map(r=>({width:r.clientWidth,scroll:r.scrollWidth}))')
        assert all(row['scroll']<=row['width']+1 for row in overflow),overflow
        panel.locator('.training-cancel').click(force=True)
        page.locator('[data-memorial="cai-yan"]').get_by_role('button',name='查看纪念详情').click(force=True)
        expect(page.locator('.character-attributes')).to_contain_text('智力 37（天赋17 + 培养20/20；上限37）')
        page.evaluate("document.querySelector('#overlay-root').scrollTop=0")
        page.screenshot(path=str(OUT/f'memorial-{width}x{height}.png'))
        page.locator('.character-attributes').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/f'memorial-attributes-{width}x{height}.png'))
        page.locator('.character-close').click(force=True)
        page.locator('.company-header button').click(force=True)
        page.evaluate('''async()=>{
          const {getState,setState}=await import('/src/game/runtime.ts');
          const {createCombatState,makePartyUnit}=await import('/src/game/combat.ts');
          const state=getState();setState({...state,phase:'battle'});
          const combat=createCombatState(state.route,state.party,'route',['traveler','liu-bei']);
          delete combat.attributeVersion;
          combat.units=combat.units.map(u=>u.team==='party'?makePartyUnit(u.id,state.party[u.id],state.route,'route',u.x,u.y,1):u);
          window.talentLegacy=JSON.stringify(combat);
          const {showCharacterPanel}=await import('/src/game/characterPanel.ts');showCharacterPanel(undefined,combat,'liu-bei');
          window.talentLegacyUnchanged=JSON.stringify(combat)===window.talentLegacy;
        }''')
        expect(page.locator('.training-note')).to_contain_text('本场沿用1.0属性与奖励')
        expect(page.locator('[data-attribute="charisma"] .attribute-value')).to_have_text('30')
        assert page.evaluate('window.talentLegacyUnchanged')
        assert not errors,errors
        results.append({'viewport':[width,height],'draftPreserved':True,'memorialCultivation':True,'legacyCurrent30Next38':True,'rowNoHorizontalOverflow':True,'errors':errors})
        page.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(results,ensure_ascii=False))
