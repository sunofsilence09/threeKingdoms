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

## 六维与绝招实现

- 技能点与已投入六维之和严格等于升级累计点数，旧版 level/xp 存档补齐基础属性并发放未分配点。
- 智力按每点2%增加真实闪避，使用战斗种子状态保证相同操作可复现；非法攻击不推进骰点，闪避消耗攻击和强化但保留目标守势。
- 拼命与绝处逢生独立记录本场已用状态，下一击强化在攻击或本方回合结束时清理，发动不占正常行动。
- 成长面板保留原页面DOM而非重建，关闭后可恢复路线卡选择和胜利继续按钮；多角色草稿全部验证后只保存一次。
- 魅力经验按整数百分比计算，避免45×1.4因浮点误差被截断成62。

## 2026-10-22 人物详情与棋盘形象

- 三名队员和山贼头目/普通山贼共五种基础形象；两名山贼共享职业立绘，姓名与装备仍来自各自战斗单位。
- 详情复用现有保留DOM的模态模式，战斗时传入实际CombatState；立绘与棋盘小人共享衣色/头带/体型，兵器单独按当前装备绘制。
- 已生成并检查四幅补充PNG，姜垣使用上一轮资产；新增角色身份测试先确认缺模块失败，实施后3/3通过，总单测48/48，生产构建通过。
- 首次UI验证发现上轮开发服务已停止，重启5173后继续。首轮入口缺失失败符合预期；接入后的测试在路线页检查到该页无HUD，需从该页已有成长入口进入详情验证DOM恢复。
- 最终路线页加入独立人物详情入口。用户追加动作差异后，四幅立绘改为v2，模型共享五种pose配置，真实武器仍来自CombatUnit。
- 新头像采用框内裁剪，几何断言检查其实际可视边界；窄横屏缩小新按钮以保留原HUD高度。名单上移4px并缩小绝招条，避免两者重叠。
- 详情三尺寸、成长三尺寸、棋盘四尺寸和冻结代码后的三条完整路线均通过，48项单测及构建通过。

## 群雄与女性人物

- NPC资料与真实战斗/存档分离，current party仍为姜垣、阿满、陈达。新人物从详情分类和阵营卡进入，不修改奖励与战斗数值。
- 共享绘图接口支持Phaser与Canvas 2D，详情中增加放大小人；测试点击战场时须使用#game-container canvas，避免误选新增预览canvas。
- 新人物与现有单位的肖像、衣色、pose通过稳定ID关联；新增主君佩剑、孙尚香弓手、貂蝉扇与裙装、蔡琰书卷与长袍。
- 孙尚香初稿弓顶截断，使用内置image_gen编辑重新取景并保存v2；阵营主君头像须以顶部定位裁剪，居中cover会切掉面部。
- 新头像及详情行增加卡片高度，短横屏需紧凑头像/姓名行和sticky操作区，保证确认按钮首屏可见；竖屏保持纵向滚动。新增可见性断言先复现失败，修复后通过。
- 最终51项单测、构建、新人物与原详情/成长/棋盘各尺寸、三路线完整流程全部通过，零浏览器运行错误。

## 2026-10-22 桌面可读性

- 当前页面限制1180px且按高度缩小；战斗名单11px、状态9px、棋子8px，HTML战斗HUD还有10px固定字号。
- 采用桌面最大1680px、12px外边距并保持16:9完整可见；HTML HUD按游戏容器宽度缩放。Canvas保持960×540逻辑坐标与现有点击位置。

## 第二批人物立绘

- 新增董卓、吕布、华雄、甄姬后，人物志共十名NPC、四名女性；资料不参与当前战斗进度。
- 共享小人增加tyrant/halberd/bruiser/jade站姿、armor/plume外观与halberd/glaive/jade物件；长兵器/长翎需验证192×160预览边缘不被裁切。
- 扩展后的浏览器检查验证十幅图片和十种预览唯一性、不写存档及NPC与战斗数据隔离。小尺寸方天戟用实心月牙剪影比圆环更易辨认。

