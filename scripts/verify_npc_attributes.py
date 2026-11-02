"""Unrecruited NPC inspection uses the percentage scale, including bond bonuses."""
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True);page=browser.new_page()
 page.goto(os.environ.get('H5_URL','http://127.0.0.1:5199'),wait_until='networkidle')
 for person,bonus,expected in [('guan-yu',0,90),('guan-yu',2,92),('cao-zhi',0,None)]:
  text=page.evaluate('''async ([id,bonus])=>{
   const {createInitialState}=await import('/src/game/state.ts');const {setState}=await import('/src/game/runtime.ts');
   const {showCharacterDetails}=await import('/src/game/characterDetails.ts');const {clearInspections}=await import('/src/game/inspectionOverlay.ts');
   const s=createInitialState(()=>0);if(bonus)s.relationships[id]={affinity:100,bond:'sworn'};setState(s);
   clearInspections();document.querySelector('#overlay-root').replaceChildren();showCharacterDetails(id);
   return document.querySelector('.character-attributes').textContent;
  }''',[person,bonus])
  assert '上限100' in text and (expected is None or f'武力 {expected}' in text),text
  print(f'PASS NPC {person} bond={bonus}',flush=True)
 browser.close()
