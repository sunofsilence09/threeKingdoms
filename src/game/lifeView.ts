import type { GameState } from './state';
import { lifeBaseline, lifeLabel, lifeStatus } from './personLife';
import './lifeView.css';

export function lifeAccessNote(state: GameState, id: string): string {
  const status=lifeStatus(state,id.replace(/^enemy:/,''));
  return status==='unborn' ? '尚未出生；此时仅供人物志查看。'
    : status==='child' ? '未满16岁；保留资料与政治身份，成年后才可交往、邀请、传授或出战。'
    : status==='dead' ? '已经离世；仅供追忆与查阅，不能交往、邀请、传授、切磋或出战。' : '';
}

/** Historical references and fixed estimates are distinct from this campaign's hidden future lifespan. */
export function lifeReferenceText(state: GameState, id: string): string {
  id=id.replace(/^enemy:/,'');
  const baseline=lifeBaseline(id);
  if(!baseline)return lifeLabel(state,id);
  const birth=baseline.historicalBirthYear===null ? `固定游戏估生年${baseline.birthYear}` : `史料生年采用${baseline.birthYear}${baseline.birthEstimated?'（约年或推算，详见依据）':''}`;
  const death=baseline.historicalDeathYear===null ? '史卒年未详；寿限采用游戏估年' : `史料卒年参考${baseline.historicalDeathYear}`;
  return `${birth}；${death}。${lifeLabel(state,id)}`;
}

export function acknowledgeLifeNotices(state: GameState): GameState {
  return state.life?.notices.length ? {...state,life:{...state.life,notices:[]}} : state;
}
