#!/usr/bin/env bash

set -euo pipefail

web_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${web_script_dir}/../lib/use-node.sh"

status_out="$(pnpm --filter @base-money/web exec astro dev status 2>&1 || true)"
if [[ "${status_out}" == *"running at"* ]]; then
  printf '%s\n' "${status_out}"
  printf 'Reusing the existing server. To restart it: pnpm --filter @base-money/web exec astro dev stop && pnpm run dev\n'
  exit 0
fi

if [[ $# -gt 0 ]]; then
  pnpm --filter @base-money/web exec wrangler types --include-runtime false
  exec pnpm --filter @base-money/web exec astro dev "$@"
fi
exec pnpm --filter @base-money/web run dev
