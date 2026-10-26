# Three Kingdoms H5 Demo Implementation Plan

**Goal:** Build the first playable browser H5 slice with a refugee prologue, click/touch exploration, a Cao/Sun/Liu route choice, and one compact tactical encounter.

**Architecture:** Vite serves a TypeScript application. Phaser owns the game canvas, scenes, map interactions, and combat rendering; a small state module owns route/progress data and LocalStorage persistence; HTML/CSS provides the responsive shell and route cards around the canvas. The first slice uses generated pixel-style shapes and text so the gameplay loop is testable before art production begins.

**Tech Stack:** Vite, TypeScript, Phaser 3, Vitest, HTML/CSS, LocalStorage.

## Global Constraints

- The demo must run from a browser without a backend.
- Mobile landscape touch input and desktop mouse input must both complete the core loop.
- The player starts as a refugee and sees the Cao/Sun/Liu choice after the shared prologue.
- Roughly 70% of route content is shared; route-specific content stays inside the first slice.
- The first slice must remain small enough to validate within one local development session.

---

### Task 1: Vite and Phaser application shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Produces a Vite app mounted at `#app`.
- Exposes `npm run dev`, `npm run build`, and `npm run test` scripts.
- Creates a Phaser game with a fixed logical size of 960x540 and scale mode `FIT` with centered auto-centering.

- [x] Create the package manifest with `phaser`, `typescript`, `vite`, `vitest`, and `@vitejs/plugin-basic-ssl` omitted unless HTTPS becomes necessary.
- [x] Add the HTML shell with a root element, a game mount element, a route overlay mount, and a short loading label.
- [x] Add responsive CSS for landscape mobile and desktop, using a dark ink background, warm paper panels, red accents, and touch-sized controls.
- [x] Add the Vite and TypeScript configuration with strict type checking.
- [x] Run `npm install` and `npm run build` to verify the empty shell compiles.

### Task 2: Persistent game state and route model

**Files:**
- Create: `src/game/state.ts`
- Create: `src/game/state.test.ts`

**Interfaces:**
- `type RouteId = 'cao' | 'sun' | 'liu'`.
- `type DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending'`.
- `interface GameState { phase: DemoPhase; route: RouteId | null; supplies: number; morale: number; flags: Record<string, boolean>; }`.
- `createInitialState(): GameState` returns `{ phase: 'prologue', route: null, supplies: 3, morale: 2, flags: {} }`.
- `selectRoute(state: GameState, route: RouteId): GameState` sets the route and applies one route-specific starting advantage.
- `saveState(state: GameState): void` and `loadState(): GameState | null` use the `three-kingdoms-demo-state` LocalStorage key.

- [x] Write tests for the initial state, each route advantage, and a malformed LocalStorage value.
- [x] Run the focused tests and confirm they fail before implementation.
- [x] Implement immutable state transitions and guarded persistence parsing.
- [x] Run the focused tests and confirm all pass.

### Task 3: Refugee prologue and click/touch overworld

**Files:**
- Create: `src/game/scenes/PrologueScene.ts`
- Create: `src/game/scenes/OverworldScene.ts`
- Create: `src/game/content.ts`
- Modify: `src/main.ts`

**Interfaces:**
- `content.ts` exports the shared prologue text, three route definitions, and overworld node definitions.
- `PrologueScene` advances to `OverworldScene` after the player taps/clicks the primary action.
- `OverworldScene` marks the player as moved after selecting a node and opens the route-choice node after the first encounter.

- [x] Write content data for the refugee premise, fixed companion, one ambush, and three route descriptions.
- [x] Render the prologue as a compact readable panel with a clear primary action.
- [x] Draw a small pixel-style map with three selectable locations and a party marker.
- [x] Make the first node show the ambush setup, the second node show a short recovery event, and the hub node open route choice.
- [x] Ensure pointer and touch events use the same handlers and do not require keyboard input.
- [x] Run `npm run build` and manually verify the prologue-to-map flow in a browser.

### Task 4: Cao/Sun/Liu route choice and first tactical battle

**Files:**
- Create: `src/game/scenes/RouteChoiceScene.ts`
- Create: `src/game/scenes/BattleScene.ts`
- Modify: `src/game/scenes/OverworldScene.ts`
- Modify: `src/game/content.ts`

**Interfaces:**
- `RouteChoiceScene` displays the three route cards and calls `selectRoute` after the player confirms one choice.
- `BattleScene` displays a 6x4 grid, three party units, three enemies, a selected unit, and actions `移动`, `攻击`, `守势`.
- Completing the battle sets `phase` to `ending` and displays a route-aware closing message.

