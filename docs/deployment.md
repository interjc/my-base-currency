# Cloudflare 部署

## 资源清单

当前 MVP 部署为 Cloudflare Worker，不使用 Pages。`apps/web/wrangler.jsonc` 是线上配置的单一事实来源。

| 类型 | 名称 / binding | 创建方式 | 用途 |
| --- | --- | --- | --- |
| Worker | `my-base-currency-web` | 首次部署时创建 | Astro Web 与 `/api/rates` |
| Workers KV | `EXCHANGE_RATES` | Wrangler 自动 provision | 缓存 USD 基准汇率 |

`EXCHANGE_RATES` 是代码中的 binding 名称。配置暂不写入 namespace ID；Wrangler 4 会在首次 CLI 部署时创建带 Worker 名前缀的 KV namespace，并把 ID 回写到 `wrangler.jsonc`。不要为了本地开发提前补一个远端 ID。

## 明确不需要的资源

- 不使用 Astro Session，因此 `session: false`，不会创建 `SESSION` KV。
- 当前没有图片变换需求，因此使用 `imageService: "passthrough"`，不会创建 `IMAGES` binding。
- 免费汇率端点不需要 API key，因此没有 secret 或环境变量。
- `observability.enabled` 只启用 Worker 可观测性，不需要额外命名或手动创建服务。
- 当前没有 D1、R2、Queues、Durable Objects、Service Binding 或 Cron Trigger。

## 首次发布

先确认 Wrangler 登录的是目标 Cloudflare 账户，再从仓库根目录执行：

```bash
pnpm run check
pnpm test
pnpm run build
pnpm run test:e2e:web
pnpm run deploy:web
```

部署会创建远端资源，必须在用户明确要求发布后执行。本地开发和构建不会创建线上资源。

如果改用 Cloudflare Dashboard 的 Git 部署，自动创建的资源 ID 不会回写仓库；需要在 Dashboard 查看。若未来增加 staging 环境，必须单独声明它的 `kv_namespaces`，因为绑定不会从顶层配置继承。

## 后续需要确认的命名

以下能力尚未进入 MVP，出现实际需求时再确认：

- 自定义域名及路由；
- staging Worker 与独立 KV namespace；
- 未来 Hono server 的 Worker ID，以及它与 Web 之间的 Service Binding 名称。
