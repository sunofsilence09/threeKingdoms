# 群雄逐城0.7 Implementation Plan

> For agentic workers: use dispatching-parallel-agents for pure engine, personnel, and map/report UI; root owns state/time integration and acceptance. User explicitly approved entire spec on2026-10-24. Work in existing checkout preserving all0.6dirty work. No commit, push or deployment.

**Goal:** Persistent NPC campaigns that deduct real city troops, march/siege/conquer/retreat over game days, update encounters/officials/map and survive old saves.

**Architecture:** Pure world engine stores authoritative city/army stocks and independent RNG. Time actions call one bridge at their actual elapsed date. Personnel projection consumes the same world ownership, date and player party; UI never simulates on render.

**Stack:** Existing TS/Phaser/DOM/SVG/Vitest/PythonPlaywright; no dependency or imagegeneration tasks.

## Constraints
- Spec docs/superpowers/specs/2026-10-24-dynamic-conquest-design.md fully approved; no further approval questions.36cities47roads13provinces16birthsites124profiles unchanged.
- Base5000,monthly+50,citycap20000. Reserve2000,contribution<=60%,max2sources/army,max2armies/faction,max12globally,oneactivesiege/city,decisionevery30days,reportlast50. Defending15%bonus; fixedsaved RNG±10%;siege3—10days.
- NPC-only strategic war; playerfivefighters/route/trade/economy unchanged. OrdinarytroopsreadOnly, captain80/waiting60; ownedpeople neverreassigned. No newconquestplayercommands/forcedguardbattle/permanentNPCdeaths.
-0.6fixed futurehistorydeductions stoponcepersistentworldexists. Migration snapshotatthecurrentdate usesoldcountschedule, no replayfrom184. WorldRNGindependentjourneyseed; chunkedtimeequivalent.
- Historicalopening data is authored scenario, not exact borders; no 184adultSunCe/LiuZhang, noMaTengownsChanganfromcontact, noZhangYanownsJulujustbecausecontact. Foundationsonce and cannot override alreadyconqueredcities. Institutionscanmanagewithoutinventedpersons.

## Shared contracts (allagents follow exactnames)
Agentengine owns worldConflictTypes.ts/data.ts/worldConflict.ts, maysplitpureAI/settlement helpers. Types exported:
```ts
interface ConflictCity { factionId:string;troops:number;occupationDay:number;governorId?:string }
type ArmyPhase='assembling'|'marching'|'sieging'|'retreating'|'camped';
interface ConflictArmy { id:string;factionId:string;commanderId?:string;sourceCityId:string;targetCityId:string;troops:number;
 contributions:{cityId:string;troops:number}[];phase:ArmyPhase;path:string[];legIndex:number;legDay:number;phaseDays:number }
interface ConflictReport {id:number;day:number;kind:string;factionId:string;cityId:string;opponentFactionId?:string;armyId?:string;troops?:number;losses?:number;text:string}
interface WorldConflict {version:1;lastDay:number;seed:number;nextArmyId:number;nextReportId:number;cities:Record<string,ConflictCity>;armies:ConflictArmy[];
 founded:string[];nextDecision:Record<string,number>;reports:ConflictReport[];ledger:{initial:number;recruited:number;raised:number;losses:number}}
interface ConflictFaction {id:string;name:string;color:string}
```
Engine/data exports:
```ts
// worldConflictData.ts
CONFLICT_FACTIONS:readonly ConflictFaction[];
factionAt(id:string):ConflictFaction;
leaderForFaction(factionId:string,date:GameDate):string|undefined;
factionForPerson(id:string,date:GameDate):string|undefined;
// worldConflict.ts
conflictDay(date:GameDate):number; //same (year-184)*360+(month-1)*30+day-1 asrecruitment, no importcycle
createWorldConflict(date:GameDate,partyIds?:readonly string[],seed?:number):WorldConflict;
advanceWorldConflict(world:WorldConflict,date:GameDate,partyIds?:readonly string[]):WorldConflict;
isWorldConflict(value:unknown,date:GameDate,partyIds?:readonly string[]):value is WorldConflict;
armyRemainingDays(army:ConflictArmy):number;
```
GameState root adds `worldConflict?:WorldConflict` and `conflictRecovery?:boolean`; optionalallowslegacyinput, allruntimevalidnew/loadedstates initialized. Worldmodule imports GameState typeonly ornotatall. Never import runtime/state values fromengine.
Personnel agent extracts currentgarrisonArmy legacyalgorithm intogarrisonSchedule.ts and reexports samelegacy symbols fromgarrisonArmy; engineimports garrisonTroopsAt fromgarrisonSchedule toavoidcycles. Personnel's public functions:
```ts
interface PersonPosting {cityId?:string;factionId?:string;kind:'governing'|'employed'|'free'|'waiting'|'dispersed'|'campaign';office:string;title:string;employerId?:string;reason?:string}
personPosting(state:GameState,id:string):PersonPosting|undefined;
canMeetPerson(id,cityId,date,state?:GameState):boolean; //backwardcompatible3argstatic behavior; realUI passesstate
```
UI map extends optionalWorldMapOptions `worldConflict?:WorldConflict;date?:GameDate`; newpanel `showConflictPanel(onClose?:()=>void):void`. UImayreadruntimebutneversimulate. Rootstatebridge module `worldTime.ts` exports `withWorldDate(state:GameState,date:GameDate):GameState`, same-dateallowsinitializeonlyiflegacy; ifconflictRecoverytrue keepworldpausedwithouterasingplayerprogress.

