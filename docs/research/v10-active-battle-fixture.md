# 真正的 1.0 活动战斗 fixture

生成日期：2026-10-25。来源提交：`9ef51aff61a9ea423b32bc99a3bd667ebfb9e061`（本分支尚未提交1.1改动的 Git HEAD，1.0发布基线）。产物为 `src/game/fixtures/v10-active-battle.json`，根对象直接是旧版 `GameState`；真正的战斗存档位于 **`activeBattle`**。它不是旧 `v10-saves.json` 中可能叫 `battle` 的场景示例，也没有把1.1对象删字段后冒充1.0。

## 提取与隔离

通过 Python `subprocess.run` 的二进制 stdout 执行 `git -c safe.directory=D:/games/ThreeKingdoms archive --format=tar <commit> src`；用 `io.BytesIO` 和 `tarfile` 解压至已忽略目录 `artifacts/v10-source`。每个目标先 `resolve()` 并验证仍在该目录内，拒绝 symlink/hardlink 和覆盖已有文件；不经 PowerShell 文本管道处理 tar 字节，避免编码破坏。提取的旧版 `.ts` 文件没有修改。生成器与临时 Vitest 配置放在这个忽略目录的顶层，测试 import 全部指向其 `./src/game/...`，只共享工作区已有 `node_modules` 作为测试运行器。

运行命令：

```powershell
& 'C:\Users\silence\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  node_modules/vitest/vitest.mjs run --config artifacts/v10-source/vitest.fixture.config.ts
```

临时配置将测试 root 设为提取目录，只运行 `generate-v10-active-battle.test.ts`；未加载1.1游戏模块。目录源码与重新执行同一提交 `git archive` 得到的149个 `src` 文件逐字节比对一致。源代码tar流 SHA-256为 `cc1ea0452593e8a9076c9283f45683982bacc2d850f45c7d3ac9a0b901f5f106`。

关键文件的Git blob ID：

| 旧源码 | blob ID |
|---|---|
| src/game/state.ts | 5b0c11076e98184801acfbe3293275cfd166c096 |
| src/game/combat.ts | be294037295fa3b1df54b816b6a680b3de08239f |
| src/game/battleSave.ts | 72f01b3a88e5a333187c7aeebdc3f12c65687496 |
| src/game/martialCombat.ts | 0b95a0e06a97894926c058e811341fae6ae9925d |

## 构造方式

使用旧版公开函数构造完整状态，不手写战斗单位、不修改坐标/HP/RNG来造动作结果。新游戏原籍抽签固定返回0；`Date.now()` 固定为 `1792886400000`，使生命、武学与战争种子可复现。将 `met:sun` 设为场景前提，通过旧 `selectRoute` 合法选择孙方，再设为其 route 战斗入口。此 fixture 是合法、受控的旧版游戏状态，不声称是用户曾实际游玩的存档。

核心构造代码（均导入提取的旧模块）：

```ts
vi.spyOn(Date, 'now').mockReturnValue(1792886400000);
const initial = createInitialState(() => 0);
const chosen = selectRoute({ ...initial, flags: { ...initial.flags, 'met:sun': true } }, 'sun');
const state = { ...chosen, phase: 'battle', encounter: 'route', battleParty: [...chosen.deployed] };
const seed = (state.martial.seed ^ gameDayNumber(state.date) ^ (state.travelCount * 53)) >>> 0;
const base = createCombatState(state.route, state.party, 'route', state.battleParty, {
  enemyKind: 'bandits', month: state.date.month, seed,
});
const started = initializeMartialCombat(base, state);
const moved = moveUnit(started, 'aman', 6, 6);
const attacked = performAttack(moved, 'aman', 'bandit-scout-a');
const combat = advanceTurn(attacked);
const fixture = { ...state, activeBattle: checkpointBattle(combat, state) };
```

孙方移速加成令阿满由 `(3,5)` 合法走4格至 `(6,6)`，用木枪攻击 `(8,6)` 的山贼。伤害3，目标HP由7降到4；这些结果完全由旧战斗引擎产生。当前仍为第1轮，`actedIds = ['aman']`、`movedIds = ['aman']`，下一行动者为 `bandit-scout-a`，`turn = 'enemy'`、`selectedId = null`。战斗仍为 ongoing，非结算快照。

## 旧版验证与保留证据

生成器实测旧 `isBattleSnapshot(snapshot, state) === true`，再用旧 `saveState` 写入模拟 localStorage，旧 `loadState` 读回后断言 `activeBattle` 与生成快照深度相等，并再次用旧校验器确认有效。最终 JSON 写入后重新解析，第三次旧快照校验通过。临时 Vitest 测试1项通过、0失败。

- 完整生命目录：73条；战略世界 `version: 2`，无1.1新增任命字段。
- 初始战斗RNG：734911；攻击后的保存RNG：3175112689。
- 旧 `GameState`、checkpoint 和所有单位都不含 `attributeVersion`，不能预置为1.1的legacy标记掩盖迁移逻辑。
- 旧培养账目保持原值；无天赋重算。三名伙伴旧战斗数值如下。

| 单位 | HP / maxHP | attack | defense | speed |
|---|---:|---:|---:|---:|
| traveler | 11 / 11 | 4 | 0 | 12 |
| aman | 10 / 10 | 3 | 0 | 14 |
| chen-da | 9 / 9 | 3 | 0 | 10 |

文件 SHA-256：`a891d4ee818cda1a2723ee885fd0200f78441756858b1c1cf25a1ec9a049157d`。

1.1迁移测试应直接读取此JSON，通过新 `loadState` 恢复，验证旧活动战斗HP/攻击/防御/RNG/行动顺序逐字保留、缺失版本标记被识别为旧战斗，而下一次新建战斗才采用新天赋。这个文件本身保持1.0原貌，不在fixture中加入1.1字段。
