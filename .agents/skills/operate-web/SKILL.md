---
name: operate-web
description: Run, build, deploy, or troubleshoot the apps/web Astro Worker, its nvm toolchain, Wrangler configuration, local KV, and production rate-cache behavior.
---

# Operate the Web App

Start with `docs/development.md`, `docs/architecture.md`, and `docs/api.md`.

## Local runtime

Use root scripts so `.nvmrc` is honored. `pnpm run dev`, `check`, `test`, and `build` are safe local operations. Do not work around a Node mismatch with the system Node.

Wrangler automatic provisioning provides a local `EXCHANGE_RATES` KV when the binding has no ID. Do not add a production namespace ID just to make local development work. Regenerate `apps/web/worker-configuration.d.ts` after changing bindings.

The production Worker ID is `my-base-currency-web`. The MVP has exactly one application binding: the `EXCHANGE_RATES` KV. Astro sessions are disabled and image handling is passthrough; an unexpected `SESSION` KV or `IMAGES` binding in typegen/build output is a configuration regression. See `docs/deployment.md` for the resource inventory.

Astro 7.2.x with the Cloudflare adapter can crash on a cold Vite cache when passthrough images cause late discovery of `astro/assets/services/noop` or `astro/logger/json`. Keep both modules in `vite.optimizeDeps.include` until an adapter upgrade is verified to include them itself. If the missing optimized-chunk error returns, inspect `.astro/dev.log`, move only `apps/web/node_modules/.vite` aside, and verify a cold start; do not delete dependencies or local KV state for this cache-only failure.

## Production boundary

Deployment and remote Cloudflare resource creation change external state. Run `pnpm run deploy:web`, `wrangler kv namespace create`, or remote KV mutation only when the user explicitly requests that action and the intended account/environment is known.

For cache incidents, inspect the `/api/rates` status and logs before mutating KV. `hit` is fresh, `miss` is a successful refresh, and `stale` is a deliberate upstream-failure fallback. Never delete the last known-good cache as a first troubleshooting step.

## Release gate

Before an authorized deployment, run `pnpm run check`, `pnpm test`, `pnpm run build`, and the relevant browser tests. Confirm `wrangler.jsonc` uses a current compatibility date and review the diff for generated binding IDs or unrelated configuration changes.
