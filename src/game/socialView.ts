import type { GameState } from './state';
import { canInteractPerson, gameDayNumber } from './recruitment';
import { GIFTS, bondLabel, bondReason, formBond, giveGift } from './social';

/** The caller owns persistence and refresh, so all views share the same rules. */
export function socialControls(state: GameState, id: string, mutate: (action: (s: GameState) => GameState) => void): HTMLElement {
  const section = document.createElement('section'); section.className = 'social-controls'; section.setAttribute('aria-label','赠礼与羁绊');
  const relation = state.relationships[id], note = document.createElement('p');
  note.textContent = `亲密 ${relation?.affinity ?? 0}/100 · ${bondLabel(relation?.bond)}${relation?.bond ? ' · 双方六维永久各+2' : ' · 满100可缔结羁绊，双方六维各+2'}`; section.append(note);
  const actions = document.createElement('div'); actions.className = 'party-actions'; section.append(actions);
  for (const gift of GIFTS) {
    const held = state.gifts?.[gift.id] ?? 0, button = document.createElement('button');button.type='button';button.className='party-action';
    button.textContent = `送${gift.name} +${gift.affinity} · 持有${held} · 1日`;
    button.disabled = !canInteractPerson(state,id) || held < 1 || (relation?.affinity ?? 0) >= 100 || relation?.lastInteraction === gameDayNumber(state.date);
    button.addEventListener('click',()=>mutate(s=>giveGift(s,id,gift.id)));actions.append(button);
  }
  for (const [kind,label] of [['marriage','结婚'],['sworn','结义']] as const) {
    const reason=bondReason(state,id,kind), button=document.createElement('button');button.type='button';button.className='party-action';
    button.textContent = reason ? `${label} · ${reason}` : `${label} · 双方六维+2`;button.disabled=!!reason;
    button.addEventListener('click',()=>mutate(s=>formBond(s,id,kind)));actions.append(button);
  }
  const hint = document.createElement('p');hint.className='company-note';hint.textContent='礼品可在各城礼品铺购买；赠礼沿用每日交往限制。结婚仅异性，本局限一位配偶；结义不限性别。同一对人物只能缔结一种羁绊。';section.append(hint);
  return section;
}
