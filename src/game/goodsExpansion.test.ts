import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { applyMarketNews, createEconomy, GOODS, marketQuote, tradeGoods } from './economy';
import { WORLD_CITIES } from './world';

beforeEach(()=>{
  const data=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
});
describe('ten commodity expansion',()=>{
  it('offers wine and leather in every city, with regional specialties and actual trading',()=>{
    expect(GOODS.map(g=>g.name)).toEqual(['粟米','粗布','盐','铁器','陶器','茶叶','药材','丝绸','米酒','皮革']);
    const state={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'changsha'};
    for(const city of WORLD_CITIES)for(const good of ['wine','leather'] as const){
      const quote=marketQuote(state.economy,city.id,state.date,good);
      expect(Number.isSafeInteger(quote.buy)&&quote.buy>quote.sell&&quote.stock>0).toBe(true);
    }
    expect(marketQuote(state.economy,'changsha',state.date,'wine').specialty).toBe(true);
    expect(marketQuote(state.economy,'wuwei',state.date,'leather').specialty).toBe(true);
    for(const good of ['wine','leather'] as const){
      const bought=tradeGoods(state,good,2,'buy');
      expect(bought.economy.cargo[good]?.quantity).toBe(2);
      const sold=tradeGoods(bought,good,2,'sell');
      expect(sold.economy.cargo[good]).toBeUndefined();
      expect(sold.economy.ledger).toHaveLength(2);
      const changed=applyMarketNews(state.economy,{id:`new:${good}`,cityId:state.currentCityId,goodId:good,change:.2,fromDay:60,untilDay:90,reason:'本地收购增加'});
      expect(marketQuote(changed,state.currentCityId,state.date,good).buy).toBeGreaterThan(marketQuote(state.economy,state.currentCityId,state.date,good).buy);
    }
  });
  it('migrates an eight-good market without refilling old stock or resetting coins/costs/records',()=>{
    const base={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'beihai'};
    const state=tradeGoods(base,'salt',5,'buy');
    for(const market of Object.values(state.economy.markets)){
      const stock=market.stock as Record<string,number>;delete stock.wine;delete stock.leather;
    }
    const original=JSON.parse(JSON.stringify(state));
    saveState(state);
    const loaded=loadState()!;
    expect(loaded).not.toBeNull();
    expect(loaded.economy.coins).toBe(original.economy.coins);
    expect(loaded.economy.cargo).toEqual(original.economy.cargo);
    expect(loaded.economy.ledger).toEqual(original.economy.ledger);
    expect(loaded.economy.markets.beihai.stock.salt).toBe(original.economy.markets.beihai.stock.salt);
    expect(loaded.economy.markets.beihai.period).toBe(original.economy.markets.beihai.period);
    for(const market of Object.values(loaded.economy.markets)){
      expect(market.stock.wine).toBeGreaterThan(0);expect(market.stock.leather).toBeGreaterThan(0);
      expect(Object.keys(market.stock)).toHaveLength(10);
    }
    saveState(loaded);expect(loadState()).toEqual(loaded);
  });
  it('still rejects corrupted new and incomplete legacy market stock',()=>{
    for(const remove of [['grain'],['wine','leather','salt']]){
      const state=createInitialState(()=>0),raw=JSON.parse(JSON.stringify(state));
      for(const key of remove)delete raw.economy.markets.beihai.stock[key];
      localStorage.setItem(STORAGE_KEY,JSON.stringify(raw));expect(loadState()).toBeNull();
    }
    expect(createEconomy().capacity).toBe(40);
  });
});
