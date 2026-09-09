import type { ClientMsg } from '../shared/protocol';
import { loadSession, store } from './store';

class Net {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

  connect(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      store.set({ connected: true });
      const s = loadSession();
      this.send({ t: 'hello', token: s?.token });
    };
    ws.onmessage = (ev) => {
      try {
        store.handleMsg(JSON.parse(String(ev.data)));
      } catch {
        /* 忽略坏消息 */
      }
    };
    ws.onclose = () => {
      store.set({ connected: false });
      const delay = Math.min(30_000, 1000 * 2 ** this.attempt++);
      setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => ws.close();
  }

  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}

export const net = new Net();
