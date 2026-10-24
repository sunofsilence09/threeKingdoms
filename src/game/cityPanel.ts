import './tradeUi.css';
import { getState, setState } from './runtime';
import { openInspection } from './inspectionOverlay';
import { cityAt } from './world';
import { dateLabel } from './history';
import { GOODS, cargoUsed, marketQuote, tradeGoods, type GoodId } from './economy';
import { gameDayNumber } from './recruitment';
import { marketDayLabel } from './eventContent';
import { showRecruitmentPanel } from './partyPanel';
import { showLocalOfficials } from './localOfficialPanel';

function el<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''):HTMLElementTagNameMap[K] {
  const node=document.createElement(tag);node.textContent=text;node.className=className;return node;
}
function button(text:string,action:()=>void,disabled=false,quiet=false):HTMLButtonElement {
  const node=el('button',text,`trade-button${quiet?' is-quiet':''}`);node.type='button';node.disabled=disabled;node.addEventListener('click',action);return node;
}
export function showCityPanel(onClose?:()=>void):void {
  const entry=getState();
  if(entry.phase!=='overworld'||entry.journey||document.querySelector('.city-panel'))return;
  const panel=el('section','','overlay-panel city-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',`${cityAt(entry.currentCityId).name}城内`);
  const header=el('header','','city-header'),heading=el('div'),title=el('h1'),summary=el('p');heading.append(title,summary);
  const exit=button('出城 · 返回地图',()=>close());header.append(heading,exit);
  const body=el('div','','city-body');panel.append(header,body);
  const close=openInspection(panel,onClose);
  let tab:'market'|'cargo'='market',feedback='';
  function render():void {
    const state=getState(),economy=state.economy,city=cityAt(state.currentCityId),day=gameDayNumber(state.date);
    title.textContent=`${city.name} · 城内`;
    summary.textContent=`${dateLabel(state.date)} · 铜钱 ${economy.coins} · 货舱 ${cargoUsed(economy)}/${economy.capacity}`;
    body.replaceChildren();
    const banner=el('img','','city-banner');banner.src='/assets/events/event-merchant-v1.png';banner.alt='汉末城邑市集与货担';banner.loading='lazy';banner.addEventListener('error',()=>banner.hidden=true);body.append(banner);
    const tools=el('div','','city-tools');tools.append(button('寻访人物',()=>showRecruitmentPanel(render),false,true),button('地方官员',showLocalOfficials,false,true));body.append(tools);
    const nav=el('nav','','trade-tabs');nav.setAttribute('aria-label','城市事务');
    for(const [id,label] of [['market','市集买卖'],['cargo','行囊与账本']] as const){const b=button(label,()=>{tab=id;feedback='';render();},false,true);b.setAttribute('aria-pressed',String(tab===id));nav.append(b);}body.append(nav);
    body.append(el('p',`市集每7日换一批货。买卖不消耗日期；货物每份占1格。累计已实现收益 ${economy.profit>=0?'+':''}${economy.profit} 铜钱。`,'trade-muted'));
    const notice=el('p',feedback,'trade-feedback');notice.setAttribute('role','status');body.append(notice);
    const grid=el('div','','trade-grid');body.append(grid);
    for(const good of GOODS){
      const held=economy.cargo[good.id],quote=marketQuote(economy,city.id,state.date,good.id);
      if(tab==='cargo'&&!held?.quantity)continue;
      const card=el('article','','trade-card');card.dataset.good=good.id;
      const name=el('h3',good.name);if(quote.specialty)name.append(el('span','本地特产','trade-specialty'));card.append(name);
      card.append(el('p',`买价 ${quote.buy} · 售价 ${quote.sell} 铜钱/份`),el('p',`市集库存 ${quote.stock} · 持有 ${held?.quantity??0} 份`));
      if(held?.quantity){const estimate=held.quantity*quote.sell-held.cost;card.append(el('p',`购入均价 ${(held.cost/held.quantity).toFixed(1)} · 本城全售预计 ${estimate>=0?'+':''}${estimate} 铜钱`));}
      const row=el('div','','trade-quantity'),input=el('input','','trade-input');input.type='number';input.min='1';input.step='1';input.max=String(Number.MAX_SAFE_INTEGER);input.value='1';input.inputMode='numeric';input.id=`quantity-${good.id}`;
      const label=el('label','数量');label.htmlFor=input.id;row.append(label,input);
      for(const quantity of [1,5])row.append(button(String(quantity),()=>{input.value=String(quantity);updateTotal();},false,true));
      const maxBuy=Math.max(0,Math.min(quote.stock,economy.capacity-cargoUsed(economy),Math.floor(economy.coins/quote.buy)));
      if(tab==='market')row.append(button(`最多买 ${maxBuy}`,()=>{input.value=String(maxBuy);updateTotal();},maxBuy===0,true));
      if(held?.quantity)row.append(button(`全部卖 ${held.quantity}`,()=>{input.value=String(held.quantity);updateTotal();},false,true));card.append(row);
      const total=el('p','','trade-muted');card.append(total);
      function updateTotal(){const quantity=Number(input.value);total.textContent=Number.isSafeInteger(quantity)&&quantity>0?`买入共 ${quote.buy*quantity} · 卖出共 ${quote.sell*quantity} 铜钱`:'请输入大于0的整数数量。';}
      input.addEventListener('input',updateTotal);updateTotal();
      const actions=el('div','','trade-actions');
      const transact=(side:'buy'|'sell')=>{
        const quantity=Number(input.value),before=getState();
        if(!input.checkValidity()||!Number.isSafeInteger(quantity)||quantity<=0){notice.textContent='请输入大于0的整数数量。';input.focus();return;}
        const next=tradeGoods(before,good.id as GoodId,quantity,side);
        if(next===before){notice.textContent='无法成交，请检查铜钱、货舱余量、市集库存和持货数量。';return;}
        setState(next);feedback=`${side==='buy'?'购入':'售出'}${good.name} ${quantity}份，${side==='buy'?'支出':'收入'} ${Math.abs(next.economy.coins-before.economy.coins)} 铜钱。`;render();
        panel.querySelector<HTMLInputElement>(`#quantity-${good.id}`)?.focus({preventScroll:true});
      };
      if(tab==='market')actions.append(button('买入',()=>transact('buy'),maxBuy<1));
      actions.append(button('卖出',()=>transact('sell'),!held?.quantity,true));card.append(actions);grid.append(card);
    }
    if(!grid.children.length)grid.append(el('p','货舱空空。在市集购入货物，再带往其他城邑出售。','trade-muted'));
    if(tab==='cargo'){
      body.append(el('h2','最近交易'));
      const list=el('ol','','trade-ledger');
      for(const record of economy.ledger.slice().reverse())list.append(el('li',`${dateLabel(record.date)} · ${cityAt(record.cityId).name} · ${record.side==='buy'?'购入':'售出'}${GOODS.find(g=>g.id===record.goodId)!.name}${record.quantity}份 · ${record.amount}铜钱${record.side==='sell'?` · 盈亏 ${record.profit>=0?'+':''}${record.profit}`:''}`));
      if(!economy.ledger.length)list.append(el('li','尚无交易记录。'));body.append(list);
    }
    body.append(el('h2','市价消息'));
    if(!economy.news.length)body.append(el('p','还没有听到行情。路上的商旅可能带来消息。','trade-muted'));
    for(const news of economy.news.slice().sort((a,b)=>b.fromDay-a.fromDay)){
      const active=day>=news.fromDay&&day<news.untilDay;
      body.append(el('p',`${cityAt(news.cityId).name} · ${GOODS.find(g=>g.id===news.goodId)!.name} ${news.change>0?'涨':'跌'}${Math.round(Math.abs(news.change)*100)}% · ${active?'生效中':'已过期'} · 截至${marketDayLabel(news.untilDay-1)}。${news.reason}`,`trade-news${active?'':' is-expired'}`));
    }
  }
  render();exit.focus({preventScroll:true});
}
