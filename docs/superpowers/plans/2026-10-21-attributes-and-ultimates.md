# 六维培养与角色绝招 Implementation Plan

> **For agentic workers:** 按 executing-plans 在当前会话顺序实施；使用 test-driven-development 与 verification-before-completion。

**Goal:** 升级可分配六维属性，智力提升真实闪避，姜垣拥有绝处逢生、普通角色拥有拼命。

**Architecture:** attributes.ts 定义六维与派生加成；growth/state 保存技能点并兼容旧档；combat 使用防御、闪避与每场绝招状态；characterPanel 提供确认/取消分配并恢复原页面；战斗按钮与结算展示实际能力和奖励。

**Tech Stack:** TypeScript、Phaser、Vitest、Python Playwright。

## Constraints

- 每级3点，三人独立；基础属性10，每项最高30，点数守恒；保留原有等级基础成长。
- 统率防御+1、武力攻击+1、智力闪避+2%上限40%、政略胜利补给+1、魅力经验+5%、魄力体力+2。
- 拼命扣最大体力20%，绝处逢生半血及以下恢复最大体力30%，二者下一击攻击+50%；每场一次，不占移动/攻击，强化到本方回合结束。
- 战斗中只能查看成长；旧档补点、不重复发经验粮食；不自动提交或推送新改动。

## Tasks

- [x] 写失败测试，验证技能点跨级、加点守恒、旧档迁移、六项实际效果和幂等胜利奖励。
- [x] 实现 attributes/growth/state；运行 npm test。
- [x] 写失败战斗测试，验证绝招条件、消耗、回复、强化、行动限制、敌军使用、闪避与固定随机序列。
- [x] 实现战斗规则与状态反馈；运行 npm test。
- [x] 编写浏览器断言，验证成长面板预览/取消/确认、切人、只读、存档和绝招按钮。
- [x] 实现成长面板、入口、绝招按钮及能力/胜利反馈，保留既有按钮位置和场景返回行为。
- [x] 运行构建、核心测试和三条路线浏览器流程，检查手机布局及截图，独立审查后完成。
