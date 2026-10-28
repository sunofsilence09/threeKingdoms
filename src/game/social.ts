import { prefectIdentity } from './prefectIdentity';
import type { GameState } from './state';
import { canInteractPerson, gameDayNumber, interactionFlags } from './recruitment';
import { getHistoricalCharacter } from './historicalCharacters';
import { lifeStatus } from './personLife';
import { advanceDays } from './history';
import { withWorldDate } from './worldTime';
import { personName } from './heroName';

export type Bond = 'marriage' | 'sworn';
export const GIFTS = [
  { id: 'tea', name: '清茶', price: 100, affinity: 5 },
  { id: 'wine', name: '佳酿', price: 240, affinity: 10 },
  { id: 'jade', name: '玉佩', price: 600, affinity: 20 },
] as const;
export type GiftId = typeof GIFTS[number]['id'];
export type GiftInventory = Partial<Record<GiftId, number>>;
export const helpMonth = (state: GameState) => (state.date.year - 184) * 12 + state.date.month - 1;
export const canHelpPerson = (state: GameState, id: string) => state.relationships[id]?.lastHelpMonth !== helpMonth(state);
export const bondLabel = (bond?: Bond) => bond === 'marriage' ? '夫妻' : bond === 'sworn' ? '结义伙伴' : '尚未缔结羁绊';
export function bondReason(state: GameState, id: string, bond: Bond): string {
  if (!['marriage', 'sworn'].includes(bond) || !canInteractPerson(state, id)) return '此时无法与对方交往';
  if (['child','unborn','dead'].includes(lifeStatus(state, 'traveler')) || ['child','unborn','dead'].includes(lifeStatus(state,id))) return '双方须成年且在世';
  if ((state.relationships[id]?.affinity ?? 0) < 100) return '需要亲密100';
  if (state.relationships[id]?.bond) return `已是${bondLabel(state.relationships[id].bond)}`;
  if (bond === 'marriage') {
    // Initial companions and local military/official profiles are explicitly male.
    if ((getHistoricalCharacter(id)?.gender ?? prefectIdentity(id)?.gender ?? 'male') === 'male') return '结婚仅限异性';
    if (Object.values(state.relationships).some(r => r.bond === 'marriage') || Object.values(state.life?.memorials ?? {}).some(m => m.relationship?.bond === 'marriage')) return '本局已有配偶';
  }
  return '';
}
export function formBond(state: GameState, id: string, bond: Bond): GameState {
  if (bondReason(state,id,bond)) return state;
  const party = {...state.party};
  for (const member of ['traveler',id]) if (party[member]) party[member] = {...party[member], bondBonus: (party[member].bondBonus ?? 0) + 2};
  return {...state, party, relationships: {...state.relationships,[id]:{...state.relationships[id],bond}},
    travelNotice: `与${personName(id,state)}${bond === 'marriage' ? '结为夫妻' : '结为义亲'}，双方六维永久各+2。`};
}
export function isGiftInventory(value: unknown): value is GiftInventory {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([id,n]) => GIFTS.some(g => g.id === id) && Number.isSafeInteger(n) && n >= 0 && n <= 9999);
}
export function buyGift(state: GameState, id: GiftId): GameState {
  const gift = GIFTS.find(g => g.id === id), held = state.gifts?.[id] ?? 0;
  if (!gift || state.phase !== 'overworld' || state.journey || held >= 9999 || state.economy.coins < gift.price) return state;
  return {...state,economy:{...state.economy,coins:state.economy.coins-gift.price},gifts:{...state.gifts,[id]:held+1},travelNotice:`购入${gift.name}，可在人物详情赠送。`};
}
export function giveGift(state: GameState, personId: string, id: GiftId): GameState {
  const gift = GIFTS.find(g => g.id === id), held = state.gifts?.[id] ?? 0, r = state.relationships[personId];
  if (!gift || held < 1 || !canInteractPerson(state,personId) || (r?.affinity ?? 0) >= 100 || r?.lastInteraction === gameDayNumber(state.date)) return state;
  const date = advanceDays(state.date,1);
  if (gameDayNumber(date) === gameDayNumber(state.date)) return state;
  const affinity = Math.min(100,(r?.affinity ?? 0)+gift.affinity);
  return withWorldDate({...state,flags:interactionFlags(state,personId),gifts:{...state.gifts,[id]:held-1},relationships:{...state.relationships,[personId]:{...r,affinity,lastInteraction:gameDayNumber(date)}},travelNotice:`向${personName(personId,state)}赠送${gift.name}，亲密${affinity}/100；停留1日。`},date);
}
