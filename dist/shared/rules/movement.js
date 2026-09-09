"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.occupancy = occupancy;
exports.pseudoMoves = pseudoMoves;
const geometry_1 = require("../geometry");
function occupancy(state) {
    const m = new Map();
    for (const p of state.pieces)
        m.set(p.pt, p);
    return m;
}
/**
 * 伪着法：不含"轮到自己"检查，目标点允许为空点或敌方棋子所在点。
 * 界河只影响渲染：点阵是连续的 10x10，(4,y)-(5,y) 等跨河相邻即普通正交相邻（R7）。
 */
function pseudoMoves(state, p, at) {
    const { x, y } = (0, geometry_1.ptOf)(p.pt);
    const out = [];
    const push = (nx, ny) => {
        if (!(0, geometry_1.onBoard)(nx, ny))
            return;
        const t = (0, geometry_1.ptKey)(nx, ny);
        const occ = at.get(t);
        if (!occ || occ.side !== p.side)
            out.push(t);
    };
    switch (p.kind) {
        case 'king': {
            for (const [dx, dy] of geometry_1.ORTHO_DIRS) {
                const nx = x + dx, ny = y + dy;
                if ((0, geometry_1.onBoard)(nx, ny) && (0, geometry_1.inPalace)(p.side, (0, geometry_1.ptKey)(nx, ny)))
                    push(nx, ny);
            }
            break;
        }
        case 'advisor': {
            for (const [dx, dy] of geometry_1.DIAG_DIRS) {
                const nx = x + dx, ny = y + dy;
                if ((0, geometry_1.onBoard)(nx, ny) && (0, geometry_1.inPalace)(p.side, (0, geometry_1.ptKey)(nx, ny)))
                    push(nx, ny);
            }
            break;
        }
        case 'elephant': {
            for (const [dx, dy] of geometry_1.DIAG_DIRS) {
                const ex = x + dx / 1, ey = y + dy / 1; // 象眼 = 斜走第一步
                const nx = x + dx * 2, ny = y + dy * 2;
                if (!(0, geometry_1.onBoard)(nx, ny))
                    continue;
                const t = (0, geometry_1.ptKey)(nx, ny);
                if (state.config.elephantZone === 'ownQuadrant' && (0, geometry_1.quadrantOf)(t) !== (0, geometry_1.quadrantOf)(p.pt))
                    continue;
                if (at.has((0, geometry_1.ptKey)(ex, ey)))
                    continue; // 塞象眼
                const occ = at.get(t);
                if (!occ || occ.side !== p.side)
                    out.push(t);
            }
            break;
        }
        case 'horse': {
            const hops = [
                [1, 2, 0, 1], [2, 1, 1, 0], [2, -1, 1, 0], [1, -2, 0, -1],
                [-1, -2, 0, -1], [-2, -1, -1, 0], [-2, 1, -1, 0], [-1, 2, 0, 1],
            ];
            for (const [dx, dy, lx, ly] of hops) {
                const nx = x + dx, ny = y + dy;
                if (!(0, geometry_1.onBoard)(nx, ny))
                    continue;
                if (at.has((0, geometry_1.ptKey)(x + lx, y + ly)))
                    continue; // 蹩马腿
                push(nx, ny);
            }
            break;
        }
        case 'rook': {
            for (const [dx, dy] of geometry_1.ORTHO_DIRS) {
                let nx = x + dx, ny = y + dy;
                while ((0, geometry_1.onBoard)(nx, ny)) {
                    const t = (0, geometry_1.ptKey)(nx, ny);
                    const occ = at.get(t);
                    if (!occ) {
                        out.push(t);
                    }
                    else {
                        if (occ.side !== p.side)
                            out.push(t);
                        break;
                    }
                    nx += dx;
                    ny += dy;
                }
            }
            break;
        }
        case 'cannon': {
            for (const [dx, dy] of geometry_1.ORTHO_DIRS) {
                let nx = x + dx, ny = y + dy;
                while ((0, geometry_1.onBoard)(nx, ny)) {
                    const t = (0, geometry_1.ptKey)(nx, ny);
                    if (!at.has(t)) {
                        out.push(t);
                        nx += dx;
                        ny += dy;
                        continue;
                    }
                    // 找到第一个子（炮架），越过它之后的第一个子可吃
                    nx += dx;
                    ny += dy;
                    while ((0, geometry_1.onBoard)(nx, ny)) {
                        const t2 = (0, geometry_1.ptKey)(nx, ny);
                        const occ2 = at.get(t2);
                        if (occ2) {
                            if (occ2.side !== p.side)
                                out.push(t2);
                            break;
                        }
                        nx += dx;
                        ny += dy;
                    }
                    break;
                }
            }
            break;
        }
        case 'zu': {
            const home = p.side;
            const inHome = (0, geometry_1.quadrantOf)(p.pt) === home;
            const dirs = inHome || !state.config.pawnFreeAfterLeave
                ? geometry_1.FORWARD[home]
                : geometry_1.ORTHO_DIRS;
            for (const [dx, dy] of dirs) {
                const nx = x + dx, ny = y + dy;
                if (!(0, geometry_1.onBoard)(nx, ny))
                    continue;
                const t = (0, geometry_1.ptKey)(nx, ny);
                if (!inHome && state.config.pawnReenterHomeForbidden && (0, geometry_1.quadrantOf)(t) === home)
                    continue;
                const occ = at.get(t);
                if (!occ || occ.side !== p.side)
                    out.push(t);
            }
            break;
        }
    }
    return out;
}
//# sourceMappingURL=movement.js.map