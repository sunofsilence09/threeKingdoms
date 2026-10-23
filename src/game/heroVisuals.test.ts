import { describe, expect, it } from 'vitest';
import { HERO_STAGES, HERO_WEAPONS, getHeroStage, getHeroVisual } from './heroVisuals';

describe('Jiang Yuan stage and weapon portraits', () => {
  it('changes stage at levels 3 and 6 and handles invalid display levels safely', () => {
    expect([1, 2, 3, 5, 6, 10].map(n => getHeroStage(n).id)).toEqual(['refugee', 'refugee', 'veteran', 'veteran', 'commander', 'commander']);
    expect(getHeroStage(NaN).id).toBe('refugee');
    expect(getHeroStage(-2).id).toBe('refugee');
    expect(getHeroStage(100).id).toBe('commander');
  });
  it('covers all fifteen combinations with independent assets and preserves the original opening', () => {
    const visuals = HERO_STAGES.flatMap(s => HERO_WEAPONS.map(w => getHeroVisual(s.minLevel, w)));
    expect(visuals).toHaveLength(15);
    expect(new Set(visuals.map(v => v.portrait)).size).toBe(15);
    expect(getHeroVisual(1, 'cleaver').portrait).toBe('/assets/characters/jiang-yuan-refugee-v1.png');
    for (const stage of HERO_STAGES) {
      for (const weapon of HERO_WEAPONS) {
        const v = getHeroVisual(stage.minLevel, weapon);
        expect(v.weapon).toBe(weapon);
        expect(v.stage).toBe(stage);
        expect(v.portrait).toMatch(/\.png$/);
      }
    }
  });
  it('grows clothing independently of weapon choice', () => {
    expect(getHeroVisual(2, 'bow').outfit).toBe('tunic');
    expect(getHeroVisual(3, 'bow').outfit).toBe('tunic');
    expect(getHeroVisual(6, 'bow').outfit).toBe('armor');
    expect(getHeroVisual(10, 'fists').weapon).toBe('fists');
    expect(getHeroVisual(10, 'cleaver').weapon).toBe('cleaver');
  });
});
