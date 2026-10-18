# 春秋四国象棋 · 局域网 Web 多人版

四人中国象棋变体（晋、齐、楚、秦四国各自为战）。Node.js 服务端同时提供静态页面与 WebSocket，局域网内玩家用浏览器打开同一地址即可入房对局。全栈 TypeScript，服务端权威判定。

## 快速开始

```bash
npm install
npm run build
npm start            # 默认 8080；npm start -- --port 9000 可换端口
```

启动后打印局域网地址（如 `http://192.168.0.16:8080`），把链接发给同网段的朋友即可。

开发模式（vite 热更新 :5173 + 服务端 :8080）：`npm run dev`

## 部署到 Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/richthofen911/4-player_chinese_chess)

仓库根目录的 `render.yaml` 已配置为 Render Web Service（构建 `npm ci && npm run build`、启动 `npm start`、健康检查 `/healthz`）。一键部署、手动步骤、免费实例限制与故障排查见 [DEPLOY.md](./DEPLOY.md)。

## 玩法流程

1. 任一家填昵称→创建房间（选座，默认红·晋），成为房主。
2. 其他人打开同一链接，输入房间码或直接点「入座」加入。
3. 房主点「开始对局」；空座位自动由 AI 代下，任何真人可随时「接管」AI 座位。
4. 轮到你：点自己的棋子 → 点绿点（走）或红圈（吃）。
5. 断线/刷新：本标签页凭 sessionStorage 令牌自动归座（多标签页互不干扰）。

## 规则（默认规则集）

> 本实现依据实体棋盘照片与公开资料整理，部分细节为合理推定（见下 ★），均可在配置中调整。

- **棋盘**：四个 5×5 交叉点象限 + 中央十字界河（宽一格，燕/卫/郑/巴/蜀、戎/狄/周/宋/吴/越为装饰字）。棋子落交叉点，不能停留在界河带内，跨河为一步。★
- **九宫**：每象限外角 3×3 斜线宫。
- **子力（每方 10 枚）**：国名子（晋/齐/楚/秦，职能同将帅）、士、象、马、车、炮各 1，卒 ×4。★
- **初始布局**：红方取自实体棋照片，其余三方绕盘心 90° 旋转生成。
- **顺序**：红→黑→绿→蓝逆时针轮转；四国**各自为战**，无同盟。
- **走法**：国名子九宫内直走一格；士九宫内斜走一格；象斜二格、塞象眼、不出本象限；马、车、炮同中国象棋（炮隔恰好一子吃）。
- **卒**：本象限内每步朝中心方向一格；离开本象限后可走任意正交方向，但不得再踏入本象限（不可后退）。★
- **倒戈**：国名子被吃、该方淘汰时，其尚未被吃的存活卒**换主继续作战**——至多 2 枚变成吃子方的棋子（换颜色），此后按吃子方的卒规则行走；超出的卒与该方其余棋子移出棋盘。上限与开关均可在配置中调整。
- **胜负**：无「将军」提示，国名子可被直接吃掉；**最后存活的一家获胜**；无合法着法的方跳过回合；连续 120 步无吃子判和（防长生局，可配）。★
- **AI**：贪心策略——优先吃价值高的子（吃国名子即淘汰该方），随机打破平局。

## 调整规则

| 想改什么 | 改哪里 |
| --- | --- |
| 过界河/象限限制/淘汰方式等开关 | `src/shared/rules/config.ts` |
| 初始摆法 | `src/shared/rules/setup.ts` 的 `RED_LAYOUT`（其余三方自动生成） |
| 倒戈开关 / 上限 | `src/shared/rules/config.ts` 的 `defectPawnsOnElimination` / `defectPawnsMax` |

规则引擎是纯函数模块，服务端判定与客户端提示共用同一份代码。

## 工程结构

```
src/shared/    types、geometry（10x10 点阵/象限/九宫/界河）、protocol（WS 消息）、rules/（引擎）
src/server/    main(HTTP+WS)、rooms(房间/座位/令牌)、connection(协议路由)、ai、static
src/client/    Canvas 2D 渲染（board/pieces/renderer）、net(自动重连)、store、hud、input
tests/rules/   规则引擎单元测试（node:test）
tests/e2e/     无头 4 客户端整局、断线重连/AI 接管/错误路径
```

```bash
npm test          # 规则单元测试
npm run test:e2e  # 端到端整局 + 重连
```
