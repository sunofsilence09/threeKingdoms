import type { RouteId } from './state';

export interface GameDate { year: number; month: number; day?: number }
/** 184 CE province-level divisions; Sili and Jiaozhi are included as departments. */
export const PROVINCES = [
  { id: 'sili', name: '司隶校尉部' }, { id: 'yu', name: '豫州' },
  { id: 'yan', name: '兖州' }, { id: 'xu', name: '徐州' },
  { id: 'qing', name: '青州' }, { id: 'ji', name: '冀州' },
  { id: 'you', name: '幽州' }, { id: 'bing', name: '并州' },
  { id: 'liang', name: '凉州' }, { id: 'yi', name: '益州' },
  { id: 'jing', name: '荆州' }, { id: 'yang', name: '扬州' },
  { id: 'jiao', name: '交趾刺史部' },
] as const;
export type ProvinceId = typeof PROVINCES[number]['id'];
export const ORIGINS = [
  { id: 'yingchuan', provinceId: 'yu', name: '豫州 · 颍川', road: '颍川乡道', village: '田边村落', hub: '乡民营地', detail: '乡间传来黄巾起事的消息，田埂上挤满了避乱的人。', encounter: 'cao' as RouteId, start: { x: 105, y: 365 } },
  { id: 'runan', provinceId: 'yu', name: '豫州 · 汝南', road: '汝南驿道', village: '古井村落', hub: '河畔集市', detail: '驿道上车马断续，有人往城里走，也有人刚从城里逃出来。', encounter: null, start: { x: 140, y: 235 } },
  { id: 'nanyang', provinceId: 'jing', name: '荆州 · 南阳', road: '南阳山道', village: '山脚村落', hub: '山前营地', detail: '黄巾之乱波及乡里，山脚的村民正在收拾最后一车粮食。', encounter: 'sun' as RouteId, start: { x: 110, y: 350 } },
  { id: 'zhuo', provinceId: 'you', name: '幽州 · 涿郡', road: '涿郡古道', village: '桑林村落', hub: '乡勇驻地', detail: '北地乡里开始召集义勇，你们却还没有一口安稳的饭。', encounter: 'liu' as RouteId, start: { x: 120, y: 180 } },
  { id: 'henan', provinceId: 'sili', name: '司隶 · 河南尹', road: '洛阳城外官道', village: '洛水村落', hub: '洛阳城郊驿站', detail: '你们在洛水边醒来。进京的车队还在前行，乡里已经听见了各地起事的消息。', encounter: null, start: { x: 110, y: 365 } },
  { id: 'dongjun', provinceId: 'yan', name: '兖州 · 东郡', road: '东郡河堤道', village: '河堤村落', hub: '黄河渡口', detail: '黄河渡口挤满了赶路的人。你们沿堤寻找村落，希望用一日劳作换些粮食。', encounter: null, start: { x: 120, y: 210 } },
  { id: 'donghai', provinceId: 'xu', name: '徐州 · 东海', road: '东海乡道', village: '麦田村落', hub: '郯县外集市', detail: '麦田外升起炊烟，驿道上传来动乱的消息。你们跟着运粮人寻找能落脚的地方。', encounter: null, start: { x: 100, y: 350 } },
  { id: 'beihai', provinceId: 'qing', name: '青州 · 北海', road: '北海驿道', village: '近海村落', hub: '北海乡市', detail: '带着咸味的风吹过村口。消息沿着驿路传来，有人囤粮，有人正在离乡。', encounter: null, start: { x: 110, y: 185 } },
  { id: 'julu', provinceId: 'ji', name: '冀州 · 巨鹿', road: '巨鹿田间道', village: '平原村落', hub: '巨鹿乡民营地', detail: '黄巾起事的消息在乡间传开，村口的队伍一天比一天长。你们只带着行囊和一点干粮。', encounter: null, start: { x: 100, y: 355 } },
  { id: 'taiyuan', provinceId: 'bing', name: '并州 · 太原', road: '汾水河谷道', village: '汾水村落', hub: '晋阳城外驿站', detail: '汾水边的春风仍冷。你们随着商旅沿河谷前行，寻找肯收留帮工的村落。', encounter: null, start: { x: 120, y: 190 } },
  { id: 'wuwei', provinceId: 'liang', name: '凉州 · 武威', road: '河西商道', village: '绿洲村落', hub: '武威商旅营地', detail: '沙尘落在行囊上，商队在井边停下。中原的消息来得很慢，眼前最要紧的是水与粮。', encounter: null, start: { x: 100, y: 350 } },
  { id: 'shujun', provinceId: 'yi', name: '益州 · 蜀郡', road: '蜀郡山间道', village: '水渠村落', hub: '成都近郊集市', detail: '山路尽头是水渠与田地。你们离开熟悉的住处，打算在集市找一份短工，再决定往哪里走。', encounter: null, start: { x: 110, y: 365 } },
  { id: 'changsha', provinceId: 'jing', name: '荆州 · 长沙', road: '湘水岸边道', village: '湘水村落', hub: '临湘城外渡口', detail: '湘水沿岸的船家正在收篷。你们帮忙搬运货物，换来一点干粮和去往村落的方向。', encounter: null, start: { x: 105, y: 185 } },
  { id: 'wujun', provinceId: 'yang', name: '扬州 · 吴郡', road: '吴郡水乡道', village: '水乡村落', hub: '吴县城外渡口', detail: '水田间的小路通向渡口。你们沿河打听落脚之处，听见北方的消息正随商船传来。', encounter: null, start: { x: 110, y: 350 } },
  { id: 'danyang', provinceId: 'yang', name: '扬州 · 丹阳', road: '丹阳丘陵道', village: '竹林村落', hub: '宛陵近郊乡市', detail: '竹林外的山道刚下过雨。你们跟着挑担的乡民走向集市，想先找一处避雨的屋檐。', encounter: null, start: { x: 120, y: 185 } },
  { id: 'nanhai', provinceId: 'jiao', name: '交趾刺史部 · 南海', road: '南海郡商道', village: '榕树村落', hub: '番禺近郊码头', detail: '南方的空气温暖潮湿。你们在码头替商旅卸货，远方的战乱消息与货物一起到来。', encounter: null, start: { x: 105, y: 365 } },
] as const;
export type OriginId = typeof ORIGINS[number]['id'];
export function randomOrigin(random: () => number = Math.random): typeof ORIGINS[number] {
  const index = (size: number) => Math.min(size - 1, Math.max(0, Math.floor(random() * size)));
  const province = PROVINCES[index(PROVINCES.length)];
  const locations = ORIGINS.filter(o => o.provinceId === province.id);
  return locations[index(locations.length)];
}
export const CHAPTERS = [
  { year: 184, month: 3, title: '黄巾起义', context: '黄巾起事，州郡动荡。你还没有归属，先和同行的人活过这一程。', journey: '此后数年，你们辗转乡里，靠护送与劳作换取口粮。到了190年，关东诸军起兵讨董，旧路又被战事截断。' },
  { year: 190, month: 4, title: '关东讨董', context: '关东诸军讨伐董卓。远处是诸侯的旗号，眼前是要过河的百姓。', journey: '讨董之后，各地势力彼此争夺。你们随流民迁徙，送过粮，也修过桥。194年，又一批失去家园的人来到渡口。' },
  { year: 194, month: 7, title: '群雄逐鹿', context: '群雄争夺州郡。你们已有行旅的经验，仍要为每一次落脚作出选择。', journey: '数年行旅，有人留下，有人继续赶路。到200年，官渡一带战云密布；曹、孙、刘各方的人马也开始向你们递来消息。' },
  { year: 200, month: 8, title: '官渡风云', context: '北方大战将起，江东也在交接权柄。走完眼前这段路，再决定是否投奔一方。', journey: '' },
] as const;
export function chapterAt(year: number) { return [...CHAPTERS].reverse().find(c => year >= c.year) ?? CHAPTERS[0]; }
export function originAt(id: OriginId) { return ORIGINS.find(o => o.id === id)!; }
export function nextMonth(date: GameDate): GameDate { return date.month === 12 ? { year: date.year + 1, month: 1 } : { ...date, month: date.month + 1 }; }
/** A deliberately simplified thirty-day game calendar, not a Gregorian/lunar conversion. */
export function advanceDays(date: GameDate, days: number): GameDate {
  const start = ((date.year - 184) * 12 + date.month - 1) * 30 + (date.day ?? 1) - 1;
  const total = Math.min(97 * 360 - 1, start + (Number.isSafeInteger(days) ? Math.max(0, days) : 0));
  return { year: 184 + Math.floor(total / 360), month: Math.floor(total % 360 / 30) + 1, day: total % 30 + 1 };
}
export function isGameDate(value: unknown): value is GameDate {
  if (!value || typeof value !== 'object') return false;
  const d = value as GameDate;
  return Number.isInteger(d.year) && d.year >= 184 && d.year <= 280 && Number.isInteger(d.month) && d.month >= 1 && d.month <= 12 && (d.day === undefined || Number.isInteger(d.day) && d.day >= 1 && d.day <= 30);
}
export function dateLabel(date: GameDate): string { return `公元 ${date.year} 年 · ${date.month} 月 ${date.day ?? 1} 日 · ${chapterAt(date.year).title}`; }
export function routeLeaderName(route: RouteId, year: number): string { return route === 'cao' ? '曹操' : route === 'liu' ? '刘备' : year < 192 ? '孙坚' : year < 200 ? '孙策' : '孙权'; }
