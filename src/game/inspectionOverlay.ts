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
  const focusCard = focus?.closest<HTMLElement>('[data-member], [data-person]');
  const focusKey = focusCard?.dataset.member ? ['data-member', focusCard.dataset.member] : focusCard?.dataset.person ? ['data-person', focusCard.dataset.person] : undefined;
  const focusLabel = focus?.textContent?.trim(), focusAria = focus?.getAttribute('aria-label');
  const scroll = root.scrollTop;
  const targets = [...document.querySelectorAll<HTMLElement>('#hud-root, #game-container, #world-root')];
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
    else if (!document.activeElement || document.activeElement === document.body) {
      // A parent dialog may rebuild its controls in onClose. Recover the same
      // member/action rather than trying to focus a detached pre-render button.
      const scope = focusKey ? root.querySelector(`[${focusKey[0]}="${CSS.escape(focusKey[1])}"]`) ?? root : root;
      const controls = [...scope.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href]')];
      const replacement = controls.find(node => focus?.id && node.id === focus.id) ??
        controls.find(node => focusAria && node.getAttribute('aria-label') === focusAria) ??
        controls.find(node => node.tagName === focus?.tagName && node.textContent?.trim() === focusLabel) ??
        root.querySelector<HTMLElement>('.company-header button, button:not(:disabled)');
      replacement?.focus({ preventScroll: true });
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (inspections.at(-1) !== inspection) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    } else if (event.key === 'Tab') {
      const controls = [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), a[href]')].filter(control => control.getClientRects().length > 0);
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
