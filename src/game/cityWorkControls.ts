import type { GameState } from './state';
import { cityWorkQuote, maxCityWorkBlocks } from './travel';
import './cityWorkControls.css';

/** Builds the work preview without advancing either the RPG or world clock. */
export function createCityWorkControls(state: GameState, onWork: (blocks: number) => void): HTMLFormElement {
  const max = maxCityWorkBlocks(state);
  const form = document.createElement('form'); form.className = 'city-work';
  form.setAttribute('aria-label', '城中帮工'); form.noValidate = true;
  const label = document.createElement('label'); label.htmlFor = 'city-work-blocks';
  label.className = 'world-destination-label'; label.textContent = '帮工时长（每段5日）';
  const row = document.createElement('div'); row.className = 'city-work-stepper';
  const input = document.createElement('input'); input.id = 'city-work-blocks'; input.type = 'number';
  input.className = 'world-destination-select'; input.min = '1'; input.max = String(Math.max(1, max));
  input.step = '1'; input.value = '1'; input.inputMode = 'numeric'; input.required = true; input.disabled = max === 0;
  input.setAttribute('aria-describedby', 'city-work-help city-work-preview');
  const stepper = (name: string, text: string, delta: number) => {
    const button = document.createElement('button'); button.type = 'button';
    button.className = 'world-button is-quiet'; button.setAttribute('aria-label', name); button.textContent = text;
    button.addEventListener('click', () => {
      const current = readBlocks() ?? 1;
      input.value = String(Math.max(1, Math.min(max, current + delta))); refresh();
    });
    return button;
  };
  const minus = stepper('减少5日帮工', '−', -1), plus = stepper('增加5日帮工', '+', 1);
  const help = document.createElement('p'); help.id = 'city-work-help'; help.className = 'world-muted';
  help.textContent = max ? `选择1～${max}段，每段5日；每日军需+1、铜钱+20。` : state.journey ? '抵达城池后才可帮工。' : '剩余历法不足5日，无法安排帮工。';
  const preview = document.createElement('p'); preview.id = 'city-work-preview'; preview.setAttribute('role', 'status'); preview.setAttribute('aria-live', 'polite');
  const submit = document.createElement('button'); submit.type = 'submit'; submit.id = 'city-work-submit';
  submit.className = 'world-button'; submit.textContent = '开始帮工';
  const readBlocks = () => /^[1-9]\d*$/.test(input.value) && Number.isSafeInteger(Number(input.value)) ? Number(input.value) : undefined;
  const refresh = () => {
    const blocks = readBlocks(), quote = blocks === undefined ? undefined : cityWorkQuote(state, blocks);
    preview.textContent = quote ? `共${quote.days}日 · 军需+${quote.supplies} / 铜钱+${quote.coins}`
      : max ? `请输入1～${max}的整数段数（每段5日）。` : help.textContent;
    submit.disabled = !quote;
    input.setAttribute('aria-invalid', String(max > 0 && !quote));
    minus.disabled = max === 0 || blocks === 1; plus.disabled = max === 0 || blocks === max;
  };
  input.addEventListener('input', refresh);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const blocks = readBlocks();
    if (blocks !== undefined && cityWorkQuote(state, blocks)) onWork(blocks);
  });
  row.append(minus, input, plus); form.append(label, row, help, preview, submit); refresh();
  return form;
}
