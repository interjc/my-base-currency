# Web API

## `GET /api/rates`

返回供浏览器换算使用的 USD 基准汇率表。

### 成功响应

```json
{
  "baseCode": "USD",
  "rates": {
    "USD": 1,
    "CNY": 6.73,
    "JPY": 159.78
  },
  "sourceUpdatedAt": 1788220951,
  "sourceNextUpdateAt": 1788307901,
  "cachedAt": 1788250000000,
  "cacheStatus": "hit"
}
```

`cacheStatus` 取值：

- `hit`：KV 中的数据仍处于 1 小时新鲜窗口。
- `miss`：未命中或已过期，已从上游成功刷新。
- `stale`：上游刷新失败，返回 48 小时保留窗口内的旧数据。

响应包含 `Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`。客户端仍应根据 `cacheStatus` 展示数据状态。

### 错误响应

```json
{
  "error": "rates_unavailable",
  "message": "暂时无法获取汇率，请稍后重试。"
}
```

当 KV 没有可用旧数据且上游请求失败或 payload 无效时返回 `503`，并使用 `Cache-Control: no-store`。

## 上游约束

上游固定为 `https://open.er-api.com/v6/latest/USD`。服务端只缓存满足以下条件的响应：

- `result === "success"`；
- `base_code === "USD"`；
- `rates` 是对象，包含正数 `CNY`；
- 币种代码为 3 位大写字母，汇率为有限正数。

浏览器不得直接请求上游地址。
