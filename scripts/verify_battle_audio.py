"""Real browser audio signal, event/restore behavior and desktop/mobile controls."""
import base64
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from verify_h5 import click_tile, wait_scene, battle

URL = os.environ.get('H5_URL', 'http://127.0.0.1:5184')
OUT = Path(__file__).resolve().parents[1] / 'artifacts' / 'audio-v1.1'
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('[data-audio-mute]')).to_have_text('音效：开')
    page.screenshot(path=str(OUT / 'start-desktop.png'), full_page=True)
    page.evaluate('''async () => {
      const {createInitialState,STORAGE_KEY}=await import('/src/game/state.ts');
      const {createCombatState}=await import('/src/game/combat.ts');
      const {checkpointBattle}=await import('/src/game/battleSave.ts');
      const s=createInitialState(()=>0); s.heroName='听风'; s.phase='battle'; s.encounter='ambush';
      s.battleParty=[...s.deployed];
      const c=createCombatState(null,s.party,'ambush',s.deployed,{month:s.date.month});
      c.units=c.units.map(u=>u.id==='traveler'?{...u,hp:100,maxHp:100,speed:100,dodgeRate:0}:u.id==='bandit-leader'?{...u,x:4,y:4,hp:100,maxHp:100,speed:95,dodgeRate:0}:u);
      c.selectedId='traveler'; c.turn='party';
      c.lastEvent={kind:'attack',actorId:'traveler',targetId:'bandit-leader',damage:1};c.turnEvents=[c.lastEvent];
      s.activeBattle=checkpointBattle(c,s);localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
    }''')
    page.reload(wait_until='networkidle')
    page.get_by_role('button', name='继续游戏', exact=True).click()
    wait_scene(page, 'Battle')
    page.evaluate('''async()=>{
      const {battleAudio}=await import('/src/game/battleAudio.ts');
      window.audioBus=battleAudio; window.audioCalls=[];
      const original=battleAudio.play.bind(battleAudio);
      battleAudio.play=cues=>{window.audioCalls.push(cues.map(c=>c.sound));original(cues);};
      const tap=battleAudio.context.createMediaStreamDestination();battleAudio.master.connect(tap);
      const analyser=battleAudio.context.createAnalyser();analyser.fftSize=1024;battleAudio.master.connect(analyser);
      window.audioPeak=0;window.audioEnergy=0;window.audioFrames=0;
      window.audioMeter=setInterval(()=>{const pcm=new Float32Array(1024);analyser.getFloatTimeDomainData(pcm);for(const x of pcm){window.audioPeak=Math.max(window.audioPeak,Math.abs(x));window.audioEnergy+=x*x;}window.audioFrames+=pcm.length;},10);
      window.audioChunks=[];window.audioRecorder=new MediaRecorder(tap.stream);
      window.audioRecorder.ondataavailable=e=>window.audioChunks.push(e.data);window.audioRecorder.start();
    }''')
    assert page.evaluate('window.audioCalls.length') == 0, 'restoring old events replayed audio'
    before = page.locator('#game-container canvas').bounding_box()
    click_tile(page, {'x': 4, 'y': 4})
    page.wait_for_timeout(3500)
    calls = page.evaluate('window.audioCalls')
    assert len([c for c in calls if c]) >= 2, {'calls':calls,'battle':battle(page)}  # Actual player attack and enemy response.
    assert calls[0] == ['slash', 'hit'], calls
    after = page.locator('#game-container canvas').bounding_box()
    assert before['x'] == after['x'] and before['y'] == after['y'], (before, after)
    signal = page.evaluate('({peak:audioPeak,rms:Math.sqrt(audioEnergy/audioFrames),calls:audioCalls,contextState:audioBus.context.state})')
    assert 0.001 < signal['peak'] < 1 and signal['rms'] > 0.0001, signal
    encoded = page.evaluate('''async()=>{
      clearInterval(audioMeter);
      await new Promise(resolve=>{audioRecorder.onstop=resolve;audioRecorder.stop();});
      const blob=new Blob(audioChunks,{type:'audio/webm'});
      return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(blob);});
    }''')
    (OUT / 'actual-player-enemy.webm').write_bytes(base64.b64decode(encoded))
    page.screenshot(path=str(OUT / 'battle-desktop.png'), full_page=True)
    page.locator('[data-audio-mute]').click()
    expect(page.locator('[data-audio-mute]')).to_have_text('音效：关')
    page.locator('[data-audio-volume]').fill('35')
    preferences = page.evaluate("JSON.parse(localStorage.getItem('three-kingdoms-audio-v1'))")
    assert preferences == {'muted': True, 'volume': .35}, preferences
    for name, width, height in [('phone-portrait',390,844),('phone-landscape',844,390)]:
        page.set_viewport_size({'width':width,'height':height})
        page.screenshot(path=str(OUT / f'battle-{name}.png'), full_page=True)
        assert page.locator('.audio-controls').evaluate('e=>e.scrollWidth<=e.clientWidth'), name
        assert page.locator('[data-audio-mute]').bounding_box()['height'] >= 44
    page.reload(wait_until='networkidle')
    expect(page.locator('[data-audio-mute]')).to_have_text('音效：关')
    expect(page.locator('[data-audio-volume]')).to_have_value('35')
    page.screenshot(path=str(OUT / 'start-phone-landscape.png'), full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(OUT / 'start-phone-portrait.png'), full_page=True)
    assert not errors, errors
    (OUT / 'browser-result.json').write_text(json.dumps({'signal':signal,'preferences':preferences,'pointerStable':True,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
    print(json.dumps({'result':'PASS','signal':signal,'preferences':preferences,'pointerStable':True},ensure_ascii=False))
