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
  speed: number;
  appearance: CharacterAppearance;
}

/** Game character concepts, separate from the current party's saved progression. */
export const HISTORICAL_CHARACTERS: readonly HistoricalCharacter[] = [
  {
    id: 'cao-cao', speed: 14, name: '曹操', gender: 'male', role: '曹方主君', specialty: '统军、决断、政略', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 曹方主君', portrait: '/assets/characters/cao-cao-v1.png',
      bio: '他相信军令与秩序能收拢乱世。对于寻求庇护的流民，曹方给出的粮食与位置，也伴随着必须承担的责任。',
      robe: 0x343b4b, headband: null, skin: 0xc79b76, sash: 0x9e7744, stocky: false, beard: true, pack: false,
      pose: 'strategist', outfit: 'robe', hair: 'crown', accent: 0x773e38 },
  },
  {
    id: 'liu-bei', speed: 12, name: '刘备', gender: 'male', role: '刘方主君', specialty: '护民、凝聚、统率', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 刘方主君', portrait: '/assets/characters/liu-bei-v1.png',
      bio: '他愿意听完来路不明者的难处，再谈下一步。刘方把护住百姓放在前面，这份承诺也需要每个同行的人付出。',
      robe: 0x527260, headband: null, skin: 0xcba37e, sash: 0x8f734c, stocky: false, beard: true, pack: false,
      pose: 'greeting', outfit: 'robe', hair: 'crown', accent: 0xd0c9ae },
  },
  {
    id: 'sun-quan', speed: 15, name: '孙权', gender: 'male', role: '孙方主君', specialty: '谋断、机动、经营', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 孙方主君', portrait: '/assets/characters/sun-quan-v1.png',
      bio: '江岸与渡口连起孙方的道路。他看重熟悉地方的人，也愿意为能抓住机会的同行者留一盏灯。',
      robe: 0x9a5c44, headband: null, skin: 0xcba075, sash: 0xa5894c, stocky: false, beard: true, pack: false,
      pose: 'commander', outfit: 'robe', hair: 'crown', accent: 0x465b60 },
  },
  {
    id: 'sun-shangxiang', speed: 18, name: '孙尚香', gender: 'female', role: '弓手', specialty: '弓术、机动、胆识', equipment: '猎弓', weapon: 'bow',
    appearance: { identity: '乱世人物 · 弓手', portrait: '/assets/characters/sun-shangxiang-v2.png',
      bio: '她用行动作答，站稳之前已经望向下一处落脚点。弓与轻装勾勒出她的性格：果断，不愿被旁人的安排束住脚步。',
      robe: 0xa95043, headband: 0x8b3b34, skin: 0xd3aa89, sash: 0x624b37, stocky: false, beard: false, pack: false,
      pose: 'archer', outfit: 'tunic', hair: 'long', accent: 0xaba18a },
  },
  {
    id: 'diao-chan', speed: 16, name: '貂蝉', gender: 'female', role: '交涉人物', specialty: '察言、交涉、应变', equipment: '绢扇', weapon: 'fan',
    appearance: { identity: '乱世人物 · 交涉', portrait: '/assets/characters/diao-chan-v1.png',
      bio: '她在话语与沉默之间观察局势，面对不同来意的人，总能留住自己的分寸。这是本作以三国故事塑造的人物形象。',
      robe: 0x9c7c94, headband: null, skin: 0xdfbaa0, sash: 0x775f79, stocky: false, beard: false, pack: false,
      pose: 'fan', outfit: 'dress', hair: 'long', accent: 0xd3b2a7 },
  },
  {
    id: 'cai-yan', speed: 10, name: '蔡琰', gender: 'female', role: '文士', specialty: '文识、记述、音律', equipment: '书卷', weapon: 'scroll',
    appearance: { identity: '乱世人物 · 文士', portrait: '/assets/characters/cai-yan-v1.png',
      bio: '她把见闻与姓名记进书卷，也愿意先听一个人把故事说完。青白衣袖下抱着的卷册，是她在乱世中仍要保存的东西。',
      robe: 0x92aaa2, headband: null, skin: 0xd7b79d, sash: 0x607f79, stocky: false, beard: false, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'long', accent: 0xe3dfce },
  },
  {
    id: 'dong-zhuo', speed: 8, name: '董卓', gender: 'male', role: '群雄', specialty: '威压、统军、权势', equipment: '铜饰腰带', weapon: 'fists',
    appearance: { identity: '群雄 · 董卓', portrait: '/assets/characters/dong-zhuo-v1.png',
      bio: '宽袖与沉重的腰带压住一身绛紫。他习惯让别人仰头听完自己的话，也把人们的退让当成理所当然。',
      robe: 0x59424f, headband: null, skin: 0xbd9677, sash: 0x9c7944, stocky: true, beard: true, pack: false,
      pose: 'tyrant', outfit: 'robe', hair: 'crown', accent: 0x7b3c38 },
  },
  {
    id: 'lu-bu', speed: 20, name: '吕布', gender: 'male', role: '持戟武将', specialty: '武力、突击、胆魄', equipment: '方天画戟', weapon: 'halberd',
    appearance: { identity: '乱世人物 · 持戟武将', portrait: '/assets/characters/lu-bu-v1.png',
      bio: '长翎随着转身划过甲肩，画戟却稳在掌中。他望向前方时，并不习惯先向旁人询问答案。',
      robe: 0x823c37, headband: null, skin: 0xcfa27e, sash: 0x9d7943, stocky: false, beard: false, pack: false,
      pose: 'halberd', outfit: 'armor', hair: 'crown', accent: 0x42484b, plume: true },
  },
  {
    id: 'hua-xiong', speed: 13, name: '华雄', gender: 'male', role: '横刀武将', specialty: '近战、守阵、勇力', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 横刀武将', portrait: '/assets/characters/hua-xiong-v1.png',
      bio: '肩甲宽厚，刀杆横在身前，脚步却压得很低。他守住一条路时，会先让来者看清自己手里的分量。',
      robe: 0x435651, headband: 0x494133, skin: 0xb68e6b, sash: 0x8a7148, stocky: true, beard: true, pack: false,
      pose: 'bruiser', outfit: 'armor', hair: 'bun', accent: 0x343e43 },
  },
  {
    id: 'zhen-ji', speed: 14, name: '甄姬', gender: 'female', role: '世家人物', specialty: '礼仪、察人、应对', equipment: '玉佩', weapon: 'jade',
    appearance: { identity: '乱世人物 · 甄姬', portrait: '/assets/characters/zhen-ji-v1.png',
      bio: '月白衣袖间，一枚玉佩被轻轻收在掌心。她说话并不急，先观察来者的神情，再决定如何回应。',
      robe: 0x6d839b, headband: null, skin: 0xdec0aa, sash: 0x4d6882, stocky: false, beard: false, pack: false,
      pose: 'jade', outfit: 'dress', hair: 'long', accent: 0xdbdfda },
  },
  {
    id: 'zhang-liao', speed: 17, name: '张辽', gender: 'male', role: '持刀武将', specialty: '守阵、突进、统军', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 张辽', portrait: '/assets/characters/zhang-liao-v1.png',
      bio: '靛青甲衣上收束着铜色系带，长刀斜立在身旁。他站得沉稳，眼神始终留意着阵线最薄的地方。',
      robe: 0x343d61, headband: null, skin: 0xbe9474, sash: 0xa1804f, stocky: false, beard: true, pack: false,
      pose: 'sentinel', outfit: 'armor', hair: 'crown', accent: 0x30394b },
  },
  {
    id: 'guan-yu', speed: 15, name: '关羽', gender: 'male', role: '长刀武将', specialty: '忠义、武勇、镇守', equipment: '青龙偃月刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 关羽', portrait: '/assets/characters/guan-yu-v1.png',
      bio: '绿袍垂在甲外，长须顺着胸前落下。他将偃月刀稳稳扶住，先看清来者，再决定是否让路。',
      robe: 0x3f6851, headband: 0x345740, skin: 0xb36d56, sash: 0xa0824c, stocky: false, beard: true, pack: false,
      pose: 'longbeard', outfit: 'armor', hair: 'bun', accent: 0x56655a },
  },
  {
    id: 'zhang-fei', speed: 14, name: '张飞', gender: 'male', role: '持矛武将', specialty: '勇力、破阵、震慑', equipment: '丈八蛇矛', weapon: 'serpentspear',
    appearance: { identity: '乱世人物 · 张飞', portrait: '/assets/characters/zhang-fei-v1.png',
      bio: '铁甲与锈红腰带裹住宽厚的身躯，虬须衬着一双锐利的眼。他压低蛇矛，像随时能跨出沉重的一步。',
      robe: 0x393d3d, headband: 0x654539, skin: 0xb18465, sash: 0x9b5140, stocky: true, beard: true, pack: false,
      pose: 'serpent', outfit: 'armor', hair: 'bun', accent: 0x303536 },
  },
  {
    id: 'zhao-yun', speed: 21, name: '赵云', gender: 'male', role: '持枪武将', specialty: '突围、护卫、机动', equipment: '长枪', weapon: 'spear',
    appearance: { identity: '乱世人物 · 赵云', portrait: '/assets/characters/zhao-yun-v3.png',
      bio: '白翎掠过银甲，淡蓝披风在身后展开。他沉下重心，双手横握长枪，为身后的同伴守住去路。',
      robe: 0xbecbd0, headband: null, skin: 0xd3ae90, sash: 0x7395aa, stocky: false, beard: false, pack: false,
      pose: 'lancer', outfit: 'armor', hair: 'crown', accent: 0xd2d9d6, plume: true },
  },
  {
    id: 'mi-fu-ren', speed: 11, name: '糜夫人', gender: 'female', role: '世家人物', specialty: '护持、体察、应变', equipment: '丝帕', weapon: 'handkerchief',
    appearance: { identity: '乱世人物 · 糜夫人', portrait: '/assets/characters/mi-fu-ren-v1.png',
      bio: '暖白层衣间露出柔和的绛红，她将丝帕收在手中，微微侧身护住身后的空处。温和的神情里，也有不肯退开的坚决。',
      robe: 0xa36860, headband: null, skin: 0xddb99d, sash: 0x9a6159, stocky: false, beard: false, pack: false,
      pose: 'protective', outfit: 'dress', hair: 'long', accent: 0xdfd1b7 },
  },
  {
    id: 'zhang-xingcai', speed: 16, name: '张星彩', gender: 'female', role: '持盾武者', specialty: '护卫、格挡、近战', equipment: '圆盾与剑', weapon: 'swordshield',
    appearance: { identity: '乱世人物 · 张星彩', portrait: '/assets/characters/zhang-xingcai-v1.png',
      bio: '深青甲片以红绳系紧，圆盾护在身前，剑锋指向侧方。她的站姿利落而坚定，给同伴留下可以安心靠近的位置。',
      robe: 0x355b5d, headband: 0x9a4540, skin: 0xd0a78a, sash: 0xa34f45, stocky: false, beard: false, pack: false,
      pose: 'shieldguard', outfit: 'armor', hair: 'long', accent: 0x30494e },
  },
  {
    id: 'zhuge-liang', speed: 12, name: '诸葛亮', gender: 'male', role: '谋士', specialty: '筹策、号令、治政', equipment: '羽扇', weapon: 'fan',
    appearance: { identity: '乱世人物 · 谋士', portrait: '/assets/characters/zhuge-liang-v1.png',
      bio: '青灰长衣间，一柄羽扇轻轻合拢。他先听清同伴的来意，再把道路与粮秣逐项理顺。羽扇的战斗号令与同行经历为游戏演绎，相遇地点并非逐年精确驻地。',
      robe: 0x78928c, headband: 0x495b60, skin: 0xcfae90, sash: 0x4a6166, stocky: false, beard: true, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'bun', accent: 0xe2e1cd },
  },
  {
    id: 'zhou-yu', speed: 18, name: '周瑜', gender: 'male', role: '江东统军者', specialty: '统军、水战、决断', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '乱世人物 · 江东统军者', portrait: '/assets/characters/zhou-yu-v1.png',
      bio: '绛红衣袍衬着青甲，佩剑稳在身侧。他神情从容，却始终留意江岸与船队的动向。本作沿江东与荆州活动区域编排相遇，同行是架空支线。',
      robe: 0x8e4148, headband: null, skin: 0xd1af90, sash: 0x96764d, stocky: false, beard: false, pack: false,
      pose: 'commander', outfit: 'armor', hair: 'crown', accent: 0x456b70 },
  },
  {
    id: 'yuan-shu', speed: 14, name: '袁术', gender: 'male', role: '群雄主事', specialty: '号令、经营、权势', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 袁术', portrait: '/assets/characters/yuan-shu-v1.png',
      bio: '朱紫宽袍衬着金铜冠饰，他将手按在佩剑上，言语间自有世家公子的矜持。史载袁术活动于洛阳、南阳与九江；本作据此编排宛与寿春的主事阶段，逐年驻城及同行经历属于游戏演绎。',
      robe: 0x703f64, headband: null, skin: 0xc49c7c, sash: 0xa48648, stocky: true, beard: true, pack: false,
      pose: 'tyrant', outfit: 'robe', hair: 'crown', accent: 0x9d4541 },
  },
  {
    id: 'chen-gong', speed: 11, name: '陈宫', gender: 'male', role: '军府谋佐', specialty: '筹策、察势、谋议', equipment: '书卷', weapon: 'scroll',
    appearance: { identity: '乱世人物 · 谋佐', portrait: '/assets/characters/chen-gong-v1.png',
      bio: '深青灰衣袖间收着书卷，清瘦的面容上少见轻率的笑意。陈宫曾从曹操，后辅吕布；本作在濮阳与下邳安排谋佐职事，相遇年月与府署岗位属于游戏编排，不以演义情节代替史实。',
      robe: 0x405c60, headband: 0x303f46, skin: 0xc9a68a, sash: 0x6d756b, stocky: false, beard: true, pack: false,
      pose: 'strategist', outfit: 'robe', hair: 'crown', accent: 0x89958c },
  },
  {
    id: 'zhang-miao', speed: 11, name: '张邈', gender: 'male', role: '陈留主事', specialty: '治郡、交游、筹粮', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '乱世人物 · 陈留太守', portrait: '/assets/characters/zhang-miao-v1.png',
      bio: '赭褐官袍整齐收束，佩剑垂在身侧，他先拱手听清来意。史载张邈为陈留太守，并参与兖州局势的变动；本作以陈留为相遇地点，具体职事阶段和同行故事属于游戏演绎。',
      robe: 0x816044, headband: null, skin: 0xc6a182, sash: 0x665345, stocky: false, beard: true, pack: false,
      pose: 'greeting', outfit: 'robe', hair: 'crown', accent: 0xb29a71 },
  },
  {
    id: 'gao-shun', speed: 12, name: '高顺', gender: 'male', role: '步军统领', specialty: '治军、守阵、步战', equipment: '剑与盾', weapon: 'swordshield',
    appearance: { identity: '乱世人物 · 步军统领', portrait: '/assets/characters/gao-shun-v1.png',
      bio: '铁灰札甲没有多余的装饰，剑盾在手，站姿严整。他以清白有威严、所将兵精练见于记载；本作将其安排在下邳吕布军府，驻城年月、岗位和同行经历属于游戏演绎。',
      robe: 0x535b61, headband: 0x40464b, skin: 0xb99678, sash: 0x6c5545, stocky: false, beard: false, pack: false,
      pose: 'sentinel', outfit: 'armor', hair: 'bun', accent: 0x333e45 },
  },
  {
    id: 'zhou-tai', speed: 15, name: '周泰', gender: 'male', role: '江东护卫', specialty: '护卫、突围、近战', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 江东护卫', portrait: '/assets/characters/zhou-tai-v1.png',
      bio: '青黑轻甲下露出愈合的旧伤，长柄战刀稳稳护在身前。周泰随孙策、孙权征战，以护主见称；本作沿吴、宛陵、江陵编排相遇，221年关窗是游戏故事边界，史书仅记其黄武中卒，不定确切卒年。',
      robe: 0x304b50, headband: 0x344341, skin: 0xb68b69, sash: 0x796044, stocky: true, beard: true, pack: false,
      pose: 'bruiser', outfit: 'armor', hair: 'bun', accent: 0x29363d },
  },
  {
    id: 'han-dang', speed: 14, name: '韩当', gender: 'male', role: '弓马武将', specialty: '弓术、骑战、辅军', equipment: '长弓', weapon: 'bow',
    appearance: { identity: '乱世人物 · 弓马武将', portrait: '/assets/characters/han-dang-v1.png',
      bio: '暗红衣襟收在灰甲之内，鬓边已有霜色，握弓的手仍很稳。韩当历随孙坚、孙策与孙权；本作据从属背景安排军府职事，184年宛地相遇及后续驻城年月均为游戏编排，并非逐年精确驻地。',
      robe: 0x744743, headband: 0x62443f, skin: 0xb99274, sash: 0x75634c, stocky: false, beard: true, pack: false,
      pose: 'archer', outfit: 'armor', hair: 'bun', accent: 0x60696b },
  },
  {
    id: 'xiahou-dun', speed: 14, name: '夏侯惇', gender: 'male', role: '曹操军府将领', specialty: '统军、守阵、决断', equipment: '长柄战刀', weapon: 'glaive',
    appearance: { identity: '乱世人物 · 曹操军府将领', portrait: '/assets/characters/xiahou-dun-v1.png',
      bio: '玄青甲下身形厚实，稳健持刀，左眼覆以眼罩。史载夏侯惇伤左目；本作以194年为外观切换的游戏年份，之前双目完整，具体驻城和同行均为游戏编排。',
      robe: 0x273b4a, headband: null, skin: 0xbc9271, sash: 0x987447, stocky: true, beard: true, pack: false,
      pose: 'sentinel', outfit: 'armor', hair: 'crown', accent: 0x205363 },
  },
  {
    id: 'xiahou-yuan', speed: 16, name: '夏侯渊', gender: 'male', role: '曹操军府弓马将领', specialty: '急行、弓术、统军', equipment: '强弓', weapon: 'bow',
    appearance: { identity: '乱世人物 · 弓马将领', portrait: '/assets/characters/xiahou-yuan-v1.png',
      bio: '赭红轻甲收束利落，强弓握在掌中，目光已望向下一段道路。夏侯渊以急行与弓马形象入画；本作驻城年月与同行故事为游戏编排。',
      robe: 0x984b35, headband: 0x984b35, skin: 0xc29a77, sash: 0x6d573e, stocky: false, beard: true, pack: false,
      pose: 'archer', outfit: 'armor', hair: 'bun', accent: 0x4b3930 },
  },
  {
    id: 'cao-ren', speed: 12, name: '曹仁', gender: 'male', role: '曹操军府守阵将领', specialty: '守阵、护军、统率', equipment: '剑与宽盾', weapon: 'swordshield',
    appearance: { identity: '乱世人物 · 守阵将领', portrait: '/assets/characters/cao-ren-v1.png',
      bio: '厚甲宽盾护住身前，曹仁站得沉稳，留意阵线的每一处空隙。本作襄阳为包含樊城方向背景的荆北军府联络点；不据未赴任的广阳太守官名安排蓟城相遇，驻城为游戏编排。',
      robe: 0x3c4858, headband: null, skin: 0xb68d70, sash: 0x94734c, stocky: true, beard: true, pack: false,
      pose: 'shieldguard', outfit: 'armor', hair: 'crown', accent: 0x2c3e54 },
  },
  {
    id: 'cao-xiu', speed: 15, name: '曹休', gender: 'male', role: '曹氏军府骑将', specialty: '骑战、机动、统军', equipment: '长枪', weapon: 'spear',
    appearance: { identity: '乱世人物 · 成年骑将', portrait: '/assets/characters/cao-xiu-v1.png',
      bio: '精干深红甲紧束身形，长枪立在身侧。此处描绘成年领军的曹休，不将幼年投奔画成成年将领；220年起归属曹魏军府，驻城与同行为游戏编排。',
      robe: 0x6f2928, headband: null, skin: 0xcba383, sash: 0x8a6a46, stocky: false, beard: false, pack: false,
      pose: 'lancer', outfit: 'armor', hair: 'crown', accent: 0x343d42 },
  },
  {
    id: 'liu-biao', speed: 10, name: '刘表', gender: 'male', role: '荆州主事', specialty: '治政、交游、经营', equipment: '书卷', weapon: 'scroll',
    appearance: { identity: '群雄 · 荆州主事', portrait: '/assets/characters/liu-biao-v1.png',
      bio: '高大儒雅的刘表身着青蓝外袍，紫色缘饰衬着冠服，书卷收在宽袖之前。本作以襄阳编排荆州主事阶段，具体年月与同行经历为游戏演绎。',
      robe: 0x355f69, headband: null, skin: 0xc7a183, sash: 0x9c8157, stocky: false, beard: true, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'crown', accent: 0x615277 },
  },
  {
    id: 'liu-zhang', speed: 10, name: '刘璋', gender: 'male', role: '益州主事', specialty: '治政、守成、交涉', equipment: '简册', weapon: 'scroll',
    appearance: { identity: '群雄 · 益州主事', portrait: '/assets/characters/liu-zhang-v1.png',
      bio: '温和的中年面容衬着蜀锦灰绿袍，执简时略微收肩。刘璋的成都主事窗口与同行经历属于游戏编排，造型为原创概念设计。',
      robe: 0x69776b, headband: null, skin: 0xd0ab8c, sash: 0x827257, stocky: true, beard: true, pack: false,
      pose: 'greeting', outfit: 'robe', hair: 'crown', accent: 0xc6b994 },
  },
  {
    id: 'zhang-lu', speed: 11, name: '张鲁', gender: 'male', role: '汉中主事', specialty: '治众、教团、治理', equipment: '简册', weapon: 'scroll',
    appearance: { identity: '群雄 · 汉中主事', portrait: '/assets/characters/zhang-lu-v1.png',
      bio: '深青宽袍朴素整洁，张鲁抱着简册听人陈说。他是汉中教团治理背景下的主事人物，不作为普通郡府雇员；相遇与同行为游戏编排，画面不使用魔法效果。',
      robe: 0x24545a, headband: 0x344646, skin: 0xbe9b7d, sash: 0x6c6f60, stocky: false, beard: true, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'bun', accent: 0x9aab9c },
  },
  {
    id: 'ma-teng', speed: 14, name: '马腾', gender: 'male', role: '西北军府主事', specialty: '骑战、统军、交涉', equipment: '长枪', weapon: 'spear',
    appearance: { identity: '群雄 · 西北军府主事', portrait: '/assets/characters/ma-teng-v1.png',
      bio: '年长魁梧的马腾面有风霜，西北札甲外覆毛皮披领。凉州与关中联络点并不代表他占有长安，后段为入朝宿卫，不列当地郡守；驻城与同行是游戏编排。',
      robe: 0x795b40, headband: 0x564b3e, skin: 0xae8161, sash: 0x654a36, stocky: true, beard: true, pack: false,
      pose: 'commander', outfit: 'armor', hair: 'bun', accent: 0xb6a58b },
  },
  {
    id: 'himiko', speed: 11, name: '卑弥呼', gender: 'female', role: '倭国女王', specialty: '统众、礼仪、通使', equipment: '铜镜', weapon: 'jade',
    appearance: { identity: '人物志 · 倭国女王', portrait: '/assets/characters/himiko-v1.png',
      bio: '3世纪倭国女王，与曹魏通使。成熟面容、织物长裙和珠饰配以手持铜镜，为原创游戏概绘，不推断女王本人来华。本版仅供人物志查看，暂未开放相遇。',
      robe: 0xc0a67b, headband: 0x716448, skin: 0xcaa184, sash: 0x685442, stocky: false, beard: false, pack: false,
      pose: 'jade', outfit: 'dress', hair: 'long', accent: 0x8b9a87 },
  },
  {
    id: 'gongsun-zan', speed: 16, name: '公孙瓒', gender: 'male', role: '边军主事', specialty: '骑战、突进、统军', equipment: '长矛', weapon: 'spear',
    appearance: { identity: '群雄 · 边军主事', portrait: '/assets/characters/gongsun-zan-v1.png',
      bio: '白灰甲与白色披帛衬出边军风貌，公孙瓒持矛站定。早期地方军吏归属涿郡军府，后为外军主事联络点，不据此接管涿城；195年后易京未入地图，窗口为游戏编排。',
      robe: 0xd0d0c5, headband: null, skin: 0xc19877, sash: 0x806d53, stocky: false, beard: true, pack: false,
      pose: 'lancer', outfit: 'armor', hair: 'crown', accent: 0xe3dfd0 },
  },
  {
    id: 'yuan-shao', speed: 12, name: '袁绍', gender: 'male', role: '冀州主事', specialty: '统军、交游、号令', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '群雄 · 冀州主事', portrait: '/assets/characters/yuan-shao-v1.png',
      bio: '华贵金褐甲配绛色披风，袁绍按剑而立，世家气度自见。洛阳在朝窗口止于189年8月，190年渤海未入地图，后在邺相遇；具体年月与同行为游戏编排。',
      robe: 0x8b672f, headband: null, skin: 0xc69d7d, sash: 0x82623b, stocky: false, beard: true, pack: false,
      pose: 'commander', outfit: 'armor', hair: 'crown', accent: 0x7e2928 },
  },
  {
    id: 'liu-yu', speed: 10, name: '刘虞', gender: 'male', role: '幽州主事', specialty: '安民、治政、交涉', equipment: '书卷', weapon: 'scroll',
    appearance: { identity: '群雄 · 幽州主事', portrait: '/assets/characters/liu-yu-v1.png',
      bio: '年长清俭的刘虞穿着灰蓝素官袍，衣冠没有多余装饰。本作在188至192年蓟城安排主事窗口，避开193年的月内不确定性，同行为游戏演绎。',
      robe: 0x667987, headband: null, skin: 0xc2a083, sash: 0x746e5f, stocky: false, beard: true, pack: false,
      pose: 'scholar', outfit: 'robe', hair: 'crown', accent: 0xbbb9a8 },
  },
  {
    id: 'zhang-yan', speed: 17, name: '张燕', gender: 'male', role: '黑山部众首领', specialty: '山地、机动、统众', equipment: '佩剑', weapon: 'sword',
    appearance: { identity: '乱世人物 · 山地首领', portrait: '/assets/characters/zhang-yan-v1.png',
      bio: '深褐短甲利于山地行走，束发持剑的张燕神情机敏。廮陶为黑山部众联络处，不冒称巨鹿太守，也不接管当地守备；205年后归曹操军府，210年是游戏窗口终点，不称卒年。',
      robe: 0x4b392b, headband: 0x453c31, skin: 0xb98e6d, sash: 0x776047, stocky: false, beard: false, pack: false,
      pose: 'scout', outfit: 'armor', hair: 'bun', accent: 0x3d4440 },
  },
];

export function getHistoricalCharacter(id: string): HistoricalCharacter | undefined {
  return HISTORICAL_CHARACTERS.find(character => character.id === id);
}

const LEADERS: Record<RouteId, string> = { cao: 'cao-cao', liu: 'liu-bei', sun: 'sun-quan' };
export function getRouteLeader(route: RouteId): HistoricalCharacter {
  return getHistoricalCharacter(LEADERS[route])!;
}
