import type { HistoricalCharacter } from './historicalCharacters';
import type { CareerStage } from './careerData';
import type { CharacterAppearance, ModelWeapon } from './characters';
export { GENERATION_LIFE_BASELINES } from './generationLifeData';

type Concept = [id: string, name: string, role: string, specialty: string, equipment: string, weapon: ModelWeapon,
  speed: number, robe: number, accent: number, pose: CharacterAppearance['pose'], outfit: 'robe' | 'armor', beard: boolean, bio: string];
const concepts: Concept[] = [
  ['cao-pi', '曹丕', '曹氏人物', '击剑、政务、文辞', '佩剑', 'sword', 15, 0x4c456a, 0xa58b51, 'sentinel', 'robe', false, '曹操之子，211年任五官中郎将，217年为魏太子，220年即帝位。黛紫袍与细长佩剑取材击剑、文辞背景。'],
  ['liu-shan', '刘禅', '刘氏人物', '任贤、政务、守成', '简册', 'scroll', 10, 0x9c8254, 0x536b55, 'greeting', 'robe', false, '207年生于荆州，后至成都；219年立汉中王太子，223年即位，264年迁洛阳为安乐公。赭金衣袍与简册表现其政务身份。'],
  ['sima-yi', '司马懿', '魏廷人物', '持重、统军、筹粮', '佩剑', 'sword', 12, 0x354952, 0x9ca596, 'strategist', 'robe', true, '201年为上计掾，208年入曹府，后来统军于宛、关中等地，249年在洛阳掌政。深灰青袍与收敛站姿取材持重形象；生年据享年反推。'],
  ['sima-zhao', '司马昭', '魏晋人物', '统筹、军政、号令', '佩剑', 'sword', 13, 0x555163, 0xb49865, 'commander', 'armor', true, '238年封新城乡侯，正始间任典农中郎将，255年后掌军政，264年为晋王。他的号令取材统筹诸军，不移植邓艾的个人战绩。'],
  ['sima-yan', '司马炎', '魏晋人物', '调度、政务、整军', '简册', 'scroll', 11, 0x8b694e, 0xd0bb7e, 'leader', 'robe', false, '嘉平间入仕，264年立晋世子，265年继晋王并受禅，后来在洛阳主持晋廷。金褐袍与简册表现政务身份，早期不以晋帝身份出场。'],
  ['deng-ai', '邓艾', '魏方人物', '屯田、险道、统军', '长枪', 'spear', 16, 0x596342, 0xa28962, 'scout', 'armor', true, '生年采用约197。早年迁汝南、颍川，任农官；正始间经营淮南屯田，249年后活跃于西线，263年由险道入蜀。粗绿甲与行军装束取材其经历。'],
  ['jiang-wei', '姜维', '陇蜀人物', '西线、统军、突进', '长枪', 'spear', 17, 0x56775f, 0xbdb58e, 'lancer', 'armor', false, '202年生，早为天水郡吏，228年归蜀，后在成都、汉中与陇右军府活动。青绿甲与长枪为军事概念形象，不将小说枪法当史料。'],
  ['zhong-yao', '钟繇', '汉魏人物', '安关、刑狱、书法', '书卷', 'scroll', 10, 0x796654, 0xd1c5a2, 'scholar', 'robe', true, '约151为采用生年。汉末任职朝廷，199年前后督关中，后入魏廷，226年为太傅。褐灰宽袍与书卷取材文政背景，不以书法虚构法术。'],
  ['zhong-hui', '钟会', '魏廷人物', '筹策、军谋、察势', '简册', 'scroll', 14, 0x46506c, 0xb3a17d, 'strategist', 'robe', false, '225年生，正始间为秘书郎、尚书郎，255年后参与淮南军谋，263年领军入蜀。墨蓝衣与简册表现筹策身份，能力不预设其叛乱成功。'],
  ['xun-yu', '荀彧', '汉魏人物', '荐贤、留守、政务', '书卷', 'scroll', 11, 0x647b78, 0xd2c8aa, 'greeting', 'robe', true, '163年生，189年前后离颍川，191年从曹，194年留守，196年后在许主持中枢事务，212年至寿春。浅青灰袍取材文臣形象。'],
  ['xun-you', '荀攸', '汉魏人物', '军谋、密议、临机', '简册', 'scroll', 12, 0x626c56, 0xb7aa82, 'scholar', 'robe', true, '157年生，汉末在朝谋议，196年后入曹府为军师，参与官渡等战役，213年为魏尚书令。灰绿袍与藏于袖前的简册表现沉静军谋形象。'],
  ['sun-xiu', '孙休', '孙氏人物', '射猎、政务、号令', '长弓', 'bow', 14, 0x45756b, 0xc2ab6d, 'archer', 'robe', false, '235年生，252年封琅邪王，先后寓居虎林、丹阳、会稽，258年即位于建业。本传有好射雉记载，青碧袍与弓取材于此。虎林按江东区域接点编排。'],
  ['sun-liang', '孙亮', '孙氏人物', '宿卫、政务、整军', '佩剑', 'sword', 12, 0x88a18b, 0xc5b878, 'guard', 'robe', false, '243年生，250年立太子，252年即位，258年被废为会稽王。浅绿袍与佩剑为成年概念形象；少年在位不意味着成年野战经验，260年卒的死因有异说。'],
  ['liu-chen', '刘谌', '刘氏人物', '谏言、守志、振众', '佩剑', 'sword', 13, 0x784d45, 0xc2aa7c, 'protective', 'robe', false, '生年未载，固定游戏估年采用234，以259年封北地王节点减25。可确证活动在成都，北地是封号，不能据此把他安置到魏境北地郡；263年谏拒降。'],
  ['cao-rui', '曹叡', '曹氏人物', '决断、任将、军政', '佩剑', 'sword', 13, 0x625075, 0xbc9a5c, 'commander', 'robe', false, '出生采用205，据裴注推定；本纪享年反推204，保留异说。226年继魏位，主要在洛阳主持军政。紫灰袍与佩剑表现决断身份。'],
  ['cao-fang', '曹芳', '曹氏人物', '礼仪、承统、护持', '简册', 'scroll', 10, 0x8b8495, 0xbaac86, 'calm', 'robe', false, '232年生，239年幼年即位，254年退位居河内重门，265年后为邵陵公。浅紫灰袍表现礼仪身份；河内未设地图城点，以洛阳作为区域联络接点。'],
  ['cao-mao', '曹髦', '曹氏人物', '执剑、文辞、决意', '佩剑', 'sword', 15, 0x81585e, 0xc5b08b, 'sentinel', 'robe', false, '生年采用241，本人《集》载242异说。254年入洛阳即位，260年亲执剑讨司马昭遇害。绛灰袍与出鞘剑取材其记载，结局不作为本局强制事件。'],
  ['cao-huan', '曹奂', '曹氏人物', '礼仪、交接、整众', '简册', 'scroll', 10, 0x738399, 0xd4c7a4, 'greeting', 'robe', false, '生年采用246，裴注卒年享年有245异说；260年即位，265年退位为陈留王，后馆邺。蓝灰袍与简册取材礼仪身份，不虚构亲征武勇。'],
  ['sima-shi', '司马师', '魏廷人物', '整军、持重、执政', '剑与盾', 'swordshield', 12, 0x41485c, 0x9d997a, 'shieldguard', 'armor', false, '208年生，正始间在洛阳任官，249年参与政变，251年后掌军政，255年征淮南后卒于许昌。玄蓝甲与盾取材治军形象。'],
  ['sun-hao', '孙皓', '孙氏人物', '号令、威势、政务', '佩剑', 'sword', 13, 0x783d4e, 0xb69a60, 'tyrant', 'robe', false, '242为采用生年；258年乌程侯，264年即位，265—266年一度迁武昌，后返建业，280年后洛阳归命侯。卒年按公历采用284；深绛袍的威势不用于美化暴政。'],
  ['lu-xun', '陆逊', '江东人物', '统军、火攻、谋断', '佩剑', 'sword', 16, 0x456558, 0xbcb08a, 'commander', 'armor', false, '183年生，200年代入孙权幕府，219年荆州、222年夷陵、228年石亭均有军事事迹，后在武昌主持军政。青绿轻甲取材统军形象，火攻灵感来自夷陵。'],
  ['lu-kang', '陆抗', '江东人物', '江防、水陆、守势', '剑与盾', 'swordshield', 13, 0x486b78, 0xb2aa82, 'shieldguard', 'armor', false, '226年生，245年继领父兵，后在江陵、西陵一线活动，272年西陵之战有明确记载。青蓝甲与盾取材江防身份，不把羊陆交往写成两国停战。'],
  ['zhuge-ke', '诸葛恪', '江东人物', '动员、政务、统军', '佩剑', 'sword', 13, 0x90714c, 0x5d7a75, 'leader', 'robe', true, '203年生，早年在孙权幕府，234年任丹阳太守，252—253年辅孙亮。东兴胜、合肥新城败均为取材背景，金褐袍不将其塑成常胜军师。'],
  ['du-yu', '杜预', '魏晋人物', '指授、军势、经学', '简册', 'scroll', 11, 0x687768, 0xbeb590, 'scholar', 'armor', true, '222年生，263年参伐蜀，278年代羊祜镇襄阳，280年指授攻江陵。本传记其不擅骑射，灰绿甲与简册表现军政指挥；公历卒年采用285。'],
  ['yang-hu', '羊祜', '魏晋人物', '安民、边务、声望', '佩剑', 'sword', 12, 0x879389, 0xd0c5a3, 'greeting', 'robe', true, '221年生，魏末入仕，269年后镇襄阳，278年归洛阳卒，病中举杜预自代。素灰绿袍取材安民与边境声望；回复同伴为玩法抽象。'],
  ['wang-jun', '王濬', '魏晋人物', '舟师、机动、统军', '佩剑', 'sword', 15, 0x3e6572, 0xaf925e, 'commander', 'armor', true, '206年生，历巴郡、广汉、益州任职，272年后造舰备吴，280年率舟师顺流至建业，后归洛阳。深水蓝甲取材水军；卒年按公历采用286。'],
];

