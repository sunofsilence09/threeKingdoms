# 人物关系网 Implementation Plan

**Goal:** 完成2.1.0，每个人物可查看、搜索、切换关系图。
**Architecture:** 独立资料表定义有方向的关系，纯函数从GameState构建图；独立DOM浮层复用inspectionOverlay，在人物详情接入。
**Tech Stack:** TypeScript、SVG、CSS、Vitest、Vite。

## Global Constraints

只读、不推进日期或随机状态；不增加存档字段；直接联系人每页12人，二度图最多24节点；不虚构亲密度或亲属；覆盖本局原创太守与职业代表；版本2.1.0。

## Tasks

- [x] 1. `src/game/relationshipNetwork.test.ts`先测双向称谓、同行、任职变更、死亡、未知人物、分页、师承和无状态写入，运行确认缺模块失败。
- [x] 2. `relationshipData.ts`记录双方称谓、类型、资料来源；`relationshipNetwork.ts`导出`buildRelationshipNetwork(state)`与`relationshipPage(network, id, filter, page, secondDegree)`，返回完整图及有界视图。
- [x] 3. `relationshipView.ts`与CSS实现可搜索人物、类别过滤、节点切换、导航历史、分页与二度展开；`characterDetails.ts`接入只读入口，复用嵌套浮层和焦点恢复。
- [x] 4. 运行关系专项、全量Vitest、生产构建及本地服务测试；通过桌面与触屏浏览器验证界面、连续导航、存档不变、空态与关闭返回。
- [x] 5. 更新package/lock、标题、README和本地包说明；产出独立2.1.0本地包，记录验证结果。
