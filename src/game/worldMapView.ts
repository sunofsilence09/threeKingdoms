import { WORLD_CITIES, WORLD_ROADS, cityAt, cityNameAt, cityMatches } from './world';
import { PROVINCES, type ProvinceId, type GameDate } from './history';
import type { WorldConflict } from './worldConflictTypes';
import { factionAt } from './worldConflictData';
import { armySummary, showConflictArmy } from './conflictPanel';
import { armyRemainingDays, conflictRoadDays } from './worldConflict';
import './worldMap.css';
import { cityModelMarkup } from './cityModel';

export interface WorldMapOptions {
  currentId: string;
  selectedId?: string;
  path?: string[];
  progress?: { from: string; to: string; fraction: number };
  year: number;
  worldConflict?: WorldConflict;
  date?: GameDate;
  onSelect: (id: string) => void;
}

type Point = readonly [number, number];
const WIDTH = 1000, HEIGHT = 930;
const project = ([lon, lat]: Point): Point => [(lon - 99) * WIDTH / 26, (43 - lat) * HEIGHT / 24];
const points = (coords: readonly Point[]) => coords.map(p => project(p).join(',')).join(' ');
const provinceLabels: [ProvinceId, number, number][] = [
  ['liang', 103.7, 39.8], ['bing', 111.3, 39.5], ['you', 118.2, 41.6],
  ['ji', 116.2, 38.7], ['qing', 120.2, 36.8], ['yan', 115.9, 35.7],
  ['sili', 109.9, 35.2], ['yu', 113.9, 33.7], ['xu', 119.1, 33.3],
  ['yi', 104.5, 30], ['jing', 111.6, 28.1], ['yang', 118.5, 28.8], ['jiao', 108, 22.2],
];
const rivers: { name: string; coords: Point[]; label: Point }[] = [
  { name: '黄河', label: [108.3, 39.9], coords: [[100,35.7],[102,35.8],[103.7,36.1],[104.6,37.1],[106.2,38.5],[106.8,40.6],[108.2,40.8],[110.6,40.6],[111,39.4],[110.5,37.3],[110.5,35.1],[111.6,34.7],[113.4,34.9],[114.5,35.7],[115.2,36.4],[116,37.1],[117,37.7],[118,38.3]] },
  { name: '长江', label: [115,30.7], coords: [[99.7,27.2],[100.5,26.5],[101.4,26.6],[102.1,26.2],[103,27.4],[103.7,28.6],[104.6,28.8],[106.5,29.5],[107.8,29.9],[109.5,31],[110.6,31],[111.3,30.7],[112.2,30.2],[113.5,29.5],[114.3,30.5],[115.2,29.9],[116.1,29.7],[117.1,30.2],[118.2,31.1],[118.8,32],[119.5,32.2],[120.6,31.9],[121.7,31.5]] },
  { name: '淮水', label: [117,33], coords: [[113.3,32.5],[114.6,32.4],[115.6,32.6],[116.7,32.6],[117.5,33],[118.5,33.3],[119.5,33.6],[120.1,33.7]] },
  { name: '渭水', label: [107.5,34.7], coords: [[104.2,34.5],[105.7,34.6],[107,34.3],[108.8,34.3],[110.4,34.6]] },
  { name: '湘水', label: [112,26.4], coords: [[110.9,25.6],[111.6,26.2],[112.2,26.8],[112.9,28.2],[112.9,29.3]] },
  { name: '赣水', label: [115.3,26.7], coords: [[114.9,25.3],[114.9,26.3],[115.5,27.5],[115.9,28.7],[116.1,29.7]] },
];
const mountains: { name: string; coords: Point[]; label: Point }[] = [
  { name: '祁连山', coords: [[99.9,38.1],[101,37.6],[102,37],[103.1,36.5]], label: [100.7,38.6] },
  { name: '秦岭', coords: [[104.9,33.8],[106.2,33.9],[107.4,33.8],[108.6,33.7],[109.5,33.6],[110.2,33.6]], label: [107.3,33.2] },
  { name: '太行山', coords: [[113.4,39.3],[113.8,38.6],[114,37.8],[113.8,36.9],[113.2,36]], label: [112.7,37.8] },
  { name: '大巴山', coords: [[106.4,32.3],[107.5,32],[108.6,31.6],[109.5,31.5]], label: [107.5,31.4] },
  { name: '南岭', coords: [[110,25.1],[111.4,25.2],[112.8,24.9],[114.2,25.2],[115.2,25.4]], label: [111.8,24.7] },
  { name: '武夷山', coords: [[117.9,28.8],[117.4,27.8],[117.1,27],[116.7,26]], label: [118.1,27.7] },
];
const coast: Point[] = [[99,43],[125,43],[125,41.4],[124,40.1],[122.5,39.1],[121.1,38.8],[121.5,39.1],[121.2,40],[120.5,40.3],[119.8,40],[119.1,39.3],[118.2,39.2],[117.7,38.6],[118.1,38.2],[119,37.9],[119.3,37.4],[120.1,37.7],[120.9,37.6],[121.7,37.4],[122.5,37.4],[122.4,36.9],[121.6,36.7],[120.4,36.1],[119.7,35.7],[119.2,34.8],[120.2,33.4],[120.8,32.5],[121.8,31.7],[121.9,30.9],[121.2,30.6],[120.9,30.2],[121.9,29.9],[121.5,29.2],[121.6,28.4],[120.7,27.5],[120.1,26.9],[119.6,26],[119.1,25.4],[118.5,24.8],[117.4,23.9],[116.3,23.3],[115.2,22.8],[114.2,22.5],[113.6,22.7],[113.2,22],[112.1,21.8],[111.2,21.5],[110.4,20.9],[110.3,20.3],[109.9,20.2],[109.7,21.4],[108.5,21.7],[107,21.1],[105.7,19],[99,19]];
let sequence = 0;
let rememberedView: { x: number; y: number; width: number; height: number } | undefined;
let rememberedSearch = '';
let rememberedProvince = '';

