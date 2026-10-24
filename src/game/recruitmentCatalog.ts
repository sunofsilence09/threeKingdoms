import type { GameState } from './state';
import { personPosting } from './personPosting';
import type { CharacterAppearance, ModelWeapon } from './characters';
import type { GameDate } from './history';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { LOCAL_OFFICIALS } from './localOfficials';
import { WORLD_CITIES } from './world';
import { CITY_CAREERS } from './careerData';
import { GARRISON_PROFILES } from './garrisonData';

export interface RecruitWindow {
  from: { year: number; month?: number };
  to?: { year: number; month?: number };
  cityIds: string[];
}

export interface RecruitProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  portrait: string;
  weapon: ModelWeapon;
  speed: number;
  appearance: CharacterAppearance;
  category: 'initial' | 'historical' | 'official' | 'bandit' | 'leader' | 'garrison';
  readOnly?: boolean;
  windows: RecruitWindow[];
}

/** Inclusive months. These are authored game encounters, not continuous historical postings. */
function window(from: number, to: number, cityIds: string[], fromMonth = 1, toMonth = 12): RecruitWindow[] {
  return [{ from: { year: from, month: fromMonth }, to: { year: to, month: toMonth }, cityIds }];
}

const allCities = WORLD_CITIES.map(city => city.id);
const historicalWindows: Record<string, RecruitWindow[]> = {
  'cao-cao': [
    ...window(184, 189, ['henan', 'yingchuan', 'chenliu']),
    ...window(190, 195, ['chenliu', 'dongjun']),
    ...window(196, 219, ['xuxian', 'ye']),
  ],
  'liu-bei': [
    ...window(184, 190, ['zhuo']), ...window(191, 200, ['donghai', 'beihai']),
    ...window(201, 210, ['nanyang', 'xiangyang', 'jiangling']), ...window(211, 222, ['shujun', 'jiangzhou']),
  ],
  'sun-quan': window(200, 251, ['wujun', 'danyang', 'shanyin']),
  'sun-shangxiang': window(208, 219, ['wujun', 'jiangling']),
  'diao-chan': window(191, 192, ['henan', 'changan']),
  'cai-yan': window(195, 215, ['chenliu', 'xuxian']),
  'dong-zhuo': [...window(184, 188, ['wuwei', 'taiyuan']), ...window(189, 191, ['henan', 'changan'])],
  'lu-bu': [...window(189, 192, ['henan', 'changan']), ...window(193, 198, ['dongjun', 'donghai'])],
  'hua-xiong': window(190, 190, ['henan', 'changan']),
  'zhen-ji': [...window(199, 203, ['ye']), ...window(204, 220, ['ye', 'xuxian'])],
  'zhang-liao': [...window(187, 198, ['taiyuan', 'henan', 'donghai']), ...window(199, 221, ['xuxian', 'guangling'])],
  'guan-yu': [...window(184, 200, ['zhuo', 'donghai']), ...window(201, 219, ['xiangyang', 'jiangling'])],
  'zhang-fei': [...window(184, 200, ['zhuo', 'donghai']), ...window(201, 210, ['nanyang', 'jiangling']), ...window(211, 220, ['shujun', 'jiangzhou'])],
  'zhao-yun': [...window(191, 199, ['julu', 'zhuo']), ...window(200, 210, ['nanyang', 'jiangling']), ...window(211, 228, ['shujun', 'nanzheng'])],
  'mi-fu-ren': window(197, 207, ['donghai', 'nanyang', 'xiangyang']),
  'zhang-xingcai': window(220, 237, ['shujun']),
  'zhuge-liang': [
    ...window(207, 208, ['xiangyang', 'jiangling']), ...window(209, 213, ['jiangling']),
    ...window(214, 226, ['shujun']), ...window(227, 233, ['nanzheng']),
  ],
  'zhou-yu': [
    ...window(195, 197, ['danyang']), ...window(198, 207, ['wujun', 'danyang', 'nanchang']),
    ...window(208, 209, ['jiangling', 'nanchang']),
  ],
};