## 2026-10-23 本地启动包
源码入口引用 /src/main.ts，直接 file:// 打开无法加载。采用编译资源、绑定127.0.0.1:18743的静态服务和随包Node.js运行程序；CMD从自身目录定位，浏览器进度按固定地址保存。浏览器验证须等待人物图像完成解码，networkidle单独不足以保证naturalWidth已更新。

## 2026-10-23 历史行旅改版
- 当前原型原先没有日期/出生地区，且固定临水镇立即选择三方；本次将阵营资格集中到availableRoutes/selectRoute，避免只在UI锁定。
- 中立护送复用route战场时必须保存encounter字段，否则刷新会按无阵营误恢复成ambush；中立护送奖励与阵营任务分别用xp:escort/xp:route防止互相吞奖。
- 年份节点之间用明确的多年流徙叙事过渡，目前不声称已制作完整黄巾/官渡大战。

## 2026-10-23 出生地点扩容
- 州级随机不能直接对16地点平铺抽签，否则豫州、荆州、扬州会各有双倍州权重；使用两次独立随机抽州/州内地点。
- 东汉十三州范围包括司隶；184年交趾采用刺史部称谓。暂不把后来设立的雍州、广州等独立区域加入184年出生池。
- 位置y390/400会被桌面英雄HUD覆盖，已上移至350并加可见范围回归检查。

## 2026-10-23 地方官员研究启动
- 用户要求历史对应的太守、刺史人物设计与绘画。按184年开局核对任职，不能用190年诸侯地图替换184年官员。
- 官职区分司隶校尉、河南尹、州刺史/州牧、郡太守、国相。缺乏史料则保留空缺，不以知名人物填补。
- 现有NPC接口位于historicalCharacters.ts，人物志支持透明全身PNG及共用小人；portrait角色引用必须落在public/assets/characters内。
- 已读imagegen内置工具流程与既有画风记录，预览曹操和刘备全身立绘。州级与郡级史料分派为两个独立只读研究任务。

## 2026-10-23 地方官员数据规则
- 帝纪184年三月是何进升大将军、褚贡遇害；四月为赵谦邵陵败、郭勋与广阳太守刘卫遇害；六月为秦颉见任、遣贾琮。不能把广阳太守移作涿郡太守，或把年内史事当三月现任。
- 王允任职只给年；徐璆六月围宛、郭典十一月战事是见任节点，非任命日期。界面用历史身份与证据状态显示，避免假造完整任期。
- 河南尹、东海相、北海相和太守区分；资料空缺明确为首批覆盖范围不足，并非断言史书绝无材料。
- 某些人物生平概要与编年证据在不同卷：徐璆补卷48、贾琮补卷31为第二史料链接，所有链接纳入可见元素焦点循环。

## 2026-10-23 世界地图升级查考
- 当前Overworld是每个出生点共用三点图，GameDate仅年月，旧任务按月推进且结局自动跳章；需要位置、日历与旅程分离。
- CHGIS全国快照是1820/1911，不能直接作为184底图：https://gis.harvard.edu/china-historical-gis 。
- 武关道路线可参考社科网《探幽秦楚古道》，蜀道体系参考北大考古学院《蜀道考古的若干问题》；采用原创山川概绘与历史城邑路线网络。
- 本轮一次路径读取误用src/scenes，实际在src/game/scenes，已更正。

### 0.2 联调结论
- 旅行固定路径与LCG随机状态随存档保存；事件阻断推进，选择/战斗结算清事件，避免重复奖励。
- 已实测修复地图SVG组bbox点不到城名、DOM地图退出后Phaser命中区校准、敌方待机撤退后计时回调继续执行、中立护送后阵营任务失去入口、最早0.1仅xp:route存档缺escortWon等问题。
- 路线示意不等于精确古驿道；游戏历法30日/月与30/50/20公里日速是平衡参数。战棋刷新重开同场战斗，保留旅程事件上下文，并非回合级CombatState存档。

## 2026-10-23 招募与队伍
现有PARTY_IDS与PartyProgress固定三名，createCombatState、奖励、成长草稿/名称、详情均有写死名单，需同时改为成员与实际出战者驱动。人物志16人已有立绘和小人外观，但没有招募状态；前四名武将可复用现有资产并补充实际战斗兵器。公开阅读三国志卷36/17，对历史背景与架空邀请明确分开，不声称名将真实追随主角。mcporter未安装，公开资料用内置web读取。

