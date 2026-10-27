"""Four-season playback using real UI, also usable against an offline package.

H5_URL points to a local Vite server or a packaged loopback server. All game
dates advance by the actual rest button; no gameplay state is injected.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL=os.environ.get('H5_URL','http://127.0.0.1:5186').rstrip('/')
OUT=Path(__file__).resolve().parents[1]/'artifacts'/'seasonal-bgm'
OUT.mkdir(parents=True,exist_ok=True)
SUFFIX=os.environ.get('H5_QA_KIND','development')
KEY='three-kingdoms-demo-state'
SNAP="""()=>{const a=window.musicElements[0];return {exists:!!a,paused:a?.paused??true,time:a?.currentTime??0,volume:a?.volume??0,src:a?.currentSrc??''};}"""

def playing(page,season):
    page.wait_for_function("""src=>{const a=window.musicElements[0];return a&&!a.paused&&a.currentSrc.endsWith(src)&&a.currentTime>0;}""",arg=f'/assets/music/{season}-01.mp3')
    return page.evaluate(SNAP)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    results=[]
    for width,height in [(1440,1000),(390,844),(844,390)]:
        ctx=browser.new_context(viewport={'width':width,'height':height},has_touch=width!=1440,is_mobile=width!=1440)
        external,errors=[],[]
        def restrict(route):
            if route.request.url.startswith(URL+'/'):route.continue_()
            else:external.append(route.request.url);route.abort()
        ctx.route('**/*',restrict)
        ctx.add_init_script("window.musicElements=[];window.Audio=new Proxy(window.Audio,{construct(target,args){const a=Reflect.construct(target,args);musicElements.push(a);return a;}})")
        page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        assert not page.evaluate(SNAP)['exists']
        expect(page.get_by_label('四季背景音乐设置',exact=True)).to_contain_text('随四季切换')
        page.get_by_role('button',name='重新开始',exact=True).click()
        page.locator('#hero-name').fill('四季行旅')
        page.get_by_role('button',name='确认姓名 · 继续旅程',exact=True).click()
        playing(page,'spring')
        page.get_by_role('button',name='踏上逃难路',exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        if width==1440:
            page.evaluate("""async()=>{
              window.musicContext=new AudioContext();await musicContext.resume();
              const source=musicContext.createMediaElementSource(musicElements[0]);
              window.musicAnalyser=musicContext.createAnalyser();musicAnalyser.fftSize=2048;
              source.connect(musicAnalyser);musicAnalyser.connect(musicContext.destination);
              window.peak=0;window.energy=0;window.samples=0;
              window.meter=setInterval(()=>{const data=new Float32Array(2048);musicAnalyser.getFloatTimeDomainData(data);for(const x of data){peak=Math.max(peak,Math.abs(x));energy+=x*x;}samples+=data.length;},20);
            }""")
        signals={};previous=None;previousSeason=None
        # A complete calendar cycle, including December -> next January/February.
        for i,month in enumerate([3,4,5,6,7,8,9,10,11,12,1,2,3]):
            season='spring' if 3<=month<=5 else 'summer' if 6<=month<=8 else 'autumn' if 9<=month<=11 else 'winter'
            if i:page.get_by_role('button',name='安居一月 · 30日',exact=True).click()
            date=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key)).date',KEY)
            assert date['month']==month,date
            snap=playing(page,season)
            if previousSeason==season:assert snap['time']>=previous['time'],(previous,snap)
            elif i:assert snap['time']<2,(month,snap)
            if season not in signals:
                if width==1440:
                    page.evaluate('peak=0;energy=0;samples=0')
                    page.wait_for_timeout(1400)
                    signal=page.evaluate('({peak,rms:Math.sqrt(energy/Math.max(1,samples)),context:musicContext.state})')
                    assert signal['peak']>.0001 and signal['rms']>.00001,signal
                    signals[season]=signal
                else:signals[season]={'actualPlayback':True}
                # Each season uses actual battle entry/retreat rather than a phase mock.
                before=page.evaluate(SNAP)
                page.get_by_role('button',name='当地故事',exact=True).click()
                page.get_by_role('button',name='进入战斗',exact=True).click()
                expect(page.locator('#battle-commands')).to_be_visible()
                battle=page.evaluate(SNAP);assert battle['paused'] and battle['src']==before['src']
                page.get_by_role('button',name='撤退',exact=True).click()
                expect(page.locator('#world-root')).to_be_visible()
                resumed=playing(page,season);assert resumed['time']>=battle['time']
                page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
                hidden=page.evaluate(SNAP);assert hidden['paused']
                page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
                assert playing(page,season)['time']>=hidden['time']
                # Real media ended event must loop within this season.
                page.evaluate('musicElements[0].currentTime=musicElements[0].duration-.1')
                page.wait_for_function('()=>musicElements[0].currentTime<2&&!musicElements[0].paused')
                assert playing(page,season)['src'].endswith(f'{season}-01.mp3')
                controls=page.get_by_label('四季背景音乐设置',exact=True)
                controls.scroll_into_view_if_needed()
                assert controls.evaluate('n=>n.scrollWidth<=n.clientWidth+1')
                assert controls.locator('button').bounding_box()['height']>=44
                page.screenshot(path=str(OUT/f'{SUFFIX}-{season}-{width}.png'))
            previous=page.evaluate(SNAP);previousSeason=season
        audioSettings=page.evaluate("localStorage.getItem('three-kingdoms-audio-v1')")
        page.locator('[data-music-volume]').fill('20')
        page.locator('[data-music-mute]').click()
        assert page.evaluate(SNAP)['paused']
        assert page.evaluate("localStorage.getItem('three-kingdoms-audio-v1')")==audioSettings
        page.reload(wait_until='networkidle')
        expect(page.locator('[data-music-volume]')).to_have_value('20')
        expect(page.locator('[data-music-mute]')).to_have_text('音乐：关')
        page.get_by_role('button',name='继续游戏',exact=True).click()
        expect(page.locator('#world-root')).to_be_visible()
        assert page.evaluate(SNAP)['paused']
        page.locator('[data-music-mute]').click()
        assert abs(playing(page,'spring')['volume']-.2)<.001
        assert not errors and not external,{'errors':errors,'external':external}
        results.append({'viewport':[width,height],'signals':signals,'allFourSeasons':True,'naturalMonthTransitions':True,'winterAcrossYearContinues':True,'actualBattlePauses':True,'backgroundResumes':True,'endedLoopsInSeason':True,'settingsPersist':True,'externalRequests':external,'pageErrors':errors})
        print(f'PASS {SUFFIX} {width}x{height}: four seasons, year boundary, battle/background, ended loop and saved settings',flush=True)
        ctx.close()
    browser.close()
    (OUT/f'{SUFFIX}-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
