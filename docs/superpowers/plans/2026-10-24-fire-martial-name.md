# 0.8 自定姓名、火势与武学 Implementation Plan

> For agentic workers: use subagent-driven-development for independent modules and inline integration; keep all edits in this checkout on codex/fire-martial-0.8. User approved the complete design on 2026-10-24. No further design approval is needed.

**Goal:** Deliver the approved 0.8 features and a verified Windows local package.

**Architecture:** Keep stable character IDs, add separate pure name/martial/environment modules, integrate legal actions into the combat engine, and persist complete combat snapshots. Existing phase/travel/world-time guards continue to own progression.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest, existing Python browser verification.

## Global constraints

- Follow docs/superpowers/specs/2026-10-24-fire-martial-name-design.md; 47 named characters, Himiko read-only.
- Do not discard existing planning changes. No push, deployment or unsolicited commit. Work on a feature branch in the existing checkout so the current development server and release path remain usable.
- Preserve 0.7 progress and independent strategic RNG. Every new rule needs behavior tests before implementation; test new modules, not implementation-shaped snapshots.
- Branch ownership warning is handled with command-local safe.directory, not global Git config.

## Task 1: Name and saved state

Files: create heroName.ts/nameEntry.ts/heroName.test.ts; update state.ts, BootScene.ts, display readers except BattleScene/combat.ts owned by integration.

- [x] RED: `expect(validHeroName('  陈平  ')).toBe('陈平'); expect(validHeroName('<script>')).toBeNull()`; old saves without name require one-time entry and retain resources.
- [x] Run targeted Vitest and inspect failure.
- [x] Implement `validHeroName(value: unknown): string | null`, `heroName(state): string`, `personName(id,state): string`, and safe text display replacement. Require initial/legacy entry before scene routing.
- [x] Add optional `heroName`, `martial: MartialProgress`, `duel?: DuelEncounter`, `activeBattle?: CombatState` to GameState; use martial exports for migration/validation. Coordinate with other modules before changing their files.
- [x] GREEN: targeted tests and old save tests. Review dynamic display/escaping and preserve stable IDs.

## Task 2: Fire and weather engine

Files: create battleEnvironment.ts/fire.test.ts; update combat.ts/battlefield.ts and tests, no BattleScene writes.

- [x] RED: forest ignition exceeds road, illegal actor/water/wolf does not act, valid failed ignition consumes action, all six weather extinguishing probabilities differ.
- [x] Implement `environment`, `fires`, `scorched` in CombatState; deterministic initialization and round-end resolution, wind direction/strength, snapshot propagation, friendly fire, lethal movement, formation HP update.
- [x] Implement `fireChance(state,x,y,bonus?)`, `fireTargets(state,id)`, `setFire(state,id,x,y,bonus?,level?)`, `environmentLabel(state)` exports, plus reusable `updateUnitHp` and `endAction` helpers for martial integration.
- [x] Add generic optional martial cooldown/status fields to CombatUnit only by coordination, export clearSight for skill targeting.
- [x] GREEN: fire tests and all combat/initiative/garrison tests; review rounds/RNG/no unlimited chain spread and AI risk behavior.

## Task 3: Martial catalog, learning and duel rules

Files: create martialCatalog.ts/martial.ts/martialPanel.ts/martial.test.ts; update partyPanel.ts and characterPanel.ts for entrances, not state.ts/combat.ts/BattleScene.ts.

- [x] RED: 47 unique skills, affinity79 rejects,80 chance30%,100 chance50%; failed teaching consumes one day, learned skill cannot consume again, duel victory40%, defeat/retreat no award.
- [x] Implement stable `MartialProgress`, `DuelEncounter`, `createMartialProgress`, `isMartialProgress`, `canRequestTeaching`, `requestTeaching`, `startDuel`, `settleDuel`, `equipMartial`, and catalog `martialForPerson`, `martialAt`.
- [x] UI renders native/learned/equipped skills, probabilities, teacher eligibility and one-to-one challenge entry. Starting duel dispatches a game event consumed by existing scene.
- [x] GREEN: learning/catalog/duel tests and recruitment tests; review one-time settlement, current location checks, and story-vs-history description labels.

## Task 4: Active martial combat and integrated battle UI

Files: create martialCombat.ts/martialCombat.test.ts/battleSave.ts/battleSave.test.ts; update BattleScene.ts/battleBoard.ts and limited scene event hooks.

- [x] RED: native NPC ability and hero equipped skills, blocked line of sight/range, cooldown3, per-action consumption, temporary status expiry/caps, one-on-one duel assembly, snapshot validation.
- [x] Implement all11 skill templates using engine legal actor/HP/action helpers; AI tries skills where helpful. Persist snapshots after each valid action and before animations, resume outcome safely.
- [x] Add fire/martial target modes, cancel, chances/range/cooldown, environmental status and fire graphics. Guard inspect overlays against concurrent action.
- [x] Duel completion returns to overworld with exactly one learning settlement, no normal quest/resource/XP awards; ordinary battle clears checkpoint when settled or deliberately retried.
- [x] GREEN: new tests/full suite/TypeScript build, resolve shared module integration issues.

## Task 5: Verification, review and local package

- [x] Run all Vitest, build and test:local. Fresh review of requirement coverage and risky persistence/action edge cases; fix regressions with failing tests first.
- [x] Exercise real name entry, fire and fire god, teacher/equip/duel, refresh and legacy save in desktop/mobile browser. Use current scripts/Playwright only after loading applicable skill.
- [x] Update version0.8.0 in package/lock/index/readme/local packaging docs; run build:local and test:local.
- [x] Verify production assets, offline local start, browser smoke and SHA parity; record evidence in progress.md, mark design implemented only after checks pass.

## Plan self-review

All three requested systems have behavior tests and actual UI entrances; fire and skill share combat helpers through documented exports; names retain IDs; persistence covers both new combat and legacy state. Tasks1—3 have separate file ownership; root integrates Task4 only after engine interfaces are available. No additional user approval gates.
