export interface ConflictCity { factionId: string; troops: number; occupationDay: number; governorId?: string; governorKind?: 'historical'|'original'; governorSince?:number }
export type ArmyPhase = 'assembling' | 'marching' | 'sieging' | 'retreating' | 'camped';
export interface ConflictArmy {
  id: string; factionId: string; commanderId?: string; sourceCityId: string; targetCityId: string; troops: number;
  contributions: { cityId: string; troops: number }[]; phase: ArmyPhase; path: string[]; legIndex: number; legDay: number; phaseDays: number;
}
export interface ConflictReport {
  id: number; day: number; kind: string; factionId: string; cityId: string; opponentFactionId?: string;
  armyId?: string; troops?: number; losses?: number; text: string;
}
export interface WorldConflict {
  version: 3; lastDay: number; seed: number; nextArmyId: number; nextReportId: number; nextPrefectId:number;prefectIds:string[];
  cities: Record<string, ConflictCity>; armies: ConflictArmy[]; founded: string[]; nextDecision: Record<string, number>;
  reports: ConflictReport[]; ledger: { initial: number; recruited: number; raised: number; losses: number; expansion?: number };
  /** Actual player soldiers travelling with the party, audited in the same troop ledger. */
  playerReserve?:number;
}
export interface ConflictFaction { id: string; name: string; color: string }
