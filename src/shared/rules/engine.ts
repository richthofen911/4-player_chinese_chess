import { SIDES } from '../geometry';
import { initialPieces } from './setup';
import { occupancy, pseudoMoves } from './movement';
import { checkVictory } from './victory';
import { DEFAULT_RULES, type RulesConfig } from './config';
import type { GameEvent, GameState, Move, MoveCheck, Piece, PtKey, Side } from '../types';

export function createGame(config: RulesConfig = DEFAULT_RULES): GameState {
  return {
    config,
    pieces: initialPieces(),
    turn: config.turnOrder[0],
    turnOrder: [...config.turnOrder],
    alive: { red: true, blue: true, green: true, black: true },
    ply: 0,
    lastCapturePly: 0,
    lastMove: null,
    over: null,
  };
}

export function pieceAt(state: GameState, pt: PtKey): Piece | undefined {
  return state.pieces.find((p) => p.pt === pt);
}

export function legalMovesFrom(state: GameState, from: PtKey): Move[] {
  if (state.over) return [];
  const p = pieceAt(state, from);
  if (!p || p.side !== state.turn) return [];
  const at = occupancy(state);
  return pseudoMoves(state, p, at).map((to) => ({ from, to }));
}

export function allLegalMoves(state: GameState, side: Side = state.turn): Move[] {
  if (state.over || !state.alive[side]) return [];
  const at = occupancy(state);
  const moves: Move[] = [];
  for (const p of state.pieces) {
    if (p.side !== side) continue;
    for (const to of pseudoMoves(state, p, at)) moves.push({ from: p.pt, to });
  }
  return moves;
}

export function validateMove(state: GameState, m: Move): MoveCheck {
  if (state.over) return { ok: false, code: 'GAME_OVER' };
  const p = pieceAt(state, m.from);
  if (!p) return { ok: false, code: 'NO_PIECE', detail: `(${m.from % 10},${Math.floor(m.from / 10)}) 没有棋子` };
  if (p.side !== state.turn) return { ok: false, code: 'NOT_YOUR_TURN', detail: `轮到 ${p.side === state.turn ? '' : state.turn}` };
  const target = pieceAt(state, m.to);
  if (target && target.side === p.side) return { ok: false, code: 'OWN_PIECE' };
  const at = occupancy(state);
  if (!pseudoMoves(state, p, at).includes(m.to)) {
    return { ok: false, code: 'ILLEGAL_MOVE', detail: `${p.ch} 不能从 (${m.from % 10},${Math.floor(m.from / 10)}) 走到 (${m.to % 10},${Math.floor(m.to / 10)})` };
  }
  return { ok: true };
}

export function applyMove(state: GameState, m: Move): { next: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const next: GameState = structuredClone(state);
  const at = occupancy(next);
  const mover = at.get(m.from)!;
  const victim = at.get(m.to);

  next.pieces = next.pieces.filter((p) => p !== victim);
  mover.pt = m.to;
  events.push({ t: 'move', side: mover.side, from: m.from, to: m.to });
  if (victim) {
    events.push({ t: 'capture', side: mover.side, victim: { ...victim } });
    if (victim.kind === 'king') {
      next.alive[victim.side] = false;
      if (next.config.eliminationRemovesPieces) {
        const defected: Piece[] = [];
        if (next.config.defectPawnsOnElimination) {
          for (const q of next.pieces) {
            if (defected.length >= next.config.defectPawnsMax) break;
            if (q.side === victim.side && q.kind === 'zu') {
              q.side = mover.side;
              defected.push(q);
            }
          }
        }
        next.pieces = next.pieces.filter((q) => q.side !== victim.side);
        if (defected.length > 0) {
          events.push({ t: 'defected', from: victim.side, to: mover.side, pawns: defected.map((q) => ({ ...q })) });
        }
      }
      events.push({ t: 'eliminated', side: victim.side });
    }
  }
  next.lastMove = { ...m };
  next.ply = state.ply + 1;
  next.lastCapturePly = victim ? next.ply : state.lastCapturePly;

  const win = checkVictory(next);
  if (win) {
    next.over = win;
    events.push({ t: 'gameover', winner: win.winner, reason: win.reason });
    return { next, events };
  }
  const limit = next.config.drawAfterNoCapture;
  if (limit > 0 && next.ply - next.lastCapturePly >= limit) {
    next.over = { winner: 'draw', reason: `连续 ${limit} 步无吃子，判和` };
    events.push({ t: 'gameover', winner: 'draw', reason: next.over.reason });
    return { next, events };
  }
  advanceTurn(next, events);
  return { next, events };
}

/** R11：轮转跳过已出局与无合法着法的方（发出 skip 事件）；若无人可走 -> 和棋 */
function advanceTurn(next: GameState, events: GameEvent[]): void {
  const order = next.turnOrder;
  const startIdx = order.indexOf(next.turn);
  for (let step = 1; step <= order.length; step++) {
    const cand = order[(startIdx + step) % order.length];
    if (!next.alive[cand]) continue;
    if (next.config.stalemateSkipsTurn && allLegalMoves(next, cand).length === 0) {
      events.push({ t: 'skip', side: cand, reason: 'stalemate' });
      continue;
    }
    next.turn = cand;
    return;
  }
  next.over = { winner: 'draw', reason: '所有在场方均无合法着法' };
  events.push({ t: 'gameover', winner: 'draw', reason: next.over.reason });
}

/** pt 是否被 by 方任一棋子攻击（不含"轮次"概念）。为国名子安全判断等预留。 */
export function isAttacked(state: GameState, pt: PtKey, by: Side): boolean {
  const at = occupancy(state);
  for (const p of state.pieces) {
    if (p.side !== by) continue;
    if (pseudoMoves(state, p, at).includes(pt)) return true;
  }
  return false;
}

export const sideLabel: Record<Side, string> = { red: '红', blue: '蓝', green: '绿', black: '黑' };
export { SIDES };
