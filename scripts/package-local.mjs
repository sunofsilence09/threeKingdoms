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
  '乱世行旅 · 0.3.0 结伴同行 · Windows 本地版', '',
  '新版：全部现有人物可培养亲密度，达到60后邀请；最多5人出战（含主角）。',
  '在城内“寻访人物”，通过交谈、分享粮食或帮忙提升亲密度；互动耗时1日。',
  '邀请后进入候补，在“队伍”中上阵、下阵或替换；候补保留成长，仅出战者获得战斗经验。',
  '人物相遇受年代、地点限制；长期同行为架空支线，邀请主君不自动选择阵营。',
  '保留34城邑、42通路、按日旅行、途中事件，兼容旧存档。',
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
