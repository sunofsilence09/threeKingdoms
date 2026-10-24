import type { GameState } from './state';
import { journeyLeg } from './travel';
import { cityNameAt } from './world';
import { GOODS } from './economy';
import { routePrincipalName } from './politicalPresentation';

export function marketDayLabel(day: number): string {
  return `${184 + Math.floor(day / 360)}年${Math.floor(day % 360 / 30) + 1}月${day % 30 + 1}日`;
}
export function eventPresentation(state: GameState): { title: string; body: string; image: string } {
  const event = state.journey!.event!, leg = journeyLeg(state.journey!);
  const content: Record<string, [string,string,string]> = {
    rain: ['雨阻道路', leg.kind === 'mountain' ? '山雨冲刷石径，落石挡住去路。你们在山口停下，商量如何通行。' : '连日雨水让道路泥泞，行人聚在路边避雨。', 'rain'],
    merchant: ['路遇商旅', '驮着货物的商队在道旁歇脚，摊开远方的见闻，也需要人手整理货担。', 'merchant'],
    refugees: ['流民求助', '同样离乡的人围着一小堆行囊，粮食快吃完了。你们停下脚步。', 'refugees'],
    ferry: ['渡口停航', '江风卷起浪头，船夫暂时收起了船篙。渡口的人等待风浪平息。', 'ferry'],
    bandits: [leg.kind === 'water' ? '水盗拦路' : '匪徒拦路', '前方有人拦住了商旅的去路。迎战或另寻道路，由你决定。', 'bandits'],
    contact: ['人物见闻', event.contact?`沿途传来${routePrincipalName(event.contact,state)}一方的消息。可先打听当前行踪，再决定是否拜访，记下一段交情。`:'沿途传来一支队伍的消息。也许能由此结识一方人物，记下一段交情。', 'contact'],
    wolves: ['山狼袭击', '狼群从林缘逼近，低伏着身子盯住行囊。同行的人已经握紧兵器。', 'wolves'],
    'market-news': ['市价风声', '商旅带来一条新行情。', 'merchant'],
  };
  const [title, description, asset] = content[event.kind];
  const news = event.news;
  const body = news ? `${cityNameAt(news.cityId,state.date)}的${GOODS.find(g => g.id === news.goodId)!.name}${news.change > 0 ? '涨价' : '降价'}${Math.abs(news.change * 100)}%。${news.reason} 有效至${marketDayLabel(news.untilDay-1)}，抵达时以当日市价为准。` : description;
  return { title, body, image: `/assets/events/event-${asset}-v1.png` };
}