## Task1: Purewarengine (agent A)
Own worldConflictTypes.ts,worldConflictData.ts,worldConflict.ts,optionalpurehelpers,worldConflict.test.ts anddatahistoricalsource doc. No state/travel/recruitment/UI edits.
- [x] RED tests for create36citiesbase5000, uniquefactions and valid184opening, snapshotscurrentdateoldcounts, same-seed/daychunking, saveclonecontinuation; testinvalidworldshapes.
- [x] Declarecontracts exactlyabove and buildauthoredstages fromexistinghistory/careerdata. Hist sourcesalreadyin0.6spec; preserve honestgame-layout qualifiers. Treat institutionsfallback; captainsneverarmycommanders (theymanagehome), actualhistcommanders cannotbeinparty oranotherarmy. Ledgerrecordsfinitefoundingarmies exactlyonce.
- [x] RED campaign test fixture: establishweakenedopponentneighbor, enough2friendlysources, dispatchdeducts<=60%reserve2000; cannotuseunfriendlypaths. Minimal decisionengine monthly stableorder/savedRNG andone/two/globalcapacity.
- [x] Implementassembly timing, adjroadmarch, arrivalcurrentownercheck, siege3—10days anddeterministiclosses. Victorytransferssurvivors/residualretreat, defeatwithdrawsalongfriendlypaths, campifnocapacity, dissolveifnobase. No instantreturn/copytroops/negativecounts.
- [x] Dailyloop stableorder monthlyrecruit/foundation→movement/settlement→decisions. Skipfuturefixed0.6events. Capreports50andarmies12; add ledgerconservationassertions initial+recruited+raised-losses=sumcity+armies, evenfullcap/thirdparty/sourcecaptured/twowaves.
- [x] isWorldConflict validates36exactcitykeys,knownfactions/people/armyIDs/pathadjacencies,integercounts/date,uniquecommander/excludesparty,validseed/counters/reportfields/stageIDs. No allownullprototypekeys/NaN/garbage. lastDay<=currentdate (behindstatecanbeadvancedbyroot), neverahead.
- [x] Timebound simulation184—200 foratleastoneoccupation, nohang/noendlessmarch; chunkedlongjump equivalent aftermid-save. Expose fixturefriendlydispatchfunction onlyifneededbytests/UIQA,documentitsname/signature. Run targetedVitest/tsc, reportinterfacesearly.

