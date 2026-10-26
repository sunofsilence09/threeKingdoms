"""Real browser playback, season/scene transitions, audio signal and responsive controls."""
import base64,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
from verify_h5 import wait_scene
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/spring-bgm';OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('H5_URL','http://127.0.0.1:5186')
SNAP='''async()=>{const {springMusic:m}=await import('/src/game/seasonalMusic.ts');return {track:m.currentTrack?.id??null,src:m.audio?.currentSrc??'',paused:m.audio?.paused??true,time:m.audio?.currentTime??0,volume:m.audio?.volume??0,blocked:m.blocked};}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL,wait_until='networkidle')
 expect(page.locator('[data-music-volume]')).to_have_value('30');assert page.evaluate(SNAP)['track'] is None
 page.screenshot(path=str(OUT/'start-1440.png'))
 page.get_by_role('button',name='重新开始',exact=True).click();page.locator('#hero-name').fill('听春')
 page.get_by_role('button',name='确认姓名 · 继续旅程',exact=True).click();wait_scene(page,'Prologue');page.wait_for_timeout(600)
 story=page.evaluate(SNAP);assert not story['paused'] and story['time']>0 and story['src'].endswith('/assets/music/spring-01.mp3'),story
 page.get_by_role('button',name='踏上逃难路',exact=True).click();wait_scene(page,'Overworld');world=page.evaluate(SNAP)
 assert world['time']>=story['time'] and world['track']==story['track']
 page.evaluate('''async()=>{
  const {springMusic}=await import('/src/game/seasonalMusic.ts');
  const ctx=new AudioContext();await ctx.resume();const source=ctx.createMediaElementSource(springMusic.audio);
  const analyser=ctx.createAnalyser();analyser.fftSize=2048;source.connect(analyser);analyser.connect(ctx.destination);
  const tap=ctx.createMediaStreamDestination();source.connect(tap);window.musicChunks=[];window.musicRecorder=new MediaRecorder(tap.stream);
  musicRecorder.ondataavailable=e=>musicChunks.push(e.data);musicRecorder.start();window.musicPeak=0;window.musicEnergy=0;window.musicCount=0;
  window.musicMeter=setInterval(()=>{const data=new Float32Array(2048);analyser.getFloatTimeDomainData(data);for(const v of data){musicPeak=Math.max(musicPeak,Math.abs(v));musicEnergy+=v*v;}musicCount+=data.length;},20);
  window.musicContext=ctx;
 }''');page.wait_for_timeout(2200)
 signal=page.evaluate('({peak:musicPeak,rms:Math.sqrt(musicEnergy/musicCount),context:musicContext.state})')
 assert signal['peak']>.001 and signal['rms']>.0001 and signal['context']=='running',signal
 audio=page.evaluate('''async()=>{clearInterval(musicMeter);await new Promise(r=>{musicRecorder.onstop=r;musicRecorder.stop();});const blob=new Blob(musicChunks,{type:'audio/webm'});return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(',')[1]);f.readAsDataURL(blob);});}''')
 (OUT/'actual-spring-playback.webm').write_bytes(base64.b64decode(audio))
 before=page.evaluate(SNAP)
 page.get_by_role('button',name='进入城池',exact=True).click();page.get_by_role('button',name='府署名册',exact=True).click()
 assert page.evaluate(SNAP)['time']>=before['time'];page.get_by_role('button',name='出城 · 返回地图',exact=True).click()
 page.evaluate('''async()=>{const {getState,setState}=await import('/src/game/runtime.ts');window.originalGameState=getState();setState({...getState(),phase:'battle'});}''')
 battle=page.evaluate(SNAP);assert battle['paused'];page.wait_for_timeout(180);assert abs(page.evaluate(SNAP)['time']-battle['time'])<.05
 page.evaluate('''async()=>{const {setState}=await import('/src/game/runtime.ts');setState(originalGameState);}''');page.wait_for_timeout(200)
 resumed=page.evaluate(SNAP);assert not resumed['paused'] and resumed['time']>=battle['time']
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
 assert page.evaluate(SNAP)['paused'];page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))");page.wait_for_timeout(150)
 assert not page.evaluate(SNAP)['paused']
 page.evaluate('''async()=>{const {getState,setState}=await import('/src/game/runtime.ts');setState({...getState(),date:{...getState().date,month:6}});}''')
 summer=page.evaluate(SNAP);assert summer['paused'] and summer['track'] is None
 page.evaluate('''async()=>{const {setState}=await import('/src/game/runtime.ts');setState({...originalGameState,date:{...originalGameState.date,month:4}});}''');page.wait_for_timeout(250)
 spring=page.evaluate(SNAP);assert not spring['paused'] and spring['time']<2
 # An actual media-ended event, rather than merely calling the playlist helper.
 page.evaluate('''async()=>{const {springMusic}=await import('/src/game/seasonalMusic.ts');springMusic.audio.currentTime=springMusic.audio.duration-.12;}''')
 page.wait_for_timeout(700);ended=page.evaluate(SNAP);assert not ended['paused'] and ended['time']<2,ended
 sfx=page.evaluate("localStorage.getItem('three-kingdoms-audio-v1')")
 page.locator('[data-music-volume]').fill('15');assert abs(page.evaluate(SNAP)['volume']-.15)<.001
 page.locator('[data-music-mute]').click();assert page.evaluate(SNAP)['paused']
 assert page.evaluate("localStorage.getItem('three-kingdoms-audio-v1')")==sfx
 for width,height in [(1440,1000),(390,844),(844,390)]:
  page.set_viewport_size({'width':width,'height':height});controls=page.locator('#world-root .spring-music-controls');controls.scroll_into_view_if_needed()
  assert controls.evaluate('n=>n.scrollWidth<=n.clientWidth+1')
  assert controls.locator('button').bounding_box()['height']>=44
  page.screenshot(path=str(OUT/f'world-{width}x{height}.png'))
 page.reload(wait_until='networkidle');expect(page.locator('[data-music-mute]')).to_have_text('音乐：关');expect(page.locator('[data-music-volume]')).to_have_value('15')
 page.get_by_role('button',name='继续游戏',exact=True).click();wait_scene(page,'Overworld');assert page.evaluate(SNAP)['paused']
 page.locator('[data-music-mute]').click();page.wait_for_timeout(250);assert not page.evaluate(SNAP)['paused']
 assert not errors,errors
 browser.close()
 result={'source':'spring-01.mp3','uniqueTracks':1,'springNarrativePlayback':True,'sameSongAcrossPanels':True,'battleAndBackgroundPauseResume':True,'summerStops':True,'endedLoops':True,'independentSettingsPersist':True,'signal':signal,'viewports':3,'pageErrors':errors}
 (OUT/'browser-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
