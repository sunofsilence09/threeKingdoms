"""Real browser checks for the sixty-city map, aliases and mobile controls."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_generations import continue_menu

URL = os.environ.get('H5_URL', 'http://127.0.0.1:5174')
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'generations' / 'cities'
OUT.mkdir(parents=True, exist_ok=True)


def seed(page, year=184, city='yingchuan'):
    page.evaluate("""async ({year,city}) => {
      const {createInitialState}=await import('/src/game/state.ts');
      const {createWorldConflict}=await import('/src/game/worldConflict.ts');
      const state=createInitialState(()=>0);
      state.phase='overworld';state.currentCityId=city;state.heroName='行旅者';
      state.date={year,month:3,day:1};state.worldConflict=createWorldConflict(state.date,Object.keys(state.party));
      localStorage.setItem('three-kingdoms-demo-state',JSON.stringify(state));
    }""", {'year': year, 'city': city})
    page.reload(wait_until='networkidle')
    continue_menu(page,page.viewport_size['width']!=1440)
    expect(page.locator('#world-root')).to_be_visible()


def main():
    checks=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for width,height in [(1440,1000),(390,844),(844,390)]:
            context=browser.new_context(viewport={'width':width,'height':height},has_touch=width!=1440,is_mobile=width!=1440)
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.goto(URL,wait_until='networkidle')
            seed(page)
            search=page.get_by_label('城名或别名',exact=True)
            region=page.get_by_label('州部',exact=True)
            expect(page.locator('[data-city-result]')).to_have_count(60)
            search.fill('南京')
            expect(page.locator('[data-city-result]')).to_have_count(1)
            expect(page.locator('[data-city-result="moling"]')).to_contain_text('秣陵')
            result=page.locator('[data-city-result="moling"]')
            result.tap() if width!=1440 else result.click()
            expect(page.locator('#world-destination')).to_have_value('moling')
            expect(page.locator('#start-travel')).to_be_enabled()
            expect(page.locator('[data-city-id="moling"] .world-map-city-name')).to_have_text('秣陵')
            search.fill('')
            region.select_option('yang')
            expect(page.locator('[data-city-result]')).to_have_count(9)
            search.fill('天水')
            expect(page.locator('[data-city-result]')).to_have_count(0)
            region.select_option('')
            expect(page.locator('[data-city-result]')).to_have_count(1)
            expect(page.locator('[data-city-result="jixian"]')).to_contain_text('冀')
            search.fill('南京')
            page.screenshot(path=str(OUT/f'map-{width}x{height}.png'),full_page=True)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
            if width!=1440:
                rect=search.bounding_box()
                assert rect and rect['height']>=44, 'search touch target'
            region.select_option('')
            search.fill('')
            seed(page,212,'moling')
            expect(page.locator('.world-header h1')).to_contain_text('建业')
            expect(page.locator('[data-city-id="moling"]')).to_have_attribute('aria-label',__import__('re').compile('建业'))
            seed(page,282,'moling')
            expect(page.locator('.world-header h1')).to_contain_text('建邺')
            assert not errors, errors
            checks.append({'viewport':[width,height],'cities':60,'aliases':True,'region':True,'eraNames':True,'errors':errors})
            context.close()
        browser.close()
    (OUT/'ui-results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False))


if __name__=='__main__':
    main()
