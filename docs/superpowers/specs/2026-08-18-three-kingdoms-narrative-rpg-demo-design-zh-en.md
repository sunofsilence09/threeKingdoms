# 三国叙事 RPG H5 Demo 设计 / Three Kingdoms Narrative RPG H5 Demo Design

Date: 2026-08-18  
Revision: 2026-10-19  
Status: H5 direction revision draft

## 概要 / Summary
这是一个可以直接在电脑或手机浏览器中运行的《三国》题材叙事 RPG H5 垂直切片 demo，背景设在东汉末年。玩家从流民开局，组建一支 3 人小队，在半开放的局部区域中探索，并在共同的逃难序章后选择曹、孙、刘其中一方接触或投靠。这个 demo 同时证明四件事：浏览器端体验、探索、战术回合制战斗，以及分支后果。

This is a browser-playable vertical-slice demo for a Three Kingdoms narrative RPG set in the late Eastern Han. The player starts as a refugee, forms a 3-person party, moves through a semi-open local region, and chooses to approach or join Cao, Sun, or Liu after a shared escape prologue. The demo proves four pillars: a browser H5 experience, exploration, tactical turn-based combat, and branching consequences.

## 产品目标 / Product Goals
- 让玩家感受到在崩坏时代求生的压力。  
  Make the player feel the pressure of surviving in a collapsing world.
- 让玩家明白，这个故事讲的是普通人如何被卷入历史。  
  Show that the game is about ordinary people being pulled into history.
- 让战斗本身足够有策略感，能独立成立。  
  Make combat strategic enough to stand on its own.
- 让关键历史压力点能够发生分支。  
  Demonstrate that key historical pressure points can branch.
- 让玩家无需安装客户端，就能在移动端或桌面浏览器中完成一段完整体验。  
  Let the player complete a full slice on mobile or desktop browsers without installing a client.

## 非目标 / Non-Goals
- 不做完整战役体量。  
  No full campaign scale.
- 不做大地图开放世界。  
  No large open world.
- 不做大量职业、阵营或结局。  
  No dozens of classes, factions, or endings.
- 不做深度经济、城建或大战略系统。  
  No deep economy, city building, or grand strategy.
- 不做 demo 阶段的账号、联网对战或服务端存档系统。  
  No accounts, online multiplayer, or server-side saves in the demo phase.
- 不以原生 PC、手机 App 或微信小游戏作为第一阶段交付目标。  
  Native PC/mobile apps and WeChat Mini Games are not first-phase delivery targets.

## H5 技术方向 / H5 Technical Direction
- 使用 Phaser 3 + TypeScript 作为 2D 游戏框架和主要逻辑层。  
  Use Phaser 3 + TypeScript as the 2D game framework and primary logic layer.
- 使用 Canvas 绘制地图、角色、像素动画和战斗场景。  
  Use Canvas for maps, characters, pixel animations, and combat scenes.
- 使用 HTML/CSS 制作对话框、曹孙刘路线选择、任务菜单和结算界面。  
  Use HTML/CSS for dialogue panels, Cao/Sun/Liu route selection, quest menus, and result screens.
- 优先适配手机横屏浏览器，同时兼容桌面浏览器的鼠标和键盘输入。  
  Prioritize landscape mobile browsers while supporting mouse and keyboard input on desktop browsers.
- 使用触摸或点击完成移动、选择目标、释放技能和推进对话。  
  Use touch or click input for movement, target selection, skills, and dialogue progression.
- 使用 LocalStorage 保存路线选择和 demo 进度；第一阶段不依赖后端服务。  
  Use LocalStorage for route choices and demo progress; the first phase has no backend dependency.
- 使用压缩后的像素风 2D 素材，控制首屏加载和移动网络下的资源体积。  
  Use compressed pixel-art 2D assets to control initial load time and mobile data usage.
- 以静态网页方式部署，便于生成一个链接后直接试玩。  
  Deploy as a static website so the demo can be played directly from a link.

## 玩家幻想 / Player Fantasy
从一个无名之辈开始，在乱世中活下来，结识盟友，选边站，并逐渐开始影响历史，而不只是被历史推动。

Start as a nobody, survive the road, gain allies, pick a side, and begin to shape history instead of only being shaped by it.

