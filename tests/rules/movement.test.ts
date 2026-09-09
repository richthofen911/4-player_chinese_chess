import { strict as assert } from 'node:assert';
import test from 'node:test';
import { ptKey } from '../../src/shared/geometry';
import { initialPieces } from '../../src/shared/rules/setup';
import { piece, stateWith, targetsOf } from './helpers';

void test('车：直线滑行且可一步跨过界河（行列连续）', () => {
  const g = stateWith('red', piece('red', 'rook', 2, 4));
  const t = targetsOf(g, 2, 4);
  assert.ok(t.includes(ptKey(2, 5)), '可竖跨横带');
  assert.ok(t.includes(ptKey(2, 9)));
  assert.ok(t.includes(ptKey(5, 4)), '可横跨竖带');
  assert.ok(t.includes(ptKey(9, 4)));
  assert.ok(t.includes(ptKey(2, 0)));
  assert.ok(t.includes(ptKey(0, 4)));
});

void test('炮：隔一子吃、不可隔两子、不可吃己方', () => {
  const g = stateWith(
    'red',
    piece('red', 'cannon', 2, 4),
    piece('red', 'advisor', 4, 4), // 炮架
    piece('blue', 'zu', 6, 4),   // 可吃
    piece('blue', 'zu', 7, 4),   // 两炮架之后，不可吃
  );
  const t = targetsOf(g, 2, 4);
  assert.ok(t.includes(ptKey(0, 4)) && t.includes(ptKey(1, 4)) && t.includes(ptKey(3, 4)));
  assert.ok(!t.includes(ptKey(4, 4)), '己方炮架不可停');
  assert.ok(t.includes(ptKey(6, 4)), '跳过恰好一子可吃');
  assert.ok(!t.includes(ptKey(7, 4)), '隔两子不可吃');
});

void test('马：蹩马腿', () => {
  const g = stateWith('red', piece('red', 'horse', 4, 2), piece('blue', 'zu', 4, 3));
  const t = targetsOf(g, 4, 2);
  assert.ok(!t.includes(ptKey(5, 4)) && !t.includes(ptKey(3, 4)), '经 (4,3) 的腿被蹩');
  assert.ok(t.includes(ptKey(5, 0)) && t.includes(ptKey(3, 0)), '经 (4,1) 的腿空，可走');
  assert.ok(t.includes(ptKey(6, 3)) && t.includes(ptKey(2, 3)), '经 (5,2)/(3,2) 的腿空');
});

void test('象：塞象眼、不出本象限', () => {
  const g = stateWith('red', piece('red', 'elephant', 2, 2), piece('blue', 'zu', 1, 1));
  const t = targetsOf(g, 2, 2);
  assert.ok(!t.includes(ptKey(0, 0)), '象眼被塞');
  assert.ok(t.includes(ptKey(4, 4)) && t.includes(ptKey(0, 4)) && t.includes(ptKey(4, 0)));

  const g2 = stateWith('red', piece('red', 'elephant', 4, 4));
  const t2 = targetsOf(g2, 4, 4);
  assert.ok(!t2.includes(ptKey(6, 6)), '不可跨过界河到邻象限');
  assert.ok(t2.includes(ptKey(2, 2)));
});

void test('国名子：九宫内直走一步', () => {
  const g = stateWith('red', piece('red', 'king', 1, 1));
  const t = targetsOf(g, 1, 1);
  assert.deepEqual(new Set(t), new Set([ptKey(0, 1), ptKey(2, 1), ptKey(1, 0), ptKey(1, 2)]));

  const g2 = stateWith('red', piece('red', 'king', 2, 2));
  const t2 = targetsOf(g2, 2, 2);
  assert.ok(!t2.includes(ptKey(3, 2)) && !t2.includes(ptKey(2, 3)), '不出九宫');
});

void test('士：九宫内斜走一步', () => {
  const g = stateWith('blue', piece('blue', 'advisor', 8, 1));
  const t = targetsOf(g, 8, 1);
  assert.deepEqual(new Set(t), new Set([ptKey(7, 0), ptKey(9, 0), ptKey(7, 2), ptKey(9, 2)]));
});

void test('卒：本象限内只能朝中心（红为 +x/+y）', () => {
  const g = stateWith('red', piece('red', 'zu', 2, 2));
  const t = targetsOf(g, 2, 2);
  assert.deepEqual(new Set(t), new Set([ptKey(3, 2), ptKey(2, 3)]));
});

void test('卒：跨河进入邻象限', () => {
  const g = stateWith('red', piece('red', 'zu', 4, 2));
  const t = targetsOf(g, 4, 2);
  assert.ok(t.includes(ptKey(5, 2)), '一步跨过竖带进入蓝方');
  assert.ok(t.includes(ptKey(4, 3)));
});

void test('卒：在他国可走任意正交方向、但不可踏入本象限', () => {
  const g = stateWith('red', piece('red', 'zu', 6, 2));
  const t = targetsOf(g, 6, 2);
  assert.deepEqual(new Set(t), new Set([ptKey(5, 2), ptKey(7, 2), ptKey(6, 1), ptKey(6, 3)]));

  const g2 = stateWith('red', piece('red', 'zu', 5, 2));
  const t2 = targetsOf(g2, 5, 2);
  assert.ok(!t2.includes(ptKey(4, 2)), '不可回踏入本象限（不可后退）');
  assert.ok(t2.includes(ptKey(5, 1)) && t2.includes(ptKey(5, 3)) && t2.includes(ptKey(6, 2)));
});

void test('初始布局：40 子、每方 10 子、四角国名子', () => {
  const pieces = initialPieces();
  assert.equal(pieces.length, 40);
  for (const side of ['red', 'blue', 'green', 'black'] as const) {
    assert.equal(pieces.filter((p) => p.side === side).length, 10);
    assert.equal(pieces.filter((p) => p.side === side && p.kind === 'zu').length, 4);
  }
  assert.ok(pieces.every((p) => p.ch !== '兵'));
  assert.equal(pieces.filter((p) => p.kind === 'king').length, 4);
  const at = (x: number, y: number) => pieces.find((p) => p.pt === ptKey(x, y));
  assert.equal(at(0, 0)?.ch, '晋');
  assert.equal(at(9, 0)?.ch, '齐');
  assert.equal(at(9, 9)?.ch, '楚');
  assert.equal(at(0, 9)?.ch, '秦');
});
