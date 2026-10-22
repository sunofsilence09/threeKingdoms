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
