"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseMove = chooseMove;
const engine_1 = require("../shared/rules/engine");
const VALUE = {
    king: 100000, rook: 9, cannon: 8, horse: 6, advisor: 3, elephant: 3, zu: 2,
};
/** R12：贪心 AI —— 四国各自为战，优先吃价值高的子（吃国名子必胜），随机打破平局 */
function chooseMove(state, rand = Math.random) {
    const moves = (0, engine_1.allLegalMoves)(state);
    if (moves.length === 0)
        return null;
    let best = null;
    let bestScore = -Infinity;
    for (const m of moves) {
        const victim = (0, engine_1.pieceAt)(state, m.to);
        let score = rand();
        if (victim)
            score += VALUE[victim.kind];
        if (score > bestScore) {
            bestScore = score;
            best = m;
        }
    }
    return best;
}
//# sourceMappingURL=ai.js.map