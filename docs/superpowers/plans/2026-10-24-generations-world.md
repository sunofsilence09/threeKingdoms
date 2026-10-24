# 1.0世代更迭 Implementation Plan

> For agentic workers: use subagent-driven-development with independent file ownership, TDD, focused reviews and final whole-change review. User approved the complete design on2026-10-24; no additional design gate.

**Goal:** Deliver60cities,26newpeople,73persistent lifespans with fixedbirth/death±5,310calendar and a verified Windows local package.

**Architecture:** Static sourced person/city data feeds pure life/status functions. A single time bridge applies mortality before strategic decisions at year boundaries; versioned save migration preserves36city stocks/roads and RPG progress. UI reads shared age/status and date-aware city labels.

**Tech stack:** TypeScript, Phaser3, Vite/Vitest, existing Python Playwright, built-in imagegen.

## Global constraints

- Follow docs/superpowers/specs/2026-10-24-generations-world-design.md; 60cities/73namedNPCs/198profiles/73arts, Himiko read-only.
- Fixedbirth, one saved death offset uniformly in[-5,+5], independent seed;16minimum recruit/train/combat age.
- Preserve old47direct road legs, all RPG/cargo/learning progress and real strategic troop ledger. No historical forced conquest.
- Work in existing checkout feature branchcodex/generations-1.0; no push/deployment/unsolicited commit. Keep existing planning edits.
- Node runtime C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe.

## Task1 Cities and direct road compatibility

Owned files: world.ts, newworldExpansion.ts/cityNames.ts, travel.ts directleg changes, economy.ts newcitygoods, worldMapView.ts/css/Overworld citysearch. Other rules in travel.ts root changes after handoff only.

- [x] RED: `expect(WORLD_CITIES).toHaveLength(60)`; old47edge days unchanged, all60connected,180/212/282南京names, alias建邺/南京/天水, savedjourney legs cannot use shortest-route lookup.
- [x] Implement24sourced nodes and regional corridors; export `LEGACY_CITY_IDS`, `EXPANSION_CITY_IDS`, `directRoadLeg(from,to)`, `cityNameAt(id,date?)`, `cityMatches(id,query,date?)`.
- [x] Add goods, currentcity/selectedroute labels and search/filter; preserve oldrawIDs and roadgeometry.
- [x] GREEN world/travel/economy tests; update fixedsize assertions only when required. Review oldleg/firstevent compatibility.

## Task2 Life data, fixedbirth and persistent mortality

Owned files: new lifeTypes.ts/personLifeData.ts/personLife.ts, tests. Coordinate types with generationData. Do not edit state/worldTime or UI; root integrates.

- [x] RED: offset boundaries -5/+5, deterministic save, fixedDOB, unborn/child/alive/dead, all73data, no falsehistorical dates.
- [x] Implement `LifeBaseline`, `LifeState`, `createLifeState(date,seed?)`, `isLifeState(value,date?)`, `lifeStatus(state,id,date?)`, `isAliveAt(life,id,date,adult?)`, `reconcileLives(state,date)` and age/source description.
- [x] `reconcileLives` archives historical dead partyprogress/relationships, filters deployed/battleParty, preserves learnedarts, queues unique notices; never touches worldtroops or forcibly changes phase unless migration cannot resume deadteacher.
- [x] Tests prove idempotence, no RNG at read, unknown/story estimates, removedparty retained memorial and saved learning.
- [x] GREEN targeted life tests; self-review chronology and optional-life compatibility.

## Task3 Generation roster, careers and native arts

Owned files: new generationData.ts, historicalCharacters.ts, careerData.ts, recruitmentCatalog.ts data-only imports, martialCatalog.ts26entries, tests. Coordinate profile gating root.

- [x] RED:26new/63historical/198profiles/73arts, exactIDs/DOB/DOD and role stages, no premature皇帝identity.
- [x] Export `GENERATION_CHARACTERS`, `GENERATION_CAREERS`, `GENERATION_LIFE_BASELINES` using shared LifeBaseline fields and agreed26stableIDs.
- [x] Wire appearances/path `/assets/characters/<id>-v1.png`, distinct models/weapon/colors, activity windows, employed/free/governing phases; add26approvedart templates.
- [x] GREEN catalog/character/career tests; preserve originalIDs and original art references.

## Task4 Strategic lifecycle, save migration and time integration

Root owned files: state.ts, worldTime.ts, worldConflict.ts/types/data, personPosting.ts, recruitment.ts, martial.ts, history.ts, and other save/scene integration after agents handoff.

- [x] RED: genuine0.8 fixture migration saved before city edits; preserve original36cities/armies/seed/day/ledger, add24×5000 with audited initial stock; no repeatedmigration.
- [x] WorldConflictversion2 migration validates exactv1legacy shape before adding fields; never treat missing24cities as genericcorruption. PassLifeState through world engine or equivalent pure eligibility context.
- [x] RED: owned+governor+commander death atboundary, early/late life overrides staticwindowend, institutions retain troops/ownership, later eligible leaders and late characters do not revive.
- [x] Extendcalendar via shared START_YEAR184/END_YEAR310, authoritative datedleaders and institutional fallback, no child military commanders.
- [x] Life reconcile and strategic simulation split at year boundaries; requesting teaching/duel crossingdeath cannot yield ghost teacher; quest reward summaries capture growth before archiving.
- [x] Save one completepre1.0backup, newmodules isolated recoveries, remove invalid postmortality snapshot/duel safely while preserving trip/resources; life RNG cannot shift travel/world/martial.
- [x] GREEN fullsuite, migration fixtures and 184–310longsimulation. Review all ownership/hasOwnparty bypasses.

## Task5 Art and age/memorial UI

Root writes26art prompts and uses26separate built-in imagegen calls, copying final PNGs into workspace. After generation roster task finishes, art coordination/inspection can be delegated without touching sourceowned elsewhere.

- [x] Inspect existing portrait reference; generate26individual transparentfullbody images with distinct identity, clothing, complete weapon/feet, no text. Keep originals/prompts/provenance.
- [x] Verify each image visually and RGBA bounds/uniquehash; add assettests appropriate to existing repository.
- [x] Add age/source/estate in details, recruitment andparty; controls obey lifespan. Memorial archive restores detail read-only and preservesgrowth/skillsource; notices dismiss once.
- [x] UI state updates after death/teaching, dead archived lord never treated as currentlyowned, dynamicnames all cities.

## Task6 QA, reviews and portable release

- [x] Focused taskreviews and fixes with regressions; final independent wholechange review, no unresolvedimportant findings.
- [x] Real UI desktop/mobile: oldmigration,60citysearch/travel/markets/guards, actualnewfighter victory, deathafter1day, multi-year mortality, livinglatecareer, unborn/child/read-only, memorizedarts afterteacher death, retry/checkpoint recovery.
- [x] FullVitest/tsc/build/local-server; record logs. Update1.0.0 package/lock/index/README/portableinstructions.
- [x] PackageWindows, run same scenarios offline, hashparity all distfiles/assets; only terminate testservers this task started.
- [x] Complete docs/checklists and deliver existing launchcmd path. Do not commit/push or launch visible windows unless requested.

## Preflight review

Tests require actual contracts, no snapshots that merely mirror production. Data/engine/UI ownership separate; root waits for shared interfaces and agenthandoff before editing thosefiles. Genuine0.8fixtures captured before expansion. Unknownbirths remain labelled estimates, currentdoc adopted刘谌234. Everyapproved feature has a task and verification entry.
