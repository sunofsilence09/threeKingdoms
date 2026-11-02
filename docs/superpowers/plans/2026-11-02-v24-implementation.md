# 2.4.0 人物、资源与百分制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development to implement task-by-task. No commits or pushes are authorized.

**Goal:** 新增37位人物达到170张人物目录立绘，发行包缩小，真实六维上限100且兼容旧档。

**Architecture:** 保留培养/羁绊账目，新增属性规则版本3；旧战斗按快照版本派生与结算。PNG原稿继续留在public，确定性编码流程输出.generated/public内的WebP与非PNG资源，统一图片地址映射仅在浏览器构建启用。人物扩充使用共享名单与独立目录模块，画像与元数据分别实施。

**Tech Stack:** TypeScript/Phaser/Vite/Vitest，Python/Pillow WebP编码，内置image_gen，Python Playwright离线验收。

## Global Constraints
- 用户已批准133+37=170张人物目录PNG原稿，主角14张换装另计；37个不同人物，不能用重复版本凑数。
- 真实有效六维=旧天赋×5+原培养点数+羁绊，整数最高100；技能点、培养账目、羁绊+2不重置。
- 每5分新属性对应旧制1分效果；新规则不得直接代入旧减10公式；已存版本1/2战斗原样续战与结算。
- PNG原图保留，发行包仅WebP，不同时打包双份；不删音乐、不减图片尺寸、保留透明与双击离线运行。
- 保留当前2.3未提交改动及旧包；不提交、合并、推送或覆盖运行中的旧版本。

## Task 1：百分制规则与兼容（属性代理）
Files: attributes.ts、characterTalents.ts、combat.ts、battleSave.ts、garrisonStrength.ts、troopCombat.ts、troopManagement.ts、state.ts、martialCombat.ts及成长/详情/队伍/兵员UI、相关tests。
Interfaces: AttributeVersion=1|2|3；新派生默认3，旧版本必须显式走原式；培养存储10—30不变。集中提供属性贡献/奖励派生，UI不可另写过时公式。
- [x] 编写新尺度、100封顶、不空耗点数、羁绊、敌我/老师/奖励、1/2快照与下一场升级测试，确认RED。
- [x] 实现版本3及统一归一化，保留旧函数显式版本支路；配兵快照标记将领使用的属性尺度。
- [x] 更新所有预览/说明/战斗入口，验证纯人物、兵战、守军与奖励一致；新旧测试GREEN并自审。

## Task 2：37人资料（人物代理）
Files: new v24Characters.ts，共享名单docs/art/2026-11-02-v24-roster.json；historicalCharacters/careerData/personLifeData/martialCatalog/talentData及目录总数测试；personLife目录迁移。
- [x] 按共享ID补失败测试，完整活动/年龄/寿命/武学/旧档补人边界。
- [x] 核对原典，记录可复查链接及未知生卒估年；曹冲按幼年资料，不默认伪造成年招募。
- [x] 接入37人、天赋、武学与生命周期；不重抽旧寿命，已存正常目录差额静默补齐。
- [x] 目录与生命/招募/任职专项GREEN，自审。

## Task 3：37张立绘（绘图代理）
Files: public/assets/characters/{shared-id}-v1.png；docs/art/2026-11-02-v24-portraits.json。
- [x] 先读取imagegen技能并查看既有图，按名单逐人内置image_gen，透明1024×1536全身；存在则跳过。
- [x] 每张独立人物、时代服饰与年龄正确，检查完整构图及alpha；保留原稿路径、提示和SHA256。
- [x] 核对37张齐全且基线原图不变；报告进度便于缺失项继续。

## Task 4：资源发行与体积（主代理）
Files: new scripts/prepare-assets.py、Node测试，src/game/assetUrl.ts、所有图片入口，vite.config.ts、package.json、scripts/package-local.mjs。
- [x] 为映射、编码缓存/透明/尺寸/源不变/发行无PNG编写失败测试并执行RED。
- [x] 编码高质量WebP样张，检查人物脸部、刺绣与边缘；批量处理所有PNG，原稿不改。
- [x] 缓存输出.generated/public，Vite开发/构建共用；图片入口统一映射，测试模式保留原图路径。
- [x] 修复打包陈旧哈希文件残留；只清理目标www的构建资源，保留运行时与旧包。
- [x] 更新2.4版本与说明，输出2.3基线/新增后原始/最终发行包实际MiB与比例。

## Task 5：整合审查与交付
- [x] 各任务独立审查，修复重要发现，再做整体兼容审查。
- [x] 全量Vitest、生产构建、本地服务器/资产流程测试。
- [x] 170张原图清单、184张含换装总数、真实浏览器所有发行图片解码，无PNG双份。
- [x] 桌面1440、手机390和横屏844实测成长/100上限/详情/领兵/1及2版旧战斗/刷新/奖励/新增人物/CG/商品/主角换装。
- [x] build:local --output-dir 三国行旅-2.4.0-本地版，真实CMD离线启动及三尺寸复验，逐文件哈希与体积报告。
- [x] 写入docs/verification、task_plan/findings/progress；保留未提交分支并报告最终路径。
