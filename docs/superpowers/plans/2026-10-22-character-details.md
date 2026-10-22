# Character Details Implementation Plan

**Goal:** 每个人物可看全身立绘，战场小人与角色身份和实际装备对应。

**Architecture:** `characters.ts`集中人物资料与外观，`characterDetails.ts`负责只读详情DOM，`unitModel.ts`负责Phaser小人。现有成长面板、HUD、BattleScene仅加入入口。

**Tech Stack:** TypeScript, Phaser 3, CSS, Vitest, Python Playwright。

## Global Constraints

- 保留已有未提交修改，不自动提交或推送。
- 不改战斗/成长数值，不新建存档字段。
- 详情使用当前战斗状态，所有模态阻止Canvas穿透，关闭恢复原DOM/焦点。
- 使用已生成姜垣立绘，新增立绘持久化到`public/assets/characters/`。

### Task 1: Shared identities and artwork

- [x] 写`src/game/characters.test.ts`覆盖所有战斗ID映射、人物外观差异和基础/路线装备匹配，运行并确认缺模块失败。
- [x] 创建`characters.ts`，导出`getCharacterAppearance(id)`；返回身份、简介、portrait、robe/headband/skin/stocky/beard/pack/pose等外观字段，显示姓名取自战斗单位。
- [x] 生成阿满、陈达、山贼头目、普通山贼PNG并保存提示词，检查文件可读取。按用户追加要求编辑四幅v2，拉开人物动作。

### Task 2: Details modal and entry points

- [x] 新增`characterDetails.ts`导出`showCharacterDetails(id, combat?)`，读取当前单位或存档派生单位，展示完整立绘与实际属性，支持切人、关闭、焦点循环。
- [x] `characterPanel.ts`加入当前人物详情按钮，保留加点草稿DOM。
- [x] `heroHud.ts`加入详情并换用新头像；`BattleScene.ts`为队员和敌人增加固定详情入口，不挤占现有操作区域。
- [x] `style.css`加入人物册桌面双栏、竖屏单栏、横屏滚动布局及全屏输入遮罩。

### Task 3: Matching board models

- [x] 创建`unitModel.ts`，按共享外观字段绘制头发/头带/上衣/行囊/裤鞋；按`CombatUnit.weapon`绘制当前兵器。
- [x] `battleBoard.ts`替换字块为小人并保留血条、选中/攻击底座、守势与强化标记和已行动淡化，补充差异化站姿与短动画。

### Task 4: Verification

- [x] `npm test`与`npm run build`通过。
- [x] `scripts/verify_character_details.py`覆盖桌面1280×820、横屏844×390、竖屏390×844的入口/切人/图片/战斗数据/输入隔离/关闭与草稿恢复。
- [x] 运行成长、棋盘和路线回归，检查截图，修复问题并记录结果。