## 0.3 全人物招募与五人队伍
- 用户授权覆盖31个既有身份：主角固定、两名初始伙伴已同行、28人可新邀请；所有角色共享0..100亲密度，门槛60，免费培养路线不会被军需卡住。年代/地点只限制新相遇，长期同行明确为架空支线。
- 动态party成长与deployed名单分离，本场battleParty保存；仅出战者拿经验和政略补给。初始三人及旧成长、0.2旅行上下文均兼容。
- 角色目录独立于模型解析器，避免循环；14种兵器覆盖模型。招募山贼头目时，敌方实例使用enemy:前缀；详情匹配同时限定team，候补不能误认敌首。
- 所有战斗详情/只读成长路径必须传递真实CombatState，不能按已选阵营推断途中伏击装备；该问题经实际浏览器RED→GREEN覆盖。
- 关闭成长触发父面板重建后，原按钮已脱离DOM；按同人物卡片和按钮标签恢复焦点，并在关闭队伍时聚焦地图入口。
- 孙策依据卷46裴注兴平二年渡江背景，从195开放江东窗口；其余窗口为已标明的游戏近似。孙坚、孙策目前用各自具名SVG身份图。

## 0.4升级设计发现
当前advanceTravel固定3日、逐日16%触发概率；事件保存seed和原行程，但没有CG阅读阶段。当前无货币、商品、库存或市场模块。Overworld提供城中事务，尚无城市内部页面；可复用inspection实现独立城市面板。狼群必须新增敌方模型/身份，不能换山贼名称敷衍。孙坚孙策仍为SVG身份图，用户确认本轮补齐并新增诸葛亮周瑜。已通过内置网页工具阅读三国志卷35、54，历史背景与游戏相遇窗口分开。参考关羽现有半写实全身立绘作为艺术风格，CG采用横版场景。

## 0.4集成发现与实现边界
- 经济模块保存商品数量和整数总成本，部分出售按比例分摊、末次售清成本；BigInt只用于安全分摊，保存仍为JSON整数。库存与价格按日期的7日周期确定，不在重新开窗时重抽。行情使用±0.2、fromDay包含/untilDay不包含且固定30日，同城同货替换。
- CG阅读状态是事件的一部分，先持久化事件/行情，再显示插画，确认只改cgSeen。事件选择守卫在纯函数中执行；旧档未读事件也补看CG，战斗刷新保留敌种和本场名单。
- 狼群采用wolf:身份、爪牙与四足几何；不进入人类目录，不伪装山贼。陆路跨入水路节点当天事件按刚完成路段判断，因此正常陆路事件档案仍可读取。
- 本次人物目录33个身份（主角固定、初始伙伴2、新邀请30）；孙氏ID和旧成长保持，诸葛亮和周瑜游戏相遇窗口与历史背景区分。
- 真实异常测试捕获hidden属性被CG的display:block覆盖；补专门[hidden]样式并让无图CG单列，开发/生产浏览器先失败后通过。
- 交易和消息的价格/特产是玩法设定，非汉末逐城统计复原；本版不做商队AI、物资抢夺、装备打造或永久死亡。

## 0.4.1 商品补足十种
用户明确要求不足十种直接增加；原目录8种，新增米酒wine基础44、皮革leather基础48。沿用跑商，南方米酒/北方皮革修正为游戏参数。新增商品会使旧8-key库存触发严格经济校验，故增加migrateEconomy：只允许完整旧8-ID库存形状补齐两种新库存，其余字段与老库存/周期不变，运行态仍严格要求10种。城市DOM及行情动态使用GOODS，无额外分支。

## 0.5设计发现
0.4.1十商品仅文字卡，无独立图片，public/assets没有goods目录；城市使用商旅横幅。招募门槛目前全局60，需统一新增任职查询与动态门槛供纯函数和UI使用。六人背景涉及袁术/张邈自为主事、陈宫高顺吕布军府、周泰韩当孙氏，因此不能笼统全部伪称郡守雇员；未知官员姓名仍留空。当前地图缺寿春与下邳，拟新增两节点/5路并保留旧路以兼容存档。用户已选受雇80。历史来源已读三国志卷6/7/55，考古/地方官方来源用于位置；都是游戏窗口，不冒充连续任期。

