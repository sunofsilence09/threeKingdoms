# 1.1.0 Sound, Governors and Talents Implementation Plan

> For agentic workers: use subagent-driven-development for independent owned tasks, TDD, focused task review and a final independent whole-change review. Human requested the upgrade and confirmed original-prefect fallback; execute continuously without another permission gate.

**Goal:** Deliver1.1.0 with varied attack sound,60unique city governors and successors,32new historical people/portraits and effective individual six-attribute talents, preserving1.0campaign progress and the Windows portable package.

**Architecture:** Keep cultivation ledger compatibility and derive effective attributes from immutable identity talents. Resolve governors from dated factual candidates or stable generated original identities; persist assignments and lives separately from troops/RNG. A local WebAudio sound bus consumes emitted combat events, never game randomness.

**Tech Stack:** existing TypeScript/Phaser3/Vite/Vitest/Python Playwright; built-in imagegen for40new individual PNGs; original locally generated or synthesized audio, no new runtime dependency.

## Global constraints

- Work inD:/games/ThreeKingdoms branchcodex/sound-governors-talents-1.1; baseline9ef51af. Preserve existingprogress.md. No unsolicited commit/push/deployment.
- Keep60cities/92roads,184—310calendar, fixedbirth/death±5, adult16,5person battle, party/memorial growth, markets/world troops and original RNG streams.
-32historical new IDs: dian-wei,xu-chu,zhang-he,xu-huang,yue-jin,yu-jin,guo-jia,jia-xu,cheng-yu,chen-qun,ma-chao,huang-zhong,wei-yan,pang-tong,fa-zheng,lu-su,lv-meng,gan-ning,taishi-ci,huang-gai,kong-rong,tao-qian,wang-lang,shi-xie,liu-yao,huang-zu,gongsun-du,han-fu,zhang-yang,hua-xin,zhao-yu,liu-chong.
-105historical/story named people and individual native arts;1shared original-prefect art.32unique historical PNGs plus8original-role PNGs, all fullbody transparent and independently inspected.
- Original IDs useprefect-<cityId>-<factionId>-<appointedYear>-<serial>, strictly validated against existing cities/factions/year and bounded serial. Pure identity derivation is versioned and stable; no live global profile registry.
- Cultivation storageattributes10…30remains original ledger, effective=talent10…18+(ledger-10), maxbase+20≤38. UI shows base+cultivation, points remain3/level. Preserve1.0active battle stats until completion, next encounter uses new talents.
- Node:C:/Users/silence/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe. Python:systempython withPlaywright/Pillow. Skills/research source notes required for uncertain life/term data.

## Task1: audio (independent worker)

Files owned:newbattleAudio.ts/audioSettings.ts/audioCues.ts and tests, newpublic/assets/audio if used, battleCommands.ts/css, startMenu.ts/css, BattleScene.ts audio integration. Root/attributes worker must not edit these files without handoff.

Interface:exportpureaudioCuesFor(events:readonlyCombatEvent[],units:readonlyCombatUnit[]):AudioCue[]; sharedsound settings get/set; event bus play/stop with guardedAudioContext. Exact public naming can be reported at handoff, scene integration belongs worker.

- [x] RED cue tests:weapon-dependent attack, miss not hit, fire/burn distinct, repeated presentation/restore no replay; preferences clamp/validate and persist independently.
- [x] Implement layered varied original offline sound, mastergain/mute/volume UI. Resume only on gesture, disable safely when unavailable; cancel queues on scene shutdown/background; capvoices and use independent randomness.
- [x] ConnectrecordEvents for actual player and enemy actions, native arts/duels included; ordering and deduplication keep combat state untouched.
- [x] GREEN focused tests; render settings on phone; manual/headless captured audio signal check and human-audition artifacts. Review lifecycle and clipping/volume.

## Task2: talents and UI (independent worker)

