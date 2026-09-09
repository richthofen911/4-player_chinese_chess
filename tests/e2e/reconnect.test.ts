import { strict as assert } from 'node:assert';
import test from 'node:test';
import { allLegalMoves } from '../../src/shared/rules/engine';
import { ptKey } from '../../src/shared/geometry';
import type { PublicState, Side } from '../../src/shared/types';
import { startServer } from '../../src/server/main';
import { connectAndHello, makeClient } from './client';

void test('断线重连、AI 接管与错误路径', { timeout: 30_000 }, async () => {
  const h = await startServer({ port: 0, dev: true });
  const clients: { close(): void }[] = [];
  try {
    const c1 = await connectAndHello(h.port);
    clients.push(c1);
    c1.send({ t: 'room.create', name: 'p1', seat: 'red' });
    const u1 = await c1.next((m) => m.t === 'room.update');
    assert.ok(u1.t === 'room.update');
    const code = u1.room.code;
    const token1 = u1.room.you.token!;

    const c2 = await connectAndHello(h.port);
    clients.push(c2);
    c2.send({ t: 'room.join', code, name: 'p2', seat: 'blue' });
    const u2 = await c2.next((m) => m.t === 'room.update');
    assert.ok(u2.t === 'room.update');
    const token2 = u2.room.you.token!;

    const c3 = await connectAndHello(h.port);
    clients.push(c3);
    c3.send({ t: 'room.join', code, name: 'p3', seat: 'green' });
    await c3.next((m) => m.t === 'room.update');

    // 开局：黑座为空 -> AI 代下
    c1.send({ t: 'room.start' });
    const gs = await c1.next((m) => m.t === 'game.start');
    assert.ok(gs.t === 'game.start');
    let state: PublicState = gs.state;

    c1.send({ t: 'game.move', from: ptKey(0, 3), to: ptKey(1, 3) });
    let m = await c1.next((x) => x.t === 'game.applied' && x.state.ply === 1);
    assert.ok(m.t === 'game.applied' && m.state.turn === 'black');
    state = m.state;

    m = await c1.next((x) => x.t === 'game.applied' && x.state.ply === 2, 6000);
    assert.ok(m.t === 'game.applied' && m.state.turn === 'green', 'AI 应在 800ms 后代下黑方');
    state = m.state;

    const mv3 = allLegalMoves(state, 'green')[0];
    c3.send({ t: 'game.move', from: mv3.from, to: mv3.to });
    m = await c1.next((x) => x.t === 'game.applied' && x.state.ply === 3);
    assert.ok(m.t === 'game.applied' && m.state.turn === 'blue');
    state = m.state;

    // 蓝方断线 -> 令牌重连归座并继续走子
    c2.close();
    const c2b = await connectAndHello(h.port, token2);
    clients.push(c2b);
    const ru = await c2b.next((x) => x.t === 'room.update' && x.room.you.side === 'blue');
    assert.ok(ru.t === 'room.update');
    const gsr = await c2b.next((x) => x.t === 'game.state');
    assert.ok(gsr.t === 'game.state' && gsr.state.ply === 3 && gsr.state.turn === 'blue');
    const mv4 = allLegalMoves(state, 'blue')[0];
    c2b.send({ t: 'game.move', from: mv4.from, to: mv4.to });
    m = await c1.next((x) => x.t === 'game.applied' && x.state.ply === 4);
    assert.ok(m.t === 'game.applied');
    state = m.state;

    // 新玩家中途加入并接管 AI 黑座
    const c4 = await connectAndHello(h.port);
    clients.push(c4);
    c4.send({ t: 'room.join', code, name: 'p4', seat: 'black' as Side });
    const ru4 = await c4.next((x) => x.t === 'room.update' && x.room.you.side === 'black');
    assert.ok(ru4.t === 'room.update');
    const blackSeat = ru4.room.seats.find((s) => s.side === 'black')!;
    assert.equal(blackSeat.ai, false, 'AI 座位已被接管');
    assert.ok(blackSeat.connected);
    await c4.next((x) => x.t === 'game.state');

    // 错误路径：非轮次走子 / 非法着法 / 坏令牌
    const redPiece = state.pieces.find((p) => p.side === 'red')!;
    c3.send({ t: 'game.move', from: redPiece.pt, to: ptKey(redPiece.pt % 10, Math.floor(redPiece.pt / 10) + 1) });
    await c3.next((x) => x.t === 'error' && x.code === 'NOT_YOUR_TURN');
    c1.send({ t: 'game.move', from: ptKey(1, 3), to: ptKey(1, 2) });
    await c1.next((x) => x.t === 'error' && x.code === 'ILLEGAL_MOVE');
    const bad = await connectAndHello(h.port, 'not-a-real-token');
    clients.push(bad);
    await bad.next((x) => x.t === 'error' && x.code === 'BAD_TOKEN');

    // 令牌在重连后仍属于原主（c2b 未被踢）
    assert.ok(token1 && token2);
    assert.equal(c1.errors.filter((e) => e.t === 'error' && e.code === 'ILLEGAL_MOVE').length, 1);
  } finally {
    for (const c of clients) c.close();
    await h.close();
  }
});
