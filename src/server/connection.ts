import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { SIDES } from '../shared/geometry';
import { applyMove, createGame, validateMove } from '../shared/rules/engine';
import { DEFAULT_RULES } from '../shared/rules/config';
import type { ClientMsg, ErrorCode, RoomView, ServerMsg } from '../shared/protocol';
import type { Move, Side } from '../shared/types';
import { chooseMove } from './ai';
import { parseClientMsg } from './protocol';
import type { Conn, Room, RoomManager } from './rooms';

const AI_DELAY_MS = 800;
const LOBBY_GRACE_MS = 30_000;

function send(ws: WebSocket, msg: ServerMsg): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function fail(ws: WebSocket, code: ErrorCode, message?: string): void {
  send(ws, { t: 'error', code, message });
}

function seatOf(mgr: RoomManager, conn: Conn): { room: Room; seat: NonNullable<Room['seats'][Side]> } | null {
  if (!conn.roomCode || !conn.side) return null;
  const room = mgr.rooms.get(conn.roomCode);
  const seat = room?.seats[conn.side];
  return room && seat ? { room, seat } : null;
}

function roomView(room: Room, forSide: Side | null): RoomView {
  return {
    code: room.code,
    phase: room.phase,
    seats: SIDES.map((side) => {
      const seat = room.seats[side];
      return seat
        ? { side, name: seat.name, connected: seat.connId !== null, ai: seat.ai, isHost: room.host === side }
        : null;
    }).filter((s): s is NonNullable<typeof s> => s !== null),
    you: { side: forSide },
  };
}

function broadcastRoom(mgr: RoomManager, room: Room): void {
  for (const conn of mgr.conns.values()) {
    if (conn.roomCode !== room.code) continue;
    const view = roomView(room, conn.side);
    const seat = conn.side ? room.seats[conn.side] : undefined;
    if (seat && !seat.ai && seat.connId === conn.id) view.you.token = seat.token;
    send(conn.ws, { t: 'room.update', room: view });
  }
}

function broadcast(mgr: RoomManager, room: Room, msg: ServerMsg): void {
  for (const conn of mgr.conns.values()) {
    if (conn.roomCode === room.code) send(conn.ws, msg);
  }
}

function resumeSeat(mgr: RoomManager, conn: Conn, ws: WebSocket, token: string): boolean {
  const loc = mgr.lookupToken(token);
  if (!loc) return false;
  const room = mgr.rooms.get(loc.code)!;
  const seat = room.seats[loc.side]!;
  seat.connId = conn.id;
  seat.ai = false; // 凭令牌归座即真人
  conn.roomCode = room.code;
  conn.side = seat.side;
  mgr.touch(room);
  broadcastRoom(mgr, room);
  if (room.game && room.phase !== 'lobby') send(ws, { t: 'game.state', state: room.game });
  return true;
}

function joinSeat(mgr: RoomManager, room: Room, conn: Conn, ws: WebSocket, name: string, wanted: Side | undefined): void {
  if (room.phase !== 'lobby') {
    const seat = wanted ? room.seats[wanted] : undefined;
    if (seat?.ai) { takeoverAiSeat(mgr, room, conn, seat.side, name); return; }
    fail(ws, 'ALREADY_STARTED', '房间对局已开始，可指定 AI 座位进行接管');
    return;
  }
  let target = wanted;
  if (target) {
    if (room.seats[target]) { fail(ws, 'SEAT_TAKEN'); return; }
  } else {
    target = SIDES.find((s) => !room.seats[s]);
    if (!target) { fail(ws, 'ROOM_FULL'); return; }
  }
  if (!room.seats[room.host]) mgr.migrateHost(room);
  mgr.claimSeat(room, target, name, conn);
  if (!room.seats[room.host]) room.host = target;
  mgr.touch(room);
  broadcastRoom(mgr, room);
}

