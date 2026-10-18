import type { ClientMsg } from '../shared/protocol';
import { loadSession, store } from './store';

const PING_INTERVAL_MS = 25_000;

class Net {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

  connect(): void {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      store.set({ connected: true });
      const s = loadSession();
      this.send({ t: 'hello', token: s?.token });
      this.startHeartbeat();
    };
    ws.onmessage = (ev) => {
      try {
        store.handleMsg(JSON.parse(String(ev.data)));
      } catch {
        /* 忽略坏消息 */
      }
    };
    ws.onclose = () => {
      this.stopHeartbeat();
      store.set({ connected: false });
      const delay = Math.min(30_000, 1000 * 2 ** this.attempt++);
      setTimeout(() => this.connect(), delay);
    };
    ws.onerror = () => ws.close();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    // 应用层心跳：让反向代理保持连接，同时避免 Render 免费实例因 15 分钟无流量而休眠。
    this.heartbeat = setInterval(() => this.send({ t: 'ping' }), PING_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  send(msg: ClientMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
}

export const net = new Net();
