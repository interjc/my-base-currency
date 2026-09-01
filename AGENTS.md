# Project instructions

## Scope

This repository is a multi-app workspace for “Base Money”. The current product is `apps/web`, an Astro application deployed to Cloudflare Workers. Keep future Hono and Expo work isolated in `apps/server` and `apps/mobile`; do not add either stack to the MVP web package.

## Runtime and commands

- Use the nvm version in `.nvmrc`. Before running Node or pnpm directly, run `source ~/.nvm/nvm.sh && nvm use`.
- Prefer root commands and the wrappers in `scripts/web/`; they select the correct Node version.
- Use the pnpm workspace declared in `pnpm-workspace.yaml`. Add web-only dependencies to `apps/web`, not the root package, and keep one lockfile at the repository root. The web package filter is `@base-money/web`.
- Do not deploy or create remote Cloudflare resources unless the user explicitly requests it. Local development may use Wrangler's local KV.

## Product invariants

- The upstream rate table is always normalized to USD. Convert `amount` from currency A to B with `amount / rates[A] * rates[B]`.
- Default input currency is USD. An empty target-currency preference resolves to CNY. A user may save at most five distinct target currencies.
- Preferences are device-local and non-sensitive; store them in browser localStorage. Exchange-rate data belongs behind `/api/rates` and must not be fetched directly from the browser.
- Treat cached rates as fresh for one hour. A longer KV retention period is allowed only to support an explicitly marked stale fallback when the upstream service fails.
- Validate upstream payloads before caching them. Never cache error responses or malformed rates.

## Web implementation

- Keep the calculator usable without a client framework. Prefer Astro components, semantic HTML, native form controls, and small TypeScript modules.
- Maintain the pixel-workbench visual direction and mobile/desktop layouts. Preserve visible focus, 48px touch targets, readable contrast, reduced-motion support, and polite status announcements.
- Put reusable conversion/domain logic under `apps/web/src/lib`, and keep Cloudflare-only code under `apps/web/src/lib/server`.
- Add or update unit tests when changing conversion or caching behavior. Add an end-to-end assertion when changing a user-visible calculator flow.

## Project skills

- Load `.agents/skills/develop-web/SKILL.md` for implementation, review, or bug fixes in `apps/web`.
- Load `.agents/skills/operate-web/SKILL.md` for local runtime, KV, Wrangler, build, deployment, or production troubleshooting work.
