# 开发流程

## 环境初始化

```bash
source ~/.nvm/nvm.sh
nvm use
pnpm install
```

`.nvmrc` 固定 Node 24.19.0。根目录 pnpm workspace 只负责编排，Web 依赖属于 `apps/web`，仓库只保留根目录一个 lockfile。

## 本地开发

```bash
pnpm run dev
```

Wrangler 会从 `apps/web/wrangler.jsonc` 生成 Cloudflare 类型，并为缺少远端 ID 的 `EXCHANGE_RATES` 绑定创建持久化的本地 KV。开发环境不需要先创建线上 namespace。

## 变更闭环

1. 先确认 `docs/mvp.md` 的产品不变量和 `AGENTS.md` 的工程约束。
2. 修改实现；领域逻辑优先写成 `src/lib` 下可测试函数。
3. 执行 `pnpm run check` 和 `pnpm test`。
4. 用户流程或响应式布局变化时，执行 `pnpm run test:e2e:web`，并至少人工检查 390px 与桌面布局。
5. 执行 `pnpm run build`，确认 Cloudflare 目标可以产出。
6. 只有明确要发布时才执行 `pnpm run deploy:web`。

## 命令与脚本

根 pnpm 命令委托给 `scripts/web/*.sh`。这些脚本会加载 nvm、切换到 `.nvmrc` 版本，再运行 `pnpm --filter @base-money/web`，避免开发机的系统 Node 意外参与构建。

直接调试 Web 包时也可以运行：

```bash
source ~/.nvm/nvm.sh
nvm use
pnpm --filter @base-money/web run dev
```

## Cloudflare 类型

`pnpm run check`、`pnpm run build` 和 `pnpm run dev` 都会先执行 `wrangler types --include-runtime false`。项目同时包含浏览器 DOM 类型，因此只生成 bindings，避免 Workers runtime 的全局 `Element` 与浏览器 DOM 冲突。修改 `wrangler.jsonc` 的 bindings 后，需要让生成的 `worker-configuration.d.ts` 一并更新。

## 测试层次

- Vitest：换算公式、偏好清洗、上游 payload 校验、KV hit/miss/stale 行为。
- Playwright：用户输入、设置最多 5 个币种、本地偏好持久化、手机布局基本可用性。
- Astro check/build：模板、TypeScript 与 Cloudflare 构建集成。

端到端测试会拦截浏览器对 `/api/rates` 的请求，使用固定汇率，避免测试结果随真实市场数据变化。