## 核心循环 / Core Loop
点击或触摸移动 -> 遭遇 -> 战术战斗或对话事件 -> 城镇休整与招募 -> 选择曹、孙、刘路线 -> 路线任务与后果战斗 -> 结尾场景。

Tap or click to move -> encounter -> tactical battle or dialogue event -> town recovery and recruiting -> choose a Cao, Sun, or Liu route -> route task and consequence battle -> closing scene.

## Demo 结构 / Demo Structure
1. 开场逃难。玩家作为流民逃离，学习移动、队伍和基础交互。  
   Opening escape. The player flees as a refugee and learns movement, party setup, and basic interaction.
2. 第一个盟友。一个固定同伴加入，建立队伍核心和第一个战斗职责。  
   First ally. A fixed companion joins, establishing the party core and the first combat role.
3. 第一次战斗。路上的伏击展示站位、技能和资源使用。  
   First combat. A road ambush establishes positioning, skills, and resource use.
4. 城镇据点。玩家可以休整、对话、在这里招募第二个同伴，并感受当地政治张力。  
   Town hub. The player can rest, speak, recruit the second companion, and see the local political tension.
5. 三方选择。玩家在共同序章结束后，面对曹、孙、刘三方提出的不同条件，选择下一步接触或投靠的对象。  
   Three-way choice. After the shared prologue, the player chooses which of Cao, Sun, or Liu to approach or join based on their different terms.
6. 路线后果。选择会改变第一项路线任务的目标、一个队伍或资源优势、后续一场战斗的开局，以及一段关键对话。  
   Route consequences. The choice changes the first route objective, one party or resource advantage, a later battle setup, and one key conversation.
7. 结尾钩子。demo 以通往更大冲突的明确悬念收束。  
   Closing beat. The demo ends with a clear forward hook into wider conflict.

## 探索 / Exploration
- 使用半开放的局部地图，而不是完整世界地图。  
  Semi-open local map, not a full world map.
- 只有一条起始路线、一个聚落、一个路口关卡和一个城镇据点。  
  One starting route, one settlement, one road checkpoint, and one hub town.
- 支线事件可以存在，但路线顺序要足够简单，适合短 demo。  
  Optional events can exist on side paths, but the route order should stay simple enough for a short demo.
- 区域需要有可穿行的感觉，而不是空洞的摆设。  
  The region should feel traversable rather than empty.
- 地图交互以点击和触摸为主，关键地点使用清晰的可点击标记。  
  Map interaction is primarily click- and touch-based, with clear markers for important locations.
- 曹、孙、刘三条路线共用主要地图和大部分遭遇，控制内容分流规模。  
  The Cao, Sun, and Liu routes share the main map and most encounters to keep branching content contained.

## 队伍与战斗 / Party and Combat
- 战斗队伍为 3 人。  
  The combat party is 3 characters.
- 玩家角色是队伍的锚点。  
  The player character anchors the party.
- 第一个同伴负责建立稳定的前线或支援职责。  
  The first companion fills a stable frontline or support role.
- 第二个同伴在城镇段落中招募或解锁。  
  A second companion is recruited or unlocked through the town sequence.
- 战斗采用回合制，并且重视站位。  
  Combat is turn-based and position-aware.
- 前后排、直线攻击和目标可达性都要有实际意义。  
  Position matters through front/back placement, line attacks, and target access.
- 每个角色都有小而清晰的技能组：普通攻击、防御手段，以及 2 到 3 个标志性技能。  
  Each character has a small kit: basic attack, defensive option, and 2-3 signature skills.
- 系统重点放在联动、节奏和资源管理，而不是单纯堆数值。  
  The system emphasizes synergy, tempo, and resource management over raw stat checks.
- 每回合提供行动点，强攻或防守表现会积攒 Resolve，用于更强招式。  
  Each turn grants action points, and strong offensive or defensive play builds Resolve for stronger moves.
- 战斗清晰度比大单位数量更重要。  
  Battle clarity matters more than large unit counts.
- demo 的敌人阵容保持精简：山贼、民兵斥候、绝望逃兵，以及一个小头目。  
  Demo enemy roster stays small: bandits, militia scouts, desperate deserters, and one mini-boss.
- 战斗界面优先适配触摸操作：点击角色、格子或目标，再确认行动。  
  Combat UI prioritizes touch input: tap a character, tile, or target, then confirm the action.
