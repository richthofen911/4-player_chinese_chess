import type { GameEvent, Move, PublicState, Side } from './types';

export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'SEAT_TAKEN'
  | 'NOT_HOST'
  | 'ALREADY_STARTED'
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_MOVE'
  | 'NO_PIECE'
  | 'OWN_PIECE'
  | 'GAME_OVER'
  | 'BAD_TOKEN'
  | 'BAD_REQUEST';

export type ClientMsg =
  | { t: 'hello'; name?: string; token?: string }
  | { t: 'room.create'; name: string; seat?: Side }
  | { t: 'room.join'; code: string; name: string; seat?: Side; token?: string }
  | { t: 'room.leave' }
  | { t: 'seat.claim'; seat: Side }
  | { t: 'room.start' }
  | { t: 'game.move'; from: number; to: number }
  | { t: 'ping' };

export interface SeatView {
  side: Side;
  name: string;
  connected: boolean;
  ai: boolean;
  isHost: boolean;
}

export interface RoomView {
  code: string;
  phase: 'lobby' | 'playing' | 'finished';
  seats: SeatView[];
  you: { side: Side | null; token?: string };
}

export type ServerMsg =
  | { t: 'welcome' }
  | { t: 'room.update'; room: RoomView }
  | { t: 'game.start'; state: PublicState }
  | { t: 'game.applied'; move: Move; events: GameEvent[]; state: PublicState }
  | { t: 'game.state'; state: PublicState }
  | { t: 'game.over'; winner: Side | 'draw'; reason: string; state: PublicState }
  | { t: 'error'; code: ErrorCode; message?: string }
  | { t: 'pong' };
