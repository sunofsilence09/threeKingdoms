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
  {
    id: 'dong-zhuo', name: '董卓', gender: 'male', role: '群雄', specialty: '威压、统军、权势', equipment: '铜饰腰带', weapon: 'fists',
    appearance: { identity: '群雄 · 董卓', portrait: '/assets/characters/dong-zhuo-v1.png',
      bio: '宽袖与沉重的腰带压住一身绛紫。他习惯让别人仰头听完自己的话，也把人们的退让当成理所当然。',
      robe: 0x59424f, headband: null, skin: 0xbd9677, sash: 0x9c7944, stocky: true, beard: true, pack: false,
      pose: 'tyrant', outfit: 'robe', hair: 'crown', accent: 0x7b3c38 },
  },
  {
    id: 'lu-bu', name: '吕布', gender: 'male', role: '持戟武将', specialty: '武力、突击、胆魄', equipment: '方天画戟', weapon: 'halberd',
    appearance: { identity: '乱世人物 · 持戟武将', portrait: '/assets/characters/lu-bu-v1.png',
      bio: '长翎随着转身划过甲肩，画戟却稳在掌中。他望向前方时，并不习惯先向旁人询问答案。',
      robe: 0x823c37, headband: null, skin: 0xcfa27e, sash: 0x9d7943, stocky: false, beard: false, pack: false,
      pose: 'halberd', outfit: 'armor', hair: 'crown', accent: 0x42484b, plume: true },
  },
  {
    id: 'hua-xiong', name: '华雄', gender: 'male', role: '横刀武将', specialty: '近战、守阵、勇力', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 横刀武将', portrait: '/assets/characters/hua-xiong-v1.png',
      bio: '肩甲宽厚，刀杆横在身前，脚步却压得很低。他守住一条路时，会先让来者看清自己手里的分量。',
      robe: 0x435651, headband: 0x494133, skin: 0xb68e6b, sash: 0x8a7148, stocky: true, beard: true, pack: false,
      pose: 'bruiser', outfit: 'armor', hair: 'bun', accent: 0x343e43 },
  },
  {
    id: 'zhen-ji', name: '甄姬', gender: 'female', role: '世家人物', specialty: '礼仪、察人、应对', equipment: '玉佩', weapon: 'jade',
    appearance: { identity: '乱世人物 · 甄姬', portrait: '/assets/characters/zhen-ji-v1.png',
      bio: '月白衣袖间，一枚玉佩被轻轻收在掌心。她说话并不急，先观察来者的神情，再决定如何回应。',
      robe: 0x6d839b, headband: null, skin: 0xdec0aa, sash: 0x4d6882, stocky: false, beard: false, pack: false,
      pose: 'jade', outfit: 'dress', hair: 'long', accent: 0xdbdfda },
  },
  {
    id: 'zhang-liao', name: '张辽', gender: 'male', role: '持刀武将', specialty: '守阵、突进、统军', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 张辽', portrait: '/assets/characters/zhang-liao-v1.png',
      bio: '靛青甲衣上收束着铜色系带，长刀斜立在身旁。他站得沉稳，眼神始终留意着阵线最薄的地方。',
      robe: 0x343d61, headband: null, skin: 0xbe9474, sash: 0xa1804f, stocky: false, beard: true, pack: false,
      pose: 'sentinel', outfit: 'armor', hair: 'crown', accent: 0x30394b },
  },
  {
    id: 'guan-yu', name: '关羽', gender: 'male', role: '长刀武将', specialty: '忠义、武勇、镇守', equipment: '青龙偃月刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 关羽', portrait: '/assets/characters/guan-yu-v1.png',
      bio: '绿袍垂在甲外，长须顺着胸前落下。他将偃月刀稳稳扶住，先看清来者，再决定是否让路。',
      robe: 0x3f6851, headband: 0x345740, skin: 0xb36d56, sash: 0xa0824c, stocky: false, beard: true, pack: false,
      pose: 'longbeard', outfit: 'armor', hair: 'bun', accent: 0x56655a },
  },
  {
    id: 'zhang-fei', name: '张飞', gender: 'male', role: '持矛武将', specialty: '勇力、破阵、震慑', equipment: '丈八蛇矛', weapon: 'serpentspear',
    appearance: { identity: '乱世人物 · 张飞', portrait: '/assets/characters/zhang-fei-v1.png',
      bio: '铁甲与锈红腰带裹住宽厚的身躯，虬须衬着一双锐利的眼。他压低蛇矛，像随时能跨出沉重的一步。',
      robe: 0x393d3d, headband: 0x654539, skin: 0xb18465, sash: 0x9b5140, stocky: true, beard: true, pack: false,
      pose: 'serpent', outfit: 'armor', hair: 'bun', accent: 0x303536 },
  },
  {
    id: 'zhao-yun', name: '赵云', gender: 'male', role: '持枪武将', specialty: '突围、护卫、机动', equipment: '长枪', weapon: 'spear',
    appearance: { identity: '乱世人物 · 赵云', portrait: '/assets/characters/zhao-yun-v3.png',
      bio: '白翎掠过银甲，淡蓝披风在身后展开。他沉下重心，双手横握长枪，为身后的同伴守住去路。',
      robe: 0xbecbd0, headband: null, skin: 0xd3ae90, sash: 0x7395aa, stocky: false, beard: false, pack: false,
      pose: 'lancer', outfit: 'armor', hair: 'crown', accent: 0xd2d9d6, plume: true },
  },
  {
    id: 'mi-fu-ren', name: '糜夫人', gender: 'female', role: '世家人物', specialty: '护持、体察、应变', equipment: '丝帕', weapon: 'handkerchief',
    appearance: { identity: '乱世人物 · 糜夫人', portrait: '/assets/characters/mi-fu-ren-v1.png',
      bio: '暖白层衣间露出柔和的绛红，她将丝帕收在手中，微微侧身护住身后的空处。温和的神情里，也有不肯退开的坚决。',
      robe: 0xa36860, headband: null, skin: 0xddb99d, sash: 0x9a6159, stocky: false, beard: false, pack: false,
      pose: 'protective', outfit: 'dress', hair: 'long', accent: 0xdfd1b7 },
  },
  {
    id: 'zhang-xingcai', name: '张星彩', gender: 'female', role: '持盾武者', specialty: '护卫、格挡、近战', equipment: '圆盾与剑', weapon: 'swordshield',
    appearance: { identity: '乱世人物 · 张星彩', portrait: '/assets/characters/zhang-xingcai-v1.png',
      bio: '深青甲片以红绳系紧，圆盾护在身前，剑锋指向侧方。她的站姿利落而坚定，给同伴留下可以安心靠近的位置。',
      robe: 0x355b5d, headband: 0x9a4540, skin: 0xd0a78a, sash: 0xa34f45, stocky: false, beard: false, pack: false,
      pose: 'shieldguard', outfit: 'armor', hair: 'long', accent: 0x30494e },
  },
];

export function getHistoricalCharacter(id: string): HistoricalCharacter | undefined {
  return HISTORICAL_CHARACTERS.find(character => character.id === id);
}

const LEADERS: Record<RouteId, string> = { cao: 'cao-cao', liu: 'liu-bei', sun: 'sun-quan' };
export function getRouteLeader(route: RouteId): HistoricalCharacter {
  return getHistoricalCharacter(LEADERS[route])!;
}
