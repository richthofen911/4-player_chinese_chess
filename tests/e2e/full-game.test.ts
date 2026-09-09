import { strict as assert } from 'node:assert';
import test from 'node:test';
import { allLegalMoves } from '../../src/shared/rules/engine';
import type { PublicState, Side } from '../../src/shared/types';
import { startServer } from '../../src/server/main';
import { connectAndHello, makeClient, type TestClient } from './client';

const SEATS: Side[] = ['red', 'blue', 'green', 'black'];

interface Player {
  client: TestClient;
  side: Side;
  state: PublicState | null;
}

void test('4 个无头客户端经服务端打完整局', { timeout: 180_000 }, async () => {
  const h = await startServer({ port: 0, dev: true });
  const players: Player[] = [];
  try {
    // 建房 -> 拿房间码 -> 其余三家加入
    const c1 = makeClient(h.port);
    await c1.opened;
    c1.send({ t: 'hello' });
    await c1.next((m) => m.t === 'welcome');
    c1.send({ t: 'room.create', name: 'p1', seat: 'red' });
    const upd = await c1.next((m) => m.t === 'room.update');
    assert.ok(upd.t === 'room.update');
    const code = upd.room.code;
    assert.equal(upd.room.you.side, 'red');
    assert.ok(upd.room.you.token, '入座应下发重连令牌');
    players.push({ client: c1, side: 'red', state: null });

    for (const side of ['blue', 'green', 'black'] as Side[]) {
      const c = await connectAndHello(h.port);
      c.send({ t: 'room.join', code, name: `p-${side}`, seat: side });
      const u = await c.next((m) => m.t === 'room.update');
      assert.ok(u.t === 'room.update' && u.room.you.side === side);
      players.push({ client: c, side, state: null });
    }

    // 房主开局
    c1.send({ t: 'room.start' });
    const startP = players.map((p) => p.client.next((m) => m.t === 'game.start').then((m) => {
      assert.ok(m.t === 'game.start');
      p.state = m.state;
    }));
    await Promise.all(startP);
    assert.equal(players[0].state?.pieces.length, 40);

    // 事件驱动：轮到自己就从本地镜像选一个随机合法着法发出
    const maybeMove = (p: Player) => {
      const s = p.state;
      if (!s || s.over || s.turn !== p.side) return;
      const moves = allLegalMoves(s);
      if (moves.length === 0) return;
      const mv = moves[Math.floor(Math.random() * moves.length)];
      p.client.send({ t: 'game.move', from: mv.from, to: mv.to });
    };
    for (const p of players) maybeMove(p);

    const loops = players.map(async (p) => {
      for (;;) {
        const m = await p.client.next(
          (x) => x.t === 'game.applied' || x.t === 'game.over' || x.t === 'error',
          60_000,
        );
        if (m.t === 'error') {
          assert.fail(`${p.side} 收到错误: ${JSON.stringify(m)}`);
        }
        if (m.t === 'game.over') {
          p.state = m.state;
          return m;
        }
        if (m.t === 'game.applied') {
          p.state = m.state;
          if (m.state.ply > 20000) assert.fail(`对局超 20000 步未结束: pieces=${m.state.pieces.length} turn=${m.state.turn}`);
          maybeMove(p);
        }
      }
    });

    const overs = await Promise.all(loops);
    const over = overs[0];
    assert.ok(['red', 'blue', 'green', 'black', 'draw'].includes(over.winner));
    for (const p of players) {
      assert.equal(p.state?.ply, over.state.ply, `${p.side} 镜像与服务端一致`);
    }
    for (const p of players) assert.equal(p.client.errors.length, 0);
  } finally {
    for (const p of players) p.client.close();
    await h.close();
  }
});
