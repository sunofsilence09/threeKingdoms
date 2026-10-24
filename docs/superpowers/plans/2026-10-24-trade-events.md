# 商旅见闻0.4 Implementation Plan

> For agentic workers: execute independent tasks with dispatching-parallel-agents, integrate and review in the current session. Follow TDD for rules and persistence. User approved the complete spec; do not ask for approval again.

**Goal:** Deliver the approved0.4.0 custom travel, CG, city trading, market news, wolves and four character assets, with old-save migration.

**Architecture:** Pure economy/travel rules operate on GameState; DOM panels consume these rules, Phaser retains battle. Event CG confirmation is saved before exposing choices. Art assets are local and lazy loaded.

**Tech Stack:** TypeScript, Phaser3, native DOM/CSS, Vitest, Python Playwright, built-in image_gen.

## Global constraints
- Spec: docs/superpowers/specs/2026-10-24-trade-events-design.md, fully authorized2026-10-24.
- 1..30 travel days, default3; probability .20 per eligible day. Encounter stops advancement; no implicit continuation.
- Initial600coins, capacity40,8goods,34cities;7-day deterministic markets;90% resale,30-day news; no mock-only UI.
- 7event CGs and4transparent portraits;33person identities, fixed hero plus2initial and30new invitations.
- Preserve prior saves, rewards, original party and faction/travel behavior. No commits/push/deployment.

## Task1: Economy rules (independent)
Files: src/game/economy.ts, economy.test.ts. Root owns state.ts.
Exports contracts:
```ts
type GoodId='grain'|'cloth'|'salt'|'iron'|'pottery'|'tea'|'herbs'|'silk';
interface MarketNews {id:string;cityId:string;goodId:GoodId;change:number;fromDay:number;untilDay:number;reason:string}
interface Economy {coins:number;capacity:number;cargo:Partial<Record<GoodId,{quantity:number;cost:number}>>;markets:Record<string,{period:number;stock:Record<GoodId,number>}>;news:MarketNews[];ledger:TradeRecord[];profit:number}
createEconomy():Economy;
isEconomy(value:unknown):value is Economy;
GOODS: readonly {id:GoodId;name:string;basePrice:number}[];
marketQuote(economy:Economy,cityId:string,date:GameDate,goodId:GoodId):{buy:number;sell:number;stock:number;specialty:boolean};
tradeGoods(state:GameState,goodId:GoodId,quantity:number,side:'buy'|'sell'):GameState;
applyMarketNews(economy:Economy,news:MarketNews):Economy;
cargoUsed(economy:Economy):number;
```
- [x] Tests first: buy/sell cost/profit, safe integer checks, state locked in transit/battle/event, stock period, reload equivalent,30-day news replacement/expiry, all34city coverage,2profitable routes.
- [x] Run `npx vitest run src/game/economy.test.ts` RED, implement, then GREEN. State type may await root addition but runtime imports must be type-only to avoid cycles.
- [x] Expose full chosen interface and results to root; no edits outside owned files.

## Task2: Travel rules (independent)
Files: src/game/travel.ts and travel*.test.ts. Root owns scene/state/battle.
```ts
advanceTravel(state:GameState,days=3):GameState;
TravelEventKind += 'market-news'|'wolves';
TravelEvent += {cgSeen?:boolean;news?:MarketNews};
acknowledgeTravelCg(state:GameState):GameState;
```
- [x] Tests first: valid1/7/30, invalid unchanged, .20 boundary, exact arrival/day cap, wolf land-only,CG lock+reload, market news valid+once-only, old event optional cgSeen.
- [x] Generate messages deterministically from journey seed and actual date; apply news to state.economy once during creation, not when viewing. Use gameDayNumber via recruitment or equivalent shared calendar ordinal.
- [x] Event resolution refuses until cgSeen true; old event gainsCG when shown. For legacy tests deliberately acknowledge before resolution, not weaken production guard.
- [x] Wolves fight as ambush but event.kind selects wolves in root BattleScene; safe/retreat3days morale-1. Wolf victory30XP/20coins and1day, no reserve XP. City work1day adds20coins, existing long rest reward stays.
- [x] Run targeted tests RED→GREEN and report contract. No economy/state/scene edits.

