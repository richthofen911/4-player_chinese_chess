# 部署到 Render

本项目是 **Node.js Web 服务**：同一个进程既提供静态页面，也提供 `/ws` WebSocket。因此要创建 Render 的 **Web Service**，不能选 Static Site（静态站点无法承载 WebSocket 与服务端判定）。

## 一键部署（Blueprint）

仓库里已经包含 [`render.yaml`](./render.yaml)，Render 会自动读取：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/richthofen911/4-player_chinese_chess)

点击后登录 Render，确认服务名与 `Free` 计划即可。首次构建大约需要 1–2 分钟。

## 手动创建

1. 打开 [Render Dashboard](https://dashboard.render.com/) → **New** → **Web Service**。
2. 连接 GitHub 仓库 `richthofen911/4-player_chinese_chess`，分支选 `main`。
3. 填写：

   | 配置项 | 值 |
   | --- | --- |
   | Name | `siguo-xiangqi`（可自定义） |
   | Language / Runtime | `Node` |
   | Region | `Oregon`（或离玩家更近的区域） |
   | Build Command | `npm ci && npm run build` |
   | Start Command | `npm start` |
   | Instance Type | `Free` |

4. 在 **Advanced** 中设置：
   - 环境变量 `NODE_VERSION=24.21.0`（Vite 7 需要 Node ≥ 22.12；Render 新服务默认已是 24.x，显式固定更稳）。
   - Health Check Path 填 `/healthz`。
5. 点击 **Create Web Service**。

> 也可以选 **New → Blueprint**，选中本仓库，效果与一键部署相同。

## 部署后验证

```bash
curl -i https://<你的服务名>.onrender.com/healthz
# HTTP/2 200，响应体 {"ok":true}
```

然后在浏览器打开 `https://<你的服务名>.onrender.com/`：

1. 输入昵称、创建房间，拿到 4 位房间码。
2. 用其他标签页/设备打开同一地址，输入房间码入座（可指定座位）。
3. 房主点击「开始对局」，空座由 AI 代下，真人可随时接管。

HTTPS 页面会自动使用 `wss://` 连接，无需额外配置。

## 运行特性与限制

- **状态保存在内存**：房间、座位令牌和棋局都在进程内。实例重启、重新部署或免费实例休眠后，所有房间会丢失。若需要跨部署保存对局，需要接入 Redis/Postgres，本项目目前不依赖数据库。
- **只能单实例**：因为状态在内存中，不能开启横向扩容。`render.yaml` 未配置 autoscaling；免费计划本身也只有 1 个实例。
- **免费实例会休眠**：连续 15 分钟没有 HTTP 请求或 WebSocket 消息就会休眠，下次访问需约 1 分钟唤醒。页面内置了每 25 秒一次的 WebSocket 心跳，所以只要还有玩家开着页面，服务就会保持活跃。
- **带宽/时长**：免费计划每月 750 实例小时，并计入出站流量与构建分钟数。
- **重连**：客户端自带指数退避重连，并用 `sessionStorage` 中的令牌自动归座；普通网络抖动无需手动刷新。
- **自定义域名**：在服务 **Settings → Custom Domains** 添加即可，Render 自动签发 TLS 证书。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 构建报 `vite: not found` | 确认构建命令是 `npm ci && npm run build`，且没有在环境变量里设置 `NODE_ENV=production`（那会跳过 devDependencies）。 |
| 部署成功但访问超时 | 确认 Start Command 是 `npm start`，服务监听 `process.env.PORT`（代码已支持），不要写死 8080。 |
| WebSocket 连不上 | 必须使用 `https://` 页面（自动走 `wss://`）；Render 的 Web Service 原生支持 WebSocket，无需额外开关。 |
| 页面一直显示「连接服务器中…」 | 免费实例可能在冷启动，等待约 1 分钟后刷新；若持续失败，查看 Render 的 Logs。 |
| 对局突然消失 | 实例被重启/休眠/重新部署导致内存状态丢失，这是当前架构的预期行为。 |
