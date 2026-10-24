import { cpSync, copyFileSync, mkdirSync, writeFileSync, existsSync, openSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'release', '三国行旅-本地版');
if (process.platform !== 'win32') throw new Error('请在 Windows 上打包，以包含 Windows 运行程序。');
if (!existsSync(path.join(root, 'dist', 'index.html'))) throw new Error('请先运行 npm run build');
const runtime = path.join(output, 'runtime', 'node.exe');
if (existsSync(runtime)) {
  try { closeSync(openSync(runtime, 'r+')); }
  catch { throw new Error('请先关闭本地版启动窗口，再重新打包。'); }
}
mkdirSync(path.join(output, 'runtime'), { recursive: true });
cpSync(path.join(root, 'dist'), path.join(output, 'www'), { recursive: true });
copyFileSync(process.execPath, path.join(output, 'runtime', 'node.exe'));
copyFileSync(path.join(root, 'scripts', 'local-server.cjs'), path.join(output, 'server.cjs'));
copyFileSync(path.join(root, 'node_modules', 'phaser', 'LICENSE.md'), path.join(output, 'PHASER-LICENSE.txt'));
copyFileSync(path.join(root, 'scripts', 'licenses', 'NODE-LICENSE.txt'), path.join(output, 'NODE-LICENSE.txt'));
writeFileSync(path.join(output, '启动游戏.cmd'), '@echo off\r\nchcp 65001 >nul\r\ncd /d "%~dp0"\r\ntitle 三国行旅 - 本地版\r\n"%~dp0runtime\\node.exe" "%~dp0server.cjs"\r\nif errorlevel 1 pause\r\n', 'utf8');
writeFileSync(path.join(output, '使用说明.txt'), '\ufeff' + [
  '乱世行旅 · 0.7.0 群雄逐城 · Windows 本地版', '',
  '新版：NPC按年代登场后自主出征，真实扣兵，沿道路行军、围城；胜者占领、败者沿路撤退。',
  '地图显示城池旗号、兵力和在外军队；“天下局势”可筛选城池、查看军队与最近50条天下战报。',
  '战争随旅行、停留和互动消耗的游戏日推进；查看面板或买卖商品不会推进。',
  '城市易主后，府署、人物驻地、相遇和邀请门槛同步变化；已同行人物不会被调离队伍。',
  '历史背景开局，随后允许动态争夺；势力布局为游戏编排。玩家继续个人行旅与五人战棋，暂不直接调兵攻城。',
  '旧档从当前年月接入天下局势，保留人物、财货、关系和行程，不追溯此前战争。',
  '损坏天下数据会备份并暂停战争；可点击“重建天下局势（保留人物与行旅）”恢复。',
  '每城基础5000守军，由当地长官与士兵长共同管理；每月补员50人，上限20000，减员来自实际出征与战斗。',
  '普通士兵的生命与属性按人数相加，伤亡后战力降低；速度、移动和射程保持兵种水平。兵力数值为游戏参数。',
  '普通士兵不能邀请，只有士兵长可培养关系后邀请；入队后守军仍留原城，指挥岗位显示缺任。',
  '新增夏侯惇、夏侯渊、曹仁、曹休、刘表、刘璋、张鲁、马腾、卑弥呼、公孙瓒、袁绍、刘虞、张燕。',
  '共16张新立绘；夏侯惇194年前后外观不同。卑弥呼仅人物志，暂不开放相遇。人物列表支持姓名/城市和类别筛选。',
  '保留10种商品独立图片及此前袁术、陈宫、张邈、高顺、周泰、韩当角色。',
  '城内“府署名册”可查看任职、雇主及邀请门槛；受雇者亲密80，普通、主事与待聘人物60。',
  '邀请入队解除任职；雇主同行后，其部属可能转为待聘，城市再次易主后随新府署更新。岗位与长期同行属于游戏编排。',
  '保留自选1—30日赶路、7幅事件CG、市场跑商、行情波动与狼群实战。',
  '新增米酒、皮革，支持各城差价及行情；旧8商品库存自动补齐，保留原铜钱与账本。',
  '抵达后点击“进入城池”，输入数量买卖10种商品；初始600铜钱、40格货舱。',
  '各城有不同特产和需求，每7日刷新市场；商品行情持续30日，查看消息截止日期。',
  '途中遇事立即暂停，先看CG，再处理后续内容。陆路山道可能遇到狼群，迎战获胜可得20铜钱。',
  '孙坚、孙策正式立绘已补齐，新增诸葛亮、周瑜的立绘、相遇、招募和成长。',
  '开放相遇的人物可培养亲密度，达到对应门槛后邀请；普通士兵和卑弥呼不可邀请。最多5人出战（含主角）。',
  '在城内“寻访人物”，通过交谈、分享粮食或帮忙提升亲密度；互动耗时1日。',
  '邀请后进入候补，在“队伍”中上阵、下阵或替换；候补保留成长，仅出战者获得战斗经验。',
  '人物相遇受年代、地点限制；长期同行为架空支线，邀请主君不自动选择阵营。',
  '新增寿春与下邳，现有36城邑、47通路；原42道路、旧市场库存与进行中的行程保留。',
  '在地图或目的地列表选择城邑，预览行期后启程。途中事件处理后可继续赶路。',
  '战斗中刷新重开同一场战斗；旅行路线与事件上下文保留。', '',
  '1. 双击“启动游戏.cmd”，浏览器会自动打开游戏。',
  '2. 游玩时保留启动窗口；退出游戏后关闭此窗口即可停止服务。',
  '3. 复制或移动时请复制整个“三国行旅-本地版”文件夹。',
  '无需安装 Node.js、npm 或 Python；无需联网。需要 Windows 10/11 64 位和现代浏览器。',
  '不要直接双击 www/index.html；游戏通过本机地址加载资源。',
  '若浏览器未自动打开，请访问 http://127.0.0.1:18743/ 。', '',
  '进度保存在当前浏览器中；保持相同浏览器与地址可继续游玩。',
  '换浏览器、无痕模式、清除网站数据或换电脑不会自动迁移存档。',
  '该地址与开发版不同，开发版已有存档不会自动迁移。',
  '第三方组件：Phaser（MIT），Node.js（许可见 NODE-LICENSE.txt）。',
].join('\r\n'), 'utf8');
console.log('本地版已生成：' + output);
