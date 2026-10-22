import type { CharacterAppearance, ModelWeapon } from './characters';
import type { RouteId } from './state';

export interface HistoricalCharacter {
  id: string;
  name: string;
  gender: 'male' | 'female';
  role: string;
  specialty: string;
  equipment: string;
  weapon: ModelWeapon;
  appearance: CharacterAppearance;
}

/** Game character concepts, separate from the current party's saved progression. */
export const HISTORICAL_CHARACTERS: readonly HistoricalCharacter[] = [
  {
    id: 'cao-cao', name: '曹操', gender: 'male', role: '曹方主君', specialty: '统军、决断、政略', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 曹方主君', portrait: '/assets/characters/cao-cao-v1.png',
      bio: '他相信军令与秩序能收拢乱世。对于寻求庇护的流民，曹方给出的粮食与位置，也伴随着必须承担的责任。',
      robe: 0x343b4b, headband: null, skin: 0xc79b76, sash: 0x9e7744, stocky: false, beard: true, pack: false,
      pose: 'strategist', outfit: 'robe', hair: 'crown', accent: 0x773e38 },
  },
  {
    id: 'liu-bei', name: '刘备', gender: 'male', role: '刘方主君', specialty: '护民、凝聚、统率', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 刘方主君', portrait: '/assets/characters/liu-bei-v1.png',
      bio: '他愿意听完来路不明者的难处，再谈下一步。刘方把护住百姓放在前面，这份承诺也需要每个同行的人付出。',
      robe: 0x527260, headband: null, skin: 0xcba37e, sash: 0x8f734c, stocky: false, beard: true, pack: false,
      pose: 'greeting', outfit: 'robe', hair: 'crown', accent: 0xd0c9ae },
  },
  {
    id: 'sun-quan', name: '孙权', gender: 'male', role: '孙方主君', specialty: '谋断、机动、经营', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 孙方主君', portrait: '/assets/characters/sun-quan-v1.png',
      bio: '江岸与渡口连起孙方的道路。他看重熟悉地方的人，也愿意为能抓住机会的同行者留一盏灯。',
      robe: 0x9a5c44, headband: null, skin: 0xcba075, sash: 0xa5894c, stocky: false, beard: true, pack: false,
      pose: 'commander', outfit: 'robe', hair: 'crown', accent: 0x465b60 },
  },
  {
    id: 'sun-shangxiang', name: '孙尚香', gender: 'female', role: '弓手', specialty: '弓术、机动、胆识', equipment: '猎弓', weapon: 'bow',
    appearance: { identity: '乱世人物 · 弓手', portrait: '/assets/characters/sun-shangxiang-v2.png',
      bio: '她用行动作答，站稳之前已经望向下一处落脚点。弓与轻装勾勒出她的性格：果断，不愿被旁人的安排束住脚步。',
      robe: 0xa95043, headband: 0x8b3b34, skin: 0xd3aa89, sash: 0x624b37, stocky: false, beard: false, pack: false,
      pose: 'archer', outfit: 'tunic', hair: 'long', accent: 0xaba18a },
  },
  {
    id: 'diao-chan', name: '貂蝉', gender: 'female', role: '交涉人物', specialty: '察言、交涉、应变', equipment: '绢扇', weapon: 'fan',
    appearance: { identity: '乱世人物 · 交涉', portrait: '/assets/characters/diao-chan-v1.png',
      bio: '她在话语与沉默之间观察局势，面对不同来意的人，总能留住自己的分寸。这是本作以三国故事塑造的人物形象。',
      robe: 0x9c7c94, headband: null, skin: 0xdfbaa0, sash: 0x775f79, stocky: false, beard: false, pack: false,
      pose: 'fan', outfit: 'dress', hair: 'long', accent: 0xd3b2a7 },
  },
  {
    id: 'cai-yan', name: '蔡琰', gender: 'female', role: '文士', specialty: '文识、记述、音律', equipment: '书卷', weapon: 'scroll',
    appearance: { identity: '乱世人物 · 文士', portrait: '/assets/characters/cai-yan-v1.png',
      bio: '她把见闻与姓名记进书卷，也愿意先听一个人把故事说完。青白衣袖下抱着的卷册，是她在乱世中仍要保存的东西。',
      robe: 0x92aaa2, headband: null, skin: 0xd7b79d, sash: 0x607f79, stocky: false, beard: false, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'long', accent: 0xe3dfce },
  },
];

export function getHistoricalCharacter(id: string): HistoricalCharacter | undefined {
  return HISTORICAL_CHARACTERS.find(character => character.id === id);
}

const LEADERS: Record<RouteId, string> = { cao: 'cao-cao', liu: 'liu-bei', sun: 'sun-quan' };
export function getRouteLeader(route: RouteId): HistoricalCharacter {
  return getHistoricalCharacter(LEADERS[route])!;
}
