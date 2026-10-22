# Historical Characters Implementation Plan

**Goal:** 为曹操、刘备、孙权、孙尚香、貂蝉、蔡琰增加独立立绘、人物志与匹配的小人预览。

**Architecture:** `historicalCharacters.ts`记录只读NPC资料，`characters.ts`集中外观；`unitFigure.ts`共享绘图，`unitModel.ts`负责Phaser，`unitPreview.ts`负责Canvas。详情按当前分类显示战斗单位或NPC资料，阵营卡使用主君映射。

**Tech Stack:** TypeScript / Phaser / Canvas 2D / CSS / Vitest / Playwright。

## Constraints

- 不改现有存档、队伍、战斗数值或奖励。
- NPC资料不伪造实时体力、等级、绝招；明确尚未同行。
- 立绘与代码画笔为不同类型资产，位图使用内置image_gen，最终六张PNG保存到public/assets/characters。
- 模态分类切换可通过键盘操作，关闭恢复原DOM与选择。

## Tasks

- [x] 新增`historicalCharacters.test.ts`，验证六人独立资料、阵营映射、女性名单与安全ID解析；先执行失败测试。
- [x] 生成六幅不同人物与动作的PNG，记录原始提示词并检查图像。
- [x] 实现NPC资料和共享外观，扩展pose/hair/outfit以对应六幅立绘。
- [x] 抽出共享`paintUnitFigure`，Phaser与Canvas预览使用同一绘制流程，保持原战场外观与装备。
- [x] 详情增加分类和NPC只读信息、小人预览；保留实时战斗详情和成长草稿。
- [x] 阵营卡显示主君、头像与独立详情按钮，不触发路线选择或确认。
- [x] 新增三种尺寸浏览器检查，执行单测、构建、既有详情/成长/棋盘与三路线回归，检查截图。
