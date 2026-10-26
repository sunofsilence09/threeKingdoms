import {getMusicSettings,setMusicSettings} from './musicSettings';
import {springMusic} from './seasonalMusic';
import './musicControls.css';

/** Local listeners belong to the returned element; rebuilding a panel adds no global subscriptions. */
export function createMusicControls():HTMLElement {
 const group=document.createElement('div');group.className='spring-music-controls';group.setAttribute('aria-label','春季背景音乐设置');
 const mute=document.createElement('button');mute.type='button';mute.dataset.musicMute='';
 const label=document.createElement('label');label.textContent='背景音量 ';
 const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.step='5';range.dataset.musicVolume='';range.setAttribute('aria-label','背景音乐音量');
 const output=document.createElement('output');
 const refresh=()=>{const s=getMusicSettings();mute.textContent=s.muted?'音乐：关':'音乐：开';mute.setAttribute('aria-pressed',String(!s.muted));range.value=String(Math.round(s.volume*100));output.value=`${range.value}%`;};
 mute.addEventListener('click',()=>{setMusicSettings({muted:!getMusicSettings().muted});springMusic.retry();refresh();});
 range.addEventListener('input',()=>{setMusicSettings({volume:Number(range.value)/100});springMusic.retry();refresh();});
 const note=document.createElement('small');note.textContent='春季剧情 · 3—5月';note.title='进入战斗或切换到后台时暂停，返回后续播。';
 refresh();label.append(range,output);group.append(mute,label,note);return group;
}
