import type { GameDate } from './history';
import type { TerrainKind } from './battlefield';

export function hex(color: number): string { return `#${color.toString(16).padStart(6, '0')}`; }
function mix(a: number, b: number, amount: number): number {
  const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
export function themeFor(date: GameDate) {
  const season = date.month >= 3 && date.month <= 5 ? 0 : date.month >= 6 && date.month <= 8 ? 1 : date.month >= 9 && date.month <= 11 ? 2 : 3;
  const palettes = [
    { name: '春', ground: 0xe5eccd, road: 0xdcd9a7, woods: 0xafd29c, water: 0xa8d9df },
    { name: '夏', ground: 0xdce8d2, road: 0xdbdfb4, woods: 0x97c28d, water: 0x94d0dc },
    { name: '秋', ground: 0xf0dfbb, road: 0xe6ca96, woods: 0xc5c38f, water: 0xa8cfd5 },
    { name: '冬', ground: 0xe4e8e4, road: 0xd9d6c8, woods: 0xb6c8b5, water: 0xb6d4df },
  ][season];
  const tint = date.year >= 208 ? 0xc4e0df : date.year >= 200 ? 0xe5d9b6 : date.year >= 194 ? 0xe3d5c3 : date.year >= 190 ? 0xe5d4bf : 0xe6e5bf;
  const terrain: Record<TerrainKind, number> = {
    road: mix(palettes.road, tint, .18), woods: palettes.woods, water: palettes.water,
    rock: 0xc4c9c2, cart: 0xd7b786, wall: 0xd6cdb7, bridge: 0xd0aa73,
  };
  return {
    season: palettes.name, background: mix(palettes.ground, tint, .3), paper: 0xf8f5e7,
    ink: 0x293d35, muted: 0x526355, accent: 0x866022, border: 0x91a083,
    terrain, grid: 0x6b795a, move: 0x2a775e, enemy: 0x9b433b,
  };
}
export function applyCalendarTheme(date: GameDate): void {
  const theme = themeFor(date);
  for (const key of ['background', 'paper', 'ink', 'muted', 'accent', 'border'] as const)
    document.documentElement.style.setProperty(`--game-${key}`, hex(theme[key]));
  document.documentElement.dataset.season = theme.season;
}
