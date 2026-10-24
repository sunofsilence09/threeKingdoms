import type { Progress } from './growth';
import type { Relationship } from './recruitment';

/** Historical reference values remain separate from fixed game estimates. */
export interface LifeBaseline {
  id: string;
  birthYear: number;
  historicalBirthYear: number | null;
  deathBaseYear: number;
  historicalDeathYear: number | null;
  birthEstimated: boolean;
  deathEstimated: boolean;
  basis: string;
  source: string;
}
export interface PersonLife { birthYear: number; deathYear: number }
export interface LifeMemorial {
  id: string;
  deathYear: number;
  age: number;
  progress: Progress;
  relationship?: Relationship;
}
export interface LifeNotice { id: string; deathYear: number; migrated: boolean }
export interface LifeState {
  version: 1;
  catalogVersion: 1;
  /** Independent campaign seed. Querying a life never consumes a random stream. */
  seed: number;
  people: Record<string, PersonLife>;
  memorials: Record<string, LifeMemorial>;
  notices: LifeNotice[];
  handledIds: string[];
  lastDay: number;
}
export type LifeStatus = 'untracked' | 'unborn' | 'child' | 'alive' | 'dead';
