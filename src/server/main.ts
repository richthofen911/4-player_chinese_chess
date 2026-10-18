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
    // Render（以及其他 PaaS）用该端点判断实例是否健康
    if (req.url === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }).end('{"ok":true}');
      return;
    }
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
          // 先断开 WebSocket 客户端，否则 wss.close() 会一直等待连接自行关闭
          for (const client of wss.clients) client.terminate();
          await new Promise<void>((r) => wss.close(() => r()));
          await new Promise<void>((r) => server.close(() => r()));
        },
      });
    });
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--port');
  const cliPort = idx >= 0 ? Number(args[idx + 1]) : Number.NaN;
  // 云端（Render 等）通过 PORT 环境变量指定端口，本地默认 8080
  const port = Number.isInteger(cliPort) && cliPort > 0 ? cliPort : Number(process.env.PORT) || 8080;
  const dev = args.includes('--dev');
  void startServer({ port, dev }).then((h) => {
    console.log(`春秋四国象棋 服务已启动${dev ? '（开发模式，前端由 vite 提供）' : ''}`);
    const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME;
    if (renderHost) {
      console.log(`  公网地址: https://${renderHost}`);
    } else {
      for (const url of h.urls) console.log(`  局域网玩家请打开: ${url}`);
    }

    const shutdown = (signal: string) => {
      console.log(`收到 ${signal}，正在关闭服务…`);
      void h.close().then(() => process.exit(0));
      // 兜底：优雅关闭超时后强制退出，避免平台等待
      setTimeout(() => process.exit(0), 10_000).unref();
    };
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  });
}