- [x] Add route-specific terms, advantages, and a first task objective for Cao, Sun, and Liu.
- [x] Render route cards with a clear choice state, touch-sized confirm button, and route-aware color accents.
- [x] Implement a deterministic compact battle: select a friendly unit, select a reachable tile or enemy, resolve one action, then resolve the enemy turn.
- [x] Show the selected route and party resources in the battle HUD.
- [x] Add a simple ending panel that explains how the selected route changed the encounter.
- [x] Run `npm run build` and manually play all three route choices through the ending.

### Task 5: Verification and delivery

**Files:**
- Modify: `README.md`
- Modify: `progress.md`
- Modify: `task_plan.md`

- [x] Add local run instructions and the current demo loop to `README.md`.
- [x] Start Vite on an available port and verify the page loads in a real browser.
- [x] Verify desktop viewport and a narrow landscape mobile viewport have no clipped controls or overlapping panels.
- [x] Run `npm test` and `npm run build` from a clean working tree state.
- [x] Record results in `progress.md`, mark completed plan items, and commit the playable slice.

### 2026-10-20: Playability follow-up

The first slice's per-action enemy response allowed three enemy actions for each ally action. This follow-up uses a party round instead: each living ally can move once, then attack or guard once; enemies respond after the party finishes or ends its round.

- [x] Add regression tests for action limits, blocked movement, route bonuses, resource preservation, and unavailable storage.
- [x] Integrate the round model and expose health, resources, and remaining actions in the battle HUD.
- [x] Fix overlay input passing through to the game and restore the correct encounter on reload.
- [x] Add a loss/retry flow and fit mobile landscape controls within the viewport.
- [x] Play all three routes to their endings using real browser input; verify restart, reload, loss/retry, and additional narrow viewport layouts.

### 2026-10-21: 身份与地形扩展

- [x] 检查现有规则，确认只有单位占格，没有地形或兵种系统。
- [x] 将主角显示名改为姜垣，更新方案为流民成长、16×10 与障碍地形。
- [x] 用户确认修订设计，并追加等级系统。
- [x] 编写实施计划，实现成长存档、地形战斗与棋盘视口。
- [x] 完成三路线回归、修复跨区域拖动按钮误触，并记录最终验证。

### 六维培养后续需求

- [x] 检查现有等级、经验、存档与战斗属性。
- [x] 编写技能点与六维能力映射草案。
- [x] 确定实施规则：每级3点、智力闪避与角色绝招；主角绝处逢生由用户选择。
- [x] 实现存档迁移、升级发点、加点界面、六维实际效果、角色绝招，并完成验证。

### 2026-10-22：人物详情与立绘对应的小人

- [x] 检查现有成长面板、HUD、文字棋子和战斗数据，确定详情与外观共享方案。
- [x] 补齐人物立绘与共享外观资料。
- [x] 实现详情模态、各入口、真实战斗数据与匹配的小人。
- [x] 按追加要求区分人物立绘动作、棋盘站姿与战斗反馈。
- [x] 完成桌面/手机验证及既有流程回归。

### 2026-10-22：群雄与女性角色

- [x] 确定六人名单与人物志/阵营页/共享小人接入方案。
- [x] 生成六幅差异化立绘并补充人物资料。
- [x] 接入详情分类、匹配的小人预览及阵营人物入口。
- [x] 完成新人物与原流程验证。

### 2026-10-22：桌面页面与战斗文字放大

- [x] 检查截图、页面宽度限制和Canvas/HTML字号。
- [x] 扩大桌面游戏区域，放大棋子、名单、按钮与主角HUD文字，保留手机适配。
- [x] 执行构建、单测和桌面/手机浏览器验证，检查截图与文字边界。

### 2026-10-22：董卓、吕布、华雄、甄姬立绘

- [x] 生成四幅独立全身立绘并保存提示词。
- [x] 接入人物志资料、差异化小人外观和兵器。
- [x] 完成十人物的桌面/手机验证、单测、构建与原棋盘回归。

### 2026-10-22：姜垣成长与武器立绘

- [x] 检查等级与装备，确定三阶段、五武器、15组合方案。
- [x] 生成14张新立绘并保持主角身份与阶段衣装一致。
- [x] 接入自动外观选择、详情图鉴及HUD/棋盘同步。
- [x] 验证15组合、等级边界、只读预览及原有流程。

### 2026-10-23：六位名人角色

- [x] 生成张辽、关羽、张飞、赵云、糜夫人、张星彩六幅独立透明立绘并保存提示词。
- [x] 接入16人人物志与对应姿态、兵器、服色的小人。
- [x] 桌面/横屏/竖屏人物检查与主角外观、棋盘回归。
- [x] 独立审查、单测、构建与截图检查。

