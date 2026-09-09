"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAND_LABELS = exports.DIAG_DIRS = exports.ORTHO_DIRS = exports.FORWARD = exports.rotate90cw = exports.PALACE = exports.SIDES = exports.onBoard = exports.ptOf = exports.ptKey = void 0;
exports.quadrantOf = quadrantOf;
exports.inPalace = inPalace;
const types_1 = require("./types");
const ptKey = (x, y) => y * types_1.GRID + x;
exports.ptKey = ptKey;
const ptOf = (k) => ({ x: k % types_1.GRID, y: Math.floor(k / types_1.GRID) });
exports.ptOf = ptOf;
const onBoard = (x, y) => x >= 0 && x < types_1.GRID && y >= 0 && y < types_1.GRID;
exports.onBoard = onBoard;
exports.SIDES = ['red', 'blue', 'green', 'black'];
// 红左上、蓝右上、绿右下、黑左下；界河是 x4/x5 与 y4/y5 之间的"格"，点阵本身连续 10x10。
function quadrantOf(k) {
    const { x, y } = (0, exports.ptOf)(k);
    if (y <= 4)
        return x <= 4 ? 'red' : 'blue';
    return x <= 4 ? 'black' : 'green';
}
// 九宫 = 每象限外角的 3x3 点阵 [x0,y0,x1,y1]
exports.PALACE = {
    red: [0, 0, 2, 2],
    blue: [7, 0, 9, 2],
    green: [7, 7, 9, 9],
    black: [0, 7, 2, 9],
};
function inPalace(side, k) {
    const { x, y } = (0, exports.ptOf)(k);
    const [x0, y0, x1, y1] = exports.PALACE[side];
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}
// 绕盘心顺时针 90°：红象限 -> 蓝 -> 绿 -> 黑
const rotate90cw = (x, y) => [types_1.GRID - 1 - y, x];
exports.rotate90cw = rotate90cw;
// 每方向中心（R6：卒在本象限内朝中心走）
exports.FORWARD = {
    red: [[1, 0], [0, 1]],
    blue: [[-1, 0], [0, 1]],
    green: [[-1, 0], [0, -1]],
    black: [[1, 0], [0, -1]],
};
exports.ORTHO_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
exports.DIAG_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
// 界河带上的装饰文字（照片坐标，格中心，仅渲染用）
exports.BAND_LABELS = [
    { ch: '燕', x: 4.5, y: 0.5 },
    { ch: '卫', x: 4.5, y: 3.5 },
    { ch: '郑', x: 4.5, y: 5.5 },
    { ch: '巴', x: 4.5, y: 7.5 },
    { ch: '蜀', x: 4.5, y: 8.5 },
    { ch: '戎', x: 0.5, y: 4.5 },
    { ch: '狄', x: 1.5, y: 4.5 },
    { ch: '周', x: 3.5, y: 4.5 },
    { ch: '宋', x: 5.5, y: 4.5 },
    { ch: '吴', x: 7.5, y: 4.5 },
    { ch: '越', x: 8.5, y: 4.5 },
];
//# sourceMappingURL=geometry.js.map