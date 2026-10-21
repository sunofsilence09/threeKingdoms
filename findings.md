# Findings

## 2026-10-19

- The repository contains only the Chinese and bilingual design specs; no application scaffold exists yet.
- The remote `main` history and local history began as separate roots. They were joined with an ours merge commit before implementation so the local H5 spec remains authoritative while the remote history is preserved.
- The approved first slice is browser-first: Phaser 3 + TypeScript, Canvas game rendering, HTML/CSS overlays, LocalStorage persistence, and touch/mouse input.
- The first implementation should use generated pixel-style primitives and text so gameplay can be validated before a dedicated art pass.

## 2026-10-21 补充发现

- 当前战场的 isOpenTile 只检查边界与活单位占格；没有障碍、地形成本、掩护或视线数据。
- 敌军寻路虽然使用 BFS，但每回合只向目标走一格；扩大地图时须同步调整，避免大量空转回合。
- 工作区已有未提交的角色面板、中文渲染及浏览器验证改动，后续实施须保留。
- 本轮主角改名后的 npm test：17 项通过。

## 本次实现结论

- 武器阶段随序章/路线切换，不把流民开局直接替换成正规兵种；16×10 地形采用固定布局便于重试。
- 地形寻路使用 Dijkstra，避免树林成本较高时普通 BFS 选错路线；视线采用 supercover，堵住斜角穿墙。
- 成长是纯函数，关卡胜利奖励由 xp:ambush/xp:route 标记幂等保护；旧档缺少 party 时补齐 Lv.1。
- 独立审查发现的拖动越界后 pointerup 误触已通过改为 pointerdown 修复；路线结算补充本次等级与属性增量。
- 四种尺寸的最终鼠标/触摸交互回归通过；28 项单测及生产构建通过。
