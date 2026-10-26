import { effectiveAttributes } from './characterTalents';
import { ATTRIBUTE_IDS, attributeBonuses, victoryExperience, type AttributeId } from './attributes';
import { createPartyProgress, grantExperience, migratePartyProgress, PARTY_IDS, type PartyId, type PartyProgress } from './growth';
import { ORIGINS, advanceDays, isGameDate, randomOrigin, type GameDate, type OriginId } from './history';
import type { BattleMode } from './battlefield';
import { WORLD_CITIES, originCity } from './world';
import { isJourney, type Journey } from './travel';
import { gameDayNumber, initialRelationships, isDeployment, isRelationships, type Relationship } from './recruitment';
import { recruitProfile } from './recruitmentCatalog';
import { createEconomy, migrateEconomy, type Economy } from './economy';
import type { WorldConflict } from './worldConflictTypes';
import { createWorldConflict, migrateWorldConflict } from './worldConflict';
import { withWorldDate } from './worldTime';
import { validHeroName } from './heroName';
import { createMartialProgress, isDuelEncounter, isMartialProgress, type DuelEncounter, type MartialProgress } from './martial';
import { isBattleSnapshot } from './battleSave';
import type { CombatState } from './combat';
import type { LifeState } from './lifeTypes';
import { createLifeState, repairLifeState, isAliveAt,ensureLifePeople } from './personLife';

export type RouteId = 'cao' | 'sun' | 'liu';

export type DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending';

export interface GameState {
  heroName?: string;
  life?: LifeState;
  lifeMigration?: boolean;
  lifeRecovery?: boolean;
  martial: MartialProgress;
  duel?: DuelEncounter;
  activeBattle?: CombatState;
  battleRecovery?: boolean;
  martialRecovery?: boolean;
  date: GameDate;
  originId: OriginId;
  currentCityId: string;
  travelCount: number;
  journey?: Journey;
  travelNotice?: string;
  encounter?: BattleMode;
  phase: DemoPhase;
  route: RouteId | null;
  supplies: number;
  morale: number;
  flags: Record<string, boolean>;
  party: PartyProgress;
  deployed: string[];
  relationships: Record<string, Relationship>;
  battleParty?: string[];
  economy: Economy;
  travelDays: number;
  worldConflict?: WorldConflict;
  conflictRecovery?: boolean;
  conflictMigration?: boolean;
}

export const STORAGE_KEY = 'three-kingdoms-demo-state';

const routeAdvantages: Record<RouteId, Pick<GameState, 'supplies' | 'morale'>> = {
  cao: { supplies: 1, morale: 0 },
  sun: { supplies: 0, morale: 1 },
  liu: { supplies: 0, morale: 2 },
};

export function createInitialState(random: () => number = Math.random): GameState {
  const origin = randomOrigin(random);
  const date = { year: 184, month: 3, day: 1 };
  const life = createLifeState(date);
  const worldConflict=createWorldConflict(date,PARTY_IDS,undefined,life);
  return {
    life:ensureLifePeople(life,Object.values(worldConflict.cities).flatMap(c=>c.governorId?[c.governorId]:[])),
    martial: createMartialProgress(),
    date: { year: 184, month: 3, day: 1 },
    originId: origin.id,
    currentCityId: originCity(origin.id).id,
    travelCount: 0,
    phase: 'prologue',
    route: null,
    supplies: 3,
    morale: 2,
    flags: {},
    party: createPartyProgress(),
    deployed: [...PARTY_IDS],
    relationships: initialRelationships(),
    economy: createEconomy(),
    travelDays: 3,
    worldConflict,
  };
}

