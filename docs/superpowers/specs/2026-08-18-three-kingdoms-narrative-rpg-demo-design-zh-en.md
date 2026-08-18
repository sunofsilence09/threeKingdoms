# 三国叙事 RPG Demo 设计 / Three Kingdoms Narrative RPG Demo Design

Date: 2026-08-18  
Status: Draft for review

## 概要 / Summary
这是一个《三国》题材叙事 RPG 的垂直切片 demo，背景设在东汉末年。玩家从流民开局，组建一支 3 人小队，在半开放的局部区域中探索，并做出一个会影响后续遭遇的关键选择。这个 demo 同时证明三件事：探索、战术回合制战斗，以及分支后果。

This is a vertical-slice demo for a Three Kingdoms narrative RPG set in the late Eastern Han. The player starts as a refugee, forms a 3-person party, moves through a semi-open local region, and makes one major choice that affects a later encounter. The demo proves three pillars at once: exploration, tactical turn-based combat, and branching consequences.

## 产品目标 / Product Goals
- 让玩家感受到在崩坏时代求生的压力。  
  Make the player feel the pressure of surviving in a collapsing world.
- 让玩家明白，这个故事讲的是普通人如何被卷入历史。  
  Show that the game is about ordinary people being pulled into history.
- 让战斗本身足够有策略感，能独立成立。  
  Make combat strategic enough to stand on its own.
- 让关键历史压力点能够发生分支。  
  Demonstrate that key historical pressure points can branch.

## 非目标 / Non-Goals
- 不做完整战役体量。  
  No full campaign scale.
- 不做大地图开放世界。  
  No large open world.
- 不做大量职业、阵营或结局。  
  No dozens of classes, factions, or endings.
- 不做深度经济、城建或大战略系统。  
  No deep economy, city building, or grand strategy.

## 玩家幻想 / Player Fantasy
从一个无名之辈开始，在乱世中活下来，结识盟友，选边站，并逐渐开始影响历史，而不只是被历史推动。

Start as a nobody, survive the road, gain allies, pick a side, and begin to shape history instead of only being shaped by it.

## 核心循环 / Core Loop
跑图 -> 遭遇 -> 战术战斗或对话事件 -> 城镇休整与招募 -> 剧情选择 -> 后果战斗或剧情场景 -> 前往下一段路线。

Travel -> encounter -> tactical battle or dialogue event -> town recovery and recruiting -> story choice -> consequence battle or scene -> next route.

## Demo 结构 / Demo Structure
1. 开场逃难。玩家作为流民逃离，学习移动、队伍和基础交互。  
   Opening escape. The player flees as a refugee and learns movement, party setup, and basic interaction.
2. 第一个盟友。一个固定同伴加入，建立队伍核心和第一个战斗职责。  
   First ally. A fixed companion joins, establishing the party core and the first combat role.
3. 第一次战斗。路上的伏击展示站位、技能和资源使用。  
   First combat. A road ambush establishes positioning, skills, and resource use.
4. 城镇据点。玩家可以休整、对话、在这里招募第二个同伴，并感受当地政治张力。  
   Town hub. The player can rest, speak, recruit the second companion, and see the local political tension.
5. 分支选择。玩家在一个关键情境里选择生存、怜悯或服从。  
   Branch choice. The player chooses between survival, mercy, or obedience in a situation that matters.
6. 选择后果。这个选择会改变后续一场战斗的开局和一段关键对话。  
   Consequence. The choice changes a later battle setup and one key conversation.
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

## 叙事与选择 / Narrative and Choice
- 开场是流民故事，而不是英雄出身。  
  The opening frame is a refugee story, not a hero origin.
- 第一个固定同伴让玩家马上拥有情感连接和继续前进的现实理由。  
  The first fixed companion creates an immediate bond and a practical reason to keep moving.
- 关键选择应当在道德上清楚、在结果上有分量：救人、服从权力，或保住队伍生存。  
  The major choice should be morally legible and materially meaningful: save people, obey power, or protect the party's survival.
- 这个结果至少要改变一场战斗和一段后续对话。  
  The result must change at least one battle and one later line of dialogue.
- 历史事件更像压力而不是轨道。玩家可以偏离，但世界会回应。  
  Historical events are pressure rather than railroads: the player can deviate, but the world responds.

## 内容范围 / Content Scope
- 1 个开场流程  
  1 starting sequence
- 1 个小区域  
  1 small region
- 1 个城镇据点  
  1 town hub
- 1 个固定同伴 + 1 个可招募同伴，合计 2 名非主角队友  
  1 fixed companion plus 1 recruitable companion, for 2 non-player party members total in the demo path
- 3 到 4 种敌人原型  
  3 to 4 enemy archetypes
- 1 个中段关键选择及其后续后果  
  1 mid-demo decision with downstream consequence
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

## 风险 / Risks
- 系统野心过大，可能削弱垂直切片的聚焦度。  
  Too much systemic ambition can dilute the vertical slice.
- 战斗选项过多，可能盖过叙事。  
  Too many combat options can hide the narrative.
- 地图结构太弱，会让“半开放”显得像假的。  
  Too little map structure can make "semi-open" feel fake.
