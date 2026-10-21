# 流民成长与地形战棋 Implementation Plan

> **For agentic workers:** 使用 executing-plans 在当前会话逐项执行，保留已有工作区改动。

**Goal:** 让姜垣三人从简陋武器起步，在有障碍的 16×10 战场作战，以持久经验、升级和后续装备提升呈现成长。

**Architecture:** growth.ts 管理纯经验与等级运算；state.ts 保存三人成长并按关卡幂等领奖；battlefield.ts 管理固定地形配置；combat.ts 共用移动成本、射程和视线；BattleScene 负责视口、输入和结算，heroHud 显示实际成长。

**Tech Stack:** TypeScript、Phaser、Vitest、Python Playwright。

## Global Constraints

- 保留姜垣、阿满、陈达三人；序章使用菜刀或拳脚，路线战斗才获得短刀、木枪、猎弓。
- 16×10 地图；巨石/倒车/断墙阻挡移动与视线，河道阻挡移动，桥可通行，树林成本 2 且远程减伤 1。
- 旧存档自动补齐成长，失败不领奖，胜利不能重复领奖。
- 每人初始 Lv.1，升级经验 20 + 10 × (当前等级 - 1)，上限 Lv.10；升级 +2 最大体力，每两级 +1 攻击。
- 伏击每人 +30 经验，路线战斗每人 +45 经验，包括倒地队友；战斗胜利后恢复体力由下一战重新建模实现。
- 保留角色面板、高清中文文字与手机支持。

### Task 1: 持久成长

**Files:** 新建 src/game/growth.ts、src/game/growth.test.ts；修改 src/game/state.ts、src/game/state.test.ts。
**Interfaces:** PartyId = 'traveler' | 'aman' | 'chen-da'；Progress { level: number; xp: number }；createPartyProgress()；grantExperience(progress, amount)；experienceToNextLevel(level)；rewardVictory(state, encounter)。

- [x] 先编写升级阈值、多级结转、封顶、不变性与无效经验测试；测试旧存档迁移及幂等领奖。
- [x] 运行 npm test，确认新增断言因缺少功能失败。
- [x] 实现纯函数、存档校验与一次性胜利奖励；更新现有存档测试。
- [x] 运行 npm test 验证。

### Task 2: 地形与战斗规则

**Files:** 新建 src/game/battlefield.ts；修改 src/game/combat.ts、src/game/combat.test.ts。
**Interfaces:** createCombatState(route, party?, mode?)；terrainAt(state, x, y)；movementRange(state, unit)；canAttack(state, attacker, target)；reachableTiles(state, unitId)。

- [x] 编写 16×10/身份装备/升级属性、障碍绕行、树林成本、视线、射程、敌军移动攻击和布局连通性测试。
- [x] 运行 npm test，检查新增断言失败后实现配置、带权寻路、射线遮挡和合法攻击位置搜索。
- [x] 运行 npm test；现有回合测试改用显式小场景，避免依赖被替换的出生坐标。

### Task 3: 战场与成长界面

**Files:** 修改 src/game/scenes/BattleScene.ts、src/game/heroHud.ts、src/game/scenes/OverworldScene.ts、src/game/scenes/EndingScene.ts、src/style.css。
**Interfaces:** Board viewport { x: 24, y: 112, width: 630, height: 360 }，独立战场容器与矩形裁剪；全图格距 36，局部格距 56。

- [x] 添加浏览器断言：装备、等级、障碍格不可移动、缩放/拖动不误触、胜利升级、刷新保留。
- [x] 绘制地形图案与单位，固定右侧操作/队伍信息；角色面板在战场下方，避免遮挡。
- [x] 接入鼠标/触摸拖动、缩放、归位、自动定位、攻击高亮与地形说明。
- [x] 胜利调用 rewardVictory，伏击结算/结尾显示经验和升级，各处显示持久等级。

### Task 4: 验证与交付

**Files:** 修改 scripts/verify_h5.py、README.md、task_plan.md、progress.md、findings.md。

- [x] npm test 和 npm run build 通过。
- [x] 通过浏览器鼠标与触摸完成三条路线，包括重试、刷新、等级结算、旧档恢复、窄屏和视口交互。
- [x] 检查截图与中文边界，记录实际结果并更新文档。