/** Original schematic geography. Coordinates locate cities; terrain and routes are illustrative. */
export function createWorldMap(options: WorldMapOptions): { element: HTMLElement; destroy: () => void } {
  const NS = 'http://www.w3.org/2000/svg';
  const uid = `world-map-${++sequence}`;
  const host = document.createElement('section');
  host.className = 'world-map';
  host.setAttribute('aria-label', '州郡行旅地图');
  const head = document.createElement('div');
  head.className = 'world-map-heading';
  head.innerHTML = '<span>山川舆图</span><small>十三州部 · 城邑行旅</small>';
  host.append(head);
  const date = options.date ?? {year:options.year,month:1,day:1};
  const cityName = (id:string) => cityNameAt(id,date);
  const finder=document.createElement('section');finder.className='world-map-finder';finder.setAttribute('aria-label','检索城邑');
  const searchLabel=document.createElement('label');searchLabel.htmlFor=`${uid}-search`;searchLabel.textContent='城名或别名';
  const search=document.createElement('input');search.type='search';search.id=`${uid}-search`;search.placeholder='南京、天水、永安…';search.value=rememberedSearch;search.autocomplete='off';
  const regionLabel=document.createElement('label');regionLabel.htmlFor=`${uid}-province`;regionLabel.textContent='州部';
  const region=document.createElement('select');region.id=`${uid}-province`;
  const all=document.createElement('option');all.value='';all.textContent='全部十三州部';region.append(all);
  for(const province of PROVINCES){const option=document.createElement('option');option.value=province.id;option.textContent=province.id==='jiao'&&options.year>=203?'交州':province.name;region.append(option);}
  region.value=rememberedProvince;
  const count=document.createElement('p');count.className='world-map-result-count';count.setAttribute('role','status');
  const results=document.createElement('div');results.className='world-map-results';results.setAttribute('role','list');results.setAttribute('aria-label','城邑检索结果');
  finder.append(searchLabel,search,regionLabel,region,count,results);host.append(finder);
  const viewport = document.createElement('div');
  viewport.className = 'world-map-viewport';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-label', '拖动平移，滚轮或按钮缩放；按 Tab 选择城邑，回车查看目的地');
  const make = (tag: string, attrs: Record<string, string | number>, parent: Element = svg) => {
    const el = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    parent.append(el);
    return el;
  };
  const label = (text: string, at: Point, className: string, parent: Element = svg) => {
    const [x, y] = project(at);
    const el = make('text', { x, y, class: className }, parent);
    el.textContent = text;
    return el;
  };
  const defs = make('defs', {});
  for (const variant of ['town','capital','port']) {
    const symbol = make('symbol',{id:`${uid}-${variant}`,viewBox:'-24 -30 48 50'},defs);
    symbol.innerHTML = cityModelMarkup(variant==='capital',variant==='port');
  }
  const arrow = make('marker', { id: `${uid}-army-arrow`, markerWidth: 6, markerHeight: 6, refX: 5, refY: 3, orient: 'auto', markerUnits: 'strokeWidth' }, defs);
  make('path', { d: 'M0,0 L6,3 L0,6 Z', fill: '#885635' }, arrow);
  const pattern = make('pattern', { id: `${uid}-paper`, width: 13, height: 13, patternUnits: 'userSpaceOnUse' }, defs);
  make('path', { d: 'M 1 2 h 2 M 8 9 h 1', stroke: '#688370', 'stroke-opacity': .09, 'stroke-width': .7 }, pattern);
  make('rect', { width: WIDTH, height: HEIGHT, class: 'world-map-sea' });
  make('polygon', { points: points(coast), class: 'world-map-land' });
  make('polygon', { points: points([[108.6,20.1],[109.7,20.1],[110.6,19.6],[110.3,19],[108.8,19]]), class: 'world-map-land' });
  make('rect', { width: WIDTH, height: HEIGHT, fill: `url(#${uid}-paper)`, 'pointer-events': 'none' });
  // Soft valley washes and repeated individual peaks give the map its hand-drawn character.
  mountains.forEach(range => {
    make('polyline', { points: points(range.coords), class: 'world-map-range-wash' });
    range.coords.forEach((point, index) => {
      const [x,y] = project(point), size = 12 + (index % 3) * 4;
      make('path', { d: `M${x-size},${y+size*.4} Q${x-size*.3},${y-size*.7} ${x},${y-size} Q${x+size*.3},${y-size*.2} ${x+size},${y+size*.4} M${x},${y-size} l${-size*.12},${size*.9}`, class: 'world-map-peak' });
    });
    label(range.name, range.label, 'world-map-terrain-label');
  });
  rivers.forEach((river, index) => {
    make('polyline', { points: points(river.coords), class: `world-map-river ${index > 1 ? 'is-minor' : ''}` });
    label(river.name, river.label, 'world-map-river-label');
  });
  make('ellipse', { cx: project([112.9,29.1])[0], cy: project([112.9,29.1])[1], rx: 12, ry: 9, class: 'world-map-lake' });
  make('ellipse', { cx: project([116.2,29.2])[0], cy: project([116.2,29.2])[1], rx: 6, ry: 15, class: 'world-map-lake' });
  label('东海', [123,29], 'world-map-sea-label');
  label('渤海', [119.6,38.7], 'world-map-sea-label');
  label('南海', [114,20.5], 'world-map-sea-label');
  provinceLabels.forEach(([id, lon, lat]) => {
    const province = PROVINCES.find(p => p.id === id);
    label(id === 'jiao' ? (options.year < 203 ? '交趾部' : '交州') : id === 'sili' ? '司隶' : (province?.name ?? id), [lon,lat], 'world-map-province');
  });

  const routeCoords = (from: string, to: string): Point[] => {
    const a = cityAt(from), b = cityAt(to);
    if (!a || !b) return [];
    const road = WORLD_ROADS.find(r => (r.from === from && r.to === to) || (r.to === from && r.from === to));
    const via = road?.via ? [...road.via] : [];
    if (road && road.from !== from) via.reverse();
    return [[a.lon,a.lat], ...via, [b.lon,b.lat]];
  };
  WORLD_ROADS.forEach(road => {
    make('polyline', { points: points(routeCoords(road.from, road.to)), class: `world-map-road is-${road.kind}` });
  });
  if (options.path) for (let i = 1; i < options.path.length; i++) {
    make('polyline', { points: points(routeCoords(options.path[i-1], options.path[i])), class: 'world-map-route-halo' });
    make('polyline', { points: points(routeCoords(options.path[i-1], options.path[i])), class: 'world-map-route' });
  }

  let suppressClick = false;
  WORLD_CITIES.forEach(city => {
    const isCurrent = city.id === options.currentId, isSelected = city.id === options.selectedId;
    const isPath = options.path?.includes(city.id);
    const [x,y] = project([city.lon, city.lat]);
    const stock = options.worldConflict?.cities[city.id], faction = stock ? factionAt(stock.factionId) : undefined;
    const ownership = stock && faction ? `，${faction.name}，城内守军${stock.troops}人` : '';
    const g = make('g', { class: `world-map-city ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''} ${isPath ? 'is-path' : ''} ${city.originId ? 'is-origin' : ''}`, transform: `translate(${x} ${y})`, role: 'button', tabindex: 0, 'aria-label': `${cityName(city.id)}，${city.prefecture}${ownership}${isCurrent ? options.progress ? '，出发地' : '，当前位置' : ''}`, 'aria-pressed': String(isSelected), 'data-city-id': city.id, ...(faction ? {'data-faction-id': faction.id} : {}) });
    const title = make('title', {}, g); title.textContent = `${cityName(city.id)} · ${city.prefecture}${ownership}`;
    make('circle', { r: 23, class: 'world-map-city-hit' }, g);
    if (isCurrent) make('ellipse', { cy: 9, rx: 23, ry: 12, class: 'world-map-current-ring' }, g);
    const capital = ['henan','changan','ye','xuxian','shujun','moling','xiangyang'].includes(city.id);
    const port = ['jiangling','jiangxia','wujun','guangling','changsha','nanchang','nanhai','shouchun'].includes(city.id);
    const variant = capital ? 'capital' : port ? 'port' : 'town';
    make('use', { href:`#${uid}-${variant}`, x:-21, y:-27, width:42, height:44, class:'world-map-city-model', 'data-city-model':variant, style:`color:${faction?.color??'#547656'}`, 'pointer-events':'none' },g);
    if (faction && stock) {
      make('path', { d: 'M-17,-36 V-19 M-17,-36 H4 L-1,-30 H-17', fill: faction.color, stroke: '#f9f5df', 'stroke-width': 1.2, class: 'world-map-faction-flag' }, g);
      const mark = make('text', { x: -15, y: -30, class: 'world-map-faction-abbr' }, g); mark.textContent = faction.name.replace(/军府|部众|地方官军/g,'').slice(0,3);
      const troops = make('text', { x: 15, y: 18, class: 'world-map-city-troops' }, g); troops.textContent = `${stock.troops}`;
    }
    const name = make('text', { x: city.id === 'xiapi' ? -22 : 22, y: city.id === 'xiapi' ? 8 : -8, ...(city.id === 'xiapi' ? {'text-anchor':'end'} : {}), class: 'world-map-city-name' }, g); name.textContent = cityName(city.id);
    g.addEventListener('click', () => { if (!suppressClick) options.onSelect(city.id); });
    g.addEventListener('keydown', e => {
      const event = e as KeyboardEvent;
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); options.onSelect(city.id); }
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
        const sign = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
        const candidate = WORLD_CITIES.filter(c => c.id !== city.id && !svg.querySelector<SVGElement>(`[data-city-id="${c.id}"]`)?.classList.contains('is-filtered')).map(c => ({ c, p: project([c.lon,c.lat]) }))
          .filter(({ p }) => (p[horizontal ? 0 : 1] - (horizontal ? x : y)) * sign > 0)
          .sort((a,b) => Math.hypot(a.p[0]-x,a.p[1]-y) - Math.hypot(b.p[0]-x,b.p[1]-y))[0];
        if (candidate) {
          const target = Array.from(svg.querySelectorAll<SVGElement>('[data-city-id]')).find(el => el.dataset.cityId === candidate.c.id);
          target?.focus();
        }
      }
    });
    g.addEventListener('focus', () => {
      // Keep keyboard navigation visible while zoomed in.
      if (x < view.x + 30 || x > view.x + view.width - 70 || y < view.y + 25 || y > view.y + view.height - 25) {
        view.x = x - view.width / 2; view.y = y - view.height / 2; applyView();
      }
    });
  });
  options.worldConflict?.armies.forEach((army, index) => {
    const from = army.path[army.legIndex] ?? army.sourceCityId, to = army.path[army.legIndex + 1];
    const location = army.phase === 'sieging' ? army.targetCityId : from;
    const city = cityAt(location), faction = factionAt(army.factionId);
    let [x,y] = project([city.lon,city.lat]);
    if ((army.phase === 'marching' || army.phase === 'retreating') && to) {
      const route = routeCoords(from,to).map(project), totalDays = conflictRoadDays(from,to) || 1;
      const lengths = route.slice(1).map((point,i) => Math.hypot(point[0]-route[i][0],point[1]-route[i][1]));
      let distance = Math.min(1,Math.max(0,army.legDay/totalDays))*lengths.reduce((sum,length)=>sum+length,0);
      for(let i=0;i<lengths.length;i++) { if(distance<=lengths[i]) {const t=lengths[i]?distance/lengths[i]:0;x=route[i][0]+(route[i+1][0]-route[i][0])*t;y=route[i][1]+(route[i+1][1]-route[i][1])*t;break;} distance-=lengths[i]; }
      make('polyline', { points: points(routeCoords(from,to)), class: 'world-map-army-route', 'marker-end': `url(#${uid}-army-arrow)` });
    }
    // Separate co-located troops so both the city and each army remain clickable.
    const sameLocation = options.worldConflict!.armies.slice(0,index).filter(other => (other.path[other.legIndex] ?? other.sourceCityId) === from).length;
    const g = make('g', { transform:`translate(${x-18-sameLocation*23} ${y+23})`,class:'world-map-army',role:'button',tabindex:0,'data-army-id':army.id,'data-army-phase':army.phase,'data-army-eta':armyRemainingDays(army),'aria-label':`${cityName(army.sourceCityId)}至${cityName(army.targetCityId)}，${armySummary(army)}` });
    const title=make('title',{},g);title.textContent=`${cityName(army.sourceCityId)} → ${cityName(army.targetCityId)} · ${armySummary(army)}`;
    make('circle',{r:13,fill:'#fff9e7',stroke:faction.color,'stroke-width':2},g);
    make('path',{d:'M-5,5 V-7 H6 L2,-2 H-5',fill:faction.color,stroke:faction.color,'stroke-width':1.5},g);
    g.addEventListener('click',()=>{if(!suppressClick)showConflictArmy(army.id);});
    g.addEventListener('keydown',event=>{const key=event as KeyboardEvent;if(key.key==='Enter'||key.key===' '){key.preventDefault();showConflictArmy(army.id);}});
    g.addEventListener('focus',()=>{if(x<view.x+30||x>view.x+view.width-30||y<view.y+30||y>view.y+view.height-30){view.x=x-view.width/2;view.y=y-view.height/2;applyView();}});
  });
  if (options.progress) {
    const p = options.progress, coords = routeCoords(p.from,p.to).map(project);
    const lengths = coords.slice(1).map((pt,i) => Math.hypot(pt[0]-coords[i][0],pt[1]-coords[i][1]));
    let remaining = Math.max(0,Math.min(1,p.fraction)) * lengths.reduce((a,b) => a+b,0);
    let position: Point | undefined = coords[0];
    for (let i=0; i<lengths.length; i++) {
      if (remaining <= lengths[i]) { const t = lengths[i] ? remaining/lengths[i] : 0; position = [coords[i][0]+(coords[i+1][0]-coords[i][0])*t,coords[i][1]+(coords[i+1][1]-coords[i][1])*t]; break; }
      remaining -= lengths[i];
    }
    if (position) {
      const mark = make('g', { transform: `translate(${position[0]} ${position[1]})`, class: 'world-map-traveler', 'aria-label': '当前行旅位置', role: 'img' });
      make('circle', { r: 12 }, mark);
      make('path', { d: 'M0,-8 L6,0 L0,8 L-6,0 Z' }, mark);
    }
  }
  // Small north indicator stays in geographical space and never covers the toolbar.
  const compass = make('g', { transform: 'translate(72 84)', class: 'world-map-compass', 'aria-hidden': 'true' });
  make('path', { d: 'M0,-24 L-7,3 L0,-2 L7,3 Z M0,-2 V19' }, compass);
  const north = make('text', { y: -32, 'text-anchor': 'middle' }, compass); north.textContent = '北';
  viewport.append(svg); host.append(viewport);
  const controls = document.createElement('div'); controls.className = 'world-map-controls'; controls.setAttribute('aria-label','地图视角');
  const button = (text: string, aria: string, action: () => void) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.setAttribute('aria-label',aria); b.title = aria; b.addEventListener('click',action); controls.append(b);
  };
  let view = rememberedView ? { ...rememberedView } : { x: 0, y: 0, width: WIDTH, height: HEIGHT };
  const applyView = () => {
    view.x = Math.max(-WIDTH*.12, Math.min(WIDTH-view.width+WIDTH*.12,view.x));
    view.y = Math.max(-HEIGHT*.12, Math.min(HEIGHT-view.height+HEIGHT*.12,view.y));
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    host.classList.toggle('is-zoomed', view.width < WIDTH*.74);
    rememberedView = { ...view };
  };
  const zoom = (factor: number, at: Point = [view.x+view.width/2,view.y+view.height/2]) => {
    const w = Math.max(WIDTH/3.5,Math.min(WIDTH,view.width*factor)), ratio = w/view.width;
    view = { x: at[0]-(at[0]-view.x)*ratio, y: at[1]-(at[1]-view.y)*ratio, width:w, height:w*HEIGHT/WIDTH }; applyView();
  };
  button('＋','放大地图',()=>zoom(.8)); button('−','缩小地图',()=>zoom(1.25));
  button('全图','复位至完整地图',()=>{view={x:0,y:0,width:WIDTH,height:HEIGHT};applyView();});
  viewport.append(controls);
  const footer = document.createElement('div'); footer.className = 'world-map-footer';
  footer.innerHTML = '<div class="world-map-legend"><span><i class="legend-city"></i>城邑</span><span><i class="legend-current"></i>所在</span><span><i class="legend-road"></i>道路</span><span><i class="legend-water"></i>水路</span><span><i class="legend-mountain"></i>山道</span><span><i class="legend-route"></i>行程</span></div><p>城邑依地理方位定位 · 山川与线路概绘<br>拖动平移，缩放查看城名；Tab 与方向键选城</p>';
  if (options.worldConflict) {
    const note=document.createElement('span');note.textContent='⚑ 势力旗号 / 在外军队';footer.querySelector('.world-map-legend')?.append(note);
    const hint=footer.querySelector('p');if(hint)hint.append(document.createTextNode('；旗旁数字为城内兵力，军旗可查看行期。手机可从“天下局势”查看文字名册。'));
  }
  if (options.progress) {
    const currentLegend = footer.querySelector('.legend-current')?.parentElement;
    if (currentLegend?.lastChild) currentLegend.lastChild.textContent = '出发地';
    const travelerLegend = document.createElement('span'); travelerLegend.textContent = '◇ 途中位置';
    footer.querySelector('.world-map-legend')?.append(travelerLegend);
  }
  host.append(footer);
  const toMapPoint = (clientX:number,clientY:number): Point => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return [view.x+view.width/2,view.y+view.height/2];
    const p = new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse()); return [p.x,p.y];
  };
  const wheel = (e: WheelEvent) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.12 : .89,toMapPoint(e.clientX,e.clientY)); };
  svg.addEventListener('wheel',wheel,{passive:false});
  let drag: { id:number; x:number; y:number; start:Point; moved:boolean } | undefined;
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0 || drag) return;
    suppressClick = false;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:toMapPoint(e.clientX,e.clientY),moved:false};
  });
  svg.addEventListener('pointermove',e=>{
    if (!drag || drag.id !== e.pointerId) return;
    if (Math.hypot(e.clientX-drag.x,e.clientY-drag.y) < 5 && !drag.moved) return;
    if (!drag.moved) { drag.moved=true; svg.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging'); }
    suppressClick=true;
    const now=toMapPoint(e.clientX,e.clientY);
    view.x += drag.start[0]-now[0]; view.y += drag.start[1]-now[1]; applyView();
  });
  const endDrag = (e:PointerEvent) => {
    if (!drag || drag.id!==e.pointerId) return;
    suppressClick=drag.moved;
    if(svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    drag=undefined; viewport.classList.remove('is-dragging');
  };
  svg.addEventListener('pointerup',endDrag); svg.addEventListener('pointercancel',endDrag);
  svg.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = undefined; });
  const updateSearch = () => {
    rememberedSearch=search.value;rememberedProvince=region.value;
    const matches=WORLD_CITIES.filter(city => (!region.value||city.provinceId===region.value)&&cityMatches(city.id,search.value,date));
    const ids=new Set(matches.map(city=>city.id));
    for(const node of svg.querySelectorAll<SVGElement>('[data-city-id]')) {
      const id=node.dataset.cityId!;
      const keep=id===options.currentId||id===options.selectedId||options.path?.includes(id);
      const hidden=!ids.has(id)&&!keep;
      node.classList.toggle('is-filtered',hidden);node.setAttribute('tabindex',hidden?'-1':'0');
      if(hidden)node.setAttribute('aria-hidden','true');else node.removeAttribute('aria-hidden');
    }
    count.textContent=`找到 ${matches.length} / ${WORLD_CITIES.length} 座城邑；当前城与行程始终保留在图上。`;
    results.replaceChildren();
    for(const city of matches) {
      const item=document.createElement('div');item.setAttribute('role','listitem');
      const choice=document.createElement('button');choice.type='button';choice.dataset.cityResult=city.id;
      choice.textContent=`${cityName(city.id)} · ${city.prefecture}${city.id===options.currentId?'（所在）':''}`;
      choice.setAttribute('aria-pressed',String(city.id===options.selectedId));
      choice.addEventListener('click',()=>{
        const [x,y]=project([city.lon,city.lat]);
        const width=Math.min(view.width,WIDTH*.65);view={x:x-width/2,y:y-width*HEIGHT/WIDTH/2,width,height:width*HEIGHT/WIDTH};applyView();
        options.onSelect(city.id);
      });item.append(choice);results.append(item);
    }
  };
  search.addEventListener('input',updateSearch);region.addEventListener('change',updateSearch);
  updateSearch();
  applyView();
  return {element:host,destroy:()=>{ svg.removeEventListener('wheel',wheel); host.remove(); }};
}
