# 2.2.0 Implementation Plan

**Goal:** 实现已确认的婚姻、结义、赠礼和七位人物立绘。
**Architecture:** recruitment维护月度互动；social模块处理礼物和羁绊；Progress.bondBonus独立保存永久加成，由所有属性消费入口共用。扩展现有人物和生命目录。
**Tech Stack:** TypeScript, Phaser, Vitest, Vite。

- [x] 1. social.test.ts先覆盖结婚性别、结义、重复加成、购礼赠礼、月度帮忙和存档；运行确认失败。
- [x] 2. social.ts实现纯状态变换；recruitment保留关系字段；growth、characterTalents及各属性入口应用bondBonus；state验证礼品。
- [x] 3. socialView.ts提供可复用操作；cityPanel加入礼品铺；partyPanel及characterDetails接入；relationshipNetwork显示羁绊。
- [x] 4. socialCharacters.ts（人物、生命基准与能力集中资料）新增七人，接入目录、生命基准、专属武学与天赋。分别生成并保存七张图；刘表跳过。
- [x] 5. 运行npm test、npm run build、npm run test:local；浏览器验证购礼、送礼、结义和婚姻；更新2.2.0并产出独立本地包。
