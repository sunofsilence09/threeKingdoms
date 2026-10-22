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
