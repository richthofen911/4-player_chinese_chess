"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KING_CHAR = void 0;
exports.initialPieces = initialPieces;
const geometry_1 = require("../geometry");
// R4：红方初始布局取自实体棋照片（左上象限局部坐标 col,row 0..4），
// 其余三方 = 绕盘心顺时针 90° 旋转生成。
const RED_LAYOUT = [
    ['king', 0, 0], ['elephant', 2, 0], ['zu', 3, 0],
    ['rook', 0, 1], ['advisor', 1, 1], ['cannon', 2, 1],
    ['horse', 2, 2], ['zu', 3, 2],
    ['zu', 0, 3], ['zu', 2, 3],
];
exports.KING_CHAR = { red: '晋', blue: '齐', green: '楚', black: '秦' };
const BASE_CHAR = {
    king: '', advisor: '士', elephant: '象', horse: '马',
    rook: '车', cannon: '炮', zu: '卒',
};
function initialPieces() {
    const pieces = [];
    let id = 1;
    let coords = RED_LAYOUT.map(([, x, y]) => [x, y]);
    for (let rot = 0; rot < 4; rot++) {
        const side = geometry_1.SIDES[rot];
        coords.forEach(([x, y], i) => {
            const kind = RED_LAYOUT[i][0];
            const ch = kind === 'king' ? exports.KING_CHAR[side] : BASE_CHAR[kind];
            pieces.push({ id: id++, side, kind, ch, pt: (0, geometry_1.ptKey)(x, y) });
        });
        coords = coords.map(([x, y]) => (0, geometry_1.rotate90cw)(x, y));
    }
    return pieces;
}
//# sourceMappingURL=setup.js.map