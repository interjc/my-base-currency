# Roadmap

## Phase 1 — Web MVP

- Astro 响应式换算器。
- 本地偏好：默认输入币种、最多 5 个本位币。
- Cloudflare Worker API 与每小时 KV 汇率缓存。
- 自动检查、单元测试、端到端测试和部署脚本。

## Phase 2 — Hono 服务端

- 在 `apps/server` 建立独立 Hono Worker。
- 把跨端 API 契约、账户和偏好同步迁移到服务端。
- 决定 Web 的 `/api` 是代理 Hono，还是浏览器直接访问版本化 API。
- 引入鉴权前先定义隐私、数据保留和账号删除策略。

## Phase 3 — Expo 移动端

- 在 `apps/mobile` 建立 Expo app。
- 复用版本化 API 契约和可移植的换算领域逻辑。
- 优化相机、离线缓存和快捷输入体验。

## Phase 4 — OCR 与账本

- 拍照识别价签币种与金额，始终允许用户确认/修正。
- 添加预算、账本和历史记录。
- 在引入第三方 AI 前明确图片上传、存储、删除和费用边界。

每个 phase 在开始前重新确认范围；roadmap 不等于提前授权外部服务、生产部署或数据迁移。
