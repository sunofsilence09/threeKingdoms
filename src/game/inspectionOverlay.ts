/** Shared lifecycle for temporary, nestable character inspection dialogs. */
interface Inspection { panel: HTMLElement; dispose: () => void }
const inspections: Inspection[] = [];

export function isInspecting(): boolean { return inspections.length > 0; }

/** Discard dialogs without restoring screens from an obsolete scene. */
export function clearInspections(): void {
  while (inspections.length) inspections.pop()!.dispose();
}

export function openInspection(panel: HTMLElement, onClose?: () => void): () => void {
  const root = document.querySelector<HTMLElement>('#overlay-root')!;
  const previous = [...root.childNodes];
  const focus = document.activeElement as HTMLElement | null;
  const scroll = root.scrollTop;
  const targets = [...document.querySelectorAll<HTMLElement>('#hud-root, #game-container')];
  const inert = targets.map(target => target.inert);
  targets.forEach(target => { target.inert = true; });
  const inspection: Inspection = { panel, dispose: () => {
    document.removeEventListener('keydown', keydown);
    targets.forEach((target, index) => { target.inert = inert[index]; });
  } };
  const close = () => {
    if (inspections.at(-1) !== inspection) return;
    inspections.pop();
    inspection.dispose();
    root.replaceChildren(...previous);
    root.scrollTop = scroll;
    onClose?.();
    if (focus?.isConnected) focus.focus({ preventScroll: true });
  };
  const keydown = (event: KeyboardEvent) => {
    if (inspections.at(-1) !== inspection) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    } else if (event.key === 'Tab') {
      const controls = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
    }
  };
  inspections.push(inspection);
  document.addEventListener('keydown', keydown);
  root.replaceChildren(panel);
  return close;
}