// A literal copy of the original five appearances avoids a runtime characters -> combat -> catalog cycle.
const originalAppearances: Record<string, CharacterAppearance> = {
  traveler: {
    identity: '流民 · 同行之首', portrait: '/assets/characters/jiang-yuan-refugee-v1.png',
    bio: '乱世中离乡的年轻人，带着行囊与一把菜刀上路。姜垣眼下只想让同行的人活着找到落脚处。',
    robe: 0x667067, headband: 0x536d68, skin: 0xcba27e, sash: 0x77604a, stocky: false, beard: false, pack: true, pose: 'calm',
  },
  aman: {
    identity: '流民 · 同行伙伴', portrait: '/assets/characters/aman-refugee-v2.png',
    bio: '与姜垣同行的年轻伙伴，身形轻巧，眼神机警。走过几日荒路后，他仍惦记着前方村落里能找到的粮食。',
    robe: 0xa38a5c, headband: 0x975749, skin: 0xc89e75, sash: 0x67523e, stocky: false, beard: false, pack: true, pose: 'scout',
  },
  'chen-da': {
    identity: '流民 · 同行伙伴', portrait: '/assets/characters/chen-da-refugee-v2.png',
    bio: '沉默而结实的同行人，风霜落在胡须与旧衣上。遇到拦路的人时，陈达会站到伙伴身前。',
    robe: 0x465c74, headband: null, skin: 0xb88e6b, sash: 0xab8650, stocky: true, beard: true, pack: false, pose: 'guard',
  },
  'bandit-leader': {
    identity: '敌方 · 山贼头目', portrait: '/assets/characters/bandit-leader-v2.png',
    bio: '占住旧驿道的头目，暗红旧衣外套着皮坎肩。他靠拦路夺粮维持手下，出手也比喽啰狠些。',
    robe: 0x834f46, headband: 0x513a30, skin: 0xb98b69, sash: 0x4a382b, stocky: true, beard: true, pack: false, pose: 'leader',
  },
  bandit: {
    identity: '敌方 · 拦路山贼', portrait: '/assets/characters/bandit-v2.png',
    bio: '穿黄褐旧衣的拦路喽啰，手中的家伙随遭遇而变。饥饿与乱世把他推到了道路的另一边。',
    robe: 0x8b7150, headband: 0xb69a61, skin: 0xbe9674, sash: 0x594a35, stocky: false, beard: false, pack: false, pose: 'skulker',
  },
};

const originals: RecruitProfile[] = [
  ['traveler', '姜垣', '固定主角', 'cleaver', 12, 'initial'],
  ['aman', '阿满', '同行伙伴', 'fists', 14, 'initial'],
  ['chen-da', '陈达', '同行伙伴', 'fists', 10, 'initial'],
  ['bandit-leader', '山贼头目', '旧道头目', 'cleaver', 11, 'bandit'],
  ['bandit', '拦路山贼', '旧道喽啰', 'fists', 9, 'bandit'],
].map(([id, name, role, weapon, speed, category]) => {
  const appearance = originalAppearances[id as string];
  return { id, name, role, weapon, speed, category, appearance, portrait: appearance.portrait, bio: appearance.bio,
    windows: [{ from: { year: 184, month: 3 }, cityIds: allCities }] } as RecruitProfile;
});

const officialWindows: Record<string, RecruitWindow[]> = {
  'wang-yun': window(184, 184, ['yingchuan', 'runan', 'xuxian'], 3),
  'xu-qiu': window(184, 184, ['nanyang', 'xiangyang'], 6, 8),
  'guo-xun': window(184, 184, ['zhuo', 'ji'], 3, 3),
  'jia-cong': window(184, 184, ['nanhai', 'guangxin'], 6),
  'guo-dian': window(184, 184, ['julu'], 11),
  'zhao-qian': window(184, 184, ['runan'], 4),
  // The month-only calendar permits an explicitly fictional rescue before the recorded death in March.
  'chu-gong': window(184, 184, ['nanyang'], 3, 3),
  'qin-jie': window(184, 184, ['nanyang'], 6, 8),
};

// Colors/outfits follow the existing commissioned portraits; models are artistic game interpretations.
const officialClothing: Record<string, Pick<CharacterAppearance, 'robe' | 'sash' | 'accent' | 'outfit' | 'pose' | 'stocky'>> = {
  'wang-yun': { robe: 0x59434d, sash: 0x8f7956, accent: 0xe1d6bf, outfit: 'robe', pose: 'scholar', stocky: false },
  'xu-qiu': { robe: 0x637978, sash: 0x434b48, accent: 0xe2dfce, outfit: 'robe', pose: 'scholar', stocky: false },
  'guo-xun': { robe: 0x526277, sash: 0x5b4938, accent: 0x353b40, outfit: 'armor', pose: 'commander', stocky: false },
  'jia-cong': { robe: 0x99907d, sash: 0x74604b, accent: 0xdfd3bc, outfit: 'robe', pose: 'scholar', stocky: false },
  'guo-dian': { robe: 0x876a43, sash: 0x9c8050, accent: 0x393d3e, outfit: 'armor', pose: 'commander', stocky: true },
  'zhao-qian': { robe: 0x674638, sash: 0x7d443b, accent: 0xc8baa3, outfit: 'robe', pose: 'scholar', stocky: false },
  'chu-gong': { robe: 0x756051, sash: 0x876f4c, accent: 0xd3cec1, outfit: 'robe', pose: 'scholar', stocky: true },
  'qin-jie': { robe: 0x787064, sash: 0x806944, accent: 0x363a3c, outfit: 'armor', pose: 'commander', stocky: false },
};

