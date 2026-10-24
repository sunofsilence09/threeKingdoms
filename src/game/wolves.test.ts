import { describe, expect, it } from 'vitest';
import { createCombatState, terrainAt, WEAPONS } from './combat';
import { createPartyProgress, createProgress } from './growth';

describe('wolf encounters', () => {
  it('spawns actual wolves instead of human bandits, with valid positions for five fighters', () => {
    const party = { ...createPartyProgress(), 'guan-yu': createProgress(), 'zhang-fei': createProgress() };
    const deployed = Object.keys(party);
    const state = createCombatState(null, party, 'ambush', deployed, { enemyKind: 'wolves' });
    const enemies = state.units.filter(u => u.team === 'enemy');
    expect(enemies).toHaveLength(5);
    for (const enemy of enemies) {
      expect(enemy.id).toMatch(/^wolf:/);
      expect(enemy.name).toContain('狼');
      expect(enemy.weapon).toBe('claws');
      expect(WEAPONS[enemy.weapon].name).toBe('爪牙');
    }
    expect(new Set(state.units.map(u => `${u.x},${u.y}`)).size).toBe(10);
    for (const unit of state.units) expect(['water', 'rock', 'wall', 'cart']).not.toContain(terrainAt(state, unit.x, unit.y));
  });
  it('keeps three wolves for a solo traveler and does not alter legacy bandits', () => {
    const party = createPartyProgress();
    expect(createCombatState(null, party, 'ambush', ['traveler'], { enemyKind: 'wolves' }).units.filter(u => u.team === 'enemy')).toHaveLength(3);
    expect(createCombatState(null).units.filter(u => u.team === 'enemy').every(u => u.id.startsWith('bandit'))).toBe(true);
  });
});
