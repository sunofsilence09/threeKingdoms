# Hero Visual Progression Implementation Plan

**Goal:** 姜垣随三档等级、五种武器自动切换立绘和小人，详情可只读预览15种组合。

**Architecture:** heroVisuals.ts导出三档配置与15组合路径；characters.ts在原身份资料上派生主角外观。HUD/详情/小人共享getUnitAppearance。详情预览选择仅为局部UI状态。

## Tasks

- [x] 建立三档×五武器映射的边界与覆盖测试，先确认缺模块失败。
- [x] 基于现有姜垣参考生成14张透明全身图，统一身份与阶段衣装，保存原始提示词和最终资产。
- [x] 实现heroVisuals.ts及getUnitAppearance，接入HUD、详情、unitFigure和unitPreview的等级参数。
- [x] 详情增加外观图鉴和返回当前外观，保持实时属性与只读预览分离。
- [x] 覆盖15图、阶段边界、战斗武器与等级、HUD/棋盘一致和不写存档的三尺寸UI检查。
- [x] 运行单测、构建、既有角色/成长/棋盘和三路线回归，检查截图并记录结果。

保留现有未提交的桌面放大与第二批人物素材改动，不自动提交或推送。
