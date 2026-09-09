import type { Side } from '../../shared/types';
import type { ClientState } from '../store';
import type { Geom } from './board';

export const SIDE_COLOR: Record<Side, string> = {
  red: '#c0392b',
  blue: '#2e6da4',
  green: '#3d8f43',
  black: '#4a4a4a',
};

export function drawPieces(ctx: CanvasRenderingContext2D, g: Geom, st: ClientState): void {
  const { cell, toPx } = g;
  const game = st.game;
  if (!game) return;
  const r = cell * 0.42;
  const occupied = new Map(game.pieces.map((p) => [p.pt, p]));

  if (game.lastMove) {
    for (const pt of [game.lastMove.from, game.lastMove.to]) {
      const { x, y } = toPx(pt);
      ctx.strokeStyle = 'rgba(217,165,32,.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
    }
  }

  for (const p of game.pieces) {
    const { x, y } = toPx(p.pt);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = SIDE_COLOR[p.side];
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `600 ${Math.round(cell * 0.5)}px "Kaiti SC", "STKaiti", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.ch, x, y + cell * 0.02);
  }

  if (st.selection !== null) {
    const { x, y } = toPx(st.selection);
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#d9a520';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const t of st.legal) {
      const pos = toPx(t);
      ctx.beginPath();
      if (occupied.has(t)) {
        ctx.arc(pos.x, pos.y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(192,57,43,.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.arc(pos.x, pos.y, cell * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30,90,60,.55)';
        ctx.fill();
      }
    }
  }
}
