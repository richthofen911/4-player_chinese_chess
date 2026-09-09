import { KING_CHAR } from '../shared/rules/setup';
import type { RoomView, ServerMsg } from '../shared/protocol';
import type { Piece, PublicState, Side, PtKey } from '../shared/types';

const SS_KEY = 'sqxq.session';

export interface Session { code: string; token: string }
export function saveSession(s: Session): void { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); }
export function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function clearSession(): void { sessionStorage.removeItem(SS_KEY); }

export interface ClientState {
  connected: boolean;
  room: RoomView | null;
  game: PublicState | null;
  mySide: Side | null;
  selection: PtKey | null;
  legal: PtKey[];
  captured: Piece[];
  notice: string | null;
  over: { winner: Side | 'draw'; reason: string } | null;
}

const ERR_TEXT: Record<string, string> = {
  ROOM_NOT_FOUND: '房间不存在',
  ROOM_FULL: '房间已满',
  SEAT_TAKEN: '该座位已被占用',
  NOT_HOST: '只有房主可以开局',
  ALREADY_STARTED: '对局已开始',
  NOT_YOUR_TURN: '还没轮到你',
  ILLEGAL_MOVE: '非法着法',
  NO_PIECE: '该位置没有你的棋子',
  OWN_PIECE: '不能走到自己的棋子上',
  GAME_OVER: '对局已结束',
  BAD_TOKEN: '重连失败，请重新加入房间',
  BAD_REQUEST: '请求无效',
};

type Listener = () => void;

class Store {
  state: ClientState = {
    connected: false, room: null, game: null, mySide: null,
    selection: null, legal: [], captured: [], notice: null, over: null,
  };
  private listeners = new Set<Listener>();

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  set(patch: Partial<ClientState>): void {
    Object.assign(this.state, patch);
    for (const fn of this.listeners) fn();
  }

  handleMsg(msg: ServerMsg): void {
    switch (msg.t) {
      case 'welcome':
        this.set({ connected: true });
        return;
      case 'room.update': {
        const room = msg.room;
        if (room.you.side && room.you.token) saveSession({ code: room.code, token: room.you.token });
        if (room.phase === 'lobby') this.set({ room, mySide: room.you.side, game: null, over: null, captured: [], selection: null, legal: [] });
        else this.set({ room, mySide: room.you.side });
        return;
      }
      case 'game.start':
        this.set({ game: msg.state, captured: [], over: null, selection: null, legal: [] });
        return;
      case 'game.applied': {
        const captured = [...this.state.captured];
        const notes: string[] = [];
        for (const ev of msg.events) {
          if (ev.t === 'capture') captured.push(ev.victim);
          if (ev.t === 'defected') notes.push(`${KING_CHAR[ev.from]}方 ${ev.pawns.length} 枚卒倒戈归${KING_CHAR[ev.to]}`);
        }
        this.set({ game: msg.state, captured, selection: null, legal: [], notice: notes.length ? notes.join('；') : this.state.notice });
        return;
      }
      case 'game.state':
        this.set({ game: msg.state, selection: null, legal: [] });
        return;
      case 'game.over':
        this.set({ game: msg.state, over: { winner: msg.winner, reason: msg.reason } });
        return;
      case 'error':
        if (msg.code === 'BAD_TOKEN') clearSession();
        this.set({ notice: `${ERR_TEXT[msg.code] ?? msg.code}${msg.message ? `：${msg.message}` : ''}` });
        return;
      case 'pong':
        return;
    }
  }
}

export const store = new Store();
