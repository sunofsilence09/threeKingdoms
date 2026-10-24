import type { OriginId, ProvinceId } from './history';

export interface WorldCity {
  id: string;
  name: string;
  provinceId: ProvinceId;
  prefecture: string;
  lon: number;
  lat: number;
  originId?: OriginId;
}
export interface WorldRoad {
  from: string;
  to: string;
  kind: 'road' | 'water' | 'mountain';
  via?: [number, number][];
}
export interface WorldRoute {
  path: string[];
  legs: { from: string; to: string; days: number; kind: WorldRoad['kind'] }[];
  days: number;
}
/** Original approximate positions, not survey coordinates or reconstructed borders. */
export const WORLD_CITIES: WorldCity[] = [
  { id: 'yingchuan', name: '阳翟', provinceId: 'yu', prefecture: '颍川郡', lon: 113.47, lat: 34.16, originId: 'yingchuan' },
  { id: 'runan', name: '平舆', provinceId: 'yu', prefecture: '汝南郡', lon: 114.62, lat: 32.96, originId: 'runan' },
  { id: 'nanyang', name: '宛', provinceId: 'jing', prefecture: '南阳郡', lon: 112.53, lat: 33.00, originId: 'nanyang' },
  { id: 'zhuo', name: '涿', provinceId: 'you', prefecture: '涿郡', lon: 115.98, lat: 39.48, originId: 'zhuo' },
  { id: 'henan', name: '洛阳', provinceId: 'sili', prefecture: '河南尹', lon: 112.65, lat: 34.73, originId: 'henan' },
  { id: 'dongjun', name: '濮阳', provinceId: 'yan', prefecture: '东郡', lon: 115.03, lat: 35.71, originId: 'dongjun' },
  { id: 'donghai', name: '郯', provinceId: 'xu', prefecture: '东海国', lon: 118.35, lat: 34.61, originId: 'donghai' },
  { id: 'beihai', name: '剧', provinceId: 'qing', prefecture: '北海国', lon: 118.49, lat: 36.88, originId: 'beihai' },
  { id: 'julu', name: '廮陶', provinceId: 'ji', prefecture: '巨鹿郡', lon: 114.92, lat: 37.55, originId: 'julu' },
  { id: 'taiyuan', name: '晋阳', provinceId: 'bing', prefecture: '太原郡', lon: 112.44, lat: 37.71, originId: 'taiyuan' },
  { id: 'wuwei', name: '姑臧', provinceId: 'liang', prefecture: '武威郡', lon: 102.64, lat: 37.93, originId: 'wuwei' },
  { id: 'shujun', name: '成都', provinceId: 'yi', prefecture: '蜀郡', lon: 104.06, lat: 30.67, originId: 'shujun' },
  { id: 'changsha', name: '临湘', provinceId: 'jing', prefecture: '长沙郡', lon: 112.98, lat: 28.20, originId: 'changsha' },
  { id: 'wujun', name: '吴', provinceId: 'yang', prefecture: '吴郡', lon: 120.62, lat: 31.31, originId: 'wujun' },
  { id: 'danyang', name: '宛陵', provinceId: 'yang', prefecture: '丹阳郡', lon: 118.76, lat: 30.95, originId: 'danyang' },
  { id: 'nanhai', name: '番禺', provinceId: 'jiao', prefecture: '南海郡', lon: 113.27, lat: 23.13, originId: 'nanhai' },
  { id: 'changan', name: '长安', provinceId: 'sili', prefecture: '京兆尹', lon: 108.87, lat: 34.34 },
  { id: 'chenliu', name: '陈留', provinceId: 'yan', prefecture: '陈留郡', lon: 114.53, lat: 34.68 },
  { id: 'xuxian', name: '许', provinceId: 'yu', prefecture: '颍川郡', lon: 113.94, lat: 34.02 },
  { id: 'ye', name: '邺', provinceId: 'ji', prefecture: '魏郡', lon: 114.61, lat: 36.28 },
  { id: 'ji', name: '蓟', provinceId: 'you', prefecture: '广阳郡', lon: 116.35, lat: 39.89 },
  { id: 'linzi', name: '临淄', provinceId: 'qing', prefecture: '齐国', lon: 118.30, lat: 36.85 },
  { id: 'xiangyang', name: '襄阳', provinceId: 'jing', prefecture: '南郡', lon: 112.14, lat: 32.04 },
  { id: 'jiangling', name: '江陵', provinceId: 'jing', prefecture: '南郡', lon: 112.19, lat: 30.35 },
  { id: 'nanzheng', name: '南郑', provinceId: 'yi', prefecture: '汉中郡', lon: 107.03, lat: 33.07 },
  { id: 'jiangzhou', name: '江州', provinceId: 'yi', prefecture: '巴郡', lon: 106.58, lat: 29.56 },
  { id: 'guangling', name: '广陵', provinceId: 'xu', prefecture: '广陵郡', lon: 119.45, lat: 32.40 },
  { id: 'nanchang', name: '南昌', provinceId: 'yang', prefecture: '豫章郡', lon: 115.90, lat: 28.68 },
  { id: 'shanyin', name: '山阴', provinceId: 'yang', prefecture: '会稽郡', lon: 120.58, lat: 30.00 },
  { id: 'quanling', name: '泉陵', provinceId: 'jing', prefecture: '零陵郡', lon: 111.61, lat: 26.23 },
  { id: 'chen', name: '郴', provinceId: 'jing', prefecture: '桂阳郡', lon: 113.03, lat: 25.80 },
  { id: 'guangxin', name: '广信', provinceId: 'jiao', prefecture: '苍梧郡', lon: 111.38, lat: 23.48 },
  { id: 'jincheng', name: '允吾', provinceId: 'liang', prefecture: '金城郡', lon: 102.85, lat: 36.10 },
  { id: 'didao', name: '狄道', provinceId: 'liang', prefecture: '陇西郡', lon: 103.86, lat: 35.38 },
  { id: 'shouchun', name: '寿春', provinceId: 'yang', prefecture: '九江郡', lon: 116.78, lat: 32.58 },
  { id: 'xiapi', name: '下邳', provinceId: 'xu', prefecture: '下邳国', lon: 117.95, lat: 34.10 },
];

