import type { LifeBaseline } from './lifeTypes';

/** Evidence and uncertainty audit: docs/research/2026-10-25-v11-people.md. */
const s = (v: string) => `《三国志》卷${v}（研究记录S${v}）`;
function life(id: string, birth: number | null, death: number | null, anchor: number, lastAlive: number, source: string, note: string, estimate?: number): LifeBaseline {
  const birthYear = birth ?? anchor - 25;
  return { id, birthYear, historicalBirthYear: birth, historicalDeathYear: death,
    birthEstimated: birth === null, deathEstimated: death === null,
    deathBaseYear: death ?? estimate ?? Math.max(birthYear + 70, lastAlive + 6), source,
    basis: `${birth === null ? `生年未详；固定游戏估年取成年活动锚点${anchor}减25` : '生年据卒年与虚岁推算，非精确生日'}；${death === null ? `卒年未确证；${estimate ? `基准${estimate}是区间内游戏估年` : `寿限为游戏估年 max(估生年+70，最后明确存活年${lastAlive}+6)`}` : `史卒年采用${death}`}。${note}` };
}
export const V11_LIFE_BASELINES: readonly LifeBaseline[] = [
  life('dian-wei',null,197,194,194,s('18'),'宛城张绣反叛时战死；不采无据的160生年。'),
  life('xu-chu',null,null,196,226,s('18'),'明帝即位进封后仅记褚薨；不能把230当确切卒年。'),
  life('zhang-he',null,231,189,228,s('17'),'木门战死；189只作韩馥军成年活动的游戏锚点。'),
  life('xu-huang',null,227,195,226,s('17'),'太和元年薨；早年杨奉部下经历未详系年。'),
  life('yue-jin',null,218,190,215,s('17'),'建安二十三年薨；190为从曹的游戏活动锚点。'),
  life('yu-jin',null,221,189,221,s('17'),'黄初二年归魏后病卒；不将219被俘当卒年。'),
  life('guo-jia',170,207,196,207,s('14'),'柳城归途卒、年三十八；170为虚岁反推采用值。'),
  life('jia-xu',147,223,189,223,s('10')+'；《三国志》卷02','黄初四年卒、年七十七，147为反推采用值。'),
  life('cheng-yu',141,220,184,220,s('14')+'；《三国志》卷02','文帝即位年卒；裴注魏书年八十。'),
  life('chen-qun',null,237,194,236,s('22'),'青龙四年十二月卒，按通行公历237采用；生年不采用未经确证的168。'),
  life('ma-chao',176,222,196,222,s('36'),'章武二年卒、年四十七；176由虚岁推算。'),
  life('huang-zhong',null,220,208,219,s('36'),'建安二十四年封后次年卒；不采用无据的148生年。'),
  life('wei-yan',null,234,211,234,s('40'),'建兴十二年死于蜀军内部冲突；不采无据的生年。'),
  life('pang-tong',179,214,209,214,s('37')+'；《三国志》卷32','围雒中流矢、年三十六；179据虚岁推算。'),
  life('fa-zheng',176,220,196,220,s('37'),'汉中王次年卒、年四十五；176据虚岁推算。'),
  life('lu-su',172,217,200,217,s('54'),'建安二十二年卒、年四十六；172据虚岁推算。'),
  life('lv-meng',178,219,196,219,s('54'),'取荆州后卒、年四十二；岁末公历220口径另有异说。'),
  life('gan-ning',null,null,194,215,s('55'),'本传仅记卒；潘璋传叙事给夷陵前已卒的上限，不能把215或220硬定为史卒年。',220),
  life('taishi-ci',166,206,189,206,s('49'),'建安十一年卒、年四十一，166据虚岁推算；不采合肥战死故事。'),
  life('huang-gai',null,null,190,208,s('55'),'赤壁之后领武陵、平益阳，随后病卒于官；无确切卒年，210不作史实。'),
  life('kong-rong',153,208,189,208,'《后汉书》卷70；《三国志》卷01','208被诛、年五十六，153据虚岁推算。'),
  life('tao-qian',132,194,188,194,s('08'),'兴平元年病死；裴注吴书年六十三。'),
  life('wang-lang',null,228,193,228,s('13'),'太和二年薨；通行152生年未获本传依据，保留未知。'),
  life('shi-xie',137,226,187,226,s('49'),'黄武五年、年九十；137据虚岁推算。交趾太守不等同苍梧太守。'),
  life('liu-yao',null,null,193,195,s('49'),'本传记年四十二但病卒段无明确年份；通行197作为游戏基准，156亦不冒作确证生年。',197),
  life('huang-zu',null,208,191,208,'《三国志》卷47、卷55','建安十三年孙权破江夏时被杀；无确证生年。'),
  life('gongsun-du',null,204,189,204,s('08'),'建安九年度死；不采用无据150生年。'),
  life('han-fu',null,null,189,191,'《三国志》卷06及裴注；《后汉书》卷74上','让冀州后逃张邈处自杀，未确证公历年份；191只作游戏基准。',191),
  life('zhang-yang',null,198,188,198,s('08')+'；《三国志》卷01','建安三年救吕布时被杨丑杀；河内未设城点。'),
  life('hua-xin',157,231,189,231,s('13'),'太和五年薨，裴注魏书年七十五。'),
  life('zhao-yu',null,null,193,193,s('13')+'、卷49','曹操攻陶谦后被笮融杀，193—194有编年差异；采用194游戏基准，非确切史卒年。',194),
  life('liu-chong',null,null,173,190,'《后汉书》卷50','陈愍王，勿混同刘繇伯父一钱太守刘宠；被袁术遣客所杀未在本段系年，采用197游戏基准。',197),
];