### 2026-10-23：Windows 本地文件夹打包

- [x] 确认源码 index.html 无法通过 file:// 运行，采用构建资源与本机 HTTP 服务。
- [x] 添加无依赖服务、双击启动入口、运行程序与资源打包脚本、使用说明。
- [x] 本机服务测试与原有64项单测通过；生产构建通过。
- [x] 打包目录浏览器验证：屏蔽外网后进入序章与地图、立绘加载、刷新恢复进度。
- [x] 完成带中文与空格的移动路径CMD启动检查，最终本地包位于 release/三国行旅-本地版。

## 2026-10-23 历史时间线增量
- [x] 184随机出生地区、年月与旧存档迁移。
- [x] 相遇后可提前投奔对应阵营；200年起开放全部阵营，可保持无所属。
- [x] 184/190/194/200章节、中立护送、读档恢复与独立奖励。
- [x] 明亮四季/历史主题，桌面和手机截图验证。
- [x] 72项单测、完整8场行旅实战、生产构建、本地包更新和静态服务测试。

## 2026-10-23 完整出生州部增量
- [x] 核对184年13州级范围并补齐16地点。
- [x] 分层等概率抽签、旧存档和测试种子兼容。
- [x] 76项测试、全16点浏览器覆盖与手机长地名检查。
- [x] 修复出生标记被角色面板遮挡。
- [x] 生产构建与Windows本地包同步，既有存档出生点ID保留。

## 2026-10-23 地方官员史料与立绘设计
- [x] 按184年查13州部刺史/校尉及16出生点太守/国相/河南尹，区分确证任职、任期不详和史料未详，记录完整查考表。
- [x] 整理官员—地区—年份对应、来源及不同造型的具体设计，审阅现有立绘风格。
- [x] 用户确认首批八人并要求缺考留空；内置image_gen逐人生成透明全身立绘，原件与提示词保留。
- [x] 接入地方官员资料与八人图鉴，81项单测、桌面/手机全部八图与日期筛选、独立审查、构建及离线本地包终验通过。

## 2026-10-23 历史地理与旅行0.2升级
- [x] 检查现有示意地图、月历、任务跳年、存档与战斗接口。
- [x] 查历史地理与交通走廊，比较方案并完成可审阅设计。
- [x] 用户确认历史城邑路线地图方案。
- [x] 编写实施计划，接入地理、日历、旅行与事件。
- [x] 地图与当前所在地官员、途中战斗、读档恢复联调。
- [x] 测试桌面及手机，更新0.2.0本地包。


## 2026-10-23 招募与队伍0.3升级
- [x] 检查固定三人队伍、战斗生成、人物志与成长存档。
- [x] 整理招募/出战候补分离方案，查首批人物历史活动背景。
- [x] 用户修订并授权全人物亲密度招募、五人出战上限。
- [x] 编写计划并实现招募、名单管理、战斗成长与存档迁移。
- [x] 验证真实换人实战、读档、移动端，更新0.3.0本地包。
- [x] 用户修订授权：全部角色可招募、亲密度门槛、出战五人。以最新修订设计替代旧三人方案。

## 2026-10-24 商旅见闻0.4升级
- [x] 核对现有0.3旅行、事件、战斗、角色和存档接口。
- [x] 用户选定孙坚、孙策、诸葛亮、周瑜；整理完整可实施设计。
- [x] 用户确认0.4整体规则。
- [x] 编写实施计划，实现自定日程、CG、城市跑商、行情与野兽。
- [x] 生成7幅事件CG与4位人物立绘，并完成角色接入。
- [x] 测试实际跑商与狼群实战、手机、存档，打包0.4.0。

## 2026-10-24 城市商品补足十种
- [x] 核对现有8种，按用户要求新增米酒、皮革。
- [x] 规则和8商品存档迁移测试RED→GREEN，保留原库存与经济记录。
- [x] 完成实际买卖与手机/旧档验证，更新0.4.1本地包。

## 2026-10-24 商品图与城府宾客0.5
- [x] 核对十商品均缺独立图；检查现有城市、人物、官员和招募接口。
- [x] 用户明确受雇者80亲密；整理六人、16美术与城府完整设计。
- [x] 用户确认整体0.5方案。
- [x] 实施商品图、六人、城市任职/80招募与相关城邑。
- [x] 真实界面/战斗/旧档/手机与离线包验证，交付0.5.0。

