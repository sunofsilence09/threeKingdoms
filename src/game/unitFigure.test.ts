import { describe, expect, it } from 'vitest';
import { paintUnitFigure, type FigurePainter } from './unitFigure';
import { HERO_WEAPONS } from './heroVisuals';

function geometry(level: number, weapon: typeof HERO_WEAPONS[number]): string {
  const calls: unknown[] = [];
  const painter = new Proxy({}, { get: (_, method) => (...args: unknown[]) => { calls.push([method, ...args]); return painter; } }) as FigurePainter;
  paintUnitFigure(painter, { id: 'traveler', level, weapon });
  return JSON.stringify(calls);
}

describe('shared hero figure progression', () => {
  it('draws the authored left-eye cover only from the injury year', () => {
    function face(year: number) {
      const calls: unknown[] = [];
      const painter = new Proxy({}, { get: (_, method) => (...args: unknown[]) => { calls.push([method, ...args]); return painter; } }) as FigurePainter;
      paintUnitFigure(painter, { id: 'xiahou-dun', weapon: 'glaive' }, { year, month: 1 });
      return JSON.stringify(calls);
    }
    expect(face(193)).not.toBe(face(194));
    expect(face(194)).toBe(face(210));
  });
  it('renders fifteen distinct stage/weapon figures without changing the supplied unit', () => {
    const figures = [1, 3, 6].flatMap(level => HERO_WEAPONS.map(weapon => geometry(level, weapon)));
    expect(new Set(figures).size).toBe(15);
    expect(geometry(1, 'bow')).toBe(geometry(2, 'bow'));
    expect(geometry(3, 'bow')).toBe(geometry(5, 'bow'));
    expect(geometry(6, 'bow')).toBe(geometry(10, 'bow'));
  });
});