export function selectRoute(state: GameState, route: RouteId): GameState {
  if (state.route || !availableRoutes(state).includes(route)) return state;
  return {
    ...state,
    phase: 'route-choice',
    route,
    supplies: state.supplies + routeAdvantages[route].supplies,
    morale: state.morale + routeAdvantages[route].morale,
  };
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be disabled in an embedded browser; retain the in-memory game.
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) {
      return null;
    }

    const restored: GameState = { ...parsed,
      martial: parsed.martial === undefined ? createMartialProgress() : parsed.martial,
      date: { ...(parsed.date ?? { year: parsed.route ? 200 : 184, month: parsed.route ? 9 : 3 }), day: parsed.date?.day ?? 1 },
      originId: parsed.originId ?? 'yingchuan',
      currentCityId: parsed.currentCityId ?? originCity(parsed.originId ?? 'yingchuan').id,
      travelCount: parsed.travelCount ?? 0,
      flags: parsed.currentCityId === undefined && (parsed.flags['xp:route'] || parsed.flags['xp:escort']) ? { ...parsed.flags, escortWon: true } : parsed.flags,
      deployed: parsed.deployed ?? [...PARTY_IDS],
      relationships: parsed.relationships ?? initialRelationships(),
      economy: parsed.economy === undefined ? createEconomy() : migrateEconomy(parsed.economy)!,
      travelDays: parsed.travelDays ?? 3,
      party: parsed.party === undefined ? createPartyProgress() : migratePartyProgress(parsed.party)! };
    const backup = (module: string, data: unknown): void => {
      try { const key = `${STORAGE_KEY}:${module}-backup`; if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data)); } catch { /* Recovery still works with unavailable storage. */ }
    };
    if(parsed.life===undefined || (parsed.worldConflict as unknown as {version?:number})?.version===1) {
      try { if(!localStorage.getItem(`${STORAGE_KEY}:pre-1.0-backup`))localStorage.setItem(`${STORAGE_KEY}:pre-1.0-backup`,raw); } catch { /* Preserve the playable campaign even if quota prevents a backup. */ }
    }
    if((parsed.worldConflict as unknown as {version?:number})?.version===2){
      try { const key=`${STORAGE_KEY}:pre-1.1-fullbackup`;if(!localStorage.getItem(key))localStorage.setItem(key,raw); }catch{/* Continue with the in-memory campaign if storage is full. */}
    }
    if(parsed.life===undefined) { restored.life=createLifeState(restored.date); restored.lifeMigration=true; }
    else {
      const repaired=repairLifeState(parsed.life,restored.date);
      restored.life=repaired?.life??createLifeState(restored.date);
      if(!repaired||repaired.repaired) {backup('life',parsed.life);restored.lifeRecovery=true;}
    }
    if (parsed.heroName !== undefined) {
      const name = validHeroName(parsed.heroName);
      if (name) restored.heroName = name;
      else { backup('name', parsed.heroName); delete restored.heroName; }
    }
    if (!isMartialProgress(restored.martial, restored.date)) {
      backup('martial', parsed.martial); restored.martial = createMartialProgress(); restored.martialRecovery = true;
    }
    // A resumable duel must still have its paid, unsettled challenge after martial recovery.
    if (parsed.duel !== undefined && (!isDuelEncounter(parsed.duel, restored.date) || parsed.duel.status !== 'active' ||
      restored.phase !== 'battle' || !!restored.journey || !Array.isArray(restored.battleParty) ||
      restored.battleParty.length !== 1 || restored.battleParty[0] !== 'traveler' ||
      !restored.martial.challengeDates[parsed.duel.teacherId] ||
      gameDayNumber(restored.martial.challengeDates[parsed.duel.teacherId]) !== gameDayNumber(parsed.duel.started) ||
      restored.martial.settled.includes(parsed.duel.id))) {
      backup('duel', parsed.duel); delete restored.duel; delete restored.activeBattle;
      if (!restored.journey) { restored.phase = 'overworld'; restored.encounter = undefined; }
      restored.battleParty = undefined; restored.martialRecovery = true;
    }
    if (parsed.activeBattle !== undefined && !isBattleSnapshot(parsed.activeBattle, restored)) {
      backup('active-battle', parsed.activeBattle); delete restored.activeBattle; restored.battleRecovery = true;
    }
    const migratedWorld=parsed.worldConflict===undefined ? undefined : migrateWorldConflict(parsed.worldConflict,restored.date,Object.keys(restored.party),restored.life);
    if (parsed.conflictRecovery) {restored.worldConflict=undefined;restored.conflictRecovery=true;}
    else if (parsed.worldConflict !== undefined && !migratedWorld) {
      // Keep both the untouched original and all valid RPG progress until an explicit rebuild.
      try { if (!localStorage.getItem(`${STORAGE_KEY}:conflict-backup`)) localStorage.setItem(`${STORAGE_KEY}:conflict-backup`, raw); } catch { /* Storage may be unavailable. */ }
      restored.worldConflict=undefined;restored.conflictRecovery=true;
    }
    else if(migratedWorld) {restored.worldConflict=migratedWorld;if((parsed.worldConflict as unknown as {version:number}).version!==3)restored.conflictMigration=true;}
    // Older local victories left the encounter kind on an otherwise idle map save.
    // Keep real battle/duel evidence locked until its own settlement or recovery.
    if(restored.phase==='overworld' && parsed.activeBattle===undefined && parsed.duel===undefined &&
      parsed.battleParty===undefined && !parsed.journey?.event?.inBattle) restored.encounter=undefined;
    let initialized=withWorldDate(restored, restored.date);
    if(initialized.duel&&!isAliveAt(initialized.life,initialized.duel.teacherId,initialized.date,true)) {
      backup('duel-life',parsed.duel);backup('active-battle-life',parsed.activeBattle);
      initialized={...initialized,phase:'overworld',duel:undefined,activeBattle:undefined,battleParty:undefined,encounter:undefined,
        martial:{...initialized.martial,settled:[...new Set([...initialized.martial.settled,initialized.duel.id])]},
        travelNotice:'寿命迁移：切磋对手已在本局离世，此次切磋已结束，未发放武学。'};
    }
    else if(parsed.activeBattle!==undefined && initialized.battleParty?.join('|')!==restored.battleParty?.join('|')) {
      backup('active-battle-life',parsed.activeBattle);initialized={...initialized,activeBattle:undefined,battleRecovery:true};
    }
    if(parsed.worldConflict===undefined&&!initialized.conflictRecovery)initialized={...initialized,conflictMigration:true};
    // Persist the first life draw and expansion immediately; refreshing must never reroll it.
    saveState(initialized);
    return initialized;
  } catch {
    return null;
  }
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GameState>;
  const phases: DemoPhase[] = ['prologue', 'overworld', 'route-choice', 'battle', 'ending'];
  const routes: Array<RouteId | null> = [null, 'cao', 'sun', 'liu'];
  const party = candidate.party ?? createPartyProgress();
  const date = candidate.date ?? { year: candidate.route ? 200 : 184, month: candidate.route ? 9 : 3 };

  return (
    typeof candidate.phase === 'string' &&
    phases.includes(candidate.phase as DemoPhase) &&
    routes.includes(candidate.route as RouteId | null) &&
    Number.isSafeInteger(candidate.supplies) && candidate.supplies! >= 0 &&
    Number.isSafeInteger(candidate.morale) && candidate.morale! >= 0 &&
    !!candidate.flags &&
    typeof candidate.flags === 'object' &&
    !Array.isArray(candidate.flags) &&
    Object.values(candidate.flags).every((flag) => typeof flag === 'boolean') &&
    (candidate.date === undefined || isGameDate(candidate.date)) &&
    (candidate.originId === undefined || ORIGINS.some(o => o.id === candidate.originId)) &&
    (candidate.currentCityId === undefined || WORLD_CITIES.some(c => c.id === candidate.currentCityId)) &&
    (candidate.travelCount === undefined || Number.isSafeInteger(candidate.travelCount) && candidate.travelCount >= 0) &&
    (candidate.travelNotice === undefined || typeof candidate.travelNotice === 'string' && candidate.travelNotice.length < 1000) &&
    (candidate.journey === undefined || !!candidate.currentCityId && isJourney(candidate.journey, candidate.currentCityId, candidate.phase!) && candidate.journey.serial === candidate.travelCount) &&
    (candidate.journey === undefined || candidate.phase !== 'battle' || candidate.encounter === 'ambush') &&
    (candidate.encounter === undefined || ['ambush', 'route'].includes(candidate.encounter)) &&
    (candidate.date === undefined || candidate.date.year >= 200 || !candidate.route || candidate.flags?.[`met:${candidate.route}`] === true) &&
    (candidate.party === undefined || migratePartyProgress(candidate.party) !== null && Object.keys(candidate.party).every(id => !!recruitProfile(id) && !recruitProfile(id)!.readOnly)) &&
    (candidate.deployed === undefined || isDeployment(candidate.deployed, party)) &&
    (candidate.relationships === undefined || isRelationships(candidate.relationships, date)) &&
    (candidate.economy === undefined || migrateEconomy(candidate.economy) !== null) &&
    (candidate.travelDays === undefined || Number.isSafeInteger(candidate.travelDays) && candidate.travelDays >= 1 && candidate.travelDays <= 30) &&
    (candidate.conflictRecovery === undefined || typeof candidate.conflictRecovery === 'boolean') &&
    (candidate.conflictMigration === undefined || typeof candidate.conflictMigration === 'boolean') &&
    (candidate.battleRecovery === undefined || typeof candidate.battleRecovery === 'boolean') &&
    (candidate.martialRecovery === undefined || typeof candidate.martialRecovery === 'boolean') &&
    (candidate.duel !== undefined || candidate.battleParty === undefined || candidate.phase === 'battle' && isDeployment(candidate.battleParty, party) &&
      candidate.battleParty.join('|') === (candidate.deployed ?? PARTY_IDS).join('|'))
  );
}

