# 地方军府0.6 Implementation Plan

> For agentic workers: use dispatching-parallel-agents for independent asset tasks and rules; root integrates UI and verification. All work explicitly approved on2026-10-24. Preserve current checkout and uncommitted0.5 work; do not commit, push or create a clean checkout that omits it.

**Goal:** Deliver0.6.0 with72 independent city soldiers,13 historical profiles and16 new PNGs, recruitment, true NPC details and compatible local package.

**Architecture:** Immutable garrison templates and explicit commander windows extend the existing derived cityService. Shared catalog provides124 profiles including readOnly Himiko. Root uses calendar-aware appearance and a generic NPC viewer; no extra saved roster.

**Tech Stack:** Existing TypeScript/Phaser/DOM/CSS/Vitest, Python Playwright, built-in image_gen. No new dependencies.

**User steering during implementation (overrides original soldier recruitment steps):** Ordinary soldier profiles represent each city's army and are readOnly; only36captains recruitable. Base5000 percity, jointprefect/captain administration; captainjoining leavesvacancy/armyincity. Rootadded garrisonArmy.ts/test, garrisonView.ts and garrisonStrength.ts/test + garrisonCombat.ts/test (latter delegatedbackend) for troopcount/date changes and actualcombat pooledHP/attack/defense/sixattributes; noautomaticcitywartrigger. User confirmed monthly recruitment plus historical-war reductions and pooled combat strength on2026-10-24; existing monthly50/cap20k implementation retained. Backend enforcesreadOnly acrossall entrypoints, ordinarytroopsstay institutional-employedifprefectjoins, captaincanwait60.

## Global constraints and shared interfaces
- Approved spec docs/superpowers/specs/2026-10-24-garrison-characters-design.md is exact source for all12 career windows and commander bindings. 36cities/47roads/13provinces/16birthplaces retained.
-124 profiles=old39+13named+72garrison;37 HISTORICAL_CHARACTERS. Himiko only gallery, no interaction or recruitment. All old39 IDs/windows preserved.
- RecruitProfile extends category with 'garrison', adds `readOnly?:boolean` (Himiko true). Empty windows for Himiko. `recruitProfile`, `canMeetPerson` remain public. Root expects these exact fields.
- Existing `CityService`/serviceForPerson/cityServices/getRecruitmentThreshold/serviceLabel remain public. `GARRISON_PROFILES` can be plain data from garrisonData.ts; avoid runtime catalog cycles.
- Stable IDs garrison:{cityId}:soldier/captain; weapons spear/swordshield; speed11/12; portrait local-soldier-v1.png/local-captain-v1.png. Original72 identities persist via current party/relationships; no random replacement.
- All military employed80; ordinary/governing/waiting60. Institution-only employer without fabricated name is still80; owned concrete employer→waiting60. Date +party derive positions.
- Root owns characters.ts, unitFigure.ts/unitPreview.ts, UI and CSS. Root adds calendar-aware `getCharacterAppearance(id,date?)`, `getUnitAppearance(unit,date?)`, `getUnitModel(unit,date?)` and optional `CharacterAppearance.leftEyeCovered`. Rules agent must not edit these files.
- Two image agents own only asset files and their separate art manifests/tests. Rules agent owns historicalCharacters.ts/tests and backend; no UI changes. Asset agents send key outfit colors; rules agent initially uses spec colors and can align after reports.
- No worktree needed: user approved preserving current uncommitted workspace. No commit/push/deploy.