0.5实现确认：任职从年月、职业阶段和同行名单推导，不新增独立可漂移的存档名册；已招募者不再出现在府署，雇主同行后其部属原城待聘60。cityServices省略cityId时返回全城名册，城市UI显式传入当前城。旧34城的库存及进行中道路保持有效，新城缺失库存使用默认值首次成交补存。地方称谓应保留南郡等双字名称，九江郡→九江太守、下邳国→下邳相、京兆尹不追加太守；完整回归捕获南太守问题并修复。16张生成图与原件逐字节一致，透明通道保留；周泰另做一次构图编辑后完整兵器入画。

## 0.6地方军士与十三人物设计
用户指定13人，并选择卑弥呼仅绘画/人物志。建议36城×2职业=72独立军士，共用两图；加13人后资料目录124，历史目录37，12人可相遇。夏侯惇194前后需两图，总16新图。只读资料与招募需分开，空窗口不应误报已故。现有characterDetails仅识别HISTORICAL_CHARACTERS或同行/敌人，未同行地方军士及旧官员/Sun系详情会选到姜垣，需在本次接入统一资料解析。serviceLabel遇到无具体雇主的employed会输出undefined，机构雇佣需处理。驻军绑定不可用同城governing盲选，张燕/马腾联络点不代表当地太守。已读三国志6/8/9/30/31/36和后汉书73；表中城市窗口明确属游戏编排。

0.6实施用户修订优先：每城5000基础守军，太守/主事与士兵长共同管理；普通士兵条目只读，不能交往/邀请/部署/伪造存档入队，只有士兵长可邀请。人数默认每月+50、上限20000，明确游戏战事比例影响；月数分段直接推导，无需新存档字段。捕获5400×0.7向下取整成3779的浮点误差，改用整数百分比得到3780。部队生命50000、攻击15000、防御5000、六维50000；实际战斗承伤/绝招消耗会按存活兵数降低数值，速度移动射程不叠加。主事已同行时普通士兵仍在原城守备，只让可招募士兵长待聘；该语义已有RED→GREEN回归。

## 0.7动态攻城设计发现
用户要求NPC随时间攻占其他城市，已选历史开局后动态争夺。0.6守军数是date纯推导，无法保留真实出征扣兵/伤亡/归属，必须新增有版本的worldConflict存量、固定独立随机流和最后结算日。耗时分散于travel、recruitment、state，需统一推进而不能只在地图打开时运行AI。静态careerData/招募窗口会与占领后归属冲突，人物位置、服务与相遇必须统一走动态解析；已同行角色排除。0.6未来固定战乱比例不能与新世界实际战争重复扣兵，也不能强行覆写AI战果。老档在当前年月接入快照、保留旧兵力/经济/队伍/旅程，不能从184重演几十年。

0.7实际接入worldTime统一日结与personPosting驻地解析，世界随机流独立于旅程；新存档严格校验完整已到期阶段集合与决策时钟，避免损坏存档重复起兵或让AI停摆。独立审查还发现并回归修复：未来人物提前任职、伪造行军起点、中途改道丢失已走路程，以及出征人物被旧城静态快捷入口重复拜访。军队中途道路失效时先走完当前边剩余路程再在节点改道；失效的旧人物接触事件只消耗一天获得传闻，不伪造亲自相遇。最终审查无未解决P0/P1/P2。

真实浏览器验收以合法近结算军队夹具设置世界初态，再通过游戏帮工/赶路按钮推进；验证真实占领、伤亡、失败后道路归营、旅行目的地途中易主。面板和交易不推进时钟；旧档迁移提示关闭后刷新不再出现。390×844真实触控与844×390布局通过。开发版与阻外网18743生产包执行相同完整脚本通过；原有92个资源文件与包内副本SHA256全部一致。

