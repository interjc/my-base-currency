# 架构

## Workspace

```text
my-base-currency
├── apps
│   └── web          Astro 7 + Cloudflare Workers（当前 MVP）
├── docs             产品和工程文档
├── scripts/web      统一的开发、测试、构建、部署入口
└── .agents/skills   项目知识沉淀
```

未来新增：

- `apps/server`：Hono API，用于账户、同步、OCR 编排、预算/账本等跨端能力。
- `apps/mobile`：Expo 客户端，复用服务端 API 契约与可抽取的领域类型。

在这些能力真正出现前，不创建空 workspace，也不让 Hono 或 Expo 依赖进入 `apps/web`。

## MVP 数据流

```text
浏览器计算器
  └─ GET /api/rates
       └─ Astro server endpoint / Cloudflare Worker
            ├─ fresh KV entry → 直接返回
            └─ miss / stale → open.er-api.com
                              ├─ 校验成功 → 写 KV 并返回
                              └─ 请求失败 → 返回保留的 stale KV 或 503
```

浏览器拿到以 USD 为基准的完整汇率表后，在本地完成各目标币种计算：

```text
targetAmount = inputAmount / rates[inputCurrency] * rates[targetCurrency]
```

这样一次 API 请求即可支持任意输入币种到最多 5 个目标币种的换算。

## 缓存策略

- KV key：`rates:usd:v1`。
- 新鲜窗口：1 小时，以 Worker 实际抓取时间为准。
- 保留窗口：48 小时，只为上游故障提供 stale fallback，不改变 1 小时刷新规则。
- KV 是最终一致的，多边缘节点在更新交界处短时间看见不同版本是可接受的；汇率换算不需要强一致协调。
- API 响应同时提供缓存状态与数据更新时间，客户端不能把旧数据冒充实时数据。

## 边界

- `src/lib/currency.ts`：运行时无关的币种与换算逻辑。
- `src/lib/server/rates.ts`：上游校验、KV 缓存和故障回退。
- `src/pages/api/rates.ts`：HTTP 协议、状态码和缓存头。
- `src/scripts/calculator.ts`：DOM 状态、localStorage 偏好、即时渲染。

这条边界使纯计算和缓存策略可单元测试，同时避免浏览器代码引用 Cloudflare API。
