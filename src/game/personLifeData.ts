import type { LifeBaseline } from './lifeTypes';
import { GENERATION_LIFE_BASELINES } from './generationLifeData';

/** Research: docs/research/2026-10-24-generation-existing-lifespans.md.
 * Activity anchors used for a game estimate are never presented as birth evidence.
 * Unknown deaths follow max(fixed birth + 70, last attested alive + 6).
 */
function known(id: string, birthYear: number | null, deathYear: number, adultAnchor: number, source: string, note = ''): LifeBaseline {
  return { id, birthYear: birthYear ?? adultAnchor - 25, historicalBirthYear: birthYear,
    deathBaseYear: deathYear, historicalDeathYear: deathYear,
    birthEstimated: birthYear === null, deathEstimated: false, source,
    basis: `${birthYear === null ? `生年未详；固定游戏估年取成年活动锚点${adultAnchor}减25` : '生年采用史料记载或据享年推算值'}；卒年采用史料基准。${note}` };
}
function unknown(id: string, adultAnchor: number, lastAlive: number, source: string, note = ''): LifeBaseline {
  const birthYear = adultAnchor - 25;
  return { id, birthYear, historicalBirthYear: null, deathBaseYear: Math.max(birthYear + 70, lastAlive + 6),
    historicalDeathYear: null, birthEstimated: true, deathEstimated: true, source,
    basis: `生年未详；固定游戏估年取成年活动锚点${adultAnchor}减25；史卒年未详，寿限为游戏估年 max(估生年+70，最后明确存活年${lastAlive}+6)。${note}` };
}
const s = (volume: string) => `《三国志》卷${volume}（研究记录S${volume}）`;
const h = (volume: string) => `《后汉书》卷${volume}（研究记录H${volume}）`;