## Task1: Seven Cao/garrison images (asset agent A)
Files public/assets/characters/{xiahou-dun,xiahou-dun-uninjured,xiahou-yuan,cao-ren,cao-xiu,local-soldier,local-captain}-v1.png; docs/art/2026-10-24-garrison-cao-art.md; src/game/garrisonCaoArt.test.ts only.
- [x] Read imagegen and inspect existing GaoShun/ZhouTai/ChenGong art. One built-in tool call per image; request transparent fullbody, entire weapon, generous padding; no borrowed portraits or placeholders.
- [x] Write failing asset test first: for each expectedpath exists, PNG signature, portrait ratio and RGBA, distinct hashes. Run `npm test -- src/game/garrisonCaoArt.test.ts` RED.
- [x] Generate7 PNGs according to spec. Match same XiahouDun face/costume in uninjured edit/reference variant, retaining transparency. Copy final generated images into workspace, preserve original tool paths.
- [x] Inspect each file and alpha. Record full prompts, source/final paths, any selected edit and dimensions/alpha. Run targeted test GREEN. Do not modify shared profiles/UI.

## Task2: Nine other historical images (asset agent B)
Files public/assets/characters/{liu-biao,liu-zhang,zhang-lu,ma-teng,himiko,gongsun-zan,yuan-shao,liu-yu,zhang-yan}-v1.png; docs/art/2026-10-24-garrison-leaders-art.md; src/game/garrisonLeadersArt.test.ts only.
- [x] Read imagegen, inspect existing YuanShu/ChenGong/WangYun art; write asset test covering all9 paths, unique PNGs/RGBA/fullbody dimensions and observe RED.
- [x] Generate each independently using built-in image_gen; transparent fullbody and complete props, original face/silhouette. Himiko mature ancient queen, simple woven dress/beads/bronze mirror, no modern shrine maiden or fantasy magic. White military GongsunZan distinct from ZhaoYun; YuanShao goldenbrown distinct from YuanShu purple; LiuYu modest grayblue distinct from LiuBiao purple.
- [x] Copy9 files, inspect all and alpha, preserve sourcepaths/fullprompts in manifest. Run targeted test GREEN. No shared source/UI/profile edits.

## Task3: Rules/data/recruitment (backend agent)
Files careerData.ts, garrisonData.ts(new), cityService.ts/test, historicalCharacters.ts/test, recruitmentCatalog.ts/test, recruitment.ts/test, recruitmentSave.test.ts, growth.ts and state.ts only where save validation requires. Root owns combat.test.ts and UI.
- [x] Write RED tests for124 unique profiles,37 historic,72 stable garrison, allcities two, independent IDs/growth, unknownIDs rejected, exact13 profiles/12 windows, no Himiko canMeet/interact/invite even100, readOnly rejected from deployed/loadedparty.
- [x] Append13 named profiles with spec weapons/speeds/face-outfit identities. Preserve old24 entries and route leader lookup. Use exact16 image paths; no absence fallbacks. Observe existing historical count RED then update to37 and preserve assertions covering old profiles.
- [x] Add the12 career stage arrays exactly from spec, including YuanShao188 through189August, CaoXiu220 institution-only, Gongsun184 firstemployed, ZhangYan205 employed. No Himiko career.
- [x] Plain garrisonData generates72 profiles from WORLD_CITIES ×2, constant role appearance shared only by role. Explicit no-overlap commander array implements nine bindings in spec, independent of filtered cityServices. Never infer employer from same-city governing list.
- [x] Merge catalog old39+13+72, add category garrison/readOnly, canMeetPerson returnsfalse forreadOnly. Recruitment guards readOnly for partyinteraction and invite, deployment validates concrete allowed IDs. Growth migration accepts exact colon ID shape; state validation checks recruitProfile and notreadOnly so illegal cities/IDs do not load. Keep legacy ordinary IDs and levels unchanged.
- [x] cityService derivesgarrison employed/waiting/excluded pluscareer service, institutionlabel neverundefined. All date/party paths preserve60/80. Add regression tests: recruited commander leaves two waiting; bind switch188/193; unknown leader city retains80; ZhangYan/mateng proxy notcityruler.
- [x] Update old all-catalog recruitment save fixtures to skip readOnly and choose thresholds, while preserve explicit tests refusing60/79 employed. Verify old39 roundtrip and independent two-city soldier values. `npm test -- src/game/cityService.test.ts src/game/recruitment.test.ts src/game/recruitmentCatalog.test.ts src/game/recruitmentSave.test.ts src/game/historicalCharacters.test.ts`, may wait assets. `npx tsc -b`.

