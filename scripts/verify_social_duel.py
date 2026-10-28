"""Dev integration regression: bonded duel teacher inspection matches combat attributes."""
import os
from playwright.sync_api import sync_playwright
URL=os.environ.get('H5_URL','http://127.0.0.1:5197')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 page=browser.new_page();page.goto(URL,wait_until='networkidle')
 for recruited in [False,True]:
  result=page.evaluate('''async recruited=>{
   const {createInitialState}=await import('/src/game/state.ts');
   const {formBond}=await import('/src/game/social.ts');
   const {invitePerson}=await import('/src/game/recruitment.ts');
   const {startDuel}=await import('/src/game/martial.ts');
   const {createCombatState}=await import('/src/game/combat.ts');
   const {createDuelCombat}=await import('/src/game/martialCombat.ts');
   const {setState}=await import('/src/game/runtime.ts');
   const {clearInspections}=await import('/src/game/inspectionOverlay.ts');
   const {showCharacterDetails}=await import('/src/game/characterDetails.ts');
   let s=createInitialState(()=>0);s.phase='overworld';s.currentCityId='zhuo';s.relationships['guan-yu']={affinity:100};
   s=formBond(s,'guan-yu','sworn');if(recruited)s=invitePerson(s,'guan-yu');s=startDuel(s,'guan-yu');
   const combat=createDuelCombat(createCombatState(null,s.party,'ambush',['traveler']),s);
   setState(s);clearInspections();document.querySelector('#overlay-root').replaceChildren();showCharacterDetails('enemy:guan-yu',combat);
   const teacher=combat.units.find(u=>u.id==='enemy:guan-yu');
   return {attributes:document.querySelector('.character-attributes').textContent,attack:teacher.attack,maxHp:teacher.maxHp};
  }''',recruited)
  assert '武力 20' in result['attributes'] and '羁绊2' in result['attributes'],result
  assert result['attack']==14 and result['maxHp']==35,result
  print(f'PASS bonded duel inspection recruited={recruited}',flush=True)
 browser.close()
