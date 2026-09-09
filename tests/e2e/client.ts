import WebSocket from 'ws';
import type { ClientMsg, ServerMsg } from '../../src/shared/protocol';

export interface TestClient {
  ws: WebSocket;
  send(msg: ClientMsg): void;
  next(pred: (m: ServerMsg) => boolean, timeoutMs?: number): Promise<ServerMsg>;
  /** 持续收集错误消息供断言 */
  readonly errors: ServerMsg[];
  close(): void;
  opened: Promise<void>;
}

export function makeClient(port: number): TestClient {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const inbox: ServerMsg[] = [];
  const waiters: { pred: (m: ServerMsg) => boolean; resolve: (m: ServerMsg) => void }[] = [];
  const errors: ServerMsg[] = [];

  const opened = new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw)) as ServerMsg;
    if (msg.t === 'error') errors.push(msg);
    const i = waiters.findIndex((w) => w.pred(msg));
    if (i >= 0) waiters.splice(i, 1)[0].resolve(msg);
    else inbox.push(msg);
  });

  return {
    ws,
    opened,
    errors,
    send: (msg) => ws.send(JSON.stringify(msg)),
    next: (pred, timeoutMs = 8000) =>
      new Promise((resolve, reject) => {
        const i = inbox.findIndex(pred);
        if (i >= 0) { resolve(inbox.splice(i, 1)[0]); return; }
        const timer = setTimeout(() => {
          const j = waiters.findIndex((w) => w.resolve === res);
          if (j >= 0) waiters.splice(j, 1);
          reject(new Error(`等待消息超时: ${pred.toString().slice(0, 60)}`));
        }, timeoutMs);
        const res = (m: ServerMsg) => { clearTimeout(timer); resolve(m); };
        waiters.push({ pred, resolve: res });
      }),
    close: () => ws.close(),
  };
}

export async function connectAndHello(port: number, token?: string): Promise<TestClient> {
  const c = makeClient(port);
  await c.opened;
  c.send({ t: 'hello', token });
  await c.next((m) => m.t === 'welcome');
  return c;
}
