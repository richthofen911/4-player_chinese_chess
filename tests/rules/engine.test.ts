import { strict as assert } from 'node:assert';
import test from 'node:test';
import { ptKey } from '../../src/shared/geometry';
import { DEFAULT_RULES } from '../../src/shared/rules/config';
import { allLegalMoves, applyMove, createGame, isAttacked, legalMovesFrom, validateMove } from '../../src/shared/rules/engine';
import { piece, stateWith } from './helpers';

const codeOf = (r: ReturnType<typeof validateMove>): string => (r.ok ? 'OK' : r.code);

void test('createGame 初始局面', () => {
  const g = createGame();
  assert.equal(g.turn, 'red');
  assert.deepEqual(g.turnOrder, ['red', 'black', 'green', 'blue']);
  assert.equal(g.pieces.length, 40);
  assert.deepEqual(g.alive, { red: true, blue: true, green: true, black: true });
  assert.equal(g.over, null);
  assert.ok(allLegalMoves(g).length > 0);
});

void test('validateMove 各类拒绝', () => {
  const g = stateWith(
    'red',
    piece('red', 'zu', 2, 2),
    piece('red', 'rook', 5, 5),
    piece('blue', 'horse', 1, 1),
    piece('blue', 'zu', 1, 2),
  );
  assert.equal(codeOf(validateMove(g, { from: ptKey(1, 1), to: ptKey(3, 2) })), 'NOT_YOUR_TURN');
  assert.equal(codeOf(validateMove(g, { from: ptKey(9, 9), to: ptKey(8, 8) })), 'NO_PIECE');
  assert.equal(codeOf(validateMove(g, { from: ptKey(2, 2), to: ptKey(3, 2) })), 'OK');
  assert.equal(codeOf(validateMove(g, { from: ptKey(2, 2), to: ptKey(2, 4) })), 'ILLEGAL_MOVE');
  const g2 = stateWith('red', piece('red', 'zu', 2, 2), piece('red', 'rook', 3, 2), piece('blue', 'zu', 8, 8));
  assert.equal(codeOf(validateMove(g2, { from: ptKey(2, 2), to: ptKey(3, 2) })), 'OWN_PIECE');
});

void test('legalMovesFrom 只返回行棋方棋子着法', () => {
  const g = stateWith('red', piece('red', 'zu', 2, 2), piece('blue', 'rook', 8, 8));
  assert.equal(legalMovesFrom(g, ptKey(8, 8)).length, 0, '非行棋方无着法');
  assert.equal(legalMovesFrom(g, ptKey(2, 2)).length, 2);
});

void test('applyMove：吃子、事件、轮转', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 6, 2),
    piece('blue', 'zu', 6, 3),
    piece('black', 'king', 1, 8),
    piece('green', 'king', 8, 8),
  );
  const { next, events } = applyMove(g, { from: ptKey(6, 2), to: ptKey(6, 3) });
  assert.equal(next.pieces.length, 3);
  assert.deepEqual(events.map((e) => e.t), ['move', 'capture']);
  assert.equal(next.turn, 'black');
  assert.deepEqual(next.lastMove, { from: ptKey(6, 2), to: ptKey(6, 3) });
  assert.equal(next.ply, 1);
  assert.equal(g.pieces.length, 4, '原状态不可变');
});

void test('国名子被吃：淘汰+存活卒倒戈+轮转跳过', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 8, 0),
    piece('blue', 'king', 8, 1),
    piece('blue', 'zu', 7, 0),
    piece('blue', 'rook', 6, 6),
    piece('black', 'king', 0, 8),
    piece('green', 'king', 8, 8),
  );
  const { next, events } = applyMove(g, { from: ptKey(8, 0), to: ptKey(8, 1) });
  assert.equal(next.alive.blue, false);
  assert.equal(next.pieces.filter((p) => p.side === 'blue').length, 0, '蓝方无残留');
  const defected = events.find((e) => e.t === 'defected');
  assert.ok(defected && defected.t === 'defected' && defected.to === 'red' && defected.pawns.length === 1);
  const pawn = next.pieces.find((p) => p.pt === ptKey(7, 0));
  assert.equal(pawn?.side, 'red', '卒换色归吃子方');
  assert.equal(pawn?.kind, 'zu');
  assert.deepEqual(events.map((e) => e.t), ['move', 'capture', 'defected', 'eliminated']);
  assert.equal(next.turn, 'black', '红后按序轮到黑');
});

void test('倒戈上限：3 枚存活卒仅 2 枚换主，其余消失', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 8, 0),
    piece('blue', 'king', 8, 1),
    piece('blue', 'zu', 0, 5),
    piece('blue', 'zu', 2, 5),
    piece('blue', 'zu', 4, 9),
    piece('black', 'king', 0, 8),
    piece('green', 'king', 8, 8),
  );
  const { next, events } = applyMove(g, { from: ptKey(8, 0), to: ptKey(8, 1) });
  const defected = events.find((e) => e.t === 'defected');
  assert.ok(defected && defected.t === 'defected' && defected.pawns.length === 2);
  assert.equal(next.pieces.filter((p) => p.side === 'blue').length, 0);
  const redPawns = next.pieces.filter((p) => p.side === 'red' && p.kind === 'zu');
  assert.equal(redPawns.length, 2);
  assert.deepEqual(new Set(redPawns.map((p) => p.pt)), new Set([ptKey(0, 5), ptKey(2, 5)]), '按数组顺序取前 2 枚');
});

void test('无卒的一方淘汰时不产生倒戈事件', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 8, 0),
    piece('blue', 'king', 8, 1),
    piece('blue', 'horse', 5, 5),
    piece('black', 'king', 0, 8),
    piece('green', 'king', 8, 8),
  );
  const { events } = applyMove(g, { from: ptKey(8, 0), to: ptKey(8, 1) });
  assert.ok(!events.some((e) => e.t === 'defected'));
});

void test('关闭 defectPawnsOnElimination 后卒照旧移出棋盘', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 8, 0),
    piece('blue', 'king', 8, 1),
    piece('blue', 'zu', 7, 0),
    piece('black', 'king', 0, 8),
    piece('green', 'king', 8, 8),
  );
  g.config = { ...DEFAULT_RULES, defectPawnsOnElimination: false };
  const { next, events } = applyMove(g, { from: ptKey(8, 0), to: ptKey(8, 1) });
  assert.equal(next.pieces.filter((p) => p.pt === ptKey(7, 0)).length, 0);
  assert.ok(!events.some((e) => e.t === 'defected'));
});

void test('无合法着法的方被跳过（R11）', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 2, 0),
    piece('black', 'king', 4, 4), // 在本方九宫之外 -> 无着法
    piece('green', 'king', 8, 8),
    piece('blue', 'king', 8, 0),
  );
  const { next, events } = applyMove(g, { from: ptKey(2, 0), to: ptKey(2, 1) });
  assert.ok(events.some((e) => e.t === 'skip' && e.side === 'black'));
  assert.equal(next.turn, 'green');
});

void test('终局后不可再走', () => {
  const g = createGame();
  g.over = { winner: 'draw', reason: 'test' };
  assert.equal(codeOf(validateMove(g, { from: ptKey(0, 0), to: ptKey(1, 0) })), 'GAME_OVER');
  assert.equal(allLegalMoves(g).length, 0);
});

void test('isAttacked：车沿行列攻击', () => {
  const g = stateWith('red', piece('red', 'rook', 2, 2), piece('blue', 'king', 2, 7));
  assert.ok(isAttacked(g, ptKey(2, 7), 'red'));
  assert.ok(!isAttacked(g, ptKey(5, 5), 'red'));
});
