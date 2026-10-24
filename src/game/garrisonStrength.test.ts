import { describe, expect, it } from 'vitest';
import { applyFormationDamage, formationStrength } from './garrisonStrength';

describe('ordinary soldiers as a combined formation', () => {
  it('adds each soldier life and attributes while retaining ordinary movement and speed', () => {
    const single = formationStrength(1), city = formationStrength(5000);
    expect(city.hp).toBe(single.hp * 5000);
    expect(city.attack).toBe(single.attack * 5000);
    expect(city.defense).toBe(single.defense * 5000);
    for (const key of Object.keys(single.attributes) as (keyof typeof single.attributes)[]) expect(city.attributes[key]).toBe(single.attributes[key] * 5000);
    expect(city.speed).toBe(single.speed); expect(city.move).toBe(single.move);
    expect(city.maxRange).toBe(single.maxRange);
  });
  it('reduces effective troop count and combat power as pooled HP is lost without mutating the original formation', () => {
    const initial = formationStrength(5000), wounded = applyFormationDamage(initial, 21);
    expect(initial.hp).toBe(50000); expect(initial.troops).toBe(5000);
    expect(wounded.hp).toBe(49979); expect(wounded.troops).toBe(4998);
    expect(wounded.attack).toBe(4998 * 3); expect(wounded.defense).toBe(4998);
    const lost = applyFormationDamage(wounded, 999999);
    expect(lost.hp).toBe(0); expect(lost.troops).toBe(0); expect(lost.attack).toBe(0); expect(lost.attributes.strength).toBe(0);
  });
  it('refuses invalid troop counts or damage and prevents over-healing', () => {
    for (const count of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) expect(() => formationStrength(count)).toThrow();
    const group = formationStrength(2);
    expect(applyFormationDamage(group, -1)).toBe(group); expect(applyFormationDamage(group, NaN)).toBe(group);
    expect(formationStrength(2, 999).hp).toBe(20);
  });
});
