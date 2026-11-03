export type WorldSection = 'travel' | 'city' | 'army' | 'party' | 'more';

export interface WorldWorkspaceOptions {
  section: WorldSection;
  mapExpanded: boolean;
  onSection: (section: WorldSection) => void;
  onMap: () => void;
  onPeople: () => void;
  onHistory: () => void;
  onConflict: () => void;
  onParty: () => void;
  peopleDisabled?: boolean;
  conflictDisabled?: boolean;
}

/** Persistent destinations surround one active command sheet, rather than a long sidebar. */
export function createWorldWorkspace(parent: HTMLElement, options: WorldWorkspaceOptions) {
  const layout = document.createElement('div'); layout.className = 'world-layout';
  layout.classList.toggle('is-map-expanded', options.mapExpanded);
  const nav = document.createElement('nav'); nav.className = 'world-navigation';
  nav.setAttribute('aria-label', '常用事务');
  for (const [id, title, sign] of [
    ['travel', '行旅', '行'], ['city', '城池', '城'], ['army', '军务', '军'],
    ['party', '队伍', '人'], ['more', '更多', '册'],
  ] as const) {
    const button = document.createElement('button'); button.type = 'button';
    button.id = `world-nav-${id}`; button.dataset.worldSection = id;
    button.setAttribute('aria-pressed', String(options.section === id));
    const mark = document.createElement('span'); mark.className = 'world-nav-sign';
    mark.textContent = sign; mark.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.textContent = title;
    button.append(mark, label);
    button.addEventListener('click', () => { options.onSection(id); if (id === 'party') options.onParty(); });
    nav.append(button);
  }
  const shortcuts = document.createElement('div'); shortcuts.className = 'world-nav-shortcuts';
  for (const [title, action] of [
    ['寻访人物', options.onPeople], ['历史大事', options.onHistory], ['天下局势', options.onConflict],
  ] as const) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = title; button.disabled = title === '寻访人物' ? !!options.peopleDisabled : title === '天下局势' ? !!options.conflictDisabled : false;
    if (button.disabled) button.title = title === '寻访人物' ? '抵达城池后可寻访人物。' : '请先恢复天下局势。';
    button.addEventListener('click', action); shortcuts.append(button);
  }
  nav.append(shortcuts);
  const mapColumn = document.createElement('div'); mapColumn.className = 'world-map-column';
  const commands = document.createElement('aside'); commands.className = 'world-sidebar'; commands.setAttribute('aria-label', '当前事务');
  const mapToggle = document.createElement('button'); mapToggle.type = 'button'; mapToggle.className = 'world-map-toggle'; mapToggle.id = 'world-map-toggle';
  mapToggle.textContent = options.mapExpanded ? '收起舆图 · 返回事务' : '展开舆图 · 选城改道';
  mapToggle.setAttribute('aria-expanded', String(options.mapExpanded)); mapToggle.setAttribute('aria-controls', 'world-map-region');
  mapToggle.addEventListener('click', options.onMap); mapColumn.id = 'world-map-region';
  layout.append(nav, mapToggle, mapColumn, commands); parent.append(layout);
  return { layout, nav, mapColumn, commands };
}
