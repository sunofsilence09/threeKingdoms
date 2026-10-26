# Work duration, usable equipped martials and player conquest

User requirements: city work must be freely selectable in multiples of5days with minimum5days; equipped martial arts must actually work during battles; the hero can conquer cities.

## Independent task1 — city work

- [x] TDD new workInCity(state,blocks): integer1…72blocks (5…360days), current city only, reject battle/journey and calendar overflow; reward actual days at existing20coins/+1supply perday, safe-integer bounds.
- [x] Replace city1day work button with labelled5day-block input/stepper, explicit day/reward preview and submit; keep rest30/360 independent. Preserve save/season/life/world clock integrations, no screen rendering advances time.
- [x] Focused and real UI validations including5/15days, invalid input, calendar end and negative/battle/road locks.

## Independent task2 — equipped martials

- [x] Reproduce player's report through equip→new/continuedbattle→selectskill→legaltarget; inspect currentActor versus selectedId, render/DOM events, slot limits, target range, cooldown and checkpoints.
- [x] Fix actual UI cause: quicker Aman hides equipped hero skills; out-of-range hints are unclear. Keep hero skills visible with wait/cooldown/target reasons. Retain legality, turn, cooldown, target highlighting and mobile select fallback. Do not erase equipment or rebase old stats.
- [x] Verify with real browser input, hero equipped attack/support skills, enemy turn restrictions, saved game/refresh.

## Task3 — player conquest

- [x] User confirmed recruiting an army with real troop losses. Existing strategic siege rules resolve one explicit3–10day campaign, with preview and confirmation.
- [x] Optional audited playerReserve and explicit player faction, preserving existing worlds unchanged until first recruitment.2coins/person,100-person recruitment blocks,1day assembly;20k reserve cap. Dispatch transfers reserve, does not create soldiers. Failed siege survivors return, successful survivors garrison.
- [x] Reachable city/map military panel with preview/cancel/confirmation; current city target only; ownership/governor/save update, NPC counterattacks recognized; personal allegiance preserved. Withdraw keeps2000garrison; reinforce respects20kcitycap; no autonomous player dispatch.
- [x] Strict reserve/army/ledger validation and calendar/reload/recovery/battle guards;8tests including automaticNPCrecapture and save/load.

## Delivery

- [x] Independent reviews of work and strategic model, plus root martial/UI inspection. Full618tests/76files, TypeScript, production build and portable server test passed. Three desktop/mobile layouts passed work, casting, military UI and offline portable workflows; spring BGM pause/resume retained.162dist/package hashes match. No commits/pushes.

Ownership: work worker owns travel.ts/work helper and OverworldScene work UI; martial worker owns battleCommands/martialCombat and BattleScene while fixing. Root owns conquest/state/world/battleSave integration after handoff. All existing uncommitted1.1 changes remain intact.