## Task2: Dynamicpersonnel & garrison (agent B)
Own garrisonSchedule.ts(extract),garrisonArmy.ts/test,personPosting.ts/test,cityService.ts/test,recruitmentCatalog.ts(canMeetonly),recruitment.ts(interactguard/timehandledroot),recruitmentView.ts/test,partyPanel.ts,characterDetails.ts onlypostingnotice. Rootownsstate/travel/runtime/worldTime; UIagentownsmap/Overworld/cityPanel/garrisonView/cityOffice.
- [x] Firstextractlegacycount unchanged withsameexports, tellengineagent fileavailable. No newworldsim here.
- [x] RED conqueredcity test showsauthoritativecitytroops/faction, captaininstitutionownership changes; anoldgovernmentdoesnotremaincurrent,ownedcaptainstillvacant. Preservebaseformulaonlyifworldabsent/recovery.
- [x] personPosting centralresolver: datedprofileactivity →partyexcluded →campaigncommanderabroad →citygovernorassignment →faction-ownedpreferred/nearestcity →dispersedifnobase. Never guesscapturedcityownsallvisitingNPCs. Preservefree/nonofficepeople originalwindows ifnotaffiliated, keepHimikoreadOnly.
- [x] DynamiccanMeet fourthstatearg,serviceForPerson,getRecruitmentThreshold,actualinvite/canInteract,filterRecruitProfiles andallrealUI queries useposting; historical3argcanMeet staysforlegacywindowtests. Keepactualarmycommandernotinvitableincitywhilecampaigning. Memberalreadyownedcanstillinteractincity.
- [x] CaptainstablecityID,noauto-replacement; originalgovernorowned→waiting60untilenemyoccupationsetsnewinstitution→80. Ordinarytroopsremainreadonlyinallstates. Realgovernornameonlyifvalidactiveandnotowned; proxyinstitutionsotherwise.
- [x] All-personwindowUI showscurrentposting/reasonseparatelyfromhistoricalreference, usesactualcityforsearch anddetailservice; nofakehistoricalappointmentclaims. Ownedpeoplealwayspartyneverreassigned; existing37history/124catalog intact.
- [x] Tests lostcityretreat/foreignpreferred/campaign/no-base/thirdparty/ownedcommander/captainroundtrip, readonlyand60/79/80preserved. Existingstatic0.6tests no-worldfallback retained, dynamictestfixtures explicitworld. Avoideditingstate/timeownedsources.

## Task3: Map,armies,warreports UI (agent C)
Own worldMapView.ts/worldMap.css,new conflictPanel.ts/conflictPanel.css,newconflictView.test.ts pureviewhelpersifneeded,scenes/OverworldScene.ts,cityPanel.ts,garrisonView.ts,cityOfficeView.ts. Noengine/state/recruitment orpersonnelmodule edits.
- [x] InspectexistingUI; usecontractsabove. Unit-testformatting/filters meaningful; actualUI verifiedrootPlaywright.
- [x] Map36citynodes factioncolored+abbr+troops (labelsnotcoloronly), selected/current/route preserved, outsidearmyarrow/markers accessibledata-army-id. Tooltips showarmy source/target/faction/count/stage/ETA; retainszoom/pan/layersandprovince/mountains. No imagesnew.
- [x] conflictPanel readsruntime, showscities/factionlisting, armies andlast50reports, mobileresponsive. Dateformatter conflictDayintegerrelative184Jan1; donotdisplaywrongmonth31. Selectors `.conflict-panel`, `[data-conflict-city]`, `[data-conflict-army]`, `[data-conflict-report]`; tabsbuttons 城池势力/在外军队/天下战报. Buttonid `world-conflict` inOverworld.
- [x] Overworld passesworld/dateinto map, showscurrent/destinationownershipandimportantlastreportnotice (notpopupspam). onClose rerenderswithoutadvancingtime. Citypanelheader showsowner; garrisonView actualcounts/currentgovernment/inflight/under-siege (usepersonnelupdatedcityGarrisonfields), oldstaticfooterwording corrected.
- [x] conflictRecovery banner ifstate.flagtrue, disablewarpanelnormalworld; explicit“重建天下局势（保留人物与行旅）” callback setsworld=createWorldConflict(currentdate,Object.keys(party)),conflictRecoveryundefined; avoidsaveauto-reset. Playercanreadoldprogresswhileworldpaused.
- [x] ConflictthemedUIusesexistinglightpaperandcoloredflags, phone844×390/390×844nooverflow, focus/closeEsc viaopenInspection andimage/empty states safe. No real-time simulation onopen/render.

