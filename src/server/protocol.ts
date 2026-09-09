import { SIDES } from '../shared/geometry';
import type { ClientMsg } from '../shared/protocol';
import type { Side } from '../shared/types';

const SEAT_SET = new Set<string>(SIDES);

function str(v: unknown, max = 24): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;
}

function pt(v: unknown): number | undefined {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) < 100 ? (v as number) : undefined;
}

function side(v: unknown): Side | undefined {
  return typeof v === 'string' && SEAT_SET.has(v) ? (v as Side) : undefined;
}

/** 入站消息类型守卫；非法消息返回 null */
export function parseClientMsg(raw: string): ClientMsg | null {
  let o: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.t !== 'string') return null;
    o = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  switch (o.t) {
    case 'hello':
      return { t: 'hello', name: str(o.name), token: str(o.token, 64) };
    case 'room.create': {
      const name = str(o.name);
      if (!name) return null;
      return { t: 'room.create', name, seat: side(o.seat) };
    }
    case 'room.join': {
      const code = str(o.code, 8)?.toUpperCase();
      const name = str(o.name);
      if (!code || !name) return null;
      return { t: 'room.join', code, name, seat: side(o.seat), token: str(o.token, 64) };
    }
    case 'room.leave':
      return { t: 'room.leave' };
    case 'seat.claim': {
      const s = side(o.seat);
      return s ? { t: 'seat.claim', seat: s } : null;
    }
    case 'room.start':
      return { t: 'room.start' };
    case 'game.move': {
      const from = pt(o.from);
      const to = pt(o.to);
      return from !== undefined && to !== undefined ? { t: 'game.move', from, to } : null;
    }
    case 'ping':
      return { t: 'ping' };
    default:
      return null;
  }
}
