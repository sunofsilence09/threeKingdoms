import { describe, expect, it } from 'vitest';
import { activateUltimate, advanceTurn, createCombatState, currentActor, makePartyUnit, movementRange, performAttack, type CombatState } from './combat';
import { createPartyProgress, createProgress } from './growth';
import { getUnitAppearance } from './characters';
import { makeGarrisonUnit } from './garrisonCombat';
import { WORLD_CITIES } from './world';

function encounter(troops = 5000, playerAttack = 3): CombatState {
  const base = createCombatState(null);
  return advanceTurn({ ...base, terrain: [], units: [
    { ...makePartyUnit('traveler', createProgress(), null, 'ambush', 1, 1), attack: playerAttack },
    makeGarrisonUnit('zhuo', troops, 2, 1),
  ], actedIds: [], movedIds: [] });
}

describe('pooled garrison formations in the actual combat engine', () => {
  it('rejects read-only people as a forged direct party deployment', () => {
    for (const id of ['himiko', 'garrison:zhuo:soldier']) {
      expect(() => createCombatState(null, { ...createPartyProgress(), [id]: createProgress() }, 'ambush', ['traveler', id])).toThrow('Invalid battle deployment');
    }
  });
  it('creates one city formation with pooled strength and ordinary movement and appearance', () => {
    for (const city of WORLD_CITIES) {
      const unit = makeGarrisonUnit(city.id, 5000);
      expect(unit).toMatchObject({ id: `enemy:garrison:${city.id}:soldier`, team: 'enemy', weapon: 'spear', hp: 50000, maxHp: 50000, attack: 15000, defense: 5000, speed: 11 });
      expect(unit.formation?.attributes.strength).toBe(50000);
      expect(movementRange(encounter(), unit)).toBe(3);
      expect(getUnitAppearance(unit).portrait).toBe('/assets/characters/local-soldier-v1.png');
    }
    expect(() => makeGarrisonUnit('unknown', 5000)).toThrow();
    expect(() => makeGarrisonUnit('__proto__', 5000)).toThrow();
  });

  it('lets a weak party member barely scratch 5000 guards, whose actual attack defeats them', () => {
    const before = encounter();
    const attacked = performAttack(before, 'traveler', 'enemy:garrison:zhuo:soldier');
    const guard = attacked.units[1];
    expect(attacked.lastEvent?.damage).toBe(1);
    expect(guard.hp).toBe(49999);
    expect(guard.formation?.troops).toBe(5000);
    expect(guard.attack).toBe(15000);
    const guardTurn = advanceTurn(attacked);
    expect(currentActor(guardTurn)?.id).toBe(guard.id);
    const counter = performAttack(guardTurn, guard.id, 'traveler');
    expect(counter.lastEvent?.damage).toBe(15000);
    expect(counter.units[0].hp).toBe(0);
    expect(before.units[1].hp).toBe(50000);
  });

  it('reduces effective attack, defense and attributes when real damage causes casualties', () => {
    const before = encounter(5000, 5021);
    const attacked = performAttack(before, 'traveler', 'enemy:garrison:zhuo:soldier');
    const guard = attacked.units[1];
    expect(attacked.lastEvent?.damage).toBe(21);
    expect(guard).toMatchObject({ hp: 49979, maxHp: 50000, attack: 14994, defense: 4998 });
    expect(guard.formation).toMatchObject({ initialTroops: 5000, troops: 4998, hp: 49979, attributes: { strength: 49980 } });
    expect(before.units[1].formation?.troops).toBe(5000);
  });

  it('applies ultimate self-cost to pooled soldiers before their empowered attack', () => {
    const before = encounter();
    const guardTurn = advanceTurn({ ...before, actedIds: ['traveler'] });
    const activated = activateUltimate(guardTurn, 'enemy:garrison:zhuo:soldier');
    const guard = activated.units[1];
    expect(guard).toMatchObject({ hp: 40000, attack: 12000, defense: 4000, empowered: true, ultimateUsed: true });
    expect(guard.formation).toMatchObject({ troops: 4000, hp: 40000, attributes: { strength: 40000 } });
    expect(performAttack(activated, guard.id, 'traveler').lastEvent?.damage).toBe(18000);
  });

  it('drops all effective combat power when the last soldier falls', () => {
    const attacked = performAttack(encounter(1, 99), 'traveler', 'enemy:garrison:zhuo:soldier');
    expect(attacked.units[1]).toMatchObject({ hp: 0, attack: 0, defense: 0, formation: { troops: 0, attributes: { command: 0 } } });
  });
});
