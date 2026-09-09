"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const node_crypto_1 = require("node:crypto");
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const IDLE_MS = 30 * 60_000;
class RoomManager {
    rooms = new Map();
    conns = new Map();
    tokenIndex = new Map();
    sweeper = setInterval(() => this.sweep(), 60_000);
    constructor() {
        this.sweeper.unref();
    }
    newCode() {
        for (;;) {
            const c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
            if (!this.rooms.has(c))
                return c;
        }
    }
    createRoom() {
        const room = {
            code: this.newCode(), phase: 'lobby', host: 'red', seats: {},
            game: null, createdAt: Date.now(), lastActive: Date.now(), aiTimer: null,
        };
        this.rooms.set(room.code, room);
        return room;
    }
    lookupToken(token) {
        const loc = this.tokenIndex.get(token);
        if (!loc)
            return undefined;
        const room = this.rooms.get(loc.code);
        const seat = room?.seats[loc.side];
        if (!room || !seat || seat.token !== token) {
            this.tokenIndex.delete(token);
            return undefined;
        }
        return loc;
    }
    /** 真人入座/接管：生成新令牌并绑定重连凭据；若该连接原持其他座位则释放或转 AI */
    claimSeat(room, side, name, conn) {
        if (conn.roomCode === room.code && conn.side && conn.side !== side) {
            const old = room.seats[conn.side];
            if (old) {
                if (room.phase === 'lobby') {
                    this.releaseSeat(room, old.side);
                    this.migrateHost(room);
                }
                else {
                    old.ai = true;
                    old.name = '电脑';
                    old.connId = null; // 令牌保留：本人可随时归座
                }
            }
        }
        const prev = room.seats[side];
        if (prev)
            this.tokenIndex.delete(prev.token);
        const seat = { side, name, token: (0, node_crypto_1.randomUUID)(), connId: conn.id, ai: false, joinedAt: prev?.joinedAt ?? Date.now() };
        room.seats[side] = seat;
        this.tokenIndex.set(seat.token, { code: room.code, side });
        conn.roomCode = room.code;
        conn.side = side;
        return seat;
    }
    releaseSeat(room, side) {
        const seat = room.seats[side];
        if (seat)
            this.tokenIndex.delete(seat.token);
        delete room.seats[side];
    }
    migrateHost(room) {
        if (room.seats[room.host])
            return;
        const first = Object.values(room.seats).sort((a, b) => a.joinedAt - b.joinedAt)[0];
        if (first)
            room.host = first.side;
    }
    touch(room) {
        room.lastActive = Date.now();
    }
    sweep() {
        const now = Date.now();
        for (const [code, room] of this.rooms) {
            const emptyLobby = room.phase === 'lobby' && Object.keys(room.seats).length === 0;
            if (now - room.lastActive <= IDLE_MS && !emptyLobby)
                continue;
            if (room.aiTimer)
                clearTimeout(room.aiTimer);
            for (const conn of this.conns.values()) {
                if (conn.roomCode === code) {
                    conn.roomCode = null;
                    conn.side = null;
                }
            }
            this.rooms.delete(code);
        }
    }
    close() {
        clearInterval(this.sweeper);
        for (const room of this.rooms.values()) {
            if (room.aiTimer)
                clearTimeout(room.aiTimer);
        }
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=rooms.js.map