import { originAt, ORIGINS, PROVINCES, type GameDate, type OriginId, type ProvinceId } from './history';
import type { WorldCity } from './world';

export interface LocalOfficial {
  id: string;
  name: string;
  role: string;
  place: string;
  portrait: string;
  level: 'province' | 'prefecture';
  provinceId?: ProvinceId;
  originId?: OriginId;
  record: { year: number; month?: number; event: 'attested' | 'appointed' | 'death' };
  summary: string;
  dateNote: string;
  source: { title: string; url: string };
  biographySource?: { title: string; url: string };
}
const annals = { title: '《后汉书》卷八 · 孝灵帝纪', url: 'https://zh.wikisource.org/wiki/後漢書/卷8' };
const campaign = { title: '《后汉书》卷七十一 · 皇甫嵩朱儁列传', url: 'https://zh.wikisource.org/wiki/後漢書/卷71' };

/** Dated evidence, not invented continuous terms of office. Months follow the source calendar. */
export const LOCAL_OFFICIALS: readonly LocalOfficial[] = [
  { id: 'wang-yun', name: '王允', role: '豫州刺史', place: '豫州', level: 'province', provinceId: 'yu',
    portrait: '/assets/characters/wang-yun-v1.png', record: { year: 184, event: 'appointed' },
    summary: '黄巾起事后，朝廷特选王允为豫州刺史。他辟荀爽、孔融等为从事，参与平乱，并奏报张让宾客与黄巾交通之事。',
    dateNote: '中平元年（184年）任职有明确记载，任命月份未详；不将全年视为已确认的完整任期。',
    source: { title: '《后汉书》卷六十六 · 王允传', url: 'https://zh.wikisource.org/wiki/後漢書/卷66' } },
  { id: 'xu-qiu', name: '徐璆', role: '荆州刺史', place: '荆州', level: 'province', provinceId: 'jing',
    portrait: '/assets/characters/xu-qiu-v1.png', record: { year: 184, month: 6, event: 'attested' },
    summary: '徐璆不受权贵请托，曾查办南阳太守张忠等人的贪赃。184年，他以荆州刺史身份与朱儁、秦颉合兵围宛。',
    dateNote: '围宛记载起于本年六月，延续至八月。这里标记史事见任月份，不把六月当作他的上任月。', source: campaign,
    biographySource: { title: '《后汉书》卷四十八 · 徐璆传', url: 'https://zh.wikisource.org/wiki/後漢書/卷48' } },
  { id: 'guo-xun', name: '郭勋', role: '幽州刺史', place: '幽州', level: 'province', provinceId: 'you',
    portrait: '/assets/characters/guo-xun-v1.png', record: { year: 184, month: 4, event: 'death' },
    summary: '中平元年四月，广阳黄巾杀幽州刺史郭勋及广阳太守刘卫。史书留有这条任内遇害记录，起任年月未详。',
    dateNote: '四月之前不据遇害记录反推出精确任期；四月以后只作为已故官员的史事资料。', source: annals },
  { id: 'jia-cong', name: '贾琮', role: '交趾刺史', place: '交趾刺史部', level: 'province', provinceId: 'jiao',
    portrait: '/assets/characters/jia-cong-v1.png', record: { year: 184, month: 6, event: 'appointed' },
    summary: '交趾屯兵反叛，朝廷选贾琮前往。他察问民间疾苦，招抚流散、减免徭役并整顿官吏，逐步安定地方。',
    dateNote: '帝纪将遣贾琮讨平之事记于中平元年六月；不能把他提前放到三月开局。', source: annals,
    biographySource: { title: '《后汉书》卷三十一 · 贾琮传', url: 'https://zh.wikisource.org/wiki/後漢書/卷31' } },
  { id: 'guo-dian', name: '郭典', role: '巨鹿太守', place: '冀州 · 巨鹿', level: 'prefecture', originId: 'julu',
    portrait: '/assets/characters/guo-dian-v1.png', record: { year: 184, month: 11, event: 'attested' },
    summary: '中平元年末，皇甫嵩与巨鹿太守郭典合兵进攻下曲阳的张宝。郭典是这场战事中有明确官职记录的地方长官。',
    dateNote: '十一月战事中确证在任，起任月份未详；不据此断言三月时已经任职。', source: campaign },
  { id: 'zhao-qian', name: '赵谦', role: '汝南太守', place: '豫州 · 汝南', level: 'prefecture', originId: 'runan',
    portrait: '/assets/characters/zhao-qian-v1.png', record: { year: 184, month: 4, event: 'attested' },
    summary: '中平元年四月，汝南黄巾在邵陵击败太守赵谦。此事确证了他当时的汝南太守身份。',
    dateNote: '史事系于四月条下，不是三月。这里只记录四月见任，起任和离任月份仍未详。', source: annals },
  { id: 'chu-gong', name: '褚贡', role: '南阳太守', place: '荆州 · 南阳', level: 'prefecture', originId: 'nanyang',
    portrait: '/assets/characters/chu-gong-v1.png', record: { year: 184, month: 3, event: 'death' },
    summary: '中平元年三月庚子，南阳黄巾张曼成攻杀郡守褚贡。此后南阳的战事仍持续，后来记载中太守已是秦颉。',
    dateNote: '三月已有遇害记载；本月资料展示这条史事，不提供遇害后继续在任的拜访剧情。', source: annals },
  { id: 'qin-jie', name: '秦颉', role: '南阳太守', place: '荆州 · 南阳', level: 'prefecture', originId: 'nanyang',
    portrait: '/assets/characters/qin-jie-v1.png', record: { year: 184, month: 6, event: 'attested' },
    summary: '中平元年六月，南阳太守秦颉击斩张曼成。其后又与朱儁、徐璆共同围攻宛城的黄巾军。',
    dateNote: '褚贡遇害后、六月史事以前已接任；具体授官月份未详，不把首次见任月份冒充任命月份。', source: annals },
];

