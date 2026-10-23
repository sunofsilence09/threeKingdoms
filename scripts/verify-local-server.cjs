const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('portable server serves built assets and refuses paths outside the game folder', async () => {
  let createGameServer;
  try { ({ createGameServer } = require('./local-server.cjs')); } catch {}
  assert.equal(typeof createGameServer, 'function', 'portable local server must exist');
  const root = mkdtempSync(path.join(tmpdir(), 'three kingdoms-'));
  writeFileSync(path.join(root, 'index.html'), '<title>Game</title>');
  writeFileSync(path.join(root, '人物.png'), Buffer.from([137, 80, 78, 71]));
  writeFileSync(path.join(root, 'game.js'), 'console.log("game");');
  const server = createGameServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.match(await (await fetch(url)).text(), /<title>Game/);
    assert.match((await fetch(url + '/game.js')).headers.get('content-type'), /javascript/);
    assert.equal((await fetch(url + '/' + encodeURIComponent('人物.png'))).status, 200);
    assert.equal((await fetch(url, { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(url, { method: 'POST' })).status, 405);
    assert.equal((await fetch(url + '/missing.png')).status, 404);
    assert.equal((await fetch(url + '/%ZZ')).status, 400);
    assert.equal((await fetch(url + '/..%5csecret.txt')).status, 403);
    assert.equal((await (await fetch(url + '/__game_health')).json()).app, 'three-kingdoms-local-v1');
  } finally {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    rmSync(root, { recursive: true, force: true });
  }
});
