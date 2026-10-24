# 城府宾客0.5 Implementation Plan

> Agentic execution: dispatching-parallel-agents for the three independent tasks below, root integration and requesting-code-review. User explicitly approved the complete spec and80-affinity rule; do not ask again.

**Goal:** Ten illustrated commodities, six complete historical people, city offices and employment-aware recruitment, with Shouchun/Xiapi and old saves intact.

**Architecture:** Immutable career stages produce one city/service state per person from date and saved party; no duplicate mutable roster. Catalog windows derive from the same stages. Goods artwork is metadata, and UI reuses pure services and threshold functions.

**Stack:** Existing TypeScript/Phaser/DOM/CSS/Vitest/Python Playwright and built-in image_gen. No new dependencies, commits or push.

## Global constraints
- Approved spec docs/superpowers/specs/2026-10-24-city-offices-design.md; retain all0.4.1 uncommitted files.
- 39identities,36cities,47roads,10goods,16newimages. Existing13province/16birthsites remain.
- Employed80, ordinary/governing/free/waiting60; recruited people removed from city service. Recruited employer leaves dependents waiting at the same city.
- All six new IDs, exact career windows, true employer titles and unknown official vacancies follow spec. No invented salaries or AI migrations.

## Task1: Goods illustration (independent agent)
Files: public/assets/goods/*; src/game/economy.ts, economy.test.ts or newgoodsArt.test.ts; docs/art/2026-10-24-goods-art.md. Root owns cityPanel.ts/tradeUi.css.
- [x] Read imagegen skill and inspect reference art; generate10separate square transparent PNGs grain/cloth/salt/iron/pottery/tea/herbs/silk/wine/leather-v1.png, save final workspace copies and source paths/fullprompts.
- [x] First write failing metadata/asset tests, then add `image:string` toGOODS records without changing IDs/prices or existing economic state. Test each named commodity has an existing distinctfile and no SVG substitutions.
- [x] Add CITY_GOODS entries shouchun:{grain:.7,wine:.8,silk:1.25},xiapi:{cloth:.75,pottery:.8,iron:1.25}; root will add world city IDs. Do not mutate old city quotes.
- [x] Inspect10finals for identifiable objects/no UI/no text and preserve alpha. Report chosenimagefields early, run targeted tests. No city UI/state/catalog edits.

## Task2: Six historical portrait/profiles (independent agent)
Files: historicalCharacters.ts, historicalCharacters.test.ts, public/assets/characters sixPNGs, docs/art/2026-10-24-city-characters-art.md. Otheragent owns recruitmentCatalog/windows.
- [x] Write profile tests RED for new6and24historical total, then append six full profiles (yuan-shu,chen-gong,zhang-miao,gao-shun,zhou-tai,han-dang), preserving old18 identities and routeleader resolution.
- [x] Six independent fullbody transparent semi-realistic PNGs using image_gen, no substitutes or borrowed portraits, copy into public/assets/characters/{id}-v1.png, record prompts/source paths.
- [x] Suggested existing weapon/model pairs: YuanShu sword/tyrant; ChenGong scroll/strategist; ZhangMiao sword/greeting; GaoShun swordshield/sentinel; ZhouTai glaive/bruiser; HanDang bow/archer. Colors match spec and paintings, speed balanced14/11/11/12/15/14.
- [x] Profiles/bio distinguish history from fictional city appointment; do notedit careerData/catalog/recruitment. Coordinate IDs with serviceagent. Test oldappearance and assets oncegenerated.

## Task3: Career and recruitment rules (independent agent)
Files: careerData.ts,cityService.ts,cityService.test.ts,recruitment.ts/test,recruitmentCatalog.ts/test,recruitmentSave.test.ts (only fixtures requiring80). Root owns state andUI.
Exact sharedinterface:
```ts
interface CityService { personId:string;cityId:string;kind:'employed'|'governing'|'free'|'waiting';title:string;office:string;employerId?:string;employerName?:string }
serviceForPerson(state:GameState,id:string):CityService|undefined;
cityServices(state:GameState,cityId?:string):CityService[];
getRecruitmentThreshold(state:GameState,id:string):number;
serviceLabel(service:CityService):string;
```
- [x] careerData exports CITY_CAREERS Record<string,readonlyCareerStage[]>; plain data, no runtime catalog/recruitment imports. Stage fields year/month inclusivefrom/to,cityId,kind,office,title,employerIdoptional. Match approvedspec exactly.
- [x] Tests RED for unique city per date, threshold60/79refused80accept, date/window andpartyexclusions, employeralreadyowned→waiting60, governorsnoselfhire, roundtrips preservegrowth/affinity. No newpersistentfields needed.
- [x] Catalog derive new6windows fromcareerdata; keep existing33windows and IDs. Root adds shouchun/xiapi nodes; historicagent adds6profiles. New39count tests canwait these tasks.
- [x] invitePerson enforces dynamic threshold; existing constants60remainordinarydefault. Export functions throughcityService (root imports there). Avoid runtimecycles: careerData cannot import catalog; cityService can readcatalog andtypeonlyGameState.
- [x] Fullrecruitment testfixtures invitingallcatalog at60 mustusegetRecruitmentThreshold, plus explicitnegative80 tests. Run targetedtestsafterotherprofiles land. No UI/world/art/economy changes.

## Task4: Root geography and UI integration
Files: world.ts/world.test.ts,localOfficials.ts/test,cityPanel.ts,partyPanel.ts,characterDetails.ts,tradeUi.css,README/package/scripts.
- [x] Firsttestnewcities,47connectedroads, old34market/ongoingjourneyload and correctoffice titles. Append shouchun116.78,32.58(yang九江郡),xiapi117.95,34.10(xu下邳国), original42roadsretained plus spec5roads (allroadcorridors, approximateindependent points). Allpairsconnectivitytests reused.
- [x] Local unknownslot titles support郡太守/国相/尹 without inventednames. Forbothnewcities oldrecordsnotextrapolated.
- [x] Commoditycard headimage usesgood.image in marketandcargo, alttitle/lazy/objectfitcontain and[hidden]failureoverride, responsive72—96px. No changes totransactions.
- [x] Newcitytab府署名册 usescityServices +recruitProfile: groupsgoverning/employed/free/waiting, showsrole/office/employer/affinity/threshold andportrait; detail and交流 openexistingdialogs. Onclose recompute, partyexcludesimmediately.
- [x] partyPanel allintro/card/buttons usegetRecruitmentThreshold,serviceLabel. Add optional3rdoptions `{initialPersonId?:string}` toshowRecruitmentPanel forfocusedcityentry; maintainexistingcombatsecondarg. CharacterDetails showservice forunownedhistoricalperson, exactthresholdhint; ownedstateunchanged.
- [x] Rootdoesnot duplicate service rules or fake concretegovernor names intohistoricalregister.

## Task5: Root validation/release
Files: scripts/verify_city_offices.py,package/lock/index/packagelocal, persistentdocs.
- [x] Real UI10image decode/allcardvisibility/fallback, sixpeople/details; at least ChenGong60/79disabled→80invite, employerhiredparty removesroster, ordinary60unchanged, date/year/newcitytravel/load, phonebothsizes.
- [x] Real five-person combat includingnewcharacters, properweapons/models andreserve exclusion. Reuseverify_h5 actualpointerplanner; avoid sourceedits/HMR whilefightactive.
- [x] Independentreview: fiximportantfindings with regressiontests. npmtest,tsc,buildlocal,testlocal,diffcheck. Bump0.5.0, preserveolderuncommittedwork.
- [x] Portablepackagedserver owned18743 process, blockexternalnetwork andverify; inspectimages/screenshots andstoponlyownedserver. Artmanifests andfinalbrief withlaunchlink.

## Verification outcome
2026-10-24: all approved tasks completed. 27 test files / 253 tests passed; build:local and test:local passed. verify_city_offices.py passed actual five-person victory on Vite and all offline portable checks with --local (load/reload/retreat). All16 local PNGs inspected; 844×390 and390×844 layouts passed. Independent review found no P0/P1/P2 issues. Full regression caught and fixed 南郡太守 title shortening. Existing0.4.1 work and all42original roads preserved. No commit, push or deployment.
