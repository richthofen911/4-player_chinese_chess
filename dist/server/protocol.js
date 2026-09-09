"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseClientMsg = parseClientMsg;
const geometry_1 = require("../shared/geometry");
const SEAT_SET = new Set(geometry_1.SIDES);
function str(v, max = 24) {
    return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined;
}
function pt(v) {
    return Number.isInteger(v) && v >= 0 && v < 100 ? v : undefined;
}
function side(v) {
    return typeof v === 'string' && SEAT_SET.has(v) ? v : undefined;
}
/** 入站消息类型守卫；非法消息返回 null */
function parseClientMsg(raw) {
    let o;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || typeof parsed.t !== 'string')
            return null;
        o = parsed;
    }
    catch {
        return null;
    }
    switch (o.t) {
        case 'hello':
            return { t: 'hello', name: str(o.name), token: str(o.token, 64) };
        case 'room.create': {
            const name = str(o.name);
            if (!name)
                return null;
            return { t: 'room.create', name, seat: side(o.seat) };
        }
        case 'room.join': {
            const code = str(o.code, 8)?.toUpperCase();
            const name = str(o.name);
            if (!code || !name)
                return null;
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
//# sourceMappingURL=protocol.js.map