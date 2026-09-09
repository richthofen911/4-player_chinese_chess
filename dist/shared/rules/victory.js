"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVictory = checkVictory;
const geometry_1 = require("../geometry");
const setup_1 = require("./setup");
/** R11：四国各自为战 -> 最后存活的一家获胜；全灭（防御性）判和 */
function checkVictory(s) {
    const alive = geometry_1.SIDES.filter((side) => s.alive[side]);
    if (alive.length === 1)
        return { winner: alive[0], reason: `仅存 ${setup_1.KING_CHAR[alive[0]]} 国，一国独存` };
    if (alive.length === 0)
        return { winner: 'draw', reason: '各方均被灭' };
    return null;
}
//# sourceMappingURL=victory.js.map