export function officialStatus(official: LocalOfficial, date: GameDate): string {
  const r = official.record;
  if (date.year < r.year || (date.year === r.year && r.month !== undefined && date.month < r.month)) return '未到记载节点';
  if (r.event === 'death') return date.year === r.year && date.month === r.month ? '本月遇害' : '已遇害 · 留存史事';
  if (date.year > r.year) return '往年任职记录';
  return r.month === undefined ? '本年任职有据 · 月份未详' : '本年见任记录 · 非完整任期';
}
export interface LocalOfficeSlot {
  level: 'province' | 'prefecture';
  place: string;
  title: string;
  records: LocalOfficial[];
}
export function localOfficeRecords(originId: OriginId, date: GameDate): LocalOfficeSlot[] {
  const origin = originAt(originId), province = PROVINCES.find(p => p.id === origin.provinceId)!;
  const available = (official: LocalOfficial) => officialStatus(official, date) !== '未到记载节点';
  const newest = (a: LocalOfficial, b: LocalOfficial) => b.record.year - a.record.year || (b.record.month ?? 0) - (a.record.month ?? 0);
  const county = origin.name.split(' · ')[1];
  const prefectureTitle = originId === 'henan' ? '河南尹' : originId === 'beihai' ? '北海相' : originId === 'donghai' ? '东海相' : `${county}太守`;
  return [
    { level: 'province', place: province.name, title: origin.provinceId === 'sili' ? '司隶校尉' : date.year < 188 ? `${province.name.replace('刺史部', '')}刺史` : `${province.name} · 州级长官`,
      records: LOCAL_OFFICIALS.filter(o => o.level === 'province' && o.provinceId === origin.provinceId && available(o)).sort(newest) },
    { level: 'prefecture', place: origin.name, title: prefectureTitle,
      records: LOCAL_OFFICIALS.filter(o => o.level === 'prefecture' && o.originId === originId && available(o)).sort(newest) },
  ];
}

export function localCityOfficeRecords(city: WorldCity, date: GameDate): LocalOfficeSlot[] {
  if (city.originId) return localOfficeRecords(city.originId, date);
  const example = ORIGINS.find(o => o.provinceId === city.provinceId)!;
  const province = localOfficeRecords(example.id, date)[0];
  const matching = ORIGINS.find(o => o.provinceId === city.provinceId && city.prefecture.replace(/[郡国]$/, '') === o.name.split(' · ')[1]);
  return [province, matching ? localOfficeRecords(matching.id, date)[1] : {
    level: 'prefecture', place: city.prefecture, title: `${city.prefecture}太守`, records: [],
  }];
}
