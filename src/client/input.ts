import { legalMovesFrom } from '../shared/rules/engine';
import { net } from './net';
import { view } from './render/renderer';
import { store } from './store';

export function attachInput(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('pointerdown', (e) => {
    const g = view.geom;
    const st = store.state;
    const game = st.game;
    if (!g || !game || game.over || st.room?.phase !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const pt = g.nearest(e.clientX - rect.left, e.clientY - rect.top);
    if (pt === null) {
      store.set({ selection: null, legal: [] });
      return;
    }
    if (st.selection !== null && st.legal.includes(pt)) {
      net.send({ t: 'game.move', from: st.selection, to: pt });
      store.set({ selection: null, legal: [] });
      return;
    }
    if (game.turn !== st.mySide) {
      store.set({ selection: null, legal: [] });
      return;
    }
    const piece = game.pieces.find((p) => p.pt === pt);
    if (piece && piece.side === st.mySide) {
      store.set({ selection: pt, legal: legalMovesFrom(game, pt).map((m) => m.to) });
    } else {
      store.set({ selection: null, legal: [] });
    }
  });
}
