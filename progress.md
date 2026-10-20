# Progress Log

## 2026-10-19

- Pushed the H5 design revision to GitHub `main`.
- Created the implementation plan for the first playable vertical slice.
- Built the Vite/Phaser shell with responsive HTML/CSS overlays and LocalStorage-backed game state.
- Added the refugee prologue, click/touch overworld, Cao/Sun/Liu route choice, and compact tactical battle.
- Added unit tests for state and combat transitions: 9 tests passing.
- Added browser smoke coverage for desktop prologue/map/battle and mobile route choice.
- Verified `npm run build` and the Playwright smoke flow.
- Committed the playable slice locally and uploaded the complete project tree to GitHub through the authenticated browser session.
- Started the local Vite server at `http://127.0.0.1:5173` for interactive follow-up.

## 2026-10-20

- Replaced the per-unit enemy response with party rounds: each living ally may move once and attack or guard once before enemies respond.
- Added collision-aware movement, action limits, route movement/guard bonuses, and deterministic enemy pathfinding.
- Fixed HTML overlay clicks reaching the Phaser canvas through global window input events.
- Fixed health-bar alignment, resource rewards overwriting prior progress, and disabled browser storage breaking the game.
- Restored battle reloads to the correct encounter from its opening state; added retrying a lost encounter without losing route progress.
- Fit the canvas within the viewport height and expanded touch targets.
- Verified three complete routes through real canvas input, including mobile touch, encounter reloads, ending reloads, restarting, and loss/retry. Additional layout checks passed at 667x375 and 390x844.
- State/combat regression tests: 17 passing. Browser run: no console errors or uncaught exceptions.
