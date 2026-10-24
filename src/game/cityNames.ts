import type { GameDate } from './history';
import { cityAt } from './world';

/** Alias labels locate regional nodes; they do not identify modern administrative boundaries. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  moling:['秣陵','建业','建邺','南京'], chaisang:['柴桑'], echeng:['鄂','鄂县','鄂城','武昌','鄂州'],
  hefei:['合肥'], shu:['舒','舒县','庐江'], nanpi:['南皮','渤海','勃海'], pingyuan:['平原'], xiangping:['襄平','辽东'],
  zhending:['真定','常山'], lu:['潞','上党'], anyi:['安邑','河东'], hongnong:['弘农'], suiyang:['睢阳','梁国'], pei:['沛','小沛','沛县','沛国'],
  jixian:['冀','冀城','汉阳','天水'], linjing:['临泾','安定'], xiabian:['下辨','下辩','下辨道','武都'], shangyong:['上庸'],
  zitong:['梓潼'], fuxian:['涪','涪县','涪城'], yufu:['鱼复','永安','白帝城'], dianchi:['滇池','南中'], linyuan:['临沅','武陵'], yiling:['夷陵','西陵'],
  nanzheng:['汉中','南郑'], shujun:['蜀郡','成都'], nanyang:['南阳','宛'],
};

export function cityNameAt(id: string, date?: GameDate): string {
  const city = cityAt(id), year = date?.year ?? 184;
  if (id === 'moling') return year <= 211 || year >= 280 && year <= 281 ? '秣陵' : year >= 282 ? '建邺' : '建业';
  if (id === 'echeng' && year >= 221) return '武昌';
  // Fish-ford restoration follows Songshu/CHGIS's 280 convention; Huayangguozhi has an earlier variant.
  if (id === 'yufu' && year >= 222 && year <= 279) return '永安';
  // The exact Jin restoration year of Yiling is disputed: retain 夷陵 and expose 西陵 as an alias.
  return city.name;
}

export function cityMatches(id: string, query: string, date?: GameDate): boolean {
  const city = cityAt(id), text = query.trim().toLocaleLowerCase();
  return !text || [id,city.name,cityNameAt(id,date),city.prefecture,...(ALIASES[id] ?? [])].some(label => label.toLocaleLowerCase().includes(text));
}
