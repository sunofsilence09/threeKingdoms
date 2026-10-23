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

## 六维属性设计

- 用户要求升级获得技能点，分配统率/武力/智力/政略/魅力/魄力，并影响实际能力。
- 已检查现有成长逻辑；草案推荐每级 3 点、三人独立分配和旧档按等级补点。
- 六维映射草案为防御/攻击/破甲/战后补给/经验倍率/体力，待确认后实施；本轮尚未修改游戏规则。

## 六维与绝招实施

- 用户指定智力改为闪避，并选择姜垣专属绝招“绝处逢生”：半血以下恢复30%体力、下次攻击+50%。
- 普通角色使用拼命，暂定扣最大体力20%、下次攻击+50%、每场一次。
- 开始按技能点存档→战斗规则→成长界面→验证的顺序实施；本轮不自动提交或推送。

- 六维成长、技能点守恒/补发、经验与粮食奖励、闪避与两种绝招已实现。
- 核心测试45项通过、构建通过。独立审查修复了魅力经验浮点少算1点的问题（改为共享整数百分比计算）及面板遗漏经验显示的问题，并已复核。
- 新增成长/绝招UI测试第一轮三种尺寸全部通过；最终回归包含取消/确认/切人/只读、能力预览、旧档迁移、普通拼命、主角绝处逢生和固定骰点闪避。绝招阈值使用独立组件夹具，三条完整路线仍使用真实流程操作。

- 最终成长/绝招UI回归在1280×820、844×390、390×844全部通过；包含选中角色的等级/经验显示、草稿预览取消、多角色确认、存档恢复、战斗只读、拼命与绝处逢生和闪避反馈。
- 原棋盘鼠标/触摸回归在1280×820、844×390、667×375、390×844全部通过。最终完整路线曹、孙已通过，刘路线进行中。

### 六维与绝招最终验证

- npm test：5个文件、45项测试全部通过。npm run build通过，沿用原有Phaser包体提示。
- python scripts/verify_growth_abilities.py：桌面1280×820、横屏844×390、竖屏390×844全部通过。
- python scripts/verify_tactical_ui.py：1280×820、844×390、667×375、390×844全部通过。
- python scripts/verify_h5.py：曹、孙、刘全部完成序章、伏击、路线战斗、结局与重开；验证技能点0→3→6、重试与刷新、中文边界和手机布局，无浏览器运行错误。
- 独立审查两项意见已修复并复核；检查了成长面板与主角绝招的桌面/手机截图。git diff --check通过。
- 新功能保留为本地工作区改动，尚未提交或推送。

## 2026-10-22 人物详情与棋盘形象

- 使用brainstorming、writing-plans梳理人物志双栏布局、移动端滚动、实时战斗数值与共享外观资料；继续在现有功能分支和工作区实施。
- 通过内置image_gen补齐阿满、陈达、山贼头目和普通山贼立绘，保留原始生成文件并复制到项目。
- 已实现人物详情主体、成长/HUD/战场详情入口和动态兵器小人；身份映射3项测试通过，全部48项测试及构建通过。正在验证手机/桌面界面及修正测试对路线页HUD的错误假设。

- 用户追加要求人物动作不要相同；基于各自立绘重做四幅v2，区分探步、护身、抱臂、缩身动作，棋盘同步使用五种站姿和独立兵器，增加移动/攻击/闪避/绝招的短动画并尊重减少动态效果设置。
- 五幅实际使用PNG均为1024×1536、RGBA，图像解码通过；四幅初稿移至忽略的artifacts/portrait-drafts，项目发布只带最终素材。最终编辑提示词记录在docs/art/2026-10-22-character-portraits.md。
- 详情在1280×820、844×390、390×844通过切人/全身图加载/实时HP/倒地和已行动查看/草稿与路线DOM恢复/输入隔离/焦点检查，横屏同时覆盖减少动态效果。
- 修正裁剪头像的可视边界断言，压缩窄横屏详情按钮以免挤出经验条，调整队员名单与绝招按钮间距。成长与绝招三种尺寸回归通过，棋盘四种尺寸首轮通过，最后间距调整后重跑中。
- 最终npm test 48/48，npm run build通过（原有Phaser包体提示），git diff --check通过。只读独立审查未发现重要问题。开发时一次长流程采样状态不一致，冻结游戏代码后重新执行三路线；曹路线已通过，其余进行中。

