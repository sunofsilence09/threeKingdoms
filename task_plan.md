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
- [ ] Record results in `progress.md`, mark completed plan items, and commit the playable slice.