Files owned:newcharacterTalents.ts/talentData.ts and tests, attributes.ts helper additions,growth.ts only if genuinely needed,combat.ts,garrisonStrength.ts/garrisonCombat.ts as needed,martialCombat.ts,characterPanel.ts,characterDetails.ts,heroHud.ts,partyPanel.ts, relevant tests. Do not editstate.ts/personLife.ts/worldConflict*.ts; tell root exact reward changes.

Interface:`baseAttributes(id:string):Attributes`;`effectiveAttributes(id:string,cultivation:Attributes,version:1|2=2):Attributes`. Prefixprefect- gets deterministic civic talents10…14 without importing runtime state. New32IDs must have authored talents. Ordinary soldiers/captains get distinct role bases; troop totals use the same soldier base.

- [x] RED real differences:刘备charisma≥17,关张strength high,诸葛intellect high,蔡琰different from孙尚香; cultivation increments preserved and raw ledger staysvalid.
- [x] Create authored talents for all existing/newnamed IDs, initial3, bandits/garrison roles. Pure unknown-ID fallback10, no gender-wide blanket template.
- [x] Apply effective attrs consistently in previews, enemy/duel and combat; expose state/battle attributeVersion marker: missing1.0snapshot meanslegacy1, new combat2. Do not rebase activeHP/RNG midencounter.
- [x] UI base/training/current/cap and battlelegacy note; preserve modal parents. Return root reward callsites with version handling so XP/supplies use same stats as actual encounter.
- [x] GREEN meaningful gameplay/ledger/memorial tests and reviewall attributes use sites.

## Task3:32roster/source data (independent worker)

Files owned:newv11Data.ts/v11LifeData.ts/v11MartialData.ts, historicalCharacters.ts/careerData.ts/personLifeData.ts/martialCatalog.ts data integration and focusedtests,docs/research/2026-10-25-v11-people.md. Root owns recruitmentCatalog and dynamic-prefect integration; worker leaves placeholder art paths but no fake PNGs.

Interfaces:`V11_CHARACTERS readonlyHistoricalCharacter[]`,`V11_CAREERS Record<string,CareerStage[]>`,`V11_LIFE_BASELINES readonlyLifeBaseline[]`,`V11_GOVERNORS readonlyGarrisonCommander[]` data-only type imports. ExtendCareerStage with optionalfactionId and populate new stages; root resolves this before employer recursion. MartialForPerson dynamic fallback handled root after data handoff.

- [x] RED95historical/105named life/105individual arts before sharedprefectart,32exactIDs/source bounds/known vsestimatedyears/career cities and held positions.
- [x] Primary-source research all32; fixedDOB,±5deathbase, source flags and adult/activity stages. No birthyear guessed as fact; never infer tenure from death alone.
- [x] Distinct art paths/assets/characters/<id>-v1.png, attire/model/weapon/color, nativeart named and sourced to actualperson/storyboundary using existing11templates.
- [x] Export dated governor candidates only with sources; governing vsregentvsruler titles remain factual. Unknown histories do not invent certain terms.
- [x] GREEN directory/source tests, update owned obsolete counts; root generates images. Release data ownership before root integratesdynamiccatalog.

## Task4: governors, life and saves (root)

Files:newprefectIdentity.ts/prefectProfiles.ts/governorAssignments.ts or equivalent focused modules;worldConflict.ts/types/data,worldTime.ts,personLife.ts/lifeTypes.ts,state.ts,recruitmentCatalog.ts,personPosting.ts,cityService.ts,governor UI adapter.

