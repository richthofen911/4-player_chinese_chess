import { drawBoard, makeGeom, type Geom } from './board';
import { drawPieces } from './pieces';
import { store } from '../store';

export const view: { geom: Geom | null } = { geom: null };

export function startRenderer(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')!;
  let dirty = true;
  store.subscribe(() => { dirty = true; });

  const resize = () => {
    const wrap = canvas.parentElement!;
    const size = Math.max(280, Math.min(wrap.clientWidth, window.innerHeight - 150, 860));
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.geom = makeGeom(size);
    dirty = true;
  };
  window.addEventListener('resize', resize);
  resize();

  const frame = () => {
    if (dirty && view.geom) {
      dirty = false;
      drawBoard(ctx, view.geom);
      drawPieces(ctx, view.geom, store.state);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