/** Undirected travel corridors. Intermediate points are [longitude, latitude]. */
export const WORLD_ROADS: WorldRoad[] = [
  // Independent approximate regional corridors; prior links remain valid for saved journeys.
  { from: 'runan', to: 'shouchun', kind: 'road', via: [[115.40, 32.89], [116.10, 32.70]] },
  { from: 'shouchun', to: 'guangling', kind: 'road', via: [[117.40, 32.60], [118.25, 32.56], [118.90, 32.42]] },
  { from: 'shouchun', to: 'danyang', kind: 'road', via: [[117.10, 32.19], [117.36, 31.76], [118.02, 31.30]] },
  { from: 'donghai', to: 'xiapi', kind: 'road' },
  { from: 'xiapi', to: 'guangling', kind: 'road', via: [[118.25, 33.65], [118.85, 33.10]] },
  { from: 'wuwei', to: 'jincheng', kind: 'mountain', via: [[102.89, 37.47], [103.15, 37.02], [102.99, 36.62]] },
  { from: 'jincheng', to: 'didao', kind: 'road', via: [[103.26, 36.04], [103.72, 36.06]] },
  { from: 'didao', to: 'changan', kind: 'mountain', via: [[104.64, 35.00], [105.72, 34.58], [106.68, 34.38], [107.38, 34.36]] },
  { from: 'changan', to: 'henan', kind: 'road', via: [[109.77, 34.53], [110.25, 34.58], [111.17, 34.77], [111.88, 34.75]] },
  // Blue-field / Shang-Luo / Wuguan / Dan valley, rather than a Qinling chord.
  { from: 'changan', to: 'nanyang', kind: 'mountain', via: [[109.32, 34.15], [109.62, 33.85], [109.94, 33.87], [110.55, 33.71], [111.49, 33.30]] },
  // Guanzhong to Hanzhong via the Bao-Xie corridor; then Jinniu road to Shu.
  { from: 'changan', to: 'nanzheng', kind: 'mountain', via: [[107.73, 34.27], [107.53, 34.03], [107.31, 33.70], [107.05, 33.25]] },
  { from: 'nanzheng', to: 'shujun', kind: 'mountain', via: [[106.25, 32.83], [105.84, 32.43], [105.52, 32.29], [105.18, 31.84], [104.74, 31.47]] },
  { from: 'shujun', to: 'jiangzhou', kind: 'road', via: [[104.64, 30.12], [105.45, 29.58]] },
  // Yangtze gorges and Jing-Yang water corridor: bends are deliberate.
  { from: 'jiangzhou', to: 'jiangling', kind: 'water', via: [[107.40, 29.70], [107.75, 30.28], [108.42, 30.82], [109.53, 31.02], [110.39, 31.03], [111.28, 30.70], [111.55, 30.42]] },
  { from: 'henan', to: 'yingchuan', kind: 'road', via: [[113.02, 34.47]] },
  { from: 'henan', to: 'chenliu', kind: 'road', via: [[113.44, 34.81], [114.04, 34.78]] },
  { from: 'yingchuan', to: 'xuxian', kind: 'road' },
  { from: 'xuxian', to: 'chenliu', kind: 'road' },
  { from: 'xuxian', to: 'runan', kind: 'road', via: [[114.02, 33.57]] },
  { from: 'yingchuan', to: 'nanyang', kind: 'road', via: [[113.10, 33.74], [112.84, 33.49]] },
  { from: 'runan', to: 'nanyang', kind: 'road', via: [[113.50, 32.72]] },
  { from: 'chenliu', to: 'dongjun', kind: 'road', via: [[114.77, 35.28]] },
  { from: 'dongjun', to: 'ye', kind: 'road', via: [[114.62, 35.95]] },
  { from: 'ye', to: 'julu', kind: 'road' },
  { from: 'julu', to: 'zhuo', kind: 'road', via: [[115.14, 38.23], [115.48, 38.86]] },
  { from: 'zhuo', to: 'ji', kind: 'road' },
  { from: 'julu', to: 'taiyuan', kind: 'mountain', via: [[114.49, 37.88], [114.04, 37.91], [113.57, 37.86], [113.18, 37.88]] },
  { from: 'taiyuan', to: 'henan', kind: 'mountain', via: [[112.32, 37.20], [111.52, 36.08], [111.36, 35.62], [111.23, 35.20], [112.02, 34.95]] },
  { from: 'dongjun', to: 'linzi', kind: 'road', via: [[116.00, 36.14], [116.97, 36.65]] },
  { from: 'linzi', to: 'beihai', kind: 'road' },
  { from: 'beihai', to: 'donghai', kind: 'road', via: [[118.80, 36.18], [118.47, 35.55]] },
  { from: 'chenliu', to: 'donghai', kind: 'road', via: [[115.65, 34.43], [117.19, 34.27]] },
  { from: 'donghai', to: 'guangling', kind: 'road', via: [[119.02, 33.60], [119.02, 33.00]] },
  { from: 'guangling', to: 'wujun', kind: 'road', via: [[119.42, 32.18], [119.59, 31.99], [120.00, 31.78]] },
  { from: 'wujun', to: 'shanyin', kind: 'road', via: [[120.75, 30.75], [120.18, 30.25]] },
  { from: 'wujun', to: 'danyang', kind: 'road', via: [[119.92, 31.28], [119.44, 31.12]] },
  { from: 'danyang', to: 'guangling', kind: 'road', via: [[118.77, 31.57], [118.79, 32.06], [119.20, 32.18]] },
  { from: 'nanyang', to: 'xiangyang', kind: 'road', via: [[112.08, 32.68]] },
  { from: 'xiangyang', to: 'jiangling', kind: 'road', via: [[112.20, 31.69], [112.20, 31.03]] },
  { from: 'jiangling', to: 'changsha', kind: 'water', via: [[112.30, 30.08], [112.84, 29.76], [113.13, 29.38], [112.89, 28.93], [112.87, 28.49]] },
  { from: 'jiangling', to: 'nanchang', kind: 'water', via: [[112.30, 30.08], [112.84, 29.76], [113.13, 29.38], [113.88, 29.72], [114.31, 30.57], [115.08, 30.22], [116.00, 29.73], [116.20, 29.21]] },
  { from: 'nanchang', to: 'danyang', kind: 'water', via: [[116.20, 29.21], [116.00, 29.73], [116.57, 29.88], [117.05, 30.53], [117.76, 30.94], [118.35, 31.33], [118.69, 31.32]] },
  { from: 'changsha', to: 'quanling', kind: 'water', via: [[112.88, 27.84], [112.87, 27.22], [112.61, 26.90], [112.17, 26.79], [111.62, 26.45]] },
  { from: 'changsha', to: 'chen', kind: 'road', via: [[113.14, 27.33], [112.94, 26.48]] },
  // Nanling passages, not a straight water link across the watershed.
  { from: 'chen', to: 'nanhai', kind: 'mountain', via: [[113.02, 25.40], [113.37, 25.01], [113.60, 24.81], [113.46, 24.17], [113.06, 23.70]] },
  { from: 'quanling', to: 'guangxin', kind: 'mountain', via: [[111.30, 25.89], [111.22, 25.49], [111.53, 24.82], [111.56, 24.41], [111.30, 23.86]] },
  { from: 'guangxin', to: 'nanhai', kind: 'water', via: [[111.72, 23.36], [112.20, 23.07], [112.46, 23.05], [112.81, 23.16], [113.02, 23.08]] },
];
export function cityAt(id: string): WorldCity {
  const city = WORLD_CITIES.find(city => city.id === id);
  if (!city) throw new Error(`Unknown world city: ${id}`);
  return city;
}
export function originCity(id: OriginId): WorldCity { return cityAt(id); }

