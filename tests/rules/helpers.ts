import { ptKey } from '../../src/shared/geometry';
import { occupancy, pseudoMoves } from '../../src/shared/rules/movement';
import { createGame } from '../../src/shared/rules/engine';
import type { GameState, Piece, PieceKind, Side } from '../../src/shared/types';

let nextId = 1000;

export function piece(side: Side, kind: PieceKind, x: number, y: number): Piece {
  return { id: nextId++, side, kind, ch: kind, pt: ptKey(x, y) };
}

/** 以默认配置构造任意残局（turn 指定行棋方） */
export function stateWith(turn: Side, ...pieces: Piece[]): GameState {
  const g = createGame();
  g.pieces = pieces;
  g.turn = turn;
  g.alive = { red: true, blue: true, green: true, black: true };
  return g;
}

/** (x,y) 处棋子的伪着法目标点集合 */
export function targetsOf(g: GameState, x: number, y: number): number[] {
  const p = g.pieces.find((q) => q.pt === ptKey(x, y));
  if (!p) throw new Error(`(${x},${y}) 无棋子`);
  return pseudoMoves(g, p, occupancy(g));
}
