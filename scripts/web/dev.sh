#!/usr/bin/env bash

set -euo pipefail

web_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${web_script_dir}/../lib/use-node.sh"

if [[ $# -gt 0 ]]; then
  pnpm --filter @base-money/web exec wrangler types --include-runtime false
  exec pnpm --filter @base-money/web exec astro dev "$@"
fi
exec pnpm --filter @base-money/web run dev
