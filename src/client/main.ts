import { legalMovesFrom } from '../shared/rules/engine';
import { attachInput } from './input';
import { initHud } from './hud';
import { net } from './net';
import { startRenderer } from './render/renderer';
import { store } from './store';

const canvas = document.getElementById('board') as HTMLCanvasElement;

initHud();
startRenderer(canvas);
attachInput(canvas);
net.connect();

// 调试句柄：浏览器控制台/自动化脚本可用（window.__sqxq）
(window as unknown as Record<string, unknown>).__sqxq = { store, net, legalMovesFrom };
