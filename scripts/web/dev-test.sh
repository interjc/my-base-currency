#!/usr/bin/env bash

set -euo pipefail

web_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${web_script_dir}/../lib/use-node.sh"

cleanup() {
  pnpm --filter @base-money/web exec astro dev stop >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

pnpm --filter @base-money/web exec wrangler types --include-runtime false
pnpm --filter @base-money/web exec astro dev --host 127.0.0.1 --port 4321

while true; do
  sleep 30
done
