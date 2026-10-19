import type { RouteId } from './state';

export interface RouteDefinition {
  id: RouteId;
  symbol: string;
  title: string;
  tone: string;
  offer: string;
  advantage: string;
  objective: string;
  ending: string;
  color: number;
  colorHex: string;
}

export interface MapNodeDefinition {
  id: 'ambush' | 'recovery' | 'hub';
  x: number;
  y: number;
  title: string;
  subtitle: string;
}

export const PROLOGUE_LINES = [
  { speaker: '旁白', text: '第三日，风从北面吹来，带着灰烬和一场还没结束的战乱。' },
  { speaker: '阿满', text: '再往前就是临水镇。只要进了镇，我们就能找到粮食。' },
  { speaker: '旅人', text: '那就走。先把活着这件事，交给今天。' },
];

export const ROUTES: Record<RouteId, RouteDefinition> = {
  cao: {
    id: 'cao',
    symbol: '曹',
    title: '曹方 · 以令止乱',
    tone: '秩序、效率与服从',
    offer: '军屯有粮，但每个人都要听令。',
    advantage: '多一份补给，强攻更有力。',
    objective: '护送粮车穿过关卡，优先保证队伍效率。',
    ending: '你们换来了粮食，也第一次听见了军令落下的声音。',
    color: 0xc78d4d,
    colorHex: '#c78d4d',
  },
  sun: {
    id: 'sun',
    symbol: '孙',
    title: '孙方 · 借水而行',
    tone: '地方、人情与机动',
    offer: '沿江的人愿意帮忙，但水路从不保证平静。',
    advantage: '队伍士气更稳，移动更灵活。',
    objective: '沿着河岸寻找渡口，在敌人合围前离开。',
    ending: '你们没有得到一纸命令，却得到了一条愿意为你们亮灯的河。',
    color: 0x6b9c9a,
    colorHex: '#6b9c9a',
  },
  liu: {
    id: 'liu',
    symbol: '刘',
    title: '刘方 · 护民而行',
    tone: '仁义、承诺与保护弱者',
    offer: '先安置流民，再谈下一步。只是粮食会更紧。',
    advantage: '队伍更有韧性，守势更可靠。',
    objective: '把被截下的流民带到安全处，再决定去向。',
    ending: '你们带走的不是一面旗，而是一群愿意跟着你们继续走的人。',
    color: 0xa55b5a,
    colorHex: '#a55b5a',
  },
};

export const MAP_NODES: MapNodeDefinition[] = [
  { id: 'ambush', x: 210, y: 315, title: '旧驿道', subtitle: '风里有马蹄声' },
  { id: 'recovery', x: 480, y: 215, title: '枯井村', subtitle: '还有人留守' },
  { id: 'hub', x: 770, y: 320, title: '临水镇', subtitle: '三面旗帜' },
];
