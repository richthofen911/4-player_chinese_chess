import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { WebSocketServer } from 'ws';
import { handleConnection } from './connection';
import { RoomManager } from './rooms';
import { createStaticHandler } from './static';

export interface ServerHandle {
  port: number;
  urls: string[];
  close(): Promise<void>;
}

function lanIPv4s(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((a): a is os.NetworkInterfaceInfo => !!a && a.family === 'IPv4' && !a.internal)
    .map((a) => a.address);
}

export function startServer(opts: { port: number; dev: boolean }): Promise<ServerHandle> {
  const mgr = new RoomManager();
  const serveStatic = opts.dev ? null : createStaticHandler(path.join(__dirname, '..', 'client'));
  const server = http.createServer((req, res) => {
    if (serveStatic?.(req, res)) return;
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 未找到');
  });
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => handleConnection(mgr, ws));

  return new Promise((resolve) => {
    server.listen(opts.port, '0.0.0.0', () => {
      const port = (server.address() as { port: number }).port;
      const urls = [...lanIPv4s().map((ip) => `http://${ip}:${port}`), `http://localhost:${port}`];
      resolve({
        port,
        urls,
        close: async () => {
          mgr.close();
          await new Promise<void>((r) => wss.close(() => r()));
          for (const client of wss.clients) client.terminate();
          await new Promise<void>((r) => server.close(() => r()));
        },
      });
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--port');
  const port = idx >= 0 ? Number(args[idx + 1]) || 8080 : 8080;
  const dev = args.includes('--dev');
  void startServer({ port, dev }).then((h) => {
    console.log(`春秋四国象棋 服务已启动${dev ? '（开发模式，前端由 vite 提供）' : ''}`);
    for (const url of h.urls) console.log(`  局域网玩家请打开: ${url}`);
  });
}