function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const lat = Math.sin((b[1] - a[1]) * rad / 2) ** 2;
  const lon = Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin((b[0] - a[0]) * rad / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, lat + lon)));
}

function roadDays(road: WorldRoad): number {
  const start = cityAt(road.from), end = cityAt(road.to);
  const points: [number, number][] = [[start.lon, start.lat], ...(road.via ?? []), [end.lon, end.lat]];
  const km = points.slice(1).reduce((sum, point, index) => sum + distanceKm(points[index], point), 0);
  const dailyKm = { road: 30, water: 50, mountain: 20 };
  return Math.max(1, Math.ceil(km / dailyKm[road.kind]));
}

/** Dijkstra by whole travel days; ties follow the stable corridor declaration order. */
export function planRoute(from: string, to: string): WorldRoute | null {
  if (!WORLD_CITIES.some(city => city.id === from) || !WORLD_CITIES.some(city => city.id === to)) return null;
  const routes = new Map<string, WorldRoute>([[from, { path: [from], legs: [], days: 0 }]]);
  const pending = new Set(WORLD_CITIES.map(city => city.id));
  while (pending.size) {
    let current: string | undefined;
    for (const id of pending) {
      if (routes.has(id) && (current === undefined || routes.get(id)!.days < routes.get(current)!.days)) current = id;
    }
    if (current === undefined) return null;
    const route = routes.get(current)!;
    if (current === to) return route;
    pending.delete(current);
    for (const road of WORLD_ROADS) {
      const next = road.from === current ? road.to : road.to === current ? road.from : undefined;
      if (!next || !pending.has(next)) continue;
      const days = roadDays(road);
      if (!routes.has(next) || route.days + days < routes.get(next)!.days) {
        routes.set(next, {
          path: [...route.path, next], days: route.days + days,
          legs: [...route.legs, { from: current, to: next, days, kind: road.kind }],
        });
      }
    }
  }
  return null;
}