## Task3: Art and historical profiles (independent)
Files: src/game/historicalCharacters.ts, recruitmentCatalog.ts and their tests; public/assets/events/*, characters/*; docs/art/2026-10-24-trade-events-art.md.
- [x] Generate7CG: event-rain-v1.png,event-merchant-v1.png,event-refugees-v1.png,event-ferry-v1.png,event-bandits-v1.png,event-wolves-v1.png,event-contact-v1.png. Wide historical scenes, no text/UI; merchant also news and city banner.
- [x] Generate4transparent full bodies: sun-jian-v1.png,sun-ce-v1.png,zhuge-liang-v1.png,zhou-yu-v1.png. User approved these four and existing semi-realistic full-body style. Inspect reference portraits, use built-in image_gen only; copy generated finals into repo, preserve originals and record full prompts.
- [x] Catalog tests first for33identities, assets, age/window gates and old Sun IDs. Keep Sun leader definitions out of historical list if duplication; ensure both Sun formal portraits appear in character details and city encounter identity.
- [x] Add Zhuge207..233 and Zhou195..209 windows as spec; do not alter established old windows. New historical profiles fan/sword and suitable scholar/commander model, existing60affinity rule automatically applies.
- [x] Run historical/catalog/unit appearance tests, report results and art paths. Do not edit root scene, combat, state, scripts or economy.

## Task4: Root persistence and wolf battle
Files: state.ts, recruitmentSave.test.ts (only needed fixtures), combat.ts/test, unitModel.ts, unitFigure.ts, characterDetails.ts, scenes/BattleScene.ts, animal models.
- [x] Add GameState.economy:Economy and travelDays:number; initial/missing save defaults, strict validate old/new nested values. Test migration and no reset before implementation.
- [x] Introduce optional wolf encounter configuration in createCombatState fifth parameter, keep old modes. Wolf IDs have prefixwolf:, weaponclaws, specieswolf; actual fourtharg deployed preserved. Separate four-legged painter reused board/model/preview. Update details animal labels and visuals, never put wolves in recruitment.
- [x] Meaningful tests for3..5wolves, no human enemy IDs, legal spawns, fiveparty support and old battles unchanged.
- [x] BattleScene dispatch based on journey.event.kind, title/status/actions/rewards describe wolves, retry/reload retains identity, settlement returns original journey and once-only rewards.

## Task5: Root DOM integration
Files: neweventCg.ts/css, eventContent.ts, cityPanel.ts/css, OverworldScene.ts.
- [x] Event catalog maps8kinds to7assets. Saved cgSeen gates choices;CGcontinue/Escape confirms stage via pure function and rerenders. Missing image fallback does not block; focus restored.
- [x] Replace fixed3day action with label+numeric input, quick buttons, submit validation preserving invalid value feedback, store valid preferred count and show actualdaysnotice. On cappedcalendar ensure no fictitiousprogress.
- [x] Independentcitydialog on currentcity; market quotes and numeric qty, maxbuttons, cargo/cost/profit/20ledger/history; use tradeGoods only. Owned dialog retains callbacks/focus and transaction snapshots; no journey/battle/CG bypass.
- [x] Display coins/cargo in world header, city入口 with nearby affairs. Lazy merchant banner; local recruitment/official nested dialogs restorecity.
- [x] UI integration covers all exposed state/rule error paths; no black placeholder images for missing generated art.

## Task6: Root validation and release
Files: scripts/verify_trade_events.py, README/package/lock/package-local and persistent logs.
- [x] Write actual pointer/DOM acceptance: custom7days;CGfirst thenchoices; buy→savedjourney→actualarrival→sellprofit;stock/news expiry and reload; wolf real combat+20coins+no reserveXP;33characters/4portraits; both phone sizes and focus. Reuse existingbattleinputplanner after checking wolf weapon movement.
- [x] Independent read-only code review, resolve important findings with tests.
- [x] Run `npm test`, `npx tsc -b`, `npm run build:local`, `npm run test:local`, `git diff --check`.
- [x] Set package0.4.0 and release instructions; portable server18743 ownedtestprocess, blockexternal requests and test allnewfeatures. Inspect screenshots and stop only ownedserver. Update plan/findings/progress and final deliverable link.

## 完成证据

最终23文件212项单测全部通过，类型检查、生产构建（52模块）、本地服务测试和git diff --check均通过。真实Playwright完成购盐→输入日程→CG/事件→太原出售获利、库存/账本刷新、行情真实价格变化及过期、CG前后读档、五人狼群实战与20铜钱一次奖励、候补不领奖、四幅正式历史人物招募/详情、844×390与390×844触控。生产本地包阻断外网完成同套流程（跳过Vite规则辅助的自动战斗规划，保留狼群加载、刷新与撤退），并补验所有事件CG映射。CG缺图隐藏样式先真实复现RED，修复后开发和最终生产包均GREEN。11幅美术原件和完整提示词见art清单。独立审查无P0/P1/P2，未提交、推送或发布。