/** R12：真人随时接管 AI 座位 */
function takeoverAiSeat(mgr: RoomManager, room: Room, conn: Conn, side: Side, name: string): void {
  mgr.claimSeat(room, side, name, conn);
  if (room.game && room.game.turn === side && room.aiTimer) {
    clearTimeout(room.aiTimer);
    room.aiTimer = null;
  }
  mgr.touch(room);
  broadcastRoom(mgr, room);
  scheduleAi(mgr, room); // 原座位被降级为 AI 且正轮到它时，需要接管调度
  if (room.game && room.phase !== 'lobby') send(conn.ws, { t: 'game.state', state: room.game });
}

function performMove(mgr: RoomManager, room: Room, m: Move): void {
  if (!room.game || room.phase !== 'playing') return;
  const { next, events } = applyMove(room.game, m);
  room.game = next;
  mgr.touch(room);
  broadcast(mgr, room, { t: 'game.applied', move: m, events, state: next });
  if (next.over) {
    room.phase = 'finished';
    broadcast(mgr, room, { t: 'game.over', winner: next.over.winner, reason: next.over.reason, state: next });
    broadcastRoom(mgr, room);
    return;
  }
  scheduleAi(mgr, room);
}

function scheduleAi(mgr: RoomManager, room: Room): void {
  if (room.aiTimer) { clearTimeout(room.aiTimer); room.aiTimer = null; }
  const turnSeat = room.game ? room.seats[room.game.turn] : undefined;
  if (!turnSeat?.ai) return;
  room.aiTimer = setTimeout(() => {
    room.aiTimer = null;
    if (room.phase !== 'playing' || !room.game) return;
    const seat = room.seats[room.game.turn];
    if (!seat?.ai) return; // 已被真人接管
    const move = chooseMove(room.game);
    if (move) performMove(mgr, room, move);
  }, AI_DELAY_MS);
  room.aiTimer.unref?.();
}