## Task4: Root appearance and NPC UI
Files characters.ts/tests, unitFigure.ts/test, unitPreview.ts, characterDetails.ts, partyPanel.ts, cityOfficeView.ts, scenes/BattleScene.ts (only date propagation), relevantCSS.
- [x] RED calendar test: getCharacterAppearance('xiahou-dun',{year:193,month:12}).portrait uninjured;194Jan wounded+leftEyeCovered; other NPCs and hero appearance unchanged. Implement pure optionaldate APIs and add date argument at thumbnail/preview/battle callers; draw left-eye cover consistently.
- [x] Reproduce existing unowned official/SunJian details fallback via UI before fix. Resolve historical or any catalog NPC into read-only display structure, no mutation/createProgress writes. Distinguish real combat enemyunit `enemy:*` from same-ID owned profile. Generic NPC details showtarget portrait/role/equipment/speed/service; party details keep real growth and battleHP.
- [x] Add gallery group地方军士 with cityselect andtwo roles, avoiding72single-rowbuttons. All37 historical gallery present. Himiko explicitreadOnlyreason and no invitepromise.
- [x] Add category/name/city search in recruitment with stableinput focus onrerender. windowLabel emptyreadOnly returns explicitnote; generic unavailable wording avoids pretending out-of-window is death. Local/allviews preserve existingbehavior, details return retainsfilter.
- [x] City roster separates garrison cards into地方驻军 for employed/waiting, sharesservice API. Maintains fullroster exclusions and correct threshold/focuslinks. Images lazy contain andfailurefallback, responsive no overflow.

## Task5: Root integrated QA, review and release
Files scripts/verify_garrison_characters.py(new), combat.test.ts, README/package/lock/index/package-local.mjs, persistentdocs.
- [x] Extend actual Playwright verify_h5/verify_city_offices helpers: asset16decode, all13book entries, two184guards all36cityfixtures, actual60/79refused→80invite/rosterremoved, othercityindependent, employeroverridewaiting60, yearbindings andXHD193/194picture, oldsave, reload.
- [x] Reproduce generic NPCdetails beforefix, thenverify guards/oldofficial/SunJian/SunCe/bandit correctid, no resource mutation, nestedfocus andsearch persist; Himiko100 stillnotinteractable and nofalseinvitehint.
- [x] Fivefighters traveler+captain+three newnamed actualvictory; ordinarytroops notdeployed, weapons/models, levelgrant andreserve unchanged. Keep sourcefrozen during this test topreventHMR; mobile844×390/390×844 bothviews andtouch/imagefail.
- [x] Independent reviewer read-only rules/UI/save/namespace/datecheck; address findings with meaningful regression. Full `npm test`, `npx tsc -b`, `git -c safe.directory=D:/games/ThreeKingdoms diff --check`.
- [x] Bump0.6.0, sync docs/title/localinstructions, `npm run build:local`, `npm run test:local`. Start owned18743portable server, blockexternalrequests `verify_garrison_characters.py --local`; load/reload/retreat smoke while actualwin remainsVite evidence. Compare16source/packageassetsha andversion. Stoponlyownedserver, preserveuser5173.
- [x] Checklists/logs/specstatus complete with actualevidence; final conciseChinese launchlink andartmanifestlinks. No commit/push/deploy.

## Verified outcome
2026-10-24: completed user-approved scope plus explicit army steering. 34 files / 299 tests passed; build:local, test:local and diffcheck passed. Full browser script passed16image decode, actual captain+historical five-person victory and reserve exclusion; portable --local blocked external requests and passed load/reload/retreat. Both phone layouts and actual touch passed; failed-image invitation fallback passed. All16 packaged PNG hashes match source. Independent review reported no P0/P1/P2 findings. All0.5dirty work preserved; no commit/push/deploy. Owned QA server stopped, user5173 retained.