export function availableRoutes(state: GameState): RouteId[] {
  return (['cao', 'sun', 'liu'] as RouteId[]).filter(route => state.flags[`met:${route}`] || state.date.year >= 200);
}

export function completeJourneyTask(state: GameState, task: 'ambushWon' | 'recovered' | 'escortWon'): GameState {
  if (state.flags[task] || state.journey) return state;
  return withWorldDate({ ...state, flags: { ...state.flags, [task]: true } }, advanceDays(state.date, task === 'escortWon' ? 3 : 1));
}

export function continueJourney(state: GameState): GameState {
  if (!state.flags.escortWon || state.phase === 'overworld') return state;
  return { ...state, phase: 'overworld', encounter: undefined };
}

export function rewardVictory(state: GameState, encounter: 'ambush' | 'route' | 'escort'): GameState {
  const key = `xp:${encounter}`;
  if (state.flags[key]) return state;
  const party = { ...state.party };
  const fighters = (state.battleParty ?? state.deployed).filter(id=>Object.hasOwn(party,id)&&isAliveAt(state.life,id,state.date,true));
  for (const id of fighters) {
    const base = encounter === 'ambush' ? 30 : 45;
    party[id] = grantExperience(party[id], victoryExperience(base,effectiveAttributes(id,party[id].attributes,state.activeBattle?state.activeBattle.attributeVersion??1:2)));
  }
  const supplies = state.supplies + fighters.reduce((sum, id) => sum + attributeBonuses(effectiveAttributes(id,party[id].attributes,state.activeBattle?state.activeBattle.attributeVersion??1:2)).supplies, 0);
  return { ...state, party, supplies, flags: { ...state.flags, [key]: true } };
}

