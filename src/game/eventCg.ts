import './tradeUi.css';
import { getState, setState } from './runtime';
import { openInspection } from './inspectionOverlay';
import { acknowledgeTravelCg } from './travel';
import { eventPresentation } from './eventContent';

/** Opening a CG never resolves the event or advances the stored random stream. */
export function showEventCg(onContinue: () => void): void {
  const state = getState(), event = state.journey?.event;
  if (!event || event.cgSeen || document.querySelector('.event-cg')) return;
  const serial = state.journey!.serial, id = event.id, kind = event.kind;
  const { title, body, image } = eventPresentation(state);
  const panel = document.createElement('section'); panel.className = 'overlay-panel event-cg';
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label',title);
  panel.dataset.event = kind;
  const img = document.createElement('img'); img.src = image; img.alt = title; img.className = 'event-cg-image';
  const content = document.createElement('div'); content.className = 'event-cg-content';
  const eyebrow = document.createElement('p'); eyebrow.className = 'trade-eyebrow'; eyebrow.textContent = '商旅见闻 · 途中事件';
  const heading = document.createElement('h1'); heading.textContent = title;
  const text = document.createElement('p'); text.textContent = body;
  const note = document.createElement('p'); note.className = 'trade-muted'; note.textContent = '画面为历史题材游戏演绎。继续后选择如何应对。';
  const proceed = document.createElement('button'); proceed.type = 'button'; proceed.className = 'trade-button'; proceed.textContent = '继续 · 处理见闻';
  img.addEventListener('error',()=>{ img.hidden = true; note.textContent = '插画暂未加载，仍可继续处理本次见闻。'; });
  content.append(eyebrow,heading,text,note,proceed); panel.append(img,content);
  const close = openInspection(panel,()=>{
    const current = getState();
    if (current.journey?.serial === serial && current.journey.event?.id === id && current.journey.event.kind === kind) setState(acknowledgeTravelCg(current));
    onContinue();
  });
  proceed.addEventListener('click',close); proceed.focus({preventScroll:true});
}
