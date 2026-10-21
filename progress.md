# Progress Log

## 2026-10-19

- Pushed the H5 design revision to GitHub `main`.
- Created the implementation plan for the first playable vertical slice.
- Built the Vite/Phaser shell with responsive HTML/CSS overlays and LocalStorage-backed game state.
- Added the refugee prologue, click/touch overworld, Cao/Sun/Liu route choice, and compact tactical battle.
- Added unit tests for state and combat transitions: 9 tests passing.
- Added browser smoke coverage for desktop prologue/map/battle and mobile route choice.
- Verified `npm run build` and the Playwright smoke flow.
- Committed the playable slice locally and uploaded the complete project tree to GitHub through the authenticated browser session.
- Started the local Vite server at `http://127.0.0.1:5173` for interactive follow-up.

## 2026-10-20

- Replaced the per-unit enemy response with party rounds: each living ally may move once and attack or guard once before enemies respond.
- Added collision-aware movement, action limits, route movement/guard bonuses, and deterministic enemy pathfinding.
- Fixed HTML overlay clicks reaching the Phaser canvas through global window input events.
- Fixed health-bar alignment, resource rewards overwriting prior progress, and disabled browser storage breaking the game.
- Restored battle reloads to the correct encounter from its opening state; added retrying a lost encounter without losing route progress.
- Fit the canvas within the viewport height and expanded touch targets.
- Verified three complete routes through real canvas input, including mobile touch, encounter reloads, ending reloads, restarting, and loss/retry. Additional layout checks passed at 667x375 and 390x844.
- State/combat regression tests: 17 passing. Browser run: no console errors or uncaught exceptions.

### Chinese text and protagonist HUD

- Reproduced Chinese clipping: the default Courier/Latin ascent was shorter than the actual CJK glyphs in round labels and battle buttons. Whole-canvas nearest-neighbor scaling also degraded thin strokes.
- Added shared CJK text metrics, padding and 3x text textures; enabled smooth canvas scaling while retaining crisp pixel rendering for the protagonist portrait.
- Added a local pixel portrait and character HUD on the map and battle screens. Battle health, route attributes, selection and action states follow live combat data; clicking the portrait selects the traveler.
- Moved the HUD below the canvas on portrait phones and verified its contents stay within bounds at 1517x826, 844x390, 667x375 and 390x844.
- Extended browser regression coverage for portrait loading, selecting the hero, health meter values, route stats, guard/action updates, scene cleanup and CJK glyph bounds. All three complete route flows passed with no browser runtime errors.

## 2026-10-21: 战棋扩展修订

- 用户指定主角暂定名为姜垣，要求拳脚/菜刀流民开局、后续正规兵种、更大棋盘与障碍。
- 已修改游戏内主角显示名与浏览器验证按钮名称，保留内部 traveler ID。
- 扩展设计改为 16×10、拖动缩放、阻挡障碍与树林地形；尚待确认，未修改战斗规则。
- 首次 apply_patch 因同一文件同时出现删除和新增而被拒绝，整组未写入；改为单独更新文件后完成文字修正。
- 主角改名验证：npm test 17/17 通过，npm run build 通过；构建仍提示现有 Phaser 包体较大。未运行本轮浏览器流程。

## 2026-10-21 实施开始

- 用户已确认修订方向并追加等级/经验系统。
- 选择在当前目录的新分支 codex/tactical-growth 实施，以保留尚未提交的 HUD 等改动。
- 实施顺序：经验存档 → 地形战斗规则 → 视口/HUD/结算 → 浏览器验证。

- 成长、旧档迁移、幂等领奖及地形战斗规则：28 项单测通过；构建通过。
- 四种尺寸（1280×820、844×390、667×375、390×844）的障碍点击、缩放、拖动、自动定位、主角 HUD 边界检查通过。
- 浏览器脚本曾直接导入不带 Vite 时间戳的入口，导致测试重复启动 Phaser；已修正为复用页面入口，检查只有一个画布。
- 曹、孙路线完整流程已通过；刘路线在验证。独立审查与附加复现发现拖动至固定按钮松手会触发 pointerup，待回归结束修复。

- 第一轮三条路线完整流程全部通过（含经验 Lv.1→2→3、旧档兼容、战败重试、刷新与手机触摸），无浏览器错误。
- 已将固定按钮和同行名单改为 pointerdown，修复跨区域拖动松手误触；增加四种释放目标（守势、结束回合、队员名单、缩放）的鼠标/触摸回归。
- 路线胜利面板补充本次升级前后等级及体力/攻击增量。正在执行修复后的最终回归。

### 最终验证结果

- npm test：3 个文件、28 项测试全部通过。
- npm run build：通过；保留原有 Phaser 包体较大的构建提示。
- python scripts/verify_tactical_ui.py：1280×820、844×390、667×375、390×844 全部通过，包含拖动至固定按钮/名单松手不触发动作。
- python scripts/verify_h5.py：曹、孙、刘全部完成序章→伏击→补给→路线任务→结局→重开，覆盖鼠标/触摸、重试、刷新、装备提升、Lv.1→2→3、失败无经验、结尾刷新无重复经验，零浏览器运行错误。
- 检查了桌面战场、横屏放大、竖屏角色面板、胜利升级与结尾截图。git diff --check 通过。
- 独立审查的两项意见均已修复并复核。改动保留在 codex/tactical-growth，未提交或推送，工作区原有修改已保留。开发服务保持在 http://127.0.0.1:5173 供试玩。

## 2026-10-21 本地提交

- 按用户要求，将当前成长系统、地形战场、角色面板、中文显示、浏览器验证及设计文档一起纳入本地提交。
- 提交前重新运行 npm test（28/28 通过）、npm run build（通过）与 git diff --check（通过）。
