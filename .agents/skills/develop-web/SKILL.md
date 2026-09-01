---
name: develop-web
description: Implement, review, or debug the Astro calculator in apps/web, including currency behavior, preferences, accessibility, responsive UI, and exchange-rate caching boundaries.
---

# Develop the Web App

Read `AGENTS.md` plus the relevant files under `docs/` before changing behavior.

## Preserve these decisions

- `apps/web` stays Astro-first and client-framework-free until a feature demonstrates a concrete need for an island framework.
- The browser calls `/api/rates`; only server code calls `open.er-api.com` or Cloudflare bindings.
- Rate tables use USD as their base. Use the shared conversion helper instead of reimplementing the cross-rate formula in components.
- Sanitize stored preferences on every load: USD input fallback, distinct valid targets, maximum five, and effective CNY target when the saved list is empty.
- Keep Cloudflare-only imports under `src/lib/server` or server endpoints so browser bundles remain portable.

## UI bar

Keep the pixel-workbench direction recognizable without sacrificing native semantics. Use real labels, buttons, selects, checkboxes, and dialog behavior. Preserve mobile tap targets, focus visibility, live status announcements, reduced motion, and layout at 390px. Do not replace the distinctive interface with a generic card dashboard.

At widths up to 40rem, keep the amount input, its clear action, and the current input-currency select in the safe-area-aware fixed bottom bar. Five selected base-currency results must remain single-column and visible above that bar on a 375 × 667 viewport. Do not carry the fixed bar into the wide layout.

## Completion checks

Run root `pnpm run check`, `pnpm test`, and `pnpm run build`. For a visible flow or responsive change, also run `pnpm run test:e2e:web` and inspect the page at mobile and desktop widths. Update `docs/api.md` when the endpoint contract changes.
