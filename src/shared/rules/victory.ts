import { SIDES } from '../geometry';
import { KING_CHAR } from './setup';
import type { GameState, Side } from '../types';

/** R11：四国各自为战 -> 最后存活的一家获胜；全灭（防御性）判和 */
export function checkVictory(s: GameState): { winner: Side | 'draw'; reason: string } | null {
  const alive = SIDES.filter((side) => s.alive[side]);
  if (alive.length === 1) return { winner: alive[0], reason: `仅存 ${KING_CHAR[alive[0]]} 国，一国独存` };
  if (alive.length === 0) return { winner: 'draw', reason: '各方均被灭' };
  return null;
}
