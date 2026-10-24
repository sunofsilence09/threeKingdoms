import './nameEntry.css';
import { validHeroName } from './heroName';
import { getState, setState } from './runtime';
import { showPanel } from './ui';

/** Return true while the required entry owns the overlay; preserve the caller's scene data. */
export function requireHeroName(onConfirm: () => void): boolean {
  if (validHeroName(getState().heroName)) return false;
  const panel = showPanel({ eyebrow: '乱世行旅 · 留下你的姓名', title: '你叫什么名字？',
    body: '请输入2—8个汉字、字母或数字，可使用间隔点。确认后继续原来的旅程。', className: 'name-entry' });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '输入主角姓名');
  const form = document.createElement('form');
  const label = document.createElement('label'); label.htmlFor = 'hero-name'; label.textContent = '主角姓名';
  const input = document.createElement('input'); input.id = 'hero-name'; input.name = 'heroName'; input.type = 'text';
  input.inputMode = 'text'; input.autocomplete = 'off'; input.enterKeyHint = 'done'; input.required = true;
  input.setAttribute('aria-describedby', 'hero-name-error'); input.value = '';
  const error = document.createElement('p'); error.id = 'hero-name-error'; error.setAttribute('aria-live', 'polite');
  const button = document.createElement('button'); button.type = 'submit'; button.className = 'panel-button'; button.textContent = '确认姓名 · 继续旅程';
  let confirmed = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (confirmed) return;
    const name = validHeroName(input.value);
    if (!name) { error.textContent = '请输入2—8个有效字符，不能使用空格、控制符或HTML。'; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
    confirmed = true;
    const current = getState();
    const activeBattle = current.activeBattle ? { ...current.activeBattle, units: current.activeBattle.units.map(unit => unit.id === 'traveler' ? { ...unit, name } : unit) } : undefined;
    setState({ ...current, heroName: name, ...(activeBattle ? { activeBattle } : {}) });
    panel.remove(); onConfirm();
  });
  form.append(label, input, error, button); panel.append(form); input.focus({ preventScroll: true });
  return true;
}
