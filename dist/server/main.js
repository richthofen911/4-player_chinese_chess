"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const ws_1 = require("ws");
const connection_1 = require("./connection");
const rooms_1 = require("./rooms");
const static_1 = require("./static");
function lanIPv4s() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter((a) => !!a && a.family === 'IPv4' && !a.internal)
        .map((a) => a.address);
}
function startServer(opts) {
    const mgr = new rooms_1.RoomManager();
    const serveStatic = opts.dev ? null : (0, static_1.createStaticHandler)(path.join(__dirname, '..', 'client'));
    const server = http.createServer((req, res) => {
        if (serveStatic?.(req, res))
            return;
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 未找到');
    });
    const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => (0, connection_1.handleConnection)(mgr, ws));
    return new Promise((resolve) => {
        server.listen(opts.port, '0.0.0.0', () => {
            const port = server.address().port;
            const urls = [...lanIPv4s().map((ip) => `http://${ip}:${port}`), `http://localhost:${port}`];
            resolve({
                port,
                urls,
                close: async () => {
                    mgr.close();
                    await new Promise((r) => wss.close(() => r()));
                    for (const client of wss.clients)
                        client.terminate();
                    await new Promise((r) => server.close(() => r()));
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
        for (const url of h.urls)
            console.log(`  局域网玩家请打开: ${url}`);
    });
}
//# sourceMappingURL=main.js.map