### 人物详情与动作最终验证

- 48项单测与生产构建通过；新增身份/装备/五种站姿测试有失败到通过记录。
- 人物详情三种尺寸全部通过，包含实时体力、装备、倒地与已行动状态，普通敌人图像加载，模态焦点与输入隔离，成长草稿与路线选择恢复。
- 成长/绝招三种尺寸通过；最终棋盘交互在1280×820、844×390、667×375、390×844全部通过。
- 冻结代码后的三条路线全部完成序章→伏击→补给→路线战斗→结局→重开，未重现开发时状态采样不一致。
- 已检查新版四幅立绘及桌面/横屏/竖屏人物志和棋盘截图，修正了名单与绝招按钮重叠。独立审查无重要问题。
- 所有改动保留在当前工作区，未提交或推送；本地开发服务为http://127.0.0.1:5173。

## 2026-10-22 群雄与女性人物

- 用户要求曹操、刘备、孙权，并确认女性角色选择孙尚香、貂蝉、蔡琰。六人以人物志角色接入，配独立立绘和对应小人预览；保留当前流民队伍。
- 内置image_gen生成六幅不同脸型、服装与姿势的PNG，孙尚香补一次取景编辑以修正被截断的弓顶。已检查全部图像，六幅1024×1536 RGBA可正常解码，提示词保存到docs/art/2026-10-22-historical-portraits.md。
- 抽出共享FigurePainter与paintUnitFigure，Phaser棋盘和HTML Canvas预览共用；新增长袍/裙装/发式/扇/书卷/佩剑与六种pose。
- 人物详情增加同行/乱世人物/本场敌人分类；NPC仅展示身份、擅长和装备，不伪造战斗等级、体力与绝招。阵营卡显示对应主君与独立详情按钮，关闭后保留原DOM与选择。
- 新资料测试先确认缺模块失败，实施后新增3项通过，总51项通过。构建通过，沿用原有Phaser包体提示。六人UI三尺寸首轮和取景修正后的三尺寸均通过，独立只读审查未发现重要问题。
- 已通过原详情三尺寸、成长三尺寸，棋盘四尺寸与三条完整路线最后回归进行中。截图检查修正了阵营头像默认居中导致面部被裁掉的问题（改为顶部取景）。
- 三路线中的触摸刘路线发现新头像/详情使确认按钮在844×390首屏底部溢出；新增首屏断言稳定复现，并用紧凑主君行和粘性底部操作区修正，准备重新验证。
- 横屏确认首屏可见的新增断言已通过；竖屏沿用纵向滚动后检查确认按钮。六人物三种尺寸再次全部通过，包含角色/女性名单、小人非空且各不相同、NPC不展示体力/等级/绝招、分类切换、阵营选择隔离与恢复、战场输入隔离。
- 最终构建通过；原详情三尺寸、成长三尺寸、棋盘四尺寸均通过。只读审查未发现重要问题，桌面/横屏/竖屏截图与主君头像、孙尚香完整弓已检查。修复后的长流程曹/孙已通过，刘进行中。

### 群雄与女性人物最终验证

- npm test：7文件、51项通过；npm run build通过，保留原有Phaser包体提示。
- 新人物与原人物详情：1280×820、844×390、390×844全部通过；成长与绝招三尺寸通过；棋盘四尺寸通过。
- 修复横屏确认区后，曹、孙、刘三条路线再次全部完成序章→伏击→补给→路线战斗→结局→重开；667×375和390×844阵营选择及画布布局通过，无浏览器运行错误。
- 只读审查无重要问题，素材/截图与提示词已保存；git diff --check通过。本轮未提交或推送，原有工作区改动完整保留。

