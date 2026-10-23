# Historical Timeline Implementation Plan

**Goal:** Start at 184 with a persistent random origin, defer route selection until 200 and drive a bright board from the calendar.

**Architecture:** Pure history and theme modules feed the saved state and Phaser scenes. Chapters reuse tactical encounters as fictional local journeys, with explicit inter-year narrative transitions.

**Tech Stack:** TypeScript, Phaser, Vitest, Vite.

## Constraints

- Before 200 only encountered factions are selectable; from 200 all factions are available. Choice is optional.
- Keep party growth, tactical rules and existing uncommitted local packaging work.
- Origin persists across reload/retry. No rewards/time for repeated completion.
- Use bright, distinct terrain and readable ink text throughout the main game.

## Tasks

- [x] Write state tests for origins, calendar, route gate, migration and idempotent chapter progress. Observed four feature failures before implementation.
- [x] Add `history.ts`: `GameDate`, origin pool, chapter descriptions, `chapterAt(year)`, date validation and month advance. Add required `date` and `originId` to state. Guard `selectRoute` by encountered factions or year >= 200. Migrate old routed saves to 200, unrouted to 184.
- [x] Add `theme.ts`: seasonal terrain, historical tint, paper/ink/accent colors, pure resolver tests. Apply DOM theme at runtime state updates.
- [x] Update prologue/overworld/battle/ending/boot to use date, origin and theme. Add neutral local escort before route unlock; persist encounter mode for reload. Chapter endings advance through 184/190/194/200 with travel narrative and cleared per-chapter progress.
- [x] Run `npm test` (72 passed), `npm run build:local`, browser journey through all four chapters (eight battles), early faction blocking/entry, save reload and 200 choice. Inspect desktop/mobile screenshots; verify portrait HUD and neutral restart after final polish. Update README and progress with evidence.
