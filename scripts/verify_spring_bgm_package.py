"""Offline black-box music playback through the packaged game UI and actual scenes."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/spring-bgm';URL=os.environ.get('H5_PACKAGE_URL','http://127.0.0.1:18844')
SNAP="""()=>{const a=window.createdMusic.find(a=>a.src.includes('spring-01.mp3'));return {exists:!!a,paused:a?.paused??true,time:a?.currentTime??0,volume:a?.volume??0,src:a?.currentSrc??''};}"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);context=browser.new_context(viewport={'width':1440,'height':1000});external=[];errors=[]
 def route(r):
  if r.request.url.startswith(URL+'/'):r.continue_()
  else:external.append(r.request.url);r.abort()
 context.route('**/*',route)
 context.add_init_script("window.createdMusic=[];window.Audio=new Proxy(window.Audio,{construct(target,args){const a=Reflect.construct(target,args);createdMusic.push(a);return a;}})")
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='networkidle')
 expect(page.locator('[data-music-volume]')).to_have_value('30');assert not page.evaluate(SNAP)['exists']
 page.get_by_role('button',name='重新开始',exact=True).click();page.locator('#hero-name').fill('听春')
 page.get_by_role('button',name='确认姓名 · 继续旅程',exact=True).click();page.wait_for_timeout(450)
 story=page.evaluate(SNAP);assert story['time']>0 and not story['paused'],story
 page.get_by_role('button',name='踏上逃难路',exact=True).click();expect(page.locator('#world-root')).to_be_visible()
 start=page.evaluate(SNAP);assert start['time']>=story['time']
 page.get_by_role('button',name='当地故事',exact=True).click();page.get_by_role('button',name='进入战斗',exact=True).click()
 expect(page.locator('#battle-commands')).to_be_visible();battle=page.evaluate(SNAP);assert battle['paused'],battle
 page.get_by_role('button',name='撤退',exact=True).click();expect(page.locator('#world-root')).to_be_visible();page.wait_for_timeout(150)
 resumed=page.evaluate(SNAP);assert not resumed['paused'] and resumed['time']>=battle['time']
 for month in [4,5]:
  before=page.evaluate(SNAP)['time'];page.get_by_role('button',name='安居一月 · 30日',exact=True).click()
  date=page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state")).date');assert date['month']==month,date
  assert not page.evaluate(SNAP)['paused'] and page.evaluate(SNAP)['time']>=before
 page.get_by_role('button',name='安居一月 · 30日',exact=True).click();assert page.evaluate(SNAP)['paused']
 assert page.evaluate('JSON.parse(localStorage.getItem("three-kingdoms-demo-state")).date.month')==6
 page.locator('[data-music-volume]').fill('20');page.locator('[data-music-mute]').click()
 page.reload(wait_until='networkidle');expect(page.locator('[data-music-volume]')).to_have_value('20');expect(page.locator('[data-music-mute]')).to_have_text('音乐：关')
 assert not external and not errors,{'external':external,'errors':errors}
 page.screenshot(path=str(OUT/'packaged-menu.png'));browser.close()
 result={'offline':True,'externalRequests':external,'pageErrors':errors,'storyPlayback':story,'actualBattlePauses':True,'retreatResumes':True,'AprilMayNoRestart':True,'JuneStops':True,'settingsPersist':True}
 (OUT/'package-browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