- 避免依赖高频操作和大量实时特效，保证手机浏览器中的可读性与稳定性。  
  Avoid high-frequency input and heavy real-time effects to preserve readability and stability on mobile browsers.

## 叙事与选择 / Narrative and Choice
- 开场是流民故事，而不是英雄出身。  
  The opening frame is a refugee story, not a hero origin.
- 第一个固定同伴让玩家马上拥有情感连接和继续前进的现实理由。  
  The first fixed companion creates an immediate bond and a practical reason to keep moving.
- 共同序章让玩家先理解流民处境，再把曹、孙、刘选择变成一次有情绪基础的价值判断。  
  The shared prologue establishes the refugee situation before turning the Cao, Sun, and Liu choice into an emotionally grounded value judgment.
- 曹路线强调秩序、效率与服从；孙路线强调地方、人情与机动；刘路线强调仁义、承诺与保护弱者。  
  The Cao route emphasizes order, efficiency, and obedience; the Sun route emphasizes local ties, mutual aid, and mobility; the Liu route emphasizes benevolence, promises, and protecting the vulnerable.
- 选择不只是文字标签：它至少要改变第一项任务的目标、一项初期优势、一场战斗和一段后续对话。  
  The choice must be more than a label: it must change the first objective, one early advantage, one battle, and one later conversation.
- 三条路线约七成内容共用，约三成内容分流，避免 demo 需要制作三套完整游戏。  
  Roughly 70% of the three routes is shared and 30% branches, avoiding three complete games inside the demo.
- 历史事件更像压力而不是轨道。玩家可以偏离，但世界会回应。  
  Historical events are pressure rather than railroads: the player can deviate, but the world responds.

## 内容范围 / Content Scope
- 1 个开场流程  
  1 starting sequence
- 1 个小区域  
  1 small region
- 1 个城镇据点  
  1 town hub
- 1 个曹、孙、刘三方路线选择节点  
  1 Cao/Sun/Liu route-choice node
- 3 个路线接触场景或任务变体，共用主要地图与战斗系统  
  3 route-contact scenes or task variants sharing the main map and combat systems
- 1 个固定同伴 + 1 个可招募同伴，合计 2 名非主角队友  
  1 fixed companion plus 1 recruitable companion, for 2 non-player party members total in the demo path
- 3 到 4 种敌人原型  
  3 to 4 enemy archetypes
- 1 个三方路线选择及其后续后果  
  1 Cao/Sun/Liu route choice with downstream consequences
- 1 场最终遭遇或小头目战  
  1 final encounter or mini-boss

## 成功标准 / Success Criteria
- 玩家在前 10 分钟内理解游戏前提。  
  The player understands the premise within the first 10 minutes.
- 只靠几场战斗，玩家也能感到战斗有策略性。  
  Combat feels tactical with only a few encounters.
- 至少有一个故事选择明确改变了后续结果。  
  One story choice clearly changes a later outcome.
- demo 结束时，玩家会自然想继续下去。  
  The demo ends with a clear desire to continue.
- 玩家能在第一次游玩中理解三方路线的基本差异，并愿意尝试另一条路线。  
  The player understands the basic differences between the three routes and wants to try another one.
- 游戏在手机浏览器中可以用触摸完成完整 demo 流程，桌面浏览器可以用鼠标完成同样流程。  
  The full demo can be completed with touch on mobile browsers and with a mouse on desktop browsers.

## 风险 / Risks
- 系统野心过大，可能削弱垂直切片的聚焦度。  
  Too much systemic ambition can dilute the vertical slice.
- 战斗选项过多，可能盖过叙事。  
  Too many combat options can hide the narrative.
- 地图结构太弱，会让“半开放”显得像假的。  
  Too little map structure can make "semi-open" feel fake.
- 三方分支过深，可能造成内容量膨胀，因此需要严格复用地图、敌人和基础事件。  
  Deep branching can inflate content scope, so maps, enemies, and base events must be reused aggressively.
- 移动端屏幕较小，若信息层级不清晰，战斗和对话界面会显得拥挤。  
  Small mobile screens can make combat and dialogue feel crowded if the information hierarchy is unclear.
- 浏览器音频和资源加载受设备与网络影响，需要在首次交互后初始化音频，并控制资源体积。  
  Browser audio and loading depend on device and network conditions, so audio should initialize after first interaction and asset size must be controlled.
