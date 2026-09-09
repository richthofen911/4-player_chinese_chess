import { strict as assert } from 'node:assert';
import test from 'node:test';
import { BAND_LABELS, PALACE, SIDES, inPalace, ptKey, ptOf, quadrantOf, rotate90cw } from '../../src/shared/geometry';
import { GRID } from '../../src/shared/types';

void test('ptKey/ptOf 往返', () => {
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      assert.deepEqual(ptOf(ptKey(x, y)), { x, y });
    }
  }
});

void test('象限划分', () => {
  assert.equal(quadrantOf(ptKey(0, 0)), 'red');
  assert.equal(quadrantOf(ptKey(4, 4)), 'red');
  assert.equal(quadrantOf(ptKey(5, 0)), 'blue');
  assert.equal(quadrantOf(ptKey(9, 4)), 'blue');
  assert.equal(quadrantOf(ptKey(9, 5)), 'green');
  assert.equal(quadrantOf(ptKey(5, 9)), 'green');
  assert.equal(quadrantOf(ptKey(0, 5)), 'black');
  assert.equal(quadrantOf(ptKey(4, 9)), 'black');
});

void test('界河跨河相邻是普通行列相邻（点阵连续）', () => {
  // (4,y) 与 (5,y) 同行相邻；(x,4) 与 (x,5) 同列相邻
  for (let y = 0; y < GRID; y++) {
    assert.equal(ptKey(4, y) + 1, ptKey(5, y));
  }
  for (let x = 0; x < GRID; x++) {
    assert.equal(ptKey(x, 4) + GRID, ptKey(x, 5));
  }
});

void test('九宫位于各象限外角', () => {
  assert.ok(inPalace('red', ptKey(1, 1)));
  assert.ok(!inPalace('red', ptKey(3, 3)));
  assert.ok(inPalace('blue', ptKey(8, 1)));
  assert.ok(inPalace('green', ptKey(8, 8)));
  assert.ok(inPalace('black', ptKey(1, 8)));
  for (const side of SIDES) {
    const [x0, y0, x1, y1] = PALACE[side];
    assert.equal(quadrantOf(ptKey(x0, y0)), side);
    assert.equal(quadrantOf(ptKey(x1, y1)), side);
  }
});

void test('rotate90cw 把红象限映到蓝象限', () => {
  for (let y = 0; y <= 4; y++) {
    for (let x = 0; x <= 4; x++) {
      const [nx, ny] = rotate90cw(x, y);
      assert.equal(quadrantOf(ptKey(nx, ny)), 'blue');
    }
  }
  assert.deepEqual(rotate90cw(0, 0), [9, 0]);
});

void test('界河装饰字共 11 个且落在带内', () => {
  assert.equal(BAND_LABELS.length, 11);
  for (const l of BAND_LABELS) {
    const inVerticalBand = l.x === 4.5 && (l.y < 4 || l.y > 4);
    const inHorizontalBand = l.y === 4.5 && (l.x < 4 || l.x > 4);
    assert.ok(inVerticalBand || inHorizontalBand, `${l.ch} 不在界河带上`);
  }
});