## 2026-10-24 地方军士与十三人物0.6
- [x] 检查现有名册、人物详情、招募、存档与未提交改动。
- [x] 用户确认卑弥呼只绘立绘/人物志，不开放相遇。
- [x] 核对公开古籍，整理驻军身份、主事归属、十三人和美术/兼容设计并自审。
- [x] 用户审阅0.6完整设计；实施中追加城守5000/共同管理/仅招募士兵长/部队数值叠加要求。
- [x] 编写实施计划并落实人物、驻军、美术和UI。
- [x] 完成回归、真实五人实战、手机与离线包验证，交付0.6.0。

## 2026-10-24 NPC动态攻城与城池归属0.7
- [x] 核对0.6按日期推导兵力、静态驻城与各耗时入口。
- [x] 用户选择“历史开局，随后动态争夺”。
- [x] 整理自动出征、行军攻城、占领、人事与旧档完整设计并自审。
- [x] 用户审阅0.7完整方案，确认全部实施。
- [x] 编写实施计划，实现动态世界、地图战报、迁移与统一时间推进。
- [x] 完成仿真/回归/界面/离线包验证，交付0.7.0。

## 2026-10-24 自定姓名、战场火势与武学0.8
- [x] 检查0.7开局、姓名引用、行动队列、地形、亲密度、战斗结算和存档接口。
- [x] 比较共有火攻/专属强化方案，整理47位具名人物武学、关系请教与真实切磋入口。
- [x] 保存完整可审阅设计，检查天气/风向/友伤/冷却/学习概率/旧档边界。
- [x] 用户审阅0.8整体设计，回复“可以，就这样”。
- [x] 按确认规则编写实施计划，实现并完成433项单测、独立复审、真实界面与Windows离线本地包验证。

## 2026-10-24 1.0世代更迭设计
- [x] 核对当前0.8.0/main基线、36城/47道路、人物与天下/存档接口。
- [x] 用户修订并确认：生年固定，卒年必须在史实基础±5年浮动，每局固定保存。
- [x] 核对新增城邑与人物、生卒资料，区分确证/推算/史料未详，保存三份研究记录。
- [x] 整理60城、26新人、73具名NPC、卒年浮动、继任与旧档迁移完整1.0设计并自审。
- [x] 用户审阅整体1.0方案，回复“好的，就这样”。
- [x] 实现60城、26人、73寿命与武学、年龄死亡归档、旧档迁移、310年日历及全UI。
- [x] 完成26张独立立绘、最终代码复审、519项全量回归、桌面/手机真实指针与触屏、Windows离线包验收。
- [x] 追加启动“继续游戏/重新开始”，无档置灰，命名重建与存档/战斗继续均经三尺寸离线验收。
## 2026-10-25 1.1.0 音效、各城太守与人物天赋

- [x] 检查1.0.0/main实际源码及已保存的524项回归基线记录，保留现有progress.md改动。
- [x] 检查攻击事件、成长与存档守恒、60城任职缺口；当前无音频层，属性统一10，任职只覆盖少数日期/城邑。
- [x] 明确无史料或无存活人选时是否允许明确标记的原创太守补位（已异步询问）；核对新增历史人物与地方官来源。
- [x] 整理1.1.0可审阅设计：武器音效/静音音量、太守任命与继任、差异天赋和旧档培养保留。
- [x] 按已确认设计实施，验证战斗/音效、各城独立任职、属性展示与实战一致、旧档迁移，更新Windows本地版。


- [x] 交付1.1.0：13类音效×3变化、32史人+40立绘、60城独立太守、逐人天赋与旧培养兼容。
- [x] 独立最终审查APPROVE，577项Vitest、tsc、生产构建、本地服务器测试通过；161个构建文件与本地包哈希一致。
- [x] 1440/390/844三尺寸太守与属性UI实测、真实敌我音频采集、阻断外网的本地包流程通过。保留当前功能分支，无提交或推送。

## 2026-10-26 帮工、武学操作与主角攻城

- [x] 城内帮工改为自选1—72个五日块，最低5日，预览日期与奖励，保留每日军需1/铜钱20，末历法拒绝不足整段。
- [x] 定位默认阿满先行动导致主角装备武学不可见、目标限制提示不足；持续显示主角武学并解释等待/冷却/合法目标，实际施展与刷新通过。
- [x] 用户确认先募兵组军再攻城；接入主角军府、预备兵、真实战略围城、驻军调拨、独立太守、NPC反攻、兵力账目及存档校验。
- [x] 独立只读复审通过；全套618测试/76文件、tsc/build/server通过。桌面/手机三尺寸实际操作和最终离线包通过，162文件哈希一致，春季BGM继续保留。未提交或推送。