export function canPlayFactionMission(state: GameState): boolean {
  return !state.journey && !!state.route && !state.flags['xp:route'];
}

export function completeLocalEscort(state: GameState): GameState {
  if (state.journey) return state;
  const rewarded = rewardVictory(state, state.route ? 'route' : 'escort');
  if (rewarded === state) return state;
  return withWorldDate({ ...rewarded, flags: { ...rewarded.flags, escortWon: true } }, advanceDays(state.date, 3));
}


export function spendSkillPoints(state: GameState, id: PartyId, allocation: Partial<Record<AttributeId, number>>): GameState {
  if (state.phase === 'battle' || state.journey?.event || !isAliveAt(state.life,id,state.date,true) || !Object.hasOwn(state.party, id) || !allocation || typeof allocation !== 'object') return state;
  const current = state.party[id];
  const attrs = { ...current.attributes };
  let cost = 0;
  for (const [key, value] of Object.entries(allocation)) {
    if (!ATTRIBUTE_IDS.includes(key as AttributeId) || !Number.isSafeInteger(value) || value! < 0 || attrs[key as AttributeId] + value! > 30) return state;
    cost += value!;
    attrs[key as AttributeId] += value!;
  }
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > current.points) return state;
  return { ...state, party: { ...state.party, [id]: { ...current, points: current.points - cost, attributes: attrs } } };
}