export const EXISTING_LIFE_BASELINES: readonly LifeBaseline[] = [
  known('cao-cao', 155, 220, 184, s('01'), '生年据卒时虚岁66推算，非精确生日。'),
  known('liu-bei', 161, 223, 184, s('32'), '生年据卒时虚岁63推算。'),
  known('sun-quan', 182, 252, 200, s('47'), '生年据卒时虚岁71推算。'),
  unknown('sun-shangxiang', 209, 209, `${s('32')}、${s('36')}、${s('37')}`, '史载孙夫人；尚香为故事姓名；明确系年的209婚姻作存活参照，不采用故事殉江卒年。'),
  unknown('diao-chan', 191, 192, '本作故事人物设定；参见研究记录S07的身份辨析', '故事人物；191—192为故事活动锚点，生卒均是游戏设定，不能等同无名侍婢史年。'),
  unknown('cai-yan', 194, 206, h('84'), '生年177仅推测，未作为史实；194—195被掳、在胡十二年及归汉后的记述支持206后尚存，非确定卒年。'),
  known('dong-zhuo', null, 192, 167, s('06'), '采用早期征战活动作成年锚点，不采132/139等未经本轮确证生年。'),
  known('lu-bu', null, 199, 189, `${s('01')}、${s('07')}`, '采用通行公历199；史书建安三年十二月有历法边界。'),
  known('hua-xiong', null, 191, 191, s('46'), '阳人战事卒，190相遇窗口不是卒年。'),
  known('zhen-ji', 183, 221, 204, s('05'), '光和五年十二月丁酉按通行公历换算为183；非仅按年号映射182。'),
  known('zhang-liao', 169, 222, 198, s('17'), '169为领鲁相时28岁及年代推算采用值，证据弱于直接生日。'),
  known('guan-yu', null, 219, 184, `${s('36')}、${s('47')}`, '采用建安二十四年219；岁末公历表达另有220说。'),
  known('zhang-fei', null, 221, 184, s('36')),
  known('zhao-yun', null, 229, 191, s('36')),
  unknown('mi-fu-ren', 196, 196, s('38'), '196嫁先主；208投井为故事情节，不据此设历史卒年。'),
  unknown('zhang-xingcai', 220, 220, '本作现代故事人物设定；研究记录S34身份辨析', '故事人物；220为本作成年活动设定，不能套用史载张皇后237卒年。'),
  known('zhuge-liang', 181, 234, 207, s('35'), '生年据卒时虚岁54推算。'),
  known('zhou-yu', 175, 210, 195, s('54'), '生年据卒时虚岁36推算。'),
  known('yuan-shu', null, 199, 189, `${s('06')}、${s('01')}`),
  known('chen-gong', null, 199, 192, `${s('07')}、${s('01')}`, '与吕布同次处死，公历口径一致。'),
  known('zhang-miao', null, 195, 190, s('07')),
  known('gao-shun', null, 199, 196, `${s('07')}、${s('01')}`, '与吕布同次处死，公历口径一致。'),
  { ...unknown('zhou-tai', 195, 222, s('55')), deathBaseYear: 225,
    basis: '生年未详；固定游戏估年取195成年活动锚点减25；黄武中卒记载仅给222—229区间，基准225为区间中点向下取整的游戏取值，非确切史卒年。' },
  known('han-dang', null, 226, 184, `${s('55')}、${s('47')}`, '父丧与黄武五年石阳战役互证226；227为其子韩综降魏年。'),
  known('xiahou-dun', null, 220, 189, s('09'), '14岁事迹未系年，不能反推史实出生年。'),
  known('xiahou-yuan', null, 219, 189, `${s('09')}、${s('36')}`),
  known('cao-ren', 168, 223, 190, s('09'), '生年据裴注卒时虚岁56推算。'),
  known('cao-xiu', null, 228, 200, s('09'), '200为本作成年在役锚点；年十余岁投奔记述不作为出生证据。'),
  known('liu-biao', 142, 208, 190, `${s('06')}、《刘镇南碑》（研究记录B01）`, '142据碑载虚岁67推算；碑混入蔡邕集，作者问题见研究，不称三国志明载生年。'),
  unknown('liu-zhang', 194, 219, s('31'), '219仍被吴任益州牧；随后仅记卒，不能把219/220当确切卒年。'),
  unknown('zhang-lu', 191, 215, s('08'), '215降曹不是卒年；其后仅记鲁薨。'),
  known('ma-teng', null, 212, 187, `${s('01')}、${s('36')}`, '建安十七年五月被诛；不采未经确证的156出生年。'),
  { ...unknown('himiko', 180, 247, s('30')), deathBaseYear: 247,
    basis: '生年未详；年已长大及女王时代背景仅作游戏估年参照，固定估生155（游戏成年锚点180减25）；约247/248卒有异说，本作取247为游戏基准，非无争议精确史年；只读资料人物。' },
  known('gongsun-zan', null, 199, 184, s('08')),
  known('yuan-shao', null, 202, 188, `${s('06')}、${s('01')}`),
  known('liu-yu', null, 193, 188, `${s('08')}、${h('73')}`),
  unknown('zhang-yan', 184, 205, s('08'), '204—205附曹受封之后仅记燕薨，窗口结束不作为最后存活年。'),
  known('sun-jian', 155, 191, 184, s('46'), '争议采用值：裴注校勘取191，正文192，英雄记193；155由191卒与虚岁37配套推算。'),
  known('sun-ce', 175, 200, 194, s('46'), '生年据卒时虚岁26推算。'),
  known('wang-yun', 137, 192, 184, h('66'), '生年据卒时虚岁56推算。'),
  unknown('xu-qiu', 184, 208, `${h('48')}、${h('71')}`, '208奉命拜曹操丞相；仅记卒于官，不作208卒年。'),
  known('guo-xun', null, 184, 184, h('08')),
  unknown('jia-cong', 184, 187, `${h('31')}、${h('08')}`, '184交趾在事三年后征议郎、复任冀州；187只作在世参照，不把任期终点当卒年。'),
  unknown('guo-dian', 184, 184, h('71'), '184十一月下曲阳有据，无后续记录不等于当年卒。'),
  known('zhao-qian', null, 192, 184, `${h('27')}、${h('08')}`),
  known('chu-gong', null, 184, 184, h('08')),
  known('qin-jie', null, 186, 184, `${h('08')}、${h('71')}`, '中平三年被赵慈杀，184相遇窗口不是卒年。'),
];

export const PERSON_LIFE_BASELINES: readonly LifeBaseline[] = [...EXISTING_LIFE_BASELINES, ...GENERATION_LIFE_BASELINES];
