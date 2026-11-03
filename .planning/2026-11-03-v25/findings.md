# 现状

- main，2.4.0，最近6b8aefa/41532cb。progress.md已有修改，保留。父目录及根目录未找到AGENTS.md。
- 世界grid主地图+340px侧栏，侧栏连续堆叠通知、行路、城中行动、队伍、HUD。历史截图确认过长且左下空白。
- startTravel拒绝journey，地图onSelect同样返回；没有取消/改道API。Journey旧校验要求路径首城等于currentCityId、路径不重复、elapsed等于完整路段+legDay，改道须有兼容方案。
- troopControls/troopManagement/attachTroops均1000硬限制；随行预备兵+已配兵合计20000。
- 城市只有势力/守军/占领/太守；每30日自动加50兵，无资源消耗。withWorldDate是RPG时间桥，advanceWorldConflict逐日推进。
- 城市任职查询可提供在职名单，但须避免党内角色、自由人物、幼年者、同人多职重复计薪。
- 完整待确认规则见docs/superpowers/specs/2026-11-03-v25-interface-city-economy-design.md。