- [x] Capture tracked1.0fixture before mutation. RED60governors unique/alive/adult/notparty/notarmy, originalfirstappointments stable afterreload, actualnewpeople originalart distinct labels.
- [x] Pure original identity parser derives name/birth/deathbase/gender/roleportrait from immutableID. Mutable serial/assignment saved in strategicversion3, never use battle RNG. Faction recorded inID, currentappointments independent of historical originaloffice.
- [x] Retain a valid original governor between dated candidate transitions; a factual candidate may replace an original at the conservative window start and is replaced at window end, preserving former identities. Prefer dated factual candidates or qualified current-faction available people, fill remaining with originals. Candidate cannot duplicate another city or activearmy. Conquest/hiring/death vacates and refills without moving troops or flags. Hiring may immediately refill via bridge.
- [x] Life baseline/status recognizes valid dynamic IDs; missing original draw derives from life seed deterministically without mutation and is persisted by bridge before save. Expand validation to required static catalog plus known valid generated entries, preserve all valid73draws and grownmemorials during32catalog addition.
- [x] Dynamicprofile fallback resolvable fromID without globalruntime imports; all-profile listing adds current/former generated identities fromstateworld/life/party, localviews show currentgovernor. Originalofficials recruitable, have common安郡 martial, sources clearlygamefiction.
- [x] Worldversion2→3 retains original60cities/troops/path/RNG/ledger; onlyadds explicit appointments/serial metadata. Recovery and onetime fullbackup preserve activebattle and partialmodules.
- [x] Effective XP/supply rewards use same attributeVersion as battle, includingtravelbattles; noncombatwork rules unaffected. Baseline cultivation ledger/points/memorial stays byte-equivalent.
- [x] GREEN genuine1.0migration/currentbattle/invalidmodule/long184–310simulation and massinvitation/death uniqueness tests.

## Task5:40portrait assets (root, thenartworker afterdatahandoff)

- [x] Inspect existingzhou-yu/cao-ren portraits and imagegen skill; generate each32newhistorical and8civic templates separately. Fullhead/hands/feet/weapons,transparentalpha,uniquefaces/colors/poses, no text/background.
- [x] Keep original files and exactprompts+sourcepaths; copy topublicassets. Civictemplateslocal-prefect-1-v1.png…8 (6male2female) never presented as historicalidentity-specific images.
- [x] Read-onlyPillow audit all40uniquehash/RGBA/corneralpha/effectivebounding margins; independent visualcheck eachasset. Repair usingimagegen if needed.

## Task6: review, UI/audio QA and local delivery

- [x] Focused task diff reviews, rootintegrationselfreview, fresh independent finalwholechange review; fix allrealP0/P1/P2withregressions.
- [x] Real1440desktop/390portrait/844landscape:startmenu/volume/mute persistence, attack sounds and sequence, exactpointer stability, new32profiles and images,60governor listings, recruit governor→successor, death→successor, factioncapture→successor, oldXP/points/memorial and snapshotresumption.
- [x] FullVitest/tsc/build/server tests, prerecordedWAV/webAudio capture nonzero/varied/clipping tests plus exported audition files and real browser playback capture; subjective human listening is not claimed. No remote requests offline.
- [x] Versionpackage/lock/index/README/startmenu/portableinstructions1.1.0, package withbundledNode, hashall dist/www, offlinecoreflows; only clean this task's servers, preserve user sessions.
- [x] Update task_plan/findings/progress and deliverexistingrelease/三国行旅-本地版/启动游戏.cmd. No commits/pushes/deployments requested.

## Preflight self-review

Audio and attributes own disjoint production files; root holdslife/world/state and updatesreward lines after worker handoff. Roster data adds only facts and optionalfactionId, not dynamic appointments. Original identities parse without mutable globalregistries, preserving puretests and savevalidation. Every userrequirement has a concrete test group and local delivery task.


## Final evidence

577 Vitest tests passed, TypeScript and Vite build exit0, portable server1test passed. Independent final reviewerAPPROVE (24 additional focused tests). UI1440/390/844 passed; genuine old1.0scene uses45XP; all40newimages decoded. Production portableoffline test:0external requests and0pageerrors; all161 buildfiles match packageSHA. Audio audition files and real WebAudio recording provided under artifacts/audio-v1.1; no claim of a human listening review. Full result JSON:artifacts/v11-final-tests.json, v11-assets-audit.json, v11-package-verification.json, v11-governors/results.json, v11-offline/results.json.