function route(mgr: RoomManager, conn: Conn, msg: ClientMsg): void {
  const ws = conn.ws;
  switch (msg.t) {
    case 'hello': {
      send(ws, { t: 'welcome' });
      if (msg.token) {
        if (!resumeSeat(mgr, conn, ws, msg.token)) fail(ws, 'BAD_TOKEN');
      }
      return;
    }
    case 'room.create': {
      if (conn.roomCode) { fail(ws, 'BAD_REQUEST', '已在房间中'); return; }
      const room = mgr.createRoom();
      const seat = msg.seat && !room.seats[msg.seat] ? msg.seat : SIDES.find((s) => !room.seats[s])!;
      mgr.claimSeat(room, seat, msg.name, conn);
      room.host = seat;
      broadcastRoom(mgr, room);
      return;
    }
    case 'room.join': {
      if (conn.roomCode) { fail(ws, 'BAD_REQUEST', '已在房间中'); return; }
      if (msg.token && resumeSeat(mgr, conn, ws, msg.token)) return;
      const room = mgr.rooms.get(msg.code);
      if (!room) { fail(ws, 'ROOM_NOT_FOUND'); return; }
      joinSeat(mgr, room, conn, ws, msg.name, msg.seat);
      return;
    }
    case 'seat.claim': {
      const cur = seatOf(mgr, conn);
      const room = cur?.room ?? (conn.roomCode ? mgr.rooms.get(conn.roomCode) : undefined);
      if (!room) { fail(ws, 'BAD_REQUEST', '请先加入房间'); return; }
      const seat = room.seats[msg.seat];
      if (seat && !seat.ai) { fail(ws, 'SEAT_TAKEN'); return; }
      if (room.phase === 'finished') { fail(ws, 'ALREADY_STARTED'); return; }
      mgr.claimSeat(room, msg.seat, cur?.seat.name ?? conn.side ?? msg.seat, conn);
      if (room.game && room.game.turn === msg.seat && room.aiTimer) {
        clearTimeout(room.aiTimer);
        room.aiTimer = null;
      }
      mgr.touch(room);
      broadcastRoom(mgr, room);
      scheduleAi(mgr, room);
      if (room.game && room.phase !== 'lobby') send(ws, { t: 'game.state', state: room.game });
      return;
    }
    case 'room.leave': {
      const cur = seatOf(mgr, conn);
      if (!cur) return;
      const { room, seat } = cur;
      conn.roomCode = null;
      conn.side = null;
      if (room.phase === 'lobby') {
        mgr.releaseSeat(room, seat.side);
        mgr.migrateHost(room);
      } else {
        seat.connId = null; // 对局中保留座位供重连
      }
      mgr.touch(room);
      broadcastRoom(mgr, room);
      return;
    }
    case 'room.start': {
      const cur = seatOf(mgr, conn);
      if (!cur) { fail(ws, 'BAD_REQUEST', '请先加入房间'); return; }
      const { room, seat } = cur;
      if (room.host !== seat.side) { fail(ws, 'NOT_HOST'); return; }
      if (room.phase !== 'lobby') { fail(ws, 'ALREADY_STARTED'); return; }
      for (const side of SIDES) {
        if (!room.seats[side]) {
          room.seats[side] = { side, name: '电脑', token: randomUUID(), connId: null, ai: true, joinedAt: Date.now() };
        }
      }
      room.game = createGame(DEFAULT_RULES);
      room.phase = 'playing';
      mgr.touch(room);
      broadcastRoom(mgr, room);
      broadcast(mgr, room, { t: 'game.start', state: room.game });
      scheduleAi(mgr, room);
      return;
    }
    case 'game.move': {
      const cur = seatOf(mgr, conn);
      const game = cur?.room.game;
      if (!cur || !game || cur.room.phase !== 'playing') return;
      const { room, seat } = cur;
      if (seat.ai || seat.connId !== conn.id) { fail(ws, 'NOT_YOUR_TURN'); return; }
      if (game.turn !== seat.side) { fail(ws, 'NOT_YOUR_TURN', `轮到 ${game.turn}`); return; }
      const check = validateMove(game, { from: msg.from, to: msg.to });
      if (!check.ok) { fail(ws, check.code, check.detail); return; }
      performMove(mgr, room, { from: msg.from, to: msg.to });
      return;
    }
    case 'ping':
      // 客户端心跳也算活跃：避免 30 分钟清扫把仍有玩家在线的房间删掉
      if (conn.roomCode) {
        const room = mgr.rooms.get(conn.roomCode);
        if (room) mgr.touch(room);
      }
      send(ws, { t: 'pong' });
      return;
  }
}

export function handleConnection(mgr: RoomManager, ws: WebSocket): void {
  const conn: Conn = { id: randomUUID(), ws, roomCode: null, side: null };
  mgr.conns.set(conn.id, conn);

  ws.on('message', (raw) => {
    const msg = parseClientMsg(String(raw));
    if (!msg) { fail(ws, 'BAD_REQUEST'); return; }
    try {
      route(mgr, conn, msg);
    } catch (err) {
      console.error('[room] handler error:', err);
      fail(ws, 'BAD_REQUEST', 'internal error');
    }
  });

  ws.on('close', () => {
    mgr.conns.delete(conn.id);
    if (!conn.roomCode || !conn.side) return;
    const room = mgr.rooms.get(conn.roomCode);
    const seat = room?.seats[conn.side];
    if (!room || !seat || seat.connId !== conn.id) return;
    seat.connId = null;
    broadcastRoom(mgr, room);
    if (room.phase === 'lobby') {
      setTimeout(() => {
        if (room.phase === 'lobby' && room.seats[seat.side] === seat && seat.connId === null) {
          mgr.releaseSeat(room, seat.side);
          mgr.migrateHost(room);
          mgr.touch(room);
          broadcastRoom(mgr, room);
        }
      }, LOBBY_GRACE_MS).unref?.();
    }
  });
}
