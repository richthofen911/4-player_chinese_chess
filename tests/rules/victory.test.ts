import { strict as assert } from 'node:assert';
import test from 'node:test';
import { ptKey } from '../../src/shared/geometry';
import { DEFAULT_RULES } from '../../src/shared/rules/config';
import { allLegalMoves, applyMove, createGame } from '../../src/shared/rules/engine';
import { checkVictory } from '../../src/shared/rules/victory';
import { piece, stateWith } from './helpers';

void test('checkVictory 判定：最后存活的一家获胜', () => {
  const g = createGame();
  assert.equal(checkVictory(g), null);
  g.alive.red = false;
  assert.equal(checkVictory(g), null, '尚存三家');
  g.alive.blue = false;
  assert.equal(checkVictory(g), null, '尚存两家');
  g.alive.green = false;
  assert.equal(checkVictory(g)?.winner, 'black', '仅存黑');
  g.alive.black = false;
  assert.equal(checkVictory(g)?.winner, 'draw', '全灭判和（防御性）');
});

void test('灭其余三家即终局：gameover 事件与 over 状态', () => {
  const g = stateWith(
    'red',
    piece('red', 'rook', 8, 0),
    piece('blue', 'king', 8, 1),
  );
  g.alive.black = false;
  g.alive.green = false;
  const { next, events } = applyMove(g, { from: ptKey(8, 0), to: ptKey(8, 1) });
  assert.equal(next.over?.winner, 'red');
  assert.ok(events.some((e) => e.t === 'gameover'));
  assert.equal(next.turn, 'red', '终局时轮转不再推进');
});

void test('无吃子长生局面按步数判和（R11）', () => {
  const config = { ...DEFAULT_RULES, drawAfterNoCapture: 8 };
  let g = createGame(config);
  // 只留四王，互相吃不到 -> 必然走到判和
  g.pieces = g.pieces.filter((p) => p.kind === 'king');
  let plies = 0;
  while (!g.over && plies < 100) {
    const moves = allLegalMoves(g);
    assert.ok(moves.length > 0);
    g = applyMove(g, moves[plies % moves.length]).next;
    plies++;
  }
  assert.equal(g.over?.winner, 'draw');
});

void test('随机自弈必然终局（5000 步内）', () => {
  let seed = 20260909;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let g = createGame();
  let plies = 0;
  while (!g.over && plies < 5000) {
    const moves = allLegalMoves(g);
    assert.ok(moves.length > 0, `${g.turn} 无子可动时应已由 advanceTurn 处理`);
    const m = moves[Math.floor(rand() * moves.length)];
    g = applyMove(g, m).next;
    plies++;
  }
  assert.ok(g.over, `自弈 ${plies} 步未终局`);
  assert.ok(['red', 'blue', 'green', 'black', 'draw'].includes(g.over.winner));
  assert.ok(plies < 5000);
});