## 0.8姓名、火势与武学设计发现
现有姓名姜垣分散在8文件/15行含测试和人物简介，角色稳定ID为traveler；姓名不能直接改静态名册以免破坏招募/成长。战斗只有道路/森林等地形与速度队列，无weather/wind/fire或切磋；advanceTurn轮末是统一环境结算入口。BattleScene目前开战重新构造combat，只有遭遇/名单存档，需新增完整快照避免刷新重抽火势和传授。人物37历史目录+孙坚孙策2+地方官员8=47，卑弥呼只读不变。战斗兵团生命变化需统一formationStrength，火伤/治疗也须同步兵力。亲密交往耗时通过worldTime推进，学习随机流不能改变战略战争。新增设计见docs/superpowers/specs/2026-10-24-fire-martial-name-design.md，待确认数值。

0.8最终接口：battleEnvironment纯随机/天气，combat统一行动/环境/生命更新，martialCatalog47映射，martial学习日程与传授，martialCombat11模板，battleSave按遭遇完整校验。新BattleCommands为可访问DOM指令，地图仍由Phaser绘制。start-duel在main全局导航，防止成长/结局详情调用缺场景处理；请教只标记Overworld失效，等inspection关闭才刷新，避免重绘导致inert失效。performMartial的turnEvents包含内部火伤/两次点火并以公共事件收尾，不复用旧事件；native与learned装备只在开局初始化，恢复快照不重置。包内Node与v24.19.0捆绑运行时SHA一致，因此复用打开的同一文件即可安全更新资源，无需结束用户服务。

## 1.0世代更迭设计发现
基线已在main c0b2df1，0.8合并前复查记录437测试；开始时工作区干净。36城47路缺南京/柴桑/南皮。personPosting和天下activePerson依赖静态相遇窗口，已入队者绕过死亡概念；worldTime是统一时间桥。worldConflict v1严格要求城市数等于WORLD_CITIES，扩城需先识别旧36城快照迁移，不能直接当损坏世界重建；founded/nextDecision也有全量阶段校验。用户先选生卒都±5后明确改为“生年固定、卒年必须浮动”，以后者为准。推荐升1.0.0而非0.9。主角/故事人物/不详生卒需显式游戏设定标签，不能伪造史实。南京官方资料记211徙秣陵、212改建业，建邺作为搜索别名而非184固定城名。

1.0额外兼容风险：travel.journeyLeg/remainingDays/isJourney目前用planRoute查询保存路径中每一对端点。新增道路即使保留47旧边，也可能使该端点间最短路变为多跳，从而错误拒绝旧行程；需按真实直接边读取旧路段，或迁移为固定路段快照，不能重新规划进行中的腿。0.8战斗结算的成长摘要在推进日期后访问party成员，若本次跨卒年并归档死亡同伴，须先保存奖励摘要再清理，避免undefined。人物生命与任职窗口须分开，不能把窗口结束当死亡；寿命延长者不得继续挂已结束的旧官职。主要方案拟60城、26新人、73具名人物/武学、198资料身份，日历到310以覆盖曹奂302±5。新增地名有南京212建业/282建邺等沿革，地方沿革有异说者并列别称而非假定精确切年。
## 1.0 implementation findings

- Old journeys must resolve saved adjacent IDs as direct road legs: the new Shu corridor can beat the old 南郑—成都 edge, so shortest-path lookup corrupts old leg progress. All47old road geometries/costs are retained and verified against a pre-expansion fixture.
- Life draws use an independent campaign seed and a stable per-person stream. A valid saved lifespan is authoritative; corrupted seed metadata must not reroll good records. Complete validated memorials outrank a contradictory future death draw during module repair, preventing revival or lost cultivation.
- New-world migration uses an explicit version2 schema and ledger.expansion120000, retaining all old stocks, troops, army legs and world seed. Only added nodes use dated institutional scene parameters; the scene table never replays over a running campaign.
- On portrait phones, the battle command text changes height. A vertically centered app moved the canvas by11px, almost a full tile at that scale, producing real rapid-tap off-by-one targets. Battle-only top alignment fixes the root cause; real pointer QA now asserts unchanged canvas top through selection and movement.
- Startup is now a separate explicit choice. Merely opening a fresh title screen does not create a continue slot; existing snapshots remain unchanged until choosing continue or explicitly restarting.