## 2026-10-22 提交与远程同步

- 用户要求将当前工作提交至本地与远程Git。
- 提交范围包括六维技能点、智力闪避、角色绝招、全身立绘详情、对应的棋盘小人、六名群雄/女性人物、回归脚本及设计/美术文档。
- 提交前重新执行npm test（51/51通过）、npm run build（通过，原有Phaser包体提示）与git diff --check（通过）。目标分支为codex/tactical-growth。

## 2026-10-22 桌面页面与战斗文字放大

- 桌面（宽度901px起）最大宽度1180→1680px，边距18→12px，保留16:9及高度适配。1716×785实际宽1349px，1920×1080宽1680px，1366×768宽1319px。
- 战斗状态HUD按游戏容器宽度缩放，桌面体力/等级/经验/成长/详情不再固定为10px小字。棋子标注8→11px，精简为名字与体力，武器仍由小人、名单和详情展示；名单11→13px、行动状态9→11px，按钮/说明同步放大并提高小字对比度。
- 51项单测、最终生产构建通过（保留原有Phaser包体提示）。手动浏览器断言覆盖1716×785、1920×1080、1366×768、1024×768的边界和HUD，截图已检查。
- 棋盘交互回归1280×820、844×390、667×375、390×844全部通过；人物详情1280×820、844×390、390×844全部通过。手机竖屏详情仍覆盖完整390×844视口。
- 首轮验证遇到开发中热更新导致页面重载，冻结源文件后重跑全部通过；临时5174服务已停止，原5173服务保留。改动未提交或推送。

## 2026-10-22 董卓、吕布、华雄、甄姬立绘

- 延续人物志与共享小人方案，使用内置image_gen生成四幅独立全身立绘；分别为肥壮宽袖、长翎画戟、重甲横刀、月白蓝裙执玉，原始输出保留并复制进public/assets/characters。
- 扩充四人资料、四种pose、甲胄与长翎，新增halberd/glaive/jade展示物件；NPC仍为尚未同行人物，不改当前队伍或战斗数值。保留任务开始时已有的桌面页面与文字放大改动。
- 资料测试先确认缺少四人时失败，新增后52项测试通过；构建通过（原有Phaser包体提示）。四幅PNG均为1024×1536 RGBA且解码通过，完整提示词保存于docs/art/2026-10-22-more-character-portraits.md。
- 十人物浏览器检查在1280×820、844×390、390×844全部通过：图像加载、十个预览各不相同、NPC未显示战斗数值、切换和关闭不写存档、新小人画布边缘无裁切、阵营选择恢复及输入隔离。
- 原棋盘交互在1280×820、844×390、667×375、390×844全部通过。截图检查优化了吕布预览的戟头：圆弧改为尖刃与两侧月牙剪影，最终复核中。
- 最终52项单测及构建通过，修订后的十人物三尺寸浏览器检查全部通过，新增预览边界无裁切。独立只读审查未发现重要问题，最终截图及git diff --check通过。本轮未提交或推送。

## 2026-10-22 姜垣成长与武器立绘

