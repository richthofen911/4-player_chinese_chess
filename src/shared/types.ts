import type { RulesConfig } from './rules/config';

export const GRID = 10;

export type PtKey = number; // y * GRID + x, 0..99
export type Side = 'red' | 'blue' | 'green' | 'black';

export type PieceKind =
  | 'king' // 国名子（晋/齐/楚/秦），相当于将帅
  | 'advisor' // 士
  | 'elephant' // 象
  | 'horse' // 马
  | 'rook' // 车
  | 'cannon' // 炮
  | 'zu'; // 卒（每方 4 枚）

export interface Piece {
  id: number;
  side: Side;
  kind: PieceKind;
  ch: string;
  pt: PtKey;
}

export interface Move {
  from: PtKey;
  to: PtKey;
}

export type GameEvent =
  | { t: 'move'; side: Side; from: PtKey; to: PtKey }
  | { t: 'capture'; side: Side; victim: Piece }
  | { t: 'eliminated'; side: Side }
  | { t: 'defected'; from: Side; to: Side; pawns: Piece[] }
  | { t: 'skip'; side: Side; reason: 'stalemate' }
  | { t: 'gameover'; winner: Side | 'draw'; reason: string };

export interface GameState {
  config: RulesConfig;
  pieces: Piece[];
  turn: Side;
  turnOrder: Side[];
  alive: Record<Side, boolean>;
  ply: number;
  lastCapturePly: number;
  lastMove: Move | null;
  over: { winner: Side | 'draw'; reason: string } | null;
}

export type PublicState = GameState;

export type IllegalCode =
  | 'NOT_YOUR_TURN'
  | 'NO_PIECE'
  | 'OWN_PIECE'
  | 'ILLEGAL_MOVE'
  | 'GAME_OVER';

export type MoveCheck = { ok: true } | { ok: false; code: IllegalCode; detail?: string };