function sunLeader(id: string, name: string, bio: string, speed: number, windows: RecruitWindow[]): RecruitProfile {
  const portrait = `/assets/characters/${id}-v1.png`;
  const appearance: CharacterAppearance = { identity: `群雄 · ${name}`, portrait, bio,
    robe: id === 'sun-jian' ? 0x854c3e : 0xa4453c, headband: null, skin: 0xc5a17f, sash: 0x92794e,
    stocky: false, beard: id === 'sun-jian', pack: false, pose: 'commander', outfit: 'armor', hair: 'bun', accent: id === 'sun-jian' ? 0x595e60 : 0x343a3c };
  return { id, name, role: '孙氏主将', bio, portrait, weapon: 'sword', speed, appearance, category: 'leader', windows };
}

export const RECRUIT_PROFILES: readonly RecruitProfile[] = [
  ...originals.slice(0, 3),
  ...HISTORICAL_CHARACTERS.map(person => ({ id: person.id, name: person.name, role: person.role,
    bio: person.appearance.bio, portrait: person.appearance.portrait, appearance: person.appearance,
    weapon: person.weapon, speed: person.speed, category: 'historical' as const,
    ...(person.id === 'himiko' ? { readOnly: true } : {}),
    windows: CITY_CAREERS[person.id]?.map(stage => ({ from: stage.from, to: stage.to, cityIds: [stage.cityId] })) ?? historicalWindows[person.id] ?? [] })),
  ...LOCAL_OFFICIALS.map(person => {
    const clothing = officialClothing[person.id];
    const appearance: CharacterAppearance = { identity: `地方官员 · ${person.role}`, portrait: person.portrait,
      bio: person.summary, headband: null, skin: 0xc5a180, beard: true, pack: false, hair: 'crown', ...clothing };
    return { id: person.id, name: person.name, role: person.role, bio: `${person.summary} 相遇窗口为游戏编排，非完整任期。`,
      portrait: person.portrait, weapon: (clothing.outfit === 'armor' ? 'sword' : 'scroll') as ModelWeapon,
      speed: clothing.outfit === 'armor' ? 12 : 10, appearance, category: 'official' as const, windows: officialWindows[person.id] };
  }),
  ...originals.slice(3),
  sunLeader('sun-jian', '孙坚', '孙氏主将，参与平定黄巾，后来在长沙与荆州一带活动。赤褐衣袍与铁灰甲勾勒出成熟勇武的身影。本作相遇与同行为架空支线。', 16,
    [...window(184, 186, ['yingchuan', 'nanyang']), ...window(187, 190, ['changsha', 'nanyang'])]),
  sunLeader('sun-ce', '孙策', '孙坚之子，成年后在江东展开事业。朱红衣与玄甲衬出年轻锐利的主将气度。本作从195年开启相遇，同行为架空支线。', 19,
    window(195, 199, ['danyang', 'wujun', 'shanyin'])),
  ...GARRISON_PROFILES,
];

export function recruitProfile(id: string): RecruitProfile | undefined {
  return RECRUIT_PROFILES.find(profile => profile.id === id);
}

export function canMeetPerson(id: string, cityId: string, date: GameDate, state?: GameState): boolean {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || date.month < 1 || date.month > 12) return false;
  const month = date.year * 12 + date.month;
  const profile = recruitProfile(id);
  if (!profile || profile.readOnly) return false;
  if (state?.worldConflict && !state.conflictRecovery) {
    if (Object.hasOwn(state.party, id)) return cityId === state.currentCityId && !state.journey;
    const posting = personPosting({ ...state, date }, id);
    if (!posting || posting.kind === 'campaign' || posting.kind === 'dispersed') return false;
    if (posting.factionId || posting.kind !== 'free') return posting.cityId === cityId;
  }
  return profile.windows.some(encounter => {
    const from = encounter.from.year * 12 + (encounter.from.month ?? 1);
    const to = encounter.to ? encounter.to.year * 12 + (encounter.to.month ?? 12) : Infinity;
    return encounter.cityIds.includes(cityId) && month >= from && month <= to;
  }) ?? false;
}
