import { BAND_LABELS, ptOf } from '../../shared/geometry';
import type { PtKey } from '../../shared/types';

export interface Geom {
  size: number;
  margin: number;
  cell: number;
  toPx: (k: PtKey) => { x: number; y: number };
  nearest: (px: number, py: number) => PtKey | null;
}

export function makeGeom(size: number): Geom {
  const margin = size * 0.05;
  const cell = (size - 2 * margin) / 9;
  const toPx = (k: PtKey) => {
    const { x, y } = ptOf(k);
    return { x: margin + x * cell, y: margin + y * cell };
  };
  const nearest = (px: number, py: number): PtKey | null => {
    const x = Math.round((px - margin) / cell);
    const y = Math.round((py - margin) / cell);
    if (x < 0 || x > 9 || y < 0 || y > 9) return null;
    if (Math.hypot(px - (margin + x * cell), py - (margin + y * cell)) > cell * 0.48) return null;
    return y * 10 + x;
  };
  return { size, margin, cell, toPx, nearest };
}

const QUADRANTS: { x0: number; y0: number; x1: number; y1: number; tint: string }[] = [
  { x0: 0, y0: 0, x1: 4, y1: 4, tint: 'rgba(192,57,43,.055)' },
  { x0: 5, y0: 0, x1: 9, y1: 4, tint: 'rgba(46,109,164,.055)' },
  { x0: 5, y0: 5, x1: 9, y1: 9, tint: 'rgba(61,143,67,.055)' },
  { x0: 0, y0: 5, x1: 4, y1: 9, tint: 'rgba(50,50,50,.06)' },
];

export function drawBoard(ctx: CanvasRenderingContext2D, g: Geom): void {
  const { size, cell, margin, toPx } = g;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#f7f2e2';
  ctx.fillRect(0, 0, size, size);

  for (const q of QUADRANTS) {
    const a = toPx(q.y0 * 10 + q.x0);
    const b = toPx(q.y1 * 10 + q.x1);
    ctx.fillStyle = q.tint;
    ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.strokeStyle = 'rgba(0,0,0,.16)';
    ctx.lineWidth = Math.max(1.5, cell * 0.03);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);

    // 象限内网格（不画界河上的连接段）
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    for (let x = q.x0; x <= q.x1; x++) {
      const p1 = toPx(q.y0 * 10 + x);
      const p2 = toPx(q.y1 * 10 + x);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    for (let y = q.y0; y <= q.y1; y++) {
      const p1 = toPx(y * 10 + q.x0);
      const p2 = toPx(y * 10 + q.x1);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
  }

  // 九宫斜线
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1;
  const diagonals: [number, number, number, number][] = [
    [0, 0, 2, 2], [2, 0, 0, 2],
    [7, 0, 9, 2], [9, 0, 7, 2],
    [7, 7, 9, 9], [9, 7, 7, 9],
    [0, 7, 2, 9], [2, 7, 0, 9],
  ];
  for (const [x0, y0, x1, y1] of diagonals) {
    const a = toPx(y0 * 10 + x0);
    const b = toPx(y1 * 10 + x1);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // 界河装饰字
  ctx.fillStyle = 'rgba(80,70,50,.75)';
  ctx.font = `${Math.round(cell * 0.52)}px "Kaiti SC", "STKaiti", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of BAND_LABELS) {
    ctx.fillText(l.ch, margin + l.x * cell, margin + l.y * cell);
  }
}
