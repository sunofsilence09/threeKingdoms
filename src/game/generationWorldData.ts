import type { GameDate } from './history';

/** Dated institutional scene parameters for newly introduced nodes only.
 * These conservative snapshots use the regions in the sourced city/person notes.
 * They are not a reconstruction of every county's conquest date. Existing cities
 * and all cities in a running campaign never consult this table again.
 * cao is the stable Wei/Jin military institution, liu the Shu institution.
 */
const scenes: Record<string, readonly [fromYear: number, factionId: string][]> = {
  moling: [[212,'sun']], chaisang: [[208,'sun']], echeng: [[221,'sun']],
  hefei: [[209,'cao']], shu: [[228,'sun']],
  nanpi: [[191,'yuan-shao'],[205,'cao']], xiangping: [[239,'cao']],
  pingyuan: [[220,'cao']], zhending: [[220,'cao']], lu: [[220,'cao']],
  anyi: [[220,'cao']], hongnong: [[220,'cao']], suiyang: [[220,'cao']], pei: [[220,'cao']],
  jixian: [[228,'cao']], linjing: [[228,'cao']], shangyong: [[220,'cao']],
  xiabian: [[219,'liu'],[264,'cao']], zitong: [[214,'liu'],[264,'cao']],
  fuxian: [[214,'liu'],[264,'cao']], yufu: [[222,'liu'],[264,'cao']],
  dianchi: [[225,'liu'],[264,'cao']], linyuan: [[219,'sun']], yiling: [[222,'sun']],
};

export function expansionFactionAt(cityId: string, date: GameDate): string {
  return scenes[cityId]?.filter(([from])=>date.year>=from).at(-1)?.[1] ?? 'han';
}
