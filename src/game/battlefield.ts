export type TerrainKind = 'road' | 'woods' | 'rock' | 'cart' | 'wall' | 'water' | 'bridge';
export interface TerrainTile { x: number; y: number; kind: TerrainKind }
export type BattleMode = 'ambush' | 'route';

export const TERRAIN: Record<TerrainKind, { name: string; color: number; cost: number; blocksSight: boolean; description: string }> = {
  road: { name: '道路', color: 0x343a32, cost: 1, blocksSight: false, description: '通行消耗 1 点移动力。' },
  woods: { name: '树林', color: 0x304c3c, cost: 2, blocksSight: false, description: '通行消耗 2 点移动力；远程伤害减少 1。' },
  rock: { name: '巨石', color: 0x50575a, cost: Infinity, blocksSight: true, description: '无法通行，阻挡攻击视线。' },
  cart: { name: '倒车', color: 0x6c5137, cost: Infinity, blocksSight: true, description: '倾覆的粮车，无法通行或隔车攻击。' },
  wall: { name: '断墙', color: 0x66604c, cost: Infinity, blocksSight: true, description: '无法通行，阻挡攻击视线。' },
  water: { name: '河道', color: 0x294d5b, cost: Infinity, blocksSight: false, description: '无法涉水，寻找桥梁；不阻挡射击。' },
  bridge: { name: '木桥', color: 0x8a6b43, cost: 1, blocksSight: false, description: '通行消耗 1 点移动力，留意桥头堵截。' },
};

export function createTerrain(mode: BattleMode): TerrainTile[] {
  const tiles = new Map<string, TerrainTile>();
  const place = (kind: TerrainKind, points: number[][]) => {
    for (const [x, y] of points) tiles.set(`${x},${y}`, { x, y, kind });
  };
  if (mode === 'ambush') {
    place('woods', [[1, 1], [2, 1], [3, 2], [4, 2], [7, 2], [8, 2], [2, 7], [3, 7], [5, 7], [6, 7], [9, 7], [11, 3], [12, 3], [13, 6]]);
    place('rock', [[5, 2], [5, 3], [5, 4], [11, 6], [12, 6], [13, 2]]);
    place('cart', [[6, 5], [6, 6]]);
  } else {
    place('water', Array.from({ length: 10 }, (_, y) => [9, y]));
    place('bridge', [[9, 3], [9, 7]]);
    place('wall', [[6, 3], [6, 4], [6, 5], [12, 2], [13, 2], [12, 7]]);
    place('woods', [[3, 2], [4, 2], [5, 2], [6, 7], [7, 7], [8, 7], [11, 5], [12, 5], [13, 5]]);
    place('rock', [[1, 4], [2, 4], [14, 8]]);
  }
  return [...tiles.values()];
}