## Task4: Rootstate/time andmigration
Own state.ts/runtime.ts/worldTime.ts/newworldTime.test.ts/newworldSave.test.ts,travel.ts,recruitment.ts onlyclockcalls(coordinateagentB),testsfixturesneededforschema. No UIagentownershipexceptintegrationfixesafterreport.
- [x] RED tests: withWorldDate duplicate-dateidempotence,initlegacyatcurrentdate,advanceactualelapsed,worldpausedincorruptrecovery. MissingmoduleRED thenminimalbridgecallscreate/advance withpartyIds andpreserveseeds/economy/party.
- [x] FactorynewstatehasworldConflict fromdate+party; runtimeinitnormalizesload. loadStatelegacynofield⇒snapshotoldcurrentdategarrison, preserveallresources/activejourney/battle. Existingvalidworldloadadvancesonlyifbehind, skipsalliflastDaydateequal.
- [x] Badnewworld⇒backuprawat `${STORAGE_KEY}:conflict-backup`, preservebaseRPGprogress, conflictRecoverytrue andnoinitializedwars. PersisterrormarkeruntilUIrebuild; no silentnewgame/dataerase. RequirebaseRPGshapevalidstill. Testbackup+reload+explicitrebuild.
- [x] ApplywithWorldDate toalltimemutations:state.completeJourneyTask/completeLocalEscort, travel.advanceTravel(actualelapsedincludingearlyarrivalreturn),resolveTravelEvent,finishTravelBattle,restInCity,recruitment.interactPerson. PureadvanceDaysremainscalendaronly. AvoidruntimehiddenAIhook, noadvancement wheninspecting/changingparty/trading.
- [x] Checkall`advanceDays`/`date:` writes repo. Existing0.6testfixturesmanuallysettingfuturedate shouldremoveormatchworldsnapshotwhencheckingmigration; donotweakenproductionvalidationtopleasefixtures. Legacy3argwindowtestsstaystatic. Compareordinary0.6resultfieldsandjourneyRNGunchanged.
- [x] Unitbaseline299+newengine/personnel/savetests,tsc; resolvecycles viaonlytypeGameStateimports/world puredata. Reviewagentsource integrationandown meaningfulregressions.

## Task5: Root QA, review andrelease
Own scripts/verify_dynamic_conquest.py,README/package/lock/index/package-local, persistentdocs.
- [x] PlaywrightrealUI:0.6legacyfixturemigrationpreservescoins/cargo/party/relationships/journey; worldonceinitializedreloadsameseed/citycounts. Fixturecampaignneararrival thenactual1daycityrest→occupation andmatchingmap/citygarrison/personposting/report. Actualtravelclock/interactionclocksameworldadvance.
- [x] Checksource deductions,armyphase/ETA,reportvictory/defeat/return,varytargetownershipandlast-dayreload. NPCnamedcommanderownedremainsintheplayerparty/noavatararmysimuldup. Captainat80invitesafterwar,butordinarytroops/Himikostillreadonly.
- [x] Mapclick,panning,current/destinationownershipnotice,listtabsfilter,closefocusandphonerealtouch; corruptworldrecoverypreservesRPGprogressandrequiresrebuildclick. Snapshotartifacts/dynamic-conquest.
- [x] Independentread-onlyreview aftermajorintegration,fiximportantfindingswithregression; fullnpmtest/tsc/buildlocal/testlocal/diffcheck. Keepbrowserfights orlongUIflows sourcefrozen.
- [x] Bump0.7.0,docsscopehonestlyNPC-onlydynamics andauthoredhistoricalopening; packageportable18743ownedserverblockexternalandrun--local; verifyfilesversionandstoponlyownedQAserver/preserveuser5173. Completechecklistswithactualevidence, finalconciseChinese launchlink. No commits/push/deploy.

## Acceptance evidence
Completed2026-10-24:40files345tests; production build and portable server test passed. Developer and external-network-blocked portable browser acceptance passed including real siege/capture/defeat/road return, dynamic personnel, legacy migration/recovery, map/filter/nested focus and phone touch. Independent final review has no open P0/P1/P2.92existing public assets match packaged SHA256. No commit/push/deploy; see progress.md for full evidence.
