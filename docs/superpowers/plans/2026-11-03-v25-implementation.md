# 2.5.0 城府军政 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. No commits or pushes without user request.

**Goal:** 完成用户已批准的界面、改道、统率兵力和城市月度财政功能，并交付经过旧档及离线验证的2.5.0。

**Architecture:** 行程、领兵、财政独立提供纯规则；财政通过现有统一日期与世界推进结算，UI只发命令、读投影。共享存档字段和战斗规则有明确版本；真实旧快照继续旧制。

**Tech Stack:** TypeScript、Phaser、DOM/CSS、Vitest、Python Playwright、现有WebP/Node本地打包。

## Global Constraints

- 设计已于2026-11-03获用户“按推荐方案实现”批准：docs/superpowers/specs/2026-11-03-v25-interface-city-economy-design.md。
- 每人有效统率×100，向下取整至100，最高10000；随行兵力总池20000，士兵不得凭空增加或丢失。
- 商业、农业、城市/军队士气0—100；月入商业×40钱、农业×200粮；每100兵20钱/100粮，具名在职官员每人100钱。
- 缺钱每日-3士气，缺粮每日-5；正常每日+1至80。战略系数0.5+士气/200。旧行旅士气独立。
- 发展1000府库钱/10日/+5；府库购粮1钱=5粮；自有城才能管理。
- 旧档当前日接入，不追扣；旧战斗保留原兵力、规则和随机数。所有读操作无结算副作用。
- 保留已有progress.md修改；在codex/interface-city-economy-2-5分支完成，不自动提交/合并/推送。无需另设工作树。
- 所有文件属于D:/games/ThreeKingdoms。三个独立实现任务限定文件归属，UI由主代理整合。

## Task 1: 财政、供给、世界结算和存档（独立实现与复核）

**Files:** 新增src/game/cityEconomy.ts、cityEconomyData.ts、cityEconomy.test.ts及所需聚焦辅助模块；修改state.ts、worldTime.ts、worldConflict.ts、worldConflictTypes.ts；相关经济兼容测试。

**Interfaces:** 为UI提供cityFinanceSummary(state, cityId)、donateCityCoins(state, cityId, amount)、purchaseCityGrain(state, cityId, coins)、developCity(state, cityId, 'commerce'|'agriculture')、setCampFundingCity(state, cityId | undefined)。为战斗提供armyMoraleForParty(state): number、cityMoraleFor(state,cityId):number。确切摘要类型须导出并报告给整合者。供给数据独立可恢复，不让财政损坏导致完整RPG档丢失。

- [x] 先写并运行RED：商业50、农业50、5000守军、5唯一官员月入2000/10000、应付1500/5000；无兵/百人尾数/具名官员去重/未成年不计薪。
- [x] 先写并运行RED：缺钱、缺粮、双缺每天降3/5/8；正常恢复不压低已有90士气；0与100钳制。
- [x] 实现确定性城市基础值、初始化及月结记录。按月初入册→收入→支出→士气→战争；有预算募兵最多50、每人2钱、保留一月军饷口粮。记录实际招募入既有总账。
- [x] 实现NPC在外军队的兵源分摊/失城接管，随行兵和同行角色唯一计费；城供与个人供互斥。资金不足扣至0，缺口不追债，个人欠供状态至下次足额月结。
- [x] 接入逐日世界时钟及战略士气战力。用长推进与逐日推进deepEqual验证跨月/跨年/一年结果，同日重复调用不扣款。
- [x] 实现捐资、购粮、发展、资金来源选择的前置检查和原子操作，测试途中/战斗/非自有城/失城/历法边界/非法数字。
- [x] 实现旧档一次接入和损坏模块备份，保存恢复不得重发三月府库。运行聚焦财政、世界、生命、存档测试。

## Task 2: 行旅改道与折返（独立实现与复核）

**Files:** 修改src/game/travel.ts、travel.test.ts、travelSave.test.ts、travelEvents.test.ts；必要时新增journeyNavigation.ts及测试。禁止修改OverworldScene.ts（主代理整合）。

**Interfaces:** 提供redirectTravel(state,destination):GameState、turnBackTravel(state):GameState、stopAtNextCity(state):GameState、对应只读预览接口；沿用journeyLeg与remainingDays。报告UI如何取得当前位置/最终目的地/变更原因。