- 用户要求主角随等级变得更华丽，并随武器切换立绘。确定Lv.1–2流民、Lv.3–5历练、Lv.6–10统领，覆盖五种WeaponId共15种组合。
- 原有流民菜刀图保留，新生成14幅。历练短刀与统领基础图已生成；统领初稿实际为宽菜刀，按实际图像归入统领菜刀，后续单独生成窄刃短刀。
- 流民空手、短刀、木枪图已生成并检查。首轮流民猎弓调用被生图服务输入审查拒绝（violence），未生成；任务本身为非血腥角色持弓展示，将改为手持未搭箭木弓的静态行旅构图重试，不切换工具或模型。
- 使用subagent-driven-development将TS/CSS/图鉴验证交给独立实施任务，主任务继续生成与检查位图；双方分工不修改对方负责文件，不自动提交。
- 14幅新增立绘已全部复制进项目，均为1024×1536 RGBA且有透明alpha；流民弓手静态重试成功。14个完整原始提示词保存至docs/art/2026-10-22-hero-visual-progression.md。
- 主角纯外观派生已接入HUD、棋盘和详情，共享小人随等级显示皮护具或札甲披风。图鉴使用局部预览状态，不修改真实等级、装备、属性或存档。独立审查发现返回当前外观后焦点丢失，修复后复查无重要问题。
- 浏览器检查中的固定坐标触摸会点到原生select并打开选单，已改用覆盖真实棋盘的非交互区域检查输入隔离；Escape可在弹窗内部和点击背景后关闭。一次完整流程被开发热更新中断，冻结源文件后重新运行。
- 最终57项单测和生产构建通过（保留既有Phaser大包提示）。主角图鉴三尺寸1280×820、844×390、390×844全部通过：15图加载及小人各不相同、6等级边界×5武器的真实HUD/棋盘/详情一致、属性/存档/行动纯净、重置与键盘关闭。9张阶段截图已检查桌面、横屏和竖屏代表样例。
- 三路线从序章、伏击、补给到路线战斗、结局、重开全部通过；战败重试、刷新恢复、成长与窄屏布局均通过，浏览器无运行时错误。原有角色/成长/棋盘兼容回归继续执行。
- 兼容回归最终全部通过：人物详情3尺寸、成长/绝招3尺寸、棋盘交互4尺寸、十名历史人物3尺寸。代码复查问题已解决，git diff --check通过。本轮未提交或推送，保留之前桌面放大及四名历史人物的未提交改动。

## 2026-10-23 六位名人角色

- 按既有立绘与人物志方案新增张辽、关羽、张飞、赵云、糜夫人、张星彩。张星彩按成年故事人物形象塑造。六图使用内置image_gen逐人生成，全部1024×1536 RGBA、带透明alpha，原件保留；图片落盘public/assets/characters，完整提示词存于docs/art/2026-10-23-six-famous-portraits.md。
- 六种独立姿态和服色、长刀/蛇矛/白翎长枪/丝帕/剑盾展示道具已接入，人物志扩为16人。战斗武器规则、成长、队伍和主君映射保持原有逻辑。张辽装备名称按图改为长柄战刀，糜夫人小人采用绛红外袍和米白内衬。
- 16人、6女性及新角色断言先红后绿，最终58项单测通过；浏览器多尺寸与构建复核中。未提交或推送，保留之前全部未提交工作。
- 最终58项测试和生产构建通过（既有Phaser大包提示）。16人浏览器验证在1280×820、844×390、390×844通过，覆盖图像加载、16种不同预览、新小人无边界裁切、存档和战局不变；主角15外观三尺寸及棋盘交互四尺寸回归全部通过。检查关羽桌面、张星彩竖屏等截图，立绘和小人匹配。独立只读审查未发现重要问题，git diff --check通过。未提交或推送。
- 按用户反馈将赵云调整得更阳刚：生成zhao-yun-v2.png，增强眉骨、方下颌、肩背及成熟气质，保留银甲白缨蓝披风和无须形象；人物志切换v2，原图保留，小人肩宽微增。58项测试、构建及16人人物志三尺寸浏览器检查通过，完整提示词追加到六人美术记录。本次未提交或推送。
- 继续按用户要求换姿势：生成赵云v3横枪护卫版，屈膝低重心、前后错步、双手横斜握枪，保留硬朗面容和衣装。内置image_gen清理首稿多余星形装饰，最终1536×1024透明PNG落盘，旧图保留。同步小人宽站横枪与简介，58项测试及构建通过，人物志三尺寸检查与手机截图确认长枪完整、小人不裁边。本次未提交或推送。
