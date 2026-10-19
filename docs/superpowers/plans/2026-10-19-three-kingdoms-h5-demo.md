# Three Kingdoms H5 Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build the first playable browser H5 slice with a refugee prologue, click/touch exploration, a Cao/Sun/Liu route choice, and one compact tactical encounter.

**Architecture:** Vite serves a TypeScript application. Phaser owns the game canvas, scenes, map interactions, and combat rendering; a small state module owns route/progress data and LocalStorage persistence; HTML/CSS provides the responsive shell and route cards around the canvas. The first slice uses generated pixel-style shapes and text so the gameplay loop is testable before art production begins.

**Tech Stack:** Vite, TypeScript, Phaser 3, Vitest, HTML/CSS, LocalStorage.

## Global Constraints

- The demo must run from a browser without a backend.
- Mobile landscape touch input and desktop mouse input must both complete the core loop.
- The player starts as a refugee and sees the Cao/Sun/Liu choice after the shared prologue.
- Roughly 70% of route content is shared; route-specific content stays inside the first slice.
- The first slice must remain small enough to validate within one local development session.

## File Map

- `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, and `.gitignore` define the browser build shell.
- `src/main.ts` creates the Phaser instance and connects the HTML overlay shell.
- `src/style.css` contains responsive page chrome, readable panels, route cards, and touch-sized controls.
- `src/game/state.ts` defines route ids, demo phases, immutable state transitions, and LocalStorage persistence.
- `src/game/content.ts` owns narrative copy, route terms, and map node data.
- `src/game/scenes/PrologueScene.ts` owns the shared refugee opening.
- `src/game/scenes/OverworldScene.ts` owns the small click/touch map and first encounter.
- `src/game/scenes/RouteChoiceScene.ts` owns the Cao/Sun/Liu selection.
- `src/game/scenes/BattleScene.ts` owns the first compact tactical encounter and ending state.
- `src/game/state.test.ts` verifies state transitions and malformed save data.
- `README.md` documents local setup and the playable loop.

## Task 1: Application Shell

Create a Vite + TypeScript + Phaser app with `npm run dev`, `npm run build`, and `npm run test`. Use a 960x540 logical game area with Phaser `FIT` scaling and center auto-centering. The HTML shell must include a game mount, a status label, and an overlay mount. CSS must support a dark ink background, warm paper panels, red accents, and landscape mobile use.

## Task 2: State Model

Define `RouteId = 'cao' | 'sun' | 'liu'`, `DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending'`, and `GameState` with `phase`, `route`, `supplies`, `morale`, and boolean `flags`. Implement `createInitialState`, `selectRoute`, `saveState`, and `loadState`. Tests must cover initial state, all route advantages, and malformed storage values before the implementation is written.

## Task 3: Prologue and Overworld

Add content for the refugee premise, the fixed companion, the first ambush, and three route descriptions. The prologue advances with a touch or click. The overworld draws a compact pixel-style map with selectable nodes. The first node opens the ambush setup, the second provides a short recovery event, and the hub opens the route choice. Pointer and touch input share handlers.

## Task 4: Route Choice and Battle

Show three route cards with distinct terms and advantages. After confirmation, apply the route state and enter a deterministic 6x4 grid battle with three party units, three enemies, and `移动`, `攻击`, `守势` actions. Touching a friendly unit selects it; touching a reachable tile or enemy resolves the action; the enemy turn then resolves. A route-aware ending panel closes the slice.

## Task 5: Verification and Delivery

Run the unit tests and production build. Start Vite on an available port and verify the desktop and narrow landscape mobile layouts in a real browser. Confirm no clipped controls or overlapping panels. Document local run instructions, update the persistent progress files, and commit the playable slice.