- [x] 写RED：当前路段走d日，折返恰好d日；下一城停下只走当前段余路；改去第三城从下一城接续最短路线。
- [x] 写RED：路段起点可立即停；事件/战斗阻止变更；重复改道/折返不刷新seed、不回退日期、不丢事件、不领取重复奖励。
- [x] 实现有版本的行程和兼容旧校验，旧当前位置、elapsed、seed、event及serial保留。不要以未行走路径首城假充当前位置。
- [x] 测试连续反向、路段边界、多段路线、路径回到曾经过城、刷新恢复、过年/日期上限。跑现有travel/worldSave测试。

## Task 3: 统率兵力上限及战斗兼容（独立实现与复核）

**Files:** 修改src/game/troopManagement.ts、troopCombat.ts、troopControls.ts、battleSave.ts、combat.ts必要类型、garrisonCombat.ts、相关troop/battle测试；禁止修改state.ts和世界财政模块。

**Interfaces:** 导出commandTroopLimit(state,id):number供UI/校验统一使用；财政读取通过cityEconomy.ts的armyMoraleForParty与cityMoraleFor（初始尚未存在时可保留待整合导入，由主代理合并后运行）。必要新战斗规则标记明确记录，不能改变旧快照。

- [x] 写RED：统率50/80/100→5000/8000/10000，超过个人上限及总池失败；下调至0退款守恒；统率下降不删兵且只能维持或减少超限配置。
- [x] 更新建军、输入范围/说明/月耗预览、敌军配平、存档上界和快照版本。不将旧阵型聚合属性误判为人物属性。
- [x] 新建普通兵战继承随行军队或守城士气。财政未就绪时按接口接线，禁止固定80重置已欠供部队；旧快照仍直接恢复。
- [x] 10000兵真实攻防、治疗、火伤、技能、撤退、存档和伤亡总账测试；原1/2/3属性版本旧兵战测试保留原预期。

## Task 4: 界面外壳及城市财政面板（主代理）

**Files:** src/game/scenes/OverworldScene.ts、worldScreen.css、worldMap.css、cityPanel.ts；新增cityEconomyPanel.ts及样式；必要时新增worldNavigation.ts独立视图模块。

**Interfaces:** 消费Task1—3公开接口，保持getState/setState、openInspection与showCityPanel等现有生命周期。

- [x] 按现有纸本风格设计紧凑资源顶栏、常驻导航、地图主区、单事务操作区。记录选中事务与地图视角，频繁操作不滚回顶部或重置目的地。
- [x] 手机导航切换行旅/城池/军务/队伍/更多，地图可展开；短横屏降低装饰高度，保持控件触摸尺寸；超长消息折叠，独立列表滚动。
- [x] 增加改道目的地/下一城停下/折返按钮和耗时预览；事件/战斗显示禁用原因；地图行旅中可选新目的地。
- [x] 城市总览展示归属、守军、钱粮、发展和士气；府库展示收入、分类支出、净额、缺口、维持月数和记录；所有管理操作只向自有城开放。
- [x] 增加付款来源选择、捐资/购粮/发展明确报价与反馈，长期停留一年前显示预计军费和缺供风险。移除过大重复横幅。
- [x] 使用真实浏览器验证1440×900/1920×1080/390×844/844×390，无全页横向溢出、入口滚到屏外、遮挡/焦点陷阱。

## Task 5: 整合复核与发行（主代理与独立最终审查）

**Files:** 版本标识、scripts/verify_v25.py、docs/verification/2026-11-03-v25.md及artifacts/v2.5，现有package-local脚本生成独立2.5包。

- [x] 三个实现任务各自复核规格与代码质量；整合TypeScript和全量Vitest失败时先确定原因再修。
- [x] 升级package.json/lock、index、Boot/Prologue/Overworld/startMenu及打包说明到2.5.0城府军政，保持WebP发行流程。
- [x] 真实浏览器创建旧行程/旧战斗/财政缺口/最大配兵夹具并执行功能操作、刷新恢复和多尺寸布局。阻止外网，记录零404/页面错误。
- [x] npm test、npm run build:local、npm run test:assets、npm run test:local、git diff --check。测试通过后仅在新修改或新问题需要时重跑。
- [x] 全分支独立审查，修复阻断问题，再构建最终包并核对www与dist哈希，真实本地启动复核。
- [x] 更新设计、计划和验收记录，清理仅本轮临时测试进程，交付可点击启动入口及重要规则。保留旧包和未提交修改。
