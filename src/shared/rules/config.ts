import type { Side } from '../types';

export interface RulesConfig {
  /** R5 行棋顺序（逆时针） */
  turnOrder: Side[];
  /** R6 象的活动范围。ASSUMPTION：不出本象限 */
  elephantZone: 'ownQuadrant' | 'board';
  /** R6 卒离开本象限后可走任意正交方向。ASSUMPTION */
  pawnFreeAfterLeave: boolean;
  /** R6 卒离开本象限后不可再踏入本象限（不可后退） */
  pawnReenterHomeForbidden: boolean;
  /** R10 国名子被吃后该方其余棋子移离棋盘。ASSUMPTION：否则为冻结留盘 */
  eliminationRemovesPieces: boolean;
  /** R10 淘汰时该方存活卒倒戈归吃子方（在 eliminationRemovesPieces 路径内生效） */
  defectPawnsOnElimination: boolean;
  /** R10 每次淘汰至多少枚卒可倒戈，超出的卒随其余棋子一并移出（0=不倒戈） */
  defectPawnsMax: number;
  /** R11 无合法着法的方跳过回合 */
  stalemateSkipsTurn: boolean;
  /** R11 连续多少步无吃子判和（0=关闭）。防止只剩将帅的长生局面 */
  drawAfterNoCapture: number;
}

export const DEFAULT_RULES: RulesConfig = {
  turnOrder: ['red', 'black', 'green', 'blue'],
  elephantZone: 'ownQuadrant',
  pawnFreeAfterLeave: true,
  pawnReenterHomeForbidden: true,
  eliminationRemovesPieces: true,
  defectPawnsOnElimination: true,
  defectPawnsMax: 2,
  stalemateSkipsTurn: true,
  drawAfterNoCapture: 120,
};
