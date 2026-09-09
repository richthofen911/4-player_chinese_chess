import { GRID } from './types';
import type { PtKey, Side } from './types';

export const ptKey = (x: number, y: number): PtKey => y * GRID + x;
export const ptOf = (k: PtKey): { x: number; y: number } => ({ x: k % GRID, y: Math.floor(k / GRID) });
export const onBoard = (x: number, y: number): boolean => x >= 0 && x < GRID && y >= 0 && y < GRID;

export const SIDES: Side[] = ['red', 'blue', 'green', 'black'];

// 红左上、蓝右上、绿右下、黑左下；界河是 x4/x5 与 y4/y5 之间的"格"，点阵本身连续 10x10。
export function quadrantOf(k: PtKey): Side {
  const { x, y } = ptOf(k);
  if (y <= 4) return x <= 4 ? 'red' : 'blue';
  return x <= 4 ? 'black' : 'green';
}

// 九宫 = 每象限外角的 3x3 点阵 [x0,y0,x1,y1]
export const PALACE: Record<Side, [number, number, number, number]> = {
  red: [0, 0, 2, 2],
  blue: [7, 0, 9, 2],
  green: [7, 7, 9, 9],
  black: [0, 7, 2, 9],
};

export function inPalace(side: Side, k: PtKey): boolean {
  const { x, y } = ptOf(k);
  const [x0, y0, x1, y1] = PALACE[side];
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

// 绕盘心顺时针 90°：红象限 -> 蓝 -> 绿 -> 黑
export const rotate90cw = (x: number, y: number): [number, number] => [GRID - 1 - y, x];

// 每方向中心（R6：卒在本象限内朝中心走）
export const FORWARD: Record<Side, [number, number][]> = {
  red: [[1, 0], [0, 1]],
  blue: [[-1, 0], [0, 1]],
  green: [[-1, 0], [0, -1]],
  black: [[1, 0], [0, -1]],
};

export const ORTHO_DIRS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export const DIAG_DIRS: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// 界河带上的装饰文字（照片坐标，格中心，仅渲染用）
export const BAND_LABELS: { ch: string; x: number; y: number }[] = [
  { ch: '燕', x: 4.5, y: 0.5 },
  { ch: '卫', x: 4.5, y: 3.5 },
  { ch: '郑', x: 4.5, y: 5.5 },
  { ch: '巴', x: 4.5, y: 7.5 },
  { ch: '蜀', x: 4.5, y: 8.5 },
  { ch: '戎', x: 0.5, y: 4.5 },
  { ch: '狄', x: 1.5, y: 4.5 },
  { ch: '周', x: 3.5, y: 4.5 },
  { ch: '宋', x: 5.5, y: 4.5 },
  { ch: '吴', x: 7.5, y: 4.5 },
  { ch: '越', x: 8.5, y: 4.5 },
];