/** Adult concept images remain inspectable at every date; lifecycle gates interactions separately. */
export const GENERATION_CHARACTERS: readonly HistoricalCharacter[] = concepts.map(([id, name, role, specialty, equipment, weapon, speed, robe, accent, pose, outfit, beard, bio]) => ({
  id, name, gender: 'male', role, specialty, equipment, weapon, speed,
  appearance: { identity: `世代人物 · ${role}`, portrait: `/assets/characters/${id}-v1.png`,
    bio: `${bio} 本作造型、逐年驻城、武学与同行为游戏演绎，不冒称真实肖像或连续任期。`,
    robe, accent, headband: null, skin: 0xc7a282, sash: accent, stocky: id === 'sima-zhao' || id === 'sima-shi', beard, pack: false,
    pose, outfit, hair: 'crown' },
}));

const s = (from: number, to: number, cityId: string, kind: CareerStage['kind'], title: string, office: string, employerId?: string): CareerStage =>
  ({ from: { year: from, month: 1 }, to: { year: to, month: 12 }, cityId, kind, title, office, ...(employerId ? { employerId } : {}) });
const after = (from: number, to: number, cityId: string): CareerStage => s(from, to, cityId, 'free', '游居人物', '本局延寿游居（游戏编排）');

/** Regional encounter arrangements. Final free stages support every allowed +5 life extension. */
export const GENERATION_CAREERS: Record<string, CareerStage[]> = {
  'cao-pi': [s(211, 216, 'ye', 'employed', '五官中郎将', '曹操军府', 'cao-cao'), s(217, 219, 'ye', 'employed', '魏太子', '魏王府', 'cao-cao'), s(220, 226, 'henan', 'governing', '魏帝', '魏廷'), after(227, 231, 'henan')],
  'liu-shan': [s(219, 220, 'shujun', 'employed', '汉中王太子', '刘备府署', 'liu-bei'), s(221, 222, 'shujun', 'employed', '蜀汉太子', '蜀汉朝廷', 'liu-bei'), s(223, 263, 'shujun', 'governing', '蜀汉主君', '蜀汉朝廷'), s(264, 276, 'henan', 'free', '安乐公', '洛阳寓居（历史迁居背景）')],
  'sima-yi': [s(201, 207, 'henan', 'free', '上计掾·河内联络', '河内至洛阳联络（地图接点）'), s(208, 219, 'xuxian', 'employed', '曹府文吏', '曹操军府', 'cao-cao'), s(220, 226, 'henan', 'employed', '魏廷军政官', '魏廷'), s(227, 230, 'nanyang', 'employed', '荆豫军务统领', '魏军府'), s(231, 234, 'changan', 'employed', '关中统军', '魏军府'), s(235, 248, 'henan', 'employed', '魏廷重臣', '魏廷'), s(249, 251, 'henan', 'governing', '魏廷执政', '魏廷'), after(252, 256, 'henan')],
  'sima-zhao': [s(238, 239, 'henan', 'employed', '新城乡侯', '魏廷'), s(240, 254, 'henan', 'employed', '典农及军政官', '魏廷'), s(255, 263, 'henan', 'governing', '魏廷执政', '魏廷'), s(264, 265, 'henan', 'governing', '晋王·魏廷执政', '晋王府'), after(266, 270, 'henan')],
  'sima-yan': [s(253, 263, 'henan', 'employed', '魏廷官员', '魏廷'), s(264, 264, 'henan', 'employed', '晋世子', '晋王府', 'sima-zhao'), s(265, 290, 'henan', 'governing', '晋廷主君', '晋廷'), after(291, 295, 'henan')],
  'deng-ai': [s(213, 239, 'yingchuan', 'employed', '农官（成年活动编排）', '颍川屯田署'), s(240, 248, 'shouchun', 'employed', '屯田军政官', '魏方淮南军府'), s(249, 254, 'jixian', 'employed', '陇右将领', '魏方西线军府'), s(255, 262, 'didao', 'employed', '西线统军', '魏方西线军府'), s(263, 263, 'shujun', 'employed', '入蜀将领', '魏方征蜀军府'), after(264, 269, 'shujun')],
  'jiang-wei': [s(218, 227, 'jixian', 'employed', '天水郡吏', '天水郡府（成年活动编排）'), s(228, 234, 'nanzheng', 'employed', '蜀汉军将', '蜀汉军府', 'zhuge-liang'), s(235, 252, 'shujun', 'employed', '蜀汉将领', '蜀汉军府'), s(253, 262, 'nanzheng', 'employed', '西线统军', '蜀汉军府'), s(263, 263, 'zitong', 'employed', '蜀北军务联络', '蜀汉军府'), after(264, 269, 'shujun')],
  'zhong-yao': [s(184, 189, 'henan', 'employed', '汉廷官员', '汉廷'), s(190, 195, 'changan', 'employed', '汉廷侍臣', '汉廷'), s(196, 198, 'xuxian', 'employed', '在朝官员', '汉廷'), s(199, 215, 'changan', 'employed', '关中军政官', '汉廷及曹方关中军府'), s(216, 219, 'ye', 'employed', '魏国重臣', '魏王府'), s(220, 225, 'henan', 'employed', '魏廷重臣', '魏廷'), s(226, 230, 'henan', 'employed', '太傅', '魏廷'), after(231, 235, 'henan')],
  'zhong-hui': [s(244, 254, 'henan', 'employed', '秘书郎·尚书郎', '魏廷'), s(255, 258, 'shouchun', 'employed', '淮南军谋', '魏方军府'), s(259, 262, 'henan', 'employed', '魏廷军政官', '魏廷'), s(263, 263, 'nanzheng', 'employed', '征蜀统军', '魏方征蜀军府'), after(264, 269, 'shujun')],
  'xun-yu': [s(189, 189, 'yingchuan', 'free', '颍川士人', '颍川'), s(190, 190, 'ye', 'free', '冀州寓居', '冀州联络'), s(191, 195, 'dongjun', 'employed', '留守谋佐', '曹操军府', 'cao-cao'), s(196, 211, 'xuxian', 'employed', '尚书令·中枢谋佐', '汉廷及曹操军府', 'cao-cao'), s(212, 212, 'shouchun', 'employed', '汉廷重臣', '汉廷'), after(213, 217, 'shouchun')],
  'xun-you': [s(189, 189, 'henan', 'employed', '黄门侍郎', '汉廷'), s(190, 195, 'changan', 'free', '在朝及游居人物', '长安联络'), s(196, 212, 'xuxian', 'employed', '军师', '曹操军府', 'cao-cao'), s(213, 214, 'ye', 'employed', '魏尚书令', '魏王府'), after(215, 219, 'ye')],
  'sun-xiu': [s(252, 255, 'danyang', 'free', '琅邪王·江东寓居', '虎林及丹阳区域联络'), s(256, 257, 'shanyin', 'free', '琅邪王', '会稽寓居'), s(258, 264, 'moling', 'governing', '吴主', '吴廷'), after(265, 269, 'moling')],
  'sun-liang': [s(250, 251, 'moling', 'employed', '吴太子', '吴廷', 'sun-quan'), s(252, 257, 'moling', 'governing', '吴主（少年在位）', '吴廷'), s(258, 265, 'shanyin', 'free', '会稽王·退位寓居', '会稽寓居（延寿阶段为游戏编排）')],
  'liu-chen': [s(259, 263, 'shujun', 'employed', '北地王', '蜀汉朝廷', 'liu-shan'), after(264, 268, 'shujun')],
  'cao-rui': [s(221, 222, 'ye', 'free', '齐公', '曹氏王府'), s(223, 225, 'ye', 'free', '平原王', '曹氏王府'), s(226, 239, 'henan', 'governing', '魏帝', '魏廷'), after(240, 244, 'henan')],
  'cao-fang': [s(239, 253, 'henan', 'governing', '魏帝（幼年承统）', '魏廷'), s(254, 264, 'henan', 'free', '齐王·退位寓居', '河内重门联络（洛阳地图接点）'), s(265, 279, 'henan', 'free', '邵陵公', '河内寓居联络（延寿阶段为游戏编排）')],
  'cao-mao': [s(254, 260, 'henan', 'governing', '魏帝', '魏廷'), after(261, 265, 'henan')],
  'cao-huan': [s(260, 265, 'henan', 'governing', '魏帝', '魏廷'), s(266, 307, 'ye', 'free', '陈留王·退位寓居', '邺馆舍（延寿阶段为游戏编排）')],
  'sima-shi': [s(239, 248, 'henan', 'employed', '魏廷官员', '魏廷'), s(249, 250, 'henan', 'employed', '军政重臣', '魏廷'), s(251, 254, 'henan', 'governing', '魏廷执政', '魏廷'), s(255, 255, 'xuxian', 'employed', '淮南统军归途', '魏方军府'), after(256, 260, 'henan')],
  'sun-hao': [s(258, 263, 'wujun', 'free', '乌程侯', '吴地侯府'), s(264, 264, 'moling', 'governing', '吴主', '吴廷'), s(265, 266, 'echeng', 'governing', '吴主', '吴廷'), s(267, 279, 'moling', 'governing', '吴主', '吴廷'), s(280, 289, 'henan', 'free', '归命侯', '洛阳寓居（历史迁居背景）')],
  'lu-xun': [s(203, 218, 'wujun', 'employed', '江东文武官', '孙权军府', 'sun-quan'), s(219, 221, 'jiangling', 'employed', '荆州军将', '吴方军府'), s(222, 222, 'yiling', 'employed', '夷陵统军', '吴方军府'), s(223, 227, 'echeng', 'employed', '吴方统军', '吴方军府'), s(228, 228, 'shu', 'employed', '石亭军务联络', '吴方军府'), s(229, 243, 'echeng', 'employed', '武昌军政重臣', '吴廷'), s(244, 245, 'echeng', 'employed', '丞相', '吴廷'), after(246, 250, 'echeng')],
  'lu-kang': [s(245, 258, 'echeng', 'employed', '领军将领', '吴方军府'), s(259, 268, 'jiangling', 'employed', '西线将领', '吴方荆州军府'), s(269, 274, 'yiling', 'employed', '西陵军务统领', '吴方荆州军府'), after(275, 279, 'yiling')],
  'zhuge-ke': [s(223, 233, 'moling', 'employed', '吴廷文官', '吴廷'), s(234, 245, 'danyang', 'employed', '丹阳太守', '丹阳郡府'), s(246, 251, 'chaisang', 'employed', '军政将领', '吴方军府'), s(252, 253, 'moling', 'governing', '辅政重臣', '吴廷'), after(254, 258, 'moling')],
  'du-yu': [s(243, 262, 'henan', 'employed', '魏廷官员', '魏廷'), s(263, 264, 'nanzheng', 'employed', '征蜀参谋', '魏方军府'), s(265, 277, 'henan', 'employed', '晋廷军政官', '晋廷'), s(278, 279, 'xiangyang', 'employed', '镇南军政统领', '晋方荆州军府'), s(280, 284, 'jiangling', 'employed', '荆州军政统领', '晋方荆州军府'), after(285, 290, 'xiangyang')],
  'yang-hu': [s(241, 253, 'henan', 'free', '征辟未就·士人联络', '洛阳区域联络（成年活动编排）'), s(254, 264, 'henan', 'employed', '中书侍郎等职', '魏廷'), s(265, 268, 'henan', 'employed', '晋廷军政官', '晋廷'), s(269, 277, 'xiangyang', 'employed', '荆州军政统领', '晋方荆州军府'), s(278, 283, 'henan', 'free', '归朝休养', '洛阳寓居（延寿阶段为游戏编排）')],
  'wang-jun': [s(246, 263, 'anyi', 'employed', '河东从事（任年为游戏锚点）', '河东郡府'), s(264, 271, 'jiangzhou', 'employed', '巴郡等地军政官', '益州军府'), s(272, 279, 'shujun', 'employed', '益州水军统领', '晋方益州军府'), s(280, 280, 'moling', 'employed', '舟师统军', '晋方舟师军府'), s(281, 286, 'henan', 'employed', '晋廷将领', '晋廷'), after(287, 291, 'henan')],
};
