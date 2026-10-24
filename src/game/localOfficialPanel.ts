import { dateLabel } from './history';
import { openInspection } from './inspectionOverlay';
import { LOCAL_OFFICIALS, localCityOfficeRecords, officialStatus, type LocalOfficial } from './localOfficials';
import { getState } from './runtime';
import { cityAt, cityNameAt } from './world';
import { lifeReferenceText } from './lifeView';

export function showLocalOfficials(): void {
  const root = document.querySelector<HTMLElement>('#overlay-root');
  if (!root || root.querySelector('.local-official-panel')) return;
  const state = getState();
  if (state.journey) return;
  const city = cityAt(state.currentCityId);
  const offices = localCityOfficeRecords(city, state.date);
  let gallery = false;
  let selected: LocalOfficial | undefined = offices.flatMap(o => o.records)[0];
  const panel = document.createElement('section');
  panel.className = 'overlay-panel local-official-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '地方官员');
  panel.innerHTML = `<header class="official-header"><div><p class="panel-eyebrow"></p><h1>地方官员</h1></div><button type="button" class="official-close">关闭</button></header>
    <nav class="official-views" aria-label="官员资料分类"><button type="button" data-view="local">本地官职</button><button type="button" data-view="gallery">八人立绘</button></nav>
    <p class="official-calendar-note">史事月份依史书月序。这里展示任职证据；缺考留空，不外推完整任期。</p>
    <div class="official-layout"><aside class="official-register" aria-label="官职与人物列表"></aside>
    <main class="official-detail"><figure class="official-art"><img alt=""><figcaption>历史题材人物设计 · 非历史真容复原</figcaption></figure>
    <article class="official-info"><p class="official-role"></p><h2></h2><p class="official-status"></p><p class="official-summary"></p><p class="official-date-note"></p><a class="official-source" target="_blank" rel="noopener noreferrer">查阅史料</a><a class="official-background-source" target="_blank" rel="noopener noreferrer" hidden></a><p class="official-art-note">面貌、服色与姿态为游戏美术创作。查看画像不代表此时在任，也不会自动加入阵营。</p></article>
    <div class="official-empty"><h2>本地人选暂留空缺</h2><p>首批八人资料中，还没有本地区此时的确证记录。可以切换“八人立绘”，查看已绘人物的画像和史事依据。</p></div></main></div>`;
  panel.querySelector('.panel-eyebrow')!.textContent = `${dateLabel(state.date)} · ${cityNameAt(city.id,state.date)} · ${city.prefecture}`;
  const close = openInspection(panel);
  const closeButton = panel.querySelector<HTMLButtonElement>('.official-close')!;
  closeButton.addEventListener('click', close);
  for (const button of panel.querySelectorAll<HTMLButtonElement>('.official-views button')) {
    button.addEventListener('click', () => {
      gallery = button.dataset.view === 'gallery';
      selected = gallery ? LOCAL_OFFICIALS[0] : offices.flatMap(o => o.records)[0];
      render();
    });
  }
  function personButton(official: LocalOfficial): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.official = official.id;
    button.setAttribute('aria-pressed', String(selected?.id === official.id));
    const name = document.createElement('strong'); name.textContent = official.name;
    const role = document.createElement('span'); role.textContent = official.role;
    button.append(name, role);
    button.addEventListener('click', () => {
      selected = official;
      render();
      panel.querySelector<HTMLButtonElement>(`[data-official="${official.id}"]`)?.focus({ preventScroll: true });
    });
    return button;
  }
  function render(): void {
    for (const button of panel.querySelectorAll<HTMLButtonElement>('.official-views button'))
      button.setAttribute('aria-pressed', String((button.dataset.view === 'gallery') === gallery));
    const register = panel.querySelector('.official-register')!;
    register.replaceChildren();
    if (gallery) {
      const title = document.createElement('h2'); title.textContent = '首批八人 · 画像与史事'; register.append(title);
      for (const official of LOCAL_OFFICIALS) register.append(personButton(official));
    } else {
      for (const office of offices) {
        const section = document.createElement('section'); section.dataset.officeLevel = office.level;
        const title = document.createElement('h2'); title.textContent = office.title;
        const place = document.createElement('p'); place.textContent = office.place;
        section.append(title, place);
        if (!office.records.length) {
          const empty = document.createElement('p'); empty.className = 'official-vacant'; empty.textContent = '首批资料暂缺 · 保留空缺'; section.append(empty);
        } else {
          const note = document.createElement('p'); note.className = 'official-vacant';
          note.textContent = office.records.some(o => o.record.year === state.date.year) ? '本年可查史事 · 不等同精确现任表' : '往年史事 · 本年任职人选未确证';
          section.append(note);
          for (const official of office.records) section.append(personButton(official));
        }
        register.append(section);
      }
    }
    panel.dataset.official = selected?.id ?? '';
    const art = panel.querySelector<HTMLElement>('.official-art')!;
    const info = panel.querySelector<HTMLElement>('.official-info')!;
    panel.querySelector<HTMLElement>('.official-empty')!.hidden = Boolean(selected);
    art.hidden = info.hidden = !selected;
    if (!selected) return;
    const portrait = art.querySelector('img')!;
    portrait.src = selected.portrait; portrait.alt = `${selected.name}全身立绘`;
    info.querySelector('.official-role')!.textContent = `${selected.place} · 历史身份：${selected.role}`;
    info.querySelector('h2')!.textContent = selected.name;
    const r = selected.record;
    info.querySelector('.official-status')!.textContent = `${r.year} 年${r.month ? ` ${r.month} 月` : ''} · ${officialStatus(selected, state.date)}`;
    let life=info.querySelector<HTMLParagraphElement>('.official-life');if(!life){life=document.createElement('p');life.className='official-life';info.querySelector('.official-status')!.after(life);}life.textContent=lifeReferenceText(state,selected.id);
    info.querySelector('.official-summary')!.textContent = selected.summary;
    info.querySelector('.official-date-note')!.textContent = selected.dateNote;
    const source = info.querySelector<HTMLAnchorElement>('.official-source')!;
    source.href = selected.source.url; source.textContent = `查阅 ${selected.source.title}`;
    const biography = info.querySelector<HTMLAnchorElement>('.official-background-source')!;
    biography.hidden = !selected.biographySource;
    if (selected.biographySource) {
      biography.href = selected.biographySource.url; biography.textContent = `人物史事：${selected.biographySource.title}`;
    } else biography.removeAttribute('href');
  }
  render();
  closeButton.focus({ preventScroll: true });
}
