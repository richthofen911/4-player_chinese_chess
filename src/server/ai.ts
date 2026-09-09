import { allLegalMoves, pieceAt } from '../shared/rules/engine';
import type { GameState, Move, PieceKind } from '../shared/types';

const VALUE: Record<PieceKind, number> = {
  king: 100000, rook: 9, cannon: 8, horse: 6, advisor: 3, elephant: 3, zu: 2,
};

/** R12：贪心 AI —— 四国各自为战，优先吃价值高的子（吃国名子必胜），随机打破平局 */
export function chooseMove(state: GameState, rand: () => number = Math.random): Move | null {
  const moves = allLegalMoves(state);
  if (moves.length === 0) return null;
  let best: Move | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const victim = pieceAt(state, m.to);
    let score = rand();
    if (victim) score += VALUE[victim.kind];
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
