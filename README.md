# Base Money

一个 Minecraft 风格的即时汇率换算器：输入一个金额，马上看到它在你熟悉的本位币中值多少。

当前 MVP 使用 Astro 7、Cloudflare Workers 与 Workers KV。浏览器只请求项目自己的 `/api/rates`，服务端从 [ExchangeRate-API 免费端点](https://www.exchangerate-api.com/docs/free) 获取以 USD 为基准的汇率，并将结果按 1 小时新鲜度缓存在 KV 中。

## 快速开始

项目固定使用 nvm 管理的 Node 24.19.0：

```bash
source ~/.nvm/nvm.sh
nvm use
pnpm install
pnpm run dev
```

打开 `http://localhost:4321`。首次读取汇率时需要访问上游 API；本地 KV 数据由 Wrangler 持久化。

## 常用命令

```bash
pnpm run dev          # 启动 apps/web
pnpm run check        # Astro / TypeScript 检查
pnpm test             # 单元测试
pnpm run build        # Cloudflare 目标构建
pnpm run test:e2e:web # Playwright 端到端测试
pnpm run deploy:web   # 构建并部署 web Worker
```

根命令会调用 [`scripts/web`](scripts/web) 下对应脚本，脚本会自动执行 `nvm use`。

## 项目结构

```text
apps/
  web/                  Astro Web MVP
docs/                   产品、架构、API 与开发文档
scripts/web/            Web 开发、检查、测试与部署入口
.agents/skills/         本项目专用的开发和运维 skills
AGENTS.md                自动化开发约束
```

未来的 Hono 服务端和 Expo 移动端会分别进入 `apps/server` 与 `apps/mobile`，但 MVP 不提前引入它们的依赖。

更多信息见 [MVP 需求](docs/mvp.md)、[架构](docs/architecture.md)、[开发流程](docs/development.md)、[Cloudflare 部署](docs/deployment.md) 和 [API 约定](docs/api.md)。
