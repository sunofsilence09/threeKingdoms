# 历史地理与行旅 Implementation Plan

> **For agentic workers:** Use executing-plans task by task; independent geographic data and SVG presentation tasks may run in parallel under dispatching-parallel-agents.

**Goal:** 将184年开局升级为可按日旅行、处理事件且可恢复存档的历史城邑地图，发布0.2.0本地包。

**Architecture:** world.ts负责城邑、道路与寻路；travel.ts负责可序列化的旅行与事件状态转换；worldMapView.ts负责交互式SVG地图。state.ts保留既有角色资料与存档入口，Overworld协调旅行界面与旧当地任务，Battle按独立旅行上下文返回。

**Tech Stack:** TypeScript / Phaser / DOM SVG / Vitest / Python Playwright，无新增线上服务依赖。

## Global Constraints
- 保留13州部、16出生地区ID，出生地与当前位置分离。
- 每月30日简化游戏历法，普通道30公里/日、水路50、山道20为游戏参数。
- 地理路线原创概绘，184年不绘制魏蜀吴疆界；缺考官员留空。
- 事件、随机状态与途中战斗持久化，200年与相遇阵营规则保留。
- 已有工作区改动原地保留，不以切换工作树丢弃现有资产，不自动提交整批改动。

### Task 1: 世界地理数据（独立）
Files: src/game/world.ts, src/game/world.test.ts, docs/art/2026-10-23-world-geography.md。
- [x] 先编写16出生映射、13州覆盖、图连通、武关与蜀道走廊测试，运行npm test -- src/game/world.test.ts确认缺失功能失败。
- [x] 实现WorldCity{id,name,provinceId,prefecture,lon,lat,originId?}；WorldRoad{from,to,kind:'road'|'water'|'mountain',via?:[number,number][]}；WORLD_CITIES、WORLD_ROADS、cityAt(id)、originCity(originId)、planRoute(from,to)返回{path:string[],legs:{from,to,days,kind}[],days}或null。
- [x] 核对约32城资料，记录来源及近似位置；重复运行测试直到通过。

### Task 2: 地图展示（独立）
Files: src/game/worldMapView.ts, src/game/worldMap.css。
- [x] 创建SVG显示城邑、路线、原创概绘山川海岸、13州部；createWorldMap({currentId,selectedId?,path?,progress?,year,onSelect})返回{element,destroy}。
- [x] 提供缩放、拖拽、复位和可访问城邑按钮，选定路线突出，当前路段可展示位置；列表作为移动端的补充入口。
- [x] 浏览器验证画布尺度与拖拽不会误点城邑，键盘和触屏可操作。

### Task 3: 旅行与存档（根代理）
Files: src/game/travel.ts, src/game/travel.test.ts, src/game/state.ts, src/game/state.test.ts, src/game/history.ts。
- [x] 先写跨月跨年、起程防重入、抵达、事件暂停与一次结算、刷新恢复、无军需可继续和旧存档迁移测试；运行vitest确认失败。
- [x] 新增GameDate.day?与advanceDays(date,days)，使用30日历法且不改变旧nextMonth兼容行为。
- [x] 在GameState增加当前位置与可选Journey{path,legIndex,legDay,event?,seed,serial}；以纯函数startTravel/advanceTravel/resolveTravelEvent/finishTravelBattle更新状态，随机数种子一并保存。
- [x] loadState校验旅行路径、日期、进度和事件字段，旧档从birth origin映射城市；旅行战斗无效上下文拒绝载入。
- [x] 当地任务改为按日消耗；结局继续只回地图，长期停留通过明确选择推进指定天数。

### Task 4: UI和战斗衔接（根代理）
Files: src/game/scenes/OverworldScene.ts, EndingScene.ts, BattleScene.ts, PrologueScene.ts, localOfficialPanel.ts, src/style.css。
- [x] 地图常驻侧栏展示日期、出生地、当前位置、目的地选择、路线预览、启程与继续赶路。
- [x] 事件面板根据保存事件显示选择与成本；选择战斗时保存context，胜利/撤退后只结算该旅行事件并返回原路线。
- [x] 城内提供官员、当地事务、休整、长期停留与已解锁阵营入口；途中禁用城内操作，官员使用当前城市所属州郡。
- [x] 更新序章与结局，避免旧多次战斗后自动跳到190年。

### Task 5: 回归与交付
Files: scripts/verify_world_travel.py, package.json, README.md, release/三国行旅-本地版。
- [x] 用Playwright实际点击目的地、出发、事件选择、抵达与重载恢复；覆盖桌面、横屏和竖屏。
- [x] npm test、npm run build:local、npm run test:local，独立审查后修复发现问题。
- [x] 离线本地包验证关键旅行流程、立绘与保存，更新版本0.2.0和帮助。
