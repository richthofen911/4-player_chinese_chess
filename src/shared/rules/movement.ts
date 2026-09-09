import { DIAG_DIRS, FORWARD, ORTHO_DIRS, inPalace, onBoard, ptKey, ptOf, quadrantOf } from '../geometry';
import type { GameState, Piece, PtKey } from '../types';

export function occupancy(state: GameState): Map<PtKey, Piece> {
  const m = new Map<PtKey, Piece>();
  for (const p of state.pieces) m.set(p.pt, p);
  return m;
}

/**
 * 伪着法：不含"轮到自己"检查，目标点允许为空点或敌方棋子所在点。
 * 界河只影响渲染：点阵是连续的 10x10，(4,y)-(5,y) 等跨河相邻即普通正交相邻（R7）。
 */
export function pseudoMoves(state: GameState, p: Piece, at: Map<PtKey, Piece>): PtKey[] {
  const { x, y } = ptOf(p.pt);
  const out: PtKey[] = [];
  const push = (nx: number, ny: number) => {
    if (!onBoard(nx, ny)) return;
    const t = ptKey(nx, ny);
    const occ = at.get(t);
    if (!occ || occ.side !== p.side) out.push(t);
  };

  switch (p.kind) {
    case 'king': {
      for (const [dx, dy] of ORTHO_DIRS) {
        const nx = x + dx, ny = y + dy;
        if (onBoard(nx, ny) && inPalace(p.side, ptKey(nx, ny))) push(nx, ny);
      }
      break;
    }
    case 'advisor': {
      for (const [dx, dy] of DIAG_DIRS) {
        const nx = x + dx, ny = y + dy;
        if (onBoard(nx, ny) && inPalace(p.side, ptKey(nx, ny))) push(nx, ny);
      }
      break;
    }
    case 'elephant': {
      for (const [dx, dy] of DIAG_DIRS) {
        const ex = x + dx / 1, ey = y + dy / 1; // 象眼 = 斜走第一步
        const nx = x + dx * 2, ny = y + dy * 2;
        if (!onBoard(nx, ny)) continue;
        const t = ptKey(nx, ny);
        if (state.config.elephantZone === 'ownQuadrant' && quadrantOf(t) !== quadrantOf(p.pt)) continue;
        if (at.has(ptKey(ex, ey))) continue; // 塞象眼
        const occ = at.get(t);
        if (!occ || occ.side !== p.side) out.push(t);
      }
      break;
    }
    case 'horse': {
      const hops: [number, number, number, number][] = [
        [1, 2, 0, 1], [2, 1, 1, 0], [2, -1, 1, 0], [1, -2, 0, -1],
        [-1, -2, 0, -1], [-2, -1, -1, 0], [-2, 1, -1, 0], [-1, 2, 0, 1],
      ];
      for (const [dx, dy, lx, ly] of hops) {
        const nx = x + dx, ny = y + dy;
        if (!onBoard(nx, ny)) continue;
        if (at.has(ptKey(x + lx, y + ly))) continue; // 蹩马腿
        push(nx, ny);
      }
      break;
    }
    case 'rook': {
      for (const [dx, dy] of ORTHO_DIRS) {
        let nx = x + dx, ny = y + dy;
        while (onBoard(nx, ny)) {
          const t = ptKey(nx, ny);
          const occ = at.get(t);
          if (!occ) { out.push(t); }
          else { if (occ.side !== p.side) out.push(t); break; }
          nx += dx; ny += dy;
        }
      }
      break;
    }
    case 'cannon': {
      for (const [dx, dy] of ORTHO_DIRS) {
        let nx = x + dx, ny = y + dy;
        while (onBoard(nx, ny)) {
          const t = ptKey(nx, ny);
          if (!at.has(t)) { out.push(t); nx += dx; ny += dy; continue; }
          // 找到第一个子（炮架），越过它之后的第一个子可吃
          nx += dx; ny += dy;
          while (onBoard(nx, ny)) {
            const t2 = ptKey(nx, ny);
            const occ2 = at.get(t2);
            if (occ2) { if (occ2.side !== p.side) out.push(t2); break; }
            nx += dx; ny += dy;
          }
          break;
        }
      }
      break;
    }
    case 'zu': {
      const home = p.side;
      const inHome = quadrantOf(p.pt) === home;
      const dirs = inHome || !state.config.pawnFreeAfterLeave
        ? FORWARD[home]
        : ORTHO_DIRS;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy;
        if (!onBoard(nx, ny)) continue;
        const t = ptKey(nx, ny);
        if (!inHome && state.config.pawnReenterHomeForbidden && quadrantOf(t) === home) continue;
        const occ = at.get(t);
        if (!occ || occ.side !== p.side) out.push(t);
      }
      break;
    }
  }
  return out;
}
