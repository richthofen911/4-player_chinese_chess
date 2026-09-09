import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import type { GameState, Side } from '../shared/types';

export interface Seat {
  side: Side;
  name: string;
  token: string;
  connId: string | null;
  ai: boolean;
  joinedAt: number;
}

export interface Conn {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  side: Side | null;
}

export interface Room {
  code: string;
  phase: 'lobby' | 'playing' | 'finished';
  host: Side;
  seats: Partial<Record<Side, Seat>>;
  game: GameState | null;
  createdAt: number;
  lastActive: number;
  aiTimer: ReturnType<typeof setTimeout> | null;
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const IDLE_MS = 30 * 60_000;

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  readonly conns = new Map<string, Conn>();
  private readonly tokenIndex = new Map<string, { code: string; side: Side }>();
  private readonly sweeper = setInterval(() => this.sweep(), 60_000);

  constructor() {
    this.sweeper.unref();
  }

  newCode(): string {
    for (;;) {
      const c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
      if (!this.rooms.has(c)) return c;
    }
  }

  createRoom(): Room {
    const room: Room = {
      code: this.newCode(), phase: 'lobby', host: 'red', seats: {},
      game: null, createdAt: Date.now(), lastActive: Date.now(), aiTimer: null,
    };
    this.rooms.set(room.code, room);
    return room;
  }

  lookupToken(token: string): { code: string; side: Side } | undefined {
    const loc = this.tokenIndex.get(token);
    if (!loc) return undefined;
    const room = this.rooms.get(loc.code);
    const seat = room?.seats[loc.side];
    if (!room || !seat || seat.token !== token) {
      this.tokenIndex.delete(token);
      return undefined;
    }
    return loc;
  }

  /** 真人入座/接管：生成新令牌并绑定重连凭据；若该连接原持其他座位则释放或转 AI */
  claimSeat(room: Room, side: Side, name: string, conn: Conn): Seat {
    if (conn.roomCode === room.code && conn.side && conn.side !== side) {
      const old = room.seats[conn.side];
      if (old) {
        if (room.phase === 'lobby') {
          this.releaseSeat(room, old.side);
          this.migrateHost(room);
        } else {
          old.ai = true;
          old.name = '电脑';
          old.connId = null; // 令牌保留：本人可随时归座
        }
      }
    }
    const prev = room.seats[side];
    if (prev) this.tokenIndex.delete(prev.token);
    const seat: Seat = { side, name, token: randomUUID(), connId: conn.id, ai: false, joinedAt: prev?.joinedAt ?? Date.now() };
    room.seats[side] = seat;
    this.tokenIndex.set(seat.token, { code: room.code, side });
    conn.roomCode = room.code;
    conn.side = side;
    return seat;
  }

  releaseSeat(room: Room, side: Side): void {
    const seat = room.seats[side];
    if (seat) this.tokenIndex.delete(seat.token);
    delete room.seats[side];
  }

  migrateHost(room: Room): void {
    if (room.seats[room.host]) return;
    const first = Object.values(room.seats).sort((a, b) => a.joinedAt - b.joinedAt)[0];
    if (first) room.host = first.side;
  }

  touch(room: Room): void {
    room.lastActive = Date.now();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const emptyLobby = room.phase === 'lobby' && Object.keys(room.seats).length === 0;
      if (now - room.lastActive <= IDLE_MS && !emptyLobby) continue;
      if (room.aiTimer) clearTimeout(room.aiTimer);
      for (const conn of this.conns.values()) {
        if (conn.roomCode === code) { conn.roomCode = null; conn.side = null; }
      }
      this.rooms.delete(code);
    }
  }

  close(): void {
    clearInterval(this.sweeper);
    for (const room of this.rooms.values()) {
      if (room.aiTimer) clearTimeout(room.aiTimer);
    }
  }
}
