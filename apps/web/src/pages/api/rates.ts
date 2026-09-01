import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { getExchangeRates } from "../../lib/server/rates";

export const GET = (async () => {
  try {
    const result = await getExchangeRates(env.EXCHANGE_RATES);

    return Response.json(result, {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Unable to serve exchange rates.", error);

    return Response.json(
      {
        error: "rates_unavailable",
        message: "暂时无法获取汇率，请稍后重试。",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  }
}) satisfies APIRoute;
