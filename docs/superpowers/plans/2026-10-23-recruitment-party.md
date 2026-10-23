# 全人物亲密度招募与五人队伍 Implementation Plan

> **For agentic workers:** Execute task-by-task with TDD; dispatching-parallel-agents permits independent catalog and combat tasks. All work remains in the existing workspace to preserve uncommitted 0.2 assets.

**Goal:** 全部既有人物可通过60亲密度招募，管理最多5人出战与候补并实际影响战斗和成长，交付0.3.0。

**Architecture:** recruitmentCatalog提供全部角色和门控；recruitment纯函数管理关系与阵容；growth支持动态保存成员；combat接收出战名单。队伍/招募界面通过现有inspection生命周期嵌套，state和Battle统一结算本场名单。

**Tech Stack:** TypeScript / Phaser / DOM / Vitest / Python Playwright，复用本地图片，无新增运行依赖。

## Global Constraints
- 用户最新修订：所有角色可招募，亲密度达门槛邀请，最多5人含主角；覆盖人物志、官员、山贼及孙坚孙策。
- 亲密度0..100、招募60；talk+8、meal+12花1军需、help+10；每人每日一次，互动均推进1日，邀请不另收费。
- 姜垣固定，招募先进候补；战斗与未处理途中事件锁阵，旅行途中其余时刻可改下一战名单。
- 名将同行为架空分支，出生/活动/已故门控不伪装精确历史驻地；未知画像不得借别人冒充。

### Task 1: 全人物目录（独立代理）
Files: src/game/recruitmentCatalog.ts, recruitmentCatalog.test.ts, docs/art/2026-10-23-recruitment-history.md, public/assets/characters/neutral-official.svg（必要时）。
API: RecruitProfile{id,name,role,bio,portrait,weapon:ModelWeapon,speed,appearance:CharacterAppearance,category:'initial'|'historical'|'official'|'bandit'|'leader',windows:RecruitWindow[]}; RecruitWindow{from:{year,month?},to?:{year,month?},cityIds:string[]}; RECRUIT_PROFILES:readonly RecruitProfile[]; recruitProfile(id:string):RecruitProfile|undefined; canMeetPerson(id:string,cityId:string,date:GameDate):boolean。
- [x] 写覆盖所有既有人物、唯一ID、成人/已故门控、34城有效位置的失败测试并运行。
- [x] 实现目录和门控，复用全部现有图片与造型，给孙坚孙策本人中性图形头像；资料记载不确定性和游戏窗口分别记录。
- [x] 测试通过，向集成方返回ID/API及限制；不编辑其他文件。

### Task 2: 动态战斗与五人规模（独立代理）
Files: src/game/combat.ts, combat.test.ts, characters.ts, heroVisuals.ts, battleBoard.ts（必要时）。不改BattleScene.ts，根代理负责队列和场景快照。
API: createCombatState(route,party,mode,deployed?:string[])。party为Record<string,Progress>，默认仍PARTY_IDS初始三人。使用recruitProfile读取新角色姓名/速度/武器。WeaponId扩充现有ModelWeapon全部14种，现有五种数值不变。新增makePartyUnit(id,progress,route,mode,x?,y?)供候补能力预览。
- [x] 先写真实五人生成、候补缺席、武器射程/速度、敌方数量/ID不冲突、合法站位与胜负失败测试。
- [x] 实现1..5名战斗角色和最多5名敌人；招募山贼头目与同名敌实例并存时敌实例ID加enemy:前缀，外观按原人物解析。兵器外观与实际装备一致。
- [x] 保留旧三人默认行为/全部旧combat测试，新增测试通过。不要改growth/state/UI，提前创建契约可等待目录代理落盘。

### Task 3: 关系、阵容与存档（根代理）
Files: growth.ts, state.ts, travel.ts, recruitment.ts及tests。
API: GameState新增deployed:string[]、relationships:Record<string,Relationship>、battleParty?:string[]；Relationship{affinity:number,lastInteraction?:number}（游戏日序号）。PartyId改string，PartyProgress=Record<string,Progress>，仍必须保留初始三人成长。关系初始主角100、阿满及陈达60；出战默认初始3；成员是party的keys。
函数：interactPerson(state,id,kind:'talk'|'meal'|'help'):GameState；invitePerson(state,id):GameState；setDeployment(state,ids:string[]):GameState；canManageParty(state):boolean。每步验证时间地点、battle/event锁定，遇曹孙刘写met对应标记。双方同意后邀请一次入候补，不重置成长。
- [x] 先写门槛、每日限制、免费互动、库存、日期地点、重复邀请、动态阵容、旧档迁移与非法保存测试，观察失败。
- [x] growth改为所有成员遍历并保持旧档三人；state校验与迁移成员/关系/名单；本场奖励只循环battleParty或deployed，结束清快照。
- [x] 旅行战奖励同样按快照结算，不给候补经验和政略收益。

### Task 4: 队伍、招募与角色面板（独立UI代理，在API确定后启动）
Files: partyPanel.ts, partyPanel.css, characterPanel.ts, characterDetails.ts；根代理接Overworld入口与Battle队列。
- [x] 招募面板提供本地人物与所有行踪，展示亲密进度/门槛/互动成本，邀请后候补；所有按钮消费纯函数并刷新面板。
- [x] 队伍分出战/候补，主角锁定、五位上限、满员替换、下阵保成长；现有inspection嵌套关闭/焦点还原。
- [x] 成长与人物详情遍历实际成员，候补预览用makePartyUnit，不向战场注入候补。
- [x] 桌面、手机横竖屏排版与只读状态准备由根代理真实浏览器验证。

### Task 5: 集成验证与交付（根代理）
Files: OverworldScene.ts, BattleScene.ts, EndingScene.ts, heroHud.ts, UI入口、README、package及scripts。
- [x] 城市寻访/地图队伍/战前名单入口；Battle建立并保存固定battleParty，五人站位和行动队列全员可查看。
- [x] 所有场景奖励摘要动态显示，主角HUD显示实际同行出战信息；同场重试阵容相同，结束清快照。
- [x] 实际从低亲密培养到招募，五人换阵后实战、候补经验不变、刷新与早年年龄门控、全部类别可招募、手机操作。
- [x] 独立审查；npm test、npm run build:local、npm run test:local；离线包验证、截图复核与0.3.0说明，保留工作区不自动提交/推送。

## 完成记录

0.3.0已实现；152项单测、类型检查、生产本地构建、静态服务测试通过。真实UI从0培养到60并招募关羽张飞、满员替换和下阵保成长、五对五实战与只奖励出战成员、读档与新角色分配技能点已验证。离线本地包完成招募、战斗重开及撤退、31身份成长与详情、官员/主君/文官、年代限制、844×390及390×844触控验证；原0.2旅行和阵营流程回归通过。

独立审查提出的战斗真实数据旁路、候补山贼与敌首同ID、嵌套焦点丢失均已修复；专门浏览器回归先复现失败，再通过。孙策江东相遇从195年开放。孙坚孙策使用具名中性SVG，暂无独立位图立绘。保留已有全部未提交工作，不提交、推送或发布。
