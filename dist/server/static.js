"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStaticHandler = createStaticHandler;
const fs = require("node:fs");
const path = require("node:path");
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.json': 'application/json; charset=utf-8',
    '.woff2': 'font/woff2',
};
/** 返回 true 表示请求已被处理；路径限制在 rootDir 内 */
function createStaticHandler(rootDir) {
    const root = path.resolve(rootDir);
    return (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === '/')
            pathname = '/index.html';
        const file = path.resolve(root, '.' + pathname);
        if (!file.startsWith(root + path.sep) && file !== root) {
            res.writeHead(403).end('forbidden');
            return true;
        }
        const target = fs.existsSync(file) && fs.statSync(file).isFile()
            ? file
            : fs.existsSync(path.join(root, 'index.html')) ? path.join(root, 'index.html') : null;
        if (!target) {
            res.writeHead(404).end('not found');
            return true;
        }
        res.writeHead(200, { 'content-type': MIME[path.extname(target)] ?? 'application/octet-stream' });
        fs.createReadStream(target).pipe(res);
        return true;
    };
}
//# sourceMappingURL=static.js.map